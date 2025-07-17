import { PDFDocument, PDFPage } from "pdf-lib";
import * as pdfjs from "pdfjs-dist";
import jsQR from "jsqr";
import type { 
  InvoiceCell, 
  PdfPageData, 
  PageSize, 
  MergePDFOptions, 
  MergePDFResult 
} from "../types/invoice";

// 默认配置
const DEFAULT_CONFIG = {
  PAGES_PER_SHEET: 2,
  DEFAULT_SCALE: 0.95,
  A4_SIZE: { width: 595.28, height: 841.89 },
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  BATCH_SIZE: 5,
};

/**
 * 主要的PDF合并函数
 */
export async function mergePDFs(options: MergePDFOptions): Promise<MergePDFResult> {
  const {
    files,
    pagesPerSheet = DEFAULT_CONFIG.PAGES_PER_SHEET,
    targetPageSize = DEFAULT_CONFIG.A4_SIZE,
    scale = DEFAULT_CONFIG.DEFAULT_SCALE,
    onProgress,
    onError
  } = options;

  try {
    if (!files?.length) {
      throw new Error("请选择PDF文件");
    }

    onProgress?.(0);

    // 分批处理文件，减少内存峰值
    const allPages: PdfPageData[] = [];
    for (let i = 0; i < files.length; i += DEFAULT_CONFIG.BATCH_SIZE) {
      const batchFiles = files.slice(i, i + DEFAULT_CONFIG.BATCH_SIZE);
      const batchPages = await processFiles(batchFiles);
      allPages.push(...batchPages);
    }

    onProgress?.(30);

    // 提取发票信息
    const invoiceData = await extractInvoiceData(allPages);
    onProgress?.(80);

    // 创建合并的PDF
    const mergedPdf = await createMergedDocument(allPages, {
      pagesPerSheet,
      targetPageSize,
      scale
    });
    onProgress?.(100);

    const pdfBytes = await mergedPdf.save({ updateFieldAppearances: false });
    const pdfBlob = new Blob([pdfBytes], { type: "application/pdf" });

    return {
      pdfBlob,
      invoiceData,
      totalPages: Math.ceil(allPages.length / pagesPerSheet)
    };

  } catch (error) {
    const err = error as Error;
    onError?.(err);
    throw err;
  }
}

/**
 * 处理文件并提取页面
 */
async function processFiles(files: File[]): Promise<PdfPageData[]> {
  const allPages: PdfPageData[] = [];
  
  for (const file of files) {
    // 文件大小检查
    if (file.size > DEFAULT_CONFIG.MAX_FILE_SIZE) {
      throw new Error(`文件 ${file.name} 超过10MB限制`);
    }
    
    if (file.type !== "application/pdf") {
      throw new Error(`文件 ${file.name} 不是PDF格式`);
    }

    const arrayBuffer = await file.arrayBuffer();
    const pdfDoc = await PDFDocument.load(arrayBuffer, {
      ignoreEncryption: true,
    });
    const pdfjsDocument = await pdfjs.getDocument({ data: arrayBuffer }).promise;

    const pageCount = pdfDoc.getPageCount();
    for (let j = 0; j < pageCount; j++) {
      const page = pdfDoc.getPage(j);
      const pdfjsPage = await pdfjsDocument.getPage(j + 1);
      const cropBox = page.getCropBox();
      let width: number, height: number, processedPage: PDFPage;

      if (cropBox?.width > 0 && cropBox?.height > 0) {
        const [copiedPage] = await pdfDoc.copyPages(pdfDoc, [j]);
        const bleedBox = page.getBleedBox() || cropBox;

        if (bleedBox?.width > 0 && bleedBox?.height > 0) {
          copiedPage.setSize(bleedBox.width, bleedBox.height);
          copiedPage.translateContent(-bleedBox.x, -bleedBox.y);
          copiedPage.setCropBox(0, 0, bleedBox.width, bleedBox.height);
          copiedPage.setMediaBox(0, 0, bleedBox.width, bleedBox.height);
          width = bleedBox.width;
          height = bleedBox.height;
        } else {
          copiedPage.setSize(cropBox.width, cropBox.height);
          copiedPage.translateContent(-cropBox.x, -cropBox.y);
          copiedPage.setCropBox(0, 0, cropBox.width, cropBox.height);
          copiedPage.setMediaBox(0, 0, cropBox.width, cropBox.height);
          width = cropBox.width;
          height = cropBox.height;
        }
        processedPage = copiedPage;
      } else {
        const mediaBox = page.getMediaBox();
        processedPage = page;
        width = mediaBox.width;
        height = mediaBox.height;
      }

      allPages.push({
        doc: pdfDoc,
        page: processedPage,
        pdfjsPage,
        width,
        height,
        sourceFile: file.name,
        pageNumber: j + 1,
      });
    }
  }
  
  return allPages;
}

/**
 * 提取发票信息
 */
async function extractInvoiceData(allPages: PdfPageData[]): Promise<InvoiceCell[]> {
  const cellData: InvoiceCell[] = [];
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("无法获取Canvas 2D渲染上下文");
  }

  for (let i = 0; i < allPages.length; i++) {
    const { pdfjsPage, pageNumber, sourceFile } = allPages[i];
    try {
      const viewport = pdfjsPage.getViewport({ scale: 4 });

      canvas.width = viewport.width;
      canvas.height = viewport.height;

      await pdfjsPage.render({ canvasContext: context, viewport }).promise;
      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);

      const qrCode = jsQR(imageData.data, imageData.width, imageData.height);
      const invoiceInfo = parseQRCode(pageNumber, qrCode?.data || null);
      invoiceInfo.fileName = sourceFile;
      cellData.push(invoiceInfo);
    } catch (error) {
      console.error(`处理页面 ${pageNumber} 时发生错误:`, error);
      cellData.push({
        pageNumber,
        fileName: sourceFile,
        type: "",
        amount: "0",
        date: "",
      });
    }
  }

  // 清理canvas
  canvas.width = 0;
  canvas.height = 0;

  return cellData;
}

/**
 * 创建合并后的PDF文档
 */
async function createMergedDocument(
  allPages: PdfPageData[], 
  options: {
    pagesPerSheet: number;
    targetPageSize: PageSize;
    scale: number;
  }
): Promise<PDFDocument> {
  const { pagesPerSheet, targetPageSize, scale } = options;
  const outputPdfDoc = await PDFDocument.create();
  const newPageCount = Math.ceil(allPages.length / pagesPerSheet);
  const halfHeight = targetPageSize.height / 2;

  for (let i = 0; i < newPageCount; i++) {
    const newPage = outputPdfDoc.addPage([targetPageSize.width, targetPageSize.height]);
    const pageIndices = [i * pagesPerSheet, i * pagesPerSheet + 1];

    for (let j = 0; j < pagesPerSheet; j++) {
      if (pageIndices[j] >= allPages.length) break;

      const { page, width, height } = allPages[pageIndices[j]];
      const calculatedScale = calculateScale(width, height, targetPageSize.width, halfHeight, scale);
      const scaledWidth = width * calculatedScale;
      const scaledHeight = height * calculatedScale;

      const position = {
        x: (targetPageSize.width - scaledWidth) / 2,
        y: j === 0
          ? targetPageSize.height - halfHeight + (halfHeight - scaledHeight) / 2
          : (halfHeight - scaledHeight) / 2,
      };

      const embeddedPage = await outputPdfDoc.embedPage(page);
      newPage.drawPage(embeddedPage, {
        ...position,
        width: scaledWidth,
        height: scaledHeight,
      });
    }
  }
  
  return outputPdfDoc;
}

/**
 * 计算缩放比例
 */
function calculateScale(
  srcWidth: number,
  srcHeight: number,
  targetWidth: number,
  targetHeight: number,
  defaultScale: number = DEFAULT_CONFIG.DEFAULT_SCALE
): number {
  const scaleX = (targetWidth * defaultScale) / srcWidth;
  const scaleY = (targetHeight * defaultScale) / srcHeight;
  return Math.min(scaleX, scaleY);
}

/**
 * 解析二维码数据
 */
function parseQRCode(pageNumber: number, qrCodeData: string | null): InvoiceCell {
  if (!qrCodeData) {
    return { pageNumber, type: "", amount: "0", date: "", fileName: "" };
  }

  const [constNumber, type, code, number, amount, date, checkCode] = qrCodeData.split(",");
  const formattedDate = date
    ? `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}`
    : "";

  return {
    pageNumber,
    constNumber,
    type,
    code,
    number,
    amount,
    date: formattedDate,
    checkCode,
    fileName: "",
  };
}
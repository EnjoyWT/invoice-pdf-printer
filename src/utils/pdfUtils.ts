import { PDFDocument, PDFPage } from "pdf-lib";
import * as pdfjs from "pdfjs-dist";
import jsQR from "jsqr";
import type {
  InvoiceCell,
  PdfPageData,
  PageSize,
  MergePDFOptions,
  MergePDFResult,
  PagePosition,
  PageLayout,
  LayoutResult,
  ScaleResult,
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
export async function mergePDFs(
  options: MergePDFOptions
): Promise<MergePDFResult> {
  const {
    files,
    pagesPerSheet = DEFAULT_CONFIG.PAGES_PER_SHEET,
    targetPageSize = DEFAULT_CONFIG.A4_SIZE,
    scale = DEFAULT_CONFIG.DEFAULT_SCALE,
    onProgress,
    onError,
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
      scale,
    });
    onProgress?.(100);

    const pdfBytes = await mergedPdf.save({ updateFieldAppearances: false });
    const pdfBlob = new Blob([pdfBytes], { type: "application/pdf" });

    return {
      pdfBlob,
      invoiceData,
      totalPages: Math.ceil(allPages.length / pagesPerSheet),
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
    const pdfjsDocument = await pdfjs.getDocument({ data: arrayBuffer })
      .promise;

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
 * 提取发票信息 - 增强版，支持多种信息提取方式
 */
async function extractInvoiceData(
  allPages: PdfPageData[]
): Promise<InvoiceCell[]> {
  const cellData: InvoiceCell[] = [];
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("无法获取Canvas 2D渲染上下文");
  }

  for (let i = 0; i < allPages.length; i++) {
    const { pdfjsPage, pageNumber, sourceFile } = allPages[i];
    try {
      // 提高渲染质量以获得更好的文本识别效果
      const viewport = pdfjsPage.getViewport({ scale: 4 });
      canvas.width = viewport.width;
      canvas.height = viewport.height;

      await pdfjsPage.render({ canvasContext: context, viewport }).promise;
      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);

      // 尝试多种方式提取发票信息
      let invoiceInfo: InvoiceCell;

      // 1. 首先尝试二维码识别
      const qrCode = jsQR(imageData.data, imageData.width, imageData.height);
      if (qrCode?.data) {
        invoiceInfo = parseQRCode(pageNumber, qrCode.data);
      } else {
        // 2. 如果没有二维码，尝试文本提取
        invoiceInfo = await extractInvoiceFromText(pdfjsPage, pageNumber);
      }

      // 3. 增强信息提取 - 获取更多发票详情
      const enhancedInfo = await enhanceInvoiceInfo(pdfjsPage, invoiceInfo);
      enhancedInfo.fileName = sourceFile;

      cellData.push(enhancedInfo);
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
 * 从PDF文本内容中提取发票信息
 */
async function extractInvoiceFromText(
  pdfjsPage: any,
  pageNumber: number
): Promise<InvoiceCell> {
  try {
    const textContent = await pdfjsPage.getTextContent();
    const textItems = textContent.items;
    const fullText = textItems.map((item: any) => item.str).join(" ");

    // 使用正则表达式提取关键信息
    const invoiceInfo: InvoiceCell = {
      pageNumber,
      fileName: "",
      type: extractInvoiceType(fullText),
      amount: extractAmount(fullText),
      date: extractDate(fullText),
    };

    return invoiceInfo;
  } catch (error) {
    console.error("文本提取失败:", error);
    return {
      pageNumber,
      fileName: "",
      type: "",
      amount: "0",
      date: "",
    };
  }
}

/**
 * 增强发票信息提取
 */
async function enhanceInvoiceInfo(
  pdfjsPage: any,
  baseInfo: InvoiceCell
): Promise<InvoiceCell> {
  try {
    const textContent = await pdfjsPage.getTextContent();
    const textItems = textContent.items;

    // 构建文本位置映射，用于更精确的信息提取
    const textMap = textItems.map((item: any) => ({
      text: item.str,
      x: item.transform[4],
      y: item.transform[5],
      width: item.width,
      height: item.height,
    }));

    // 如果基础信息缺失，尝试从文本中补充
    const enhanced = { ...baseInfo };

    if (!enhanced.amount || enhanced.amount === "0") {
      enhanced.amount = extractAmountFromTextMap(textMap) || enhanced.amount;
    }

    if (!enhanced.date) {
      enhanced.date = extractDateFromTextMap(textMap) || enhanced.date;
    }

    if (!enhanced.type) {
      enhanced.type = extractTypeFromTextMap(textMap) || enhanced.type;
    }

    // 提取发票号码
    if (!enhanced.number) {
      enhanced.number = extractInvoiceNumber(textMap);
    }

    return enhanced;
  } catch (error) {
    console.error("增强信息提取失败:", error);
    return baseInfo;
  }
}

/**
 * 从文本中提取发票类型
 */
function extractInvoiceType(text: string): string {
  const typePatterns = [
    { pattern: /增值税专用发票/i, type: "01" },
    { pattern: /增值税普通发票/i, type: "10" },
    { pattern: /普通发票/i, type: "04" },
    { pattern: /机动车销售统一发票/i, type: "03" },
  ];

  for (const { pattern, type } of typePatterns) {
    if (pattern.test(text)) {
      return type;
    }
  }

  return "";
}

/**
 * 从文本中提取金额
 */
function extractAmount(text: string): string {
  const amountPatterns = [
    /价税合计[：:]?\s*¥?\s*([\d,]+\.?\d*)/i,
    /合计[：:]?\s*¥?\s*([\d,]+\.?\d*)/i,
    /总计[：:]?\s*¥?\s*([\d,]+\.?\d*)/i,
    /金额[：:]?\s*¥?\s*([\d,]+\.?\d*)/i,
  ];

  for (const pattern of amountPatterns) {
    const match = text.match(pattern);
    if (match) {
      return match[1].replace(/,/g, "");
    }
  }

  return "0";
}

/**
 * 从文本中提取日期
 */
function extractDate(text: string): string {
  const datePatterns = [
    /开票日期[：:]?\s*(\d{4})[年\-\/](\d{1,2})[月\-\/](\d{1,2})[日]?/i,
    /(\d{4})[年\-\/](\d{1,2})[月\-\/](\d{1,2})[日]/i,
    /(\d{4})\-(\d{2})\-(\d{2})/,
    /(\d{4})\/(\d{2})\/(\d{2})/,
  ];

  for (const pattern of datePatterns) {
    const match = text.match(pattern);
    if (match) {
      const year = match[1];
      const month = match[2].padStart(2, "0");
      const day = match[3].padStart(2, "0");
      return `${year}-${month}-${day}`;
    }
  }

  return "";
}

/**
 * 从文本位置映射中提取金额（更精确）
 */
function extractAmountFromTextMap(textMap: any[]): string {
  // 查找包含金额关键词的文本项
  const amountKeywords = ["价税合计", "合计", "总计", "金额"];

  for (const keyword of amountKeywords) {
    const keywordItem = textMap.find((item) => item.text.includes(keyword));
    if (keywordItem) {
      // 查找该关键词附近的数字
      const nearbyItems = textMap.filter(
        (item) =>
          Math.abs(item.y - keywordItem.y) < 20 && item.x > keywordItem.x
      );

      for (const item of nearbyItems) {
        const match = item.text.match(/[\d,]+\.?\d*/);
        if (match && parseFloat(match[0].replace(/,/g, "")) > 0) {
          return match[0].replace(/,/g, "");
        }
      }
    }
  }

  return "";
}

/**
 * 从文本位置映射中提取日期（更精确）
 */
function extractDateFromTextMap(textMap: any[]): string {
  const dateKeywords = ["开票日期", "日期"];

  for (const keyword of dateKeywords) {
    const keywordItem = textMap.find((item) => item.text.includes(keyword));
    if (keywordItem) {
      const nearbyItems = textMap.filter(
        (item) =>
          Math.abs(item.y - keywordItem.y) < 20 && item.x > keywordItem.x
      );

      for (const item of nearbyItems) {
        const dateMatch = item.text.match(
          /(\d{4})[年\-\/](\d{1,2})[月\-\/](\d{1,2})/
        );
        if (dateMatch) {
          const year = dateMatch[1];
          const month = dateMatch[2].padStart(2, "0");
          const day = dateMatch[3].padStart(2, "0");
          return `${year}-${month}-${day}`;
        }
      }
    }
  }

  return "";
}

/**
 * 从文本位置映射中提取发票类型（更精确）
 */
function extractTypeFromTextMap(textMap: any[]): string {
  const typePatterns = [
    { keywords: ["增值税专用发票"], type: "01" },
    { keywords: ["增值税普通发票"], type: "10" },
    { keywords: ["普通发票"], type: "04" },
  ];

  for (const { keywords, type } of typePatterns) {
    for (const keyword of keywords) {
      if (textMap.some((item) => item.text.includes(keyword))) {
        return type;
      }
    }
  }

  return "";
}

/**
 * 提取发票号码
 */
function extractInvoiceNumber(textMap: any[]): string {
  const numberKeywords = ["发票号码", "号码"];

  for (const keyword of numberKeywords) {
    const keywordItem = textMap.find((item) => item.text.includes(keyword));
    if (keywordItem) {
      const nearbyItems = textMap.filter(
        (item) =>
          Math.abs(item.y - keywordItem.y) < 20 && item.x > keywordItem.x
      );

      for (const item of nearbyItems) {
        const numberMatch = item.text.match(/\d{8,}/);
        if (numberMatch) {
          return numberMatch[0];
        }
      }
    }
  }

  return "";
}

/**
 * 创建合并后的PDF文档 - 使用智能布局算法
 */
async function createMergedDocument(
  allPages: PdfPageData[],
  options: {
    pagesPerSheet: number;
    targetPageSize: PageSize;
    scale: number;
  }
): Promise<PDFDocument> {
  const { pagesPerSheet, targetPageSize } = options;
  const outputPdfDoc = await PDFDocument.create();

  // 使用智能布局算法计算最优布局
  const layoutResult = calculateOptimalLayout(
    allPages,
    targetPageSize,
    pagesPerSheet
  );

  for (let i = 0; i < layoutResult.layouts.length; i++) {
    const newPage = outputPdfDoc.addPage([
      targetPageSize.width,
      targetPageSize.height,
    ]);
    const layout = layoutResult.layouts[i];

    for (let j = 0; j < layout.positions.length; j++) {
      const pageIndex = i * pagesPerSheet + j;
      if (pageIndex >= allPages.length) break;

      const { page } = allPages[pageIndex];
      const position = layout.positions[j];

      const embeddedPage = await outputPdfDoc.embedPage(page);
      newPage.drawPage(embeddedPage, {
        x: position.x,
        y: position.y,
        width: position.width,
        height: position.height,
      });
    }
  }

  return outputPdfDoc;
}

/**
 * 智能计算缩放比例和布局
 */
function calculateOptimalLayout(
  pages: PdfPageData[],
  targetPageSize: PageSize,
  pagesPerSheet: number = 2
): LayoutResult {
  const layouts: PageLayout[] = [];
  const halfHeight = targetPageSize.height / 2;

  // 为每个页面计算最优布局
  for (let i = 0; i < pages.length; i += pagesPerSheet) {
    const pagesToLayout = pages.slice(
      i,
      Math.min(i + pagesPerSheet, pages.length)
    );
    const pageLayout = calculatePageLayout(
      pagesToLayout,
      targetPageSize,
      halfHeight
    );
    layouts.push(pageLayout);
  }

  return { layouts };
}

/**
 * 计算单个合并页面的布局
 */
function calculatePageLayout(
  pages: PdfPageData[],
  targetPageSize: PageSize,
  halfHeight: number
): PageLayout {
  const positions: PagePosition[] = [];

  for (let i = 0; i < pages.length; i++) {
    const { width, height } = pages[i];
    const targetArea =
      i === 0
        ? { width: targetPageSize.width, height: halfHeight }
        : { width: targetPageSize.width, height: halfHeight };

    // 智能缩放算法
    const layout = calculateSmartScale(width, height, targetArea);

    const position: PagePosition = {
      x: layout.x,
      y: i === 0 ? targetPageSize.height - halfHeight + layout.y : layout.y,
      width: layout.width,
      height: layout.height,
      scale: layout.scale,
    };

    positions.push(position);
  }

  return { positions };
}

/**
 * 智能缩放算法 - 自动检测内容边界并优化布局
 */
function calculateSmartScale(
  srcWidth: number,
  srcHeight: number,
  targetArea: { width: number; height: number }
): ScaleResult {
  // 发票通常是竖向的，优化竖向布局
  const isLandscape = srcWidth > srcHeight;
  const aspectRatio = srcWidth / srcHeight;

  // 根据发票类型调整边距策略
  let marginRatio = 0.03; // 默认3%边距

  // 发票内容通常有固定的边距，我们可以更激进地利用空间
  if (aspectRatio > 0.6 && aspectRatio < 0.8) {
    // 典型发票比例，减少边距
    marginRatio = 0.02;
  }

  const margin = Math.min(targetArea.width, targetArea.height) * marginRatio;
  const availableWidth = targetArea.width - margin * 2;
  const availableHeight = targetArea.height - margin * 2;

  // 计算缩放比例，优先保证内容完整显示
  const scaleX = availableWidth / srcWidth;
  const scaleY = availableHeight / srcHeight;
  let finalScale = Math.min(scaleX, scaleY);

  // 智能缩放优化：如果缩放比例太小，尝试优化
  if (finalScale < 0.3) {
    // 内容太小，可能需要调整策略
    const minScale = 0.35;
    finalScale = Math.max(finalScale, minScale);
  } else if (finalScale > 0.95) {
    // 内容几乎填满，留一点边距
    finalScale = 0.95;
  }

  // 计算最终尺寸
  const finalWidth = srcWidth * finalScale;
  const finalHeight = srcHeight * finalScale;

  // 智能定位：考虑发票内容的重要区域
  let x = (targetArea.width - finalWidth) / 2;
  let y = (targetArea.height - finalHeight) / 2;

  // 发票重要信息通常在上半部分，稍微向上偏移
  if (!isLandscape) {
    y = Math.max(margin, y - targetArea.height * 0.02);
  }

  return {
    scale: finalScale,
    width: finalWidth,
    height: finalHeight,
    x,
    y,
  };
}

/**
 * 传统缩放计算（保持向后兼容）
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
function parseQRCode(
  pageNumber: number,
  qrCodeData: string | null
): InvoiceCell {
  if (!qrCodeData) {
    return { pageNumber, type: "", amount: "0", date: "", fileName: "" };
  }

  const [constNumber, type, code, number, amount, date, checkCode] =
    qrCodeData.split(",");
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

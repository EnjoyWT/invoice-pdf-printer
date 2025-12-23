import { PDFDocument, PDFPage, rgb } from "pdf-lib";
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

const DEBUG_PDF_PROCESSING = true;
const QR_REGION_RATIO = 0.38;
const QR_TARGET_FAST_PX = 440;
const QR_TARGET_RETRY_PX = 720;
const QR_SCALE_FAST_CAP = 1.3;
const QR_SCALE_RETRY_CAP = 2.4;

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
    const pdfBlob = new Blob([new Uint8Array(pdfBytes)], {
      type: "application/pdf",
    });

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
export async function processFiles(files: File[]): Promise<PdfPageData[]> {
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

    // 临时静默 pdf-lib 的内部警告（如 "Invalid object ref"）
    const originalWarn = console.warn;
    console.warn = () => {};
    const pdfDoc = await PDFDocument.load(arrayBuffer, {
      ignoreEncryption: true,
      throwOnInvalidObject: false,
    });
    console.warn = originalWarn;
    const pdfjsDocument = await pdfjs.getDocument({ data: arrayBuffer })
      .promise;

    // 已知每个文件都是单页发票：只处理第 1 页，避免无意义循环
    const j = 0;
    try {
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
        pageNumber: 1,
        originalPageIndex: 0,
      });
    } catch (pageError) {
      console.error(`处理文件 ${file.name} 第 1 页时出错:`, pageError);
      continue;
    }
  }

  return allPages;
}

/**
 * 提取发票信息 - 优化版,使用并发处理
 */
export async function extractInvoiceData(
  allPages: PdfPageData[]
): Promise<InvoiceCell[]> {
  const cellData: InvoiceCell[] = [];

  // 使用 Promise.all 批量并发处理
  const batchSize = 5; // render+扫码属于重活，并发太高反而会变慢/更卡

  for (let i = 0; i < allPages.length; i += batchSize) {
    const batch = allPages.slice(i, i + batchSize);

    const batchResults = await Promise.all(
      batch.map(async (pageData) => {
        return await extractSinglePageData(pageData);
      })
    );

    cellData.push(...batchResults);
  }

  return cellData;
}

/**
 * 提取单个页面的发票信息
 */
async function extractSinglePageData(
  pageData: PdfPageData
): Promise<InvoiceCell> {
  const { pdfjsPage, pageNumber, sourceFile } = pageData;

  try {
    const t0 = performance.now();

    const { qrData, timings } = await scanInvoiceQRCode(pdfjsPage);
    let invoiceInfo = parseQRCode(pageNumber, qrData);

    if (
      !invoiceInfo.amount ||
      invoiceInfo.amount === "0" ||
      !invoiceInfo.date ||
      !invoiceInfo.type ||
      !invoiceInfo.number
    ) {
      const textT0 = performance.now();
      const textContent = await pdfjsPage.getTextContent();
      const textItems = textContent.items;
      const fullText = textItems.map((item: any) => item.str).join(" ");

      if (!invoiceInfo.type) {
        invoiceInfo.type = extractInvoiceType(fullText);
      }
      if (!invoiceInfo.amount || invoiceInfo.amount === "0") {
        const amountFromText = extractAmount(fullText);
        if (amountFromText && amountFromText !== "0") {
          invoiceInfo.amount = amountFromText;
        }
      }
      if (!invoiceInfo.date) {
        invoiceInfo.date = extractDate(fullText);
      }

      if (!invoiceInfo.number || !invoiceInfo.code || !invoiceInfo.checkCode) {
        const textMap = textItems.map((item: any) => ({
          text: item.str,
          x: item.transform[4],
          y: item.transform[5],
          width: item.width,
          height: item.height,
        }));

        if (!invoiceInfo.amount || invoiceInfo.amount === "0") {
          const amountFromMap = extractAmountFromTextMap(textMap);
          if (amountFromMap) invoiceInfo.amount = amountFromMap;
        }
        if (!invoiceInfo.date) {
          const dateFromMap = extractDateFromTextMap(textMap);
          if (dateFromMap) invoiceInfo.date = dateFromMap;
        }
        if (!invoiceInfo.type) {
          const typeFromMap = extractTypeFromTextMap(textMap);
          if (typeFromMap) invoiceInfo.type = typeFromMap;
        }
        if (!invoiceInfo.number) {
          const numberFromMap = extractInvoiceNumber(textMap);
          if (numberFromMap) invoiceInfo.number = numberFromMap;
        }
      }

      timings.textMs = performance.now() - textT0;
    }

    invoiceInfo.fileName = sourceFile;

    if (DEBUG_PDF_PROCESSING) {
      const totalMs = performance.now() - t0;
      console.log("[invoice]", {
        sourceFile,
        pageNumber,
        totalMs: Number(totalMs.toFixed(1)),
        ...timings,
        qrDataPreview: qrData ? qrData.slice(0, 60) : null,
        invoiceInfo,
      });
    }

    return invoiceInfo;
  } catch (error) {
    console.error(`处理页面 ${pageNumber} 时发生错误:`, error);
    return {
      pageNumber,
      fileName: sourceFile,
      type: "",
      amount: "0",
      date: "",
    };
  }
}

async function scanInvoiceQRCode(pdfjsPage: any): Promise<{
  qrData: string | null;
  timings: {
    renderMs?: number;
    qrMs?: number;
    textMs?: number;
    scaleFast?: number;
    scaleRetry?: number;
    usedRetry?: boolean;
    viewportFast?: { w: number; h: number };
    viewportRetry?: { w: number; h: number };
    regionFast?: { w: number; h: number };
    regionRetry?: { w: number; h: number };
  };
}> {
  const timings: {
    renderMs?: number;
    qrMs?: number;
    textMs?: number;
    scaleFast?: number;
    scaleRetry?: number;
    usedRetry?: boolean;
    viewportFast?: { w: number; h: number };
    viewportRetry?: { w: number; h: number };
    regionFast?: { w: number; h: number };
    regionRetry?: { w: number; h: number };
  } = {};

  const scaleFast = Math.min(
    QR_SCALE_FAST_CAP,
    getAdaptiveQrScale(pdfjsPage, QR_TARGET_FAST_PX)
  );
  timings.scaleFast = scaleFast;
  const fast = await scanInvoiceQRCodeOnce(pdfjsPage, scaleFast);
  timings.renderMs = (timings.renderMs ?? 0) + (fast.timings.renderMs ?? 0);
  timings.qrMs = (timings.qrMs ?? 0) + (fast.timings.qrMs ?? 0);
  if (fast.timings.viewport) timings.viewportFast = fast.timings.viewport;
  if (fast.timings.region) timings.regionFast = fast.timings.region;
  if (fast.qrData) return { qrData: fast.qrData, timings };

  const scaleRetry = Math.min(
    QR_SCALE_RETRY_CAP,
    getAdaptiveQrScale(pdfjsPage, QR_TARGET_RETRY_PX)
  );
  timings.scaleRetry = scaleRetry;
  timings.usedRetry = true;
  const retry = await scanInvoiceQRCodeOnce(pdfjsPage, scaleRetry);
  timings.renderMs = (timings.renderMs ?? 0) + (retry.timings.renderMs ?? 0);
  timings.qrMs = (timings.qrMs ?? 0) + (retry.timings.qrMs ?? 0);
  if (retry.timings.viewport) timings.viewportRetry = retry.timings.viewport;
  if (retry.timings.region) timings.regionRetry = retry.timings.region;
  return { qrData: retry.qrData, timings };
}

function getAdaptiveQrScale(pdfjsPage: any, targetQrPx: number): number {
  const baseViewport = pdfjsPage.getViewport({ scale: 1 });
  const denom = Math.max(1, baseViewport.width * QR_REGION_RATIO);
  const scale = targetQrPx / denom;

  if (!Number.isFinite(scale) || scale <= 0) return 1.4;
  // 性能优先：避免为“已经很清晰”的PDF渲染过大的像素。
  return Math.max(0.9, scale);
}

async function scanInvoiceQRCodeOnce(
  pdfjsPage: any,
  scale: number
): Promise<{
  qrData: string | null;
  timings: {
    renderMs?: number;
    qrMs?: number;
    viewport?: { w: number; h: number };
    region?: { w: number; h: number };
  };
}> {
  const timings: {
    renderMs?: number;
    qrMs?: number;
    viewport?: { w: number; h: number };
    region?: { w: number; h: number };
  } = {};
  const viewport = pdfjsPage.getViewport({ scale });
  timings.viewport = { w: viewport.width, h: viewport.height };

  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) {
    throw new Error("无法获取Canvas 2D渲染上下文");
  }

  canvas.width = viewport.width;
  canvas.height = viewport.height;

  const renderT0 = performance.now();
  await pdfjsPage.render({ canvasContext: context, viewport }).promise;
  timings.renderMs = performance.now() - renderT0;

  const scanWidth = Math.max(1, Math.floor(canvas.width * QR_REGION_RATIO));
  const scanHeight = Math.max(1, Math.floor(canvas.height * QR_REGION_RATIO));
  timings.region = { w: scanWidth, h: scanHeight };

  const cropCanvas = document.createElement("canvas");
  cropCanvas.width = scanWidth;
  cropCanvas.height = scanHeight;
  const cropCtx = cropCanvas.getContext("2d", { willReadFrequently: true });
  if (!cropCtx) {
    throw new Error("无法获取裁剪Canvas 2D渲染上下文");
  }

  cropCtx.drawImage(
    canvas,
    0,
    0,
    scanWidth,
    scanHeight,
    0,
    0,
    scanWidth,
    scanHeight
  );
  const imageData = cropCtx.getImageData(0, 0, scanWidth, scanHeight);

  const qrT0 = performance.now();
  const qrCode = jsQR(imageData.data, scanWidth, scanHeight, {
    inversionAttempts: "attemptBoth",
  });
  timings.qrMs = performance.now() - qrT0;

  return { qrData: qrCode?.data ?? null, timings };
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
export async function createMergedDocument(
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

      try {
        const { page } = allPages[pageIndex];
        const position = layout.positions[j];

        // 直接使用已经处理过的页面（已经过裁剪和位置调整）
        // 这样可以保留 processFiles 中对 bleedBox/cropBox 的处理结果
        const embeddedPage = await outputPdfDoc.embedPage(page);

        newPage.drawPage(embeddedPage, {
          x: position.x,
          y: position.y,
          width: position.width,
          height: position.height,
        });
      } catch (embedError) {
        console.error(`嵌入页面 ${pageIndex + 1} 时出错:`, embedError);
        // 跳过问题页面,继续处理下一页
        continue;
      }
    }

    // 在两个发票之间绘制虚线分隔线
    if (pagesPerSheet === 2 && layout.positions.length === 2) {
      const middleY = targetPageSize.height / 2;
      const margin = 10; // 左右边距

      newPage.drawLine({
        start: { x: margin, y: middleY },
        end: { x: targetPageSize.width - margin, y: middleY },
        thickness: 0.5,
        color: rgb(0.7, 0.7, 0.7),
        dashArray: [3, 3], // 虚线样式: 3个单位实线, 3个单位空白
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

  const normalize = (v?: string) => (v ?? "").trim();
  const normalizeDate = (v?: string) => {
    const raw = normalize(v);
    if (!raw) return "";
    const digits = raw.replace(/\D/g, "");
    if (digits.length >= 8) {
      return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
    }
    return raw;
  };

  const [constNumber, type, code, number, amount, date, checkCode] =
    qrCodeData.split(",");

  const formattedDate = normalizeDate(date);

  return {
    pageNumber,
    constNumber: normalize(constNumber),
    type: normalize(type),
    code: normalize(code),
    number: normalize(number),
    amount: normalize(amount) || "0",
    date: formattedDate,
    checkCode: normalize(checkCode),
    fileName: "",
  };
}

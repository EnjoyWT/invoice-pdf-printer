/**
 * PDF 处理 Web Worker
 * 将 CPU 密集型的 PDF 处理任务移到后台线程，避免阻塞主线程
 * 注意：Worker 内部使用 pdfjs 时需禁用嵌套 Worker（disableWorker: true）
 */

import { PDFDocument, rgb } from "pdf-lib";
import * as pdfjs from "pdfjs-dist";
import jsQR from "jsqr";

// 配置常量
const QR_REGION_RATIO = 0.38;
const QR_SCALE_FAST = 1.3;
const QR_SCALE_RETRY = 2.4;
const QR_TARGET_FAST_PX = 440;
const QR_TARGET_RETRY_PX = 720;

// 消息类型定义
interface WorkerMessage {
  type: "process" | "cancel";
  id: string;
  files?: ArrayBuffer[];
  fileNames?: string[];
}

interface WorkerResponse {
  type: "progress" | "invoice" | "complete" | "error";
  id: string;
  progress?: number;
  invoice?: InvoiceCell;
  pdfBlob?: ArrayBuffer;
  invoices?: InvoiceCell[];
  error?: string;
}

interface InvoiceCell {
  pageNumber: number;
  fileName: string;
  type: string;
  amount: string;
  date: string;
  number?: string;
  code?: string;
  checkCode?: string;
  constNumber?: string;
}

interface PageData {
  doc: PDFDocument;
  width: number;
  height: number;
  sourceFile: string;
  pageIndex: number;
  arrayBuffer: ArrayBuffer;
}

// 监听主线程消息
self.onmessage = async (event: MessageEvent<WorkerMessage>) => {
  const { type, id, files, fileNames } = event.data;

  if (type === "process" && files && fileNames) {
    try {
      await processFiles(id, files, fileNames);
    } catch (error) {
      sendResponse({
        type: "error",
        id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
};

// 发送响应到主线程
function sendResponse(response: WorkerResponse): void {
  self.postMessage(response);
}

// 处理文件
async function processFiles(
  id: string,
  buffers: ArrayBuffer[],
  fileNames: string[]
): Promise<void> {
  const allPages: PageData[] = [];
  const invoices: InvoiceCell[] = [];

  // 阶段1：解析 PDF 文件
  sendResponse({ type: "progress", id, progress: 5 });

  for (let i = 0; i < buffers.length; i++) {
    const buffer = buffers[i];
    const fileName = fileNames[i];

    try {
      const pdfDoc = await PDFDocument.load(buffer, {
        ignoreEncryption: true,
        throwOnInvalidObject: false,
      });

      const page = pdfDoc.getPage(0);
      const cropBox = page.getCropBox();
      const width = cropBox?.width > 0 ? cropBox.width : page.getMediaBox().width;
      const height = cropBox?.height > 0 ? cropBox.height : page.getMediaBox().height;

      allPages.push({
        doc: pdfDoc,
        width,
        height,
        sourceFile: fileName,
        pageIndex: 0,
        arrayBuffer: buffer,
      });

      // 进度更新
      const progress = 5 + Math.round((i / buffers.length) * 25);
      sendResponse({ type: "progress", id, progress });
    } catch (error) {
      console.error(`处理文件 ${fileName} 失败:`, error);
    }
  }

  // 阶段2：提取发票信息（QR扫描）
  sendResponse({ type: "progress", id, progress: 30 });

  for (let i = 0; i < allPages.length; i++) {
    const pageData = allPages[i];

    try {
      const invoice = await extractInvoiceData(pageData);
      invoices.push(invoice);

      // 流式发送每张发票信息
      sendResponse({ type: "invoice", id, invoice });

      // 进度更新
      const progress = 30 + Math.round((i / allPages.length) * 40);
      sendResponse({ type: "progress", id, progress });
    } catch (error) {
      console.error(`提取发票信息失败 ${pageData.sourceFile}:`, error);
      invoices.push({
        pageNumber: i + 1,
        fileName: pageData.sourceFile,
        type: "",
        amount: "0",
        date: "",
      });
    }
  }

  // 阶段3：合并 PDF
  sendResponse({ type: "progress", id, progress: 70 });

  const mergedPdfBytes = await createMergedDocument(allPages);
  sendResponse({ type: "progress", id, progress: 95 });

  // 完成
  sendResponse({
    type: "complete",
    id,
    pdfBlob: mergedPdfBytes,
    invoices,
  });
}

// 提取发票信息
async function extractInvoiceData(pageData: PageData): Promise<InvoiceCell> {
  const { arrayBuffer, sourceFile, pageIndex } = pageData;

  // 使用 pdfjs 加载文档（Worker 内部禁用嵌套 Worker）
  const pdfjsDoc = await pdfjs.getDocument({
    data: arrayBuffer,
    disableWorker: true,
  } as any).promise;
  const pdfjsPage = await pdfjsDoc.getPage(1);

  // 尝试扫描 QR 码
  const qrData = await scanQRCode(pdfjsPage);
  let invoice = parseQRCode(pageIndex + 1, qrData);

  // 如果 QR 扫描失败，尝试文本提取
  if (!invoice.amount || invoice.amount === "0" || !invoice.date || !invoice.type) {
    const textContent = await pdfjsPage.getTextContent();
    const fullText = textContent.items.map((item: any) => item.str).join(" ");

    if (!invoice.type) {
      invoice.type = extractInvoiceType(fullText);
    }
    if (!invoice.amount || invoice.amount === "0") {
      invoice.amount = extractAmount(fullText);
    }
    if (!invoice.date) {
      invoice.date = extractDate(fullText);
    }
  }

  invoice.fileName = sourceFile;
  await pdfjsDoc.destroy();

  return invoice;
}

// 扫描 QR 码（使用 OffscreenCanvas）
async function scanQRCode(pdfjsPage: any): Promise<string | null> {
  // 快速扫描
  const fastResult = await scanQRCodeOnce(pdfjsPage, QR_SCALE_FAST);
  if (fastResult) return fastResult;

  // 重试更高分辨率
  return await scanQRCodeOnce(pdfjsPage, QR_SCALE_RETRY);
}

async function scanQRCodeOnce(pdfjsPage: any, scale: number): Promise<string | null> {
  const viewport = pdfjsPage.getViewport({ scale });

  // 使用 OffscreenCanvas（Worker 中可用）
  const canvas = new OffscreenCanvas(viewport.width, viewport.height);
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("无法获取 OffscreenCanvas 2D 上下文");
  }

  await pdfjsPage.render({ canvasContext: context, viewport }).promise;

  // 裁剪 QR 码区域（左上角）
  const scanWidth = Math.floor(canvas.width * QR_REGION_RATIO);
  const scanHeight = Math.floor(canvas.height * QR_REGION_RATIO);

  const imageData = context.getImageData(0, 0, scanWidth, scanHeight);
  const qrCode = jsQR(imageData.data, scanWidth, scanHeight, {
    inversionAttempts: "attemptBoth",
  });

  return qrCode?.data ?? null;
}

// 解析 QR 码数据
function parseQRCode(pageNumber: number, qrData: string | null): InvoiceCell {
  if (!qrData) {
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

  const [constNumber, type, code, number, amount, date, checkCode] = qrData.split(",");

  return {
    pageNumber,
    constNumber: normalize(constNumber),
    type: normalize(type),
    code: normalize(code),
    number: normalize(number),
    amount: normalize(amount) || "0",
    date: normalizeDate(date),
    checkCode: normalize(checkCode),
    fileName: "",
  };
}

// 从文本提取发票类型
function extractInvoiceType(text: string): string {
  const typePatterns = [
    { pattern: /增值税专用发票/i, type: "01" },
    { pattern: /增值税普通发票/i, type: "10" },
    { pattern: /普通发票/i, type: "04" },
    { pattern: /机动车销售统一发票/i, type: "03" },
  ];

  for (const { pattern, type } of typePatterns) {
    if (pattern.test(text)) return type;
  }
  return "";
}

// 从文本提取金额
function extractAmount(text: string): string {
  const patterns = [
    /价税合计[：:]?\s*¥?\s*([\d,]+\.?\d*)/i,
    /合计[：:]?\s*¥?\s*([\d,]+\.?\d*)/i,
    /总计[：:]?\s*¥?\s*([\d,]+\.?\d*)/i,
    /金额[：:]?\s*¥?\s*([\d,]+\.?\d*)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match[1].replace(/,/g, "");
  }
  return "0";
}

// 从文本提取日期
function extractDate(text: string): string {
  const patterns = [
    /开票日期[：:]?\s*(\d{4})[年\-\/](\d{1,2})[月\-\/](\d{1,2})[日]?/i,
    /(\d{4})[年\-\/](\d{1,2})[月\-\/](\d{1,2})[日]/i,
    /(\d{4})\-(\d{2})\-(\d{2})/,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const [, year, month, day] = match;
      return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
    }
  }
  return "";
}

// 创建合并后的 PDF
async function createMergedDocument(pages: PageData[]): Promise<ArrayBuffer> {
  const outputPdf = await PDFDocument.create();
  const targetWidth = 595.28; // A4
  const targetHeight = 841.89;
  const halfHeight = targetHeight / 2;

  for (let i = 0; i < pages.length; i += 2) {
    const newPage = outputPdf.addPage([targetWidth, targetHeight]);

    // 上半部分
    if (i < pages.length) {
      await embedPageInPosition(outputPdf, newPage, pages[i], {
        targetWidth,
        targetHeight: halfHeight,
        offsetY: halfHeight,
      });
    }

    // 下半部分
    if (i + 1 < pages.length) {
      await embedPageInPosition(outputPdf, newPage, pages[i + 1], {
        targetWidth,
        targetHeight: halfHeight,
        offsetY: 0,
      });
    }

    // 绘制分隔线
    if (i + 1 < pages.length) {
      newPage.drawLine({
        start: { x: 10, y: halfHeight },
        end: { x: targetWidth - 10, y: halfHeight },
        thickness: 0.5,
        color: rgb(0.7, 0.7, 0.7),
        dashArray: [3, 3],
      });
    }
  }

  const pdfBytes = await outputPdf.save({ updateFieldAppearances: false });
  return pdfBytes.buffer.slice(pdfBytes.byteOffset, pdfBytes.byteOffset + pdfBytes.byteLength) as ArrayBuffer;
}

// 嵌入页面到指定位置
async function embedPageInPosition(
  outputPdf: PDFDocument,
  targetPage: any,
  pageData: PageData,
  options: { targetWidth: number; targetHeight: number; offsetY: number }
): Promise<void> {
  const { targetWidth, targetHeight, offsetY } = options;
  const { doc, width, height } = pageData;

  // 计算缩放比例
  const scaleX = (targetWidth * 0.95) / width;
  const scaleY = (targetHeight * 0.95) / height;
  const scale = Math.min(scaleX, scaleY);

  const finalWidth = width * scale;
  const finalHeight = height * scale;
  const x = (targetWidth - finalWidth) / 2;
  const y = offsetY + (targetHeight - finalHeight) / 2;

  try {
    const [embeddedPage] = await outputPdf.embedPdf(doc, [0]);
    targetPage.drawPage(embeddedPage, { x, y, width: finalWidth, height: finalHeight });
  } catch (error) {
    console.error("嵌入页面失败:", error);
  }
}

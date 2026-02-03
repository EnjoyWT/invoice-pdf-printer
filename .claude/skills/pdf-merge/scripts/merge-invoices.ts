/**
 * 发票 PDF 合并独立脚本
 * 依赖: pdf-lib, pdf-parse
 * 运行: npx ts-node merge-invoices.ts
 */

import { PDFDocument, rgb, PDFPage } from "pdf-lib";
import * as fs from "fs";
import * as path from "path";
// @ts-ignore
import pdfParse from "pdf-parse";

// ============ 类型定义 ============

export interface InvoiceInfo {
  pageNumber: number;
  fileName: string;
  type: string;
  amount: string;
  date: string;
  number?: string;
}

export interface MergeInvoicesOptions {
  /** 必须：发票 PDF 文件路径数组 */
  inputPaths: string[];
  /** 可选：输出 PDF 路径，默认生成临时路径 */
  outputPath?: string;
  /** 可选：是否提取金额信息，默认 false */
  extractAmount?: boolean;
}

export interface MergeInvoicesResult {
  /** 合并后的 PDF 文件路径 */
  outputPath: string;
  /** 发票信息（如果 extractAmount 为 true） */
  invoices?: InvoiceInfo[];
  /** 总金额（如果 extractAmount 为 true） */
  totalAmount?: number;
  /** 总页数 */
  totalPages: number;
}

// ============ 常量配置 ============

const A4_SIZE = { width: 595.28, height: 841.89 };
const PAGES_PER_SHEET = 2;

// ============ 文本提取函数 ============

function extractInvoiceType(text: string): string {
  const typePatterns = [
    { pattern: /增值税专用发票/i, type: "增值税专用发票" },
    { pattern: /增值税普通发票/i, type: "增值税普通发票" },
    { pattern: /电子普通发票/i, type: "电子普通发票" },
    { pattern: /普通发票/i, type: "普通发票" },
    { pattern: /机动车销售统一发票/i, type: "机动车销售统一发票" },
  ];

  for (const { pattern, type } of typePatterns) {
    if (pattern.test(text)) {
      return type;
    }
  }
  return "";
}

function extractAmount(text: string): string {
  // 策略1: 精确匹配关键词后的金额
  const amountPatterns = [
    /(?:价税合计|小写)[（(]?[¥￥]?[)）]?\s*[：:]?\s*[¥￥]?\s*([\d,]+\.?\d*)/i,
    /(?:合\s*计)[：:]?\s*[¥￥]?\s*([\d,]+\.?\d*)/i,
    /(?:总\s*计)[：:]?\s*[¥￥]?\s*([\d,]+\.?\d*)/i,
  ];

  for (const pattern of amountPatterns) {
    const match = text.match(pattern);
    if (match) {
      const amount = match[1].replace(/,/g, "");
      if (parseFloat(amount) > 0) {
        return amount;
      }
    }
  }

  // 策略2: 提取所有 ¥/￥ 后的金额，取最后一个（价税合计通常在末尾）
  const allAmounts = text.match(/[¥￥]\s*([\d,]+\.?\d+)/g);
  if (allAmounts && allAmounts.length > 0) {
    const lastAmount = allAmounts[allAmounts.length - 1];
    const match = lastAmount.match(/[\d,]+\.?\d+/);
    if (match) {
      const amount = match[0].replace(/,/g, "");
      if (parseFloat(amount) > 0) {
        return amount;
      }
    }
  }

  // 策略3: 匹配大写金额并转换
  const chineseAmountMatch = text.match(
    /([零壹贰叁肆伍陆柒捌玖拾佰仟万亿]+圆[零壹贰叁肆伍陆柒捌玖角分整]+)/,
  );
  if (chineseAmountMatch) {
    const converted = convertChineseAmount(chineseAmountMatch[1]);
    if (converted > 0) {
      return converted.toFixed(2);
    }
  }

  return "0";
}

function convertChineseAmount(chinese: string): number {
  const digitMap: Record<string, number> = {
    零: 0,
    壹: 1,
    贰: 2,
    叁: 3,
    肆: 4,
    伍: 5,
    陆: 6,
    柒: 7,
    捌: 8,
    玖: 9,
  };
  const unitMap: Record<string, number> = {
    拾: 10,
    佰: 100,
    仟: 1000,
    万: 10000,
    亿: 100000000,
  };

  let result = 0;
  let temp = 0;
  let section = 0;

  // 分离整数和小数部分
  const [intPart, decPart] = chinese.split("圆");

  // 处理整数部分
  for (const char of intPart) {
    if (digitMap[char] !== undefined) {
      temp = digitMap[char];
    } else if (unitMap[char] !== undefined) {
      if (char === "万" || char === "亿") {
        section = (section + temp) * unitMap[char];
        temp = 0;
      } else {
        section += temp * unitMap[char];
        temp = 0;
      }
    }
  }
  result = section + temp;

  // 处理小数部分
  if (decPart) {
    const jiao = decPart.match(/([零壹贰叁肆伍陆柒捌玖])角/);
    const fen = decPart.match(/([零壹贰叁肆伍陆柒捌玖])分/);
    if (jiao) result += digitMap[jiao[1]] * 0.1;
    if (fen) result += digitMap[fen[1]] * 0.01;
  }

  return result;
}

function extractDate(text: string): string {
  const datePatterns = [
    /开票日期[：:]?\s*(\d{4})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日/i,
    /(\d{4})[年\-\/](\d{1,2})[月\-\/](\d{1,2})[日]?/i,
    /(\d{4})\-(\d{2})\-(\d{2})/,
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

function extractInvoiceNumber(text: string): string {
  const patterns = [/发票号码[：:]\s*(\d{8,20})/i, /No[.:：]\s*(\d{8,20})/i];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return match[1];
    }
  }
  return "";
}

// ============ PDF 处理函数 ============

interface PageData {
  doc: PDFDocument;
  page: PDFPage; // 处理后的页面（已裁剪）
  pageIndex: number;
  width: number;
  height: number;
  fileName: string;
  text?: string;
}

async function loadPdfPages(filePaths: string[]): Promise<PageData[]> {
  const allPages: PageData[] = [];

  for (const filePath of filePaths) {
    if (!fs.existsSync(filePath)) {
      console.warn(`文件不存在: ${filePath}`);
      continue;
    }

    const fileBuffer = fs.readFileSync(filePath);

    // 静默 pdf-lib 的内部警告
    const originalWarn = console.warn;
    console.warn = () => {};

    const pdfDoc = await PDFDocument.load(fileBuffer, {
      ignoreEncryption: true,
    });

    console.warn = originalWarn;

    const fileName = path.basename(filePath);

    // 每个发票通常是单页，只取第一页
    const pageIndex = 0;
    const page = pdfDoc.getPage(pageIndex);

    // 处理 cropBox/bleedBox，去掉不可见区域
    let width: number, height: number;
    let processedPage: PDFPage;

    const cropBox = page.getCropBox();

    if (cropBox?.width > 0 && cropBox?.height > 0) {
      // 复制页面进行处理
      const [copiedPage] = await pdfDoc.copyPages(pdfDoc, [pageIndex]);
      const bleedBox = page.getBleedBox() || cropBox;

      if (bleedBox?.width > 0 && bleedBox?.height > 0) {
        // 使用 bleedBox（出血框）
        copiedPage.setSize(bleedBox.width, bleedBox.height);
        copiedPage.translateContent(-bleedBox.x, -bleedBox.y);
        copiedPage.setCropBox(0, 0, bleedBox.width, bleedBox.height);
        copiedPage.setMediaBox(0, 0, bleedBox.width, bleedBox.height);
        width = bleedBox.width;
        height = bleedBox.height;
      } else {
        // 使用 cropBox（裁剪框）
        copiedPage.setSize(cropBox.width, cropBox.height);
        copiedPage.translateContent(-cropBox.x, -cropBox.y);
        copiedPage.setCropBox(0, 0, cropBox.width, cropBox.height);
        copiedPage.setMediaBox(0, 0, cropBox.width, cropBox.height);
        width = cropBox.width;
        height = cropBox.height;
      }
      processedPage = copiedPage;
    } else {
      // 没有 cropBox，使用 mediaBox
      const mediaBox = page.getMediaBox();
      processedPage = page;
      width = mediaBox.width;
      height = mediaBox.height;
    }

    // 提取文本
    let text = "";
    try {
      const parsed = await pdfParse(fileBuffer);
      text = parsed.text || "";
    } catch (e) {
      console.warn(`提取文本失败: ${fileName}`);
    }

    allPages.push({
      doc: pdfDoc,
      page: processedPage,
      pageIndex,
      width,
      height,
      fileName,
      text,
    });
  }

  return allPages;
}

function extractInvoiceInfo(
  pageData: PageData,
  pageNumber: number,
): InvoiceInfo {
  const text = pageData.text || "";

  return {
    pageNumber,
    fileName: pageData.fileName,
    type: extractInvoiceType(text),
    amount: extractAmount(text),
    date: extractDate(text),
    number: extractInvoiceNumber(text),
  };
}

interface ScaleResult {
  scale: number;
  width: number;
  height: number;
  x: number;
  y: number;
}

function calculateScale(
  srcWidth: number,
  srcHeight: number,
  targetWidth: number,
  targetHeight: number,
): ScaleResult {
  const margin = Math.min(targetWidth, targetHeight) * 0.02;
  const availableWidth = targetWidth - margin * 2;
  const availableHeight = targetHeight - margin * 2;

  const scaleX = availableWidth / srcWidth;
  const scaleY = availableHeight / srcHeight;
  let scale = Math.min(scaleX, scaleY);

  if (scale > 0.95) scale = 0.95;
  if (scale < 0.3) scale = 0.35;

  const width = srcWidth * scale;
  const height = srcHeight * scale;
  const x = (targetWidth - width) / 2;
  const y = (targetHeight - height) / 2;

  return { scale, width, height, x, y };
}

async function createMergedPdf(pages: PageData[]): Promise<Uint8Array> {
  const outputDoc = await PDFDocument.create();
  const halfHeight = A4_SIZE.height / 2;

  for (let i = 0; i < pages.length; i += PAGES_PER_SHEET) {
    const newPage = outputDoc.addPage([A4_SIZE.width, A4_SIZE.height]);

    for (let j = 0; j < PAGES_PER_SHEET; j++) {
      const pageIndex = i + j;
      if (pageIndex >= pages.length) break;

      const pageData = pages[pageIndex];

      try {
        // 使用 embedPage 嵌入已处理的页面（已裁剪掉不可见区域）
        const embeddedPage = await outputDoc.embedPage(pageData.page);

        const layout = calculateScale(
          pageData.width,
          pageData.height,
          A4_SIZE.width,
          halfHeight,
        );

        const yOffset = j === 0 ? halfHeight : 0;

        newPage.drawPage(embeddedPage, {
          x: layout.x,
          y: yOffset + layout.y,
          width: layout.width,
          height: layout.height,
        });
      } catch (embedError) {
        console.error(`嵌入页面 ${pageIndex + 1} 时出错:`, embedError);
        continue;
      }
    }

    // 绘制中间虚线分隔
    if (pages.length > i + 1 || (i === 0 && pages.length === 1)) {
      const middleY = A4_SIZE.height / 2;
      newPage.drawLine({
        start: { x: 10, y: middleY },
        end: { x: A4_SIZE.width - 10, y: middleY },
        thickness: 0.5,
        color: rgb(0.7, 0.7, 0.7),
        dashArray: [3, 3],
      });
    }
  }

  return outputDoc.save();
}

// ============ 主函数 ============

export async function mergeInvoices(
  options: MergeInvoicesOptions,
): Promise<MergeInvoicesResult> {
  const {
    inputPaths,
    outputPath,
    extractAmount: shouldExtract = false,
  } = options;

  if (!inputPaths || inputPaths.length === 0) {
    throw new Error("请提供至少一个发票文件路径");
  }

  // 加载所有 PDF 页面
  const pages = await loadPdfPages(inputPaths);

  if (pages.length === 0) {
    throw new Error("没有有效的 PDF 文件");
  }

  // 提取发票信息（如果需要）
  let invoices: InvoiceInfo[] | undefined;
  let totalAmount: number | undefined;

  if (shouldExtract) {
    invoices = pages.map((page, index) => extractInvoiceInfo(page, index + 1));
    totalAmount = invoices.reduce((sum, inv) => {
      const amount = parseFloat(inv.amount) || 0;
      return sum + amount;
    }, 0);
  }

  // 合并 PDF
  const pdfBytes = await createMergedPdf(pages);

  // 确定输出路径
  const finalOutputPath =
    outputPath || path.join(process.cwd(), `merged-invoices-${Date.now()}.pdf`);

  // 写入文件
  fs.writeFileSync(finalOutputPath, pdfBytes);

  return {
    outputPath: finalOutputPath,
    invoices,
    totalAmount,
    totalPages: Math.ceil(pages.length / PAGES_PER_SHEET),
  };
}

// ============ CLI 入口 ============

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log(`
用法: npx ts-node merge-invoices.ts [选项] <文件路径...>

选项:
  -o, --output <path>   指定输出文件路径
  -e, --extract         提取发票金额信息
  -h, --help            显示帮助

示例:
  npx ts-node merge-invoices.ts invoice1.pdf invoice2.pdf
  npx ts-node merge-invoices.ts -o merged.pdf -e *.pdf
`);
    process.exit(0);
  }

  let outputPath: string | undefined;
  let extractAmount = false;
  const inputPaths: string[] = [];

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "-o" || arg === "--output") {
      outputPath = args[++i];
    } else if (arg === "-e" || arg === "--extract") {
      extractAmount = true;
    } else if (arg === "-h" || arg === "--help") {
      console.log("使用 --help 查看帮助");
      process.exit(0);
    } else if (!arg.startsWith("-")) {
      inputPaths.push(arg);
    }
  }

  try {
    console.log(`处理 ${inputPaths.length} 个文件...`);

    const result = await mergeInvoices({
      inputPaths,
      outputPath,
      extractAmount,
    });

    console.log(`\n合并完成!`);
    console.log(`输出文件: ${result.outputPath}`);
    console.log(`总页数: ${result.totalPages}`);

    if (result.invoices) {
      console.log(`\n发票信息:`);
      result.invoices.forEach((inv) => {
        console.log(
          `  ${inv.pageNumber}. ${inv.fileName} - ${inv.type} - ¥${inv.amount} - ${inv.date}`,
        );
      });
      console.log(`\n总金额: ¥${result.totalAmount?.toFixed(2)}`);
    }
  } catch (error) {
    console.error("错误:", (error as Error).message);
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main();
}

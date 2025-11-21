// 发票相关类型定义
export interface InvoiceCell {
  pageNumber: number;
  fileName: string;
  type: string;
  amount: string;
  date: string;
  constNumber?: string;
  code?: string;
  number?: string;
  checkCode?: string;
}

export interface PdfPageData {
  doc: import("pdf-lib").PDFDocument;
  page: import("pdf-lib").PDFPage;
  pdfjsPage: import("pdfjs-dist").PDFPageProxy;
  width: number;
  height: number;
  sourceFile: string;
  pageNumber: number;
  originalPageIndex: number; // 页面在原始文档中的索引
}

export interface PageSize {
  width: number;
  height: number;
}

export interface MergePDFOptions {
  files: File[];
  pagesPerSheet?: number;
  targetPageSize?: PageSize;
  scale?: number;
  onProgress?: (progress: number) => void;
  onError?: (error: Error) => void;
}

export interface MergePDFResult {
  pdfBlob: Blob;
  invoiceData: InvoiceCell[];
  totalPages: number;
}

// 新增的布局相关类型
export interface PagePosition {
  x: number;
  y: number;
  width: number;
  height: number;
  scale: number;
}

export interface PageLayout {
  positions: PagePosition[];
}

export interface LayoutResult {
  layouts: PageLayout[];
}

export interface ScaleResult {
  scale: number;
  width: number;
  height: number;
  x: number;
  y: number;
}

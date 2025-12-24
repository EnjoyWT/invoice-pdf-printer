/**
 * PDF 处理 Worker 管理器
 * 提供简洁的 API 在主线程中使用 Web Worker 处理 PDF
 */

import type { InvoiceCell } from "../types/invoice";

// 使用 Vite 的 Worker 导入语法
import PdfWorker from "./pdfProcessor.worker?worker";

// 回调类型
interface ProcessCallbacks {
  onProgress?: (progress: number) => void;
  onInvoice?: (invoice: InvoiceCell) => void;
  onComplete?: (result: ProcessResult) => void;
  onError?: (error: Error) => void;
}

interface ProcessResult {
  pdfBlob: Blob;
  invoices: InvoiceCell[];
}

// 请求跟踪
interface PendingRequest {
  callbacks: ProcessCallbacks;
  resolve: (result: ProcessResult) => void;
  reject: (error: Error) => void;
}

// Worker 单例
let worker: Worker | null = null;
let requestId = 0;
const pendingRequests = new Map<string, PendingRequest>();

/**
 * 获取或创建 Worker 实例
 */
function getWorker(): Worker {
  if (!worker) {
    worker = new PdfWorker();
    worker.onmessage = handleWorkerMessage;
    worker.onerror = handleWorkerError;
    console.log("[PdfWorker] Worker 已创建");
  }
  return worker;
}

/**
 * 处理 Worker 消息
 */
function handleWorkerMessage(event: MessageEvent): void {
  const { type, id, progress, invoice, pdfBlob, invoices, error } = event.data;

  const request = pendingRequests.get(id);
  if (!request) return;

  const { callbacks, resolve, reject } = request;

  switch (type) {
    case "progress":
      callbacks.onProgress?.(progress);
      break;

    case "invoice":
      callbacks.onInvoice?.(invoice);
      break;

    case "complete":
      const blob = new Blob([pdfBlob], { type: "application/pdf" });
      const result: ProcessResult = { pdfBlob: blob, invoices };
      callbacks.onComplete?.(result);
      resolve(result);
      pendingRequests.delete(id);
      break;

    case "error":
      const err = new Error(error);
      callbacks.onError?.(err);
      reject(err);
      pendingRequests.delete(id);
      break;
  }
}

/**
 * 处理 Worker 错误
 */
function handleWorkerError(event: ErrorEvent): void {
  console.error("[PdfWorker] Worker 错误:", event.message);

  // 通知所有待处理请求
  for (const [id, request] of pendingRequests) {
    const error = new Error(`Worker 错误: ${event.message}`);
    request.callbacks.onError?.(error);
    request.reject(error);
  }
  pendingRequests.clear();

  // 重置 Worker
  worker = null;
}

/**
 * 使用 Worker 处理 PDF 文件
 * @param files 要处理的文件列表
 * @param callbacks 回调函数
 * @returns Promise<ProcessResult>
 */
export async function processFilesInWorker(
  files: File[],
  callbacks: ProcessCallbacks = {}
): Promise<ProcessResult> {
  const id = `req_${++requestId}`;

  // 将文件转换为 ArrayBuffer
  const buffers: ArrayBuffer[] = [];
  const fileNames: string[] = [];

  for (const file of files) {
    buffers.push(await file.arrayBuffer());
    fileNames.push(file.name);
  }

  return new Promise((resolve, reject) => {
    pendingRequests.set(id, { callbacks, resolve, reject });

    const w = getWorker();
    w.postMessage(
      {
        type: "process",
        id,
        files: buffers,
        fileNames,
      },
      buffers // 转移所有权，避免复制
    );
  });
}

/**
 * 终止 Worker
 */
export function terminateWorker(): void {
  if (worker) {
    worker.terminate();
    worker = null;
    pendingRequests.clear();
    console.log("[PdfWorker] Worker 已终止");
  }
}

/**
 * 检查 Worker 是否可用
 */
export function isWorkerAvailable(): boolean {
  return typeof Worker !== "undefined";
}

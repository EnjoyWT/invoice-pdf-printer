/**
 * PDF 预加载管理器
 * 在页面加载时预初始化各种 PDF 相关引擎，消除首次处理延迟
 */

import * as pdfjs from "pdfjs-dist";
import jsQR from "jsqr";

// 使用本地化的 Worker（Vite 会自动打包）
import PdfjsWorkerUrl from "pdfjs-dist/build/pdf.worker.min.js?url";

// 注意：pdfium 引擎预加载通过 PdfEnginePreloader 组件实现

// 预加载状态
interface PreloadState {
  pdfjsReady: boolean;
  jsqrReady: boolean;
  pdfjsInitPromise: Promise<void> | null;
}

const state: PreloadState = {
  pdfjsReady: false,
  jsqrReady: false,
  pdfjsInitPromise: null,
};

/**
 * 初始化 PDF.js Worker（本地化）
 */
function initPdfjsWorker(): void {
  if (state.pdfjsReady) return;

  // 使用本地打包的 Worker，避免 CDN 延迟
  pdfjs.GlobalWorkerOptions.workerSrc = PdfjsWorkerUrl;
  state.pdfjsReady = true;

  console.log("[Preload] PDF.js Worker 已配置（本地化）");
}

/**
 * 预热 PDF.js - 加载一个最小 PDF 触发 Worker 初始化
 */
async function warmupPdfjs(): Promise<void> {
  if (state.pdfjsInitPromise) {
    return state.pdfjsInitPromise;
  }

  state.pdfjsInitPromise = (async () => {
    try {
      // 创建一个最小的有效 PDF
      const minimalPdf = new Uint8Array([
        0x25,
        0x50,
        0x44,
        0x46,
        0x2d,
        0x31,
        0x2e,
        0x34,
        0x0a, // %PDF-1.4\n
        0x31,
        0x20,
        0x30,
        0x20,
        0x6f,
        0x62,
        0x6a,
        0x0a, // 1 0 obj\n
        0x3c,
        0x3c,
        0x2f,
        0x54,
        0x79,
        0x70,
        0x65,
        0x2f,
        0x43,
        0x61,
        0x74,
        0x61,
        0x6c,
        0x6f,
        0x67,
        0x2f,
        0x50,
        0x61,
        0x67,
        0x65,
        0x73,
        0x20,
        0x32,
        0x20,
        0x30,
        0x20,
        0x52,
        0x3e,
        0x3e,
        0x0a, // <</Type/Catalog/Pages 2 0 R>>\n
        0x65,
        0x6e,
        0x64,
        0x6f,
        0x62,
        0x6a,
        0x0a, // endobj\n
        0x32,
        0x20,
        0x30,
        0x20,
        0x6f,
        0x62,
        0x6a,
        0x0a, // 2 0 obj\n
        0x3c,
        0x3c,
        0x2f,
        0x54,
        0x79,
        0x70,
        0x65,
        0x2f,
        0x50,
        0x61,
        0x67,
        0x65,
        0x73,
        0x2f,
        0x4b,
        0x69,
        0x64,
        0x73,
        0x5b,
        0x33,
        0x20,
        0x30,
        0x20,
        0x52,
        0x5d,
        0x2f,
        0x43,
        0x6f,
        0x75,
        0x6e,
        0x74,
        0x20,
        0x31,
        0x3e,
        0x3e,
        0x0a, // <</Type/Pages/Kids[3 0 R]/Count 1>>\n
        0x65,
        0x6e,
        0x64,
        0x6f,
        0x62,
        0x6a,
        0x0a, // endobj\n
        0x33,
        0x20,
        0x30,
        0x20,
        0x6f,
        0x62,
        0x6a,
        0x0a, // 3 0 obj\n
        0x3c,
        0x3c,
        0x2f,
        0x54,
        0x79,
        0x70,
        0x65,
        0x2f,
        0x50,
        0x61,
        0x67,
        0x65,
        0x2f,
        0x50,
        0x61,
        0x72,
        0x65,
        0x6e,
        0x74,
        0x20,
        0x32,
        0x20,
        0x30,
        0x20,
        0x52,
        0x2f,
        0x4d,
        0x65,
        0x64,
        0x69,
        0x61,
        0x42,
        0x6f,
        0x78,
        0x5b,
        0x30,
        0x20,
        0x30,
        0x20,
        0x31,
        0x20,
        0x31,
        0x5d,
        0x3e,
        0x3e,
        0x0a, // <</Type/Page/Parent 2 0 R/MediaBox[0 0 1 1]>>\n
        0x65,
        0x6e,
        0x64,
        0x6f,
        0x62,
        0x6a,
        0x0a, // endobj\n
        0x78,
        0x72,
        0x65,
        0x66,
        0x0a, // xref\n
        0x30,
        0x20,
        0x34,
        0x0a, // 0 4\n
        0x30,
        0x30,
        0x30,
        0x30,
        0x30,
        0x30,
        0x30,
        0x30,
        0x30,
        0x30,
        0x20,
        0x36,
        0x35,
        0x35,
        0x33,
        0x35,
        0x20,
        0x66,
        0x0a, // 0000000000 65535 f\n
        0x30,
        0x30,
        0x30,
        0x30,
        0x30,
        0x30,
        0x30,
        0x30,
        0x30,
        0x39,
        0x20,
        0x30,
        0x30,
        0x30,
        0x30,
        0x30,
        0x20,
        0x6e,
        0x0a, // 0000000009 00000 n\n
        0x30,
        0x30,
        0x30,
        0x30,
        0x30,
        0x30,
        0x30,
        0x30,
        0x35,
        0x38,
        0x20,
        0x30,
        0x30,
        0x30,
        0x30,
        0x30,
        0x20,
        0x6e,
        0x0a, // 0000000058 00000 n\n
        0x30,
        0x30,
        0x30,
        0x30,
        0x30,
        0x30,
        0x30,
        0x31,
        0x31,
        0x32,
        0x20,
        0x30,
        0x30,
        0x30,
        0x30,
        0x30,
        0x20,
        0x6e,
        0x0a, // 0000000112 00000 n\n
        0x74,
        0x72,
        0x61,
        0x69,
        0x6c,
        0x65,
        0x72,
        0x0a, // trailer\n
        0x3c,
        0x3c,
        0x2f,
        0x53,
        0x69,
        0x7a,
        0x65,
        0x20,
        0x34,
        0x2f,
        0x52,
        0x6f,
        0x6f,
        0x74,
        0x20,
        0x31,
        0x20,
        0x30,
        0x20,
        0x52,
        0x3e,
        0x3e,
        0x0a, // <</Size 4/Root 1 0 R>>\n
        0x73,
        0x74,
        0x61,
        0x72,
        0x74,
        0x78,
        0x72,
        0x65,
        0x66,
        0x0a, // startxref\n
        0x31,
        0x38,
        0x31,
        0x0a, // 181\n
        0x25,
        0x25,
        0x45,
        0x4f,
        0x46, // %%EOF
      ]);

      const loadingTask = pdfjs.getDocument({ data: minimalPdf });
      const doc = await loadingTask.promise;
      await doc.destroy();

      console.log("[Preload] PDF.js Worker 已预热");
    } catch (e) {
      console.warn("[Preload] PDF.js 预热失败（非致命）:", e);
    }
  })();

  return state.pdfjsInitPromise;
}

/**
 * 预热 jsQR - 空扫描一次触发 JIT 编译
 */
function warmupJsQR(): void {
  if (state.jsqrReady) return;

  try {
    // 创建一个小的空白 ImageData 进行预热
    const size = 10;
    const data = new Uint8ClampedArray(size * size * 4);
    jsQR(data, size, size);
    state.jsqrReady = true;
    console.log("[Preload] jsQR 已预热");
  } catch (e) {
    console.warn("[Preload] jsQR 预热失败（非致命）:", e);
  }
}

/**
 * 启动所有预加载任务
 * 应在页面加载时调用（如 App.vue 或 main.ts）
 */
export async function startPreload(): Promise<void> {
  const t0 = performance.now();
  console.log("[Preload] 开始预加载...");

  // 1. 配置 PDF.js Worker（同步，立即完成）
  initPdfjsWorker();

  // 2. 并行执行预热任务
  // 注意：pdfium 引擎通过 PdfEnginePreloader 组件预加载
  await Promise.all([warmupPdfjs(), Promise.resolve(warmupJsQR())]);

  const elapsed = performance.now() - t0;
  console.log(`[Preload] 预加载完成，耗时 ${elapsed.toFixed(0)}ms`);
}

/**
 * 获取预加载状态
 */
export function getPreloadState(): Readonly<PreloadState> {
  return { ...state };
}

/**
 * 等待 PDF.js 准备就绪
 */
export async function waitForPdfjs(): Promise<void> {
  if (!state.pdfjsReady) {
    initPdfjsWorker();
  }
  if (state.pdfjsInitPromise) {
    await state.pdfjsInitPromise;
  }
}

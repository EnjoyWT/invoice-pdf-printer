<template>
  <div class="flex flex-col h-screen w-full bg-gray-50">
    <!-- 顶部导航栏 -->
    <header
      ref="headerRef"
      class="w-full px-4 md:px-6 py-3 bg-white/90 backdrop-blur-md border-b border-gray-200/60 sticky top-0 z-50 flex-none"
    >
      <div
        class="max-w-7xl mx-auto flex justify-between items-center h-auto md:h-12 relative"
      >
        <!-- 左侧：Logo/标题和累计数 -->
        <div class="flex items-center space-x-2 md:space-x-4 flex-shrink-0">
          <div class="flex flex-col">
            <h1
              class="text-base md:text-lg font-bold text-gray-800 tracking-tight whitespace-nowrap"
            >
              发票助手
            </h1>
            <span
              v-if="showStats"
              class="text-[10px] text-gray-500 font-medium leading-none mt-0.5"
            >
              累计 {{ formattedTotalCount }} 张
            </span>
          </div>
        </div>

        <!-- 中间：操作按钮 -->
        <div
          class="flex items-center space-x-2 md:space-x-3 flex-shrink-0 ml-auto md:ml-0 md:absolute md:left-1/2 md:-translate-x-1/2"
        >
          <label
            for="fileInput"
            class="group relative px-3 py-1.5 md:px-4 md:py-2 bg-blue-600 text-white rounded-lg cursor-pointer hover:bg-blue-700 transition-all duration-200 shadow-sm hover:shadow-md flex items-center space-x-1 md:space-x-2 overflow-hidden whitespace-nowrap"
          >
            <div
              class="absolute inset-0 bg-white/20 -translate-x-full group-hover:translate-x-0 transition-transform duration-300 ease-out"
            ></div>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-4 w-4 relative z-10"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fill-rule="evenodd"
                d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z"
                clip-rule="evenodd"
              />
            </svg>
            <span class="text-xs md:text-sm font-medium relative z-10">{{
              cells.length > 0 ? "继续添加" : "选择发票"
            }}</span>
          </label>
          <input
            id="fileInput"
            type="file"
            class="hidden"
            multiple
            @change="handleFileChange"
            accept=".pdf"
          />

          <button
            class="px-3 py-1.5 md:px-4 md:py-2 bg-white text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 hover:text-gray-900 transition-all duration-200 flex items-center space-x-1 md:space-x-2 whitespace-nowrap"
            @click="
              (e) => {
                (e.currentTarget as HTMLElement).blur();
                clear();
              }
            "
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-4 w-4"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fill-rule="evenodd"
                d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                clip-rule="evenodd"
              />
            </svg>
            <span class="text-xs md:text-sm font-medium">清空</span>
          </button>
        </div>

        <!-- 右侧：统计信息 (移动端隐藏，空间不足) -->
        <div class="hidden md:flex items-center justify-end min-w-[200px]">
          <Transition
            enter-active-class="transition ease-out duration-200"
            enter-from-class="opacity-0 translate-y-1"
            enter-to-class="opacity-100 translate-y-0"
            leave-active-class="transition ease-in duration-150"
            leave-from-class="opacity-100 translate-y-0"
            leave-to-class="opacity-0 translate-y-1"
          >
            <div v-if="cells.length > 0">
              <InvoiceStats :invoices="cells" />
            </div>
          </Transition>
        </div>
      </div>
    </header>
    <!-- 处理进度提示 -->
    <ProcessingToast
      :show="isProcessing"
      :percentage="progress"
      :hasError="!!error"
      :errorMessage="error || ''"
      @close="error = null"
    />

    <!-- 主体内容区域 -->
    <div
      class="flex-1 w-full max-w-7xl mx-auto px-4 md:px-6 py-4 md:py-6 overflow-hidden flex flex-col min-h-0 mb-16 md:mb-0"
    >
      <div
        v-if="pdfSrc"
        class="flex-1 w-full flex flex-col md:flex-row gap-4 md:gap-6 overflow-hidden min-h-0"
      >
        <!-- PDF 预览区域 (仅在 PC 端显示) -->
        <div
          class="hidden md:block flex-1 h-full bg-gray-100 rounded-2xl overflow-hidden shadow-inner border border-gray-200"
        >
          <iframe class="w-full h-full" :src="pdfSrc" frameborder="0"></iframe>
        </div>

        <!-- 发票列表区域 -->
        <div
          class="w-full md:w-80 h-full flex flex-col bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden"
        >
          <div
            class="px-4 py-3 border-b border-gray-100 bg-gray-50/50 flex-none"
          >
            <h3 class="font-semibold text-gray-700 text-sm">发票明细</h3>
          </div>

          <!-- 批量操作栏 -->
          <BatchActionBar
            :count="pendingDeletions.size"
            @cancel="cancelDeletions"
            @confirm="confirmDeletions"
          />

          <InvoiceList
            :invoices="cells"
            :pendingDeletions="pendingDeletions"
            @toggleDeletion="toggleDeletion"
          />
        </div>
      </div>

      <!-- 空状态区域 -->
      <div
        v-else
        class="flex-1 w-full flex items-center justify-center"
        @dragover.prevent
        @drop="handleDrop"
      >
        <label
          for="fileInput"
          class="w-full max-w-2xl h-64 md:h-96 border-2 border-dashed border-gray-300 rounded-3xl flex flex-col items-center justify-center bg-gray-50/50 hover:bg-blue-50/30 hover:border-blue-400 transition-all duration-300 group cursor-pointer mx-4 md:mx-0"
        >
          <div
            class="w-16 h-16 md:w-20 md:h-20 bg-white rounded-full shadow-sm flex items-center justify-center mb-4 md:mb-6 group-hover:scale-110 transition-transform duration-300"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-8 w-8 md:h-10 md:w-10 text-gray-400 group-hover:text-blue-500 transition-colors duration-300"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="1.5"
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
          </div>
          <h3 class="text-lg md:text-xl font-semibold text-gray-700 mb-2">
            <span class="md:hidden">点击上传 PDF 文件</span>
            <span class="hidden md:inline">点击或拖拽 PDF 文件</span>
          </h3>
          <p class="text-gray-500 text-xs md:text-sm text-center px-4">
            支持多个文件同时上传，自动合并处理
          </p>
        </label>
      </div>

      <!-- 移动端底部操作栏 -->
      <div
        v-if="pdfSrc"
        class="md:hidden fixed bottom-0 left-0 w-full p-4 bg-white border-t border-gray-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-50"
      >
        <button
          @click="openPdfPreview"
          class="w-full py-3 bg-blue-600 text-white rounded-xl font-medium shadow-md active:scale-[0.98] transition-transform"
        >
          预览合并结果
        </button>
      </div>
      <LoadingView :isLoading="isLoading" :hasDetailedProgress="isProcessing" />
    </div>
  </div>
</template>

<script setup lang="ts">
import * as pdfjs from "pdfjs-dist";
import { ref, onMounted, computed, type Ref } from "vue";
import LoadingView from "../components/ui/LoadingView.vue";
import InvoiceStats from "../components/business/InvoiceStats.vue";
import ProcessingToast from "../components/ui/ProcessingToast.vue";
import InvoiceList from "../components/business/InvoiceList.vue";
import BatchActionBar from "../components/ui/BatchActionBar.vue";
import { getInvoiceType } from "../utils/invoiceUtils";
import {
  processFiles,
  extractInvoiceData,
  createMergedDocument,
} from "../utils/pdfUtils";
import type { InvoiceCell, PdfPageData } from "../types/invoice";

pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

// 数据缓存结构(用于增量处理)
interface ProcessedData {
  pages: PdfPageData[];
  invoices: InvoiceCell[];
  files: File[];
}

const processedData: Ref<ProcessedData> = ref({
  pages: [],
  invoices: [],
  files: [],
});

const selectedFiles: Ref<File[]> = ref([]);
const pdfSrc: Ref<string | null> = ref(null);
const isLoading: Ref<boolean> = ref(false);
const cells: Ref<InvoiceCell[]> = ref([]);
const isProcessing: Ref<boolean> = ref(false);
const progress: Ref<number> = ref(0);
const error: Ref<string | null> = ref(null);

// 批量删除状态
const pendingDeletions: Ref<Set<number>> = ref(new Set());

// 统计相关数据
const totalInvoiceCount: Ref<number> = ref(1000000);
const showStats: Ref<boolean> = ref(false);

// 格式化数字显示，添加千分位分隔符
const formattedTotalCount = computed(() => {
  return totalInvoiceCount.value.toLocaleString("zh-CN");
});

const headerRef: Ref<HTMLElement | null> = ref(null);

onMounted(() => {
  // 页面初始化时查询发票处理数量
  fetchInvoiceCount();
});

const clear = (): void => {
  selectedFiles.value = [];
  processedData.value = { pages: [], invoices: [], files: [] };
  pendingDeletions.value.clear();
  if (pdfSrc.value) {
    URL.revokeObjectURL(pdfSrc.value); // 释放内存
  }
  pdfSrc.value = null;
  cells.value = [];
};

// 标记/取消标记待删除
const toggleDeletion = (index: number): void => {
  if (pendingDeletions.value.has(index)) {
    pendingDeletions.value.delete(index);
  } else {
    pendingDeletions.value.add(index);
  }
};

// 撤销所有待删除标记
const cancelDeletions = (): void => {
  pendingDeletions.value.clear();
};

// 确认删除
const confirmDeletions = async (): Promise<void> => {
  if (pendingDeletions.value.size === 0) return;

  isLoading.value = true;

  try {
    // 从文件列表中移除(倒序删除,避免索引错乱)
    const sortedIndices = Array.from(pendingDeletions.value).sort(
      (a, b) => b - a
    );
    sortedIndices.forEach((index) => {
      selectedFiles.value.splice(index, 1);
    });

    // 清空待删除标记
    pendingDeletions.value.clear();

    // 检查是否全部删除
    if (selectedFiles.value.length === 0) {
      clear();
      return;
    }

    // 重新处理所有剩余文件
    await handleMergePDFs();
  } catch (err: any) {
    error.value = err.message || "删除过程中发生错误";
    console.error("删除错误:", err);
  } finally {
    isLoading.value = false;
  }
};

// 旧的删除逻辑(已废弃,保留用于兼容)
const removeCell = (index: number): void => {
  // 现在使用批量删除模式
  toggleDeletion(index);
};

// 处理拖放文件
const handleDrop = (event: DragEvent): void => {
  event.preventDefault();
  const files = Array.from(event.dataTransfer?.files || []);
  selectedFiles.value.push(...files);
  isLoading.value = true;
  handleMergePDFs().finally(() => (isLoading.value = false));
};

// 重新生成 PDF(重新处理所有文件)
const regeneratePDF = async (): Promise<void> => {
  await handleMergePDFs();
};

// 使用新的PDF工具函数处理合并
const handleMergePDFs = async (): Promise<void> => {
  try {
    const files = selectedFiles.value;
    if (!files?.length) {
      throw new Error("请选择PDF文件");
    }

    isProcessing.value = true;
    error.value = null;
    progress.value = 0;

    // 每次都重新处理所有文件(避免 PDF 文档生命周期问题)
    console.log(`处理 ${files.length} 张发票`);

    const allPages = await processFiles(files);
    progress.value = 30;

    const invoiceData = await extractInvoiceData(allPages);
    progress.value = 60;

    // 合并所有页面
    const mergedPdf = await createMergedDocument(allPages, {
      pagesPerSheet: 2,
      targetPageSize: { width: 595.28, height: 841.89 },
      scale: 0.95,
    });
    progress.value = 90;

    const pdfBytes = await mergedPdf.save({ updateFieldAppearances: false });
    const pdfBlob = new Blob([new Uint8Array(pdfBytes)], {
      type: "application/pdf",
    });

    cells.value = invoiceData;
    console.log(`PDF size: ${(pdfBlob.size / (1024 * 1024)).toFixed(2)} MB`);
    displayPDF(pdfBlob);
    progress.value = 100;

    // 发票处理完成后，更新统计数量
    const processedCount = files.length;
    if (processedCount > 0) {
      await updateInvoiceCount(processedCount);
    }
  } catch (err: any) {
    error.value = err.message || "处理过程中发生错误";
    console.error("PDF处理错误:", err);
  } finally {
    setTimeout(() => (isProcessing.value = false), 500);
  }
};

// 显示 PDF
const displayPDF = (file: Blob): void => {
  if (file.type === "application/pdf") {
    if (pdfSrc.value) URL.revokeObjectURL(pdfSrc.value); // 释放旧 URL
    pdfSrc.value = URL.createObjectURL(file);
  } else {
    alert("请选择 PDF 文件");
  }
};

// 统计相关API方法
const API_BASE_URL = "https://auth.yoloxy.com"; // 根据实际部署地址调整

// 查询发票处理数量
const fetchInvoiceCount = async (): Promise<void> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/stats/invoice-count`);
    if (response.ok) {
      const data = await response.json();
      if (data.success) {
        totalInvoiceCount.value = data.data.totalCount;
        showStats.value = true;
      }
    }
  } catch (error) {
    console.error("Failed to fetch invoice count:", error);
    showStats.value = false;
  }
};

// 更新发票处理数量
const updateInvoiceCount = async (count: number): Promise<void> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/stats/invoice-count`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ count }),
    });

    if (response.ok) {
      const data = await response.json();
      if (data.success) {
        totalInvoiceCount.value = data.data.totalCount;
        showStats.value = true;
      }
    }
  } catch (error) {
    console.error("Failed to update invoice count:", error);
    showStats.value = false;
  }
};

// 处理文件选择
const handleFileChange = async (event: Event): Promise<void> => {
  const files = Array.from((event.target as HTMLInputElement).files || []);
  if (files.length === 0) return;

  selectedFiles.value.push(...files);
  isLoading.value = true;
  await handleMergePDFs();
  isLoading.value = false;
  (event.target as HTMLInputElement).value = ""; // 清空 input
};
function openPdfPreview() {
  if (pdfSrc.value) {
    window.open(pdfSrc.value, "_blank");
  }
}
</script>
<style scoped>
/* 自定义滚动条 */
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}

.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: #e2e8f0;
  border-radius: 3px;
}

.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background-color: #cbd5e1;
}

/* 删除动画时让元素脱离文档流 */
.cell-list-leave-active {
  position: absolute; /* 元素脱离文档流 */
  width: 100%; /* 保持宽度不变 */
  transition: all 0.5s ease;
  z-index: 0;
}

.cell-list-leave-to {
  opacity: 0;
  transform: translateX(30px); /* 右移淡出 */
}

/* 元素移动动画 */
.cell-list-move {
  transition: transform 0.5s ease; /* 确保移动动画一致 */
}
</style>

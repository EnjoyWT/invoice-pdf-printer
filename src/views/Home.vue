<template>
  <div
    class="flex flex-col min-h-screen w-full px-4 py-6 items-center justify-center"
  >
    <!-- Header 区域和统计信息 -->
    <div ref="headerRef" class="w-full mb-10 px-4">
      <!-- 按钮组居中显示 -->
      <div class="flex justify-between items-center px-4">
        <!-- 左侧按钮组 -->
        <div
          class="flex items-center space-x-4"
          :class="
            cells.length > 0 ? 'w-6/12 justify-end' : 'w-full justify-center'
          "
        >
          <div class="flex items-center space-x-4">
            <label
              for="fileInput"
              class="px-6 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg cursor-pointer hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-md hover:shadow-lg flex items-center space-x-2"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-5 w-5"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fill-rule="evenodd"
                  d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z"
                  clip-rule="evenodd"
                />
              </svg>
              <span>选择发票</span>
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
              class="px-6 py-2.5 bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-lg hover:from-gray-600 hover:to-gray-700 transition-all duration-200 shadow-md hover:shadow-lg flex items-center space-x-2"
              @click="clear"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-5 w-5"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fill-rule="evenodd"
                  d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                  clip-rule="evenodd"
                />
              </svg>
              <span>清空</span>
            </button>
          </div>
        </div>

        <!-- 右侧统计信息 -->
        <!-- <div v-if="cells.length > 0" class="w-4/12 float-left">
          <InvoiceStats :invoices="cells" />
        </div> -->
        <!-- 右侧统计信息 -->
        <div v-if="cells.length > 0" class="absolute right-4 top-2">
          <InvoiceStats :invoices="cells" />
        </div>
      </div>
    </div>
    <!-- 处理进度提示 -->
    <ProcessingToast
      :show="isProcessing"
      :percentage="progress"
      :hasError="!!error"
      :errorMessage="error || ''"
      @close="error = null"
    />

    <div
      v-if="pdfSrc"
      class="w-full flex items-center justify-center"
      :style="{ height: pdfAreaHeight + 'px' }"
    >
      <div class="w-9/12 h-full p-4">
        <iframe class="w-full h-full" :src="pdfSrc" frameborder="0"></iframe>
      </div>
      <div class="w-3/12 ml-4 h-full p-4">
        <!-- 发票列表 -->
        <div
          class="border border-dashed border-gray-400 rounded-lg px-4 py-4 overflow-y-auto h-full"
        >
          <TransitionGroup name="cell-list" tag="div" class="space-y-4 pb-4">
            <div
              v-for="(item, index) in cells"
              :key="item.pageNumber"
              class="relative cell-item p-4 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg shadow-md transition-all duration-300 ease-in-out hover:scale-105 hover:shadow-lg border border-gray-200"
            >
              <button
                class="absolute top-1 right-1 w-6 h-6 flex items-center justify-center bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-full hover:from-gray-600 hover:to-gray-700 transition-all duration-200 shadow-sm hover:shadow-md"
                @click="removeCell(index)"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="h-4 w-4"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fill-rule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clip-rule="evenodd"
                  />
                </svg>
              </button>
              <p class="text-gray-700 font-semibold text-left truncate mb-2">
                序号: {{ index + 1 }}
              </p>
              <p class="text-gray-500 text-sm text-left truncate mb-1">
                类型: {{ getInvoiceType(item.type) }}
              </p>
              <p class="text-blue-600 font-semibold text-left truncate mb-1">
                金额: {{ item.amount }}
                {{ item.type === "10" ? "(不含税)" : "(含税)" }}
              </p>
              <p class="text-gray-500 text-sm text-left truncate mb-1">
                开票日期: {{ item.date }}
              </p>
              <p class="text-gray-500 text-[12px] text-left mb-1 break-words">
                {{ item.fileName }}
              </p>
            </div>
          </TransitionGroup>
        </div>
      </div>
    </div>

    <!-- 空状态区域 -->
    <div
      v-else
      class="border border-dashed border-gray-400 rounded-lg px-4 py-8 text-center w-8/12 h-1/2"
      style="min-height: calc(100vh - 12rem)"
      @dragover.prevent
      @drop="handleDrop"
    >
      <p class="text-gray-600">将PDF文件拖拽到这里</p>
    </div>

    <LoadingView :isLoading="isLoading" :hasDetailedProgress="isProcessing" />
  </div>
</template>

<script setup lang="ts">
import * as pdfjs from "pdfjs-dist";
import { ref, onMounted, onUnmounted, nextTick, type Ref } from "vue";
import LoadingView from "../components/ui/LoadingView.vue";
import InvoiceStats from "../components/business/InvoiceStats.vue";
import ProcessingToast from "../components/ui/ProcessingToast.vue";
import { getInvoiceType } from "../utils/invoiceUtils";
import { mergePDFs } from "../utils/pdfUtils";
import type { InvoiceCell } from "../types/invoice";

pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

const selectedFiles: Ref<File[]> = ref([]);
const pdfSrc: Ref<string | null> = ref(null);
const isLoading: Ref<boolean> = ref(false);
const cells: Ref<InvoiceCell[]> = ref([]);
const isProcessing: Ref<boolean> = ref(false);
const progress: Ref<number> = ref(0);
const error: Ref<string | null> = ref(null);

const headerRef: Ref<HTMLElement | null> = ref(null);
const pdfAreaHeight: Ref<number> = ref(0);
let ro: ResizeObserver | null = null;

const OUTER_VERTICAL_PADDING = 48; // py-6 = 1.5rem = 24px × 2

function updatePdfAreaHeight(): void {
  if (headerRef.value) {
    console.log(headerRef.value);
    const headerHeight = headerRef.value.offsetHeight;
    pdfAreaHeight.value =
      window.innerHeight - headerHeight - OUTER_VERTICAL_PADDING;
  }
}

onMounted(() => {
  nextTick(() => {
    updatePdfAreaHeight();
    window.addEventListener("resize", updatePdfAreaHeight);

    // 监听header高度变化
    ro = new ResizeObserver(updatePdfAreaHeight);
    if (headerRef.value) {
      ro.observe(headerRef.value);
    }
  });
});

onUnmounted(() => {
  window.removeEventListener("resize", updatePdfAreaHeight);
  if (ro && headerRef.value) {
    ro.unobserve(headerRef.value);
    ro.disconnect();
  }
});

const clear = (): void => {
  selectedFiles.value = [];
  if (pdfSrc.value) {
    URL.revokeObjectURL(pdfSrc.value); // 释放内存
  }
  pdfSrc.value = null;
  cells.value = [];
};

// 删除发票
const removeCell = (index: number): void => {
  cells.value.splice(index, 1);
  selectedFiles.value.splice(index, 1);
  isLoading.value = true;
  handleMergePDFs().finally(() => {
    isLoading.value = false;
    if (cells.value.length === 0) clear();
  });
};

// 处理拖放文件
const handleDrop = (event: DragEvent): void => {
  event.preventDefault();
  const files = Array.from(event.dataTransfer?.files || []);
  selectedFiles.value.push(...files);
  isLoading.value = true;
  handleMergePDFs().finally(() => (isLoading.value = false));
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

    const result = await mergePDFs({
      files,
      onProgress: (progressValue) => {
        progress.value = progressValue;
      },
      onError: (err) => {
        error.value = err.message;
      },
    });

    cells.value = result.invoiceData;
    console.log(
      `PDF size: ${(result.pdfBlob.size / (1024 * 1024)).toFixed(2)} MB`
    );
    displayPDF(result.pdfBlob);
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
</script>
<style scoped>
.cell-item {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: flex-start;
  min-height: 80px;
}

/* 删除动画时让元素脱离文档流 */
.cell-list-leave-active {
  position: absolute; /* 元素脱离文档流 */
  top: 0; /* 确保动画位置正确 */
  left: 0;
  width: 100%; /* 保持宽度不变 */
  transition: all 0.5s ease;
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

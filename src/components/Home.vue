<template>
  <div class="flex flex-col items-center justify-top h-full w-full">
    <!-- Header 区域和统计信息 -->
    <div ref="header" class="w-full mb-8">
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
        <div v-if="cells.length > 0" class="w-4/12">
          <InvoiceStats :invoices="cells" />
        </div>
      </div>
    </div>

    <!-- 处理进度提示 -->
    <ProcessingToast
      :show="isProcessing"
      :percentage="progress"
      :hasError="!!error"
      :errorMessage="error"
      @close="error = null"
    />

    <!-- PDF预览和发票信息区域 -->
    <div v-if="pdfSrc" class="w-full flex h-[calc(100vh-15rem)]">
      <div class="w-9/12 h-full">
        <iframe class="w-full h-full" :src="pdfSrc" frameborder="0"></iframe>
      </div>

      <div class="w-3/12 ml-4">
        <!-- 发票列表 -->
        <div
          class="border border-dashed border-gray-400 rounded-lg px-4 py-4 overflow-y-auto h-full"
          style="height: calc(100vh - 15rem)"
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
              <p class="text-gray-500 text-sm text-left truncate">
                文件名: {{ item.fileName }}
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

    <LoadingView :isLoading="isLoading" />
  </div>
</template>

<script setup>
import jsQR from "jsqr";
import { PDFDocument } from "pdf-lib";
import * as pdfjs from "pdfjs-dist";
import { ref } from "vue";
import LoadingView from "./LoadingView.vue";
import { debounce } from "lodash-es";
import ProgressBar from "./ProgressBar.vue";
import ThumbnailView from "./ThumbnailView.vue";
import InvoiceStats from "./InvoiceStats.vue";
import ProcessingToast from "./ProcessingToast.vue";
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

let selectedFiles = ref([]);
const pdfSrc = ref(null);
const isLoading = ref(false);
const clear = () => {
  selectedFiles.value = [];
  pdfSrc.value = null;
  cells.value = [];
};

const defaultScasle = 0.95;
const A4 = {
  width: 595.28,
  height: 841.89,
};
// 存储发票数据
const cells = ref([]);

// 添加发票
const addCell = (file) => {
  const newCell = {
    id: Date.now(),
    amount: (Math.random() * 1000).toFixed(2), // 模拟金额数据
  };
  cells.value.push(newCell);
};

// 删除发票
const removeCell = (index) => {
  // cells.value.splice(index, 1);

  // setTimeout(() => {
  cells.value.splice(index, 1);
  selectedFiles.value.splice(index, 1);

  isLoading.value = true;
  mergePDFs();
  isLoading.value = false;
  if (cells.value.length === 0) {
    clear();
  }
  // }, 500)
};
const handleDrop = (event) => {
  event.preventDefault();
  const files = event.dataTransfer.files;
  selectedFiles.value.push(...files);
  // 处理拖放文件
  isLoading.value = true;
  mergePDFs();
  isLoading.value = false;
};

const mergePDFs = async () => {
  try {
    const files = selectedFiles.value;
    if (files.length === 0) {
      throw new Error("请选择PDF文件");
    }

    isProcessing.value = true;
    error.value = null;
    progress.value = 0;

    // 读取所有PDF文件
    const allPages = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      progress.value = (i / files.length) * 30; // 文件读取占30%
      console.log(`Processing file: ${file.name}`);

      // 将File对象转换为ArrayBuffer
      const arrayBuffer = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      const pageCount = pdfDoc.getPageCount();

      // 收集所有页面信息
      for (let j = 0; j < pageCount; j++) {
        const page = pdfDoc.getPage(j);
        allPages.push({
          doc: pdfDoc,
          page,
          width: page.getWidth(),
          height: page.getHeight(),
          sourceFile: file.name,
          pageNumber: j + 1,
        });
      }
    }

    // 开始处理二维码和发票信息
    progress.value = 30;
    await processQRCodeFromPages(allPages);
    progress.value = 80;

    // 创建新的PDF文档
    const outputPdfDoc = await PDFDocument.create();
    const newPageCount = Math.ceil(allPages.length / 2);
    const HALF_HEIGHT = A4.height / 2;

    // 处理每一页
    for (let i = 0; i < newPageCount; i++) {
      progress.value = 50 + (i / newPageCount) * 50; // 后50%进度用于处理页面

      // 创建新页面
      const newPage = outputPdfDoc.addPage([A4.width, A4.height]);

      // 处理上半部分
      const topPageIndex = i * 2;
      if (topPageIndex < allPages.length) {
        const {
          page: topPage,
          width: topPageWidth,
          height: topPageHeight,
        } = allPages[topPageIndex];

        const scaleX = (A4.width * defaultScasle) / topPageWidth;
        const scaleY = (HALF_HEIGHT * defaultScasle) / topPageHeight;
        const scale = Math.min(scaleX, scaleY);

        const scaledWidth = topPageWidth * scale;
        const scaledHeight = topPageHeight * scale;
        const x = (A4.width - scaledWidth) / 2;
        const y = A4.height - HALF_HEIGHT + (HALF_HEIGHT - scaledHeight) / 2;

        const [topPageDims] = await outputPdfDoc.embedPages([topPage]);
        newPage.drawPage(topPageDims, {
          x,
          y,
          width: scaledWidth,
          height: scaledHeight,
        });
      }

      // 处理下半部分
      const bottomPageIndex = i * 2 + 1;
      if (bottomPageIndex < allPages.length) {
        const {
          page: bottomPage,
          width: bottomPageWidth,
          height: bottomPageHeight,
        } = allPages[bottomPageIndex];

        const scaleX = (A4.width * defaultScasle) / bottomPageWidth;
        const scaleY = (HALF_HEIGHT * defaultScasle) / bottomPageHeight;
        const scale = Math.min(scaleX, scaleY);

        const scaledWidth = bottomPageWidth * scale;
        const scaledHeight = bottomPageHeight * scale;
        const x = (A4.width - scaledWidth) / 2;
        const y = (HALF_HEIGHT - scaledHeight) / 2;

        const [bottomPageDims] = await outputPdfDoc.embedPages([bottomPage]);
        newPage.drawPage(bottomPageDims, {
          x,
          y,
          width: scaledWidth,
          height: scaledHeight,
        });
      }
    }

    // 保存并下载文件
    const pdfBytes = await outputPdfDoc.save();

    const mergedPdfBlob = new Blob([pdfBytes], {
      type: "application/pdf",
    });
    // const fileURL = URL.createObjectURL(mergedPdfBlob);

    // 最终处理
    progress.value = 100;
    displayPDF(mergedPdfBlob);
  } catch (err) {
    const errorMessage =
      {
        NO_FILES: "请选择PDF文件",
        INVALID_FORMAT: "文件格式不正确",
        QR_CODE_ERROR: "二维码识别失败",
      }[err.code] || "处理过程中发生错误";

    error.value = errorMessage;
    console.error("PDF处理错误:", err);
  } finally {
    // 延迟关闭处理提示
    setTimeout(() => {
      isProcessing.value = false;
    }, 500); // 延长到1.5秒
  }
};

const isProcessing = ref(false);
const progress = ref(0);
const error = ref(null);

const handleFileChange = async (event) => {
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  const files = Array.from(event.target.files).filter((file) => {
    if (file.size > MAX_FILE_SIZE) {
      alert(`文件 ${file.name} 超过10MB限制`);
      return false;
    }
    if (file.type !== "application/pdf") {
      alert(`文件 ${file.name} 不是PDF格式`);
      return false;
    }
    return true;
  });

  if (files.length === 0) return;

  selectedFiles.value.push(...files);
  isLoading.value = true;
  await mergePDFs();
  isLoading.value = false;

  event.target.value = null; // 清空input，允许重复选择相同文件
};

const displayPDF = (file) => {
  if (file.type === "application/pdf") {
    const reader = new FileReader();
    reader.onload = (e) => {
      pdfSrc.value = e.target.result;
    };
    reader.readAsDataURL(file);
  } else {
    alert("请选择 PDF 文件");
  }
};

// 添加一个处理函数，用于识别 allPages 中的二维码
async function processQRCodeFromPages(allPages) {
  let cellData = [];

  for (let i = 0; i < allPages.length; i++) {
    const { doc, pageNumber, sourceFile } = allPages[i];

    try {
      const pdfBytes = await doc.save();
      const pdfData = new Uint8Array(pdfBytes);
      const loadingTask = pdfjs.getDocument({ data: pdfData });
      const pdfDocument = await loadingTask.promise;
      const pdfPage = await pdfDocument.getPage(pageNumber);
      const viewport = pdfPage.getViewport({ scale: 2 });

      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");
      canvas.width = viewport.width;
      canvas.height = viewport.height;

      await pdfPage.render({ canvasContext: context, viewport }).promise;
      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);

      const qrCode = jsQR(imageData.data, imageData.width, imageData.height);
      let res;
      if (qrCode) {
        console.log(`Page ${pageNumber}: QR Code Found -`, qrCode.data);
        res = await parseQRCode(pageNumber, qrCode.data);
      } else {
        console.log(`Page ${pageNumber}: No QR Code Found`);
        res = await parseQRCode(pageNumber, null);
      }
      res.fileName = sourceFile;
      cellData.push(res);
    } catch (error) {
      console.error(`处理页面 ${pageNumber} 时发生错误:`, error);
      cellData.push({
        pageNumber: pageNumber,
        fileName: sourceFile,
        type: "",
        amount: "0",
        date: "",
      });
    }
  }
  cells.value = cellData;
}

async function parseQRCode(pageNumber, qrCodeData) {
  if (qrCodeData === null) {
    return {
      pageNumber: pageNumber,
      type: "",
      amount: "0",
      date: "",
    };
  }

  let [constNumber, type, code, number, amount, date, checkCode] =
    qrCodeData.split(",");

  // 格式化日期
  const formattedDate = date
    ? `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}`
    : "";

  const qrCodeObject = {
    pageNumber: pageNumber,
    constNumber,
    type,
    code,
    number,
    amount,
    date: formattedDate,
    checkCode,
  };
  return qrCodeObject;
}

function getImageData(imageDataUrl) {
  // 创建一个 Image 对象
  const img = new Image();
  img.src = imageDataUrl;

  return new Promise((resolve) => {
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");
      canvas.width = img.width;
      canvas.height = img.height;
      context.drawImage(img, 0, 0);
      // const imageData = context.getImageData(0, 0, canvas.width, canvas.height);

      // 获取左上角区域的二维码
      const qrWidth = img.width * 0.25; // 假设二维码在左上角并占25%的宽度
      const qrHeight = img.height * 0.25; // 假设二维码占25%的高度
      const imageData = context.getImageData(0, 0, qrWidth, qrHeight);
      resolve(imageData);
    };
  });
}

const getInvoiceType = (type) => {
  switch (type) {
    case "10":
      return "增值普通发票";
    case "04":
      return "普通发票";
    case "01":
      return "增值专用发票";
    default:
      return "未知类型";
  }
};

// 添加文件类型的严格验证
const validateFile = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = (e) => {
      const arr = new Uint8Array(e.target.result).subarray(0, 4);
      let header = "";
      for (let i = 0; i < arr.length; i++) {
        header += arr[i].toString(16);
      }
      // 检查PDF文件头
      if (header.startsWith("25504446")) {
        resolve(true);
      } else {
        reject(new Error("非法的PDF文件"));
      }
    };
    reader.readAsArrayBuffer(file);
  });
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

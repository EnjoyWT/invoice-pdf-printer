<template>
  <div class="flex flex-col items-center justify-top h-full w-full">
    <!-- Header 区域 -->
    <div ref="header" class="mb-8">
      <div class="flex flex-row items-center space-x-4">
        <label
          for="fileInput"
          class="px-4 py-2 bg-blue-500 text-white rounded cursor-pointer hover:bg-blue-600"
        >
          选择发票
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
          class="px-4 py-2 bg-red-500 text-white rounded cursor-pointer hover:bg-red-600"
          @click="clear"
        >
          清空
        </button>
      </div>
    </div>

    <!-- 文件预览区域 -->
    <div v-if="pdfSrc" class="w-full flex h-[calc(100%-4rem)] ">
      <iframe class="w-9/12 h-full" :src="pdfSrc" frameborder="0"></iframe>

      <!-- 新的 Cell 滚动显示区域 -->
      <div
        class="border border-dashed border-gray-400 rounded-lg px-4 py-4 w-3/12 h-full overflow-y-auto ml-4"
        @dragover.prevent
        @drop="handleDrop"
      >
      <TransitionGroup
    name="cell-list"
    tag="div"
    class="space-y-4 "
  >
    <div
      v-for="(item, index) in cells"
      :key="item.pageNumber"
      class="relative cell-item p-4 bg-gray-100 rounded-lg shadow-md transition-transform duration-300 ease-in-out hover:scale-105 hover:shadow-lg"
    >
      <button
        class="absolute top-1 right-1 w-6 h-6 flex items-center justify-center bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors duration-200"
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
      <p class="text-gray-800 font-semibold text-left truncate ">序号: {{ index + 1 }}</p>

      <p class="text-gray-600 text-sm text-left truncate">类型: {{ getInvoiceType(item.type)   }}</p>
      <!-- <p class="text-gray-600 text-sm text-left truncate">发票代码: {{item.code }}</p>
      <p class="text-gray-600 text-sm text-left truncate">发票号码: {{item.number }}</p> -->
      <!-- <p class="text-gray-800 font-semibold text-left truncate">金额: ￥{{item.amount }}</p> -->
      <p class="text-gray-800 font-semibold text-left truncate">
        金额: {{item.amount}} {{ item.type === '10' ? '(不含税)' : '(含税)' }}
      </p>
      <p class="text-gray-600 text-sm text-left truncate">开票日期: {{item.date }}</p>
      <p class="text-gray-600 text-sm text-left truncate ">文件名: {{ item.fileName}}</p>

    </div>
  </TransitionGroup>

        
      </div>
    </div>

    <!-- 空状态区域 -->
    <div
      v-else
      class="border border-dashed border-gray-400 rounded-lg px-4 py-8 text-center w-8/12 h-1/2"
      @dragover.prevent
      @drop="handleDrop"
    >
      <p class="text-gray-600">将PDF文件拖拽到这里</p>
    </div>

    <LoadingView :isLoading="isLoading" />
  </div>
</template>

<script setup>
import jsQR from 'jsqr'
import { PDFDocument } from 'pdf-lib'
import * as pdfjs from 'pdfjs-dist'
import { ref, onMounted, watch } from 'vue';
import { syncCallPdfToImg } from './Left/U'
import LoadingView from './LoadingView.vue'
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`

let selectedFiles = ref([])
const pdfSrc = ref(null)
const isLoading = ref(false)
const clear = () => {
  selectedFiles.value = []
  pdfSrc.value = null
}


const defaultScasle = 0.95
const A4 = {
  width: 595.28,
  height: 841.89
}
// 存储发票数据
const cells = ref([

]);

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
    cells.value.splice(index, 1)
    selectedFiles.value.splice(index, 1)
    
    isLoading.value = true
    mergePDFs()
    isLoading.value = false
    if (cells.value.length === 0) {
      clear()
    }
  // }, 500) 
};
const handleDrop = (event) => {
  event.preventDefault()
  const files = event.dataTransfer.files
  selectedFiles.value.push(...files)
  // 处理拖放文件
  isLoading.value = true
  mergePDFs()
  isLoading.value = false
}


const mergePDFs = async () => {
 
  try {
        const files = selectedFiles.value;
        if (files.length === 0) {
            throw new Error('请选择PDF文件');
        }

        isProcessing.value = true;
        error.value = null;
        progress.value = 0;

        // 读取所有PDF文件
        const allPages = [];
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            console.log(`Processing file: ${file.name}`);
            progress.value = (i / files.length) * 50; // 前50%进度用于读取文件

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
                    pageNumber: j + 1
                });
            }
        }

        processQRCodeFromPages(allPages)

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
                const { page: topPage, width: topPageWidth, height: topPageHeight } = allPages[topPageIndex];
                
                const scaleX = (A4.width * defaultScasle) / topPageWidth;
                const scaleY = (HALF_HEIGHT * defaultScasle) / topPageHeight;
                const scale = Math.min(scaleX, scaleY);

                const scaledWidth = topPageWidth * scale;
                const scaledHeight = topPageHeight * scale;
                const x = (A4.width - scaledWidth) / 2;
                const y = A4.height - HALF_HEIGHT + ((HALF_HEIGHT - scaledHeight) / 2);

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
                const { page: bottomPage, width: bottomPageWidth, height: bottomPageHeight } = allPages[bottomPageIndex];
                
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
          type: 'application/pdf'
        })
        // const fileURL = URL.createObjectURL(mergedPdfBlob);

        displayPDF(mergedPdfBlob)
        
    } catch (err) {
        error.value = err.message;
        console.error('PDF处理错误:', err);
    } finally {
    }
}


const isProcessing = ref(false);
const progress = ref(0);
const error = ref(null);

const handleFileChange = async (event) => {
  let files = event.target.files
  selectedFiles.value.push(...files)

  isLoading.value = true
  mergePDFs()
  isLoading.value = false

  event.target.value = null

};

const displayPDF = (file) => {
  if (file.type === 'application/pdf') {
    const reader = new FileReader()
    reader.onload = (e) => {
      pdfSrc.value = e.target.result
    }
    reader.readAsDataURL(file)
  } else {
    alert('请选择 PDF 文件')
  }
}


// 添加一个处理函数，用于识别 allPages 中的二维码
async function processQRCodeFromPages(allPages) {

    // 遍历 allPages 中的所有页面
    let cellData = []
    
    for (let i = 0; i < allPages.length; i++) {
        const { doc, pageNumber, sourceFile } = allPages[i];

        // 将 pdf-lib 文档保存为二进制数据
        const pdfBytes = await doc.save();
        const pdfData = new Uint8Array(pdfBytes);

        // 使用 pdfjs-dist 加载 pdf 文档
        const loadingTask = pdfjsLib.getDocument({ data: pdfData });
        const pdfDocument = await loadingTask.promise;

        // 获取当前页面
        const pdfPage = await pdfDocument.getPage(pageNumber);
        const viewport = pdfPage.getViewport({ scale: 2 }); // 设置缩放比例，选择合适的值

        // 创建一个 canvas 来渲染页面
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        // 渲染页面到 canvas 上
        await pdfPage.render({ canvasContext: context, viewport }).promise;

        // 提取 canvas 上的图像数据
        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);

        // 使用 jsQR 解析二维码
        const qrCode = jsQR(imageData.data, imageData.width, imageData.height);
        if (qrCode) {
            console.log(`Page ${pageNumber}: QR Code Found -`, qrCode.data);
        } else {
            console.log(`Page ${pageNumber}: No QR Code Found`);
        }

        let res =  await parseQRCode(pageNumber,qrCode.data)
        res.fileName = sourceFile
        cellData.push(res)  
    }
    cells.value = cellData

}

async function parseQRCode(pageNumber, qrCodeData) {

  if (qrCodeData === null) {
    return {pageNumber:pageNumber}
  }
  // 使用 jsQR 解析二维码
  //01,10,031002100411,40235865,83.36,20211229,10743957938938902364,28FE,
  // 01: 固定值
  // 10: 发票类型
  // 031002100411: 发票代码
  // 40235865: 发票号码
  // 83.36: 发票金额
  // 20211229: 开票日期
  // 10743957938938902364: 校验码

  let [constNumber,type,code,number,amount,date,checkCode] =  qrCodeData.split(",")
   
  const qrCodeObject = {pageNumber:pageNumber, constNumber, type, code, number, amount, date, checkCode };
  return  qrCodeObject

  }


function getImageData(imageDataUrl) {
  // 创建一个 Image 对象
  const img = new Image()
  img.src = imageDataUrl

  return new Promise((resolve) => {
    img.onload = () => {
      const canvas = document.createElement('canvas')
      const context = canvas.getContext('2d')
      canvas.width = img.width
      canvas.height = img.height
      context.drawImage(img, 0, 0)
      // const imageData = context.getImageData(0, 0, canvas.width, canvas.height);

      // 获取左上角区域的二维码
      const qrWidth = img.width * 0.25 // 假设二维码在左上角并占25%的宽度
      const qrHeight = img.height * 0.25 // 假设二维码占25%的高度
      const imageData = context.getImageData(0, 0, qrWidth, qrHeight)
      resolve(imageData)
    }
  })
}

const getInvoiceType = (type) => {
  switch(type) {
    case '10': return '专用发票'
    case '04': return '普通发票'
    case '01': return '专用发票'
    default: return '未知类型'
  }
}
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

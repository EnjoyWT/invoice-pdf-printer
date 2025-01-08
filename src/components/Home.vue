<template>
  <div class="flex flex-col items-center justify-top h-full w-full">
    <!-- 使用 ref 获取 mb-8 元素 -->
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

    <div v-if="pdfSrc" class="w-full flex h-full justify-between" >
      <iframe class="w-9/12 h-full" :src="pdfSrc" frameborder="0"></iframe>
      <div
        class="border border-dashed border-gray-400 rounded-lg ml-4  pl-4 px-4 py-8 text-center w-2/12 h-full"
        @dragover.prevent
        @drop="handleDrop"
      >
        <p class="text-gray-600">将发票文件拖拽这里,会自动的追加左边</p>
      </div>
    </div>
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
                
                const scaleX = (A4.width * 0.9) / topPageWidth;
                const scaleY = (HALF_HEIGHT * 0.9) / topPageHeight;
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
                
                const scaleX = (A4.width * 0.9) / bottomPageWidth;
                const scaleY = (HALF_HEIGHT * 0.9) / bottomPageHeight;
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

const pdfPreviewUrl = ref(null)
const defaultScasle = 0.95
const A4 = {
  width: 595.28,
  height: 841.89
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

const openFilePicker = () => {
  document.getElementById('fileInput').click()
}

const readFileAsArrayBuffer = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsArrayBuffer(file)
  })
}

const downloadPDF = (bytes, filename) => {
  const blob = new Blob([bytes], { type: 'application/pdf' })
  const link = document.createElement('a')
  link.href = window.URL.createObjectURL(blob)
  link.download = filename
  link.click()
}

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

async function convertPdfToImages(pdfBytes) {
  const images = []

  // Load the PDF document
  const loadingTask = pdfjs.getDocument({ data: pdfBytes })
  const pdf = await loadingTask.promise

  // Iterate through each page
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum)
    const scale = 1.5
    const viewport = page.getViewport({ scale })

    // Create a canvas for rendering
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')
    canvas.height = viewport.height
    canvas.width = viewport.width

    // Render the page on the canvas
    const renderContext = {
      canvasContext: context,
      viewport: viewport
    }
    await page.render(renderContext).promise

    // Convert the canvas to an image
    const imageDataUrl = canvas.toDataURL('image/png')
    // 创建 Image 对象用于解析二维码
    const imageData = getImageData(imageDataUrl)
    // console.log(imageData)
    // parseQRCode(imageData);
    images.push(imageDataUrl)
  }

  return images
}
// 自定义函数示例
function extractAmountFromText(text) {
  const regexPattern = /¥(\d+(\.\d{1,2})?)/ // 正则表达式

  const match = input.match(regexPattern) // 匹配

  if (match) {
    const extractedNumber = match[1] // 提取第一个捕获组

    console.log(extractedNumber) // 输出: 54.00
    return extractedNumber
  } else {
    return 0
  }
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
async function parseQRCode(imageData) {
  // 使用 jsQR 解析二维码
  const code = jsQR(imageData.data, imageData.width, imageData.height)
  if (code) {
    this.result = `二维码内容: ${code.data}`
  } else {
    this.result = '未识别到二维码'
  }
}
</script>

<template>
  <div class="flex flex-col items-center justify-top h-full w-full">
    <div class="mb-8">
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
    <!-- <div
      class="border border-dashed border-gray-400 rounded-lg px-4 py-8 text-center w-8/12 h-1/2"
      @dragover.prevent
      @drop="handleDrop"
    >
      <p class="text-gray-600">将PDF文件拖拽到这里</p>
    </div> -->

    <!-- <iframe
      v-if="pdfSrc"
      class="w-8/12 h-full"
      :src="pdfSrc"
      frameborder="0"
    ></iframe> -->
    <div v-if="pdfSrc" class="w-full h-full flex justify-around">
      <iframe class="w-9/12 h-full" :src="pdfSrc" frameborder="0"></iframe>
      <div
        class="border border-dashed border-gray-400 rounded-lg px-4 py-8 text-center w-2/12 h-full"
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
import { ref } from 'vue' // 导入 ref
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

const handleDrop2 = async (event) => {
  event.preventDefault()
  const files = event.dataTransfer.files
  // selectedFiles.value.push(...files);

  let imgs = await syncCallPdfToImg(files)
  try {
    const result = await OpencvQrUtil.detectQrCode(imgs[0])
    // 处理QR码检测结果
    console.log('QR code detection result:', result)
  } catch (error) {
    console.error('Error detecting QR code:', error)
  }
}

const handleFileChange = (event) => {
  event.preventDefault()
  let files = event.target.files
  selectedFiles.value.push(...files)

  isLoading.value = true
  mergePDFs()
  isLoading.value = false

  event.target.value = ''
}

const mergePDFs = async () => {
  try {
    const mergedPdf = await PDFDocument.create()
    var page = mergedPdf.addPage()

    var countPages = 0

    // 遍历选择的每个文件
    for (let i = 0; i < selectedFiles.value.length; i++) {
      const file = selectedFiles.value[i]
      const reader = new FileReader()
      // 读取文件内容
      const fileContents = await new Promise((resolve, reject) => {
        reader.onload = function (event) {
          resolve(event.target.result)
        }
        reader.onerror = function (event) {
          reject(new Error('文件读取错误。'))
        }
        reader.readAsArrayBuffer(file)
      })
      // 将PDF文件添加到合并的PDF文档中
      const pdf = await PDFDocument.load(fileContents)
      const pageDataArray = pdf.getPages()
      const fPages = pageDataArray.length

      if (countPages % 2 === 0 && countPages > 0) {
        page = mergedPdf.addPage()
      }

      for (let pi = 0; pi < fPages; pi += 2) {
        if (pi % 2 === 0 && pi > 0) {
          page = mergedPdf.addPage()
        }

        const preamble = await mergedPdf.embedPage(pdf.getPages()[pi])

        const americanFlagDims = preamble.scale(0.9)

        var fy = page.getHeight() - americanFlagDims.height - 20
        if ((countPages + pi) % 2 != 0) {
          fy = 20
        }
        var x = (page.getWidth() - americanFlagDims.width) / 2

        page.drawPage(preamble, {
          ...americanFlagDims,
          x: x,
          y: fy
        })

        if (pi + 1 < fPages) {
          var sfy = 20

          const secAmericanFlag = await mergedPdf.embedPage(
            pdf.getPages()[pi + 1]
          )

          if ((countPages + pi + 1) % 2 != 0) {
            sfy = page.getHeight() - secAmericanFlag.height - 20
            page = mergedPdf.addPage()
          }
          const secAmericanFlagDims = secAmericanFlag.scale(0.85)
          var sx = (page.getWidth() - americanFlagDims.width) / 2

          // Draw the preamble clipping in the center bottom of the page
          page.drawPage(secAmericanFlag, {
            ...secAmericanFlagDims,
            x: sx,
            y: sfy
          })
        }
      }
      countPages += fPages
    }

    // 使用浏览器自带预览功能，预览合并后的PDF
    const mergedPdfBytes = await mergedPdf.save()
    const mergedPdfBlob = new Blob([mergedPdfBytes], {
      type: 'application/pdf'
    })
    // const fileURL = URL.createObjectURL(mergedPdfBlob);

    displayPDF(mergedPdfBlob)

    // convertPdfToImages(mergedPdfBytes)
    // window.open(fileURL);
  } catch (err) {
    console.error('Error merging PDFs:', err)
  }
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

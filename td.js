import { PDFDocument } from 'pdf-lib'
import fs from 'fs'

// A4 页面尺寸常量 (点)
const A4 = {
  width: 595.28,
  height: 841.89
}

let defaultScasle = 0.95

async function mergePDFPages(inputPaths, outputPath) {
  try {
    // 创建新的PDF文档（A4大小）
    const outputPdfDoc = await PDFDocument.create()

    // 存储所有页面
    let allPages = []

    // 读取所有输入PDF文件并收集页面
    for (const inputPath of inputPaths) {
      console.log(`Processing file: ${inputPath}`)
      const inputPdfBytes = fs.readFileSync(inputPath)
      const inputPdfDoc = await PDFDocument.load(inputPdfBytes)
      const pageCount = inputPdfDoc.getPageCount()

      // 收集当前PDF的所有页面信息
      for (let i = 0; i < pageCount; i++) {
        const page = inputPdfDoc.getPage(i)
        allPages.push({
          doc: inputPdfDoc,
          page,
          width: page.getWidth(),
          height: page.getHeight(),
          sourceFile: inputPath, // 添加源文件信息用于调试
          pageNumber: i + 1
        })
      }
    }

    // 计算需要创建的新页面数量（向上取整）
    const newPageCount = Math.ceil(allPages.length / 2)
    const HALF_HEIGHT = A4.height / 2

    // 处理每一页
    for (let i = 0; i < newPageCount; i++) {
      // 在新文档中创建A4大小的页面
      const newPage = outputPdfDoc.addPage([A4.width, A4.height])

      // 处理上半部分
      const topPageIndex = i * 2
      if (topPageIndex < allPages.length) {
        const {
          page: topPage,
          width: topPageWidth,
          height: topPageHeight,
          sourceFile,
          pageNumber
        } = allPages[topPageIndex]
        console.log(
          `Processing top half - Page ${pageNumber} from ${sourceFile}`
        )
        console.log(`Original dimensions: ${topPageWidth} x ${topPageHeight}`)

        // 计算缩放比例（保持宽高比）
        const scaleX = (A4.width * defaultScasle) / topPageWidth // 90% of width
        const scaleY = (HALF_HEIGHT * defaultScasle) / topPageHeight // 90% of half height
        const scale = Math.min(scaleX, scaleY)

        // 计算居中位置
        const scaledWidth = topPageWidth * scale
        const scaledHeight = topPageHeight * scale
        const x = (A4.width - scaledWidth) / 2
        const y = A4.height - HALF_HEIGHT + (HALF_HEIGHT - scaledHeight) / 2

        // 将页面嵌入到新文档中
        const [topPageDims] = await outputPdfDoc.embedPages([topPage])
        newPage.drawPage(topPageDims, {
          x,
          y,
          width: scaledWidth,
          height: scaledHeight
        })

        console.log(`Scaled dimensions: ${scaledWidth} x ${scaledHeight}`)
        console.log(`Position: x=${x}, y=${y}`)
      }

      // 处理下半部分
      const bottomPageIndex = i * 2 + 1
      if (bottomPageIndex < allPages.length) {
        const {
          page: bottomPage,
          width: bottomPageWidth,
          height: bottomPageHeight,
          sourceFile,
          pageNumber
        } = allPages[bottomPageIndex]
        console.log(
          `Processing bottom half - Page ${pageNumber} from ${sourceFile}`
        )
        console.log(
          `Original dimensions: ${bottomPageWidth} x ${bottomPageHeight}`
        )

        // 计算缩放比例
        const scaleX = (A4.width * defaultScasle) / bottomPageWidth // 90% of width
        const scaleY = (HALF_HEIGHT * defaultScasle) / bottomPageHeight // 90% of half height
        const scale = Math.min(scaleX, scaleY)

        // 计算居中位置 - 修正Y轴位置计算
        const scaledWidth = bottomPageWidth * scale
        const scaledHeight = bottomPageHeight * scale
        const x = (A4.width - scaledWidth) / 2
        const y = (HALF_HEIGHT - scaledHeight) / 2 // 从下半部分的底部开始计算

        // 将页面嵌入到新文档中
        const [bottomPageDims] = await outputPdfDoc.embedPages([bottomPage])
        newPage.drawPage(bottomPageDims, {
          x,
          y,
          width: scaledWidth,
          height: scaledHeight
        })

        console.log(`Scaled dimensions: ${scaledWidth} x ${scaledHeight}`)
        console.log(`Position: x=${x}, y=${y}`)
      }
    }

    // 保存新PDF文件
    const pdfBytes = await outputPdfDoc.save()
    fs.writeFileSync(outputPath, pdfBytes)

    return {
      success: true,
      message: '文件处理成功',
      totalInputPages: allPages.length,
      outputPages: newPageCount,
      pageDetails: allPages.map((p) => ({
        sourceFile: p.sourceFile,
        pageNumber: p.pageNumber,
        originalDimensions: {
          width: p.width,
          height: p.height
        }
      }))
    }
  } catch (error) {
    return {
      success: false,
      message: '处理过程中发生错误：' + error.message,
      error
    }
  }
}

// 导出函数
// const inputFiles = [
//   '/Users/sh/Desktop/sidework/invoice-pdf-printer/src/享道出行电子发票_副本.pdf',
//   '/Users/sh/Desktop/sidework/invoice-pdf-printer/src/享道出行电子发票.pdf'
// ]
const inputFiles = [
  '/Users/sh/Desktop/sidework/invoice-pdf-printer/src/滴滴电子发票 (1)_副本.pdf',
  '/Users/sh/Desktop/sidework/invoice-pdf-printer/src/滴滴电子发票 (1)_副本2.pdf',
  '/Users/sh/Desktop/sidework/invoice-pdf-printer/src/享道出行电子发票.pdf',
  '/Users/sh/Desktop/sidework/invoice-pdf-printer/src/滴滴电子发票 (1)_副本.pdf'
]
const result = await mergePDFPages(inputFiles, './output2.pdf')

if (result.success) {
  console.log(
    `成功处理文件：总输入页数 ${result.totalInputPages} 页，输出 ${result.outputPages} 页`
  )
} else {
  console.error('处理失败：', result.message)
}

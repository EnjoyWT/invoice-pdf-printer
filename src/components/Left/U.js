import * as pdfjsLib from "pdfjs-dist";
const pdfjsWorker = import("pdfjs-dist/build/pdf.worker.entry");
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

// 创建一个Promise包装器，用于将异步函数转换为同步调用
function pdfToImgSync(files) {
  return new Promise((resolve, reject) => {
    if (!files || !files.length || !/\.pdf$/i.test(files[0].name)) {
      resolve([]);
    }

    const file = files[0];
    const fileReader = new FileReader();
    fileReader.readAsArrayBuffer(file);

    fileReader.onload = async () => {
      const pdfData = fileReader.result;
      const pdfDoc = await pdfjsLib.getDocument(pdfData).promise;
      const numPages = pdfDoc.numPages;

      const imgData = [];

      const page = await pdfDoc.getPage(1);
      const viewport = page.getViewport({ scale: 1.5 });
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      await page.render({
        canvasContext: context,
        viewport,
      }).promise;

      const imageData = canvas.toDataURL("image/jpeg");
      imgData.push(imageData);
      console.log(imgData);

      resolve(imgData);
    };

    fileReader.onerror = (error) => {
      console.error("Error reading file:", error);
      reject(error);
    };
  });
}

// 同步调用pdfToImgSync函数
export async function syncCallPdfToImg(files) {
  try {
    const imgData = await pdfToImgSync(files);
    return imgData;
  } catch (error) {
    console.error("Error processing PDF to image:", error);
    return [];
  }
}

<template>
  <div>
    <input type="file" @change="handleFileChange" accept="application/pdf" />
    <div v-if="amount">Amount: {{ amount }}</div>
  </div>
</template>

<script>
import { PDFDocument } from "pdf-lib";

export default {
  data() {
    return {
      amount: null,
    };
  },
  methods: {
    async handleFileChange(event) {
      const file = event.target.files[0];

      const reader = new FileReader();
      // 读取文件内容
      const fileContents = await new Promise((resolve, reject) => {
        reader.onload = function (event) {
          resolve(event.target.result);
        };
        reader.onerror = function (event) {
          reject(new Error("文件读取错误。"));
        };
        reader.readAsArrayBuffer(file);
      });
      // 将PDF文件添加到合并的PDF文档中
      const pdf = await PDFDocument.load(fileContents);

      const firstPage = pdf.getPages()[0];
    },
  },
};
</script>

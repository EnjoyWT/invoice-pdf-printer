<template>
  <div>
    <input type="file" @change="handleFileChange" accept="application/pdf" />
    <div v-if="amount">Amount: {{ amount }}</div>
  </div>
</template>

<script lang="ts">
import { PDFDocument, PDFPage } from "pdf-lib";

export default {
  data() {
    return {
      amount: null as number | null,
    };
  },
  methods: {
    async handleFileChange(event: Event) {
      const target = event.target as HTMLInputElement;
      const file = target.files?.[0];

      if (!file) {
        return;
      }

      const reader = new FileReader();
      // 读取文件内容
      const fileContents: ArrayBuffer | string | null = await new Promise((resolve, reject) => {
        reader.onload = function (e) {
          resolve(e.target?.result || null);
        };
        reader.onerror = function (e) {
          reject(new Error("文件读取错误。"));
        };
        reader.readAsArrayBuffer(file);
      });
      // 将PDF文件添加到合并的PDF文档中
      const pdf: PDFDocument = await PDFDocument.load(fileContents as ArrayBuffer);

      const firstPage: PDFPage = pdf.getPages()[0];
    },
  },
};
</script>

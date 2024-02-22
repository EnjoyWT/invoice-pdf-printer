<script setup>
// import { ref } from 'vue'

// defineProps({
//   msg: String,
// })

// const count = ref(0)

import VuePdfEmbed from 'vue-pdf-embed'

// essential styles
import 'vue-pdf-embed/dist/style/index.css'

// optional styles
import 'vue-pdf-embed/dist/style/annotationLayer.css'
import 'vue-pdf-embed/dist/style/textLayer.css'

// either URL, Base64, binary, or document proxy
import samplePDF from '@/assets/a.pdf'; // 替换路径为实际的 PDF 文件路径

const pdfSource = samplePDF

</script>

<template>
    <vue-draggable-resizable :w="width" :h="height" :parent="true">
      <VuePdfEmbed annotation-layer text-layer :source="pdfSource" />
    </vue-draggable-resizable>
</template>

<style scoped>
.read-the-docs {
  color: #888;
}
</style>

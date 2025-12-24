<script setup lang="ts">
/**
 * PDF 引擎预加载组件
 * 在页面加载时挂载此组件，触发 pdfium 引擎开始加载
 * 组件本身不渲染任何内容
 */
import { usePdfiumEngine } from "@embedpdf/engines/vue";

// 触发引擎加载
const { isLoading } = usePdfiumEngine();

// 可选：暴露加载状态供父组件使用
defineExpose({ isLoading });
</script>

<template>
  <!-- 不渲染任何内容 -->
</template>

<script setup lang="ts">
import { computed, watch, ref } from 'vue';
import { usePdfiumEngine } from '@embedpdf/engines/vue';
import { EmbedPDF } from '@embedpdf/core/vue';
import { createPluginRegistration } from '@embedpdf/core';

// 核心插件
import { ViewportPluginPackage } from '@embedpdf/plugin-viewport';
import { Viewport } from '@embedpdf/plugin-viewport/vue';
import { ScrollPluginPackage } from '@embedpdf/plugin-scroll';
import { Scroller } from '@embedpdf/plugin-scroll/vue';
import { LoaderPluginPackage } from '@embedpdf/plugin-loader';
import { RenderPluginPackage } from '@embedpdf/plugin-render';
import { RenderLayer } from '@embedpdf/plugin-render/vue';

// 功能插件
import { ZoomPluginPackage } from '@embedpdf/plugin-zoom';
import { ThumbnailPluginPackage } from '@embedpdf/plugin-thumbnail';
import { ThumbnailsPane, ThumbImg } from '@embedpdf/plugin-thumbnail/vue';
import { PrintPluginPackage } from '@embedpdf/plugin-print';
import { PrintFrame } from '@embedpdf/plugin-print/vue';
import { ExportPluginPackage } from '@embedpdf/plugin-export';
import { Download } from '@embedpdf/plugin-export/vue';

// 子组件
import PdfToolbar from './PdfToolbar.vue';

const props = defineProps<{
  pdfSrc: string;
}>();

// 初始化 PDF 引擎
const { engine, isLoading: engineLoading } = usePdfiumEngine();

// 缩略图侧边栏状态
const showThumbnails = ref(false);

// 为每次 PDF 变化生成唯一 key
const pdfKey = ref(0);
watch(() => props.pdfSrc, () => {
  pdfKey.value++;
});

// 注册插件
const plugins = computed(() => [
  createPluginRegistration(LoaderPluginPackage, {
    loadingOptions: {
      type: 'url',
      pdfFile: {
        id: `invoice-pdf-${pdfKey.value}`,
        url: props.pdfSrc,
      },
    },
  }),
  createPluginRegistration(ViewportPluginPackage),
  createPluginRegistration(ScrollPluginPackage),
  createPluginRegistration(RenderPluginPackage),
  createPluginRegistration(ZoomPluginPackage, {
    defaultZoomLevel: 1.0,
  }),
  createPluginRegistration(ThumbnailPluginPackage, {
    width: 120,
  }),
  createPluginRegistration(PrintPluginPackage),
  createPluginRegistration(ExportPluginPackage, {
    defaultFileName: 'merged-invoices.pdf',
  }),
]);
</script>

<template>
  <div class="pdf-viewer-container">
    <!-- 加载状态 -->
    <div v-if="engineLoading || !engine" class="loading-pane">
      <div class="loading-spinner"></div>
      <span>正在加载 PDF 引擎...</span>
    </div>

    <!-- PDF 查看器 -->
    <EmbedPDF v-else :key="pdfKey" :engine="engine" :plugins="plugins">
      <!-- 工具栏 -->
      <PdfToolbar
        :showThumbnails="showThumbnails"
        @toggle-thumbnails="showThumbnails = !showThumbnails"
      />

      <!-- 主内容区 -->
      <div class="pdf-content">
        <!-- 缩略图侧边栏 -->
        <div
          class="thumbnails-sidebar"
          :class="{ 'show': showThumbnails }"
        >
          <ThumbnailsPane class="thumbnails-pane">
            <template #default="{ meta }">
              <div
                class="thumbnail-item"
                :style="{
                  position: 'absolute',
                  top: `${meta.top}px`,
                  height: `${meta.wrapperHeight}px`,
                }"
              >
                <ThumbImg :meta="meta" class="thumbnail-img" />
                <span class="thumbnail-label">{{ meta.pageIndex + 1 }}</span>
              </div>
            </template>
          </ThumbnailsPane>
        </div>

        <!-- PDF 视图区 -->
        <Viewport class="pdf-viewport">
          <Scroller>
            <template #default="{ page }">
              <div
                class="page-container"
                :style="{
                  width: `${page.width}px`,
                  height: `${page.height}px`,
                }"
              >
                <RenderLayer :pageIndex="page.pageIndex" />
              </div>
            </template>
          </Scroller>
        </Viewport>
      </div>

      <!-- 打印用的隐藏 iframe -->
      <PrintFrame />
      <!-- 下载用的隐藏组件 -->
      <Download />
    </EmbedPDF>
  </div>
</template>

<style scoped>
.pdf-viewer-container {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  background-color: #525659;
  border-radius: 8px;
  overflow: hidden;
}

.loading-pane {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 100%;
  gap: 12px;
  color: #9ca3af;
}

.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #4b5563;
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* 主内容区 */
.pdf-content {
  display: flex;
  flex: 1;
  overflow: hidden;
}

/* 缩略图侧边栏 */
.thumbnails-sidebar {
  width: 0;
  background-color: #323639;
  border-right: 1px solid #1f2123;
  overflow: hidden;
  transition: width 0.2s ease;
}

.thumbnails-sidebar.show {
  width: 180px;
}

.thumbnails-pane {
  width: 100%;
  height: 100%;
  overflow-y: auto;
  padding: 12px;
  position: relative;
}

.thumbnail-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 8px;
  cursor: pointer;
  border-radius: 4px;
  transition: background-color 0.15s ease;
  width: 100%;
  box-sizing: border-box;
}

.thumbnail-item:hover {
  background-color: #3f4447;
}

.thumbnail-img {
  border: 1px solid #4b5563;
  border-radius: 2px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

.thumbnail-label {
  margin-top: 4px;
  font-size: 11px;
  color: #9ca3af;
}

/* PDF 视图区 */
.pdf-viewport {
  flex: 1;
  background-color: #525659;
  overflow: auto;
}

.page-container {
  margin: 8px auto;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  background-color: white;
}
</style>

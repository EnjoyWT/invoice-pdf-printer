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
        :currentPage="currentPage"
        :totalPages="totalPages"
        @toggle-thumbnails="showThumbnails = !showThumbnails"
      />

      <!-- 主内容区 -->
      <div class="pdf-content">
        <!-- 缩略图侧边栏 -->
        <div
          ref="thumbnailsSidebarRef"
          class="thumbnails-sidebar"
          :class="{ show: showThumbnails }"
          @mouseenter="onThumbnailsMouseEnter"
          @scroll="onThumbnailsScroll"
          @wheel="onThumbnailsScroll"
        >
          <ThumbnailsPane class="thumbnails-pane">
            <template #default="{ meta }">
              <div
                class="thumbnail-item"
                :class="{ active: meta.pageIndex === currentPage }"
                :style="{
                  position: 'absolute',
                  top: `${meta.top}px`,
                  left: '8px',
                  right: '8px',
                  height: `${meta.height + 8}px`,
                }"
                @click="handleThumbnailClick(meta.pageIndex)"
              >
                <ThumbImg :meta="meta" class="thumbnail-img" />
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

      <!-- 使用 composable 获取滚动能力 -->
      <ScrollWatcher
        @page-change="onPageChange"
        @scroll-ready="onScrollReady"
        @thumbnail-ready="onThumbnailReady"
        @total-pages="onTotalPages"
      />
    </EmbedPDF>
  </div>
</template>

<script setup lang="ts">
import { computed, watch, ref, defineComponent, h, onMounted } from "vue";
import { usePdfiumEngine } from "@embedpdf/engines/vue";
import { EmbedPDF, useCapability } from "@embedpdf/core/vue";
import { createPluginRegistration } from "@embedpdf/core";

// 核心插件
import { ViewportPluginPackage } from "@embedpdf/plugin-viewport";
import { Viewport } from "@embedpdf/plugin-viewport/vue";
import { ScrollPluginPackage, ScrollPlugin } from "@embedpdf/plugin-scroll";
import type { ScrollCapability } from "@embedpdf/plugin-scroll";
import { Scroller } from "@embedpdf/plugin-scroll/vue";
import { LoaderPluginPackage } from "@embedpdf/plugin-loader";
import { RenderPluginPackage } from "@embedpdf/plugin-render";
import { RenderLayer } from "@embedpdf/plugin-render/vue";

// 功能插件
import { ZoomPluginPackage } from "@embedpdf/plugin-zoom";
import {
  ThumbnailPluginPackage,
  ThumbnailPlugin,
} from "@embedpdf/plugin-thumbnail";
import type { ThumbnailCapability } from "@embedpdf/plugin-thumbnail";
import { ThumbnailsPane, ThumbImg } from "@embedpdf/plugin-thumbnail/vue";
import { PrintPluginPackage } from "@embedpdf/plugin-print";
import { PrintFrame } from "@embedpdf/plugin-print/vue";
import { ExportPluginPackage } from "@embedpdf/plugin-export";
import { Download } from "@embedpdf/plugin-export/vue";

// 子组件
import PdfToolbar from "./PdfToolbar.vue";

// 内部组件：用于在 EmbedPDF 上下文中使用 useCapability
const ScrollWatcher = defineComponent({
  name: "ScrollWatcher",
  emits: ["page-change", "scroll-ready", "thumbnail-ready", "total-pages"],
  setup(_, { emit }) {
    const { provides: scrollCapability } = useCapability<ScrollPlugin>(
      ScrollPlugin.id
    );
    const { provides: thumbnailCapability } = useCapability<ThumbnailPlugin>(
      ThumbnailPlugin.id
    );

    watch(
      () => scrollCapability.value,
      (cap) => {
        if (cap) {
          emit("scroll-ready", cap);
          cap.onPageChange((payload) => {
            emit("page-change", payload.pageNumber - 1);
            // 同时发送总页数
            if (payload.totalPages) {
              emit("total-pages", payload.totalPages);
            }
          });
        }
      },
      { immediate: true }
    );

    watch(
      () => thumbnailCapability.value,
      (cap) => {
        if (cap) {
          emit("thumbnail-ready", cap);
        }
      },
      { immediate: true }
    );

    return () => null;
  },
});

const props = defineProps<{
  pdfSrc: string;
}>();

// 初始化 PDF 引擎（由 usePdfiumEngine 自动管理）
const { engine, isLoading: engineLoading } = usePdfiumEngine();

// 缩略图侧边栏状态
const showThumbnails = ref(false);

// 缩略图侧边栏 ref
const thumbnailsSidebarRef = ref<HTMLElement | null>(null);

// 当前页码
const currentPage = ref(0);

// 总页数
const totalPages = ref(0);

// 滚动能力引用
let scrollCap: ScrollCapability | null = null;
let thumbnailCap: ThumbnailCapability | null = null;

// 是否正在同步
const isSyncing = ref(false);

// 用户是否在手动滚动缩略图（防止反弹）
const isUserScrollingThumbnails = ref(false);
let userScrollTimer: ReturnType<typeof setTimeout> | null = null;

// 滚动能力就绪
const onScrollReady = (cap: ScrollCapability) => {
  scrollCap = cap;
};

// 缩略图能力就绪
const onThumbnailReady = (cap: ThumbnailCapability) => {
  thumbnailCap = cap;
};

// 总页数更新
const onTotalPages = (pages: number) => {
  totalPages.value = pages;
};

// 页面变化处理
const onPageChange = (pageIndex: number) => {
  if (!isSyncing.value) {
    currentPage.value = pageIndex;
    // 只有在用户没有手动滚动缩略图时，才自动滚动缩略图
    if (!isUserScrollingThumbnails.value && thumbnailCap) {
      thumbnailCap.scrollToThumb(pageIndex);
    }
  }
};

// 用户开始滚动缩略图
const onThumbnailsScroll = () => {
  isUserScrollingThumbnails.value = true;
  // 清除之前的定时器
  if (userScrollTimer) {
    clearTimeout(userScrollTimer);
  }
  // 用户停止滚动 1 秒后，恢复自动滚动
  userScrollTimer = setTimeout(() => {
    isUserScrollingThumbnails.value = false;
  }, 1000);
};

// 鼠标进入缩略图区域时，确保它可以滚动
const onThumbnailsMouseEnter = () => {
  if (document.activeElement instanceof HTMLElement) {
    document.activeElement.blur();
  }
};

// 点击缩略图
const handleThumbnailClick = (pageIndex: number) => {
  if (scrollCap) {
    isSyncing.value = true;
    currentPage.value = pageIndex;
    scrollCap.scrollToPage({
      pageNumber: pageIndex + 1,
      behavior: "smooth",
    });
    setTimeout(() => {
      isSyncing.value = false;
    }, 500);
  }
};

// 为每次 PDF 变化生成唯一 key
const pdfKey = ref(0);
watch(
  () => props.pdfSrc,
  () => {
    pdfKey.value++;
    currentPage.value = 0;
    scrollCap = null;
  }
);

// 注册插件
const plugins = computed(() => [
  createPluginRegistration(LoaderPluginPackage, {
    loadingOptions: {
      type: "url",
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
    width: 155, // 适配侧边栏宽度
    gap: 12, // 增加间距以容纳 padding
    labelHeight: 0,
    autoScroll: false,
  }),
  createPluginRegistration(PrintPluginPackage),
  createPluginRegistration(ExportPluginPackage, {
    defaultFileName: "merged-invoices.pdf",
  }),
]);
</script>

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
  to {
    transform: rotate(360deg);
  }
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
  overflow-y: auto;
  overscroll-behavior: contain;
}

.thumbnails-pane {
  width: 100%;
  height: 100%;
  position: relative;
}

.thumbnail-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2px;
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.15s ease;
  border: 2px solid transparent;
  background-color: rgba(50, 54, 57, 0.5);
  box-sizing: border-box;
}

.thumbnail-item:hover {
  background-color: #3f4447;
  border-color: #4b5563;
}

.thumbnail-item.active {
  background-color: rgba(59, 130, 246, 0.2);
  border-color: #3b82f6;
}

.thumbnail-item.active .thumbnail-img {
  box-shadow: 0 0 0 1px rgba(59, 130, 246, 0.5);
}

.thumbnail-img {
  border: 1px solid #4b5563;
  border-radius: 2px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
  transition: all 0.15s ease;
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

<style>
/* 滚动条样式 - 针对所有相关容器及其子元素 */
.pdf-viewer-container .thumbnails-sidebar,
.pdf-viewer-container .thumbnails-pane,
.pdf-viewer-container .thumbnails-sidebar * {
  /* Firefox */
  scrollbar-width: thin;
  scrollbar-color: #6b7280 transparent;
}

/* Webkit (Chrome, Safari, Edge) */
.pdf-viewer-container .thumbnails-sidebar::-webkit-scrollbar,
.pdf-viewer-container .thumbnails-pane::-webkit-scrollbar,
.pdf-viewer-container .thumbnails-sidebar *::-webkit-scrollbar {
  width: 6px !important;
  height: 6px !important;
  background-color: transparent !important;
}

.pdf-viewer-container .thumbnails-sidebar::-webkit-scrollbar-track,
.pdf-viewer-container .thumbnails-pane::-webkit-scrollbar-track,
.pdf-viewer-container .thumbnails-sidebar *::-webkit-scrollbar-track {
  background: transparent !important;
  border-radius: 0 !important;
}

.pdf-viewer-container .thumbnails-sidebar::-webkit-scrollbar-thumb,
.pdf-viewer-container .thumbnails-pane::-webkit-scrollbar-thumb,
.pdf-viewer-container .thumbnails-sidebar *::-webkit-scrollbar-thumb {
  background-color: #6b7280 !important;
  border-radius: 3px !important;
  border: 1px solid transparent !important;
  background-clip: content-box !important;
}

.pdf-viewer-container .thumbnails-sidebar::-webkit-scrollbar-thumb:hover,
.pdf-viewer-container .thumbnails-pane::-webkit-scrollbar-thumb:hover,
.pdf-viewer-container .thumbnails-sidebar *::-webkit-scrollbar-thumb:hover {
  background-color: #9ca3af !important;
}
</style>

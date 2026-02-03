<template>
  <div class="pdf-toolbar">
    <!-- 缩略图切换按钮 -->
    <button
      class="toolbar-btn"
      :class="{ active: showThumbnails }"
      @click="handleToggleThumbnails"
      title="切换缩略图"
    >
      <svg
        class="toolbar-icon"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
      >
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    </button>

    <!-- 分隔线 -->
    <div class="toolbar-divider"></div>

    <!-- 缩放控制 -->
    <div class="zoom-controls">
      <button class="toolbar-btn" @click="handleZoomOut" title="缩小">
        <svg
          class="toolbar-icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>
      <span class="zoom-level">{{ zoomLevel }}%</span>
      <button class="toolbar-btn" @click="handleZoomIn" title="放大">
        <svg
          class="toolbar-icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>
    </div>

    <!-- 分隔线 -->
    <div class="toolbar-divider"></div>

    <!-- 适应模式切换按钮 -->
    <button
      class="toolbar-btn"
      @click="handleToggleFitMode"
      :title="fitModeTitle"
    >
      <!-- 适合页面宽度图标 -->
      <svg
        v-if="!isFitPage"
        class="toolbar-icon"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
      >
        <path d="M21 3H3v18h18V3z" />
        <path d="M3 9h18M3 15h18" />
      </svg>
      <!-- 适合一页图标 -->
      <svg
        v-else
        class="toolbar-icon"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
      >
        <rect x="4" y="2" width="16" height="20" rx="2" />
        <line x1="4" y1="6" x2="20" y2="6" />
      </svg>
    </button>
    <!-- 分隔线 -->
    <div class="toolbar-divider"></div>

    <!-- 页码显示 -->
    <span v-if="totalPages > 0" class="page-indicator">
      {{ currentPage + 1 }}/{{ totalPages }} 页
    </span>

    <!-- 右侧空白区 -->
    <div class="toolbar-spacer"></div>

    <!-- 打印按钮 -->
    <button class="toolbar-btn" @click="handlePrint" title="打印">
      <svg
        class="toolbar-icon"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
      >
        <polyline points="6 9 6 2 18 2 18 9" />
        <path
          d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"
        />
        <rect x="6" y="14" width="12" height="8" />
      </svg>
    </button>

    <!-- 下载按钮 -->
    <button class="toolbar-btn" @click="handleDownload" title="下载">
      <svg
        class="toolbar-icon"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
      >
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </svg>
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { useZoom } from "@embedpdf/plugin-zoom/vue";
import { ZoomMode } from "@embedpdf/plugin-zoom";
import { usePrintCapability } from "@embedpdf/plugin-print/vue";
import { useExportCapability } from "@embedpdf/plugin-export/vue";

defineProps<{
  showThumbnails: boolean;
  currentPage: number;
  totalPages: number;
}>();

const emit = defineEmits<{
  (e: "toggle-thumbnails"): void;
}>();

// 缩放控制
const { provides: zoomProvides, state: zoomState } = useZoom();

// 打印功能
const { provides: printApi } = usePrintCapability();

// 导出/下载功能
const { provides: exportApi } = useExportCapability();

// 适应模式状态：false = 适合宽度, true = 适合一页
const isFitPage = ref(false);

const zoomLevel = computed(() =>
  zoomState.value ? Math.round(zoomState.value.currentZoomLevel * 100) : 100,
);

const fitModeTitle = computed(() =>
  isFitPage.value ? "适合一页" : "适合页面宽度",
);

const handleZoomIn = (e: MouseEvent) => {
  (e.currentTarget as HTMLElement).blur();
  zoomProvides.value?.zoomIn();
};

const handleZoomOut = (e: MouseEvent) => {
  (e.currentTarget as HTMLElement).blur();
  zoomProvides.value?.zoomOut();
};

const handleToggleFitMode = (e: MouseEvent) => {
  (e.currentTarget as HTMLElement).blur();
  if (isFitPage.value) {
    zoomProvides.value?.requestZoom(ZoomMode.FitPage);
  } else {
    zoomProvides.value?.requestZoom(ZoomMode.FitWidth);
  }
  isFitPage.value = !isFitPage.value;
};

const handlePrint = (e: MouseEvent) => {
  (e.currentTarget as HTMLElement).blur();
  if (printApi.value) {
    const task = printApi.value.print();
    task.wait(
      () => console.log("Print completed"),
      (error) => console.error("Print failed:", error),
    );
  }
};

const handleDownload = (e: MouseEvent) => {
  (e.currentTarget as HTMLElement).blur();
  if (exportApi.value) {
    exportApi.value.download();
  }
};

const handleToggleThumbnails = (e: MouseEvent) => {
  (e.currentTarget as HTMLElement).blur();
  emit("toggle-thumbnails");
};
</script>
<style scoped>
/* 工具栏样式 - Chrome PDF 风格 */
.pdf-toolbar {
  display: flex;
  align-items: center;
  height: 40px;
  padding: 2px 8px 0px 8px;
  background-color: #323639;
  border-bottom: 1px solid #1f2123;
  flex-shrink: 0;
  gap: 4px;
}

.toolbar-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  border: none;
  background: transparent;
  color: #9ca3af;
  border-radius: 16px;
  cursor: pointer;
  transition: all 0.15s ease;
  outline: none;
}

.toolbar-btn:focus {
  outline: none;
}

.toolbar-btn:hover {
  background-color: #3f4447;
  color: #e5e7eb;
}

.toolbar-btn.active {
  background-color: #4b5563;
  color: #e5e7eb;
}

.toolbar-icon {
  width: 18px;
  height: 18px;
}

.toolbar-divider {
  width: 1px;
  height: 24px;
  background-color: #4b5563;
  margin: 0 8px;
}

.zoom-controls {
  display: flex;
  align-items: center;
  gap: 4px;
}

.zoom-level {
  min-width: 48px;
  text-align: center;
  color: #e5e7eb;
  font-size: 13px;
  font-family:
    system-ui,
    -apple-system,
    sans-serif;
}

.page-indicator {
  color: #e5e7eb;
  font-size: 13px;
  font-family:
    system-ui,
    -apple-system,
    sans-serif;
  white-space: nowrap;
}

.toolbar-spacer {
  flex: 1;
}
</style>

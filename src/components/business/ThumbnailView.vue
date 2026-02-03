<template>
  <div class="thumbnails-container">
    <TransitionGroup name="thumbnail-list" tag="div" class="thumbnails-grid">
      <div
        v-for="(file, index) in files"
        :key="file.name"
        class="thumbnail-item"
      >
        <div class="thumbnail-preview">
          <canvas
            :ref="(el) => (canvasRefs[index] = el as HTMLCanvasElement | null)"
          ></canvas>
        </div>
        <div class="thumbnail-info">
          <p class="thumbnail-name">{{ file.name }}</p>
          <button class="thumbnail-remove" @click="$emit('remove', index)">
            <svg
              class="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      </div>
    </TransitionGroup>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, type Ref } from "vue";
import * as pdfjs from "pdfjs-dist";

const props = defineProps<{
  files: File[];
}>();

const canvasRefs: Ref<(HTMLCanvasElement | null)[]> = ref([]);

const renderThumbnail = async (
  file: File,
  canvas: HTMLCanvasElement,
): Promise<void> => {
  if (!canvas) return;

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
  const page = await pdf.getPage(1);

  const viewport = page.getViewport({ scale: 0.2 });
  canvas.width = viewport.width;
  canvas.height = viewport.height;

  await page.render({
    canvasContext: canvas.getContext("2d") as CanvasRenderingContext2D,
    viewport,
  }).promise;
};

watch(
  () => props.files,
  async (newFiles: File[]) => {
    await Promise.all(
      newFiles.map((file, index) => {
        if (canvasRefs.value[index]) {
          return renderThumbnail(file, canvasRefs.value[index]);
        }
      }),
    );
  },
  { deep: true },
);

defineEmits(["remove"]);
</script>

<style scoped>
.thumbnails-container {
  width: 100%;
  padding: 1rem;
}

.thumbnails-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 1rem;
}

.thumbnail-item {
  background: white;
  border-radius: 0.5rem;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  transition: transform 0.2s;
}

.thumbnail-item:hover {
  transform: translateY(-2px);
}

.thumbnail-preview {
  aspect-ratio: 1;
  background: #f1f5f9;
  display: flex;
  align-items: center;
  justify-content: center;
}

.thumbnail-preview canvas {
  max-width: 100%;
  max-height: 100%;
}

.thumbnail-info {
  padding: 0.5rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.thumbnail-name {
  font-size: 0.875rem;
  color: #334155;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.thumbnail-remove {
  color: #ef4444;
  padding: 0.25rem;
  border-radius: 0.25rem;
  transition: background-color 0.2s;
}

.thumbnail-remove:hover {
  background-color: #fee2e2;
}

.thumbnail-list-enter-active,
.thumbnail-list-leave-active {
  transition: all 0.3s ease;
}

.thumbnail-list-enter-from,
.thumbnail-list-leave-to {
  opacity: 0;
  transform: translateY(30px);
}
</style>

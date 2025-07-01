<template>
  <Transition name="toast">
    <div
      v-if="show"
      class="fixed top-4 right-4 max-w-sm bg-white rounded-lg shadow-lg overflow-hidden transition-all duration-300"
    >
      <div class="p-4">
        <div class="flex items-center">
          <!-- 加载动画 -->
          <div v-if="!hasError" class="animate-spin mr-3">
            <svg
              class="w-5 h-5 text-blue-500"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                class="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                stroke-width="4"
              ></circle>
              <path
                class="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
          </div>
          <!-- 错误图标 -->
          <div v-else class="mr-3">
            <svg
              class="w-5 h-5 text-red-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              ></path>
            </svg>
          </div>
          <!-- 状态文本 -->
          <div class="flex-1">
            <h3 class="text-sm font-medium text-gray-900">
              {{ hasError ? errorMessage : statusText }}
            </h3>
            <div v-if="!hasError" class="mt-1">
              <div
                class="relative h-1.5 bg-gray-200 rounded-full overflow-hidden"
              >
                <div
                  class="absolute left-0 top-0 h-full bg-blue-500 transition-all duration-300"
                  :style="{ width: `${percentage}%` }"
                ></div>
              </div>
              <p class="mt-1 text-xs text-gray-500">{{ percentage }}%</p>
            </div>
          </div>
          <!-- 关闭按钮 -->
          <button
            v-if="hasError"
            @click="$emit('close')"
            class="ml-4 text-gray-400 hover:text-gray-500"
          >
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fill-rule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clip-rule="evenodd"
              ></path>
            </svg>
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { computed } from "vue";

const props = defineProps({
  show: {
    type: Boolean,
    default: false,
  },
  percentage: {
    type: Number,
    default: 0,
  },
  hasError: {
    type: Boolean,
    default: false,
  },
  errorMessage: {
    type: String,
    default: "",
  },
});

const statusText = computed<string>(() => {
  const percentage: number = props.percentage;
  if (percentage < 30) {
    return "正在读取文件...";
  } else if (percentage < 80) {
    return "正在识别发票信息...";
  } else {
    return "正在完成处理...";
  }
});

defineEmits(["close"]);
</script>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}

.toast-enter-from {
  opacity: 0;
  transform: translateX(30px);
}

.toast-leave-to {
  opacity: 0;
  transform: translateX(30px);
}
</style> 
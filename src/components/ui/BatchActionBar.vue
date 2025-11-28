<template>
  <div
    class="bg-rose-50 border-b border-rose-200 px-4 py-3 flex items-center gap-4"
  >
      <!-- 选择信息 -->
      <div class="flex items-center gap-2">
        <svg
          class="w-5 h-5 text-red-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <span class="text-sm font-medium text-gray-700">
          已选择 <span class="text-red-600 font-bold">{{ count }}</span> 张
        </span>
      </div>

      <!-- 操作按钮 -->
      <div class="flex gap-2 ml-auto">
        <button
          @click="$emit('cancel')"
          class="px-3 py-1.5 text-xs font-medium text-gray-700 hover:text-gray-900 hover:bg-white/80 rounded-lg transition-all duration-200 border border-gray-300 bg-white/60"
        >
          取消
        </button>
        <button
          @click="$emit('confirm')"
          class="px-3 py-1.5 text-xs font-medium bg-rose-500 text-white hover:bg-rose-600 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-rose-400 focus:ring-offset-1"
        >
          确认删除
        </button>
      </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  count: number;
}>();

defineEmits<{
  (e: "cancel"): void;
  (e: "confirm"): void;
}>();
</script>

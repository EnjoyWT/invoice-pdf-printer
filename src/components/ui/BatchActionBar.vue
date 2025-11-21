<template>
  <Transition
    enter-active-class="transition ease-out duration-300"
    enter-from-class="opacity-0 -translate-y-2"
    enter-to-class="opacity-100 translate-y-0"
    leave-active-class="transition ease-in duration-200"
    leave-from-class="opacity-100 translate-y-0"
    leave-to-class="opacity-0 -translate-y-2"
  >
    <div
      v-if="count > 0"
      class="bg-gradient-to-r from-red-50 to-orange-50 border-y border-red-200 px-4 py-3 flex items-center gap-4"
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
          class="px-3 py-1.5 text-xs font-medium bg-gradient-to-r from-red-600 to-red-700 text-white hover:from-red-700 hover:to-red-800 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md"
        >
          确认删除
        </button>
      </div>
    </div>
  </Transition>
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

<template>
  <div class="flex-1 overflow-y-auto p-3 custom-scrollbar">
    <TransitionGroup name="cell-list" tag="div" class="space-y-3">
      <div
        v-for="(item, index) in invoices"
        :key="item.pageNumber"
        class="group relative p-3 bg-white rounded-xl border border-gray-100 hover:border-blue-200 hover:shadow-md transition-all duration-200"
      >
        <!-- 删除按钮 -->
        <button
          class="absolute -top-2 -right-2 w-6 h-6 flex items-center justify-center bg-white text-gray-400 border border-gray-200 rounded-full hover:text-red-500 hover:border-red-200 hover:bg-red-50 transition-all duration-200 shadow-sm opacity-0 group-hover:opacity-100 z-10 md:opacity-0 opacity-100"
          @click="$emit('remove', index)"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-3.5 w-3.5"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fill-rule="evenodd"
              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
              clip-rule="evenodd"
            />
          </svg>
        </button>

        <!-- 列表内容 -->
        <div class="flex items-start justify-between mb-1">
          <span
            class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600"
          >
            #{{ index + 1 }}
          </span>
          <span class="text-xs text-gray-400">{{ item.date }}</span>
        </div>

        <div class="mb-1">
          <div
            class="text-sm font-medium text-gray-900 truncate"
            :title="item.fileName"
          >
            {{ item.fileName }}
          </div>
        </div>

        <div class="flex items-center justify-between mt-2">
          <span
            class="text-xs text-gray-500 bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100"
          >
            {{ getInvoiceType(item.type) }}
          </span>
          <span class="text-sm font-bold text-blue-600">
            ¥{{ getDisplayAmount(item) }}
          </span>
        </div>
      </div>
    </TransitionGroup>
  </div>
</template>

<script setup lang="ts">
import { getInvoiceType } from "../../utils/invoiceUtils";
import type { InvoiceCell } from "../../types/invoice";

defineProps<{
  invoices: InvoiceCell[];
}>();

defineEmits<{
  (e: "remove", index: number): void;
}>();

/**
 * 计算发票的显示金额
 * 对于类型为 "01", "04", "10" 的发票,自动加上 3% 税额
 */
const getDisplayAmount = (invoice: InvoiceCell): string => {
  const amount = Number(invoice.amount) || 0;
  const taxRate = 0.03;

  // "01", "04", "10" 不包含税额,需要加上税额
  const finalAmount = ["01", "04", "10"].includes(invoice.type)
    ? amount * (1 + taxRate)
    : amount;

  return finalAmount.toLocaleString("zh-CN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};
</script>

<style scoped>
/* 自定义滚动条 */
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}

.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: #e2e8f0;
  border-radius: 3px;
}

.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background-color: #cbd5e1;
}

/* 删除动画时让元素脱离文档流 */
.cell-list-leave-active {
  position: absolute; /* 元素脱离文档流 */
  width: 100%; /* 保持宽度不变 */
  transition: all 0.5s ease;
  z-index: 0;
}

.cell-list-leave-to {
  opacity: 0;
  transform: translateX(30px); /* 右移淡出 */
}

/* 元素移动动画 */
.cell-list-move {
  transition: transform 0.5s ease; /* 确保移动动画一致 */
}
</style>

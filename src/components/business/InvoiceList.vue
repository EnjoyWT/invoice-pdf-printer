<template>
  <div class="flex-1 overflow-y-auto p-4 custom-scrollbar bg-gray-50/50">
    <TransitionGroup name="cell-list" tag="div" class="space-y-3">
      <div
        v-for="(item, index) in invoices"
        :key="item.pageNumber"
        :class="[
          'group relative p-4 rounded-2xl border transition-all duration-300 ease-out',
          pendingDeletions.has(index)
            ? 'bg-red-50/60 border-red-200 shadow-none'
            : 'bg-white border-black/5 shadow-[0_1px_3px_rgba(0,0,0,0.02)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.05)] hover:border-black/10',
        ]"
      >
        <!-- 删除/标记按钮 -->
        <button
          :class="[
            'absolute -top-2.5 -right-2.5 w-7 h-7 flex items-center justify-center rounded-full transition-all duration-200 shadow-sm z-10 cursor-pointer backdrop-blur-sm',
            pendingDeletions.has(index)
              ? 'opacity-100 bg-red-500 text-white border border-red-500 transform scale-110'
              : 'opacity-0 group-hover:opacity-100 bg-white/90 text-gray-400 border border-gray-200/80 hover:text-red-500 hover:border-red-200 hover:bg-red-50',
          ]"
          @click="
            (e) => {
              (e.currentTarget as HTMLElement).blur();
              $emit('toggleDeletion', index);
            }
          "
        >
          <!-- 已标记:显示勾选图标 -->
          <svg
            v-if="pendingDeletions.has(index)"
            xmlns="http://www.w3.org/2000/svg"
            class="h-4 w-4"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
            />
          </svg>
          <!-- 未标记:显示删除图标 -->
          <svg
            v-else
            xmlns="http://www.w3.org/2000/svg"
            class="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="2"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        <!-- 顶部信息栏：序号与日期 -->
        <div class="flex items-center justify-between mb-2">
          <!-- 序号：Apple 风格修改 (灰色胶囊、无边框、圆润、等宽数字) -->
          <span
            class="inline-flex items-center px-2.5 py-0.5 rounded-full text-[13px] font-bold bg-gray-100 text-gray-900 tabular-nums"
          >
            第 {{ index + 1 }} 张
          </span>

          <!-- 日期：次级文本 -->
          <span
            class="text-xs font-medium text-gray-400 tabular-nums tracking-tight"
          >
            {{ item.date }}
          </span>
        </div>

        <!-- 文件名：主标题 -->
        <div class="mb-3">
          <div
            class="text-[12px] leading-snug font-semibold text-gray-600 truncate tracking-tight"
            :title="item.fileName"
          >
            {{ item.fileName }}
          </div>
        </div>

        <!-- 底部栏：类型与金额 -->
        <div class="flex items-end justify-between">
          <span
            class="text-[11px] font-medium text-gray-500 bg-gray-50 border border-gray-100 px-2 py-1 rounded-lg"
          >
            {{ getInvoiceType(item.type) }}
          </span>

          <!-- 金额：主要强调 -->
          <div class="flex items-baseline space-x-0.5">
            <span class="text-xs text-gray-400 font-medium">¥</span>
            <span
              class="text-lg font-bold text-gray-900 tabular-nums -tracking-wide"
            >
              {{ getDisplayAmount(item) }}
            </span>
          </div>
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
  pendingDeletions: Set<number>;
}>();

defineEmits<{
  (e: "toggleDeletion", index: number): void;
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
/* 自定义滚动条 - 更加隐形和极简 */
.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: rgba(0, 0, 0, 0.1);
  border-radius: 10px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background-color: rgba(0, 0, 0, 0.2);
}

/* 动画优化：使用 Apple 风格的弹簧/减速曲线 */
.cell-list-leave-active {
  position: absolute;
  width: 100%;
  transition: all 0.4s cubic-bezier(0.32, 0.72, 0, 1);
  z-index: 0;
}
.cell-list-leave-to {
  opacity: 0;
  transform: scale(0.95);
  margin-bottom: -1rem;
}
.cell-list-move {
  transition: transform 0.5s cubic-bezier(0.32, 0.72, 0, 1);
}
</style>

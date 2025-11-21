<template>
  <div class="stats-container">
    <div class="stats-flex">
      <div class="stat-item">
        <div class="stat-icon bg-blue-100 text-blue-600">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        </div>
        <div class="stat-content">
          <span class="stat-label">数量</span>
          <span class="stat-value">{{ invoiceCount }}</span>
        </div>
      </div>
      <div class="stat-divider"></div>
      <div class="stat-item">
        <div class="stat-icon bg-green-100 text-green-600">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <div class="stat-content">
          <span class="stat-label">总金额</span>
          <span class="stat-value amount">¥{{ totalAmount }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, type Ref } from "vue";
import type { InvoiceCell } from "../../types/invoice";

const props = defineProps<{ invoices: InvoiceCell[] }>();

const period: Ref<string> = ref("all");

const filteredInvoices = computed<InvoiceCell[]>(() => {
  if (period.value === "all") return props.invoices;

  const now = new Date();
  const startDate =
    period.value === "month"
      ? new Date(now.getFullYear(), now.getMonth(), 1)
      : new Date(now.getFullYear(), 0, 1);

  return props.invoices.filter((invoice) => {
    const invoiceDate = new Date(invoice.date);
    return invoiceDate >= startDate;
  });
});

const totalAmount = computed<string>(() => {
  return filteredInvoices.value
    .reduce((sum, invoice) => {
      const amount = Number(invoice.amount) || 0;
      const taxRate = 0.03;
      // "01", "04", "10" 不包含税额
      const finalAmount = ["01", "04", "10"].includes(invoice.type)
        ? amount * (1 + taxRate)
        : amount;
      return sum + finalAmount;
    }, 0)
    .toLocaleString("zh-CN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
});

const invoiceCount = computed<number>(() => filteredInvoices.value.length);
</script>

<style scoped>
.stats-container {
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(8px);
  border-radius: 12px;
  box-shadow:
    0 4px 6px -1px rgba(0, 0, 0, 0.05),
    0 2px 4px -1px rgba(0, 0, 0, 0.03);
  border: 1px solid rgba(226, 232, 240, 0.8);
  padding: 0.5rem 1rem;
  transition: all 0.3s ease;
}

.stats-container:hover {
  box-shadow:
    0 10px 15px -3px rgba(0, 0, 0, 0.05),
    0 4px 6px -2px rgba(0, 0, 0, 0.025);
  transform: translateY(-1px);
}

.stats-flex {
  display: flex;
  align-items: center;
  gap: 1.5rem;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.stat-divider {
  width: 1px;
  height: 24px;
  background-color: #e2e8f0;
}

.stat-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 10px;
  transition: all 0.3s ease;
}

.stat-item:hover .stat-icon {
  transform: scale(1.1);
}

.stat-content {
  display: flex;
  flex-direction: column;
  justify-content: center;
  line-height: 1.2;
}

.stat-label {
  font-size: 0.75rem;
  color: #64748b;
  font-weight: 500;
  margin-bottom: 2px;
}

.stat-value {
  font-size: 1.125rem;
  font-weight: 700;
  color: #1e293b;
  font-family:
    "Inter",
    -apple-system,
    BlinkMacSystemFont,
    sans-serif;
}

.stat-value.amount {
  background: linear-gradient(45deg, #059669, #10b981);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}
</style>

<template>
  <div class="stats-container">
    <div class="stats-grid">
      <div class="stat-item">
        <span class="stat-label">总金额</span>
        <span class="stat-value">¥{{ totalAmount }}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">发票数量</span>
        <span class="stat-value">{{ invoiceCount }}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">专票数量</span>
        <span class="stat-value">{{ specialInvoiceCount }}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">普票数量</span>
        <span class="stat-value">{{ normalInvoiceCount }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, type Ref } from "vue";
import { getInvoiceType } from "../../utils/invoiceUtils";
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
  // console.log("计算总金额，发票数据:", props.invoices);
  return filteredInvoices.value
    .reduce((sum, invoice) => {
      const amount = Number(invoice.amount) || 0;
      const taxRate = 0.03;
      // "01", "04", "10" 不包含税额
      const finalAmount = ["01", "04", "10"].includes(invoice.type)
        ? amount * (1 + taxRate)
        : amount;
      // console.log("单张发票金额(含税):", finalAmount);
      return sum + finalAmount;
    }, 0)
    .toFixed(2);
});

const invoiceCount = computed<number>(() => filteredInvoices.value.length);

const specialInvoiceCount = computed<number>(
  () =>
    filteredInvoices.value.filter((i) => ["01", "10"].includes(i.type)).length
);

const normalInvoiceCount = computed<number>(
  () => filteredInvoices.value.filter((i) => i.type === "04").length
);
</script>

<style scoped>
.stats-container {
  width: 100%;
  padding: 0.5rem;
}

.stats-card {
  background: white;
  border-radius: 0.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);

  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1),
    0 2px 4px -1px rgba(0, 0, 0, 0.06);
  padding: 1rem;
  background: linear-gradient(to right bottom, #ffffff, #f8fafc);
  /* border: 0.01px solid rgba(226, 232, 240, 0.8); */
}

.stats-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid #e2e8f0;
}

.stats-title {
  font-size: 1rem;
  font-weight: 600;
  color: #334155;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.period-select {
  padding: 0.25rem 0.5rem;
  border-radius: 0.375rem;
  border: 1px solid #cbd5e1;
  background-color: white;
  color: #64748b;
  font-size: 0.875rem;
  transition: all 0.2s;
  cursor: pointer;
  outline: none;
}

.period-select:hover {
  border-color: #94a3b8;
}

.period-select:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.5rem;
}

@media (max-width: 768px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .stats-title {
    font-size: 0.875rem;
  }

  .period-select {
    font-size: 0.75rem;
    padding: 0.25rem;
  }

  .stat-value {
    font-size: 1rem;
  }
}

.stat-item {
  padding: 0.75rem;
  background: linear-gradient(145deg, #ffffff, #f8fafc);
  border-radius: 0.375rem;
  display: flex;
  flex-direction: column;
  border: 1px solid rgba(226, 232, 240, 0.6);
  transition: all 0.3s ease;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.stat-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

.stat-label {
  font-size: 0.875rem;
  color: #64748b;
  margin-bottom: 0.25rem;
  font-weight: 500;
}

.stat-value {
  font-size: 1.125rem;
  font-weight: 600;
  background: linear-gradient(45deg, #3b82f6, #2563eb);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}
</style> 
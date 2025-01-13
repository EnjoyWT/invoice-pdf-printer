<template>
  <div class="stats-container">
    <div class="stats-card">
      <div class="stats-header">
        <h3 class="stats-title">发票统计</h3>
        <div class="stats-period">
          <select v-model="period" class="period-select">
            <option value="all">全部</option>
            <option value="month">本月</option>
            <option value="year">本年</option>
          </select>
        </div>
      </div>

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
  </div>
</template>

<script setup>
import { ref, computed } from "vue";

const props = defineProps({
  invoices: {
    type: Array,
    required: true,
  },
});

const period = ref("all");

const filteredInvoices = computed(() => {
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

const totalAmount = computed(() => {
  console.log("计算总金额，发票数据:", props.invoices);
  return filteredInvoices.value
    .reduce((sum, invoice) => {
      const amount = Number(invoice.amount) || 0;
      const taxRate = 0.03;
      const finalAmount = ["01", "04", "10"].includes(invoice.type)
        ? amount * (1 + taxRate)
        : amount;
      console.log("单张发票金额(含税):", finalAmount);
      return sum + finalAmount;
    }, 0)
    .toFixed(2);
});

const invoiceCount = computed(() => filteredInvoices.value.length);

const specialInvoiceCount = computed(
  () =>
    filteredInvoices.value.filter((i) => ["01", "10"].includes(i.type)).length
);

const normalInvoiceCount = computed(
  () => filteredInvoices.value.filter((i) => i.type === "04").length
);
</script>

<style scoped>
.stats-container {
  width: 100%;
}

.stats-card {
  background: white;
  border-radius: 0.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  padding: 1rem;
}

.stats-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.stats-title {
  font-size: 1rem;
  font-weight: 600;
  color: #1e293b;
}

.period-select {
  padding: 0.25rem 0.5rem;
  border-radius: 0.375rem;
  border: 1px solid #e2e8f0;
  background-color: white;
  color: #64748b;
  font-size: 0.875rem;
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
  background: #f8fafc;
  border-radius: 0.375rem;
  display: flex;
  flex-direction: column;
}

.stat-label {
  font-size: 0.875rem;
  color: #64748b;
  margin-bottom: 0.25rem;
}

.stat-value {
  font-size: 1.125rem;
  font-weight: 600;
  color: #1e293b;
}
</style> 
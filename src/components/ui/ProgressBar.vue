<template>
  <div class="progress-container">
    <div class="progress-status">
      {{ getStatusText(percentage) }}
    </div>
    <div class="progress-bar">
      <div
        class="progress-fill"
        :class="{ error: hasError }"
        :style="{ width: `${percentage}%` }"
      ></div>
    </div>
    <div class="progress-text" :class="{ error: hasError }">
      {{ hasError ? errorMessage : `${percentage}%` }}
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps({
  percentage: {
    type: Number,
    required: true,
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

const getStatusText = (percentage: number): string => {
  if (percentage < 50) {
    return "正在读取文件...";
  } else if (percentage < 80) {
    return "正在处理发票...";
  } else {
    return "正在完成处理...";
  }
};
</script>

<style scoped>
.progress-container {
  width: 100%;
  margin: 10px 0;
}

.progress-bar {
  width: 100%;
  height: 6px;
  background-color: #e2e8f0;
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background-color: #3b82f6;
  transition: width 0.3s ease;
}

.progress-text {
  text-align: right;
  font-size: 12px;
  color: #64748b;
  margin-top: 4px;
}

.progress-fill.error {
  background-color: #ef4444;
}

.progress-text.error {
  color: #ef4444;
}
</style>

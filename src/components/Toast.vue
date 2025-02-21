<template>
  <div v-if="visible" :class="['toast', type]" @click="hideToast">
    <p>{{ message }}</p>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from "vue";

const props = defineProps({
  message: String,
  type: {
    type: String,
    default: "info", // 支持 'success', 'error', 'warning', 'info'
  },
  duration: {
    type: Number,
    default: 3000, // 默认显示3秒
  },
});

const visible = ref(true);

const hideToast = () => {
  visible.value = false;
};

let timer;

onMounted(() => {
  timer = setTimeout(hideToast, props.duration);
});

onUnmounted(() => {
  clearTimeout(timer);
});
</script>

<style scoped>
.toast {
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  padding: 10px 20px;
  border-radius: 5px;
  color: white;
  cursor: pointer;
  transition: opacity 0.3s ease;
}

.toast.info {
  background-color: #2196f3;
}

.toast.success {
  background-color: #4caf50;
}

.toast.error {
  background-color: #f44336;
}

.toast.warning {
  background-color: #ff9800;
}
</style> 
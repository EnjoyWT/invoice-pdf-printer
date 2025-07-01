<template>
  <div v-if="isLoading" class="loading-overlay">
    <div class="lds-dual-ring"></div>
  </div>
</template>

<script lang="ts">
export default {
  name: "LoadingView",
  props: {
    isLoading: {
      type: Boolean,
      default: false,
    },
  },
};
</script>

<style scoped>
/* 加载指示器样式 */
.lds-dual-ring {
  display: inline-block;
  width: 80px;
  height: 80px;
}

.lds-dual-ring:after {
  content: " ";
  display: block;
  width: 64px;
  height: 64px;
  margin: 8px;
  border-radius: 50%;
  border: 6px solid #3498db; /* 修改颜色为蓝色 */
  border-color: #3498db transparent #3498db transparent;
  animation: lds-dual-ring 1.2s linear infinite; /* 修改动画时间为1.2s */
}

@keyframes lds-dual-ring {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

/* 全局遮罩样式 */
.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(255, 255, 255, 0.8); /* 半透明白色背景 */
  z-index: 9999; /* 设置在最上层 */
  display: flex;
  justify-content: center;
  align-items: center;
}
</style>

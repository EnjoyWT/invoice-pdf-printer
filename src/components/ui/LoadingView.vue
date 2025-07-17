<template>
  <div
    v-if="isLoading"
    class="loading-overlay"
    :class="{ 'loading-overlay--minimal': hasDetailedProgress }"
  >
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
    // 新增：当有详细进度时，使用更轻量的样式
    hasDetailedProgress: {
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

/* 智能遮罩样式 */
.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(
    135deg,
    rgba(255, 255, 255, 0.4) 0%,
    rgba(248, 250, 252, 0.6) 100%
  );
  backdrop-filter: blur(3px) saturate(1.2);
  z-index: 9998;
  display: flex;
  justify-content: center;
  align-items: center;
  transition: all 0.3s ease;
}

/* 当有详细进度时的轻量样式 */
.loading-overlay--minimal {
  background-color: rgba(255, 255, 255, 0.1); /* 几乎透明 */
  backdrop-filter: blur(1px); /* 轻微模糊 */
}

.loading-overlay--minimal .lds-dual-ring {
  width: 40px; /* 更小的加载器 */
  height: 40px;
}

.loading-overlay--minimal .lds-dual-ring:after {
  width: 32px;
  height: 32px;
  margin: 4px;
  border-width: 3px; /* 更细的边框 */
}
</style>

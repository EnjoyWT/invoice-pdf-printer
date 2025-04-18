<template>
  <!-- 移动设备访问时显示提示 -->
  <div v-if="isMobile" class="mobile-notice">
    <div class="content-wrapper">
      <div class="icon">
        <div class="device"></div>
        <div class="slash"></div>
      </div>
      <h1>暂不支持移动端访问</h1>
      <p>
        非常抱歉，我们的系统暂时不支持在移动设备上使用。请使用桌面电脑或笔记本访问以获得最佳体验。
      </p>
      <div class="desktop-icon">
        <div class="monitor"></div>
      </div>
      <p>我们正在努力适配移动设备，敬请期待！</p>
    </div>
  </div>

  <!-- 非移动设备访问时显示Home组件内容 -->
  <div v-else>
    <Home />
  </div>
</template>

<script>
import { ref, onMounted } from "vue";
import Home from "./components/Home.vue";

export default {
  name: "App",
  components: {
    Home,
  },
  setup() {
    // 检测是否为移动设备
    const isMobile = ref(false);

    onMounted(() => {
      // 简单的移动设备检测函数
      const checkMobile = () => {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
          navigator.userAgent
        );
      };

      isMobile.value = checkMobile();

      // 监听窗口大小变化，动态更新设备类型
      window.addEventListener("resize", () => {
        isMobile.value = checkMobile() || window.innerWidth < 768;
      });
    });

    return {
      isMobile,
    };
  },
};
</script>

<style scoped>
/* 移动端提示页样式 */
.container {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
    "Helvetica Neue", Arial, sans-serif;
  min-height: 100vh;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  color: #333;
}

.mobile-notice {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100vh;
  display: flex;
  justify-content: center;
  padding-top: 15vh; /* 黄金比例: 约在垂直38.2%位置开始 */
  background-color: #f8fafc; /* 浅色背景 */
}

.content-wrapper {
  background: linear-gradient(to right bottom, #ffffff, #f5f7fa);
  border-radius: 12px;
  box-shadow: 0 8px 20px rgba(59, 130, 246, 0.15); /* 蓝色阴影 */
  padding: 30px 20px;
  width: 85%;
  max-height: fit-content; /* 或具体值比如 600px */
  max-width: 400px;
  text-align: center;
  animation: fadeIn 0.8s ease;
  border: 1px solid rgba(59, 130, 246, 0.2); /* 淡蓝色边框 */
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.icon {
  width: 80px;
  height: 80px;
  margin: 0 auto 20px;
  position: relative;
}

.device {
  width: 45px;
  height: 70px;
  border: 3px solid #3b82f6; /* 蓝色500 */
  border-radius: 8px;
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
}

.device:before {
  content: "";
  position: absolute;
  width: 8px;
  height: 3px;
  background: #3b82f6; /* 蓝色500 */
  bottom: -6px;
  left: 50%;
  transform: translateX(-50%);
  border-radius: 2px;
}

.slash {
  width: 80px;
  height: 3px;
  background-color: #dc2626; /* 保留红色的禁止符号 */
  position: absolute;
  top: 50%;
  left: 0;
  transform: rotate(45deg);
  border-radius: 3px;
}

h1 {
  font-size: 20px;
  font-weight: 600;
  margin-bottom: 15px;
  color: #1e3a8a; /* 深蓝色 */
}

p {
  font-size: 14px;
  line-height: 1.5;
  color: #475569; /* 暗灰色 */
  margin-bottom: 20px;
}

.desktop-icon {
  width: 90px;
  height: 60px;
  margin: 20px auto;
  position: relative;
}

.monitor {
  width: 80px;
  height: 55px;
  border: 3px solid #3b82f6; /* 蓝色500 */
  border-radius: 4px;
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
}

.monitor:after {
  content: "";
  position: absolute;
  width: 25px;
  height: 3px;
  background: #3b82f6; /* 蓝色500 */
  bottom: -12px;
  left: 50%;
  transform: translateX(-50%);
  border-radius: 2px;
}

.monitor:before {
  content: "";
  position: absolute;
  width: 40px;
  height: 3px;
  background: #3b82f6; /* 蓝色500 */
  bottom: -6px;
  left: 50%;
  transform: translateX(-50%);
  border-radius: 2px;
}

/* 针对不同屏幕尺寸的适配 */
@media screen and (max-width: 320px) {
  .mobile-notice {
    padding-top: 12vh;
  }

  .content-wrapper {
    padding: 20px 15px;
  }

  h1 {
    font-size: 18px;
  }

  p {
    font-size: 13px;
    margin-bottom: 15px;
  }

  .icon {
    width: 70px;
    height: 70px;
    margin-bottom: 15px;
  }

  .device {
    width: 40px;
    height: 60px;
  }

  .desktop-icon {
    width: 80px;
    height: 50px;
    margin: 15px auto;
  }

  .monitor {
    width: 70px;
    height: 45px;
  }
}

@media screen and (min-width: 321px) and (max-width: 480px) {
  .content-wrapper {
    padding: 25px 18px;
  }
}

/* 处理竖屏和横屏的不同显示 */
@media screen and (orientation: landscape) and (max-height: 500px) {
  .mobile-notice {
    padding-top: 8vh;
  }

  .content-wrapper {
    padding: 15px;
  }

  .icon {
    margin-bottom: 10px;
  }

  .desktop-icon {
    margin: 10px auto;
  }

  p {
    margin-bottom: 10px;
  }
}
</style>
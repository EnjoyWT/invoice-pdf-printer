<template>
  <div class="license-test">
    <h2>授权功能测试页面</h2>

    <div class="test-section">
      <h3>IPC通信状态</h3>
      <p>IPC可用: {{ ipcStatus }}</p>
      <button @click="checkIpcStatus">检查IPC状态</button>
      <button @click="testBasicIpc">测试基本IPC</button>
    </div>

    <div class="test-section">
      <h3>授权状态检查</h3>
      <button @click="checkLicenseStatus">检查授权状态</button>
      <p v-if="licenseResult">结果: {{ licenseResult }}</p>
    </div>

    <div class="test-section">
      <h3>测试授权码验证</h3>
      <input v-model="testKey" placeholder="输入测试授权码" />
      <button @click="testVerify">测试验证</button>
      <p v-if="verifyResult">验证结果: {{ verifyResult }}</p>
    </div>

    <div class="test-section">
      <h3>导航</h3>
      <button @click="goToLicense">跳转到授权页面</button>
      <button @click="goToHome">跳转到首页</button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useLicense } from "@/composables/useLicense";

const router = useRouter();
const { checkLicenseStatus: checkLicenseStatusFn, verifyLicense } =
  useLicense();

const ipcStatus = ref("未知");
const licenseResult = ref("");
const verifyResult = ref("");
const testKey = ref("");

// 检查IPC通信状态
const checkIpcStatus = () => {
  console.log("检查IPC状态...");
  console.log("window.ipcRenderer:", window.ipcRenderer);
  console.log("window.ipcRenderer.invoke:", window.ipcRenderer?.invoke);
  console.log("window.ipcRenderer.send:", window.ipcRenderer?.send);
  console.log("window.ipcRenderer.on:", window.ipcRenderer?.on);
  console.log("window.electronAPI:", window.electronAPI);
  console.log(
    "window.electronAPI.checkLicenseStatus:",
    window.electronAPI?.checkLicenseStatus,
  );

  if (
    window.electronAPI &&
    typeof window.electronAPI.checkLicenseStatus === "function"
  ) {
    ipcStatus.value = "electronAPI可用";
  } else if (
    window.ipcRenderer &&
    typeof window.ipcRenderer.invoke === "function"
  ) {
    ipcStatus.value = "ipcRenderer.invoke可用";
  } else if (window.ipcRenderer) {
    ipcStatus.value = "ipcRenderer存在但invoke不可用";
  } else {
    ipcStatus.value = "ipcRenderer不存在";
  }
};

// 测试基本的IPC通信
const testBasicIpc = async () => {
  try {
    if (
      !window.electronAPI ||
      typeof window.electronAPI.getVersion !== "function"
    ) {
      licenseResult.value = "electronAPI不可用";
      return;
    }

    // 测试一个简单的IPC调用
    const result = await window.electronAPI.getVersion();
    licenseResult.value = `基本IPC测试成功: ${result}`;
  } catch (error) {
    licenseResult.value = `基本IPC测试失败: ${error.message}`;
  }
};

// 检查授权状态（调用 composable 内的方法）
const checkLicenseStatus = async () => {
  try {
    await checkLicenseStatusFn();
    licenseResult.value = "授权状态检查完成";
  } catch (error) {
    licenseResult.value = `错误: ${error.message}`;
  }
};

// 测试授权码验证
const testVerify = async () => {
  try {
    if (!testKey.value.trim()) {
      verifyResult.value = "请输入测试授权码";
      return;
    }

    const result = await verifyLicense(testKey.value.trim());
    verifyResult.value = JSON.stringify(result);
  } catch (error) {
    verifyResult.value = `错误: ${error.message}`;
  }
};

// 导航到授权页面
const goToLicense = () => {
  router.push("/license");
};

// 导航到首页
const goToHome = () => {
  router.push("/");
};

// 页面加载时检查IPC状态
onMounted(() => {
  checkIpcStatus();
});
</script>

<style scoped lang="scss">
.license-test {
  padding: 20px;
  max-width: 600px;
  margin: 0 auto;

  h2 {
    color: #2c3e50;
    margin-bottom: 20px;
  }

  .test-section {
    margin-bottom: 30px;
    padding: 20px;
    border: 1px solid #e1e8ed;
    border-radius: 8px;
    background-color: #f8f9fa;

    h3 {
      color: #34495e;
      margin-bottom: 15px;
    }

    button {
      margin: 10px 10px 10px 0;
      padding: 8px 16px;
      background-color: #667eea;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;

      &:hover {
        background-color: #5a6fd8;
      }
    }

    input {
      padding: 8px 12px;
      border: 1px solid #ddd;
      border-radius: 4px;
      margin-right: 10px;
      width: 200px;
    }

    p {
      margin: 10px 0;
      padding: 10px;
      background-color: white;
      border-radius: 4px;
      border-left: 3px solid #667eea;
    }
  }
}
</style>

<template>
  <div class="license-activation">
    <!-- 背景装饰元素 -->
    <div class="bg-decorations">
      <div class="floating-circle circle-1"></div>
      <div class="floating-circle circle-2"></div>
      <div class="floating-circle circle-3"></div>
      <div class="subtle-grid"></div>
    </div>

    <div class="license-container">
      <!-- 右上角提示三角 -->
      <div 
        class="help-trigger" 
        :class="{ 'active': showQrCode }"
        @click="toggleQrCode"
      >
        <div class="triangle-hint">
          <span class="hint-text">获取授权码</span>
        </div>
      </div>

      <!-- 二维码覆盖层 -->
      <div 
        class="qr-overlay" 
        :class="{ 'show': showQrCode }"
        @click="toggleQrCode"
      >
        <div class="qr-content" @click.stop>
          <div class="qr-header">
            <h3>获取授权码</h3>
            <button class="close-btn" @click="toggleQrCode">×</button>
          </div>
          <div class="qr-body">
            <div class="qr-code-container">
              <img 
                v-if="qrCodeImage" 
                :src="qrCodeImage" 
                alt="联系客服" 
                class="qr-image" 
              />
              <div v-else class="qr-placeholder">  
               <img src="@/assets/qr-contact.png" alt="联系客服" class="qr-image" />
              </div>
              <p class="qr-tip">扫描二维码联系客服获取授权码</p>
            </div>
          </div>
        </div>
      </div>

      <div class="license-header">
        <div class="logo-container">
          <div class="logo-glow"></div>
        </div>
        <h1 class="title">授权激活</h1>
        <p class="subtitle">请输入您的授权码以激活应用</p>
      </div>

      <div class="license-form">
        <div class="input-group">
          <label for="licenseKey" class="input-label">
            <span>授权码</span>
            <span class="required">*</span>
          </label>
          <div class="input-wrapper">
            <input
              id="licenseKey"
              v-model="licenseKey"
              type="text"
              class="license-input"
              placeholder="请输入您的授权码"
              :disabled="isVerifying"
              @keyup.enter="verifyLicenseKey"
              @input="hideError"
            />
            <div class="input-focus-line"></div>
          </div>
        </div>

        <button
          class="verify-btn"
          :class="{ 
            'verifying': isVerifying,
            'success': verifySuccess 
          }"
          :style="buttonStyle"
          :disabled="!licenseKey.trim() || isVerifying"
          @click="verifyLicenseKey"
        >
          <span v-if="!isVerifying && !verifySuccess" class="btn-text">
            <i class="btn-icon">🔓</i>
            验证授权
          </span>
          <span v-else-if="isVerifying" class="btn-text loading">
            <div class="spinner"></div>
            验证中...
          </span>
          <span v-else class="btn-text">
            <i class="btn-icon">✅</i>
            验证成功
          </span>
        </button>

        <div v-if="errorMessage" class="error-message">
          <i class="error-icon">⚠️</i>
          {{ errorMessage }}
        </div>
      </div>

      <!-- 授权过期提示 -->
      <div v-if="showExpiredMessage" class="expired-section">
        <div class="expired-content">
          <div class="expired-icon">⏰</div>
          <h3 class="expired-title">授权码已过期</h3>
          <p class="expired-desc">您的授权码已过期，请联系管理员获取新的授权码</p>
          
          <div class="contact-actions">
            <button class="contact-btn" @click="showQrCode = true">
              <i>📞</i>
              联系客服
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
// import { ElMessage } from 'element-plus' // 如果使用 Element Plus
// import { useLicense } from '@/composables/useLicense' // 自定义 composable
// 路由
const router = useRouter()

// 响应式数据
const licenseKey = ref('')
const isVerifying = ref(false)
const errorMessage = ref('')
const showExpiredMessage = ref(false)
const showQrCode = ref(false)
const verifySuccess = ref(false)
const qrCodeImage = ref('') // 二维码图片路径

// 计算属性 - 按钮样式
const buttonStyle = computed(() => {
  if (verifySuccess.value) {
    return {
      background: 'linear-gradient(135deg, #10b981, #059669)'
    }
  }
  return {}
})

// 检查是否为开发环境
const isDevelopment = process.env.NODE_ENV === 'development' || import.meta.env?.DEV

// 切换二维码显示
const toggleQrCode = () => {
  showQrCode.value = !showQrCode.value
}

// 隐藏错误信息
const hideError = () => {
  if (errorMessage.value) {
    errorMessage.value = ''
    showExpiredMessage.value = false
  }
}

// 显示错误信息
const showError = (message) => {
  errorMessage.value = message
  showExpiredMessage.value = false
}

// 显示过期提示
const showExpiredAlert = () => {
  errorMessage.value = ''
  showExpiredMessage.value = true
}

// 验证授权码
const verifyLicenseKey = async () => {
  const key = licenseKey.value.trim()
  
  if (!key) {
    showError('请输入授权码')
    return
  }

  if (isVerifying.value) return

  isVerifying.value = true
  errorMessage.value = ''
  verifySuccess.value = false

  try {
    // 轻微loading效果
    await new Promise(resolve => setTimeout(resolve, 300))
    
    // 调用主进程真实验证（验证成功会被主进程持久化到本地）
    const result = await window.electronAPI.verifyLicense(key)
    
    if (result.valid) {
      verifySuccess.value = true
      
      // 显示成功消息（如果使用 Element Plus）
      // ElMessage.success('授权验证成功！')
      
      // 延迟跳转
      setTimeout(() => {
        router.push('/')
      }, 1500)
    } else {
      if (result.reason === 'expired' || result.reason.includes('过期')) {
        showExpiredAlert()
      } else {
        showError(result.reason || '授权码验证失败，请检查后重试')
      }
    }
  } catch (error) {
    showError(error.message || '验证过程发生错误，请重试')
    console.error('授权验证错误:', error)
  } finally {
    isVerifying.value = false
  }
}

// mock 验证逻辑已移除，改为调用主进程接口

// 实际的授权验证函数（需要根据具体API调整）
const actualVerifyLicense = async (key) => {
  try {
    const response = await fetch('/api/verify-license', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ licenseKey: key })
    })
    
    if (!response.ok) {
      throw new Error('网络请求失败')
    }
    
    const data = await response.json()
    return data
  } catch (error) {
    throw new Error('验证服务暂时不可用，请稍后重试')
  }
}

// 组件挂载时的操作
onMounted(() => {
  // 可以在这里执行一些初始化操作
  // 例如：自动检查授权状态
  setTimeout(() => {
    // autoCheckLicense()
  }, 1000)
})

// 导出供父组件使用的方法（如果需要）
defineExpose({
  verifyLicenseKey,
  toggleQrCode
})
</script>

<style scoped lang="scss">
.license-activation {
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100%;
  min-width: 100%;
  
  /* 蓝色系渐变背景 */
  background: 
    linear-gradient(135deg, 
      rgba(240, 248, 255, 0.95) 0%, 
      rgba(235, 245, 255, 0.9) 20%,
      rgba(219, 234, 254, 0.85) 40%,
      rgba(191, 219, 254, 0.8) 70%,
      rgba(147, 197, 253, 0.75) 100%
    ),
    radial-gradient(circle at 20% 50%, rgba(37, 106, 246, 0.1) 0%, transparent 50%),
    radial-gradient(circle at 80% 20%, rgba(59, 130, 246, 0.08) 0%, transparent 50%),
    radial-gradient(circle at 40% 80%, rgba(96, 165, 250, 0.06) 0%, transparent 50%);
  
  background-size: 100% 100%, 800px 800px, 600px 600px, 700px 700px;
  background-position: center, -200px center, right -100px top, left center bottom;
  animation: subtleShift 30s ease-in-out infinite;
  // padding: 20px;
  overflow: hidden;

  // 背景装饰
  .bg-decorations {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 0;

    // 微妙的网格背景
    .subtle-grid {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-image: 
        linear-gradient(rgba(37, 106, 246, 0.04) 1px, transparent 1px),
        linear-gradient(90deg, rgba(37, 106, 246, 0.04) 1px, transparent 1px);
      background-size: 50px 50px;
      animation: gridMove 60s linear infinite;
    }

    .floating-circle {
      position: absolute;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(147, 197, 253, 0.3) 0%, rgba(219, 234, 254, 0.2) 40%, transparent 70%);
      animation: elegantFloat 20s infinite ease-in-out;
      backdrop-filter: blur(1px);

      &.circle-1 {
        width: 200px;
        height: 200px;
        top: 10%;
        right: 15%;
        animation-delay: 0s;
      }

      &.circle-2 {
        width: 150px;
        height: 150px;
        bottom: 20%;
        left: 10%;
        animation-delay: -8s;
      }

      &.circle-3 {
        width: 100px;
        height: 100px;
        top: 60%;
        right: 5%;
        animation-delay: -15s;
      }
    }
  }
}

@keyframes subtleShift {
  0%, 100% { 
    background-position: center, -200px center, right -100px top, left center bottom;
    filter: brightness(1);
  }
  33% { 
    background-position: center, 100px 100px, right 50px top 100px, left 50px bottom 50px;
    filter: brightness(1.02);
  }
  66% { 
    background-position: center, -100px -100px, right -50px top -50px, left -50px bottom -50px;
    filter: brightness(0.98);
  }
}

@keyframes gridMove {
  0% { transform: translate(0, 0); }
  100% { transform: translate(50px, 50px); }
}

@keyframes elegantFloat {
  0%, 100% { 
    transform: translateY(0) translateX(0) scale(1); 
    opacity: 0.6; 
  }
  33% { 
    transform: translateY(-20px) translateX(10px) scale(1.1); 
    opacity: 0.3; 
  }
  66% { 
    transform: translateY(10px) translateX(-15px) scale(0.9); 
    opacity: 0.8; 
  }
}

.license-container {
  position: relative;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(25px) saturate(1.2);
  border: 1px solid rgba(255, 255, 255, 0.6);
  border-radius: 20px;
  box-shadow: 
    0 25px 50px -12px rgba(37, 106, 246, 0.1),
    0 0 0 1px rgba(255, 255, 255, 0.05),
    inset 0 1px 0 rgba(255, 255, 255, 0.7);
  padding: 40px;
  max-width: 420px;
  width: 100%;
  text-align: center;
  z-index: 1;
  overflow: hidden;
  animation: containerEntrance 1s ease-out;
}

@keyframes containerEntrance {
  0% {
    opacity: 0;
    transform: translateY(30px) scale(0.95);
  }
  100% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

// 右上角提示三角
.help-trigger {
  position: absolute;
  top: 0;
  right: 0;
  width: 80px;
  height: 80px;
  cursor: pointer;
  z-index: 10;
  overflow: hidden;

  .triangle-hint {
    position: absolute;
    top: 0;
    right: 0;
    width: 0;
    height: 0;
    border-left: 80px solid transparent;
    border-top: 80px solid #dbeafe;
    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    
    .hint-text {
      position: absolute;
      top: -60px;
      right: -1px;
      color: #0044f6;
      font-size: 12px;
      font-weight: 500;
      transform: rotate(45deg);
      white-space: nowrap;
      text-shadow: 0 1px 2px rgba(255, 255, 255, 0.8);
    }
    // .hint-text {
    //   position: absolute;
    //   top: -55px;   // 调整位置，让文字正好落在三角边上
    //   right: -50px;
    //   font-size: 12px;
    //   font-weight: 600;
    //   color: #1e40af;
    //   white-space: nowrap;
    //   text-shadow: 0 1px 2px rgba(255, 255, 255, 0.8);

    //   /* 让文字倾斜，和三角边对齐 */
    //   transform: rotate(-45deg) skew(-10deg);
    //   transform-origin: center;
    // }
  }

  &:hover .triangle-hint {
    border-top-color: #bfdbfe;
    transform: scale(1.05);
  }

  &.active .triangle-hint {
    border-top-color: #93c5fd;
  }
}

// 二维码覆盖层
.qr-overlay {
  position: absolute;
  top: 0;
  right: 0;
  width: 100%;
  height: 100%;
  background: rgba(30, 64, 175, 0.6);
  backdrop-filter: blur(12px) saturate(1.5);
  opacity: 0;
  visibility: hidden;
  transition: all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
  z-index: 100;
  border-radius: 20px;
  overflow: hidden;
  transform: scale(0.9);

  &::before {
    content: '';
    position: absolute;
    top: 0;
    right: 0;
    width: 100%;
    height: 100%;
    background: 
      radial-gradient(circle at 30% 70%, rgba(147, 197, 253, 0.05) 0%, transparent 50%),
      linear-gradient(135deg, rgba(255, 255, 255, 0.02) 0%, rgba(37, 106, 246, 0.02) 100%);
    border-radius: 20px;
  }

  &.show {
    opacity: 1;
    visibility: visible;
    transform: scale(1);
  }

  .qr-content {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: rgba(255, 255, 255, 0.98);
    backdrop-filter: blur(20px);
    border: 1px solid rgba(255, 255, 255, 0.8);
    border-radius: 16px;
    padding: 30px;
    box-shadow: 
      0 25px 50px -12px rgba(37, 106, 246, 0.15),
      inset 0 1px 0 rgba(255, 255, 255, 0.9);
    max-width: 320px;
    width: 90%;

    .qr-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;

      h3 {
        margin: 0;
        font-size: 20px;
        font-weight: 600;
        color: #1e40af;
      }

      .close-btn {
        background: none;
        border: none;
        font-size: 24px;
        color: #60a5fa;
        cursor: pointer;
        padding: 5px;
        line-height: 1;
        transition: all 0.3s ease;
        border-radius: 50%;

        &:hover {
          color: #3b82f6;
          background: rgba(37, 106, 246, 0.1);
        }
      }
    }

    .qr-body {
      text-align: center;

      .qr-code-container {
        .qr-image {
          width: 160px;
          height: 160px;
          border: 2px solid #dbeafe;
          border-radius: 12px;
          margin-bottom: 12px;
          box-shadow: 0 8px 25px -8px rgba(37, 106, 246, 0.1);
        }

        .qr-placeholder {
          width: 160px;
          height: 160px;
          border: 2px solid #dbeafe;
          border-radius: 12px;
          margin: 0 auto 12px;
          box-shadow: 0 8px 25px -8px rgba(37, 106, 246, 0.1);
          background: #f8fafc;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          color: #64748b;
        }

        .qr-tip {
          font-size: 14px;
          color: #1e40af;
          margin: 0;
          line-height: 1.5;
        }
      }
    }
  }
}

.license-header {
  margin-bottom: 40px;

  .logo-container {
    position: relative;
    display: inline-block;
    margin-bottom: 24px;

    .logo-glow {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 100px;
      height: 100px;
      background: radial-gradient(circle, rgba(37, 106, 246, 0.2) 0%, rgba(147, 197, 253, 0.1) 50%, transparent 70%);
      border-radius: 50%;
      animation: gentleGlow 4s ease-in-out infinite alternate;
    }
  }

  .title {
    font-size: 32px;
    font-weight: 700;
    background: linear-gradient(135deg, #1e40af 0%, #3b82f6 50%, #60a5fa 100%);
    background-clip: text;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    margin: 0 0 12px 0;
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.02);
  }

  .subtitle {
    font-size: 16px;
    color: #1e40af;
    margin: 0;
    font-weight: 400;
  }
}

@keyframes gentleGlow {
  0% { 
    transform: translate(-50%, -50%) scale(1); 
    opacity: 0.4; 
  }
  100% { 
    transform: translate(-50%, -50%) scale(1.05); 
    opacity: 0.2; 
  }
}

.license-form {
  margin-bottom: 30px;

  .input-group {
    margin-bottom: 28px;
    text-align: left;

    .input-label {
      display: flex;
      align-items: center;
      font-size: 14px;
      font-weight: 600;
      color: #1e40af;
      margin-bottom: 8px;

      .required {
        color: #dc2626;
        margin-left: 4px;
      }
    }

    .input-wrapper {
      position: relative;

      .license-input {
        width: 100%;
        padding: 16px 20px;
        border: 2px solid #dbeafe;
        border-radius: 12px;
        font-size: 16px;
        background: rgba(255, 255, 255, 0.9);
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        box-shadow: 
          inset 0 1px 2px rgba(37, 106, 246, 0.03),
          0 1px 3px rgba(37, 106, 246, 0.04);

        &:focus {
          outline: none;
          border-color: #256af6;
          background: rgba(255, 255, 255, 1);
          box-shadow: 
            inset 0 1px 2px rgba(37, 106, 246, 0.03),
            0 0 0 3px rgba(37, 106, 246, 0.1),
            0 4px 12px rgba(37, 106, 246, 0.08);
          transform: translateY(-1px);
        }

        &:disabled {
          background-color: #f1f5f9;
          cursor: not-allowed;
          opacity: 0.6;
        }
      }

      .input-focus-line {
        position: absolute;
        bottom: 0;
        left: 50%;
        width: 0;
        height: 2px;
        background: linear-gradient(90deg, #256af6, #3b82f6);
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        transform: translateX(-50%);
      }

      .license-input:focus + .input-focus-line {
        width: 100%;
      }
    }
  }

  .verify-btn {
    width: 100%;
    padding: 16px 24px;
    background: linear-gradient(135deg, #365cfd 0%, #3b82f6 100%);
    color: white;
    border: none;
    border-radius: 12px;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
    overflow: hidden;
    box-shadow: 0 4px 12px rgba(37, 106, 246, 0.25);

    .btn-text {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;

      .btn-icon {
        font-size: 18px;

      }

      &.loading {
        .spinner {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top: 2px solid white;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
      }
    }

    &::before {
      content: '';
      position: absolute;
      top: 0;
      left: -100%;
      width: 100%;
      height: 100%;
      background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.15), transparent);
      transition: left 0.5s ease;
    }

    &:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 8px 25px rgba(37, 106, 246, 0.35);
      background: linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%);
      

      &::before {
        left: 100%;
      }
    }

    &:disabled {
      opacity: 0.6;
      cursor: not-allowed;
      transform: none;
    }

    &.verifying {
      background: linear-gradient(135deg, #374151, #4b5563);
    }

    &.success {
      background: linear-gradient(135deg, #10b981, #059669);
    }
  }

  .error-message {
    margin-top: 16px;
    padding: 12px 16px;
    background: linear-gradient(135deg, #fef2f2, #fee2e2);
    border: 1px solid #fecaca;
    border-radius: 8px;
    color: #dc2626;
    font-size: 14px;
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: 500;
    box-shadow: 0 2px 8px rgba(220, 38, 38, 0.1);

    .error-icon {
      font-size: 16px;
    }
  }
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.expired-section {
  margin-top: 30px;
  padding: 24px;
  background: linear-gradient(135deg, #fef3c7, #fde68a);
  border: 1px solid #f59e0b;
  border-radius: 16px;
  box-shadow: 0 4px 12px rgba(245, 158, 11, 0.15);

  .expired-content {
    .expired-icon {
      font-size: 48px;
      margin-bottom: 16px;
    }

    .expired-title {
      font-size: 20px;
      font-weight: 700;
      color: #dc2626;
      margin: 0 0 12px 0;
    }

    .expired-desc {
      font-size: 14px;
      color: #92400e;
      margin: 0 0 20px 0;
      line-height: 1.6;
    }

    .contact-actions {
      .contact-btn {
        background: linear-gradient(135deg, #256af6, #1d4ed8);
        color: white;
        border: none;
        padding: 12px 24px;
        border-radius: 8px;
        font-weight: 600;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 8px;
        margin: 0 auto;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        box-shadow: 0 4px 12px rgba(37, 106, 246, 0.25);

        &:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(37, 106, 246, 0.35);
          background: linear-gradient(135deg, #1d4ed8, #1e40af);
        }

        i {
          font-size: 16px;
        }
      }
    }
  }
}

@media (max-width: 480px) {
  .license-container {
    padding: 24px 20px;
    margin: 10px;
  }

  .license-header .title {
    font-size: 24px;
  }

  .help-trigger {
    width: 60px;
    height: 60px;

    .triangle-hint {
      border-left-width: 60px;
      border-top-width: 60px;

      .hint-text {
        top: -48px;
        right: -48px;
        font-size: 10px;
      }
    }
  }
}
</style>
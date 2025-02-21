<template>
  <div class="register-container">
    <h2>注册</h2>
    <form @submit.prevent="handleRegister">
      <div>
        <label for="email">邮箱:</label>
        <input type="email" v-model="email" required />
      </div>
      <button type="submit">注册</button>
    </form>
  </div>
</template>

<script setup>
import { ref } from "vue";

const email = ref("");

const handleRegister = () => {
  console.log("注册请求发送", email.value);
  // 在这里添加注册逻辑，发送验证码请求
};
</script>

<style scoped>
.register-container {
  /* 添加与 Home.vue 一致的样式 */
}
</style> 
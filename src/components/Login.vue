<template>
  <div
    class="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50"
    @click.self="closeLogin"
  >
    <div class="bg-white p-8 rounded-lg shadow-lg w-full max-w-md">
      <h2 class="text-2xl font-bold mb-6 text-center">登录</h2>
      <form @submit.prevent="handleLogin" class="space-y-4">
        <input
          type="text"
          placeholder="用户名"
          v-model="username"
          required
          class="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <input
          type="password"
          placeholder="密码"
          v-model="password"
          required
          class="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="submit"
          class="w-full py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition duration-300"
        >
          登录
        </button>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref } from "vue";

const username = ref("");
const password = ref("");

const handleLogin = () => {
  // 登录逻辑
  console.log("登录中...", username.value, password.value);
};

const closeLogin = () => {
  // 关闭登录页面逻辑
  console.log("关闭登录页面");
};
</script>

<style scoped>
/* 如果需要自定义样式，可以在这里添加 */
</style> 
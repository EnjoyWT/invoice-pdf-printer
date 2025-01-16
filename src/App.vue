<template>
  <Layout>
    <template #header>
      <button
        class="text-black font-bold py-2 px-4 rounded"
        @click="handleLogin"
      >
        登录
      </button>
    </template>

    <template #body>
      <Home />
    </template>

    <template #footer>
      <p>版权所有 © 2023</p>
    </template>
  </Layout>
</template>

<script setup>
import Home from "./components/Home.vue";
import Layout from "./components/Layout.vue";

const handleLogin = () => {
  console.log("登录按钮被点击");
};
</script>

<style scoped>
</style>

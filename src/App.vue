<template>
  <Layout>
    <template #header>
      <button
        class="text-black font-bold py-2 px-4 rounded"
        @click="toggleAuthPage"
      >
        {{ showLogin ? "注册" : "登录" }}
      </button>
    </template>

    <template #body>
      <component :is="currentPage" />
    </template>

    <template #footer>
      <p>版权所有 © 2023</p>
    </template>

    <Toast message="操作成功" type="success" />
  </Layout>
</template>

<script setup>
import { ref, computed } from "vue";
import Home from "./components/Home.vue";
import Layout from "./components/Layout.vue";
import Login from "./components/Login.vue";
import Register from "./components/Register.vue";
import Toast from "./components/Toast.vue";

const showLogin = ref(false);

const toggleAuthPage = () => {
  showLogin.value = !showLogin.value;
};

const currentPage = computed(() => (showLogin.value ? Login : Home));
</script>

<style scoped>
</style>

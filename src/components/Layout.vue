<template>
  <div class="flex flex-col min-h-screen">
    <!-- Header 区域 -->
    <header
      :class="{
        'border-b border-gray-300': isScrolled,
      }"
      class="bg-white text-black py-4 flex justify-end px-4 fixed top-0 left-0 right-0 z-10 transition-all duration-300"
    >
      <slot name="header"></slot>
    </header>

    <!-- Body 区域 -->
    <main class="flex-1 overflow-auto py-2">
      <slot name="body"></slot>
    </main>

    <!-- Footer 区域 -->
    <!-- <footer class="text-center pb-2">
      <slot name="footer"></slot>
    </footer> -->
  </div>
</template>

<script>
export default {
  data() {
    return {
      isScrolled: false,
    };
  },
  mounted() {
    window.addEventListener("scroll", this.handleScroll);
  },
  beforeDestroy() {
    window.removeEventListener("scroll", this.handleScroll);
  },
  methods: {
    handleScroll() {
      this.isScrolled = window.scrollY > 0;
    },
  },
};
</script>

<style scoped>
header,
footer {
  width: 100%;
}

header {
  transition: border-bottom 0.2s ease;
}

/* footer {
  background: linear-gradient(to right, #374151, #1f2937);
} */
</style> 
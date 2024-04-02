<template>
  <div class="flex flex-col space-y-2">
    <LeftCell class="rounded-large bg-gray-50" />
  </div>
</template>

<script setup>
import LeftCell from "./LeftCell.vue";
defineProps({
  name: String,
});
</script>

<style></style>

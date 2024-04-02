<template>
  <div>
    <div>{{ type }}</div>
    <div>{{ companyName }}</div>
    <div>{{ date }}</div>
    <div>{{ moneyNum }}</div>
  </div>
</template>

<script setup>
defineProps({
  date: {
    type: String,
    default: "",
  },
  type: {
    type: String,
    default: "发票类型",
  },
  moneyNum: {
    type: Number,
    default: 0.0,
  },
  companyName: {
    type: Number,
    default: 0.0,
  },
});
</script>

<style></style>

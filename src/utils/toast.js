import { ref } from "vue";

const visible = ref(false);
const message = ref("");

const showToast = (msg) => {
  message.value = msg;
  visible.value = true;
  setTimeout(() => {
    visible.value = false;
  }, 3000);
};

export { showToast, visible, message };

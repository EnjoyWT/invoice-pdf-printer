import { createApp } from "vue";
import App from "./App.vue";
import "./style.css";

// 启动 PDF 预加载（尽早执行）
import { startPreload } from "./utils/pdfPreload";
startPreload();

createApp(App).mount("#app");

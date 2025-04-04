import { createApp } from 'vue'
import App from './App.vue'
import naive from 'naive-ui'
// 通用字体
import 'vfonts/Lato.css'
import './assets/css/scrollbarGlobal.css'

const app = createApp(App);

app.use(naive);

app.mount('#app');

import { createApp } from 'vue'
import App from './App.vue'
import Antd, { message } from 'ant-design-vue'
import './assets/css/scrollbarGlobal.css'

const app = createApp(App);

app.use(Antd);
app.provide('message', message);

app.mount('#app');

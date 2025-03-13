import { createApp } from 'vue'
import App from './App.vue'
import  Antd,{ Button, message, Menu } from 'ant-design-vue'


const app = createApp(App);

app.use(Antd);
app.use(Button);
app.use(Menu);
app.provide('message', message);

app.mount('#app').$nextTick(() => {
  // Use contextBridge
  window.ipcRenderer.on('main-process-message', (_event, message) => {
    console.log(message)
  })
})

import { createApp } from 'vue'
import App from './App.vue'
import  Antd,{ Button, message } from 'ant-design-vue'


const app = createApp(App);

app.use(Antd);
app.use(Button);
app.provide('message', message);

app.mount('#app').$nextTick(() => {
  // Use contextBridge
  window.ipcRenderer.on('main-process-message', (_event, message) => {
    console.log(message)
  })
})

import { createApp } from 'vue'
import App from './App.vue'
import Antd, { Empty, message } from 'ant-design-vue'
import './assets/css/scrollbarGlobal.css'

// Vuetify
import 'vuetify/styles'
import '@mdi/font/css/materialdesignicons.css'
import vuetify from './plugins/vuetify'

const app = createApp(App);

app.use(Antd);
app.use(Empty);
app.use(vuetify);
app.provide('message', message);

app.mount('#app').$nextTick(() => {
  // Use contextBridge
  window.ipcRenderer.on('main-process-message', (_event, message) => {
    console.log(message)
  })
})

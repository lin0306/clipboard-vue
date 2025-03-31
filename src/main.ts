import { createApp } from 'vue'
import App from './App.vue'
import Settings from './components/Settings.vue'
import TagManager from './components/TagManager.vue'
import Update from './components/Update.vue'
import About from './components/About.vue'
import Restore from './components/Restore.vue'
import Antd, { message } from 'ant-design-vue'
import './assets/css/scrollbarGlobal.css'

const app = createApp(App);

app.use(Antd);
app.provide('message', message);

const windowType = window.location.hash.slice(1);
if (windowType === 'settings') {
  app.component('App', Settings)
} else if (windowType === 'tagManager') {
  app.component('App', TagManager)
} else if (windowType === 'update') {
  app.component('App', Update)
} else if (windowType === 'about') {
  app.component('App', About)
} else if (windowType === 'restore') {
  app.component('App', Restore)
} else {
  app.component('App', App)
}

app.mount('#app');

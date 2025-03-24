<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { ConfigProvider } from 'ant-design-vue';
import { theme } from 'ant-design-vue';

import { createThemeContext } from './configs/ThemeConfig';
import { createLanguageContext } from './configs/LanguageConfig.ts';

import ClipboardList from './components/ClipboardList.vue'
import Settings from './components/Settings.vue'
import TagManager from './components/TagManager.vue'

// 创建主题上下文
const { currentTheme } = createThemeContext();
const { currentLanguage } = createLanguageContext();

// 计算Ant Design Vue的主题配置
const antdTheme = computed(() => {
  const isDark = currentTheme.value.id === 'dark';
  return {
    token: {
      colorPrimary: currentTheme.value.colors.primary,
      colorBgBase: currentTheme.value.colors.background,
      colorTextBase: currentTheme.value.colors.text,
      borderRadius: 4,
    },
    algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm,
  };
});

const locale = computed(() => currentLanguage.value.locale);

// 窗口组件 map<key:组件唯一标识, value:窗口组件>
const componentMap: any = {
  list: ClipboardList,
  settings: Settings,
  tags: TagManager,
};

// 当前打开的窗口组件
const windowType = ref('list');

// 当前显示的组件
const currentComponent = computed(() => {
  return componentMap[windowType.value];
});

// 监听来自主进程的窗口类型消息
onMounted(() => {
  console.log("渲染进程启动");
  // 监听主进程发送的窗口类型
  window.ipcRenderer.on('window-type', (_event, type: string) => {
    console.log("从主进程获取窗口类型", type);
    if (componentMap[type]) {
      windowType.value = type;
    }
  });
});
</script>

<template>
  <ConfigProvider :theme="antdTheme" :locale="locale">
    <component :is="currentComponent" />
  </ConfigProvider>
</template>

<style>
/* 全局样式 */
body {
  margin: 0;
  padding: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  background-color: var(--theme-background);
  color: var(--theme-text);
  transition: background-color 0.3s, color 0.3s;
}
</style>
<script setup lang="ts">
import ClipboardList from './components/ClipboardList.vue'
import { createThemeContext } from './themes/ThemeContext';
import { computed } from 'vue';
import { ConfigProvider } from 'ant-design-vue';
import { theme } from 'ant-design-vue';

// 创建主题上下文
const { currentTheme } = createThemeContext();

// 计算Ant Design Vue的主题配置
const antdTheme = computed(() => {
  console.log('app.vue currentTheme', currentTheme)
  const isDark = currentTheme.id === 'dark';
  return {
    token: {
      colorPrimary: currentTheme.colors.primary,
      colorSuccess: currentTheme.colors.secondary,
      colorBgBase: currentTheme.colors.background,
      colorTextBase: currentTheme.colors.text,
      borderRadius: 4,
    },
    algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm,
  };
});
</script>

<template>
  <ConfigProvider :theme="antdTheme">
    <ClipboardList />
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

<script setup lang="ts">
import ClipboardList from './components/ClipboardList.vue'
import { createThemeContext } from './theme/ThemeContext';
import { computed } from 'vue';
import { ConfigProvider } from 'ant-design-vue';
import { theme } from 'ant-design-vue';

// 创建主题上下文
const { currentTheme, setTheme } = createThemeContext();

// 计算Ant Design Vue的主题配置
const antdTheme = computed(() => {
  const isDark = currentTheme.value.id === 'dark';
  return {
    token: {
      colorPrimary: currentTheme.value.colors.primary,
      colorSuccess: currentTheme.value.colors.secondary,
      colorBgBase: currentTheme.value.colors.background,
      colorTextBase: currentTheme.value.colors.text,
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

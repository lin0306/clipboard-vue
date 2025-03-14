import { ref, computed, provide, inject, InjectionKey } from 'vue';
import { ThemeConfig, lightTheme, themes } from './index';

// 创建注入键
export const ThemeKey = Symbol('theme') as InjectionKey<{
  currentTheme: ThemeConfig;
  setTheme: (themeId: string) => void;
  themeColors: any;
}>;

// 创建主题上下文
export function createThemeContext() {
  // 从本地存储获取主题ID，如果没有则使用默认主题
  const savedThemeId = localStorage.getItem('theme-id') || 'light';
  const currentThemeRef = ref<ThemeConfig>(themes.find(t => t.id === savedThemeId) || lightTheme);

  // 计算当前主题的颜色
  const themeColors = computed(() => currentThemeRef.value.colors);

  // 设置主题的方法
  const setTheme = (themeId: string) => {
    const theme = themes.find(t => t.id === themeId);
    if (theme) {
      currentThemeRef.value = theme;
      localStorage.setItem('theme-id', themeId);
      // 应用CSS变量
      applyThemeColors(theme.colors);
    }
  };

  // 应用主题颜色到CSS变量
  const applyThemeColors = (colors: any) => {
    const root = document.documentElement;
    Object.entries(colors).forEach(([key, value]) => {
      root.style.setProperty(`--theme-${key}`, value as string);
    });
  };

  // 初始化时应用主题
  applyThemeColors(currentThemeRef.value.colors);

  // 提供主题上下文
  provide(ThemeKey, {
    currentTheme: currentThemeRef,
    setTheme,
    themeColors,
  });

  return {
    currentTheme: currentThemeRef,
    setTheme,
    themeColors,
  };
}

// 使用主题上下文的钩子
export function useTheme() {
  const theme = inject(ThemeKey);
  if (!theme) {
    throw new Error('useTheme() must be used within a ThemeProvider');
  }
  return theme;
}
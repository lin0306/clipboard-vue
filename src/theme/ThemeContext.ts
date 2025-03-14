import { computed, provide, inject, InjectionKey } from 'vue';
import { ThemeConfig, lightTheme, themes } from './ThemeConfig';

// 创建注入键
export const ThemeKey = Symbol('theme') as InjectionKey<{
  currentTheme: ThemeConfig;
  setTheme: (themeId: string) => void;
  themeColors: any;
}>;

// 存储从主进程接收到的主题ID
let themeFromConfig: string | null = null;

// 监听主题更新
window.ipcRenderer.on('change-theme', (_event, theme) => {
  console.log('[渲染进程] 接收项目初始化主题颜色:', theme);
  themeFromConfig = theme;
  
  // 如果主题上下文已创建，则更新主题
  if (globalThemeContext) {
    globalThemeContext.setTheme(theme);
  }
});

// 全局主题上下文引用
let globalThemeContext: ReturnType<typeof createThemeContext> | null = null;

// 创建主题上下文
export function createThemeContext() {
  // 优先使用配置文件中的主题，其次使用本地存储的主题，最后使用默认主题
  const localStorageThemeId = localStorage.getItem('theme-id');
  const savedThemeId = themeFromConfig || localStorageThemeId || 'light';
  const currentThemeRef = themes.find(t => t.id === savedThemeId) || lightTheme;

  // 计算当前主题的颜色
  const themeColors = computed(() => currentThemeRef.value.colors);

  // 设置主题的方法
  const setTheme = (themeId: string) => {
    console.log('[主题切换] 切换的主题id', themeId);
    const theme = themes.find(t => t.id === themeId);
    window.ipcRenderer.invoke('update-theme', themeId)
    console.log('[主题切换] 切换的主题：', theme)
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

  // 保存全局引用，以便IPC消息可以更新主题
  globalThemeContext = {
    currentTheme: currentThemeRef,
    setTheme,
    themeColors,
  };

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
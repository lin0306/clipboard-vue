import { provide, inject, InjectionKey, ref, reactive } from 'vue';

// 主题配置文件
export interface ThemeConfig {
  [x: string]: any;
  id: string;
  name: string;
  colors: ThemeConfigColors;
}

export interface ThemeConfigColors {
  primary: string;
  secondary: string;
  background: string;
  text: string;
  border: string;
  titleBarBackground: string;
  titleBarIconColor: string;
  navBackground: string;
  cardBackground: string;
  hoverBackground: string;
  divider: string;
  tagColor: string;
  scrollBarColor: string;
  scrollBarColorHover: string;
}

// 默认主题 - 灰阶色调
export const lightTheme: ThemeConfig = {
  id: 'light',
  name: '浅色主题',
  colors: {
    primary: 'rgba(90,90,90,1)',
    secondary: 'rgba(130,130,130,1)',
    background: 'rgba(255,255,255,1)',
    text: 'rgba(51,51,51,1)',
    border: 'rgba(5, 5, 5, 0.06)',
    titleBarBackground: 'rgba(220, 220, 220, 0.1)',
    titleBarIconColor: '#333333',
    navBackground: 'rgba(248,248,248,1)',
    cardBackground: 'rgba(255,255,255,1)',
    hoverBackground: 'rgba(240,240,240,1)',
    divider: 'rgba(230,230,230,1)',
    tagColor: 'rgba(90,90,90,0.3)',
    scrollBarColor: 'rgba(144, 147, 153, 0.3)',
    scrollBarColorHover: 'rgba(144, 147, 153, 0.5)',
  },
};

// 深色主题 - 灰阶色调
export const darkTheme: ThemeConfig = {
  id: 'dark',
  name: '深色主题',
  colors: {
    primary: 'rgba(160,160,160,1)',
    secondary: 'rgba(120,120,120,1)',
    background: 'rgba(20,20,20,1)',
    text: 'rgba(230,230,230,1)',
    border: 'rgba(253, 253, 253, 0.12)',
    titleBarBackground: 'rgba(40, 40, 40, 0.1)',
    titleBarIconColor: '#ffffff',
    navBackground: 'rgba(28,28,28,1)',
    cardBackground: 'rgba(35,35,35,1)',
    hoverBackground: 'rgba(45,45,45,1)',
    divider: 'rgba(55,55,55,1)',
    tagColor: 'rgba(160,160,160,0.2)',
    scrollBarColor: 'rgba(255, 255, 255, 0.3)',
    scrollBarColorHover: 'rgba(144, 147, 153, 0.5)',
  },
};

// 蓝色主题 - 更自然的蓝色调
export const blueTheme: ThemeConfig = {
  id: 'blue',
  name: '蓝色主题',
  colors: {
    primary: 'rgba(41,98,255,1)',
    secondary: 'rgba(72,166,184,1)',
    background: 'rgba(240,248,255,1)',
    text: 'rgba(24,51,93,1)',
    border: 'rgba(41, 98, 255, 0.1)',
    titleBarBackground: 'rgba(210, 230, 250, 0.1)',
    titleBarIconColor: '#4B89DC',
    navBackground: 'rgba(245,250,255,1)',
    cardBackground: 'rgba(255,255,255,1)',
    hoverBackground: 'rgba(230,240,250,1)',
    divider: 'rgba(200,220,240,1)',
    tagColor: 'rgba(41,98,255,0.36)',
    scrollBarColor: 'rgba(127, 148, 192, 0.54)',
    scrollBarColorHover: 'rgba(49, 61, 84, 0.5)',
  },
};

// 粉色主题 - 更自然的粉色调
export const pinkTheme: ThemeConfig = {
  id: 'pink',
  name: '粉色主题',
  colors: {
    primary: 'rgba(219,112,147,1)',
    secondary: 'rgba(155,89,182,1)',
    background: 'rgba(253,245,250,1)',
    text: 'rgba(153,51,102,1)',
    border: 'rgba(219, 112, 147, 0.1)',
    titleBarBackground: 'rgba(245, 225, 235, 0.1)',
    titleBarIconColor: '#E6A5C4',
    navBackground: 'rgba(252,242,248,1)',
    cardBackground: 'rgba(255,255,255,1)',
    hoverBackground: 'rgba(248,230,240,1)',
    divider: 'rgba(240,210,225,1)',
    tagColor: 'rgba(219,112,147,0.5)',
    scrollBarColor: 'rgba(214, 157, 206, 0.38)',
    scrollBarColorHover: 'rgba(153, 100, 140, 0.5)',
  },
};

// 所有可用主题
export const themes: ThemeConfig[] = [
  lightTheme,
  darkTheme,
  blueTheme,
  pinkTheme,
];

// 获取主题
export function getThemeById(id: string): ThemeConfig {
  return themes.find(theme => theme.id === id) || lightTheme;
}

// 主题上下文配置

// 创建注入键
export const ThemeKey = Symbol('theme') as InjectionKey<{
  currentTheme: any;
  setTheme: (themeId: string) => void;
  themeColors: any;
}>;

// 全局主题上下文引用
let globalThemeContext: ReturnType<typeof createThemeContext> | null = null;

let currentThemeId = '';

// 主题初始化，由于createThemeContext执行早于ipc通信，所以这里需要重新设置主题
window.ipcRenderer.on('init-themes', (_event, theme) => {
  console.log('[渲染进程] 接收项目初始化主题颜色:', theme);
  if(currentThemeId === theme) {
    console.log('[渲染进程] 主题id相同，不更新主题')
    return;
  }
  // 如果主题上下文已创建，则更新主题
  if (globalThemeContext) {
    globalThemeContext.setTheme(theme);
  }
});


// 创建主题上下文
export function createThemeContext() {
  console.log('[渲染进程] 初始化主题上下文')
  // 优先使用配置文件中的主题，其次使用本地存储的主题，最后使用默认主题
  const localStorageThemeId = localStorage.getItem('themes-id');
  const savedThemeId = localStorageThemeId || 'light';
  currentThemeId = savedThemeId;
  // 使用ref使currentThemeItem成为响应式引用
  const currentThemeItem = ref<ThemeConfig>(themes.find(t => t.id === savedThemeId) || lightTheme);
  console.log('[渲染进程] 初始化主题上下文，当前的主题：', currentThemeItem.value)

  // 创建一个新的颜色对象，避免数据被覆盖，使用reactive使其成为响应式对象
  const themeColors = reactive({ ...currentThemeItem.value.colors });

  // 设置主题的方法
  const setTheme = (themeId: string) => {
    console.log('[主题切换] 切换的主题id', themeId);
    const theme = themes.find(t => t.id === themeId);
    // 发送IPC消息，通知主题更新了，需要更新配置文件
    window.ipcRenderer.invoke('update-themes', themeId)
    console.log('[主题切换] 切换的主题：', theme)
    if (theme) {
      // 创建一个新的主题对象，确保响应式更新
      const newTheme = { ...theme };
      // 更新响应式引用
      currentThemeItem.value = newTheme;
      localStorage.setItem('themes-id', themeId);
      // 应用CSS变量
      applyThemeColors(newTheme.colors);

      // 更新响应式themeColors对象 - 使用Object.assign替换整个对象以确保响应式更新
      Object.assign(themeColors, theme.colors);

    }
  };

  // 应用主题颜色到CSS变量
  const applyThemeColors = (colors: ThemeConfigColors) => {
    console.log('[渲染进程] 应用主题颜色到CSS变量')
    const root = document.documentElement;
    Object.entries(colors).forEach(([key, value]) => {
      root.style.setProperty(`--theme-${key}`, value as string);
    });
  };

  // 初始化时应用主题
  applyThemeColors(currentThemeItem.value.colors);

  // 提供主题上下文
  provide(ThemeKey, {
    currentTheme: currentThemeItem,
    setTheme,
    themeColors,
  });

  // 保存全局引用，以便IPC消息可以更新主题
  globalThemeContext = {
    currentTheme: currentThemeItem,
    setTheme,
    themeColors,
  };

  return {
    currentTheme: currentThemeItem,
    setTheme,
    themeColors,
  };
}

// 使用主题上下文的钩子
export function useTheme() {
  const theme = inject(ThemeKey);
  if (!theme) {
    console.warn('useTheme() 在ThemeProvider外部被调用，返回默认主题');
    // 返回基于lightTheme的默认主题对象
    const defaultThemeItem = ref<ThemeConfig>(lightTheme);
    const defaultThemeColors = reactive({ ...lightTheme.colors });

    // 创建一个默认的setTheme函数，它会在控制台输出警告但不执行任何操作
    const defaultSetTheme = (_themeId: string) => {
      console.warn('在ThemeProvider外部调用setTheme无效');
    };

    return {
      currentTheme: defaultThemeItem,
      setTheme: defaultSetTheme,
      themeColors: defaultThemeColors,
    };
  }
  return theme;
}
// 主题配置文件

export interface ThemeConfig {
[x: string]: any;
  id: string;
  name: string;
  colors: {
    primary: string;
    secondary: string;
    background: string;
    text: string;
    border: string;
    navBackground: string;
    cardBackground: string;
    hoverBackground: string;
    divider: string;
  };
}

// 默认主题
export const lightTheme: ThemeConfig = {
  id: 'light',
  name: '浅色主题',
  colors: {
    primary: '#1890ff',
    secondary: '#52c41a',
    background: '#ffffff',
    text: '#333333',
    border: 'rgba(5, 5, 5, 0.06)',
    navBackground: '#ffffff',
    cardBackground: '#ffffff',
    hoverBackground: '#f5f5f5',
    divider: '#f0f0f0',
  },
};

// 深色主题
export const darkTheme: ThemeConfig = {
  id: 'dark',
  name: '深色主题',
  colors: {
    primary: '#177ddc',
    secondary: '#49aa19',
    background: '#141414',
    text: '#f0f0f0',
    border: 'rgba(253, 253, 253, 0.12)',
    navBackground: '#1f1f1f',
    cardBackground: '#1f1f1f',
    hoverBackground: '#2a2a2a',
    divider: '#303030',
  },
};

// 蓝色主题
export const blueTheme: ThemeConfig = {
  id: 'blue',
  name: '蓝色主题',
  colors: {
    primary: '#0050b3',
    secondary: '#36cfc9',
    background: '#e6f7ff',
    text: '#003a8c',
    border: 'rgba(0, 80, 179, 0.1)',
    navBackground: '#f0f5ff',
    cardBackground: '#ffffff',
    hoverBackground: '#d6e4ff',
    divider: '#adc6ff',
  },
};

// 粉色主题
export const pinkTheme: ThemeConfig = {
  id: 'pink',
  name: '粉色主题',
  colors: {
    primary: '#eb2f96',
    secondary: '#722ed1',
    background: '#fff0f6',
    text: '#c41d7f',
    border: 'rgba(235, 47, 150, 0.1)',
    navBackground: '#fff0f6',
    cardBackground: '#ffffff',
    hoverBackground: '#ffd6e7',
    divider: '#ffadd2',
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
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
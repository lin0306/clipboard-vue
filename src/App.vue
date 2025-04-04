<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { GlobalThemeOverrides, NConfigProvider, NMessageProvider } from 'naive-ui';

import { createThemeContext } from './configs/ThemeConfig';
import { createLanguageContext } from './configs/LanguageConfig.ts';

import ClipboardList from './components/ClipboardList.vue'
import Settings from './components/Settings.vue'
import TagManager from './components/TagManager.vue'
import About from './components/About.vue'
import Update from './components/Update.vue'
import Restore from './components/Restore.vue'

// 创建主题上下文
const { themeColors } = createThemeContext();
const { currentLanguage } = createLanguageContext();

const theme = computed(() => {
  return {
    common: {
      primaryColor: themeColors.primary,
      primaryColorHover: themeColors.primary,
      primaryColorPressed: themeColors.primary,
    },
    Button: {
      textColor: themeColors.text,
      textColorDisabled: `${themeColors.text}80`,
    },
    Input: {
      color: themeColors.cardBackground,
      colorFocus: themeColors.cardBackground,
      colorHover: themeColors.primary,
      colorDisabled: themeColors.cardBackground,
      borderHover: themeColors.primary,
      borderFocus: themeColors.primary,
      borderDisabled: themeColors.border,
      textColor: themeColors.text,
      textColorDisabled: `${themeColors.text}80`,
      placeholderColor: `${themeColors.text}80`,
      placeholderColorDisabled: `${themeColors.text}50`
    },
    Tag: {
      colorBordered: themeColors.tagColor, // 背景色
      textColor: themeColors.tagTextColor, // 文字颜色
      border: `0px solid ${themeColors.primary}`, // 边框
      fontWeightStrong: 400 // 字体粗细
    },
    Select: {
      color: themeColors.cardBackground,
      colorActive: themeColors.cardBackground,
      colorDisabled: `${themeColors.cardBackground}80`,
      textColor: themeColors.text,
      textColorDisabled: `${themeColors.text}80`,
      placeholderColor: `${themeColors.text}80`,
      placeholderColorDisabled: `${themeColors.text}50`,
      border: themeColors.border,
      borderHover: themeColors.primary,
      borderActive: themeColors.primary,
      borderFocus: themeColors.primary,
      borderDisabled: themeColors.border,
      boxShadowFocus: `0 0 0 2px ${themeColors.primary}20`,
      menuColor: themeColors.cardBackground,
      menuBoxShadow: '0 3px 6px -4px rgba(0, 0, 0, .12), 0 6px 16px 0 rgba(0, 0, 0, .08), 0 9px 28px 8px rgba(0, 0, 0, .05)',
      menuDividerColor: themeColors.divider,
      menuHeight: '200px',
      menuBorderRadius: '4px',
      menuBoxShadowPopoverInner: '0 3px 6px -4px rgba(0, 0, 0, .12), 0 6px 16px 0 rgba(0, 0, 0, .08), 0 9px 28px 8px rgba(0, 0, 0, .05)',
      optionHeight: '36px',
      optionFontSize: '14px',
      optionColor: themeColors.cardBackground,
      optionColorPressed: themeColors.cardBackground,
      optionColorActive: `${themeColors.primary}20`,
      optionColorHover: `${themeColors.primary}10`,
      optionTextColor: themeColors.text,
      optionTextColorPressed: themeColors.primary,
      optionTextColorDisabled: `${themeColors.text}40`,
      optionTextColorActive: themeColors.primary,
      optionTextColorHover: themeColors.primary,
      optionOpacityDisabled: '0.6',
      loadingColor: themeColors.primary,
      peers: {
        InternalSelection: {
          textColor: themeColors.text,
          textColorDisabled: `${themeColors.text}80`,
          color: themeColors.cardBackground,
          colorActive: themeColors.cardBackground,
          colorDisabled: `${themeColors.cardBackground}80`,
          borderHover: themeColors.primary,
          borderActive: themeColors.primary,
          borderFocus: themeColors.primary,
          borderDisabled: themeColors.border,
          caretColor: themeColors.primary,
          placeholderColor: `${themeColors.text}80`,
          placeholderColorDisabled: `${themeColors.text}50`,
          boxShadowFocus: `0 0 0 2px ${themeColors.primary}20`
        },
        InternalSelectMenu: {
          color: themeColors.background,
          optionTextColor: themeColors.text, // 未选中状态下的文字颜色
          optionTextColorActive: themeColors.text, // 选中状态下的文字颜色
          optionOpacityDisabled: '0.6',
          optionColorPending: themeColors.hoverBackground, // 悬浮再未选中的选项上的背景色
          optionColorActive: themeColors.secondary, // 选中的选项背景色
          optionColorActivePending: themeColors.secondary, // 悬浮在选中的选项上的背景色
        }
      }
    },
    Menu: {
      color: themeColors.menuItemBackground,
      itemColorHover: themeColors.menuItemHover,
      itemTextColor: themeColors.menuItemTextColor,
      itemTextColorActive: themeColors.menuItemTextActive,
      itemTextColorHover: themeColors.menuItemTextHover,

    },
    Switch: {
      railColor: themeColors.switchRailColor,
      railColorActive: themeColors.switchRailColorActive,
      buttonColor: themeColors.switchButtonColor,
    },
    Dialog: {
      titleTextColor: themeColors.dialogTitleTextColor,
      textColor: themeColors.dialogTextColor,
      color: themeColors.dialogColor,
      iconColor: themeColors.dialogIconColor,
      closeIconColor: themeColors.dialogCloseIconColor,
      closeIconColorHover: themeColors.dialogCloseIconColorHover,
      closeColorHover: themeColors.dialogCloseColorHover,
    },
  } as GlobalThemeOverrides;
});

// 计算 Naive UI 的语言配置
const locale = computed(() => {
  return currentLanguage.value.locale;
});

// 计算 Naive UI 的语言配置
const dateLocale = computed(() => {
  return currentLanguage.value.dateLocale;
});

// 窗口组件 map<key:组件唯一标识, value:窗口组件>
const componentMap: any = {
  list: ClipboardList,
  settings: Settings,
  tags: TagManager,
  about: About,
  update: Update,
  restore: Restore,
};

// 当前打开的窗口组件
const windowType = ref('');

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
  <NConfigProvider :theme-overrides="theme" :locale="locale" :date-locale="dateLocale">
    <NMessageProvider>  
      <component :is="currentComponent" />
    </NMessageProvider>
  </NConfigProvider>
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
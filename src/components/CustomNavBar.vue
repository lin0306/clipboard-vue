<template>
  <nav class="custom-navbar">
    <ul class="navbar-menu">
      <li v-for="item in menuItems" :key="item.key" class="navbar-item" :class="{ 'has-submenu': item.children }">
        <a @click="handleMenuClick(item)" class="navbar-link" :class="{ 'active': selectedKey === item.key }">
          {{ item.label }}
        </a>
        <div v-if="item.children && openSubmenu === item.key" class="submenu">
          <ul>
            <template v-for="(subItem, _index) in item.children" :key="subItem.key || index">
              <li v-if="subItem.type !== 'divider'" class="submenu-item">
                <a @click="handleSubMenuClick(subItem)" class="submenu-link">
                  <HookIcon v-if="subItem.isCurrentTheme" :color="themeColors.primary" class="check-icon" />
                  {{ subItem.label }}
                </a>
              </li>
              <li v-else class="divider"></li>
            </template>
          </ul>
        </div>
      </li>
    </ul>
  </nav>
</template>

<script setup lang="ts">
import { ref, defineProps, onMounted, onUnmounted, computed } from 'vue'
import HookIcon from '../assets/HookIcon.vue';
import { useTheme } from '../theme/ThemeContext';

interface MenuItem {
  key: string;
  label: string;
  children?: MenuItem[];
  type?: string;
  onClick?: () => void; // 添加可选的onClick方法
  isCurrentTheme?: boolean; // 修改为布尔值类型，因为computed返回的是布尔值
}

defineProps<{
  menuItems: MenuItem[];
  selectedKey?: string | null;
}>();

const openSubmenu = ref<string | null>(null);

// 获取主题颜色
const { themeColors } = useTheme();

// 处理主菜单点击
function handleMenuClick(item: MenuItem) {
  if (item.children && item.children.length > 0) {
    // 如果已经打开，则关闭；否则打开
    openSubmenu.value = openSubmenu.value === item.key ? null : item.key;
  } else {
    // 如果存在onClike方法，则调用
    if (item.onClick) {
      item.onClick();
    }
    openSubmenu.value = null;
  }
}

// 处理子菜单点击
function handleSubMenuClick(item: MenuItem) {
  // 如果存在onClike方法，则调用
  if (item.onClick) {
    item.onClick();
  }
  openSubmenu.value = null;
}

// 点击外部关闭子菜单
function handleClickOutside(event: MouseEvent) {
  const target = event.target as HTMLElement;
  if (!target.closest('.navbar-item.has-submenu')) {
    openSubmenu.value = null;
  }
}

// 添加和移除点击外部的事件监听
onMounted(() => {
  document.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
});
</script>

<style scoped>
.custom-navbar {
  position: fixed;
  top: 25px;
  width: 100%;
  z-index: 1000;
  background-color: var(--theme-navBackground);
  border-bottom: 1px solid var(--theme-border);
}

.navbar-menu {
  display: flex;
  list-style: none;
  margin: 0;
  padding: 0;
  height: 30px;
  line-height: 30px;
  font-size: 12px;
}

.navbar-item {
  position: relative;
  display: inline-block;
  padding: 0 4px;
  cursor: pointer;
}

.navbar-link {
  display: block;
  color: var(--theme-text);
  text-decoration: none;
  transition: color 0.3s;
}

.navbar-link:hover {
  color: var(--theme-primary);
}

.navbar-link.active {
  color: var(--theme-primary);
}

.submenu {
  position: absolute;
  top: 100%;
  left: 0;
  min-width: 80px;
  max-height: calc(100vh - 100px);
  background-color: var(--theme-cardBackground);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  border-radius: 4px;
  overflow: hidden;
  z-index: 1050;
}

.submenu ul {
  list-style: none;
  margin: 0;
  padding: 0;
}

.submenu-item {
  padding: 0;
  margin: 0;
}

.check-icon {
  width: 14px;
  height: 14px;
  margin-right: 5px;
  display: inline-block;
  vertical-align: middle;
}

.submenu-link {
  display: flex;
  align-items: center;
  padding: 0 12px;
  color: var(--theme-text);
  text-decoration: none;
  transition: background-color 0.3s;
}

.submenu-link:hover {
  background-color: var(--theme-hoverBackground);
}

.divider {
  height: 1px;
  margin: 4px 0;
  background-color: var(--theme-divider);
}
</style>
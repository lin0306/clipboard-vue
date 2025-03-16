<script setup lang="ts">
import { inject, ref, onMounted, onUnmounted, computed, reactive } from 'vue'
import TitleBar from './TitleBar.vue';
import CustomNavBar from './CustomNavBar.vue';
import { useTheme } from '../themes/ThemeContext';
import { themes } from '../themes/ThemeConfig';
import { NavBarItem } from "../types/menus/NavBarItem.ts";
import TopIcon from '../assets/icon/TopIcon.vue';
import UntopIcon from '../assets/icon/UntopIcon.vue';
import TrashIcon from '../assets/icon/TrashIcon.vue';
import MoreIcon from '../assets/icon/MoreIcon.vue';
import DragIcon from '../assets/icon/DragIcon.vue';
import convertType from '../utils/convert.ts';

const msg: any = inject('message')

// 获取主题上下文
const { currentTheme, setTheme, themeColors } = useTheme();

// 将MenuItems改为计算属性，这样当currentTheme变化时会自动更新
const MenuItems = computed((): NavBarItem[] => [
  {
    key: '程序',
    label: '程序',
    children: [
      {
        key: '偏好设置',
        label: '偏好设置',
        onClick: () => {
          msg.success('打开偏好设置');
        }
      },
      {
        key: '调试工具',
        label: '调试工具',
        onClick: () => {
          msg.success('打开调试工具');
        }
      },
      {
        key: '重新加载',
        label: '重新加载',
        onClick: () => {
          msg.success('重新加载');
        }
      },
      {
        type: 'divider',
      },
      {
        key: '关闭',
        label: '关闭',
        onClick: () => {
          msg.success('关闭');
        }
      },
    ],
  },
  {
    key: '数据',
    label: '数据',
    children: [
      {
        key: '标签管理',
        label: '标签管理',
      },
      {
        key: '数据视图',
        label: '数据视图',
      },
      {
        type: 'divider',
      },
      {
        key: '数据导入',
        label: '数据导入',
      },
      {
        key: '数据导出',
        label: '数据导出',
      },
    ],
  },
  {
    key: '查找',
    label: '查找',
  },
  {
    key: '清空剪贴板',
    label: '清空剪贴板',
    onClick: () => {
      // 清空历史记录
      try {
        window.ipcRenderer.invoke('clear-items')
        itemList.value = []
        msg.success('清空历史记录成功')
      } catch (error) {
        msg.error('清空历史记录失败')
      }
    },
  },
  {
    key: '主题',
    label: '主题',
    children: themes.map(theme => ({
      key: `theme-${theme.id}`,
      label: theme.name,
      type: 'theme',
      onClick: () => {
        console.log('切换主题:', theme);
        setTheme(theme.id);
      },
      // 使用函数返回值，确保每次访问时都重新计算
      get isCurrentTheme() {
        return currentTheme.value.id === theme.id;
      }
    })),
  },
  {
    key: '帮助',
    label: '帮助',
    children: [
      {
        key: '使用说明',
        label: '使用说明',
      },
      {
        key: '更新日志',
        label: '更新日志',
      },
      {
        key: '检查更新',
        label: '检查更新',
      },
      {
        key: '关于',
        label: '关于',
      },
    ],
  },
]);

// 剪贴板历史记录
const itemList = ref<any[]>([])
let listLoading = ref(false)
let searchText = ''
let selectedTagId: any = undefined

// 下拉菜单状态
const dropdownState = reactive({
  visible: false,
  currentItemId: -1
});

// 显示/隐藏下拉菜单
function toggleDropdown(id: number) {
  if (dropdownState.currentItemId === id && dropdownState.visible) {
    dropdownState.visible = false;
  } else {
    dropdownState.visible = true;
    dropdownState.currentItemId = id;
  }
}

// 绑定标签
async function bindTag(id: number) {
  msg.info('绑定标签功能待实现', id);
  dropdownState.visible = false;
}

/**
 * 根据搜索文本过滤剪贴板列表
 * @param {string} searchText - 搜索关键词
 */
async function filterClipboardItems() {
  listLoading = ref(true);
  try {
    // 搜索框为空时，根据标签显示项目
    const items = await window.ipcRenderer.invoke('search-items', searchText, selectedTagId);
    console.log(items);
    itemList.value = items;
  } finally {
    // setTimeout(() => {
    listLoading = ref(false);
    // }, 1000);
  }
}

/**
 * 剪贴板内容置顶
 * @param {number} id - 内容id 
 */
async function onTop(id: number) {
  await window.ipcRenderer.invoke('top-item', id);
  filterClipboardItems();
}

/**
 * 取消剪贴板内容置顶
 * @param {number} id - 内容id
 */
async function onUntop(id: number) {
  await window.ipcRenderer.invoke('untop-item', id);
  filterClipboardItems();
}

/**
 * 删除剪贴板内容
 * @param {number} id - 内容id
 */
async function removeItem(id: number) {
  await window.ipcRenderer.invoke('remove-item', id);
  filterClipboardItems();
}

// 监听剪贴板更新
window.ipcRenderer.on('clipboard-updated', () => {
  console.log('[渲染进程] 接收到文本复制事件:',);
  filterClipboardItems()
})

// 点击外部关闭下拉菜单
function handleClickOutside(event: MouseEvent) {
  const target = event.target as HTMLElement;
  // 检查点击是否在下拉菜单或更多按钮之外
  if (dropdownState.visible &&
    !target.closest('.dropdown-menu') &&
    !target.closest('.action-button')) {
    dropdownState.visible = false;
  }
}

// 组件挂载时获取历史记录并添加点击事件监听
onMounted(() => {
  filterClipboardItems();
  document.addEventListener('click', handleClickOutside);
})

// 组件卸载时移除点击事件监听
onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
})
</script>

<template>
  <TitleBar />
  <CustomNavBar :menuItems="MenuItems" />
  <div style="width: 100%;height: 55px;"></div>

  <div v-if="listLoading" class="loading-indicator">
    <a-spin />
  </div>
  <div v-else class="clipboard-list">
    <div v-for="item in itemList" :key="item.id" class="clipboard-item">
      <div class="clipboard-card">
        <div class="card-header">
          <div class="card-title">{{ new Date(item.copy_time).toLocaleString() }}</div>
          <a-tag :color="themeColors.tagColor">{{ convertType(item.type) }}</a-tag>
        </div>
        <div class="card-content">
          <div class="content-wrapper">
            <p>{{ item.content }}</p>
            <div class="card-actions">
              <div class="action-buttons">
                <!-- 置顶/取消置顶按钮 -->
                <div class="action-button" @click="item.is_topped ? onUntop(item.id) : onTop(item.id)">
                  <TopIcon v-if="!item.is_topped" />
                  <UntopIcon v-else />
                </div>
                <!-- 更多按钮 -->
                <div class="action-button" @click="toggleDropdown(item.id)">
                  <MoreIcon />
                </div>
                <!-- 下拉菜单 -->
                <div v-if="dropdownState.visible && dropdownState.currentItemId === item.id" class="dropdown-menu">
                  <div class="dropdown-item" @click="removeItem(item.id)">
                    <TrashIcon class="dropdown-icon" />
                    <span>删除</span>
                  </div>
                  <div class="dropdown-item drag" @click="bindTag(item.id)">
                    <DragIcon class="dropdown-icon" />
                    <span>绑定标签</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="card-tags">
          <!-- 这里可以添加其他标签 -->
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.loading-indicator {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
}

.clipboard-list {
  padding: 8px;
  height: calc(100vh - 80px);
  /* 减去TitleBar(25px)和NavBar+占位div(55px)的高度 */
  overflow-y: scroll;
}

.clipboard-item {
  margin-bottom: 12px;
}

.clipboard-card {
  background-color: var(--theme-cardBackground);
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  padding: 12px;
  transition: box-shadow 0.3s;
}

.clipboard-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.card-header {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.card-title {
  font-weight: 500;
  color: var(--theme-text);
  font-size: 0.9rem;
}

.card-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  min-width: fit-content;
}

.action-buttons {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  position: relative;
}

.action-button {
  cursor: pointer;
  width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.2s;
}

.action-button:hover {
  transform: scale(1.1);
}

.dropdown-menu {
  position: absolute;
  top: 100%;
  right: 0;
  background-color: var(--theme-cardBackground);
  border-radius: 4px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.15);
  z-index: 10;
  min-width: 110px;
  padding: 4px 0;
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  cursor: pointer;
  transition: background-color 0.2s;
  font-size: 0.9rem;
}

.dropdown-item:hover {
  background-color: var(--theme-hoverBackground);
}

.dropdown-item svg {
  width: 14px;
  height: 14px;
}

.card-content {
  color: var(--theme-text);
  word-break: break-all;
  font-size: 0.9rem;
  line-height: 1.4;
  max-height: 200px;
}

.content-wrapper {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.content-wrapper p {
  flex: 1;
  margin: 0px 10px 0px 0px;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  text-overflow: ellipsis;
  line-clamp: 3;
  overflow: hidden;
  height: 4em;
  word-wrap: break-word;
  word-break: break-all;
  font-size: 14px;
}

.card-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
}

:deep(.ant-tag) {
  margin: 0;
}

.dropdown-icon {
  width: 16px;
  height: 16px;
}

.drag {
  cursor: grab;
  cursor: -webkit-grab;
}

.drag:active {
  cursor: grabbing;
  cursor: -webkit-grabbing;
}
</style>
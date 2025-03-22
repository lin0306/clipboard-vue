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
import { getTextColorForBackground } from '../utils/colorUtils.ts';
import { Chrome } from '@ckpack/vue-color';

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
          // 打开开发者工具
          window.ipcRenderer.send('open-settings');
        }
      },
      {
        key: '调试工具',
        label: '调试工具',
        onClick: () => {
          // 打开开发者工具
          window.ipcRenderer.send('toggle-dev-tools');
        }
      },
      {
        key: '重新加载',
        label: '重新加载',
        onClick: () => {
          msg.loading('正在重新加载应用程序...');
          // 重新加载应用程序
          window.ipcRenderer.send('reload-app');
        }
      },
      {
        type: 'divider',
      },
      {
        key: '关闭',
        label: '关闭',
        onClick: () => {
          msg.loading('正在关闭应用程序...');
          // 关闭应用程序
          window.ipcRenderer.send('quit-app');
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
        onClick: () => {
          // 打开开发者工具
          window.ipcRenderer.send('open-tags');
        }
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
  {
    key: '添加标签',
    label: '添加标签',
    onClick: () => {
      // 打开添加标签弹窗
      tagModalState.visible = true;
      tagModalState.tagName = '';
      tagModalState.tagColor = { r: 128, g: 128, b: 128, a: 1 };
    },
  },
]);

const TagItems = ref<[{ id: number, name: string, color: string }]>();

// 剪贴板历史记录
const itemList = ref<any[]>([])
let listLoading = ref(false)
let searchText = ref('')

// 标签选中状态
const selectedTagState = reactive({
  selectedTagId: undefined as number | undefined,
  isTopmost: false // 控制是否置顶显示
})
// 搜索框状态
const searchBoxState = reactive({
  visible: false
})

// 快捷键配置
const shortcutKeyConfig = ref<any>(null)

// 图片缓存，用于存储图片的base64数据
const imageCache = reactive(new Map<string, string>())

// 下拉菜单状态
const dropdownState = reactive({
  visible: false,
  currentItemId: -1
});

// 拖拽状态
const dragState = reactive({
  isDragging: false,
  dragItemId: -1,
  draggedOverTagId: -1
});

// 添加标签弹窗状态
const tagModalState = reactive({
  visible: false,
  tagName: '',
  tagColor: { r: 128, g: 128, b: 128, a: 1 } // 默认灰色
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
async function bindTag(itemId: number, tagId: number) {
  await window.ipcRenderer.invoke('item-bind-tag', itemId, tagId);
  filterClipboardItems();
  dropdownState.visible = false;
}

/**
 * 根据搜索文本和选中标签过滤剪贴板列表
 * @param {string} searchText - 搜索关键词
 */
async function filterClipboardItems() {
  listLoading.value = true;
  try {
    // 使用选中的标签ID进行过滤
    const tagId = selectedTagState.selectedTagId;
    console.log('查询条件', searchText.value, tagId);
    const items = await window.ipcRenderer.invoke('search-items', searchText.value, tagId);
    itemList.value = items;

    // 预加载图片的base64数据
    for (const item of items) {
      if (item.type === 'image' && item.file_path && !imageCache.has(item.file_path)) {
        loadImageBase64(item.file_path);
      }
    }
  } finally {
    listLoading.value = false;
  }
}

async function onCopy(info: any) {
  // 发送复制消息
  const isSuccess = await window.ipcRenderer.invoke('item-copy', info.id);
  if (isSuccess) {
    filterClipboardItems();
  } else {
    msg.error('复制失败');
  }
}

/**
 * 切换搜索框显示状态
 */
function toggleSearchBox() {
  searchBoxState.visible = !searchBoxState.visible;
  if (searchBoxState.visible) {
    // 当搜索框显示时，自动聚焦
    setTimeout(() => {
      const searchInput = document.getElementById('search-input');
      if (searchInput) {
        searchInput.focus();
      }
    }, 100);
  } else {
    // 当搜索框隐藏时，清空搜索内容并重新加载列表
    if (searchText.value) {
      searchText.value = '';
      filterClipboardItems();
    }
  }
}

/**
 * 处理键盘事件
 * @param {KeyboardEvent} event - 键盘事件
 */
function handleKeyDown(event: KeyboardEvent) {
  // 如果没有快捷键配置，则不处理
  if (!shortcutKeyConfig.value || !shortcutKeyConfig.value.search) return;

  const searchConfig = shortcutKeyConfig.value.search;
  const keys = searchConfig.key;

  let isCtrl = keys.includes("ctrl");
  let isAlt = keys.includes("alt");
  let isShift = keys.includes("shift");
  // mac上是command键，windows上是win键
  let isMeta = keys.includes("meta");
  let character = keys[keys.length - 1];
  if (
    event.key.toLowerCase() === character.toLowerCase()
    && event.ctrlKey === isCtrl
    && event.altKey === isAlt
    && event.shiftKey === isShift
    && event.metaKey === isMeta
  ) {
    event.preventDefault(); // 阻止默认行为
    toggleSearchBox();
  }

  // 当搜索框显示时，按ESC键隐藏
  if (searchBoxState.visible && event.key === 'Escape') {
    toggleSearchBox();
  }
}

/**
 * 加载图片的base64数据
 * @param {string} filePath - 图片文件路径
 */
async function loadImageBase64(filePath: string) {
  try {
    const base64Data = await window.ipcRenderer.invoke('get-image-base64', filePath);
    if (base64Data) {
      imageCache.set(filePath, base64Data);
    }
  } catch (error) {
    console.error('[渲染进程] 加载图片base64数据失败:', error);
  }
}

/**
 * 获取图片的显示源
 * @param {string} filePath - 图片文件路径
 * @returns {string} - 图片显示源
 */
function getImageSrc(filePath: string): string {
  return imageCache.get(filePath) || '';
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
 * 添加标签
 * @param {string} name - 标签名称
 * @param {string} color - 标签颜色
 */
async function addTag(name: string, color: string) {
  try {
    await window.ipcRenderer.invoke('add-tag', name, color);
    msg.success('添加标签成功');
  } catch (error) {
    msg.error('添加标签失败');
    console.error(error);
  }
}

/**
 * 处理添加标签确认
 */
async function handleAddTagConfirm() {
  console.log(tagModalState.tagColor)
  if (!tagModalState.tagName.trim()) {
    msg.warning('标签名称不能为空');
    return;
  }
  const rgba: any = tagModalState.tagColor;
  await addTag(tagModalState.tagName, 'rgba(' + rgba.rgba.r + ',' + rgba.rgba.g + ',' + rgba.rgba.b + ',' + rgba.rgba.a + ')');
  tagModalState.visible = false;
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
  console.log('[渲染进程] 接收到系统复制事件');
  filterClipboardItems()
})

// 监听标签加载
window.ipcRenderer.on('load-tag-items', (_event, tags) => {
  console.log('[渲染进程] 接收到标签列表', tags);
  TagItems.value = tags;
});

// 监听快捷键配置加载
window.ipcRenderer.on('load-shortcut-keys', (_event, config) => {
  console.log('[渲染进程] 接收到快捷键配置', config);
  shortcutKeyConfig.value = config;
});

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

// 处理拖拽开始事件
function handleDragStart(itemId: number, event: DragEvent) {
  dragState.isDragging = true;
  dragState.dragItemId = itemId;

  // 设置拖拽数据
  if (event.dataTransfer) {
    event.dataTransfer.setData('text/plain', itemId.toString());
    event.dataTransfer.effectAllowed = 'link';
  }
}

// 处理拖拽结束事件
function handleDragEnd() {
  dragState.isDragging = false;
  dragState.dragItemId = -1;
  dragState.draggedOverTagId = -1;
}

// 处理拖拽进入标签事件
function handleDragEnterTag(tagId: number) {
  dragState.draggedOverTagId = tagId;
  // 如果项目已经绑定了该标签，则不允许再次绑定
  if (dragState.dragItemId !== -1 && isItemTagged(dragState.dragItemId, tagId)) {
    return;
  }
}

// 处理拖拽离开标签事件
function handleDragLeaveTag(event: DragEvent) {
  // 检查是否直接拖拽到了另一个标签上
  // 只有当不是拖拽到其他标签元素上时，才清除draggedOverTagId
  const relatedTarget = event.relatedTarget as HTMLElement;
  if (!relatedTarget || !relatedTarget.closest('.tag-item')) {
    dragState.draggedOverTagId = -1;
  }
}

// 处理拖拽放置事件
async function handleDropOnTag(tagId: number) {
  if (dragState.dragItemId !== -1) {
    // 调用绑定标签接口
    await bindTag(dragState.dragItemId, tagId);
    // 重置拖拽状态
    handleDragEnd();
  }
}

// 检查项目是否已绑定标签
function isItemTagged(itemId: number, tagId: number) {
  const item = itemList.value.find(item => item.id === itemId);
  if (item && item.tags) {
    return item.tags.some((tag: any) => tag.id === tagId);
  }
  return false;
}

/**
 * 处理标签点击事件
 * @param {number} tagId - 标签ID
 */
function handleTagClick(tagId: number) {
  // 如果点击的是当前已选中的标签，则取消选中
  if (selectedTagState.selectedTagId === tagId) {
    selectedTagState.selectedTagId = undefined;
    selectedTagState.isTopmost = false;
  } else {
    // 否则选中该标签
    selectedTagState.selectedTagId = tagId;
    selectedTagState.isTopmost = true;
  }

  // 根据选中的标签过滤剪贴板列表
  filterClipboardItems();
}

// 组件挂载时获取历史记录并添加事件监听
onMounted(() => {
  filterClipboardItems();
  document.addEventListener('click', handleClickOutside);
  document.addEventListener('keydown', handleKeyDown);
})

// 组件卸载时移除事件监听
onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
  document.removeEventListener('keydown', handleKeyDown);
})
</script>

<template>
  <TitleBar :title="`剪贴板`" :showFixedBtn="true" :closeWindow="`close-app`" />
  <CustomNavBar :menuItems="MenuItems" />
  <div style="width: 100%;height: 60px;"></div>

  <!-- 搜索框 -->
  <div class="search-container" v-show="searchBoxState.visible">
    <a-input-search id="search-input" v-model:value="searchText" placeholder="输入关键词搜索"
      @pressEnter="filterClipboardItems" @keydown.esc="toggleSearchBox" @search="filterClipboardItems">
      <template #prefix>
        <i class="fas fa-search"></i>
      </template>
    </a-input-search>
  </div>

  <!-- 标签列表 -->
  <div class="tag-list" :class="{ 'has-selected-tag': selectedTagState.isTopmost }">
    <div v-for="tag in TagItems" :key="tag.id" class="tag-item" :class="{
    'tag-dragging-over': dragState.draggedOverTagId === tag.id,
    'tag-disabled': dragState.isDragging && isItemTagged(dragState.dragItemId, tag.id),
    'tag-expanded': dragState.isDragging && !isItemTagged(dragState.dragItemId, tag.id),
    'tag-selected': selectedTagState.selectedTagId === tag.id
  }" :style="{ backgroundColor: tag.color }" @dragenter="handleDragEnterTag(tag.id)"
      @dragleave="handleDragLeaveTag($event)" @dragover.prevent @drop.prevent="handleDropOnTag(tag.id)"
      @click="handleTagClick(tag.id)">
      <span class="tag-name" :style="{ color: getTextColorForBackground(tag.color) }">{{ tag.name }}</span>
    </div>
  </div>

  <div v-if="listLoading" class="loading-indicator">
    <a-spin />
  </div>
  <div v-else-if="!listLoading && (itemList === null || itemList === undefined || itemList.length <= 0)" class="empty">
    <a-empty />
  </div>
  <div v-else class="clipboard-list">
    <div v-for="item in itemList" :key="item.id" class="clipboard-item" @dblclick="onCopy(item)">
      <div class="clipboard-card">
        <div class="card-header">
          <div class="card-title">{{ new Date(item.copy_time).toLocaleString() }}</div>
          <a-tag :color="themeColors.tagColor">{{ convertType(item.type) }}</a-tag>
        </div>
        <div class="card-content">
          <div class="content-wrapper">
            <p v-if="item.type === 'text'">{{ item.content }}</p>
            <p v-if="item.type === 'image'">
              <img :src="getImageSrc(item.file_path)" alt="Image" class="image-item" />
            </p>
            <p v-if="item.type === 'file'">{{ item.content }}</p>
            <p v-else></p>
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
                  <div class="dropdown-item drag" draggable="true" @dragstart="handleDragStart(item.id, $event)"
                    @dragend="handleDragEnd">
                    <DragIcon class="dropdown-icon" />
                    <span>绑定标签</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="card-tags" v-if="item.tags && item.tags.length > 0">
          <div class="item-tags">
            <div v-for="tag in item.tags" :key="tag.id" class="item-tag" :style="{ backgroundColor: tag.color }">
              <span class="item-tag-name" :style="{ color: getTextColorForBackground(tag.color) }">{{ tag.name }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- 添加标签弹窗 -->
  <a-modal v-model:open="tagModalState.visible" title="添加标签" @ok="handleAddTagConfirm"
    @cancel="tagModalState.visible = false">
    <div class="tag-form">
      <div class="form-item">
        <label>标签名称</label>
        <a-input v-model:value="tagModalState.tagName" placeholder="请输入标签名称" />
      </div>
      <div class="form-item">
        <label>标签颜色</label>
        <div class="color-picker-container">
          <Chrome v-model="tagModalState.tagColor" />
        </div>
      </div>
    </div>
  </a-modal>
</template>

<style scoped>
.loading-indicator {
  display: flex;
  justify-content: center;
  align-items: center;
  height: calc(100vh - 80px);
}

.empty {
  display: flex;
  height: calc(100vh - 80px);
  justify-content: center;
  align-items: center;
}

.clipboard-list {
  padding: 2px;
  padding-left: 7px;
  height: calc(100vh - 65px);
  /* 减去TitleBar(25px)和NavBar+占位div(55px)的高度 */
  overflow-y: scroll;
}

.clipboard-item {
  margin-bottom: 7px;
}

.clipboard-card:hover {
  background-color: var(--theme-border);
}

.clipboard-card {
  background-color: var(--theme-cardBackground);
  border-radius: 10px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  padding: 7px;
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
  border: 1px solid transparent;
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

/* 为图片预览添加样式 */
.image-item {
  max-width: 100%;
  height: 4em;
  object-fit: contain;
  border-radius: 6px;
}

/* 包含图片的段落需要特殊处理 */
.content-wrapper p:has(img) {
  height: auto;
  height: 4em;
  -webkit-line-clamp: initial;
  line-clamp: initial;
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

.item-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.item-tag {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  display: inline-block;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}

.item-tag-name {
  font-size: 12px;
  white-space: nowrap;
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

/* 标签列表样式 */
.tag-list {
  position: fixed;
  top: 55px;
  left: -16px;
  display: flex;
  flex-direction: column;
  z-index: 100;
  transition: left 0.3s ease;
  overflow-y: auto;
  height: calc(100vh - 57px);
}

/* 隐藏 Chrome、Safari 和 Opera 的滚动条 */
.tag-list::-webkit-scrollbar {
  width: 0px;
}

/* 拖拽激活时，标签列表稍微向右移动，增加可见性 */
.tag-list.dragging-active {
  left: -5px;
}

.tag-item {
  width: 24px;
  height: 30px;
  border-radius: 4px;
  margin-bottom: -4px;
  position: relative;
  cursor: pointer;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  overflow: hidden;
  transform-origin: left center;
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
  opacity: 0.3;
}

/* 鼠标悬停或拖拽时展开标签 */
.tag-item:hover,
.tag-item.tag-expanded {
  opacity: 1;
  width: 100px;
  /* 固定宽度而不是拉伸 */
  z-index: 10;
  /* 悬浮时置于顶层 */
  box-shadow: 0 3px 8px rgba(0, 0, 0, 0.4);
}

.tag-name {
  position: absolute;
  left: 20px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 12px;
  white-space: nowrap;
  opacity: 0;
  transition: opacity 0.3s ease 0.15s;
  /* 延迟显示文字，等待展开动画完成一半 */
  pointer-events: none;
  width: 70px;
  overflow: hidden;
  transform-origin: left center;
}

/* 鼠标悬停或拖拽时显示标签名称 */
.tag-item:hover .tag-name,
.tag-item.tag-expanded .tag-name {
  opacity: 1;
  transform: translateY(-50%);
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}

.tag-dragging-over {
  box-shadow: 0 0 12px var(--theme-primary);
  transform: scale(1.08);
  z-index: 20 !important;
}

/* 选中标签的样式 */
.tag-selected {
  width: 100px !important;
  z-index: 5 !important;
  opacity: 1;
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.7);
}

/* 选中标签的名称始终显示 */
.tag-selected .tag-name {
  opacity: 1;
  font-weight: bold;
}

.tag-disabled {
  opacity: 0.7;
  /* 禁用鼠标光标样式 */
  cursor: not-allowed;
  /* 禁用点击事件 */
  pointer-events: none;
}

.tag-disabled:hover {
  width: 24px !important;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3) !important;
  transform: none !important;
}

.tag-disabled:hover .tag-name {
  opacity: 0 !important;
}

/* 标签表单样式 */
.tag-form {
  padding: 10px 0;
}

.form-item {
  margin-bottom: 16px;
}

.form-item label {
  display: block;
  margin-bottom: 8px;
  font-size: 14px;
  color: var(--theme-text);
}

.color-picker-container {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 10px;
}

.color-preview {
  width: 30px;
  height: 30px;
  border-radius: 4px;
  border: 1px solid var(--theme-border);
  margin-bottom: 5px;
}

/* 搜索框样式 */
.search-container {
  position: fixed;
  top: 65px;
  right: 10px;
  width: 300px;
  z-index: 100;
  background-color: var(--theme-cardBackground);
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  padding: 8px;
  transition: all 0.3s ease;
}

.search-container .ant-input-affix-wrapper {
  border-radius: 4px;
  border: 1px solid var(--theme-border);
}

.search-container .ant-input {
  background-color: var(--theme-cardBackground);
  color: var(--theme-text);
}
</style>
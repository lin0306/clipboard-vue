<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, reactive, nextTick } from 'vue'
import TitleBar from './TitleBar.vue';
import CustomNavBar from './CustomNavBar.vue';
import { useTheme, themes } from '../configs/ThemeConfig';
import { NavBarItem } from "../types/menus/NavBarItem.ts";
import TopIcon from '../assets/icons/TopIcon.vue';
import UntopIcon from '../assets/icons/UntopIcon.vue';
import TrashIcon from '../assets/icons/TrashIcon.vue';
import MoreIcon from '../assets/icons/MoreIcon.vue';
import DragIcon from '../assets/icons/DragIcon.vue';
import convertType from '../utils/convert.ts';
import { getTextColorForBackground } from '../utils/colorUtils.ts';
import { Chrome } from '@ckpack/vue-color';
import { message } from 'ant-design-vue';

import { useLanguage } from '../configs/LanguageConfig.ts';

const { languageTexts } = useLanguage();

// 获取主题上下文
const { currentTheme, setTheme, themeColors } = useTheme();

// 将MenuItems改为计算属性，这样当currentTheme变化时会自动更新
const MenuItems = computed((): NavBarItem[] => [
  {
    key: '程序',
    label: languageTexts.list.menu.program,
    children: [
      {
        key: '偏好设置',
        label: languageTexts.list.menu.settings,
        onClick: () => {
          // 打开开发者工具
          window.ipcRenderer.send('open-settings');
        }
      },
      {
        key: '调试工具',
        label: languageTexts.list.menu.devTools,
        onClick: () => {
          // 打开开发者工具
          window.ipcRenderer.send('toggle-dev-tools');
        }
      },
      {
        key: '重新加载',
        label: languageTexts.list.menu.reload,
        onClick: () => {
          message.loading('正在重新加载应用程序...');
          // 重新加载应用程序
          window.ipcRenderer.send('reload-app');
        }
      },
      {
        type: 'divider',
      },
      {
        key: '关闭',
        label: languageTexts.list.menu.exit,
        onClick: () => {
          message.loading('正在关闭应用程序...');
          // 关闭应用程序
          window.ipcRenderer.send('quit-app');
        }
      },
    ],
  },
  {
    key: '数据',
    label: languageTexts.list.menu.data,
    children: [
      {
        key: '标签管理',
        label: languageTexts.list.menu.tagManger,
        onClick: () => {
          // 打开开发者工具
          window.ipcRenderer.send('open-tags');
        }
      },
      {
        key: '数据视图',
        label: languageTexts.list.menu.dataView,
      },
      {
        type: 'divider',
      },
      {
        key: '数据导入',
        label: languageTexts.list.menu.dataImport,
      },
      {
        key: '数据导出',
        label: languageTexts.list.menu.dataExport,
      },
    ],
  },
  {
    key: '清空剪贴板',
    label: languageTexts.list.menu.clearData,
    onClick: () => {
      // 清空历史记录
      try {
        window.ipcRenderer.invoke('clear-items')
        itemList.value = []
        message.success(languageTexts.list.menu.clearDataSuccessMsg)
      } catch (error) {
        message.error(languageTexts.list.menu.clearDataFailedMsg)
      }
    },
  },
  {
    key: '主题',
    label: languageTexts.list.menu.themes,
    children: themes.map(theme => ({
      key: `theme-${theme.id}`,
      label: languageTexts.list.menu[theme.id],
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
    label: languageTexts.list.menu.help,
    children: [
      {
        key: '使用说明',
        label: languageTexts.list.menu.instructions,
      },
      {
        key: '更新日志',
        label: languageTexts.list.menu.updateLog,
      },
      {
        key: '检查更新',
        label: languageTexts.list.menu.checkForUpdate,
      },
      {
        key: '关于',
        label: languageTexts.list.menu.about,
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

// 无限滚动相关状态
const scrollState = reactive({
  page: 1,
  pageSize: 10,
  total: 1000,
  hasMore: true,
  isLoading: false
})

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

// 图片懒加载观察器
let imageObserver: IntersectionObserver | null = null;


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
 * @param {boolean} reset - 是否重置列表，默认为true
 */
async function filterClipboardItems(reset: boolean = true) {
  if (reset) {
    // 重置列表和分页状态
    itemList.value = [];
    scrollState.page = 1;
    scrollState.hasMore = true;
  }
  
  // 如果没有更多数据或正在加载中，则不执行
  if (!scrollState.hasMore || scrollState.isLoading) return;
  
  scrollState.isLoading = true;
  listLoading.value = reset; // 只在重置列表时显示全屏加载状态
  
  try {
    // 使用选中的标签ID进行过滤
    const tagId = selectedTagState.selectedTagId;
    
    console.log('查询条件', searchText.value, tagId, scrollState.page, scrollState.pageSize);
    const result = await window.ipcRenderer.invoke('search-items-paged', searchText.value, tagId, scrollState.page, scrollState.pageSize);
    
    // 更新数据列表和分页信息
    if (reset) {
      itemList.value = result.items;
    } else {
      // 追加数据而不是替换
      itemList.value = [...itemList.value, ...result.items];
    }
    
    scrollState.total = result.total;
    // 修改判断逻辑：只有当获取的数据条数小于pageSize或已加载的总数据等于总条数时，才认为没有更多数据
    scrollState.hasMore = result.items.length >= scrollState.pageSize && itemList.value.length < result.total;
    
    // 如果有更多数据，增加页码
    if (scrollState.hasMore) {
      scrollState.page++;
    }

    // 预加载图片的base64数据
    for (const item of result.items) {
      if (item.type === 'image' && item.file_path && !imageCache.has(item.file_path)) {
        loadImageBase64(item.file_path);
      }
    }
  } finally {
    scrollState.isLoading = false;
    listLoading.value = false;
  }
}

async function onCopy(info: any) {
  // 发送复制消息
  const isSuccess = await window.ipcRenderer.invoke('item-copy', info.id);
  if (isSuccess) {
    filterClipboardItems();
  } else {
    message.error(languageTexts.list.copyFailedMsg);
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
      filterClipboardItems(true);
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
 * 初始化图片懒加载
 */
function initImageLazyLoad() {
  // 如果浏览器支持IntersectionObserver
  if ('IntersectionObserver' in window) {
    // 先断开之前的观察器
    if (imageObserver) {
      imageObserver.disconnect();
    }

    imageObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target as HTMLImageElement;
          const src = img.getAttribute('data-src');
          if (src) {
            // 设置图片源
            img.src = src;
            // 图片加载完成后添加动画类
            img.onload = () => {
              img.classList.add('fade-in');
              img.classList.remove('image-loading');
            };
            observer.unobserve(img);
          }
        }
      });
    });

    // 观察所有带有data-src属性的图片
    setTimeout(() => {
      const lazyImages = document.querySelectorAll('img[data-src]');
      lazyImages.forEach(img => {
        // 确保图片有data-src属性且值不为空
        if (img.getAttribute('data-src')) {
          imageObserver?.observe(img);
        }
      });
    }, 100);
  } else {
    // 如果浏览器不支持IntersectionObserver，则直接加载所有图片
    const lazyImages = document.querySelectorAll('img[data-src]');
    lazyImages.forEach(img => {
      const src = img.getAttribute('data-src');
      if (src) {
        (img as HTMLImageElement).src = src;
        img.classList.add('fade-in');
        img.classList.remove('image-loading');
      }
    });
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
 * 添加标签
 * @param {string} name - 标签名称
 * @param {string} color - 标签颜色
 */
async function addTag(name: string, color: string) {
  try {
    await window.ipcRenderer.invoke('add-tag', name, color);
    message.success('添加标签成功');
  } catch (error) {
    message.error('添加标签失败');
    console.error(error);
  }
}

/**
 * 处理添加标签确认
 */
async function handleAddTagConfirm() {
  console.log(tagModalState.tagColor)
  if (!tagModalState.tagName.trim()) {
    message.warning('标签名称不能为空');
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
  filterClipboardItems(true) // 重置列表并重新加载
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

  // 根据选中的标签过滤剪贴板列表（重置列表）
  filterClipboardItems(true);
}

// 无限滚动模式下不需要分页处理函数

/**
 * 处理滚动事件，当滚动到底部时加载更多数据
 */
function handleScroll() {
  const clipboardList = document.querySelector('.clipboard-list');
  if (!clipboardList) return;
  console.log('滚动事件触发');
  
  // 计算是否滚动到底部（考虑一定的提前加载距离）
  const scrollPosition = clipboardList.scrollTop + clipboardList.clientHeight;
  const scrollHeight = clipboardList.scrollHeight;
  const threshold = 200; // 提前200px开始加载
  
  if (scrollPosition + threshold >= scrollHeight && !scrollState.isLoading && scrollState.hasMore) {
    // 滚动到底部，加载更多数据
    filterClipboardItems(false);
  }
}

// 组件挂载时获取历史记录并添加事件监听
onMounted(() => {
  filterClipboardItems(true);
  document.addEventListener('click', handleClickOutside);
  document.addEventListener('keydown', handleKeyDown);
  
  // 使用nextTick确保DOM已经渲染完成后再添加滚动事件监听
  nextTick(() => {
    // 添加滚动事件监听
    const clipboardList = document.querySelector('.clipboard-list');
    console.log("clipboardList",clipboardList);
    if (clipboardList) {
      console.log('添加滚动事件监听');
      clipboardList.addEventListener('scroll', handleScroll);
    } else {
      console.warn('未找到.clipboard-list元素，将在1秒后重试');
      // 如果还是没找到，设置一个延迟再次尝试
      setTimeout(() => {
        const retryClipboardList = document.querySelector('.clipboard-list');
        if (retryClipboardList) {
          console.log('重试成功：添加滚动事件监听');
          retryClipboardList.addEventListener('scroll', handleScroll);
        } else {
          console.error('重试失败：未找到.clipboard-list元素');
        }
      }, 1000);
    }
  });
  
  // 初始化图片懒加载
  setTimeout(() => {
    initImageLazyLoad();
  }, 100);
})

// 组件卸载时移除事件监听
onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
  document.removeEventListener('keydown', handleKeyDown);
  
  // 移除滚动事件监听
  const clipboardList = document.querySelector('.clipboard-list');
  if (clipboardList) {
    clipboardList.removeEventListener('scroll', handleScroll);
  }
  
  // 清除图片观察器
  if (imageObserver) {
    imageObserver.disconnect();
    imageObserver = null;
  }
})
</script>

<template>
  <TitleBar :title="languageTexts.list.title" :showFixedBtn="true" :closeWindow="`close-app`" />
  <CustomNavBar :menuItems="MenuItems" />
  <div style="width: 100%;height: 60px;"></div>

  <!-- 搜索框 -->
  <div class="search-container" v-show="searchBoxState.visible">
    <a-input-search id="search-input" v-model:value="searchText" :placeholder="languageTexts.list.searchHint"
      @pressEnter="filterClipboardItems(true)" @keydown.esc="toggleSearchBox" @search="filterClipboardItems(true)">
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
            <p v-else-if="item.type === 'image'">
              <img :data-src="getImageSrc(item.file_path)" alt="Image" class="image-item image-loading"
                src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1 1'%3E%3C/svg%3E" />
            </p>
            <p v-else-if="item.type === 'file'">
              <i class="fas fa-file"></i>
              <span>{{ item.content }}</span>
            </p>
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
                    <span>{{ languageTexts.list.deleteBtn }}</span>
                  </div>
                  <div class="dropdown-item drag" draggable="true" @dragstart="handleDragStart(item.id, $event)"
                    @dragend="handleDragEnd">
                    <DragIcon class="dropdown-icon" />
                    <span>{{ languageTexts.list.bindTagBtn }}</span>
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
    <!-- 底部加载状态指示器 -->
    <div class="loading-more-container" v-if="scrollState.isLoading && !listLoading">
      <a-spin size="small" />
      <span class="loading-text">加载更多...</span>
    </div>
    <div class="no-more-data" v-if="!scrollState.hasMore && itemList.length > 0 && !scrollState.isLoading">
      <span>已全部加载完成~</span>
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

/* 底部加载状态指示器样式 */
.loading-more-container {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 16px 0;
  margin-top: 10px;
  background-color: var(--theme-cardBackground);
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.loading-text {
  margin-left: 10px;
  color: var(--theme-text);
  font-size: 14px;
}

.no-more-data {
  display: flex;
  justify-content: center;
  padding: 16px 0;
  font-size: 14px;
}

.clipboard-list {
  display: flex;
  flex-direction: column;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    filter: blur(10px);
  }

  to {
    opacity: 1;
    filter: blur(0px);
  }
}

.image-loading {
  background-color: var(--theme-border);
  min-height: 50px;
  border-radius: 6px;
}

.fade-in {
  animation: fadeIn 0.3s ease-in forwards;
}
</style>
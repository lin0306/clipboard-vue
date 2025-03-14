<script setup lang="ts">
import { inject, ref, onMounted, computed } from 'vue'
import TitleBar from './TitleBar.vue';
import CustomNavBar from './CustomNavBar.vue';
import ThemeSelector from './ThemeSelector.vue';
import { useTheme } from '../theme/ThemeContext';
import { themes } from '../theme';

const msg: any = inject('message')

// 获取主题上下文
const { currentTheme, setTheme } = useTheme();

// 剪贴板历史记录
const itemList = ref<any[]>([])
let listLoading = ref(false)
let searchText = ''
let selectedTagId: any = undefined

// 显示主题选择器
const showThemeSelector = ref(false);

// 将MenuItems改为计算属性，这样当currentTheme变化时会自动更新
const MenuItems = computed(() => [
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
      onClick: () => {
        console.log('切换主题:', theme);
        setTheme(theme.id);
      },
      // 将getter函数改为直接比较，确保响应式更新
      isCurrentTheme: computed(() => currentTheme.id === theme.id)
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
let selectMenuKey: any = null;

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
    listLoading = ref(false);
  }
}


// 监听剪贴板更新
window.ipcRenderer.on('clipboard-updated', () => {
  console.log('[渲染进程] 接收到文本复制事件:',);
  filterClipboardItems()
})

// 组件挂载时获取历史记录
onMounted(() => {
  filterClipboardItems()
})
</script>

<template>
  <TitleBar color="" />
  <CustomNavBar :menuItems="MenuItems" :selectedKey="selectMenuKey" />
  <div style="width: 100%;height: 50px;"></div>
  
  <!-- 主题选择器 -->
  <div v-if="showThemeSelector" class="theme-selector-container">
    <ThemeSelector />
  </div>
  
  <a-list class="clipboard-container" :data-source="itemList" :loading="listLoading">
    <template #renderItem="{ item }">
      <a-list-item>
        <a-card style="width: 100%">
          <template #title>{{ new Date(item.copy_time).toLocaleString() }}</template>
          <template #extra>
            <a-tag color="blue">{{ item.type }}</a-tag>
          </template>
          <p>{{ item.content }}</p>
        </a-card>
      </a-list-item>
    </template>
  </a-list>
</template>

<style scoped>
.clipboard-list {
  padding: 20px;
  max-width: 800px;
  margin: 0 auto;
}

/* 列表容器样式 start */
.clipboard-container {
  height: calc(100vh - 50px);
  width: 100%;
  overflow-y: auto;
  position: relative;
  scrollbar-width: thin;
}

.clipboard-container::-webkit-scrollbar {
  width: 6px;
  border-radius: 6px;
}

.clipboard-container::-webkit-scrollbar-track {
  background: transparent;
  border-radius: 6px;
}

.clipboard-container::-webkit-scrollbar-thumb {
  background-color: rgba(144, 147, 153, 0.3);
  border-radius: 6px;
  transition: background-color 0.3s;
}

.clipboard-container::-webkit-scrollbar-thumb:hover {
  background-color: rgba(144, 147, 153, 0.5);
}

/* 主题选择器容器 */
.theme-selector-container {
  position: fixed;
  top: 55px;
  right: 10px;
  width: 200px;
  background-color: var(--theme-cardBackground);
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  z-index: 1000;
}
</style>
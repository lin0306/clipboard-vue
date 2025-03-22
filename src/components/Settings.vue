<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue';
import titleBar from './TitleBar.vue';
import { Menu, Switch, Input, Button, Select, InputNumber, message } from 'ant-design-vue';
import RightArrowIcon from '../assets/icon/RightArrowIcon.vue';

// 菜单相关
const selectedKeys = ref(['general']);
const menuItems = [
  { key: 'general', label: '通用设置' },
  { key: 'storage', label: '存储设置' },
  { key: 'shortcut', label: '快捷键' },
];

// 配置相关
const originalConfig = reactive({
  theme: 'dark',
  windowWidth: 350,
  windowHeight: 550,
  fixedWindowSize: true,
  powerOnSelfStart: false,
  replaceGlobalHotkey: false,
  languages: 'chinese',
  colsingHideToTaskbar: false,
  tempPath: ''
});

// 当前编辑的配置
const currentConfig = reactive({ ...originalConfig });

// 配置相关
const originalShortcutKeys = reactive({});

// 当前编辑的配置
const currentShortcutKeys = reactive({ ...originalShortcutKeys });

// 语言选项
const languageOptions = [
  { value: 'chinese', label: '中文' },
  { value: 'english', label: 'English' }
];

// 是否有修改
const hasChanges = computed(() => {
  return JSON.stringify(originalConfig) !== JSON.stringify(currentConfig);
});

// 加载配置
onMounted(() => {
  // 监听主进程发送的配置信息
  window.ipcRenderer.on('load-config', (_event, config) => {
    console.log('接收到配置信息:', config);
    Object.assign(originalConfig, config);
    Object.assign(currentConfig, config);
  });

  // 监听快捷键配置加载
  window.ipcRenderer.on('load-shortcut-keys', (_event, config) => {
    console.log('[渲染进程] 接收到快捷键配置', config);
    Object.assign(originalShortcutKeys, config);
    Object.assign(currentShortcutKeys, config);
  });
});

// 保存配置
const saveConfig = async () => {
  if (!hasChanges.value) {
    return; // 如果没有修改，不做任何处理
  }
  console.log('保存配置:', currentConfig);

  // 创建一个可序列化的配置对象副本
  const configJson = JSON.parse(JSON.stringify(currentConfig));
  
  // 发送配置到主进程
  const isSuccess = await window.ipcRenderer.invoke('update-config', configJson);
  if (isSuccess) {
    message.success('设置已保存，部分设置需要重启程序后生效');
    // 更新原始配置
    Object.assign(originalConfig, currentConfig);
  } else {
    message.error('保存设置失败');
  }
};

// 重置配置
const resetConfig = () => {
  Object.assign(currentConfig, originalConfig);
  message.info('已重置为上次保存的设置');
};

function openDevTools() {
  window.ipcRenderer.send('open-settings-devtools');
}
</script>

<template>
  <div class="settings-container">
    <titleBar :title="`设置`" :closeWindow="`close-settings`" />

    <div class="settings-content">
      <!-- 左侧菜单 -->
      <div class="settings-menu">
        <Menu v-model:selectedKeys="selectedKeys" mode="inline"
          :style="{ borderRight: '1px solid var(--theme-divider)' }">
          <Menu.Item v-for="item in menuItems" :key="item.key">
            {{ item.label }}
          </Menu.Item>
        </Menu>
      </div>

      <!-- 右侧内容 -->
      <div class="settings-panel">
        <!-- 通用设置 -->
        <div v-show="selectedKeys.includes('general')" class="settings-section">
          <h2>通用设置</h2>

          <div class="setting-item">
            <span class="setting-label">开机自启</span>
            <Switch v-model:checked="currentConfig.powerOnSelfStart" />
          </div>

          <div class="setting-item">
            <span class="setting-label">替换全局热键 (Windows适用)</span>
            <Switch v-model:checked="currentConfig.replaceGlobalHotkey" />
          </div>

          <div class="setting-item">
            <span class="setting-label">关闭窗口时隐藏到任务栏托盘</span>
            <Switch v-model:checked="currentConfig.colsingHideToTaskbar" />
          </div>

          <div class="setting-item">
            <span class="setting-label">窗口大小固定</span>
            <Switch v-model:checked="currentConfig.fixedWindowSize" />
          </div>

          <div class="setting-item" v-if="currentConfig.fixedWindowSize">
            <div class="window-size-inputs">
              <div class="size-input-group">
                <span class="setting-label">高:</span>
                <InputNumber v-model:value="currentConfig.windowHeight" :min="300" :max="1000" />
              </div>
              <div class="size-input-group">
                <span class="setting-label">宽:</span>
                <InputNumber v-model:value="currentConfig.windowWidth" :min="300" :max="1000" />
              </div>
            </div>
          </div>

          <div class="setting-item">
            <span class="setting-label">语言</span>
            <Select v-model:value="currentConfig.languages" style="width: 120px">
              <Select.Option v-for="option in languageOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </Select.Option>
            </Select>
          </div>

          <div class="setting-item">
            <span class="setting-label">调试工具</span>
            <RightArrowIcon class="right-arrow-btn" @click="openDevTools" />
          </div>
        </div>

        <!-- 存储设置 -->
        <div v-show="selectedKeys.includes('storage')" class="settings-section">
          <h2>存储设置</h2>
          <div class="setting-item">
            <span class="setting-label">临时文件路径</span>
            <Input v-model:value="currentConfig.tempPath" placeholder="请输入临时文件路径" />
          </div>
          <p class="setting-description">更多存储设置功能开发中...</p>
        </div>

        <!-- 快捷键设置 -->
        <div v-show="selectedKeys.includes('shortcut')" class="settings-section">
          <h2>快捷键设置</h2>
          <p class="setting-description">快捷键设置功能开发中...</p>
        </div>

        <!-- 底部按钮 -->
        <div class="settings-actions">
          <Button @click="resetConfig" :disabled="!hasChanges">重置</Button>
          <Button type="primary" @click="saveConfig" :disabled="!hasChanges">保存</Button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.settings-container {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: var(--theme-background);
  color: var(--theme-text);
}

.settings-content {
  display: flex;
  flex: 1;
  margin-top: 25px;
  /* 为标题栏留出空间 */
  overflow: hidden;
}

.settings-menu {
  width: 150px;
  height: 100%;
  background-color: var(--theme-navBackground);
}

.settings-panel {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
}

.settings-section {
  margin-bottom: 60px;
}

.settings-section h2 {
  margin-bottom: 20px;
  font-size: 18px;
  color: var(--theme-text);
}

.setting-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding: 8px 0;
}

.setting-label {
  font-size: 14px;
}

.window-size-inputs {
  display: flex;
  gap: 16px;
}

.size-input-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.setting-description {
  color: var(--theme-secondary);
  font-size: 14px;
  margin-top: 8px;
}

.settings-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 20px;
  border-top: 1px solid var(--theme-divider);
  position: fixed;
  bottom: 0;
  background-color: var(--theme-background);
  width: 65%;
}

.right-arrow-btn {
  width: 18px;
  height: 18px;
  opacity: 0.5;
}

.right-arrow-btn:hover {
  opacity: 1;
}
</style>
<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue';
import titleBar from './TitleBar.vue';
import { Menu, Switch, Input, Button, Select, InputNumber, message, Modal } from 'ant-design-vue';
import RightArrowIcon from '../assets/icons/RightArrowIcon.vue';
import EditIcon from '../assets/icons/EditIcon.vue';
import { useLanguage, languages } from '../configs/LanguageConfig.ts';

const { languageTexts } = useLanguage();

// 重启确认弹窗状态
const restartModalVisible = ref(false);

// 菜单相关
const selectedKeys = ref(['general']);
const menuItems = [
  { key: 'general', label: languageTexts.settings.generalMenu },
  { key: 'storage', label: languageTexts.settings.storageMenu },
  { key: 'shortcut', label: languageTexts.settings.storageMenu },
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
const currentShortcutKeys = reactive<any>({ ...originalShortcutKeys });

// 语言选项
const languageOptions = languages.map(lang => ({
  value: lang.id,
  label: lang.name
}));

// 是否有修改
const hasChanges = computed(() => {
  if (selectedKeys.value[0] === 'shortcut') {
    // 检查是否在编辑快捷键，或者原始快捷键和当前快捷键是否不同
    return JSON.stringify(originalShortcutKeys) !== JSON.stringify(currentShortcutKeys);
  }
  return JSON.stringify(originalConfig) !== JSON.stringify(currentConfig);
});

// 当前正在编辑的快捷键
const editingShortcut = ref<number | null>(null);
// 临时存储编辑中的按键
const tempKeys = ref<any[]>([]);
// 快捷键编辑弹窗状态
const shortcutModalVisible = ref(false);

// 开始编辑快捷键
function startEditShortcut(key: number) {
  editingShortcut.value = key;
  tempKeys.value = [...currentShortcutKeys[key].key];
  shortcutModalVisible.value = true;
  // 打开弹窗后添加全局按键监听
  document.addEventListener('keydown', handleKeyDown);
}

// 取消编辑快捷键
function cancelEditShortcut() {
  editingShortcut.value = null;
  tempKeys.value = [];
  shortcutModalVisible.value = false;
  // 关闭弹窗后移除全局按键监听
  document.removeEventListener('keydown', handleKeyDown);
}

// 确认编辑快捷键
function confirmEditShortcut() {
  const key = editingShortcut.value;
  if (key && tempKeys.value.length > 0) {
    currentShortcutKeys[key].key = [...tempKeys.value];
  }
  editingShortcut.value = null;
  tempKeys.value = [];
  shortcutModalVisible.value = false;
  // 关闭弹窗后移除全局按键监听
  document.removeEventListener('keydown', handleKeyDown);
}

// 格式化快捷键显示，修饰键首字母大写，普通键全部大写
function formatKeyDisplay(key: string): string {
  // 修饰键列表
  const modifierKeys = ['ctrl', 'shift', 'alt', 'meta'];

  if (modifierKeys.includes(key.toLowerCase())) {
    // 修饰键首字母大写
    return key.charAt(0).toUpperCase() + key.slice(1);
  } else {
    // 普通键全部大写
    return key.toUpperCase();
  }
}

// 处理按键事件
function handleKeyDown(event: any) {
  event.preventDefault();

  // 清除之前的按键
  tempKeys.value = [];

  // 添加修饰键
  if (event.ctrlKey) tempKeys.value.push('ctrl');
  if (event.shiftKey) tempKeys.value.push('shift');
  if (event.altKey) tempKeys.value.push('alt');
  if (event.metaKey) tempKeys.value.push('meta');

  // 添加主键（如果不是修饰键）
  const keyName = event.key.toLowerCase();
  if (!['control', 'shift', 'alt', 'meta'].includes(keyName) && keyName !== 'dead') {
    tempKeys.value.push(keyName === ' ' ? 'space' : keyName);
  }
}

// 保存配置
const saveConfig = async () => {
  if (!hasChanges.value) {
    return; // 如果没有修改，不做任何处理
  }
  if (selectedKeys.value[0] === 'general') {
    console.log('保存通用设置:', currentConfig);

    // 是否修改了【固定窗口大小】
    const isUpdateFixedWindowSize = currentConfig.fixedWindowSize !== originalConfig.fixedWindowSize;
    // 是否修改了【开机自启】
    const isUpdatePowerOnSelfStart = currentConfig.powerOnSelfStart !== originalConfig.powerOnSelfStart;
    // 是否修改了【替换全局热键】
    const isUpdateReplaceGlobalHotkey = currentConfig.replaceGlobalHotkey !== originalConfig.replaceGlobalHotkey;
    // 是否修改了【语言】
    const isUpdateLanguages = currentConfig.languages !== originalConfig.languages;
    // 是否修改了【页面宽度】
    const isUpdateWindowWidth = currentConfig.windowWidth !== originalConfig.windowWidth;
    // 是否修改了【页面高度】
    const isUpdateWindowHeight = currentConfig.windowHeight !== originalConfig.windowHeight;

    // 创建一个可序列化的配置对象副本
    const configJson = JSON.parse(JSON.stringify(currentConfig));

    // 发送配置到主进程
    const isSuccess = await window.ipcRenderer.invoke('update-config', configJson);
    if (isSuccess) {
      if (isUpdateFixedWindowSize
        || isUpdatePowerOnSelfStart
        || isUpdateReplaceGlobalHotkey
        || isUpdateLanguages
        || isUpdateWindowWidth
        || isUpdateWindowHeight
      ) {
        // 显示重启确认弹窗
        restartModalVisible.value = true;
      } else {
        message.success(languageTexts.settings.saveSuccessMsg);
      }
      // 更新原始配置
      Object.assign(originalConfig, currentConfig);
    } else {
      message.error(languageTexts.settings.saveFailedMsg);
    }
  }
  if (selectedKeys.value[0] === 'shortcut') {
    console.log('保存快捷键设置:', currentShortcutKeys);

    // 创建一个可序列化的快捷键配置对象副本
    const shortcutKeysJson = JSON.parse(JSON.stringify(currentShortcutKeys));

    // 发送快捷键配置到主进程
    try {
      const isSuccess = await window.ipcRenderer.invoke('update-shortcut-keys', shortcutKeysJson);
      if (isSuccess) {
        message.success(languageTexts.settings.saveSuccessMsg);
        // 更新原始快捷键配置，使用深拷贝确保两个对象不共享引用
        Object.assign(originalShortcutKeys, JSON.parse(JSON.stringify(currentShortcutKeys)));
        // 关闭编辑模式
        editingShortcut.value = null;
      } else {
        message.error(languageTexts.settings.saveFailedMsg);
      }
    } catch (error: any) {
      console.error('保存快捷键设置出错:', error);
      message.error(languageTexts.settings.shortcutSaveErrorMsg + error.message);
    }
  }
};

// 重置配置
const resetConfig = () => {
  if (selectedKeys.value[0] === 'shortcut') {
    Object.assign(currentShortcutKeys, originalShortcutKeys);
    // 关闭编辑模式
    editingShortcut.value = null;
    message.info(languageTexts.settings.resetSuccessMsg);
  }
  if (selectedKeys.value[0] === 'general') {
    Object.assign(currentConfig, originalConfig);
    message.info(languageTexts.settings.resetSuccessMsg);
  }
};

function openDevTools() {
  window.ipcRenderer.send('open-settings-devtools');
}
// 处理重启应用
const handleRestart = () => {
  restartModalVisible.value = false;
  // 触发重启应用
  window.ipcRenderer.send('restart-app');
};

// 关闭重启确认弹窗
const closeRestartModal = () => {
  restartModalVisible.value = false;
};

// 加载配置
onMounted(() => {
  // 监听主进程发送的配置信息
  window.ipcRenderer.on('load-config', (_event, config) => {
    console.log('接收到通用设置配置:', config);
    Object.assign(originalConfig, config);
    Object.assign(currentConfig, config);
  });

  // 监听快捷键配置加载
  window.ipcRenderer.on('load-shortcut-keys', (_event, config) => {
    console.log('[渲染进程] 接收到快捷键配置', config);
    // 使用深拷贝而不是引用赋值，确保originalShortcutKeys和currentShortcutKeys是独立的对象
    Object.assign(originalShortcutKeys, JSON.parse(JSON.stringify(config)));
    Object.assign(currentShortcutKeys, JSON.parse(JSON.stringify(config)));
  });
});
</script>

<template>
  <div class="settings-container">
    <titleBar :title="languageTexts.settings.title" :closeWindow="`close-settings`" />

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
          <h2>{{ languageTexts.settings.generalTitle }}</h2>

          <div class="setting-item">
            <span class="setting-label">{{ languageTexts.settings.powerOnSelfStart }}</span>
            <Switch v-model:checked="currentConfig.powerOnSelfStart" />
          </div>

          <div class="setting-item">
            <span class="setting-label">{{ languageTexts.settings.replaceGlobalHotkey }}</span>
            <Switch v-model:checked="currentConfig.replaceGlobalHotkey" />
          </div>

          <div class="setting-item">
            <span class="setting-label">{{ languageTexts.settings.colsingHideToTaskbar }}</span>
            <Switch v-model:checked="currentConfig.colsingHideToTaskbar" />
          </div>

          <div class="setting-item">
            <span class="setting-label">{{ languageTexts.settings.fixedWindowSize }}</span>
            <Switch v-model:checked="currentConfig.fixedWindowSize" />
          </div>

          <div class="setting-item right" v-if="currentConfig.fixedWindowSize">
            <div class="window-size-inputs">
              <div class="size-input-group">
                <span class="setting-label sub-label">{{ languageTexts.settings.windowHeight }}</span>
                <InputNumber v-model:value="currentConfig.windowHeight" :min="300" :max="1000" />
              </div>
              <div class="size-input-group">
                <span class="setting-label sub-label">{{ languageTexts.settings.windowWidth }}</span>
                <InputNumber v-model:value="currentConfig.windowWidth" :min="300" :max="1000" />
              </div>
            </div>
          </div>

          <div class="setting-item">
            <span class="setting-label">{{ languageTexts.settings.languages }}</span>
            <Select v-model:value="currentConfig.languages" style="width: 120px">
              <Select.Option v-for="option in languageOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </Select.Option>
            </Select>
          </div>

          <div class="setting-item">
            <span class="setting-label">{{ languageTexts.settings.devTools }}</span>
            <RightArrowIcon class="right-arrow-btn" @click="openDevTools" />
          </div>
        </div>

        <!-- 存储设置 -->
        <div v-show="selectedKeys.includes('storage')" class="settings-section">
          <h2>{{ languageTexts.settings.storageTitle }}</h2>
          <div class="setting-item">
            <span class="setting-label">{{ languageTexts.settings.tempPath }}</span>
            <Input v-model:value="currentConfig.tempPath" placeholder="请输入临时文件路径" />
          </div>
          <p class="setting-description">更多存储设置功能开发中...</p>
        </div>

        <!-- 快捷键设置 -->
        <div v-show="selectedKeys.includes('shortcut')" class="settings-section">
          <h2>{{ languageTexts.settings.shortcutTitle }}</h2>

          <div v-for="(shortcut, key) in currentShortcutKeys" :key="key" class="setting-item shortcut-item">
            <span class="setting-label">{{ languageTexts.settings[key] }}</span>
            <!-- 显示当前快捷键 -->
            <div class="shortcut-display" @click="startEditShortcut(key)">
              <div class="shortcut-keys">
                <template v-for="(k, index) in shortcut.key" :key="index">
                  <span class="key-badge">{{ formatKeyDisplay(k) }}</span>
                  <span v-if="index < shortcut.key.length - 1" class="key-plus">+</span>
                </template>
              </div>
              <span class="edit-icon">
                <EditIcon />
              </span>
            </div>
          </div>

          <p v-if="Object.keys(currentShortcutKeys).length === 0" class="setting-description">
            {{ languageTexts.settings.emptyShortcutConfig }}
          </p>
        </div>

        <!-- 底部按钮 -->
        <div class="settings-actions">
          <Button @click="resetConfig" :disabled="!hasChanges">{{ languageTexts.settings.resetBtn }}</Button>
          <Button type="primary" @click="saveConfig" :disabled="!hasChanges">{{ languageTexts.settings.saveBtn
            }}</Button>
        </div>
      </div>
    </div>

    <!-- 重启确认弹窗 -->
    <Modal v-model:open="restartModalVisible" :title="languageTexts.settings.restartModalTitle" :maskClosable="false"
      :closable="true">
      <p>{{ languageTexts.settings.restartModalContent }}</p>
      <template #footer>
        <Button @click="closeRestartModal">{{ languageTexts.settings.restartModalCancelBtn }}</Button>
        <Button type="primary" @click="handleRestart">{{ languageTexts.settings.restartModalConfirmBtn }}</Button>
      </template>
    </Modal>

    <!-- 快捷键编辑弹窗 -->
    <Modal v-model:open="shortcutModalVisible" :title="languageTexts.settings.editHotkeyModalTitle"
      :maskClosable="false" :closable="true">
      <div class="shortcut-modal-content">
        <div class="shortcut-input" tabindex="0">
          {{ tempKeys.map(k => formatKeyDisplay(k)).join(' + ') || languageTexts.settings.editHotkeyModalHint }}
        </div>
        <p class="shortcut-hint">{{ languageTexts.settings.editHotkeyModalContent }}</p>
      </div>
      <template #footer>
        <Button @click="cancelEditShortcut">
          {{ languageTexts.settings.editHotkeyModalCancelBtn }}
        </Button>
        <Button type="primary" @click="confirmEditShortcut">
          {{ languageTexts.settings.editHotkeyModalConfirmBtn }}
        </Button>
      </template>
    </Modal>
  </div>
</template>

<style scoped>
.settings-container {
  height: 100vh;
  display: flex;
  flex-direction: column;

  /* 快捷键相关样式 */
  .shortcut-item {
    margin-bottom: 15px;
  }

  .shortcut-display {
    display: flex;
    align-items: center;
    justify-content: space-between;
    cursor: pointer;
    padding: 6px 10px;
    border-radius: 6px;
    background-color: var(--theme-background-secondary);
    transition: background-color 0.2s;
  }

  .shortcut-keys {
    display: flex;
    align-items: center;
  }

  .key-plus {
    margin: 0 4px;
    font-weight: bold;
    opacity: 0.7;
    font-size: 14px;
  }

  .shortcut-display:hover {
    background-color: var(--theme-background-hover);
  }

  .key-badge {
    display: inline-block;
    padding: 4px 10px;
    margin-right: 8px;
    background-color: rgba(0, 0, 0, 0.6);
    border-radius: 6px;
    font-size: 13px;
    font-weight: 500;
    color: #ffffff;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
    border: 1px solid rgba(255, 255, 255, 0.1);
  }

  .edit-icon {
    width: 16px;
    display: flex;
    justify-content: center;
    align-items: center;
    opacity: 0.5;
  }

  .edit-icon:hover {
    opacity: 1;
  }

  .shortcut-edit {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .shortcut-input {
    padding: 8px 12px;
    border: 1px solid var(--theme-divider);
    border-radius: 4px;
    background-color: var(--theme-background-secondary);
    cursor: text;
    min-height: 36px;
    outline: none;
  }

  .shortcut-input:focus {
    border-color: var(--theme-primary);
  }

  .shortcut-actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
  }

  .shortcut-modal-content {
    display: flex;
    flex-direction: column;
    gap: 16px;
    padding: 10px 0;
  }

  .shortcut-hint {
    color: var(--theme-secondary);
    font-size: 14px;
    margin: 0;
  }

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
  overflow-y: scroll;
}

.settings-menu::-webkit-scrollbar {
  width: 0px;
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

.right {
  justify-content: flex-end !important;
}

.setting-label {
  font-size: 14px;
  min-width: 90px;
  margin-right: 5px;
}

.sub-label {
  min-width: 0px !important;
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
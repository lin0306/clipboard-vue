<script setup lang="ts">
import { NButton, NInput, NInputNumber, NMenu, NModal, NSelect, NSwitch, useMessage } from 'naive-ui';
import { computed, onMounted, reactive, ref } from 'vue';
import EditIcon from '../assets/icons/EditIcon.vue';
import { languages, useLanguage } from '../configs/LanguageConfig.ts';
import titleBar from './TitleBar.vue';

const message = useMessage();
const { languageTexts } = useLanguage();

// 重启确认弹窗状态
const restartModalVisible = ref(false);

// 菜单相关
const selectedKey = ref<string>('general');
const menuItems = [
  { key: 'general', label: languageTexts.settings.generalMenu },
  { key: 'storage', label: languageTexts.settings.storageMenu },
  { key: 'shortcut', label: languageTexts.settings.shortcutMenu },
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
  tempPath: '',
  maxHistoryItems: 100,
  maxStorageSize: 500,
  autoCleanupDays: 30,
  maxItemSize: 50,
  disableHardwareAcceleration: false
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
  if (selectedKey.value === 'shortcut') {
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
  tempKeys.value = [...(currentShortcutKeys[key]?.key || [])];
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
  if (selectedKey.value === 'general' || selectedKey.value === 'storage') {
    console.log('保存设置:', currentConfig);

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
    // 是否修改了【关闭窗口时隐藏到任务栏托盘】
    const isUpdateColsingHideToTaskbar = currentConfig.colsingHideToTaskbar !== originalConfig.colsingHideToTaskbar;
    // 是否修改了【禁用硬件加速】
    const isUpdateDisableHardwareAcceleration = currentConfig.disableHardwareAcceleration !== originalConfig.disableHardwareAcceleration;
    // 是否修改了【最大存储条数】
    const isUpdateMaxHistoryItems = currentConfig.maxHistoryItems !== originalConfig.maxHistoryItems;
    // 是否修改了【最大存储大小】
    const isUpdateMaxStorageSize = currentConfig.maxStorageSize !== originalConfig.maxStorageSize;
    // 是否修改了【自动清理天数】
    const isUpdateAutoCleanupDays = currentConfig.autoCleanupDays !== originalConfig.autoCleanupDays;
    // 是否修改了【限制每条最大长度】
    const isUpdateMaxItemSize = currentConfig.maxItemSize !== originalConfig.maxItemSize;

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
        || isUpdateColsingHideToTaskbar
        || isUpdateDisableHardwareAcceleration
        || isUpdateMaxHistoryItems
        || isUpdateMaxStorageSize
        || isUpdateAutoCleanupDays
        || isUpdateMaxItemSize
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
  if (selectedKey.value === 'shortcut') {
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
  if (selectedKey.value === 'shortcut') {
    Object.assign(currentShortcutKeys, originalShortcutKeys);
    // 关闭编辑模式
    editingShortcut.value = null;
    message.info(languageTexts.settings.resetSuccessMsg);
  }
  if (selectedKey.value === 'general') {
    Object.assign(currentConfig, originalConfig);
    message.info(languageTexts.settings.resetSuccessMsg);
  }
};

// 处理重启应用
const handleRestart = () => {
  restartModalVisible.value = false;
  // 触发重启应用
  window.ipcRenderer.send('restart-app');
};

const devtoolConfig = reactive({
  isShow: false,
  isDev: false
});

// 监听开发工具是否显示
window.ipcRenderer.on('show-devtool', (_event, devtool) => {
  Object.assign(devtoolConfig, JSON.parse(devtool));
});

// 修改开发工具的显示状态
function updateDevtoolConfigShowStatus(checked: boolean) {
  devtoolConfig.isShow = checked;
  window.ipcRenderer.invoke('update-devtool-show', checked);
}

// 加载配置
onMounted(() => {
  // 监听主进程发送的配置信息
  window.ipcRenderer.on('load-config', (_event, config) => {
    console.log('接收到通用设置配置:', config);
    Object.assign(originalConfig, JSON.parse(config));
    Object.assign(currentConfig, JSON.parse(config));
  });

  // 监听快捷键配置加载
  window.ipcRenderer.on('load-shortcut-keys', (_event, config) => {
    console.log('[渲染进程] 接收到快捷键配置', config);
    // 使用深拷贝而不是引用赋值，确保originalShortcutKeys和currentShortcutKeys是独立的对象
    Object.assign(originalShortcutKeys, JSON.parse(config));
    Object.assign(currentShortcutKeys, JSON.parse(config));
  });
});
</script>

<template>
  <div class="settings-container">
    <titleBar :title="languageTexts.settings.title" :closeWindow="`close-settings`"
      :dev-tool="`open-settings-devtools`" />

    <div class="settings-content">
      <!-- 左侧菜单 -->
      <div class="settings-menu">
        <n-menu v-model:value="selectedKey" :options="menuItems" mode="vertical" />
      </div>

      <!-- 右侧内容 -->
      <div class="settings-form">
        <!-- 通用设置 -->
        <div v-if="selectedKey === 'general'" class="settings-section">
          <h2>{{ languageTexts.settings.generalTitle }}</h2>
          <div class="form-item">
            <span class="label">{{ languageTexts.settings.powerOnSelfStart }}</span>
            <n-switch v-model:value="currentConfig.powerOnSelfStart" />
          </div>
          <!-- todo 暂时没有办法替换Windows默认的剪贴板程序 -->
          <!-- <div class="form-item">
            <span class="label">{{ languageTexts.settings.replaceGlobalHotkey }}</span>
            <n-switch v-model:value="currentConfig.replaceGlobalHotkey" />
          </div> -->
          <div class="form-item">
            <span class="label">{{ languageTexts.settings.colsingHideToTaskbar }}</span>
            <n-switch v-model:value="currentConfig.colsingHideToTaskbar" />
          </div>
          <div class="form-item">
            <span class="label">{{ languageTexts.settings.fixedWindowSize }}</span>
            <n-switch v-model:value="currentConfig.fixedWindowSize" />
          </div>

          <div class="form-item right" v-if="currentConfig.fixedWindowSize">
            <div class="window-size-inputs">
              <div class="size-input-group">
                <span class="setting-label sub-label">{{ languageTexts.settings.windowHeight }}</span>
                <n-input-number size="small" v-model:value="currentConfig.windowHeight" :min="300" :max="1000" width="50px" />
              </div>
              <div class="size-input-group">
                <span class="setting-label sub-label">{{ languageTexts.settings.windowWidth }}</span>
                <n-input-number size="small" v-model:value="currentConfig.windowWidth" :min="300" :max="1000" width="100px" />
              </div>
            </div>
          </div>
          <div class="form-item">
            <span class="label">{{ languageTexts.settings.languages }}</span>
            <n-select size="small" v-model:value="currentConfig.languages" :options="languageOptions" />
          </div>
          <div class="form-item">
            <span class="label">{{ languageTexts.settings.disableHardwareAcceleration }}</span>
            <n-switch v-model:value="currentConfig.disableHardwareAcceleration" />
          </div>
                    
          <div class="form-item">
            <span class="label">{{ languageTexts.settings.devTools }}</span>
            <n-switch v-model:value="devtoolConfig.isShow" @update:value="updateDevtoolConfigShowStatus" />
          </div>
        </div>

        <!-- 存储设置 -->
        <div v-if="selectedKey === 'storage'" class="settings-section">
          <h2>{{ languageTexts.settings.storageTitle }}</h2>
          <div class="form-item">
            <span class="label">{{ languageTexts.settings.tempPath }}</span>
            <n-input v-model:value="currentConfig.tempPath" :disabled="true" />
          </div>
          <div class="form-item">
            <span class="label">{{ languageTexts.settings.maxHistoryItems }}</span>
            <n-input-number v-model:value="currentConfig.maxHistoryItems" :min="10" :max="10000" />
          </div>
          <div class="form-item">
            <span class="label">{{ languageTexts.settings.maxStorageSize }}</span>
            <n-input-number v-model:value="currentConfig.maxStorageSize" :min="100" :max="10000" />
          </div>
          <div class="form-item">
            <span class="label">{{ languageTexts.settings.autoCleanupDays }}</span>
            <n-input-number v-model:value="currentConfig.autoCleanupDays" :min="1" :max="365" />
          </div>
          <div class="form-item">
            <span class="label">{{ languageTexts.settings.maxItemSize }}</span>
            <n-input-number v-model:value="currentConfig.maxItemSize" :min="1" :max="200" />
          </div>
        </div>

        <!-- 快捷键设置 -->
        <div v-if="selectedKey === 'shortcut'" class="settings-section">
          <h2>{{ languageTexts.settings.shortcutTitle }}</h2>

          <div v-for="(shortcut, key) in currentShortcutKeys" :key="key" class="form-item shortcut-item">
            <span class="label">{{ languageTexts.settings[key] }}</span>
            <!-- 显示当前快捷键 -->
            <div class="shortcut-display">
              <div class="shortcut-keys">
                <template v-for="(k, index) in shortcut.key" :key="index">
                  <span class="key-badge">{{ formatKeyDisplay(k) }}</span>
                  <span v-if="index < shortcut.key.length - 1" class="key-plus">+</span>
                </template>
              </div>
              <span class="edit-icon" @click="startEditShortcut(key)">
                <EditIcon />
              </span>
            </div>
          </div>
        </div>

        <!-- 底部按钮 -->
        <div class="settings-footer">
          <n-button @click="resetConfig" :disabled="!hasChanges">
            {{ languageTexts.settings.resetBtn }}
          </n-button>
          <n-button type="primary" :disabled="!hasChanges" @click="saveConfig">
            {{ languageTexts.settings.saveBtn }}
          </n-button>
        </div>
      </div>
    </div>

    <!-- 重启确认弹窗 -->
    <n-modal v-model:show="restartModalVisible" :title="languageTexts.settings.restartModalTitle" preset="dialog">
      <p>{{ languageTexts.settings.restartModalContent }}</p>
      <template #action>
        <n-button @click="restartModalVisible = false">
          {{ languageTexts.settings.restartModalCancelBtn }}
        </n-button>
        <n-button type="primary" @click="handleRestart">
          {{ languageTexts.settings.restartModalConfirmBtn }}
        </n-button>
      </template>
    </n-modal>

    <!-- 快捷键编辑弹窗 -->
    <n-modal v-model:show="shortcutModalVisible" :title="languageTexts.settings.editHotkeyModalTitle" preset="dialog">
      <div class="shortcut-modal-content">
        <p>{{ languageTexts.settings.editHotkeyModalContent }}</p>
        <div class="shortcut-keys">
          {{ tempKeys.map(k => formatKeyDisplay(k)).join(' + ') || languageTexts.settings.editHotkeyModalHint }}
        </div>
      </div>
      <template #action>
        <n-button @click="cancelEditShortcut">
          {{ languageTexts.settings.editHotkeyModalCancelBtn }}
        </n-button>
        <n-button type="primary" :disabled="tempKeys.length === 0" @click="confirmEditShortcut">
          {{ languageTexts.settings.editHotkeyModalConfirmBtn }}
        </n-button>
      </template>
    </n-modal>
  </div>
</template>

<style scoped>
.settings-container {
  height: 100vh;
  display: flex;
  flex-direction: column;
}

.settings-content {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.settings-menu {
  width: 150px;
  border-right: 1px solid var(--theme-border);
}

.settings-form {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
}

.settings-section {
  margin-bottom: 20px;
}

.settings-section h2 {
  margin-bottom: 20px;
  font-size: 16px;
  font-weight: 500;
}

.form-item {
  display: flex;
  align-items: center;
  margin-bottom: 16px;
  justify-content: space-between;
}

.label {
  width: 200px;
  margin-right: 16px;
}

.settings-footer {
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

.shortcut-modal-content {
  padding: 16px 0;
}

.shortcut-keys {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}



/* 快捷键相关样式 */
.shortcut-item {
  margin-bottom: -5px;
}

.shortcut-display {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 10px;
  border-radius: 6px;
  background-color: var(--theme-background-secondary);
  transition: background-color 0.2s;
}


.key-plus {
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
  background-color: var(--theme-divider);
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  color: var(--theme-text);
  /* box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.1); */
}

.edit-icon {
  width: 16px;
  display: flex;
  justify-content: center;
  align-items: center;
  opacity: 0.5;
  margin-left: 10px;
  cursor: pointer;
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
  width: 70%;
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
</style>
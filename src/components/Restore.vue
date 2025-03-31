<template>
    <div class="restore-container">
        <titleBar :title="languageTexts.restore.title" :dev-tool="`open-restore-devtools`" />

        <!-- 恢复内容展示区域 -->
        <div class="restore-content">
            <div class="restore-header">
                <h2 class="restore-title">{{ languageTexts.restore.title }}</h2>
            </div>
            <div class="restore-description">
                {{ languageTexts.restore.description }}
            </div>

            <!-- 恢复进度条 -->
            <div class="restore-progress">
                <div class="progress-bar">
                    <div class="progress-inner" :style="{ width: `${restoreProgress}%` }"></div>
                </div>
                <div class="progress-info">
                    <div class="progress-text">{{ restoreProgress.toFixed(1) }}%</div>
                    <div class="status-text">{{ statusText }}</div>
                </div>
            </div>

            <!-- 恢复按钮 -->
            <div class="restore-actions" v-if="!isRestoring && !restoreCompleted">
                <a-button type="primary" @click="startRestore">
                    {{ languageTexts.restore.startBtn }}
                </a-button>
                <a-button @click="skipRestore">
                    {{ languageTexts.restore.skipBtn }}
                </a-button>
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useLanguage } from '../configs/LanguageConfig'
import titleBar from './TitleBar.vue'

// 获取语言配置
const { languageTexts } = useLanguage()

// 恢复状态
const isRestoring = ref(false)
const restoreProgress = ref(0)
const restoreCompleted = ref(false)
const statusText = ref(languageTexts.restore.readyText)

// 监听恢复状态
onMounted(() => {
    // 监听来自主进程的恢复状态消息
    window.ipcRenderer.on('backup-status', (_event: any, data: any) => {
        console.log('backup-status', data)
        const { progress, status } = data

        // 更新恢复进度
        restoreProgress.value = progress || 0
        statusText.value = status || ''

        // 如果恢复完成
        if (progress === 100) {
            isRestoring.value = false
            restoreCompleted.value = true
            
            // 延迟关闭恢复窗口并打开主窗口
            setTimeout(() => {
                window.ipcRenderer.send('restore-completed')
            }, 1500)
        }
    })
})

onUnmounted(() => {
    // 移除事件监听
    window.ipcRenderer.off('backup-status', () => {})
})

// 开始恢复
function startRestore() {
    isRestoring.value = true
    statusText.value = languageTexts.restore.startingText
    window.ipcRenderer.invoke('start-restore')
}

// 跳过恢复
function skipRestore() {
    window.ipcRenderer.invoke('skip-restore')
    window.ipcRenderer.send('restore-completed')
}
</script>

<style>
.restore-container {
    display: flex;
    flex-direction: column;
    height: 100vh;
    background-color: var(--bg-color);
    color: var(--text-color);
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
}

.restore-content {
    flex: 1;
    padding: 20px;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
}

.restore-header {
    margin-bottom: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.restore-title {
    font-size: 1.5rem;
    font-weight: 600;
    margin: 0;
    color: var(--primary-color);
}

.restore-description {
    margin-bottom: 30px;
    text-align: center;
    line-height: 1.6;
}

.restore-progress {
    margin: 30px 0;
}

.progress-bar {
    height: 8px;
    background-color: var(--border-color);
    border-radius: 4px;
    overflow: hidden;
    margin-bottom: 10px;
}

.progress-inner {
    height: 100%;
    background-color: var(--primary-color);
    border-radius: 4px;
    transition: width 0.3s ease;
}

.progress-info {
    display: flex;
    justify-content: space-between;
    font-size: 0.9rem;
    color: var(--text-secondary);
}

.restore-actions {
    display: flex;
    justify-content: center;
    gap: 15px;
    margin-top: auto;
    padding: 20px 0;
}

.status-text {
    font-style: italic;
}
</style>
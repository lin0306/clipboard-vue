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

            <!-- 恢复步骤条 -->
            <div class="restore-steps">
                <a-steps :current="currentStep" size="small">
                    <a-step :title="languageTexts.restore.setp1" />
                    <a-step :title="languageTexts.restore.setp2" />
                    <a-step :title="languageTexts.restore.setp3" />
                    <a-step :title="languageTexts.restore.setp4" />
                </a-steps>
            </div>

            <!-- 恢复状态信息 -->
            <div class="restore-status">
                <div class="status-text">{{ statusText }}</div>
                <div class="progress-text" v-if="restoreProgress < 100">{{ restoreProgress.toFixed(1) }}%</div>
                <div class="restart-countdown" v-if="restoreCompleted">
                    {{ countdownText }}
                </div>
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useLanguage } from '../configs/LanguageConfig'
import titleBar from './TitleBar.vue'

// 获取语言配置
const { languageTexts } = useLanguage()

// 恢复状态
const restoreProgress = ref(0)
const restoreCompleted = ref(false)
const statusText = ref(languageTexts.restore.readyText)

// 步骤管理
const currentStep = ref(0)

// 倒计时管理
const countdown = ref(3)
const countdownText = computed(() => `${countdown.value}${languageTexts.restore.restartCountdown}`)
let countdownTimer: number | null = null

// 根据进度更新当前步骤
function updateStepByProgress(progress: number) {
    if (progress < 25) {
        currentStep.value = 0
    } else if (progress < 50) {
        currentStep.value = 1
    } else if (progress < 75) {
        currentStep.value = 2
    } else if (progress < 100) {
        currentStep.value = 3
    } else {
        currentStep.value = 4
    }
}

// 开始倒计时
function startCountdown() {
    countdownTimer = window.setInterval(() => {
        countdown.value--
        if (countdown.value <= 0) {
            if (countdownTimer) {
                clearInterval(countdownTimer)
                countdownTimer = null
            }
            // 重启应用
            window.ipcRenderer.send('restore-completed')
        }
    }, 1000)
}

// 监听恢复状态
onMounted(() => {
    // 自动开始恢复
    statusText.value = languageTexts.restore.startingText
    window.ipcRenderer.invoke('start-restore')
    
    // 监听来自主进程的恢复状态消息
    window.ipcRenderer.on('backup-status', (_event: any, data: any) => {
        console.log('backup-status', data)
        const { progress, status } = data

        // 更新恢复进度
        restoreProgress.value = progress || 0
        statusText.value = status || ''
        
        // 更新步骤
        updateStepByProgress(progress)

        // 如果恢复完成
        if (progress === 100) {
            restoreCompleted.value = true
            statusText.value = languageTexts.restore.restoreSuccess
            
            // 删除备份文件
            window.ipcRenderer.invoke('remove-backup').then(() => {
                statusText.value = languageTexts.restore.toRestart
                // 开始倒计时
                startCountdown()
            })
        }
    })
})

onUnmounted(() => {
    // 移除事件监听
    window.ipcRenderer.off('backup-status', () => {})
    
    // 清除倒计时
    if (countdownTimer) {
        clearInterval(countdownTimer)
        countdownTimer = null
    }
})
</script>

<style scoped>
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
    align-items: center;
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
    text-align: center;
    line-height: 1.6;
    width: 80%;
}

.restore-steps {
    margin: 20px 0;
}

.restore-status {
    width: 80%;
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
}

.status-text {
    font-style: italic;
    font-size: 1rem;
    color: var(--text-color);
}

.progress-text {
    font-size: 1.2rem;
    font-weight: 600;
    color: var(--primary-color);
}

.restart-countdown {
    margin-top: 20px;
    font-size: 1.2rem;
    font-weight: 600;
    color: var(--primary-color);
    animation: pulse 1s infinite alternate;
}

@keyframes pulse {
    from {
        opacity: 0.7;
    }
    to {
        opacity: 1;
    }
}
</style>
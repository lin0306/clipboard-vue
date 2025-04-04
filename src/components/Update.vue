<template>
    <div class="update-container">
        <titleBar :title="languageTexts.update.title" :closeWindow="`close-update`" :dev-tool="`open-update-devtools`"
            :minimizeWindow="`minimize-update`" />

        <!-- 更新内容展示区域 -->
        <div class="update-content">
            <div class="release-header">
                <h2 class="release-version">{{ updateInfo.version || languageTexts.update.versionName }}</h2>
                <span class="release-tag"
                    v-if="updateInfo.version && updateInfo.version.includes('beta')">Pre-release</span>
            </div>
            <div class="release-date" v-if="updateInfo.releaseDate">
                {{ new Date(updateInfo.releaseDate).toLocaleDateString() }}
            </div>
            <div class="release-notes github-markdown" v-if="updateInfo.releaseNotes" v-html="updateInfo.releaseNotes">
            </div>
            <div class="release-notes" v-else>
                {{ languageTexts.update.updateNotes }}
            </div>
            <!-- 查看更多按钮 -->
            <div class="view-more-container">
                <n-button quaternary @click="openGitHubReleases">
                    {{ languageTexts.update.viewMoreBtn }}
                    <span class="view-more-icon">→</span>
                </n-button>
            </div>
        </div>

        <!-- 下载进度条 -->
        <div class="download-progress" v-if="isDownloading">
            <div class="progress-title">{{ languageTexts.update.downloadingTitle }}</div>
            <div class="progress-bar">
                <div class="progress-inner" :style="{ width: downloadProgress + '%' }"></div>
            </div>
            <div class="progress-info">
                <div class="progress-text">{{ downloadProgress.toFixed(1) }}%</div>
                <div class="download-details">
                    <span>{{ downloadedSize }}MB / {{ totalSize }}MB</span>
                    <span class="download-speed">{{ downloadSpeed }} {{ downloadSpeedUnit }}</span>
                </div>
            </div>
        </div>

        <!-- 备份进度条 -->
        <div class="backup-progress" v-if="isBackingUp">
            <div class="progress-title">{{ languageTexts.update.backupTitle }}</div>
            <div class="progress-bar">
                <div class="progress-inner" :style="{ width: backupProgress + '%' }"></div>
            </div>
            <div class="progress-info">
                <div class="progress-text">{{ backupProgress.toFixed(1) }}%</div>
                <div class="status-text">{{ backupStatus }}</div>
            </div>
        </div>

        <!-- 底部按钮区域 -->
        <div class="update-footer" v-show="!isDownloading && !isBackingUp">
            <!-- 初始状态：显示暂不更新和立即下载按钮 -->
            <div class="update-actions">
                <div class="left-action">
                    <n-button secondary @click="postponeUpdate" v-if="!backupCompleted">
                        {{ languageTexts.update.notUpdateBtn }}
                    </n-button>
                    <span class="remind-text" v-if="!backupCompleted">{{ languageTexts.update.reminderText }}</span>
                    <div class="days-selector" v-if="!backupCompleted">
                        <select v-model="remindDays" v-if="!backupCompleted">
                            <option v-for="day in [1, 3, 7, 15, 30]" :key="day" :value="day">{{ day
                                }}{{ languageTexts.update.days }}</option>
                        </select>
                    </div>
                </div>
                <div class="right-action">
                    <n-button type="primary" @click="downloadUpdate" v-if="!backupCompleted">
                        {{ languageTexts.update.downloadNowBtn }}
                    </n-button>
                    <!-- 备份完成后显示立即重启按钮 -->
                    <n-button type="primary" @click="installNow" v-if="backupCompleted">
                        {{ languageTexts.update.restartImmediatelyBtn }}
                    </n-button>
                </div>
            </div>
        </div>

        <!-- 调试信息 -->
        <div class="debug-info"
            style="padding: 5px; font-size: 10px; color: #999; position: absolute; bottom: 0; right: 0; z-index: 200;">
            Download: {{ isDownloading ? 'Yes' : 'No' }} | Backup: {{ isBackingUp ? 'Yes' : 'No' }} |
            Download Completed: {{ downloadCompleted ? 'Yes' : 'No' }} | Backup Completed: {{ backupCompleted ? 'Yes' :
            'No' }} |
            Progress: {{ downloadProgress }}%
        </div>
    </div>
</template>

<script lang="ts" setup>
import { onMounted, onUnmounted, reactive, ref } from 'vue';
import { useLanguage } from '../configs/LanguageConfig';
import titleBar from './TitleBar.vue';

// 获取语言和主题配置
const { languageTexts } = useLanguage()

// 更新信息
const updateInfo = reactive({
    version: '',
    releaseDate: '',
    releaseNotes: ''
});

// 下载状态
const isDownloading = ref(false);
const downloadProgress = ref(0);
const downloadCompleted = ref(false);

// 下载信息
const downloadSpeed = ref<any>(0); // 下载速度 (KB/s)
const downloadSpeedUnit = ref('KB/s');
const downloadedSize = ref<any>(0); // 已下载大小 (MB)
const totalSize = ref<any>(0); // 总大小 (MB)

// 备份状态
const isBackingUp = ref(false);
const backupProgress = ref(0);
const backupCompleted = ref(false);
const backupStatus = ref('');

// 提醒天数
const remindDays = ref(3);

// 监听更新状态
onMounted(() => {
    // 监听来自主进程的更新状态消息
    window.ipcRenderer.on('update-status', (_event: any, data: any) => {
        console.log('update-status', data);
        const { status, data: updateData } = data;

        switch (status) {
            case 'update-available':
                // 有可用更新
                updateInfo.version = updateData.version;
                updateInfo.releaseDate = updateData.releaseDate;
                updateInfo.releaseNotes = updateData.releaseNotes;
                break;

            case 'download-progress':
                // 更新下载进度
                isDownloading.value = true;
                // 确保进度值是数字且在0-100之间
                const rawPercent = updateData.percent || 0;
                downloadProgress.value = parseFloat(rawPercent.toFixed(1));
                console.log('下载进度更新:', downloadProgress.value, '%', '原始数据:', JSON.stringify(updateData));
                console.log('进度条样式:', `width: ${downloadProgress.value}%`);

                // 强制更新UI
                setTimeout(() => {
                    // 再次确认进度值
                    console.log('强制更新后的进度值:', downloadProgress.value);
                }, 100);

                // 更新下载速度和文件大小信息
                const bytesPerSecond = updateData.bytesPerSecond || 0;
                // 当速度超过1MB/s时，显示为MB/s
                if (bytesPerSecond > 1024 * 1024) {
                    downloadSpeed.value = (bytesPerSecond / 1024 / 1024).toFixed(2);
                    // 修改速度单位为MB/s
                    downloadSpeedUnit.value = 'MB/s';
                } else {
                    downloadSpeed.value = (bytesPerSecond / 1024).toFixed(2);
                    downloadSpeedUnit.value = 'KB/s';
                }

                downloadedSize.value = updateData.transferred ? (updateData.transferred / 1024 / 1024).toFixed(2) : 0;
                totalSize.value = updateData.total ? (updateData.total / 1024 / 1024).toFixed(2) : 0;
                break;

            case 'update-downloaded':
                // 更新下载完成
                console.log('下载完成');
                isDownloading.value = false;
                downloadCompleted.value = true;

                // 开始备份过程
                isBackingUp.value = true;
                console.log('开始备份过程:', isBackingUp.value);

                // 如果备份已完成（从主进程传来的信息）
                if (updateData.backupCompleted) {
                    backupCompleted.value = true;
                    isBackingUp.value = false; // 重要：设置正在备份标志为false
                    backupProgress.value = 100;
                    backupStatus.value = languageTexts.update.backupCompleted;
                    console.log('备份已完成:', backupCompleted.value);

                    // 强制更新UI状态
                    setTimeout(() => {
                        backupCompleted.value = true;
                        isBackingUp.value = false;
                    }, 100);
                }
                break;

            case 'download-error':
                // 下载出错
                console.log('下载出错:', updateData.error);

                // 显示错误信息，但不重置状态
                // 由于我们已经移除了取消功能，这里只需处理真正的错误情况
                break;

            case 'download-started':
                // 开始下载
                isDownloading.value = true;
                downloadProgress.value = 0;
                // 初始化下载信息
                downloadSpeed.value = 0;
                downloadSpeedUnit.value = 'KB/s';
                downloadedSize.value = 0;
                totalSize.value = 0;
                console.log('开始下载:', isDownloading.value);
                break;
        }
    });

    // 监听备份状态
    window.ipcRenderer.on('backup-status', (_event: any, data: any) => {
        console.log('backup-status', data);
        const { progress, status } = data;

        // 更新备份进度
        backupProgress.value = progress || 0;
        backupStatus.value = status || '';

        // 如果备份完成
        if (progress === 100) {
            backupCompleted.value = true;
            isBackingUp.value = false; // 设置为false表示备份已完成
            console.log('备份已完成，状态更新:', {
                backupCompleted: backupCompleted.value,
                isBackingUp: isBackingUp.value,
                downloadCompleted: downloadCompleted.value
            });

            // 强制更新UI
            setTimeout(() => {
                backupCompleted.value = true;
                isBackingUp.value = false;
            }, 100);
        }
    });

    // 请求更新信息
    requestUpdateInfo();
});

onUnmounted(() => {
    // 移除事件监听
    window.ipcRenderer.off('update-status', () => { });
    window.ipcRenderer.off('backup-status', () => { });
});

// 请求更新信息
function requestUpdateInfo() {
    // 如果没有更新信息，可以主动请求
    if (!updateInfo.version) {
        // 这里可以添加获取更新信息的逻辑
    }
}

// 暂不更新
function postponeUpdate() {
    // 保存提醒时间设置
    window.ipcRenderer.invoke('postpone-update', remindDays.value);
    // 关闭更新窗口
    window.ipcRenderer.send('close-update');
}

// 下载更新
function downloadUpdate() {
    isDownloading.value = true;
    downloadProgress.value = 0; // 初始化进度值
    console.log('设置isDownloading为true', isDownloading.value);

    // 强制更新UI状态，确保按钮区域立即隐藏并显示进度条
    setTimeout(() => {
        isDownloading.value = true;
        console.log('强制更新UI后的isDownloading状态:', isDownloading.value);
    }, 0);

    window.ipcRenderer.invoke('download-update');
}

// 立即安装更新并重启
function installNow() {
    // 只有在备份完成后才能安装更新
    if (backupCompleted.value) {
        window.ipcRenderer.invoke('install-update');
    }
}

// 打开GitHub发布页面
function openGitHubReleases() {
    // 使用electron的shell模块打开外部链接
    window.ipcRenderer.send('open-external-link', 'https://github.com/lin0306/clipboard-vue/releases');
}
</script>

<style scoped>
.update-container {
    display: flex;
    flex-direction: column;
    height: 100vh;
    overflow: hidden;
    background-color: var(--theme-background);
    color: var(--theme-text);
}

.update-content {
    flex: 1;
    padding: 20px;
    margin-bottom: 100px;
    /* 为标题栏留出空间 */
    overflow-y: auto;
}

.release-header {
    display: flex;
    align-items: center;
    margin-bottom: 8px;
}

.release-version {
    margin: 0;
    font-size: 24px;
    font-weight: 600;
}

.release-tag {
    display: inline-block;
    padding: 0 7px;
    font-size: 12px;
    font-weight: 500;
    line-height: 18px;
    border: 1px solid #9a6700;
    border-radius: 2em;
    margin-left: 8px;
    color: #9a6700;
}

.release-date {
    font-size: 12px;
    color: var(--theme-secondaryText);
    margin-bottom: 15px;
}

.release-notes {
    font-size: 14px;
    line-height: 1.5;
}

/* GitHub风格的Markdown样式 */
.github-markdown {
    color: var(--theme-text);
}

.github-markdown h1,
.github-markdown h2,
.github-markdown h3,
.github-markdown h4,
.github-markdown h5,
.github-markdown h6 {
    margin-top: 24px;
    margin-bottom: 16px;
    font-weight: 600;
    line-height: 1.25;
}

.github-markdown h1 {
    font-size: 2em;
    border-bottom: 1px solid var(--theme-border);
    padding-bottom: 0.3em;
}

.github-markdown h2 {
    font-size: 1.5em;
    border-bottom: 1px solid var(--theme-border);
    padding-bottom: 0.3em;
}

.github-markdown h3 {
    font-size: 1.25em;
}

.github-markdown ul,
.github-markdown ol {
    padding-left: 2em;
    margin-top: 0;
    margin-bottom: 16px;
}

.github-markdown li {
    margin-top: 0.25em;
}

.github-markdown p {
    margin-top: 0;
    margin-bottom: 16px;
}

.github-markdown code {
    padding: 0.2em 0.4em;
    margin: 0;
    font-size: 85%;
    background-color: rgba(175, 184, 193, 0.2);
    border-radius: 6px;
}

.github-markdown pre {
    padding: 16px;
    overflow: auto;
    font-size: 85%;
    line-height: 1.45;
    background-color: #f6f8fa;
    border-radius: 6px;
    margin-bottom: 16px;
}

.github-markdown blockquote {
    padding: 0 1em;
    color: #57606a;
    border-left: 0.25em solid #d0d7de;
    margin: 0 0 16px 0;
}

.update-footer {
    padding: 15px 20px;
    border-top: 1px solid var(--theme-border);
    background-color: var(--theme-cardBackground);
    position: fixed;
    bottom: 0;
    left: 0;
    width: 100%;
    box-sizing: border-box;
    z-index: 90;
}

.update-actions {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.left-action,
.right-action {
    display: flex;
    align-items: center;
}

.remind-text {
    margin-left: 10px;
    font-size: 12px;
    color: var(--theme-secondaryText);
}

.days-selector {
    margin-left: 5px;
}

.days-selector select {
    padding: 2px 5px;
    border-radius: 4px;
    border: 1px solid var(--theme-border);
    background-color: var(--theme-inputBackground);
    color: var(--theme-text);
}

.download-progress,
.backup-progress {
    padding: 15px 20px;
    border-top: 1px solid var(--theme-border);
    background-color: var(--theme-cardBackground);
    position: fixed;
    bottom: 0;
    left: 0;
    width: 100%;
    box-sizing: border-box;
    z-index: 200;
    display: block !important;
    /* 强制显示 */
}

.progress-title {
    font-weight: 600;
    margin-bottom: 10px;
    color: var(--theme-primary);
}

.progress-bar {
    height: 10px;
    background-color: var(--theme-background);
    /* 使用固定颜色而非变量 */
    border-radius: 4px;
    overflow: visible;
    /* 确保内容不被裁剪 */
    margin-bottom: 8px;
    border: 1px solid var(--theme-border);
    position: relative;
    /* 添加相对定位 */
    z-index: 95;
    /* 确保进度条容器有较高的z-index */
}

.progress-inner {
    height: 100%;
    background-color: var(--theme-primary);
    /* 使用固定颜色而非变量 */
    transition: width 0.3s ease;
    min-width: 2px;
    /* 确保即使是0%也能看到一点点 */
    position: absolute;
    /* 使用绝对定位 */
    left: 0;
    top: 0;
    z-index: 100;
    /* 提高z-index确保进度条内容可见 */
    border-radius: 4px;
    /* 添加圆角与外层一致 */
    display: block !important;
    /* 强制显示 */
    opacity: 1 !important;
    /* 确保不透明 */
}

.progress-info {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 5px;
}

.progress-text {
    font-size: 12px;
    color: var(--theme-secondaryText);
}

.download-details {
    display: flex;
    font-size: 12px;
    color: var(--theme-secondaryText);
}

.download-speed {
    margin-left: 10px;
}

/* 查看更多按钮样式 */
.view-more-container {
    display: flex;
    justify-content: center;
    margin-top: 20px;
    margin-bottom: 10px;
}

.view-more-icon {
    margin-left: 5px;
    font-size: 16px;
    transition: transform 0.3s ease;
}

:deep(.n-button:hover) .view-more-icon {
    transform: translateX(3px);
}

.restart-button-container {
    margin-top: 15px;
    display: flex;
    justify-content: flex-end;
}
</style>
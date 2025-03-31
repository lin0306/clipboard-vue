<template>
    <div class="update-container">
        <titleBar :title="languageTexts.update.title" :closeWindow="`close-update`" :dev-tool="`open-update-devtools`" :minimizeWindow="`minimize-update`" />

        <!-- 更新内容展示区域 -->
        <div class="update-content">
            <div class="release-header">
                <h2 class="release-version">{{ updateInfo.version || languageTexts.update.versionName }}</h2>
                <span class="release-tag" v-if="updateInfo.version && updateInfo.version.includes('beta')">Pre-release</span>
            </div>
            <div class="release-date" v-if="updateInfo.releaseDate">
                {{ new Date(updateInfo.releaseDate).toLocaleDateString() }}
            </div>
            <div class="release-notes github-markdown" v-if="updateInfo.releaseNotes" v-html="updateInfo.releaseNotes">
            </div>
            <div class="release-notes" v-else>
                {{languageTexts.update.updateNotes}}
            </div>
            <!-- 查看更多按钮 -->
            <div class="view-more-container">
                <a-button class="view-more-btn" type="link" @click="openGitHubReleases">
                    {{languageTexts.update.viewMoreBtn}}
                    <span class="view-more-icon">→</span>
                </a-button>
            </div>
        </div>

        <!-- 底部按钮区域 -->
        <div class="update-footer" v-if="!isDownloading || downloadCompleted">
            <!-- 初始状态：显示暂不更新和立即下载按钮 -->
            <div class="update-actions" v-if="!downloadCompleted">
                <div class="left-action">
                    <a-button class="btn btn-secondary" @click="postponeUpdate">
                        {{languageTexts.update.notUpdateBtn}}
                    </a-button>
                    <span class="remind-text">{{languageTexts.update.reminderText}}</span>
                    <div class="days-selector">
                        <select v-model="remindDays">
                            <option v-for="day in [1, 3, 7, 15, 30]" :key="day" :value="day">{{ day }}{{languageTexts.update.days}}</option>
                        </select>
                    </div>
                </div>
                <div class="right-action">
                    <a-button type="primary" @click="downloadUpdate">
                        {{languageTexts.update.downloadNowBtn}}
                    </a-button>
                </div>
            </div>

            <!-- 下载完成状态：显示立即重启和稍后重启按钮 -->
            <div class="update-actions" v-else>
                <div class="left-action">
                    <a-button @click="laterRestart">
                        {{languageTexts.update.restartLaterBtn}}
                    </a-button>
                </div>
                <div class="right-action">
                    <a-button type="primary" @click="installNow">
                        {{languageTexts.update.restartImmediatelyBtn}}
                    </a-button>
                </div>
            </div>
        </div>

        <!-- 下载进度条 -->
        <div class="download-progress" v-if="isDownloading">
            <div class="progress-bar">
                <div class="progress-inner" :style="{ width: `${downloadProgress}%` }"></div>
            </div>
            <div class="progress-info">
                <div class="progress-text">{{ downloadProgress.toFixed(1) }}%</div>
                <div class="download-details">
                    <span>{{ downloadedSize }}MB / {{ totalSize }}MB</span>
                    <span class="download-speed">{{ downloadSpeed }}KB/s</span>
                </div>
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { ref, reactive, onMounted, onUnmounted } from 'vue'
import { useLanguage } from '../configs/LanguageConfig'
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
const downloadedSize = ref<any>(0); // 已下载大小 (MB)
const totalSize = ref<any>(0); // 总大小 (MB)

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
                downloadProgress.value = updateData.percent || 0;
                // 更新下载速度和文件大小信息
                downloadSpeed.value = updateData.bytesPerSecond ? (updateData.bytesPerSecond / 1024).toFixed(2) : 0;
                downloadedSize.value = updateData.transferred ? (updateData.transferred / 1024 / 1024).toFixed(2) : 0;
                totalSize.value = updateData.total ? (updateData.total / 1024 / 1024).toFixed(2) : 0;
                break;

            case 'update-downloaded':
                // 更新下载完成
                isDownloading.value = false;
                downloadCompleted.value = true;
                break;

            case 'download-error':
                // 下载出错
                isDownloading.value = false;
                // 可以添加错误提示
                break;
        }
    });

    // 请求更新信息
    requestUpdateInfo();
});

onUnmounted(() => {
    // 移除事件监听
    window.ipcRenderer.off('update-status', () => { });
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
    window.ipcRenderer.invoke('download-update');
}

// 立即安装更新并重启
function installNow() {
    window.ipcRenderer.invoke('install-update');
}

// 稍后重启
function laterRestart() {
    // 设置下次启动时安装
    window.ipcRenderer.invoke('later-install-update');
    // 关闭更新窗口
    window.ipcRenderer.send('close-update');
}

// 打开GitHub发布页面
function openGitHubReleases() {
    // 使用electron的shell模块打开外部链接
    window.ipcRenderer.send('open-external-link', 'https://github.com/lin0306/clipboard-vue/releases');
}
</script>

<style>
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
    margin-bottom: 60px;
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
    width: 100%;
    box-sizing: border-box;
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

.download-progress {
    padding: 15px 20px;
    border-top: 1px solid var(--theme-border);
    background-color: var(--theme-cardBackground);
    position: fixed;
    bottom: 0;
    width: 100%;
    box-sizing: border-box;
}

.progress-bar {
    height: 8px;
    background-color: var(--theme-progressBackground);
    border-radius: 4px;
    overflow: hidden;
    margin-bottom: 5px;
}

.progress-inner {
    height: 100%;
    background-color: var(--theme-primary);
    transition: width 0.3s ease;
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

.view-more-btn {
    display: flex;
    align-items: center;
    font-size: 14px;
    color: var(--theme-primary);
}

.view-more-icon {
    margin-left: 5px;
    font-size: 16px;
    transition: transform 0.3s ease;
}

.view-more-btn:hover .view-more-icon {
    transform: translateX(3px);
}
</style>
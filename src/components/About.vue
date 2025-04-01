<template>
    <titleBar :title="languageTexts.about.title" :closeWindow="`close-about`" :dev-tool="`open-about-devtools`" />
    <div class="about-container">
        <img :src="loggPath" width="70px">
        <div class="app-name">{{ languageTexts.about.appName }}</div>
        <div class="version-info">{{ languageTexts.about.version }}: {{ appVersion }}</div>
        <div class="links-container">
            <!-- <a href="#" @click="openLink('https://example.com/service')">服务协议</a> -->
            <a href="#"
                @click="openLink('https://github.com/lin0306/clipboard-vue/issues')">{{ languageTexts.about.problemFeedback }}</a>
            <a href="#" @click="openLink('https://github.com/lin0306/clipboard-vue')">GitHub</a>
            <!-- <a href="#" @click="openLink('https://gitee.com/your-repo/clipboard')">Gitee</a> -->
        </div>
    </div>
</template>
<script lang="ts" setup>
import { ref } from 'vue';
import { useLanguage } from '../configs/LanguageConfig'
import titleBar from './TitleBar.vue';

// 获取语言和主题配置
const { languageTexts } = useLanguage()

const loggPath = ref<any>();

// @ts-ignore
const appVersion = __APP_VERSION__;

// 打开外部链接
function openLink(url: string) {
    window.ipcRenderer.send('open-external-link', url);
}

// 监听标签加载
window.ipcRenderer.on('load-logo', (_event, logoPath) => {
    loggPath.value = logoPath;
});
</script>
<style scoped>
.about-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: calc(100vh - 25px);
    position: relative;
}

.about-container img {
    box-shadow: 0 0px 8px rgba(0, 0, 0, 0.4);
    border-radius: 8px;
    -webkit-user-drag: none;
    -moz-user-drag: none;
    -ms-user-drag: none;
    user-drag: none;
}

.app-name {
    margin: 14px 0px;
    font-size: 22px;
}

.version-info {
    font-size: 16px;
}

.links-container {
    display: flex;
    gap: 15px;
    position: absolute;
    bottom: 20px;
}

.links-container a {
    color: #1890ff;
    text-decoration: none;
    font-size: 14px;
}

.links-container a:hover {
    text-decoration: underline;
}
</style>
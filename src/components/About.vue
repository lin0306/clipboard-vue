<template>
    <titleBar :title="`关于剪贴板`" :closeWindow="`close-about`" :dev-tool="`open-about-devtools`" />
    <div class="about-container">
        <img :src="loggPath" width="90px">
        <div class="version-info">版本: {{ appVersion }}</div>
        <div class="links-container">
            <!-- <a href="#" @click="openLink('https://example.com/service')">服务协议</a> -->
            <a href="#" @click="openLink('https://github.com/lin0306/clipboard-vue/issues')">问题反馈</a>
            <a href="#" @click="openLink('https://github.com/lin0306/clipboard-vue')">GitHub</a>
            <!-- <a href="#" @click="openLink('https://gitee.com/your-repo/clipboard')">Gitee</a> -->
        </div>
    </div>
</template>
<script lang="ts" setup>
import { ref } from 'vue';
import titleBar from './TitleBar.vue';

const loggPath = ref<any>();

// @ts-ignore
const appVersion = __APP_VERSION__;
console.log("当前版本", appVersion);

// 打开外部链接
function openLink(url: string) {
    window.ipcRenderer.send('open-external-link', url);
}

// 监听标签加载
window.ipcRenderer.on('load-logo', (_event, logoPath) => {
    loggPath.value = logoPath;
});
</script>
<style>
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

.version-info {
    margin-top: 10px;
    font-size: 16px;
    font-weight: bold;
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
<template>
    <div id="title-bar" :class="{ 'fixed': isFixed }">
        <div class="window-title">{{ title }}</div>
        <div class="window-controls">
            <div v-if="isShow && devTool" class="control-button" @click="openDevTool(devTool)">
                <DevToolIcon class="program-btn" id="devtool-button-img" />
            </div>
            <div v-if="showFixedBtn && !isFixed" class="control-button fixation-button" @click="onFixWindow">
                <FixedIcon class="program-btn" id="fixation-button-img" />
            </div>
            <div v-if="showFixedBtn && isFixed" class="control-button unfixation-button" @click="onUnfixWindow">
                <UnFixedIcon class="program-btn" id="unfixation-button-img" />
            </div>
            <div v-if="minimizeWindow" class="control-button" @click="onMinimizeWindow">
                <MinimizeIcon class="program-btn" />
            </div>
            <div v-if="closeWindow" class="control-button close-button" @click="onClose">
                <CloseIcon class="program-btn" id="close-button-img" />
            </div>
        </div>
    </div>
    <div style="width: 100%;height: 25px;"></div>
</template>
<script lang="ts" setup>
import CloseIcon from '../assets/icons/CloseIcon.vue'
import DevToolIcon from '../assets/icons/DevToolIcon.vue'
import FixedIcon from '../assets/icons/FixedIcon.vue'
import MinimizeIcon from '../assets/icons/MinimizeIcon.vue'
import UnFixedIcon from '../assets/icons/UnFixedIcon.vue'

import { ref } from 'vue'

const props = withDefaults(defineProps<{
    title: string;
    closeWindow?: string;
    showFixedBtn?: boolean;
    devTool?: string;
    minimizeWindow?: string;
}>(), {
    showFixedBtn: false
});

const isFixed = ref(false);

const isShow = ref(false);

// 监听标签加载
window.ipcRenderer.on('show-devtool', (_event, devtoolConfig) => {
    if (devtoolConfig.isDev) {
        isShow.value = true;
    } else {
        isShow.value = devtoolConfig.isShow;
    }
});

// 固定窗口
function onFixWindow() {
    isFixed.value = true;
    window.ipcRenderer.invoke('main-fixed', true);
}

// 取消固定窗口
function onUnfixWindow() {
    isFixed.value = false;
    window.ipcRenderer.invoke('main-fixed', false);
}

function onMinimizeWindow() {
    if (props.minimizeWindow) {
        window.ipcRenderer.send(props.minimizeWindow);
    }
}

function onClose() {
    if (props.closeWindow) {
        window.ipcRenderer.send(props.closeWindow);
    }
}

function openDevTool(devTool: string | undefined) {
    if (devTool) {
        window.ipcRenderer.send(devTool);
    }
}
</script>
<style>
/* 标题栏样式 */
#title-bar {
    height: 25px;
    width: 100%;
    -webkit-app-region: drag;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0 5px;
    border-radius: 8px 8px 0 0;
    backdrop-filter: blur(10px);
    position: relative;
    z-index: 1000;
    position: fixed;
    top: 0;
    background-color: var(--theme-titleBarBackground);
    color: var(--theme-text);
}

#title-bar.fixed {
    -webkit-app-region: no-drag;
}

.window-title {
    font-size: 12px;
}

.window-controls {
    display: flex;
    gap: 8px;
    -webkit-app-region: no-drag;
    padding-right: 10px;
}

.control-button {
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s ease;
    width: 20px;
    height: 20px;
    -webkit-app-region: no-drag;
}

.program-btn {
    width: 60%;
    height: 60%;
    background-size: contain;
    background-repeat: no-repeat;
    background-position: center;
    transition: transform 0.3s ease, opacity 0.3s ease;
    opacity: 0.3;
}

.fixation-button,
.unfixation-button {
    position: relative;
    overflow: hidden;
    display: flex;
}

#close-button-img:hover {
    transform: rotate(180deg);
    opacity: 1;
}

#fixation-button-img:hover {
    opacity: 1;
}

#unfixation-button-img {
    opacity: 1;
}

#devtool-button-img:hover {
    opacity: 1;
}
</style>
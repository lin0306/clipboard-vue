<template>
    <div id="title-bar" :class="{ 'fixed': isFixed }">
        <div class="window-title">{{ title }}</div>
        <div class="window-controls">
            <div v-if="showFixedBtn && !isFixed" class="control-button fixation-button" @click="onFixWindow">
                <FixedIcon class="program-btn" id="fixation-button-img" />
            </div>
            <div v-if="showFixedBtn && isFixed" class="control-button unfixation-button" @click="onUnfixWindow">
                <UnFixedIcon class="program-btn" id="unfixation-button-img" />
            </div>
            <div class="control-button close-button">
                <CloseIcon class="program-btn" id="close-button-img" @click="onClose(closeWindow)" />
            </div>
        </div>
    </div>
</template>
<script lang="ts" setup>
import FixedIcon from '../assets/icons/FixedIcon.vue'
import UnFixedIcon from '../assets/icons/UnFixedIcon.vue'
import CloseIcon from '../assets/icons/CloseIcon.vue'

import { ref } from 'vue'

withDefaults(defineProps<{
    title: string;
    closeWindow: string;
    showFixedBtn?: boolean;
}>(), {
    showFixedBtn: false
});

const isFixed = ref(false);

// 固定窗口
function onFixWindow() {
    isFixed.value = true;
}

// 取消固定窗口
function onUnfixWindow() {
    isFixed.value = false;
}

function onClose(win: string) {
    window.ipcRenderer.send(win);
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

.fixation-button, .unfixation-button {
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
</style>
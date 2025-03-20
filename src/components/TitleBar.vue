<template>
    <div id="title-bar">
        <div class="window-title">剪贴板</div>
        <div class="window-controls">
            <div class="control-button fixation-button">
                <FixedIcon class="program-btn" id="fixation-button-img" />
            </div>
            <div class="control-button unfixation-button">
                <UnFixedIcon class="program-btn" id="unfixation-button-img" />
            </div>
            <div class="control-button close-button">
                <CloseIcon class="program-btn" id="close-button-img" @click="onClose(closeWindow)" />
            </div>
        </div>
    </div>
</template>
<script lang="ts" setup>
import FixedIcon from '../assets/icon/FixedIcon.vue'
import UnFixedIcon from '../assets/icon/UnFixedIcon.vue'
import CloseIcon from '../assets/icon/CloseIcon.vue'

import { defineProps } from 'vue'

defineProps<{
    closeWindow: string;
}>();

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
    transition: transform 0.3s ease;
    opacity: 0.7;
}

.unfixation-button {
    display: none;
}

#close-button-img:hover {
    transform: rotate(180deg);
    opacity: 1;
}

#fixation-button-img:hover {
    opacity: 1;
}

#unfixation-button-img:hover {
    opacity: 1;
}
</style>
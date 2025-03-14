<template>
    <div id="title-bar">
        <div class="window-title">剪贴板</div>
        <div class="window-controls">
            <div class="control-button fixation-button">
                <FixedIcon :color="themeColors.text" class="program-btn" id="fixation-button-img" />
            </div>
            <div class="control-button unfixation-button">
                <UnFixedIcon :color="themeColors.text" class="program-btn" id="unfixation-button-img" />
            </div>
            <div class="control-button close-button">
                <CloseIcon :color="themeColors.text" class="program-btn" id="close-button-img" />
            </div>
        </div>
    </div>
</template>
<script lang="ts" setup>
import FixedIcon from '../assets/FixedIcon.vue'
import UnFixedIcon from '../assets/UnFixedIcon.vue'
import CloseIcon from '../assets/CloseIcon.vue'
import { useTheme } from '../themes/ThemeContext'

// 获取主题颜色
const { themeColors } = useTheme()
</script>
<style>
/* 标题栏样式 */
#title-bar {
    height: 25px;
    width: 98%;
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
    background-color: var(--theme-navBackground);
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
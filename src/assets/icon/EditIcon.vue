<template>
    <svg t="1741313765106" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg"
        p-id="2647" xmlns:xlink="http://www.w3.org/1999/xlink" width="200" height="200">
        <path
            d="M469.333333 128a42.666667 42.666667 0 0 1 0 85.333333H213.333333v597.333334h597.333334v-256l0.298666-4.992A42.666667 42.666667 0 0 1 896 554.666667v256a85.333333 85.333333 0 0 1-85.333333 85.333333H213.333333a85.333333 85.333333 0 0 1-85.333333-85.333333V213.333333a85.333333 85.333333 0 0 1 85.333333-85.333333z m414.72 12.501333a42.666667 42.666667 0 0 1 0 60.330667L491.861333 593.066667a42.666667 42.666667 0 0 1-60.330666-60.330667l392.192-392.192a42.666667 42.666667 0 0 1 60.330666 0z"
            :fill="themeColors.text" p-id="2648"></path>
    </svg>
</template>
<script lang="ts" setup>
import { useTheme } from '../../themes/ThemeContext.ts';
// 获取主题颜色
const { themeColors } = useTheme();
</script>
<style>
svg {
    width: 100%;
    height: 100%;
}
</style>
<template>
    <svg t="1743405035270" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg"
        p-id="6371" xmlns:xlink="http://www.w3.org/1999/xlink" width="200" height="200">
        <path
            d="M961.536 574.464H62.464C28.16 574.464 0 546.816 0 512c0-34.816 28.16-62.464 62.464-62.464h898.56c34.816 0 62.464 28.16 62.464 62.464 0.512 34.816-27.648 62.464-61.952 62.464z"
            p-id="6372" :fill="themeColors.text"></path>
    </svg>
</template>
<script lang="ts" setup>
import { useTheme } from '../../configs/ThemeConfig';
// 获取主题颜色
const { themeColors } = useTheme();
</script>
<style>
svg {
    width: 100%;
    height: 100%;
}
</style>
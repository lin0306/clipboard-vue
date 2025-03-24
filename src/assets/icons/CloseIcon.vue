<template>
    <svg t="1740576533673" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg"
        p-id="6107" xmlns:xlink="http://www.w3.org/1999/xlink" width="200" height="200">
        <path
            d="M632.117978 513.833356l361.805812 361.735298a85.462608 85.462608 0 1 1-121.001515 120.789974L511.116463 634.552816 146.913186 998.756094a86.026718 86.026718 0 0 1-121.706652-121.706652L389.480325 512.775651 27.674513 150.969839A85.392095 85.392095 0 0 1 148.393973 30.250379L510.199785 392.056191l366.671258-366.671258a86.026718 86.026718 0 0 1 121.706652 121.706652z"
            p-id="6108" :fill="themeColors.text"></path>
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
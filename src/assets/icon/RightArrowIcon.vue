<template>
    <icon>
        <template #component>
            <svg t="1740379654072" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg"
                p-id="2612" xmlns:xlink="http://www.w3.org/1999/xlink" width="200" height="200">
                <path
                    d="M341.957209 959.354678c-12.893658 0-25.842575-4.425799-36.386722-13.467733-23.493064-20.10592-26.224268-55.426357-6.064113-78.891791L603.929736 511.789199l-304.423361-355.206978c-20.160155-23.465434-17.427928-58.786894 6.064113-78.891791 23.437805-20.024056 58.786894-17.373693 78.837556 6.064113l335.675132 391.620305c17.974373 20.952194 17.974373 51.875484 0 72.827679l-335.675132 391.620305C373.371686 952.717514 357.691565 959.354678 341.957209 959.354678z"
                    p-id="2613" :fill="themeColors.text"></path>
            </svg>
        </template>
    </icon>
</template>
<script lang="ts" setup>
import Icon from '@ant-design/icons-vue';
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
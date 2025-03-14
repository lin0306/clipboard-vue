<template>
    <icon>
        <template #component>
            <svg t="1740588963566" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg"
                p-id="2042" xmlns:xlink="http://www.w3.org/1999/xlink" width="200" height="200">
                <path
                    d="M931.013 225.08c-24.632-25.896-65.015-26.383-90.194-1.1l-434.627 436.279-224.469-230.763c-23.31-23.987-62.392-22.656-87.316 2.946-24.923 25.606-26.221 65.795-2.883 89.777l274.385 282.069c23.304 23.954 62.391 22.623 87.31-2.978 5.71-5.865 9.985-12.514 13.192-19.545 2.467-1.846 4.928-3.597 7.163-5.865l456.373-458.092c25.213-25.308 25.668-66.8 1.071-92.727l-0.005 0zM931.013 225.08z"
                    :fill="themeColors.text" p-id="2043"></path>
            </svg>
        </template>
    </icon>
</template>
<script lang="ts" setup>
import Icon from '@ant-design/icons-vue';
import { useTheme } from '../themes/ThemeContext';

// 获取主题颜色
const { themeColors } = useTheme();
</script>
<style>
svg {
    width: 100%;
    height: 100%;
}
</style>
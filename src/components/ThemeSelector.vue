<template>
  <div class="theme-selector">
    <div class="theme-options">
      <div 
        v-for="theme in themes" 
        :key="theme.id"
        class="theme-option"
        :class="{ 'active': currentTheme.id === theme.id }"
        @click="setTheme(theme.id)"
      >
        <div class="theme-color-preview" :style="{ backgroundColor: theme.colors.primary }"></div>
        <span class="theme-name">{{ theme.name }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { themes, ThemeConfig } from '../theme';
import { useTheme } from '../theme/ThemeContext';

// 获取主题上下文
const { currentTheme, setTheme } = useTheme();
</script>

<style scoped>
.theme-selector {
  padding: 10px;
}

.theme-options {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.theme-option {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.3s;
}

.theme-option:hover {
  background-color: var(--theme-hoverBackground);
}

.theme-option.active {
  background-color: var(--theme-hoverBackground);
  font-weight: bold;
}

.theme-color-preview {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  margin-right: 8px;
}

.theme-name {
  font-size: 14px;
  color: var(--theme-text);
}
</style>
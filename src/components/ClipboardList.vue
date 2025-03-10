<script setup lang="ts">
import { inject } from 'vue'
import { ElectronManager } from '../utils/ElectronUtil'
const msg: any = inject('message')

// 在 setup 中初始化
ElectronManager.getInstance(msg);

function message() {
  console.log("成功");
  msg.success("成功");
}
</script>

<template>
  <img src="../assets/vue.svg">
  <a-button type="primary" @click="message">Primary Button</a-button>
</template>

<style scoped>
/* 暂时保留空样式标签 */
</style>
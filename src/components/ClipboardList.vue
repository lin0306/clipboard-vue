<script setup lang="ts">
import { inject, ref, onMounted } from 'vue'
const msg: any = inject('message')

// 剪贴板历史记录
const clipboardHistory = ref<any[]>([])

// 获取剪贴板历史记录
async function getClipboardHistory() {
  try {
    const history = await window.ipcRenderer.invoke('get-clipboard-history')
    clipboardHistory.value = history
  } catch (error) {
    msg.error('获取剪贴板历史失败')
  }
}

// 清空历史记录
async function clearHistory() {
  try {
    await window.ipcRenderer.invoke('clear-clipboard-history')
    clipboardHistory.value = []
    msg.success('清空历史记录成功')
  } catch (error) {
    msg.error('清空历史记录失败')
  }
}

// 监听剪贴板更新
window.ipcRenderer.on('clipboard-updated', () => {
  getClipboardHistory()
})

// 组件挂载时获取历史记录
onMounted(() => {
  getClipboardHistory()
})
</script>

<template>
  <div class="clipboard-list">
    <div class="header">
      <h2>剪贴板历史</h2>
      <a-button type="primary" danger @click="clearHistory">清空历史</a-button>
    </div>
    <a-list class="list" :data-source="clipboardHistory">
      <template #renderItem="{ item }">
        <a-list-item>
          <a-card style="width: 100%">
            <template #title>{{ new Date(item.created_at).toLocaleString() }}</template>
            <template #extra>
              <a-tag color="blue">{{ item.type }}</a-tag>
            </template>
            <p>{{ item.content }}</p>
          </a-card>
        </a-list-item>
      </template>
    </a-list>
  </div>
</template>

<style scoped>
.clipboard-list {
  padding: 20px;
  max-width: 800px;
  margin: 0 auto;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.list {
  max-height: 600px;
  overflow-y: auto;
}
</style>
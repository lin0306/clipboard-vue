<script lang="ts" setup>
import { Chrome } from '@ckpack/vue-color'
import { message } from 'ant-design-vue'
import { onMounted, reactive, ref } from 'vue'
import { useLanguage } from '../configs/LanguageConfig'
import titleBar from './TitleBar.vue'
import TrashIcon from '../assets/icons/TrashIcon.vue'
import LeftArrowIcon from '../assets/icons/LeftArrowIcon.vue'
import AddIcon from '../assets/icons/AddIcon.vue'

// 获取语言和主题配置
const { languageTexts } = useLanguage()

// 标签列表数据
const tagItems = ref<any[]>([])

// 右侧面板显示状态
const isPanelVisible = ref(false)
// 是否为编辑模式
const isEditMode = ref(false)
// 当前选中的标签ID
const selectedTagId = ref<number | null>(null)

// 标签编辑状态
const editState = reactive({
    isEdit: false,
    currentTagId: null as number | null,
    tagName: ''
})

const tagColor = ref<any>({})

// 搜索关键词
const searchText = ref('')

// 加载标签列表
async function loadTags() {
    try {
        const tags = await window.ipcRenderer.invoke('get-all-tags')
        tagItems.value = tags
    } catch (error) {
        console.error('加载标签失败', error)
        message.error(languageTexts.tags.loadFailedMsg)
    }
}

// 选择标签
function selectTag(tag: any) {
    selectedTagId.value = tag.id
    editState.isEdit = true
    editState.currentTagId = tag.id
    editState.tagName = tag.name

    // 解析颜色字符串为对象
    const colorMatch = tag.color.match(/rgba\((\d+),(\d+),(\d+),(\d*\.?\d*)\)/)
    if (colorMatch) {
        tagColor.value = {
            r: parseInt(colorMatch[1]),
            g: parseInt(colorMatch[2]),
            b: parseInt(colorMatch[3]),
            a: parseFloat(colorMatch[4])
        }
    }

    isEditMode.value = true
    isPanelVisible.value = true
}

// 显示添加面板
function showAddPanel() {
    resetForm()
    isEditMode.value = false
    isPanelVisible.value = !isPanelVisible.value
}

// 隐藏面板
function hidePanel() {
    isPanelVisible.value = false
    if (!isEditMode.value) {
        selectedTagId.value = null
    }
}

// 添加标签
async function addTag() {
    if (!editState.tagName.trim()) {
        message.warning(languageTexts.tags.tageNameIsNullWarnMsg)
        return
    }

    try {
        let rgba: any;
        if (tagColor.value.rgba) {
            rgba = tagColor.value.rgba
        } else {
            rgba = tagColor.value
        }
        const colorStr = `rgba(${rgba.r},${rgba.g},${rgba.b},${rgba.a})`

        if (editState.isEdit && editState.currentTagId) {
            // 更新标签
            await window.ipcRenderer.invoke('update-tag', editState.currentTagId, editState.tagName, colorStr)
            message.success(languageTexts.tags.editSuccessMsg)
        } else {
            // 添加新标签
            await window.ipcRenderer.invoke('add-tag', editState.tagName, colorStr)
            message.success(languageTexts.tags.saveSuccessMsg)
        }

        // 重置表单并刷新列表
        resetForm()
        hidePanel()
        loadTags()
    } catch (error) {
        console.error('操作标签失败', error)
        message.error(editState.isEdit ? languageTexts.tags.editFailedMsg : languageTexts.tags.saveFailedMsg)
    }
}

// 删除标签
async function deleteTag(id: number) {
    try {
        await window.ipcRenderer.invoke('delete-tag', id)
        message.success(languageTexts.tags.deleteSuccessMsg)
        if (selectedTagId.value === id) {
            selectedTagId.value = null
            hidePanel()
        }
        loadTags()
    } catch (error) {
        console.error('删除标签失败', error)
        message.error(languageTexts.tags.deleteFailedMsg)
    }
}

// 重置表单
function resetForm() {
    editState.isEdit = false
    editState.currentTagId = null
    editState.tagName = ''
    tagColor.value = { r: 128, g: 128, b: 128, a: 1 }
    selectedTagId.value = null
}

function openAddForm() {
    resetForm()
    isEditMode.value = false
}

// 过滤标签
function filterTags() {
    if (!searchText.value) {
        loadTags()
        return
    }

    const keyword = searchText.value.toLowerCase()
    tagItems.value = tagItems.value.filter(tag =>
        tag.name.toLowerCase().includes(keyword)
    )
}

// 组件挂载时加载标签列表
onMounted(() => {
    loadTags()

    // 监听标签更新事件
    window.ipcRenderer.on('load-tag-items', (_event, tags) => {
        tagItems.value = JSON.parse(tags)
    })
})
</script>

<template>
    <div class="tag-manager-container">
        <titleBar :title="languageTexts.tags.title" :closeWindow="`close-tags`" :dev-tool="`open-tags-devtools`" />

        <div class="tag-manager-content">
            <!-- 左右分栏布局 -->
            <div class="tag-manager-layout">
                <!-- 左侧标签列表 -->
                <div class="tag-list-panel" :class="{ 'tag-list-panel-narrow': isPanelVisible }">
                    <!-- 搜索框 -->
                    <div class="tag-list-header">
                        <a-input-search v-model:value="searchText" :placeholder="languageTexts.list.searchHint"
                            style="width: 100%" @search="filterTags" />
                    </div>

                    <!-- 标签列表 -->
                    <div class="tag-list-container">
                        <a-empty v-if="tagItems.length === 0" />
                        <div v-else class="tag-list">
                            <div v-for="tag in tagItems" :key="tag.id" class="tag-item"
                                :class="{ 'tag-item-active': selectedTagId === tag.id }" @click="selectTag(tag)"
                                :style="{ borderLeft: `4px solid ${tag.color}` }">
                                <div class="tag-item-content">
                                    <div class="tag-color-preview" :style="{ backgroundColor: tag.color }"></div>
                                    <div class="tag-item-name">{{ tag.name }}</div>
                                </div>
                                <div class="tag-item-actions" @click.stop>
                                    <div class="tag-delete-button" @click="deleteTag(tag.id)">
                                        <TrashIcon />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- 切换按钮 -->
                    <div class="toggle-panel-button" @click="showAddPanel">
                        <div class="toggle-icon-container" :class="{ 'unfold': isPanelVisible }">
                            <LeftArrowIcon />
                        </div>
                    </div>
                </div>

                <!-- 右侧详情/编辑面板 -->
                <div class="tag-detail-panel" :class="{ 'panel-visible': isPanelVisible }">
                    <div class="panel-header">
                        <h3>{{ isEditMode ? languageTexts.tags.addTitle : languageTexts.tags.editTitle }}</h3>
                        <div>
                            <AddIcon class="add-btn" v-if="isEditMode" @click="openAddForm" />
                        </div>
                    </div>

                    <div class="panel-content">
                        <div class="tag-form">
                            <div class="form-item">
                                <label>{{ languageTexts.tags.tagName }}</label>
                                <a-input v-model:value="editState.tagName"
                                    :placeholder="languageTexts.tags.tagNameHint" />
                            </div>
                            <div class="form-item">
                                <label>{{ languageTexts.tags.tagColor }}</label>
                                <div class="color-picker-container">
                                    <Chrome v-model="tagColor" />
                                </div>
                            </div>

                            <div class="form-actions">
                                <a-button @click="hidePanel">{{ languageTexts.tags.cancelBtn }}</a-button>
                                <a-button type="primary" @click="addTag">{{ languageTexts.tags.saveBtn }}</a-button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.tag-manager-container {
    height: 100vh;
    display: flex;
    flex-direction: column;
    background-color: var(--theme-background);
    color: var(--theme-text);
}

.tag-manager-content {
    flex: 1;
    overflow: hidden;
    position: relative;
}

/* 左右分栏布局 */
.tag-manager-layout {
    display: flex;
    height: 100%;
    position: relative;
    overflow: hidden;
    /* 确保超出部分被隐藏 */
}

/* 左侧标签列表面板 */
.tag-list-panel {
    width: 100%;
    height: 100%;
    border-right: 1px solid var(--theme-border);
    display: flex;
    flex-direction: column;
    position: relative;
    transition: transform 0.3s ease;
    /* 改为transform过渡效果 */
    z-index: 2;
    /* 确保在右侧面板上层 */
}

.tag-list-header {
    padding: 16px 16px 8px;
    height: 35px;
    border-bottom: 1px solid var(--theme-border);
}

.tag-list-container {
    flex: 1;
    overflow-y: auto;
    padding: 8px 0;
}

.tag-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 0 8px;
}

.tag-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    background-color: var(--theme-card-background);
    border-radius: 4px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    transition: all 0.3s;
    cursor: pointer;
}

.tag-item:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.tag-item-active {
    background-color: var(--theme-primary-light);
    border-left-width: 6px !important;
}

.tag-item-content {
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
}

.tag-color-preview {
    width: 24px;
    height: 24px;
    border-radius: 4px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
    flex-shrink: 0;
}

.tag-item-name {
    font-size: 14px;
    font-weight: 500;
    flex: 1;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.tag-item-actions {
    display: flex;
    align-items: center;
}

.tag-delete-button {
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    opacity: 0.7;
    transition: all 0.2s;
}

.tag-delete-button:hover {
    opacity: 1;
    transform: scale(1.1);
}

/* 切换按钮样式 */
.toggle-panel-button {
    position: absolute;
    top: 90%;
    right: 0;
    transform: translateY(-50%);
    width: 25px;
    height: 30px;
    background-color: var(--theme-primary);
    border-radius: 15px 0 0 15px;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: -2px 0 8px rgba(0, 0, 0, 0.2);
    cursor: pointer;
    transition: all 0.3s;
    z-index: 5;
}

.toggle-panel-button:hover {
    box-shadow: -3px 0 12px rgba(0, 0, 0, 0.3);
}

.toggle-icon-container {
    width: 16px;
    height: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    opacity: 0.5;
}

.toggle-icon-container:hover {
    opacity: 1;
}

.unfold {
    opacity: 1 !important;
    transform: rotate(180deg);
}

/* 右侧详情/编辑面板 */
.tag-detail-panel {
    width: 350px;
    /* 固定宽度 */
    height: 100%;
    background-color: var(--theme-card-background);
    position: absolute;
    right: -350px;
    /* 初始位置在屏幕外 */
    top: 0;
    overflow: hidden;
    box-shadow: -2px 0 10px rgba(0, 0, 0, 0.1);
    z-index: 3;
    /* 确保在左侧面板上层 */
    transition: right 0.3s ease;
    /* 添加过渡效果 */
}

.panel-visible {
    right: 0;
    /* 显示时移动到可见区域 */
}

/* 当右侧面板可见时，调整左侧面板位置 */
.tag-list-panel-narrow {
    width: calc(100% - 350px) !important;
    /* 减小宽度，为右侧面板留出空间 */
    transition: width 0.3s ease;
    /* 添加宽度过渡效果 */
}

.panel-header {
    height: 35px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 16px 8px;
    border-bottom: 1px solid var(--theme-border);
}

.panel-header h3 {
    margin: 0;
    font-size: 18px;
    font-weight: 500;
}

.panel-content {
    padding: 8px 16px;
    height: calc(100% - 52px);
    overflow-y: auto;
}

/* 表单样式 */
.tag-form {
    padding: 8px 0;
}

.form-item {
    margin-bottom: 10px;
}

.form-item label {
    display: block;
    margin-bottom: 8px;
    font-weight: 500;
}

.color-picker-container {
    margin-top: 8px;
}

.form-actions {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    margin-top: 10px;
}

.add-btn {
    width: 20px;
}
</style>
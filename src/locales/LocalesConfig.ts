import zh_CN from 'ant-design-vue/es/locale/zh_CN';
import En_US from 'ant-design-vue/es/locale/en_US';
import { inject, InjectionKey, provide, reactive, ref } from 'vue';

export interface LanguageConfig {
    id: string;
    name: string;
    locale: any;
    type: PageConfig;
}

export interface PageConfig {
    settings: {
        // 设置页面标题
        title: string;
        // 设置页面左侧菜单文字
        generalMenu: string;
        storageMenu: string;
        shortcutMenu: string;
        // 设置页面右侧页面标题
        generalTitle: string;
        storageTitle: string;
        shortcutTitle: string;
        // 通用设置页面文字
        powerOnSelfStart: string;
        replaceGlobalHotkey: string;
        colsingHideToTaskbar: string;
        fixedWindowSize: string;
        windowHeight: string;
        windowWidth: string;
        languages: string;
        devTools: string;
        // 存储设置页面文字
        tempPath: string;
        // 快捷键设置页面文字
        search: string;
        emptyShortcutConfig: string;
        // 设置页面底部按钮
        resetBtn: string;
        saveBtn: string;
        // 确认重启弹窗内容
        restartModalTitle: string;
        restartModalContent: string;
        restartModalCancelBtn: string;
        restartModalConfirmBtn: string;
        // 快捷键编辑弹窗内容
        editHotkeyModalTitle: string;
        editHotkeyModalHint: string;
        editHotkeyModalContent: string;
        editHotkeyModalCancelBtn: string;
        editHotkeyModalConfirmBtn: string;

        // 提示信息
        saveSuccessMsg: string;
        saveFailedMsg: string;
        shortcutSaveErrorMsg: string;
        resetSuccessMsg: string;
    }
}

// 简体中文配置
export const zhCN: LanguageConfig = {
    id: 'chinese',
    name: '简体中文',
    locale: zh_CN,
    type: {
        settings: {
            title: '设置',
            generalMenu: '通用设置',
            storageMenu: '存储设置',
            shortcutMenu: '快捷键',
            generalTitle: '通用设置',
            storageTitle: '存储设置',
            shortcutTitle: '快捷键设置',
            powerOnSelfStart: '开机自启',
            replaceGlobalHotkey: '替换全局热键 (Windows适用)',
            colsingHideToTaskbar: '关闭窗口时隐藏到任务栏托盘',
            fixedWindowSize: '窗口大小固定',
            windowHeight: '高：',
            windowWidth: '宽：',
            languages: '语言',
            devTools: '调试工具',
            tempPath: '临时文件路径',
            search: '搜索',
            emptyShortcutConfig: '暂无快捷键配置',
            resetBtn: '重置',
            saveBtn: '保存',
            restartModalTitle: '重启确认',
            restartModalContent: '部分设置需要重启程序后生效，是否现在重启？',
            restartModalCancelBtn: '稍后重启',
            restartModalConfirmBtn: '现在重启',
            editHotkeyModalTitle: '编辑快捷键',
            editHotkeyModalHint: '按下快捷键...',
            editHotkeyModalContent: '请按下您想要设置的快捷键组合',
            editHotkeyModalCancelBtn: '取消',
            editHotkeyModalConfirmBtn: '确认',
            saveSuccessMsg: '保存成功',
            saveFailedMsg: '保存失败',
            shortcutSaveErrorMsg: '保存快捷键设置失败: ',
            resetSuccessMsg: '已重置',
        }
    }
}

// 英文配置
export const enUS: LanguageConfig = {
    id: 'english',
    name: 'English',
    locale: En_US,
    type: {
        settings: {
            title: 'Settings',
            generalMenu: 'General Settings',
            storageMenu: 'Storage Settings',
            shortcutMenu: 'Shortcuts',
            generalTitle: 'General Settings',
            storageTitle: 'Storage Settings',
            shortcutTitle: 'Shortcut Settings',
            powerOnSelfStart: 'Power On Self Start',
            replaceGlobalHotkey: 'Replace Global Hotkey (Windows Applicable)',
            colsingHideToTaskbar: 'Closing Window Hide to Taskbar',
            fixedWindowSize: 'Fixed Window Size',
            windowHeight: 'Height:',
            windowWidth: 'Width:',
            languages: 'Languages',
            devTools: 'Developer Tools',
            tempPath: 'Temporary File Path',
            search: 'Search',
            emptyShortcutConfig: 'No Shortcut Config',
            resetBtn: 'Reset',
            saveBtn: 'Save',
            restartModalTitle: 'Restart Confirmation',
            restartModalContent: 'Some settings require restarting the program to take effect. Do you want to restart now?',
            restartModalCancelBtn: 'Restart Later',
            restartModalConfirmBtn: 'Now Restart',
            editHotkeyModalTitle: 'Edit Shortcut',
            editHotkeyModalHint: 'Press the shortcut key...',
            editHotkeyModalContent: 'Please press the shortcut key combination you want to set',
            editHotkeyModalCancelBtn: 'Cancel',
            editHotkeyModalConfirmBtn: 'Confirm',
            saveSuccessMsg: 'Save Success',
            saveFailedMsg: 'Save Failed',
            shortcutSaveErrorMsg: 'Save Shortcut Settings Failed: ',
            resetSuccessMsg: 'Reset Success',
        }
    }
}

export const languages: LanguageConfig[] = [
    zhCN,
    enUS,
]

export function getLanguageById(id: string): LanguageConfig {
    return languages.find(language => language.id === id) || zhCN;
}


// 创建语言注入键
export const LanguageKey = Symbol('language') as InjectionKey<{
    currentLanguage: any;
    setLanguage: (languageId: string) => void;
    languageTexts: any;
}>;

// 全局语言上下文引用
let globalLanguageContext: ReturnType<typeof createLanguageContext> | null = null;

let currentLanguageId: string = '';

// 语言初始化，由于createLanguageContext执行早于ipc通信，所以这里需要重新设置语言
window.ipcRenderer.on('init-language', (_event, language) => {
    if(currentLanguageId === language) {
        console.log('[渲染进程] 接收项目初始化语言，当前语言id和配置文件中的语言id一致，不做处理')
        return;
    }
    // 如果语言上下文已创建，则更新语言
    if (globalLanguageContext) {
        globalLanguageContext.setLanguage(language);
    }
});

// 创建语言上下文
export function createLanguageContext() {
    // 优先使用配置文件中的语言，其次使用本地存储的语言，最后使用默认语言
    const localStorageLanguageId = localStorage.getItem('language-id');
    const savedLanguageId = localStorageLanguageId || 'chinese';
    currentLanguageId = savedLanguageId;
    // 使用ref使currentLanguageItem成为响应式引用
    const currentLanguageItem = ref<LanguageConfig>(languages.find(l => l.id === savedLanguageId) || zhCN);
    console.log('[渲染进程] 初始化语言上下文，当前的语言：', currentLanguageItem.value)

    // 创建一个新的文本对象，避免数据被覆盖，使用reactive使其成为响应式对象
    const languageTexts = reactive({ ...currentLanguageItem.value.type });

    // 设置语言的方法
    const setLanguage = (languageId: string) => {
        const language = languages.find(l => l.id === languageId);
        console.log('[语言切换] 切换的语言：', language)
        if (language) {
            // 创建一个新的语言对象，确保响应式更新
            const newLanguage = { ...language };
            // 更新响应式引用
            currentLanguageItem.value = newLanguage;
            localStorage.setItem('language-id', languageId);

            // 更新响应式languageTexts对象 - 使用Object.assign替换整个对象以确保响应式更新
            Object.assign(languageTexts, language.type);
        }
    };

    // 提供语言上下文
    provide(LanguageKey, {
        currentLanguage: currentLanguageItem,
        setLanguage,
        languageTexts,
    });

    // 保存全局引用，以便IPC消息可以更新语言
    globalLanguageContext = {
        currentLanguage: currentLanguageItem,
        setLanguage,
        languageTexts,
    };

    return {
        currentLanguage: currentLanguageItem,
        setLanguage,
        languageTexts,
    };
}

// 使用语言上下文的钩子
export function useLanguage() {
    const language = inject(LanguageKey);
    if (!language) {
        console.warn('useLanguage() 在LanguageProvider外部被调用，返回默认语言');
        // 返回基于zhCN的默认语言对象
        const defaultLanguageItem = ref<LanguageConfig>(zhCN);
        const defaultLanguageTexts = reactive({ ...zhCN.type });

        // 创建一个默认的setLanguage函数，它会在控制台输出警告但不执行任何操作
        const defaultSetLanguage = (_languageId: string) => {
            console.warn('在LanguageProvider外部调用setLanguage无效');
        };

        return {
            currentLanguage: defaultLanguageItem,
            setLanguage: defaultSetLanguage,
            languageTexts: defaultLanguageTexts,
        };
    }
    return language;
}
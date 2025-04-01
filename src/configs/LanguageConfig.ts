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
        disableHardwareAcceleration: string;
        // 存储设置页面文字
        tempPath: string;
        maxHistoryItems: string,
        maxStorageSize: string,
        autoCleanupDays: string,
        maxItemSize: string,
        // 快捷键设置页面文字
        search: string;
        wakeUpRoutine: string;
        emptyShortcutConfig: string;
        // 设置页面底部按钮
        resetBtn: string;
        saveBtn: string;
        // 确认重启弹窗内容
        restartModalTitle: string;
        restartModalContent: string;
        restartModalCancelBtn: string;
        restartModalConfirmBtn: string;
        // 硬件加速设置对话框内容
        hardwareAccelerationDialogTitle: string;
        hardwareAccelerationDialogContent: string;
        hardwareAccelerationDialogRestartNow: string;
        hardwareAccelerationDialogRestartLater: string;
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
    },
    list: {
        title: string;
        copyFailedMsg: string;
        searchHint: string;
        deleteBtn: string;
        bindTagBtn: string;
        menu: {
            program: string;
            settings: string;
            reload: string;
            exit: string;
            data: string;
            tagManger: string;
            dataView: string;
            dataImport: string;
            dataExport: string;
            clearData: string;
            clearDataSuccessMsg: string;
            clearDataFailedMsg: string;
            themes: string;
            light: string;
            dark: string;
            blue: string;
            pink: string;
            help: string;
            instructions: string;
            updateLog: string;
            checkForUpdate: string;
            about: string;
        },
    },
    tags: {
        title: string;
        addTitle: string;
        editTitle: string;
        tagName: string;
        tagNameHint: string;
        tagColor: string;
        saveBtn: string;
        cancelBtn: string;
        loadFailedMsg: string;
        tageNameIsNullWarnMsg: string;
        saveSuccessMsg: string;
        editSuccessMsg: string;
        saveFailedMsg: string;
        editFailedMsg: string;
        deleteSuccessMsg: string;
        deleteFailedMsg: string;
    },
    about: {
        title: string;
        appName: string;
        version: string;
        problemFeedback: string;
    },
    update: {
        title: string;
        versionName: string;
        updateNotes: string;
        notUpdateBtn: string;
        reminderText: string;
        days: string;
        downloadNowBtn: string;
        restartLaterBtn: string;
        restartImmediatelyBtn: string;
        viewMoreBtn: string;
        downloadingTitle: string;
        backupTitle: string;
        backupCompleted: string;
    },
    restore: {
        title: string;
        description: string;
        readyText: string;
        startingText: string;
        restartCountdown: string;
        setp1: string;
        setp2: string;
        setp3: string;
        setp4: string;
        restoreSuccess: string;
        toRestart: string;
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
            devTools: '开发者工具',
            disableHardwareAcceleration: '禁用硬件加速',
            tempPath: '临时文件路径',
            maxHistoryItems: '最大历史记录数',
            maxStorageSize: '最大存储空间(MB)',
            autoCleanupDays: '自动清理天数',
            maxItemSize: '单项最大大小(MB)',
            search: '搜索',
            wakeUpRoutine: '唤醒程序',
            emptyShortcutConfig: '暂无快捷键配置',
            resetBtn: '重置',
            saveBtn: '保存',
            restartModalTitle: '重启确认',
            restartModalContent: '部分设置需要重启程序后生效，是否现在重启？',
            restartModalCancelBtn: '稍后重启',
            restartModalConfirmBtn: '现在重启',
            hardwareAccelerationDialogTitle: '需要重启',
            hardwareAccelerationDialogContent: '禁用硬件加速设置已更改，需要重启应用才能生效。',
            hardwareAccelerationDialogRestartNow: '现在重启',
            hardwareAccelerationDialogRestartLater: '稍后重启',
            editHotkeyModalTitle: '编辑快捷键',
            editHotkeyModalHint: '按下快捷键...',
            editHotkeyModalContent: '请按下您想要设置的快捷键组合',
            editHotkeyModalCancelBtn: '取消',
            editHotkeyModalConfirmBtn: '确认',
            saveSuccessMsg: '保存成功',
            saveFailedMsg: '保存失败',
            shortcutSaveErrorMsg: '保存快捷键设置失败: ',
            resetSuccessMsg: '已重置',
        },
        list: {
            title: '剪贴板',
            copyFailedMsg: '复制失败',
            searchHint: '输入关键词搜索',
            deleteBtn: '删除',
            bindTagBtn: '绑定标签',
            menu: {
                program: '程序',
                settings: '偏好设置',
                reload: '重新加载',
                exit: '关闭',
                data: '数据',
                tagManger: '标签管理',
                dataView: '数据视图',
                dataImport: '数据导入',
                dataExport: '数据导出',
                clearData: '清空剪贴板',
                clearDataSuccessMsg: '清空历史记录成功',
                clearDataFailedMsg: '清空历史记录失败',
                themes: '主题',
                light: '浅色',
                dark: '深色',
                blue: '蓝色',
                pink: '粉色',
                help: '帮助',
                instructions: '使用说明',
                updateLog: '更新日志',
                checkForUpdate: '检查更新',
                about: '关于',
            }
        },
        tags: {
            title: '标签管理',
            addTitle: '添加标签',
            editTitle: '编辑标签',
            tagName: '标签名称',
            tagNameHint: '请输入标签名称',
            tagColor: '标签颜色',
            saveBtn: '保存',
            cancelBtn: '取消',
            loadFailedMsg: '加载标签列表失败',
            tageNameIsNullWarnMsg: '标签名称不能为空',
            saveSuccessMsg: '保存成功',
            editSuccessMsg: '更新成功',
            saveFailedMsg: '保存失败',
            editFailedMsg: '更新失败',
            deleteSuccessMsg: '删除成功',
            deleteFailedMsg: '删除失败', 
        },
        about: {
            title: '关于',
            appName: '剪贴板',
            version: '版本',
            problemFeedback: '问题反馈', 
        },
        update: {
            title: '更新',
            versionName: '新版本',
            updateNotes: '暂无更新说明',
            notUpdateBtn: '暂不更新',
            reminderText: '下次提醒时间：',
            days: '天后',
            downloadNowBtn: '立即下载',
            restartLaterBtn: '稍后重启',
            restartImmediatelyBtn: '立即重启',
            viewMoreBtn: '查看更多',
            downloadingTitle: '下载更新中',
            backupTitle: '备份用户数据',
            backupCompleted: '备份完成',
        },
        restore: {
            title: '数据恢复',
            description: '检测到上次更新后的备份数据，正在自动恢复中...',
            readyText: '准备恢复数据',
            startingText: '开始恢复数据',
            restartCountdown: ' 秒后重新启动程序 ~',
            setp1: '恢复备份文件',
            setp2: '恢复备份数据',
            setp3: '恢复用户配置',
            setp4: '删除备份文件',
            restoreSuccess: '恢复完成，准备删除备份文件',
            toRestart: '备份文件已删除，即将重启程序',
        }
    },
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
            disableHardwareAcceleration: 'Disable Hardware Acceleration',
            tempPath: 'Temporary File Path',
            maxHistoryItems: 'Max History Items',
            maxStorageSize: 'Max Storage Size (MB)',
            autoCleanupDays: 'Auto Cleanup Days',
            maxItemSize: 'Max Item Size (MB)',
            search: 'Search',
            wakeUpRoutine: 'Wake Up Routine',
            emptyShortcutConfig: 'No Shortcut Config',
            resetBtn: 'Reset',
            saveBtn: 'Save',
            restartModalTitle: 'Restart Confirmation',
            restartModalContent: 'Some settings require restarting the program to take effect. Do you want to restart now?',
            restartModalCancelBtn: 'Restart Later',
            restartModalConfirmBtn: 'Now Restart',
            hardwareAccelerationDialogTitle: 'Restart Required',
            hardwareAccelerationDialogContent: 'Hardware acceleration setting has been changed. Application needs to restart to apply changes.',
            hardwareAccelerationDialogRestartNow: 'Restart Now',
            hardwareAccelerationDialogRestartLater: 'Restart Later',
            editHotkeyModalTitle: 'Edit Shortcut',
            editHotkeyModalHint: 'Press the shortcut key...',
            editHotkeyModalContent: 'Please press the shortcut key combination you want to set',
            editHotkeyModalCancelBtn: 'Cancel',
            editHotkeyModalConfirmBtn: 'Confirm',
            saveSuccessMsg: 'Save Success',
            saveFailedMsg: 'Save Failed',
            shortcutSaveErrorMsg: 'Save Shortcut Settings Failed: ',
            resetSuccessMsg: 'Reset Success',
        },
        list: {
            title: 'Clipboard',
            copyFailedMsg: 'Copy Failed',
            searchHint: 'Input keywords to search',
            deleteBtn: 'Delete',
            bindTagBtn: 'Bind Tag',
            menu: {
                program: 'Program',
                settings: 'Settings',
                reload: 'Reload',
                exit: 'Exit',
                data: 'Data',
                tagManger: 'Tag Manager',
                dataView: 'Data View',
                dataImport: 'Data Import',
                dataExport: 'Data Export',
                clearData: 'Clear Data',
                clearDataSuccessMsg: 'Clear Data Success',
                clearDataFailedMsg: 'Clear Data Failed',
                themes: 'Themes',
                light: 'Light',
                dark: 'Dark',
                blue: 'Blue',
                pink: 'Pink',
                help: 'Help',
                instructions: 'Instructions',
                updateLog: 'Update Log',
                checkForUpdate: 'Check For Update',
                about: 'About',
            }
        },
        tags: {
            title: 'Tag Manager',
            addTitle: 'Add Tag',
            editTitle: 'Edit Tag',
            tagName: 'Tag Name',
            tagNameHint: 'Please input tag name',
            tagColor: 'Tag Color',
            saveBtn: 'Save',
            cancelBtn: 'Cancel',
            loadFailedMsg: 'Load Tag List Failed',
            tageNameIsNullWarnMsg: 'Tag Name Cannot Be Empty',
            saveSuccessMsg: 'Save Success',
            editSuccessMsg: 'Update Success',
            saveFailedMsg: 'Save Failed',
            editFailedMsg: 'Update Failed',
            deleteSuccessMsg: 'Delete Success',
            deleteFailedMsg: 'Delete Failed',
        },
        about: {
            title: 'About',
            appName: 'Clipboard',
            version: 'Version',
            problemFeedback: 'Problem Feedback', 
        },
        update: {
            title: 'Update',
            versionName: 'Version',
            updateNotes: 'No Update Notes',
            notUpdateBtn: 'Not Update',
            reminderText: 'Next reminder time: ',
            days: ' days',
            downloadNowBtn: 'Download Now',
            restartLaterBtn: 'Restart Later',
            restartImmediatelyBtn: 'Restart Immediately',
            viewMoreBtn: 'View More',
            downloadingTitle: 'Downloading Update',
            backupTitle: 'Backing Up User Data',
            backupCompleted: 'Backup Completed'
        },
        restore: {
            title: 'Data Recovery',
            description: 'Detected backup data from previous update, starting automatic recovery...',
            readyText: 'Ready to restore data',
            startingText: 'Starting to restore data',
            restartCountdown:'seconds to restart program ~',
            setp1: 'Restore backup file',
            setp2: 'Restore backup data',
            setp3: 'Restore user configuration',
            setp4: 'Delete backup file',
            restoreSuccess: 'Recovery completed, preparing to delete backup file',
            toRestart: 'Backup file deleted, restarting program in',
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
    if (currentLanguageId === language) {
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

export interface LanguageConfig {
    tray: TrayLanguageConfig,
    update: UpdateLanguageConfig,
}

export interface TrayLanguageConfig {
    settings: string,
    checkUpdate: string,
    about: string,
    restart: string,
    exit: string,
    clipboardTooltip: string,
}

export interface UpdateLanguageConfig {
    checking: string,
    upToDateText: string,
    checkFailure: string,
    unknown: string,
}

const chineseTexts = {
    tray: {
        settings: '偏好设置',
        checkUpdate: '检查更新',
        about: '关于',
        restart: '重新启动',
        exit: '退出',
        clipboardTooltip: '我的剪贴板'
    },
    update: {
        checking: '检查更新',
        upToDateText: '当前已是最新版本',
        checkFailure: '检查更新失败',
        unknown: '未知错误',
    }
}

const englishTexts = {
    tray: {
        settings: 'Preferences',
        checkUpdate: 'Check for Updates',
        about: 'About',
        restart: 'Restart',
        exit: 'Exit',
        clipboardTooltip: 'My Clipboard'
    },
    update: {
        checking: 'Checking for updates',
        upToDateText: 'You are using the latest version',
        checkFailure: 'Check for updates failed',
        unknown: 'Unknown error',
    }
}

export function getTrayText(language: string) {
    switch (language) {
        case 'chinese':
            return chineseTexts.tray
        case 'english':
            return englishTexts.tray
        default:
            return chineseTexts.tray
    }
}

export function getUpdateText(language: string) {
    switch (language) {
        case 'chinese':
            return chineseTexts.update
        case 'english':
            return englishTexts.update
        default:
            return chineseTexts.update
    }
}
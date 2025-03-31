export interface LanguageConfig {
    tray: TrayLanguageConfig,
    update: UpdateLanguageConfig,
    hardwareAcceleration: HardwareAccelerationDialogConfig,
}

export interface TrayLanguageConfig {
    settings: string,
    checkUpdate: string,
    about: string,
    restart: string,
    exit: string,
    clipboardTooltip: string,
    disableHardwareAcceleration: string,
}

export interface UpdateLanguageConfig {
    checking: string,
    upToDateText: string,
    checkFailure: string,
    unknown: string,
}

export interface HardwareAccelerationDialogConfig {
    title: string,
    message: string,
    restartNow: string,
    restartLater: string,
}

const chineseTexts = {
    tray: {
        settings: '偏好设置',
        checkUpdate: '检查更新',
        about: '关于',
        restart: '重新启动',
        exit: '退出',
        clipboardTooltip: '我的剪贴板',
        disableHardwareAcceleration: '禁用硬件加速'
    },
    update: {
        checking: '检查更新',
        upToDateText: '当前已是最新版本',
        checkFailure: '检查更新失败',
        unknown: '未知错误',
    },
    hardwareAcceleration: {
        title: '需要重启',
        message: '禁用硬件加速设置已更改，需要重启应用才能生效。',
        restartNow: '现在重启',
        restartLater: '稍后重启',
    }
}

const englishTexts = {
    tray: {
        settings: 'Preferences',
        checkUpdate: 'Check for Updates',
        about: 'About',
        restart: 'Restart',
        exit: 'Exit',
        clipboardTooltip: 'My Clipboard',
        disableHardwareAcceleration: 'Disable Hardware Acceleration'
    },
    update: {
        checking: 'Checking for updates',
        upToDateText: 'You are using the latest version',
        checkFailure: 'Check for updates failed',
        unknown: 'Unknown error',
    },
    hardwareAcceleration: {
        title: 'Restart Required',
        message: 'Hardware acceleration setting has been changed. Application needs to restart to apply changes.',
        restartNow: 'Restart Now',
        restartLater: 'Restart Later',
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

export function getHardwareAccelerationDialogText(language: string) {
    switch (language) {
        case 'chinese':
            return chineseTexts.hardwareAcceleration
        case 'english':
            return englishTexts.hardwareAcceleration
        default:
            return chineseTexts.hardwareAcceleration
    }
}
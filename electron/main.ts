import { app, BrowserWindow, clipboard, ipcMain, Menu, nativeImage, screen, shell, Tray } from 'electron'
import fs from 'fs-extra'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { computed } from 'vue'
import { getSettings, getShortcutKeys, getTempPath, updateSettings, updateShortcutKeys } from './FileManager.js'
import ClipboardDB from './db.js'
import log from './log.js'
import ShortcutManager from './shortcutManager.js'
import { getUpdaterService, initUpdaterService } from './updater.js'
import { getTrayText, getHardwareAccelerationDialogText } from './languages.js'
import BackupManager from './BackupManager.js'
process.env['ELECTRON_DISABLE_SECURITY_WARNINGS'] = 'true'

// 在应用启动前读取设置并应用硬件加速设置
try {
    const userSettings = getSettings();
    if (userSettings && userSettings.disableHardwareAcceleration) {
        log.info("[主进程] 读取到禁用硬件加速设置，将禁用硬件加速");
        app.disableHardwareAcceleration();
    }
} catch (error) {
    log.error("[主进程] 读取硬件加速设置失败:", error);
}

app.commandLine.appendSwitch('disable-http-cache'); // 禁用 HTTP 缓存
app.commandLine.appendSwitch('enable-features', 'LayoutNG'); // 启用新的布局引擎

let __dirname = path.dirname(fileURLToPath(import.meta.url))
log.info("[主进程] 程序文件夹位置", __dirname);

// The built directory structure
//
// ├─┬─┬ dist
// │ │ └── index.html
// │ │
// │ ├─┬ dist-electron
// │ │ ├── main.js
// │ │ └── preload.mjs
// │
process.env.APP_ROOT = path.join(__dirname, '..')

// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST

const env = process.env.NODE_ENV;
log.info("[主进程] 运行环境：", process.env.NODE_ENV)
if (env !== 'development') {
    __dirname = __dirname.replace("\\app.asar\\dist-electron", "");
}

if (process.platform === 'win32') {
    app.setAppUserModelId('com.lin.clipboard'); // 替换为你的应用唯一标识符
}

let mainWindow: BrowserWindow | undefined
let settingsWindow: BrowserWindow | undefined
let tagsWindow: BrowserWindow | undefined
let newUpdateWindow: BrowserWindow | undefined
let aboutWindow: BrowserWindow | undefined
let isHideWindow = false;
let isOpenMianDevTools = false;
let isOpenSettingsDevTools = false;
let isOpenTagsDevTools = false;
let isOpenAboutDevTools = false;
let x: number | undefined = undefined;
let y: number | undefined = undefined;
let wakeUpRoutineShortcut: ShortcutManager; // 唤醒程序快捷键
let isFixedMainWindow = false; // 是否固定窗口大小
const devtoolConfig: any = {
    isDev: env === 'development',
    //    isDev: false,
    isShow: false,
}

const config: any = computed(() => getSettings());
const shortcutKeys: any = computed(() => getShortcutKeys());

function createMainWindow() {
    // 检查是否已经打开了更新窗口
    const existingWindows = BrowserWindow.getAllWindows();
    // @ts-ignore
    const window = existingWindows.find(win => win.uniqueId === 'main-window');
    if (window) {
        window.focus();
        return;
    }

    // 获取屏幕尺寸和鼠标位置
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.workAreaSize;
    const mousePos = screen.getCursorScreenPoint();

    // 使用配置文件中保存的窗口尺寸，如果没有则使用默认值
    const windowWidth = config.value.windowWidth || 400;
    const windowHeight = config.value.windowHeight || 600;

    if (isHideWindow) { } else {
        // 计算窗口的x坐标
        x = mousePos.x - windowWidth / 2; // 默认窗口中心对齐鼠标
        if (x < 0) { // 如果超出左边界
            x = 0;
        } else if (x + windowWidth > width) { // 如果超出右边界
            x = width - windowWidth;
        }

        // 计算窗口的y坐标
        y = mousePos.y - windowHeight / 2; // 默认窗口中心对齐鼠标
        if (y < 0) { // 如果超出上边界
            y = 0;
        } else if (y + windowHeight > height) { // 如果超出下边界
            y = height - windowHeight;
        }
    }

    mainWindow = new BrowserWindow({
        icon: path.join(process.env.VITE_PUBLIC, 'logo.png'),
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: true,
            preload: path.join(path.dirname(fileURLToPath(import.meta.url)), 'preload.mjs'),
            defaultEncoding: 'utf8', // 设置默认编码为 UTF-8
        },
        width: windowWidth,
        height: windowHeight,
        frame: false,
        resizable: !Boolean(config.value.fixedWindowSize),
        x: x,
        y: y,
        transparent: false
    })

    // @ts-ignore
    mainWindow.uniqueId = 'main-window';

    // 窗口置顶
    // 这个设置允许在Keynote演示模式下显示在顶部。BrowserWindow中有一项alwaysOnTop。
    // 当我设置为true时，其他应用程序会被覆盖在顶部，但Keynote演示模式下不行。
    // 所以我需要设置mainWindow.setAlwaysOnTop(true, "screen-saver")。
    mainWindow.setAlwaysOnTop(true, "screen-saver")
    // 这个设置允许在切换到其他工作区时显示。
    mainWindow.setVisibleOnAllWorkspaces(true)

    // 添加窗口失去焦点事件监听
    if (Boolean(config.value.colsingHideToTaskbar)) {
        mainWindow.on('blur', () => {
            onBlur()
        });
    }

    if (VITE_DEV_SERVER_URL) {
        mainWindow.loadURL(VITE_DEV_SERVER_URL)
        log.info("[主进程] 加载url页面", VITE_DEV_SERVER_URL)
    } else {
        // win.loadFile('dist/index.html')
        mainWindow.loadFile(path.join(RENDERER_DIST, 'index.html'))
        log.info("[主进程] 加载index.html页面", path.join(RENDERER_DIST, 'index.html'))
    }

    if (shortcutKeys.value.wakeUpRoutine) {
        log.info('[主进程] 注册唤醒程序快捷键:', shortcutKeys.value.wakeUpRoutine.key.join("+"));
        wakeUpRoutineShortcut = new ShortcutManager(mainWindow, shortcutKeys.value.wakeUpRoutine.key.join("+"));
        wakeUpRoutineShortcut.loadShortcuts();
    }

    // 打开调试工具，设置为单独窗口
    // win.webContents.openDevTools({ mode: 'detach' });


    const savedTheme = config.value.theme || 'light';
    log.info('[主进程] 读取到的主题配置:', savedTheme);
    const savedLanguage = config.value.languages || 'chinese';
    log.info('[主进程] 读取到的语言配置:', savedLanguage);

    // 在页面加载完成后发送主题设置
    mainWindow.webContents.on('did-finish-load', () => {
        mainWindow?.webContents.send('window-type', 'list');
        mainWindow?.webContents.send('init-themes', savedTheme);
        mainWindow?.webContents.send('init-language', savedLanguage);
        const db = ClipboardDB.getInstance()
        const tags = db?.getAllTags();
        mainWindow?.webContents.send('load-tag-items', tags);
        mainWindow?.webContents.send('load-shortcut-keys', shortcutKeys.value);
        mainWindow?.webContents.send('load-settings', config.value);
        mainWindow?.webContents.send('show-devtool', devtoolConfig);
        // 启动剪贴板监听
        log.info('[主进程] 窗口加载完成，开始监听剪贴板');
        watchClipboard();
    });

    // 监听窗口关闭事件，清理定时器
    mainWindow.on('closed', () => {
        if (clipboardTimer) {
            clearTimeout(clipboardTimer);
            clipboardTimer = null;
        }
    });

    //创建系统托盘右键菜单
    createTray(mainWindow);

    // 设置应用程序开机自启动
    app.setLoginItemSettings({
        openAtLogin: Boolean(config.value.powerOnSelfStart),
        openAsHidden: false, // 设置为 true 可以隐藏启动时的窗口
        args: [] // 自定义参数
    });

    // 初始化更新服务
    initUpdaterService(savedLanguage);

    // 临时文件位置没有设置，设置成当前程序的根目录为临时文件夹位置
    if (!config.value.tempPath) {
        const tempDir = getTempPath();
        config.value.tempPath = tempDir;
        updateSettings(config.value);
    }

    // 监听打开开发者工具的请求
    ipcMain.on('open-main-tools', () => {
        log.info('[主进程] 打开开发者工具');
        if (mainWindow) {
            // 打开调试工具，设置为单独窗口
            mainWindow.webContents.openDevTools({ mode: 'detach' });
            isOpenMianDevTools = true;

            // 监听DevTools关闭事件
            mainWindow.webContents.once('devtools-closed', () => {
                log.info('[主进程] 开发者工具已关闭');
                isOpenMianDevTools = false;
            });
        }
    });

    // 监听重新加载应用程序的请求
    ipcMain.on('reload-app', () => {
        log.info('[主进程] 重新加载应用程序');
        if (mainWindow) {
            mainWindow.reload();
        }
    });

    // 监听退出应用程序的请求
    ipcMain.on('quit-app', () => {
        log.info('[主进程] 退出应用程序');
        app.quit();
    });

    // 监听关闭窗口的请求
    ipcMain.on('close-app', () => {
        closeOrHide();
    });

    // 监听重启应用的请求
    // todo：测试环境重启有bug，重启后会白屏，原因：测试环境会停止vue端口服务，重新启动时没有重启vue服务，导致地址无法访问
    ipcMain.on('restart-app', () => {
        // 重置窗口状态变量，确保重启后能正确创建窗口
        restartAPP()
    });

    // 打开设置窗口
    ipcMain.on('open-settings', createSettingsWindow);

    // 打开标签管理窗口
    ipcMain.on('open-tags', createTagsWindow);

    // 打开标签管理窗口
    ipcMain.on('open-about', createAboutWindow);
}

// 创建设置窗口
function createSettingsWindow() {
    // 检查是否已经打开了更新窗口
    const existingWindows = BrowserWindow.getAllWindows();
    // @ts-ignore
    const window = existingWindows.find(win => win.uniqueId === 'settings-window');
    if (window) {
        window.focus();
        return;
    }

    settingsWindow = new BrowserWindow({
        width: 650,
        height: 500,
        frame: false,
        resizable: false,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: true,
            preload: path.join(path.dirname(fileURLToPath(import.meta.url)), 'preload.mjs'),
            defaultEncoding: 'utf8', // 设置默认编码为 UTF-8
        },
        icon: path.join(process.env.VITE_PUBLIC, 'logo.png'),
        transparent: false,
        parent: mainWindow,
    });

    // 窗口居中显示
    settingsWindow.center();

    // @ts-ignore
    settingsWindow.uniqueId = 'settings-window';

    if (VITE_DEV_SERVER_URL) {
        settingsWindow.loadURL(VITE_DEV_SERVER_URL)
    } else {
        // win.loadFile('dist/index.html')
        settingsWindow.loadFile(path.join(RENDERER_DIST, 'index.html'))
    }

    // 打开调试工具，设置为单独窗口
    // settingsWindow.webContents.openDevTools({ mode: 'detach' });

    // 在页面加载完成后发送主题设置
    settingsWindow.webContents.on('did-finish-load', () => {
        settingsWindow?.webContents.send('window-type', 'settings');
        settingsWindow?.webContents.send('load-config', getSettings());
        settingsWindow?.webContents.send('load-shortcut-keys', shortcutKeys.value);
        settingsWindow?.webContents.send('show-devtool', devtoolConfig);
    });

    // 当窗口关闭时，移除事件监听器
    settingsWindow.on('closed', () => {
        // 检查是否已经打开了更新窗口
        const existingWindows = BrowserWindow.getAllWindows();
        // @ts-ignore
        const window = existingWindows.find(win => win.uniqueId === 'main-window');
        if (window) {
            window.focus();
        }
    });

    ipcMain.on('close-settings', () => {
        if (!settingsWindow?.isDestroyed()) {
            settingsWindow?.close();
        }
    });

    // 监听打开开发者工具的请求
    ipcMain.on('open-settings-devtools', () => {
        if (settingsWindow && !settingsWindow.isDestroyed()) {
            isOpenSettingsDevTools = true;
            settingsWindow.webContents.openDevTools({ mode: 'detach' });

            // 监听DevTools关闭事件
            settingsWindow.webContents.once('devtools-closed', () => {
                log.info('[主进程] 设置窗口开发者工具已关闭');
                isOpenSettingsDevTools = false;
            });
        }
    });

}

// 创建标签管理窗口
function createTagsWindow() {
    // 检查是否已经打开了更新窗口
    const existingWindows = BrowserWindow.getAllWindows();
    // @ts-ignore
    const window = existingWindows.find(win => win.uniqueId === 'tags-window');
    if (window) {
        window.focus();
        return;
    }

    tagsWindow = new BrowserWindow({
        width: 650,
        height: 500,
        frame: false,
        resizable: false,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: true,
            preload: path.join(path.dirname(fileURLToPath(import.meta.url)), 'preload.mjs'),
            defaultEncoding: 'utf8', // 设置默认编码为 UTF-8
        },
        icon: path.join(process.env.VITE_PUBLIC, 'logo.png'),
        transparent: false,
        parent: mainWindow,
    });

    // 窗口居中显示
    tagsWindow.center();

    // @ts-ignore
    tagsWindow.uniqueId = 'tags-window';

    if (VITE_DEV_SERVER_URL) {
        tagsWindow.loadURL(VITE_DEV_SERVER_URL)
    } else {
        // win.loadFile('dist/index.html')
        tagsWindow.loadFile(path.join(RENDERER_DIST, 'index.html'))
    }

    // 打开调试工具，设置为单独窗口
    // tagsWindow.webContents.openDevTools({ mode: 'detach' });

    // 在页面加载完成后发送主题设置
    tagsWindow.webContents.on('did-finish-load', () => {
        tagsWindow?.webContents.send('window-type', 'tags');
        tagsWindow?.webContents.send('show-devtool', devtoolConfig);
    });

    // 当窗口关闭时，移除事件监听器
    tagsWindow.on('closed', () => {
        // 检查是否已经打开了更新窗口
        const existingWindows = BrowserWindow.getAllWindows();
        // @ts-ignore
        const window = existingWindows.find(win => win.uniqueId === 'main-window');
        if (window) {
            window.focus();
        }
    });

    // 监听关闭窗口的请求
    ipcMain.on('close-tags', () => {
        if (!tagsWindow?.isDestroyed()) {
            tagsWindow?.close();
        }
    });

    // 监听打开开发者工具的请求
    ipcMain.on('open-tags-devtools', () => {
        if (tagsWindow && !tagsWindow.isDestroyed()) {
            isOpenTagsDevTools = true;
            tagsWindow.webContents.openDevTools({ mode: 'detach' });

            // 监听DevTools关闭事件
            tagsWindow.webContents.once('devtools-closed', () => {
                log.info('[主进程] 标签窗口开发者工具已关闭');
                isOpenTagsDevTools = false;
            });
        }
    });
}

// 创建更新窗口
export function createUpdateWindow() {
    // 检查是否已经打开了更新窗口
    const existingWindows = BrowserWindow.getAllWindows();
    // @ts-ignore
    const updateWindow = existingWindows.find(win => win.uniqueId === 'update-window');
    if (updateWindow) {
        updateWindow.focus();
        return;
    }

    newUpdateWindow = new BrowserWindow({
        width: 600,
        height: 500,
        frame: false,
        resizable: false,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: true,
            preload: path.join(path.dirname(fileURLToPath(import.meta.url)), 'preload.mjs'),
            defaultEncoding: 'utf8', // 设置默认编码为 UTF-8
        },
        icon: path.join(process.env.VITE_PUBLIC, 'logo.png'),
        transparent: false,
    });

    // 窗口居中显示
    newUpdateWindow.center();
    // 自定义属性
    // @ts-ignore
    newUpdateWindow.uniqueId = 'update-window';

    if (VITE_DEV_SERVER_URL) {
        newUpdateWindow.loadURL(VITE_DEV_SERVER_URL)
    } else {
        newUpdateWindow.loadFile(path.join(RENDERER_DIST, 'index.html'))
    }

    // 打开调试工具，设置为单独窗口
    // aboutWindow.webContents.openDevTools({ mode: 'detach' });

    // 在页面加载完成后发送窗口类型
    newUpdateWindow.webContents.on('did-finish-load', () => {
        newUpdateWindow?.webContents.send('window-type', 'update');
        newUpdateWindow?.webContents.send('show-devtool', devtoolConfig);
    });

    // 当窗口关闭时，移除事件监听器
    newUpdateWindow.on('closed', () => {
        // 窗口关闭时的清理工作
        // 检查是否已经打开了更新窗口
        const existingWindows = BrowserWindow.getAllWindows();
        // @ts-ignore
        const window = existingWindows.find(win => win.uniqueId === 'main-window');
        if (window) {
            window.focus();
        }
    });

    // 监听关闭窗口的请求
    ipcMain.on('close-update', () => {
        if (!newUpdateWindow?.isDestroyed()) {
            newUpdateWindow?.close();
        }
    });

    // 监听打开开发者工具的请求
    ipcMain.on('open-update-devtools', () => {
        if (newUpdateWindow && !newUpdateWindow.isDestroyed()) {
            // isOpenAboutDevTools = true;
            newUpdateWindow.webContents.openDevTools({ mode: 'detach' });

            // 监听DevTools关闭事件
            newUpdateWindow.webContents.once('devtools-closed', () => {
                log.info('[主进程] 关于窗口开发者工具已关闭');
                // isOpenAboutDevTools = false;
            });
        }
    });

    // 监听关闭窗口的请求
    ipcMain.on('minimize-update', () => {
        if (!newUpdateWindow?.isDestroyed()) {
            newUpdateWindow?.minimize();
        }
    });
}

// 创建恢复窗口
export function createRestoreWindow(theme: string, languages: string) {
    // 检查是否已经打开了恢复窗口
    const existingWindows = BrowserWindow.getAllWindows();
    // @ts-ignore
    const window = existingWindows.find(win => win.uniqueId === 'restore-window');
    if (window) {
        window.focus();
        return;
    }

    const restoreWindow = new BrowserWindow({
        width: 400,
        height: 500,
        frame: false,
        resizable: false,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: true,
            preload: path.join(path.dirname(fileURLToPath(import.meta.url)), 'preload.mjs'),
            defaultEncoding: 'utf8', // 设置默认编码为 UTF-8
        },
        icon: path.join(process.env.VITE_PUBLIC, 'logo.png'),
        transparent: false,
    });

    // 窗口居中显示
    restoreWindow.center();

    // @ts-ignore
    restoreWindow.uniqueId = 'restore-window';

    if (VITE_DEV_SERVER_URL) {
        restoreWindow.loadURL(VITE_DEV_SERVER_URL)
    } else {
        restoreWindow.loadFile(path.join(RENDERER_DIST, 'index.html'))
    }

    // 在页面加载完成后发送窗口类型
    restoreWindow.webContents.on('did-finish-load', () => {
        restoreWindow.webContents.send('window-type', 'restore');
        restoreWindow.webContents.send('show-devtool', devtoolConfig);
        restoreWindow.webContents.send('init-themes', theme);
        restoreWindow.webContents.send('init-language', languages);
    });

    // 监听恢复完成事件
    ipcMain.on('restore-completed', () => {
        log.info('[主进程] 恢复完成，重新启动程序');
        restartAPP();
    });

    // 监听打开开发者工具的请求
    ipcMain.on('open-restore-devtools', () => {
        if (restoreWindow && !restoreWindow.isDestroyed()) {
            restoreWindow.webContents.openDevTools({ mode: 'detach' });

            // 监听DevTools关闭事件
            restoreWindow.webContents.once('devtools-closed', () => {
                log.info('[主进程] 恢复窗口开发者工具已关闭');
            });
        }
    });
}

// 创建标签管理窗口
function createAboutWindow() {
    // 检查是否已经打开了更新窗口
    const existingWindows = BrowserWindow.getAllWindows();
    // @ts-ignore
    const window = existingWindows.find(win => win.uniqueId === 'about-window');
    if (window) {
        window.focus();
        return;
    }

    aboutWindow = new BrowserWindow({
        width: 350,
        height: 270,
        frame: false,
        resizable: false,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: true,
            preload: path.join(path.dirname(fileURLToPath(import.meta.url)), 'preload.mjs'),
            defaultEncoding: 'utf8', // 设置默认编码为 UTF-8
        },
        icon: path.join(process.env.VITE_PUBLIC, 'logo.png'),
        transparent: false,
        parent: mainWindow,
    });

    // 窗口居中显示
    aboutWindow.center();

    // @ts-ignore
    aboutWindow.uniqueId = 'about-window';

    if (VITE_DEV_SERVER_URL) {
        aboutWindow.loadURL(VITE_DEV_SERVER_URL)
    } else {
        // win.loadFile('dist/index.html')
        aboutWindow.loadFile(path.join(RENDERER_DIST, 'index.html'))
    }

    // 打开调试工具，设置为单独窗口
    // aboutWindow.webContents.openDevTools({ mode: 'detach' });

    // 在页面加载完成后发送主题设置
    aboutWindow.webContents.on('did-finish-load', () => {
        aboutWindow?.webContents.send('window-type', 'about');
        const image = nativeImage.createFromPath(path.join(process.env.VITE_PUBLIC, 'logo.png'));
        const imageBase64 = `data:image/png;base64,${image.resize({ quality: 'good' }).toPNG().toString('base64')}`;
        aboutWindow?.webContents.send('load-logo', imageBase64);
        aboutWindow?.webContents.send('show-devtool', devtoolConfig);
    });

    // 当窗口关闭时，移除事件监听器
    aboutWindow.on('closed', () => {
        // 检查是否已经打开了更新窗口
        const existingWindows = BrowserWindow.getAllWindows();
        // @ts-ignore
        const window = existingWindows.find(win => win.uniqueId === 'main-window');
        if (window) {
            window.focus();
        }
    });

    // 监听关闭窗口的请求
    ipcMain.on('close-about', () => {
        if (!aboutWindow?.isDestroyed()) {
            aboutWindow?.close();
        }
    });

    // 监听打开开发者工具的请求
    ipcMain.on('open-about-devtools', () => {
        if (aboutWindow && !aboutWindow.isDestroyed()) {
            isOpenAboutDevTools = true;
            aboutWindow.webContents.openDevTools({ mode: 'detach' });

            // 监听DevTools关闭事件
            aboutWindow.webContents.once('devtools-closed', () => {
                log.info('[主进程] 关于窗口开发者工具已关闭');
                isOpenAboutDevTools = false;
            });
        }
    });
}

// 系统托盘对象
function createTray(win: BrowserWindow) {
    log.info("是否隐藏了主窗口：" + isHideWindow);
    if (isHideWindow) {
        return;
    }

    // 获取当前语言设置
    const savedLanguage = config.value.languages || 'chinese';
    // 根据语言设置获取对应的菜单文本
    let menuTexts = getTrayText(savedLanguage);

    const trayMenuTemplate: Electron.MenuItemConstructorOptions[] = [
        {
            label: menuTexts.settings,
            click: function () {
                createSettingsWindow();
            }
        },
        {
            label: menuTexts.checkUpdate,
            click: function () {
                // 获取更新服务实例并调用检查更新方法
                const updaterService = getUpdaterService();
                if (updaterService) {
                    updaterService.checkForUpdates(true);
                }
            }
        },
        {
            label: menuTexts.disableHardwareAcceleration,
            type: 'checkbox',
            checked: Boolean(config.value.disableHardwareAcceleration),
            click: function () {
                // 切换禁用硬件加速设置
                config.value.disableHardwareAcceleration = !config.value.disableHardwareAcceleration;
                updateSettings(config.value);

                // 获取当前语言的对话框文本
                const hardwareAccelerationDialogText = getHardwareAccelerationDialogText(savedLanguage);

                // 显示重启确认对话框
                const dialogOptions = {
                    type: 'info',
                    buttons: [hardwareAccelerationDialogText.restartNow, hardwareAccelerationDialogText.restartLater],
                    title: hardwareAccelerationDialogText.title,
                    message: hardwareAccelerationDialogText.message,
                    defaultId: 0
                };

                const { dialog } = require('electron');
                dialog.showMessageBox(dialogOptions).then((result: { response: number }) => {
                    if (result.response === 0) {
                        // 用户选择立即重启
                        restartAPP();
                    }
                });
            }
        },
        {
            label: menuTexts.about,
            click: function () {
                createAboutWindow();
            }
        },
        {
            label: menuTexts.restart,
            click: function () {
                restartAPP();
            }
        },
        {
            label: menuTexts.exit,
            click: function () {
                app.quit();
                app.quit(); //因为程序设定关闭为最小化，所以调用两次关闭，防止最大化时一次不能关闭的情况
            }
        }
    ];

    //系统托盘图标目录
    const trayIcon = path.join(process.env.VITE_PUBLIC, 'logo.png');

    const appTray = new Tray(trayIcon);

    //图标的上下文菜单
    const contextMenu = Menu.buildFromTemplate(trayMenuTemplate);

    //设置此托盘图标的悬停提示内容
    appTray.setToolTip(menuTexts.clipboardTooltip);

    //设置此图标的上下文菜单
    appTray.setContextMenu(contextMenu);
    //单击右下角小图标显示应用
    appTray.on('click', function () {
        win.show();
    });

    // 监听语言变化，更新托盘菜单
    ipcMain.on('language-changed', (_event, newLanguage) => {
        log.info('[主进程] 收到语言变更通知，更新托盘菜单:', newLanguage);
        // 重新创建托盘菜单
        createTray(win);
    });

    // 监听语言变化，更新托盘菜单
    ipcMain.on('language-changed', (_event, newLanguage) => {
        log.info('[主进程] 收到语言变更通知，更新托盘菜单:', newLanguage);
        // 重新创建托盘菜单
        createTray(win);
    });

}

app.on('window-all-closed', () => {
    log.info('[主进程] 所有窗口已关闭')
    // 关闭数据库连接
    const db = ClipboardDB.getInstance()
    db?.close();

    // 在 macOS 上，应用程序通常在所有窗口关闭后仍保持活动状态
    // 直到用户使用 Cmd + Q 显式退出
    if (process.platform === 'darwin') {
        log.info('[主进程] macOS 平台，应用保持活动状态')
        // 如果您希望 macOS 上的行为与其他平台一致，可以取消下面的注释
        app.quit()
    }
})

// 限制只能同时存在启动一个程序
const gotTheLock = app.requestSingleInstanceLock()
if (!gotTheLock) {
    app.quit()
} else {
    Menu.setApplicationMenu(null)
    // 当 Electron 完成初始化并准备创建浏览器窗口时调用此方法
    app.whenReady().then(() => {
        initWindow()

        // 仅 macOS 支持
        app.on('activate', () => {
            // On OS X it's common to re-create a window in the app when the
            // dock icon is clicked and there are no other windows open.
            if (BrowserWindow.getAllWindows().length === 0) {
                initWindow()
            }
        })
    })
}

// 初始化窗口
async function initWindow() {
    // 检查是否存在备份文件，如果存在则打开恢复窗口
    const backupManager = BackupManager.getInstance();
    if (backupManager && backupManager.hasBackup()) {
        log.info('[主进程] 检测到备份文件，打开恢复窗口');
        ClipboardDB.getInstance(false);
        const config = backupManager.getBackupConfig();
        createRestoreWindow(config.theme, config.languages);
    } else {
        // 应用启动时执行一次存储检查和清理
        try {
            const db = ClipboardDB.getInstance();
            await db?.checkStorageSize();
            log.info('[主进程] 应用启动时的存储检查和清理完成');
        } catch (error) {
            log.error('[主进程] 应用启动时的存储检查和清理失败:', error);
        }

        createMainWindow();

    }
}

// 主页面IPC通信配置 start

// 监听清空剪贴板
ipcMain.handle('clear-items', async () => {
    const db = ClipboardDB.getInstance()
    db?.clearAll()
    return true
})

// 监听剪贴板列表分页搜索
ipcMain.handle('search-items-paged', async (_event, content, tagId, page, pageSize) => {
    log.info('[主进程] 获取剪贴板数据(分页)，查询条件', content, tagId, page, pageSize);
    const db = ClipboardDB.getInstance()
    const result = db?.searchItemsPaged(content, tagId, page, pageSize);
    // 标签信息已在SQL查询中获取，无需再次查询
    return result;
});

// 更新主题配置
ipcMain.handle('update-themes', async (_event, theme) => {
    log.info('[主进程] 更新主题', theme);
    config.value.theme = theme;
    updateSettings(config.value);
    return true;
});

// 监听剪贴板列表内容置顶
ipcMain.handle('top-item', async (_event, id) => {
    log.info('[主进程] 剪贴板内容置顶', id);
    const db = ClipboardDB.getInstance()
    db?.toggleTop(id, true);
});

// 监听剪贴板列表内容取消置顶
ipcMain.handle('untop-item', async (_event, id) => {
    log.info('[主进程] 剪贴板内容取消置顶', id);
    const db = ClipboardDB.getInstance()
    db?.toggleTop(id, false);
});

// 监听剪贴板列表内容删除
ipcMain.handle('remove-item', async (_event, id) => {
    log.info('[主进程] 剪贴板内容删除', id);
    const db = ClipboardDB.getInstance()
    db?.deleteItem(id);
});

// 监听剪贴板列表内容绑定标签
ipcMain.handle('item-bind-tag', async (_event, itemId, tagId) => {
    log.info('[主进程] 内容和标签绑定', itemId, tagId);
    const db = ClipboardDB.getInstance()
    db?.bindItemToTag(itemId, tagId);
});

// 获取图片的base64编码
ipcMain.handle('get-image-base64', async (_event, imagePath) => {
    try {
        if (!fs.existsSync(imagePath)) {
            log.error('[主进程] 图片文件不存在:', imagePath);
            return null;
        }
        const image = nativeImage.createFromPath(imagePath);
        return `data:image/png;base64,${image.resize({ quality: 'good' }).toPNG().toString('base64')}`;
    } catch (error) {
        log.error('[主进程] 获取图片base64编码失败:', error);
        return null;
    }
});

// 监听将内容复制到剪贴板
ipcMain.handle('item-copy', async (_event, id: number) => {
    log.info('[主进程] 将内容复制到系统剪贴板，id:', id);
    try {
        const db = ClipboardDB.getInstance()
        const item: any = db?.getItemById(id);
        if (item) {
            db?.updateItemTime(id, Date.now());
            if (item.type === 'image') {
                const image = nativeImage.createFromPath(item.file_path);
                clipboard.writeImage(image);
                // } else if (item.type === 'file') {
                //     // 处理文件复制到剪贴板
                //     if (fs.existsSync(item.file_path)) {
                //         // 在Windows上，使用特殊的FileNameW格式写入文件路径
                //         const filePath = item.file_path;
                //         // 将文件路径转换为UTF-16LE格式的Buffer
                //         const filePathBuffer = Buffer.from(filePath + '\0', 'utf16le');
                //         clipboard.writeBuffer('FileNameW', filePathBuffer);
                //         log.info('[主进程] 文件已复制到系统剪贴板:', filePath);
                //     } else {
                //         log.error('[主进程] 文件不存在:', item.file_path);
                //         return false;
                //     }
            } else {
                clipboard.writeText(item.content);
            }
            return true;
        } else {
            log.error('[主进程] 将内容复制到系统剪贴板，根据id没有找到内容', id);
            return false;
        }
    } catch (error) {
        log.error('[主进程] 将内容复制到系统剪贴板失败:', error);
        return false;
    }
});

// 监听主窗口是否固定
ipcMain.handle('main-fixed', async (_event, fixed: boolean) => {
    isFixedMainWindow = fixed;
});

ipcMain.handle('main-blur', async (_event) => {
    onBlur();
});

// 主页面IPC通信配置 end

// 设置页面IPC通信配置 start

// 监听配置文件更新
ipcMain.handle('update-config', async (_event, conf) => {
    log.info('[主进程] 更新配置', conf);
    updateSettings(conf);
    return true;
});

// 监听快捷键配置更新
ipcMain.handle('update-shortcut-keys', async (_event, config) => {
    log.info('[主进程] 更新快捷键配置', config);
    updateShortcutKeys(config);
    mainWindow?.webContents.send('load-shortcut-keys', config);
    return true;
});

// 监听修改开发者工具显示状态
ipcMain.handle('update-devtool-show', async (_event, isShow) => {
    devtoolConfig.isShow = isShow;
    mainWindow?.webContents.send('show-devtool', devtoolConfig);
    settingsWindow?.webContents.send('show-devtool', devtoolConfig);
    newUpdateWindow?.webContents.send('show-devtool', devtoolConfig);
    tagsWindow?.webContents.send('show-devtool', devtoolConfig);
    aboutWindow?.webContents.send('show-devtool', devtoolConfig);
});

// 设置页面IPC通信配置 end

// 标签页面IPC通信配置 start

// 监听剪贴板列表内容删除
ipcMain.handle('add-tag', async (_event, name, color) => {
    log.info('[主进程] 标签添加', name, color);
    const db = ClipboardDB.getInstance()
    db?.addTag(name, color);
    const tags = db?.getAllTags();
    mainWindow?.webContents.send('load-tag-items', tags);
});

// 监听标签修改
ipcMain.handle('update-tag', async (_event, id, name, color) => {
    log.info('[主进程] 更新标签', id, name, color);
    const db = ClipboardDB.getInstance()
    db?.updateTag(id, name, color);
    const tags = db?.getAllTags();
    mainWindow?.webContents.send('load-tag-items', tags);
});

// 监听标签删除
ipcMain.handle('delete-tag', async (_event, id) => {
    log.info('[主进程] 删除标签', id);
    const db = ClipboardDB.getInstance()
    db?.deleteTag(id);
    const tags = db?.getAllTags();
    mainWindow?.webContents.send('load-tag-items', tags);
});

// 监听获取所有标签
ipcMain.handle('get-all-tags', async () => {
    log.info('[主进程] 获取所有标签');
    const db = ClipboardDB.getInstance()
    return db?.getAllTags();
});

ipcMain.on('open-external-link', (_event, url) => {
    shell.openExternal(url);
});

// 标签页面IPC通信配置 end

function onBlur() {
    const existingWindows = BrowserWindow.getAllWindows()
    // 没有打开其他窗口，才能触发失焦事件
    if (existingWindows.length === 1

        && !isOpenMianDevTools
        && !isOpenSettingsDevTools
        && !isOpenTagsDevTools
        && !isOpenAboutDevTools

        && !isFixedMainWindow) {
        closeOrHide()
    }
}

function restartAPP() {
    // 关闭所有窗口
    BrowserWindow.getAllWindows().forEach(window => {
        if (!window.isDestroyed()) {
            window.close()
        }
    })
    // 重启应用
    app.relaunch()
    app.exit(0)
}

/**
 * 关闭或隐藏主窗口
 */
function closeOrHide() {
    if (Boolean(config.value.colsingHideToTaskbar)) {
        const location: number[] | undefined = mainWindow?.getPosition()
        if (location) {
            x = location[0]
            y = location[1]
        }
        mainWindow?.hide()
        isHideWindow = true
    } else {
        mainWindow?.close()
        app.quit()
    }
}

// 监听剪贴板变化
let lastText = clipboard.readText();
let lastImage = clipboard.readImage().isEmpty() ? null : clipboard.readImage().toPNG();
// let lastFiles: string[] = [];
let clipboardTimer: string | number | NodeJS.Timeout | null | undefined = null;
function watchClipboard() {
    // 首先检查窗口和渲染进程状态
    if (!mainWindow || mainWindow.isDestroyed() || !mainWindow.webContents || mainWindow.webContents.isDestroyed()) {
        log.info('[主进程] 窗口或渲染进程不可用，跳过剪贴板检查');
        return;
    }

    try {
        const currentText = clipboard.readText();
        const currentImage = clipboard.readImage();
        // const currentFiles = clipboard.readBuffer('FileNameW');

        // 检查图片变化 
        if (!currentImage.isEmpty()) {
            const currentImageBuffer = currentImage.toPNG();
            // 修改图片变化检测逻辑，确保首次复制的图片也能被检测到
            // 当lastImage为null时表示首次检测到图片，或者当图片内容与上次不同时
            const isImageChanged = lastImage === null || Buffer.compare(currentImageBuffer, lastImage) !== 0;

            // 检查图片大小是否超过配置的最大项目大小限制（MB转换为字节）
            const maxItemSizeBytes = (config.value.maxItemSize || 50) * 1024 * 1024;
            const isWithinSizeLimit = currentImageBuffer.length <= maxItemSizeBytes;
            if (isImageChanged && !isWithinSizeLimit) {
                log.info('[主进程] 图片大小超过限制，不保存图片，当前图片大小：', currentImageBuffer.length, '字节');
            }
            if (isImageChanged && isWithinSizeLimit) {
                log.info('[主进程] 检测到剪贴板中有图片');
                log.info('[主进程] 检测到新的图片内容', {
                    size: currentImageBuffer.length,
                    isFirstImage: lastImage === null
                });
                lastImage = currentImageBuffer;
                const timestamp = Date.now();
                const tempDir = path.join(config.value.tempPath || getTempPath());

                // 检查是否存在相同内容的图片文件
                let existingImagePath = null;
                if (fs.existsSync(tempDir)) {
                    const files = fs.readdirSync(tempDir);
                    for (const file of files) {
                        if (file.endsWith('.png')) {
                            const filePath = path.join(tempDir, file);
                            const fileContent = fs.readFileSync(filePath);
                            if (Buffer.compare(fileContent, currentImageBuffer) === 0) {
                                existingImagePath = filePath;
                                break;
                            }
                        }
                    }
                } else {
                    fs.mkdirSync(tempDir, { recursive: true });
                }

                let imagePath;
                if (existingImagePath) {
                    // 使用已存在的图片文件
                    imagePath = existingImagePath;
                    log.info('[主进程] 找到相同内容的图片文件:', imagePath);
                } else {
                    // 创建新的图片文件
                    imagePath = path.join(tempDir, `clipboard_${timestamp}.png`);
                    fs.writeFileSync(imagePath, currentImageBuffer);
                    log.info('[主进程] 图片已保存到临时目录:', imagePath);
                }

                // 添加更严格的渲染进程状态检查
                if (mainWindow && !mainWindow.isDestroyed()) {
                    const webContents = mainWindow.webContents;
                    if (webContents && !webContents.isDestroyed()) {
                        // 确保渲染进程已完全加载
                        if (webContents.getProcessId() && !webContents.isLoading()) {
                            try {
                                // 复制的数据添加到数据库
                                const db = ClipboardDB.getInstance()
                                db?.addItem(path.basename(imagePath), 'image', imagePath);
                                db?.asyncClearingExpiredData();
                                // 定期检查存储大小
                                if (Math.random() < 0.1) { // 约10%的概率执行检查，避免每次都检查
                                    db?.checkStorageSize().catch(err => {
                                        log.error('[主进程] 检查存储大小时出错:', err);
                                    });
                                }
                                const webContents = mainWindow.webContents;
                                if (webContents && !webContents.isDestroyed()) {
                                    webContents.send('clipboard-updated');
                                }
                            } catch (error) {
                                log.error('[主进程] 发送图片信息到渲染进程时出错:', error);
                                if (!existingImagePath) {
                                    try {
                                        fs.unlinkSync(imagePath);
                                    } catch (unlinkError) {
                                        log.error('[主进程] 清理临时文件时出错:', unlinkError);
                                    }
                                }
                            }
                        }
                    } else if (!existingImagePath) {
                        try {
                            fs.unlinkSync(imagePath);
                        } catch (unlinkError) {
                            log.error('[主进程] 清理临时文件时出错:', unlinkError);
                        }
                    }
                }
            }
        }

        // 检查文本变化
        if (currentText && currentText !== lastText) {
            // 检查文本大小是否超过配置的最大项目大小限制（MB转换为字节）
            const maxItemSizeBytes = (config.value.maxItemSize || 50) * 1024 * 1024;
            const textSizeBytes = Buffer.byteLength(currentText, 'utf8');
            const isWithinSizeLimit = textSizeBytes <= maxItemSizeBytes;

            if (isWithinSizeLimit) {
                lastText = currentText;
                // 复制的数据添加到数据库
                const db = ClipboardDB.getInstance()
                db?.addItem(currentText, 'text', null);
                db?.asyncClearingExpiredData();
                // 定期检查存储大小
                if (Math.random() < 0.1) { // 约10%的概率执行检查，避免每次都检查
                    db?.checkStorageSize().catch(err => {
                        log.error('[主进程] 检查存储大小时出错:', err);
                    });
                }
                if (mainWindow && !mainWindow.isDestroyed()) {
                    try {
                        const webContents = mainWindow.webContents;
                        if (webContents && !webContents.isDestroyed()) {
                            webContents.send('clipboard-updated');
                        }
                    } catch (error) {
                        log.error('[主进程] 发送文本消息时出错:', error);
                    }
                }
            } else {
                log.warn('[主进程] 文本内容超过最大大小限制，已忽略。大小:', textSizeBytes, '字节，限制:', maxItemSizeBytes, '字节');
            }
        }

        // todo electron没有完整的文件复制和粘贴功能，暂时不支持文件复制和粘贴
        // // 检查文件变化
        // if (currentFiles && currentFiles.length > 0) {
        //     try {
        //         // 将Buffer转换为UTF-16LE字符串并移除空字符
        //         const filesString = currentFiles.toString('utf16le').replace(/\x00/g, '');
        //         // 分割文件路径
        //         const files = filesString.split('\r\n').filter(Boolean);

        //         if (files.length > 0) {
        //             // 检查是否有新文件，不再依赖isFirstClipboardCheck标志
        //             const newFiles = files.filter(file => !lastFiles.includes(file));

        //             // 更新lastFiles变量，记录当前剪贴板中的所有文件
        //             lastFiles = files;

        //             if (newFiles.length > 0) {
        //                 log.info('[主进程] 检测到新的文件:', newFiles);

        //                 const timestamp = Date.now();
        //                 const tempDir = path.join(config.value.tempPath || getTempPath());

        //                 // 确保临时目录存在
        //                 if (!fs.existsSync(tempDir)) {
        //                     fs.mkdirSync(tempDir, { recursive: true });
        //                 }

        //                 // 处理每个新文件
        //                 for (const filePath of newFiles) {
        //                     try {
        //                         const fileName = path.basename(filePath);
        //                         const destPath = path.join(tempDir, `file_${timestamp}_${fileName}`);

        //                         // 检查数据库中是否已有相同文件路径的记录
        //                         const db = ClipboardDB.getInstance();

        //                         // 查找临时目录中是否已存在相同内容的文件
        //                         let existingFilePath = null;
        //                         if (fs.existsSync(tempDir)) {
        //                             const tempFiles = fs.readdirSync(tempDir);

        //                             // 计算原始文件的哈希值
        //                             const crypto = require('crypto');
        //                             let originalFileHash: string;
        //                             try {
        //                                 const fileBuffer = fs.readFileSync(filePath);
        //                                 const hashSum = crypto.createHash('sha256');
        //                                 hashSum.update(fileBuffer);
        //                                 originalFileHash = hashSum.digest('hex');
        //                                 log.info('[主进程] 原始文件哈希值:', originalFileHash);
        //                             } catch (hashError) {
        //                                 log.error('[主进程] 计算原始文件哈希值时出错:', hashError);
        //                                 continue; // 如果无法计算哈希值，跳过此文件
        //                             }

        //                             // 遍历临时目录中的文件，比较哈希值
        //                             for (const tempFile of tempFiles) {
        //                                 if (tempFile.startsWith('file_')) {
        //                                     const tempFilePath = path.join(tempDir, tempFile);
        //                                     try {
        //                                         // 计算临时文件的哈希值
        //                                         const tempFileBuffer = fs.readFileSync(tempFilePath);
        //                                         const tempHashSum = crypto.createHash('sha256');
        //                                         tempHashSum.update(tempFileBuffer);
        //                                         const tempFileHash = tempHashSum.digest('hex');

        //                                         // 比较哈希值，如果相同则是相同文件
        //                                         if (originalFileHash === tempFileHash) {
        //                                             existingFilePath = tempFilePath;
        //                                             log.info('[主进程] 通过哈希值匹配到相同文件:', tempFilePath);
        //                                             break;
        //                                         }
        //                                     } catch (tempHashError) {
        //                                         log.error('[主进程] 计算临时文件哈希值时出错:', tempHashError);
        //                                     }
        //                                 }
        //                             }
        //                         }

        //                         let finalPath;
        //                         if (existingFilePath) {
        //                             // 使用已存在的文件
        //                             finalPath = existingFilePath;
        //                             log.info('[主进程] 找到相同内容的文件:', finalPath);
        //                         } else {
        //                             // 复制文件到临时目录
        //                             fs.copyFileSync(filePath, destPath);
        //                             finalPath = destPath;
        //                             log.info('[主进程] 文件已复制到临时目录:', destPath);
        //                         }

        //                         // 添加到数据库
        //                         db.addItem(fileName, 'file', finalPath);

        //                         // 通知渲染进程
        //                         if (win && !win.isDestroyed()) {
        //                             const webContents = win.webContents;
        //                             if (webContents && !webContents.isDestroyed()) {
        //                                 webContents.send('clipboard-updated');
        //                             }
        //                         }
        //                     } catch (fileError) {
        //                         log.error('[主进程] 处理剪贴板文件时出错:', fileError);
        //                     }
        //                 }
        //             }
        //         }
        //     } catch (error) {
        //         log.error('[主进程] 处理剪贴板文件时出错:', error);
        //     }
        // }

    } catch (error) {
        log.error('[主进程] 检查剪贴板时出错:', error);
    }

    clipboardTimer = setTimeout(watchClipboard, 100); // 每100毫秒检查一次
}

Object.defineProperty(app, 'isPackaged', {
    get() {
        return true;
    }
})

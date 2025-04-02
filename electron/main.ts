import { app, BrowserWindow, ipcMain, Menu, nativeImage, screen, Tray } from 'electron'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import BackupManager from './windows/BackupManager.js'
import { getSettings, getShortcutKeys, getTempPath, updateSettings } from './configs/FileManager.js'
import ClipboardDB from './db/databases.js'
import { getHardwareAccelerationDialogText, getTrayText } from './configs/languages.js'
import log from './configs/log.ts'
import ShortcutManager from './configs/shortcutManager.js'
import UpdaterService from './windows/updater.js'
import ClipboardListService from './windows/list.js'
import SettingsService from './windows/settings.js'
import TagsService from './windows/tags.js'
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

let wakeUpRoutineShortcut: ShortcutManager; // 唤醒程序快捷键
let clipboardListService: ClipboardListService;
// @ts-ignore
let settingsService: SettingsService;
// @ts-ignore
let tagsService: TagsService;

// 创建剪贴板列表窗口
function createListWindow() {
    // 检查是否已经打开了更新窗口
    const existingWindows = BrowserWindow.getAllWindows();
    // @ts-ignore
    const window = existingWindows.find(win => win.uniqueId === 'main-window');
    if (window) {
        window.focus();
        return;
    }

    const shortcutKeys = getShortcutKeys();
    const config = getSettings();

    // 获取屏幕尺寸和鼠标位置
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.workAreaSize;
    const mousePos = screen.getCursorScreenPoint();
    

    // 使用配置文件中保存的窗口尺寸，如果没有则使用默认值
    const windowWidth = config.windowWidth || 400;
    const windowHeight = config.windowHeight || 600;

    let x;
    let y;
    if (clipboardListService?.isHideWindow) {
        x = clipboardListService.x;
        y = clipboardListService.y;
    } else {
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

    const mainWindow = new BrowserWindow({
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
        resizable: !Boolean(config.fixedWindowSize),
        x: x,
        y: y,
        transparent: false
    })
    // 默认不显示窗口
    mainWindow.hide();

    // @ts-ignore
    mainWindow.uniqueId = 'main-window';

    // 窗口置顶
    // 这个设置允许在Keynote演示模式下显示在顶部。BrowserWindow中有一项alwaysOnTop。
    // 当我设置为true时，其他应用程序会被覆盖在顶部，但Keynote演示模式下不行。
    // 所以我需要设置mainWindow.setAlwaysOnTop(true, "screen-saver")。
    mainWindow.setAlwaysOnTop(true, "screen-saver")
    // 这个设置允许在切换到其他工作区时显示。
    mainWindow.setVisibleOnAllWorkspaces(true)

    clipboardListService = ClipboardListService.getInstance(mainWindow);

    // 添加窗口失去焦点事件监听
    if (Boolean(config.colsingHideToTaskbar)) {
        mainWindow.on('blur', () => {
            clipboardListService.onBlur()
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

    if (shortcutKeys.wakeUpRoutine) {
        log.info('[主进程] 注册唤醒程序快捷键:', shortcutKeys.wakeUpRoutine.key.join("+"));
        wakeUpRoutineShortcut = new ShortcutManager(mainWindow, shortcutKeys.wakeUpRoutine.key.join("+"));
        wakeUpRoutineShortcut.loadShortcuts();
    }

    // 打开调试工具，设置为单独窗口
    // win.webContents.openDevTools({ mode: 'detach' });


    const savedTheme = config.theme || 'light';
    log.info('[主进程] 读取到的主题配置:', savedTheme);
    const savedLanguage = config.languages || 'chinese';
    log.info('[主进程] 读取到的语言配置:', savedLanguage);

    // 在页面加载完成后发送主题设置
    mainWindow.webContents.on('did-finish-load', () => {
        mainWindow?.webContents.send('window-type', 'list');
        mainWindow?.webContents.send('init-themes', savedTheme);
        mainWindow?.webContents.send('init-language', savedLanguage);
        const db = ClipboardDB.getInstance()
        const tags = db?.getAllTags();
        mainWindow?.webContents.send('load-tag-items', JSON.stringify(tags));
        mainWindow?.webContents.send('load-shortcut-keys', JSON.stringify(shortcutKeys));
        mainWindow?.webContents.send('load-settings', JSON.stringify(config));
        mainWindow?.webContents.send('show-devtool', JSON.stringify(SettingsService.devtoolConfig));
        // 启动剪贴板监听
        log.info('[主进程] 窗口加载完成，开始监听剪贴板');
        clipboardListService.watchClipboard(config.maxItemSize, config.tempPath);
    });

    // 监听窗口关闭事件，清理定时器
    mainWindow.on('closed', () => {
        const clipboardTimer = clipboardListService.getClipboardTimer();
        if (clipboardListService.getClipboardTimer()) {
            clearTimeout(clipboardTimer);
            clipboardListService.clearClipboardTimer()
        }
    });

    //创建系统托盘右键菜单
    createTray(mainWindow);

    // 设置应用程序开机自启动
    app.setLoginItemSettings({
        openAtLogin: Boolean(config.powerOnSelfStart),
        openAsHidden: false, // 设置为 true 可以隐藏启动时的窗口
        args: [] // 自定义参数
    });

    // 初始化更新服务
    const updaterService = UpdaterService.getInstance(savedLanguage);
    updaterService.initUpdaterService();

    // 临时文件位置没有设置，设置成当前程序的根目录为临时文件夹位置
    if (!config.tempPath) {
        const tempDir = getTempPath();
        config.tempPath = tempDir;
        updateSettings(config);
    }

    // 监听打开开发者工具的请求
    ipcMain.on('open-main-tools', () => {
        log.info('[主进程] 打开开发者工具');
        if (mainWindow) {
            // 打开调试工具，设置为单独窗口
            mainWindow.webContents.openDevTools({ mode: 'detach' });
            clipboardListService.isOpenMianDevTools = true;

            // 监听DevTools关闭事件
            mainWindow.webContents.once('devtools-closed', () => {
                log.info('[主进程] 开发者工具已关闭');
                clipboardListService.isOpenMianDevTools = false;
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
        clipboardListService.closeOrHide();
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

    const settingsWindow = new BrowserWindow({
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
        parent: ClipboardListService.window,
    });

    // 窗口居中显示
    settingsWindow.center();

    // @ts-ignore
    settingsWindow.uniqueId = 'settings-window';

    settingsService = SettingsService.getInstance();
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
        settingsWindow?.webContents.send('load-config', JSON.stringify(getSettings()));
        settingsWindow?.webContents.send('load-shortcut-keys', JSON.stringify(getShortcutKeys()));
        settingsWindow?.webContents.send('show-devtool', JSON.stringify(SettingsService.devtoolConfig));
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
            clipboardListService.isOpenSettingsDevTools = true;
            settingsWindow.webContents.openDevTools({ mode: 'detach' });

            // 监听DevTools关闭事件
            settingsWindow.webContents.once('devtools-closed', () => {
                log.info('[主进程] 设置窗口开发者工具已关闭');
                clipboardListService.isOpenSettingsDevTools = false;
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

    const tagsWindow = new BrowserWindow({
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
        parent: ClipboardListService.window,
    });

    // 窗口居中显示
    tagsWindow.center();

    // @ts-ignore
    tagsWindow.uniqueId = 'tags-window';

    tagsService = TagsService.getInstance();

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
        tagsWindow?.webContents.send('show-devtool', JSON.stringify(SettingsService.devtoolConfig));
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
            clipboardListService.isOpenTagsDevTools = true;
            tagsWindow.webContents.openDevTools({ mode: 'detach' });

            // 监听DevTools关闭事件
            tagsWindow.webContents.once('devtools-closed', () => {
                log.info('[主进程] 标签窗口开发者工具已关闭');
                clipboardListService.isOpenTagsDevTools = false;
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

    const newUpdateWindow = new BrowserWindow({
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
        newUpdateWindow?.webContents.send('show-devtool', JSON.stringify(SettingsService.devtoolConfig));
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
            newUpdateWindow.webContents.openDevTools({ mode: 'detach' });

            // 监听DevTools关闭事件
            newUpdateWindow.webContents.once('devtools-closed', () => {
                log.info('[主进程] 关于窗口开发者工具已关闭');
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
        restoreWindow.webContents.send('show-devtool', JSON.stringify(SettingsService.devtoolConfig));
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

    const aboutWindow = new BrowserWindow({
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
        parent: ClipboardListService.window,
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
        aboutWindow?.webContents.send('show-devtool', JSON.stringify(SettingsService.devtoolConfig));
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
            clipboardListService.isOpenAboutDevTools = true;
            aboutWindow.webContents.openDevTools({ mode: 'detach' });

            // 监听DevTools关闭事件
            aboutWindow.webContents.once('devtools-closed', () => {
                log.info('[主进程] 关于窗口开发者工具已关闭');
                clipboardListService.isOpenAboutDevTools = false;
            });
        }
    });
}

// 系统托盘对象
function createTray(win: BrowserWindow) {
    if (clipboardListService?.isHideWindow) {
        return;
    }

    let config = getSettings();
    // 获取当前语言设置
    const savedLanguage = config.languages || 'chinese';
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
                const updaterService = UpdaterService.getInstance(savedLanguage);
                if (updaterService) {
                    updaterService.checkForUpdates(true);
                }
            }
        },
        {
            label: menuTexts.disableHardwareAcceleration,
            type: 'checkbox',
            checked: Boolean(config.disableHardwareAcceleration),
            click: function () {
                // 切换禁用硬件加速设置
                config = getSettings();
                config.disableHardwareAcceleration = !config.disableHardwareAcceleration;
                updateSettings(config);

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

    wakeUpRoutineShortcut?.cleanup();

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

        createListWindow();

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

import { app, BrowserWindow, clipboard, ipcMain, screen, Tray, Menu } from 'electron'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import fs from 'node:fs'
import ClipboardDB from './db.js'
import log from './log.js'
import { getConfig, updateConfig, getShortcutKeyConfig } from './ConfigFileManager.js'

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

let win: BrowserWindow | null
let isOpenWindow = false;
let isHideWindow = false;
let x: number | undefined = undefined;
let y: number | undefined = undefined;

const config = getConfig();

function createMainWindow() {
    isOpenWindow = true;

    // 获取屏幕尺寸和鼠标位置
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.workAreaSize;
    const mousePos = screen.getCursorScreenPoint();

    // 使用配置文件中保存的窗口尺寸，如果没有则使用默认值
    const windowWidth = config.windowWidth || 400;
    const windowHeight = config.windowHeight || 600;

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

    win = new BrowserWindow({
        icon: path.join(process.env.VITE_PUBLIC, 'logo.png'),
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: true,
            preload: path.join(path.dirname(fileURLToPath(import.meta.url)), 'preload.mjs'),
        },
        width: windowWidth,
        height: windowHeight,
        frame: false,
        resizable: !Boolean(config.fixedWindowSize),
        x: x,
        y: y,
        transparent: false
    })

    const savedTheme = config.theme || 'light';
    log.info('[主进程] 读取到的主题配置:', savedTheme);

    // Test active push message to Renderer-process.
    // win.webContents.on('did-finish-load', () => {
    //     win?.webContents.send('main-process-message', (new Date).toLocaleString())
    // })

    // 在页面加载完成后发送主题设置
    win.webContents.on('did-finish-load', () => {
        win?.webContents.send('main-process-message', (new Date).toLocaleString())
        log.info('[主进程] 发送主题设置到渲染进程');
        win?.webContents.send('init-themes', savedTheme);
        log.info('[主进程] 发送标签列表到渲染进程');
        const db = ClipboardDB.getInstance()
        const tags = db.getAllTags();
        win?.webContents.send('load-tag-items', tags);
        // 发送快捷键配置
        log.info('[主进程] 发送快捷键配置到渲染进程');
        const shortcutKeyConfig = getShortcutKeyConfig();
        win?.webContents.send('load-shortcut-keys', shortcutKeyConfig);
        // 启动剪贴板监听
        log.info('[主进程] 窗口加载完成，开始监听剪贴板');
        watchClipboard();
    });

    if (VITE_DEV_SERVER_URL) {
        win.loadURL(VITE_DEV_SERVER_URL)
    } else {
        // win.loadFile('dist/index.html')
        win.loadFile(path.join(RENDERER_DIST, 'index.html'))
    }

    // 打开调试工具，设置为单独窗口
    // win.webContents.openDevTools({ mode: 'detach' });

    // 监听窗口关闭事件，清理定时器
    win.on('closed', () => {
        if (clipboardTimer) {
            clearTimeout(clipboardTimer);
            clipboardTimer = null;
        }
    });

    //创建系统托盘右键菜单
    createTray(win);

    // 设置应用程序开机自启动
    app.setLoginItemSettings({
        openAtLogin: Boolean(config.powerOnSelfStart),
        openAsHidden: false, // 设置为 true 可以隐藏启动时的窗口
        args: [] // 自定义参数
    });
}

// // 是否已经打开设置窗口
// let isOpenSettingsWindow = false;
// // 创建设置窗口
// function createSettingsWindow() {
//     if (isOpenSettingsWindow) {
//         return;
//     }
//     isOpenSettingsWindow = true;
//     const isProduction = process.env.NODE_ENV === 'production';
//     const configDir = isProduction ? path.join(app.getAppPath(), 'resources/conf') : path.join(__dirname, 'conf');
//     const configPath = path.join(configDir, 'settings.conf');
//     if (!fs.existsSync(configDir)) fs.mkdirSync(configDir, { recursive: true });
//     const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
//     const savedTheme = config.theme || 'light';

//     const settingsWindow = new BrowserWindow({
//         width: 650,
//         height: 500,
//         frame: false,
//         resizable: false,
//         webPreferences: {
//             nodeIntegration: true,
//             contextIsolation: false,
//             nativeWindowOpen: true
//         },
//     });

//     // 窗口置顶
//     // 这个设置允许在Keynote演示模式下显示在顶部。BrowserWindow中有一项alwaysOnTop。
//     // 当我设置为true时，其他应用程序会被覆盖在顶部，但Keynote演示模式下不行。
//     // 所以我需要设置mainWindow.setAlwaysOnTop(true, "screen-saver")。
//     settingsWindow.setAlwaysOnTop(true, "screen-saver")
//     // 这个设置允许在切换到其他工作区时显示。
//     settingsWindow.setVisibleOnAllWorkspaces(true)

//     settingsWindow.loadFile('components/settings/settings.html');

//     // 打开调试工具，设置为单独窗口
//     // settingsWindow.webContents.openDevTools({ mode: 'detach' });

//     // 在页面加载完成后发送主题设置
//     settingsWindow.webContents.on('did-finish-load', () => {
//         settingsWindow.webContents.send('change-theme', savedTheme);
//         settingsWindow.webContents.send('init-config');
//     });

//     // 为当前设置窗口创建一个专门的关闭事件处理函数
//     const closeSettingsHandler = () => {
//         if (!settingsWindow.isDestroyed()) {
//             settingsWindow.close();
//         }
//     };

//     // 注册关闭事件监听
//     const closeSettingsChannel = 'close-settings-' + Date.now();
//     ipcMain.on(closeSettingsChannel, closeSettingsHandler);

//     // 当窗口关闭时，移除事件监听器
//     settingsWindow.on('closed', () => {
//         ipcMain.removeListener(closeSettingsChannel, closeSettingsHandler);
//         isOpenSettingsWindow = false;
//     });

//     // 将新的channel ID发送给渲染进程
//     settingsWindow.webContents.on('did-finish-load', () => {
//         settingsWindow.webContents.send('settings-channel', closeSettingsChannel);
//     });

//     // 监听打开开发者工具的请求
//     ipcMain.on('open-settings-devtools', () => {
//         if (settingsWindow && !settingsWindow.isDestroyed()) {
//             settingsWindow.webContents.openDevTools({ mode: 'detach' });
//         }
//     });
// }

// 系统托盘对象
function createTray(win: BrowserWindow) {
    console.log("是否隐藏了主窗口：" + isHideWindow);
    if (isHideWindow) {
        return;
    }
    const trayMenuTemplate = [
        {
            label: '打开主窗口',
            click: function () {
                createMainWindow();
            }
        },
        {
            label: '设置',
            click: function () {
                // createSettingsWindow();
            }
        },
        {
            label: '帮助',
            click: function () { }
        },
        {
            label: '关于',
            click: function () { }
        },
        {
            label: '退出',
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
    appTray.setToolTip('我的剪贴板');

    //设置此图标的上下文菜单
    appTray.setContextMenu(contextMenu);
    //单击右下角小图标显示应用
    appTray.on('click', function () {
        win.show();
    });
}

// 监听清空剪贴板
ipcMain.handle('clear-items', async () => {
    const db = ClipboardDB.getInstance()
    db.clearAll()
    return true
})
// 监听剪贴板列表搜索
ipcMain.handle('search-items', async (_event, content, tagId) => {
    log.info('[主进程] 获取剪贴板数据，查询条件', content, tagId);
    const db = ClipboardDB.getInstance()
    const items = db.searchItems(content, tagId);
    // 标签信息已在SQL查询中获取，无需再次查询
    return items;
});
// 更新主题配置
ipcMain.handle('update-themes', async (_event, theme) => {
    log.info('[主进程] 更新主题', theme);
    config.theme = theme;
    updateConfig(config);
    return true;
});

// 监听剪贴板列表内容置顶
ipcMain.handle('top-item', async (_event, id) => {
    log.info('[主进程] 剪贴板内容置顶', id);
    const db = ClipboardDB.getInstance()
    db.toggleTop(id, true);
});
// 监听剪贴板列表内容取消置顶
ipcMain.handle('untop-item', async (_event, id) => {
    log.info('[主进程] 剪贴板内容取消置顶', id);
    const db = ClipboardDB.getInstance()
    db.toggleTop(id, false);
});
// 监听剪贴板列表内容删除
ipcMain.handle('remove-item', async (_event, id) => {
    log.info('[主进程] 剪贴板内容删除', id);
    const db = ClipboardDB.getInstance()
    db.deleteItem(id);
});
// 监听剪贴板列表内容删除
ipcMain.handle('add-tag', async (_event, name, color) => {
    log.info('[主进程] 标签添加', name, color);
    const db = ClipboardDB.getInstance()
    db.addTag(name, color);
    const tags = db.getAllTags();
    win?.webContents.send('load-tag-items', tags);
});
// 监听剪贴板列表内容绑定标签
ipcMain.handle('item-bind-tag', async (_event, itemId, tagId) => {
    log.info('[主进程] 内容和标签绑定', itemId, tagId);
    const db = ClipboardDB.getInstance()
    db.bindItemToTag(itemId, tagId);
});

// 获取图片的base64编码
ipcMain.handle('get-image-base64', async (_event, imagePath) => {
    log.info('[主进程] 获取图片base64编码', imagePath);
    try {
        if (!fs.existsSync(imagePath)) {
            log.error('[主进程] 图片文件不存在:', imagePath);
            return null;
        }
        const imageBuffer = fs.readFileSync(imagePath);
        return `data:image/png;base64,${imageBuffer.toString('base64')}`;
    } catch (error) {
        log.error('[主进程] 获取图片base64编码失败:', error);
        return null;
    }
});

// 监听打开开发者工具的请求
ipcMain.on('toggle-dev-tools', () => {
    log.info('[主进程] 打开开发者工具');
    if (win) {
        // 打开调试工具，设置为单独窗口
        win.webContents.openDevTools({ mode: 'detach' });
    }
});

// 监听重新加载应用程序的请求
ipcMain.on('reload-app', () => {
    log.info('[主进程] 重新加载应用程序');
    if (win) {
        win.reload();
    }
});

// 监听退出应用程序的请求
ipcMain.on('quit-app', () => {
    log.info('[主进程] 退出应用程序');
    app.quit();
});

// 监听关闭窗口的请求
ipcMain.on('close-app', () => {
    isOpenWindow = false;
    if (Boolean(config.colsingHideToTaskbar)) {
        const location: number[] | undefined = win?.getPosition();
        if (location) {
            x = location[0];
            y = location[1];
        }
        win?.hide();
        isHideWindow = true;
    } else {
        win?.close();
        app.quit();
    }
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit()
        win = null
    }
})

// 限制只能同时存在启动一个程序
const gotTheLock = app.requestSingleInstanceLock()
if (!gotTheLock) {
    app.quit()
} else {
    // 当 Electron 完成初始化并准备创建浏览器窗口时调用此方法
    app.whenReady().then(() => {
        createMainWindow()

        // 仅 macOS 支持
        app.on('activate', () => {
            // On OS X it's common to re-create a window in the app when the
            // dock icon is clicked and there are no other windows open.
            if (BrowserWindow.getAllWindows().length === 0) {
                createMainWindow()
            }
        })
    })
}

app.on('window-all-closed', () => {
    // 对于 Mac 系统， 关闭窗口时并不会直接退出应用， 此时需要我们来手动处理
    if (process.platform === 'darwin') {
        log.info('[主进程] 关闭程序')
        app.quit()
    }
})

let lastText = clipboard.readText();
// let lastFiles = clipboard.readBuffer('FileNameW');
let lastImage = clipboard.readImage().isEmpty() ? null : clipboard.readImage().toPNG();
let clipboardTimer: string | number | NodeJS.Timeout | null | undefined = null;
// 监听剪贴板变化
function watchClipboard() {
    // 首先检查窗口和渲染进程状态
    if (!win || win.isDestroyed() || !win.webContents || win.webContents.isDestroyed()) {
        log.info('[主进程] 窗口或渲染进程不可用，跳过剪贴板检查');
        return;
    }

    try {
        const currentText = clipboard.readText();
        const currentFiles = clipboard.readBuffer('FileNameW');
        const currentImage = clipboard.readImage();
        // log.info('[主进程] 检测到剪贴板内容变化', currentText, currentFiles, currentImage.isEmpty());

        // 检查图片变化 
        if (!currentImage.isEmpty()) {
            const currentImageBuffer = currentImage.toPNG();
            // 修改图片变化检测逻辑，确保首次复制的图片也能被检测到
            // 当lastImage为null时表示首次检测到图片，或者当图片内容与上次不同时
            const isImageChanged = lastImage === null || Buffer.compare(currentImageBuffer, lastImage) !== 0;

            // log.info('[主进程] 图片检测状态:', {
            //     isEmpty: currentImage.isEmpty(),
            //     isFirstImage: lastImage === null,
            //     hasChanged: lastImage !== null && Buffer.compare(currentImageBuffer, lastImage) !== 0
            // });

            if (isImageChanged) {
                log.info('[主进程] 检测到剪贴板中有图片');
                log.info('[主进程] 检测到新的图片内容', {
                    size: currentImageBuffer.length,
                    isFirstImage: lastImage === null
                });
                lastImage = currentImageBuffer;
                const timestamp = Date.now();
                const tempDir = path.join(config.tempPath || path.join(__dirname, '../temp'));

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
                if (win && !win.isDestroyed()) {
                    const webContents = win.webContents;
                    if (webContents && !webContents.isDestroyed()) {
                        // 确保渲染进程已完全加载
                        if (webContents.getProcessId() && !webContents.isLoading()) {
                            try {
                                // 复制的数据添加到数据库
                                const db = ClipboardDB.getInstance()
                                db.addItem(path.basename(imagePath), 'image', imagePath);
                                const webContents = win.webContents;
                                if (webContents && !webContents.isDestroyed()) {
                                    webContents.send('clipboard-updated', currentText);
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
            lastText = currentText;
            // 复制的数据添加到数据库
            const db = ClipboardDB.getInstance()
            db.addItem(currentText, 'text', null);
            if (win && !win.isDestroyed()) {
                try {
                    const webContents = win.webContents;
                    if (webContents && !webContents.isDestroyed()) {
                        webContents.send('clipboard-updated', currentText);
                    }
                } catch (error) {
                    log.error('[主进程] 发送文本消息时出错:', error);
                }
            }
        }

        // 检查文件变化
        if (currentFiles && currentFiles.length > 0) {
            try {
                const filesString = currentFiles.toString('utf16le').replace(/\x00/g, '');
                const files = filesString.split('\r\n').filter(Boolean);

                // 检查是否与上次的文件列表不同
                // if (JSON.stringify(files) !== JSON.stringify(lastFiles)) {
                //     lastFiles = files;
                if (win && !win.isDestroyed()) {
                    const webContents = win.webContents;
                    if (webContents && !webContents.isDestroyed()) {
                        files.forEach(filePath => {
                            const fileName = path.basename(filePath);
                            webContents.send('clipboard-file', {
                                name: fileName,
                                path: filePath,
                                type: 'file'
                            });
                        });
                    }
                }
                // }
            } catch (error) {
                log.error('[主进程] 处理剪贴板文件时出错:', error);
            }
        }
    } catch (error) {
        log.error('[主进程] 检查剪贴板时出错:', error);
    }

    clipboardTimer = setTimeout(watchClipboard, 100); // 每100毫秒检查一次
}
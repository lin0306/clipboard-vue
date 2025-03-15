import { app, BrowserWindow, clipboard, ipcMain } from 'electron'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import fs from 'node:fs'
import ClipboardDB from './db.js'
import log from './log.js'
import { getConfig, updateConfig } from './settingsFile.js'

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
// let isOpenWindow = false;
// let isHideWindow = false;
// let x = null;
// let y = null;

const config = getConfig();

function createMainWindow() {
    win = new BrowserWindow({
        icon: path.join(process.env.VITE_PUBLIC, 'electron-vite.svg'),
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: true,
            preload: path.join(path.dirname(fileURLToPath(import.meta.url)), 'preload.mjs'),
        },
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
    win.webContents.openDevTools({ mode: 'detach' });

    // 监听窗口关闭事件，清理定时器
    win.on('closed', () => {
        if (clipboardTimer) {
            clearTimeout(clipboardTimer);
            clipboardTimer = null;
        }
    });
}
// 监听清空剪贴板
ipcMain.handle('clear-items', async () => {
    const db = ClipboardDB.getInstance()
    db.clearAll()
    return true
})
// 监听剪贴板列表搜索
ipcMain.handle('search-items', async (_event, query, tagId) => {
    log.info('[主进程] 搜索剪贴板列表', query, tagId);
    const db = ClipboardDB.getInstance()
    return db.searchItems(query, tagId);
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

        // 检查图片变化 
        if (!currentImage.isEmpty()) {
            const currentImageBuffer = currentImage.toPNG();
            const isImageChanged = lastImage !== null && Buffer.compare(currentImageBuffer, lastImage) !== 0;

            if (isImageChanged) {
                log.info('[主进程] 检测到剪贴板中有图片');
                log.info('[主进程] 检测到新的图片内容');
                lastImage = currentImageBuffer;
                const timestamp = Date.now();
                const tempDir = path.join(config.tempPath || path.join(__dirname, 'temp'));

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
                                log.info('[主进程] 准备发送图片信息到渲染进程');
                                win.webContents.send('clipboard-file', {
                                    name: path.basename(imagePath),
                                    path: imagePath,
                                    type: 'image',
                                    isNewImage: !existingImagePath // 标记是否为新图片
                                });
                                log.info('[主进程] 图片信息已发送到渲染进程');
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
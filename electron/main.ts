import { app, BrowserWindow, clipboard, ipcMain } from 'electron'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import ClipboardDB from './db/index.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

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

let win: BrowserWindow | null
let lastClipboardContent: string = ''

// 监听剪贴板变化
function watchClipboard() {
    setInterval(() => {
        const currentContent = clipboard.readText()
        if (currentContent !== lastClipboardContent && currentContent.trim() !== '') {
            lastClipboardContent = currentContent
            const db = ClipboardDB.getInstance()
            db.saveClipboardContent(currentContent, 'text')
            win?.webContents.send('clipboard-updated', currentContent)
        }
    }, 1000)
}

function createWindow() {
    win = new BrowserWindow({
        icon: path.join(process.env.VITE_PUBLIC, 'electron-vite.svg'),
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: true,
            preload: path.join(path.dirname(fileURLToPath(import.meta.url)), 'preload.mjs'),
        },
    })

    // Test active push message to Renderer-process.
    win.webContents.on('did-finish-load', () => {
        win?.webContents.send('main-process-message', (new Date).toLocaleString())
    })

    if (VITE_DEV_SERVER_URL) {
        win.loadURL(VITE_DEV_SERVER_URL)
    } else {
        // win.loadFile('dist/index.html')
        win.loadFile(path.join(RENDERER_DIST, 'index.html'))
    }

    // 打开调试工具，设置为单独窗口
    win.webContents.openDevTools({ mode: 'detach' });
}

// 设置IPC通信
ipcMain.handle('get-clipboard-history', async (event, limit: number = 50) => {
    const db = ClipboardDB.getInstance()
    return db.getClipboardHistory(limit)
})

ipcMain.handle('clear-clipboard-history', async () => {
    const db = ClipboardDB.getInstance()
    db.clearHistory()
    return true
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit()
        win = null
    }
})

app.whenReady().then(() => {
    createWindow()
    watchClipboard() // 启动剪贴板监听
    
    // 仅 macOS 支持
    app.on('activate', () => {
        // On OS X it's common to re-create a window in the app when the
        // dock icon is clicked and there are no other windows open.
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow()
        }
    })
})

app.on('window-all-closed', () => {
    // 对于 Mac 系统， 关闭窗口时并不会直接退出应用， 此时需要我们来手动处理
    if (process.platform === 'darwin') {
        console.log('close')
        app.quit()
    }
})

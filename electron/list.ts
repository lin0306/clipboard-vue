import { app, BrowserWindow, clipboard, ipcMain, nativeImage } from "electron";
import fs from 'fs-extra';
import path from "path";
import ClipboardDB from "./db";
import { getSettings, getTempPath, updateSettings } from "./FileManager";
import log from "./log";

export default class ClipboardListService {
    private static instance: ClipboardListService; // 单例实例
    private isFixedMainWindow: boolean = false; // 是否固定窗口大小
    public isHideWindow = false;
    public isOpenMianDevTools = false;
    public isOpenSettingsDevTools = false;
    public isOpenTagsDevTools = false;
    public isOpenAboutDevTools = false;
    public x: number | undefined = undefined;
    public y: number | undefined = undefined;
    public window: BrowserWindow;

    // 监听剪贴板变化
    private lastText = clipboard.readText();
    private lastImage = clipboard.readImage().isEmpty() ? null : clipboard.readImage().toPNG();
    // private lastFiles: string[] = [];
    private clipboardTimer: string | number | NodeJS.Timeout | null | undefined = null;

    constructor(window: BrowserWindow) {
        this.window = window;
        // 注册IPC事件处理
        this.registerIpcHandlers();
    }

    public static getInstance(window: BrowserWindow): ClipboardListService {
        if (!ClipboardListService.instance) {
            ClipboardListService.instance = new ClipboardListService(window);
        }
        return ClipboardListService.instance;
    }

    getClipboardTimer(): any {
        return this.clipboardTimer;
    }

    clearClipboardTimer() {
        this.clipboardTimer = null;
    }

    /**
   * 注册IPC事件处理
   */
    private registerIpcHandlers() {

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
            const config = getSettings();
            config.theme = theme;
            updateSettings(config);
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
            this.isFixedMainWindow = fixed;
        });

        ipcMain.handle('main-blur', async (_event) => {
            this.onBlur();
        });
    }

    onBlur() {
        const existingWindows = BrowserWindow.getAllWindows()
        // 没有打开其他窗口，才能触发失焦事件
        if (existingWindows.length === 1

            && !this.isOpenMianDevTools
            && !this.isOpenSettingsDevTools
            && !this.isOpenTagsDevTools
            && !this.isOpenAboutDevTools

            && !this.isFixedMainWindow) {
            this.closeOrHide()
        }
    }


    /**
     * 关闭或隐藏主窗口
     */
    closeOrHide() {
        const config = getSettings();
        if (Boolean(config.colsingHideToTaskbar)) {
            const location: number[] | undefined = this.window?.getPosition()
            if (location) {
                this.x = location[0]
                this.y = location[1]
            }
            this.window?.hide()
            this.isHideWindow = true
        } else {
            window?.close()
            app.quit()
        }
    }

    watchClipboard(maxItemSize: number, tempPath: string) {
        // 首先检查窗口和渲染进程状态
        if (!this.window || this.window.isDestroyed() || !this.window.webContents || this.window.webContents.isDestroyed()) {
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
                const isImageChanged = this.lastImage === null || Buffer.compare(currentImageBuffer, this.lastImage) !== 0;

                // 检查图片大小是否超过配置的最大项目大小限制（MB转换为字节）
                const maxItemSizeBytes = (maxItemSize || 50) * 1024 * 1024;
                const isWithinSizeLimit = currentImageBuffer.length <= maxItemSizeBytes;
                if (isImageChanged && !isWithinSizeLimit) {
                    log.info('[主进程] 图片大小超过限制，不保存图片，当前图片大小：', currentImageBuffer.length, '字节');
                }
                if (isImageChanged && isWithinSizeLimit) {
                    log.info('[主进程] 检测到剪贴板中有图片');
                    log.info('[主进程] 检测到新的图片内容', {
                        size: currentImageBuffer.length,
                        isFirstImage: this.lastImage === null
                    });
                    this.lastImage = currentImageBuffer;
                    const timestamp = Date.now();
                    const tempDir = path.join(tempPath || getTempPath());

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
                    if (this.window && !this.window.isDestroyed()) {
                        const webContents = this.window.webContents;
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
                                    const webContents = this.window.webContents;
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
            if (currentText && currentText !== this.lastText) {
                // 检查文本大小是否超过配置的最大项目大小限制（MB转换为字节）
                const maxItemSizeBytes = (maxItemSize || 50) * 1024 * 1024;
                const textSizeBytes = Buffer.byteLength(currentText, 'utf8');
                const isWithinSizeLimit = textSizeBytes <= maxItemSizeBytes;

                if (isWithinSizeLimit) {
                    this.lastText = currentText;
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
                    if (this.window && !this.window.isDestroyed()) {
                        try {
                            const webContents = this.window.webContents;
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

            // // todo electron没有完整的文件复制和粘贴功能，暂时不支持文件复制和粘贴
            // // 检查文件变化
            // if (currentFiles && currentFiles.length > 0) {
            //     try {
            //         // 将Buffer转换为UTF-16LE字符串并移除空字符
            //         const filesString = currentFiles.toString('utf16le').replace(/\x00/g, '');
            //         // 分割文件路径
            //         const files = filesString.split('\r\n').filter(Boolean);

            //         if (files.length > 0) {
            //             // 检查是否有新文件，不再依赖isFirstClipboardCheck标志
            //             const newFiles = files.filter(file => !this.lastFiles.includes(file));

            //             // 更新lastFiles变量，记录当前剪贴板中的所有文件
            //             this.lastFiles = files;

            //             if (newFiles.length > 0) {
            //                 log.info('[主进程] 检测到新的文件:', newFiles);

            //                 const timestamp = Date.now();
            //                 const tempDir = path.join(tempPath || getTempPath());

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
            //                         db?.addItem(fileName, 'file', finalPath);

            //                         // 通知渲染进程
            //                         if (this.window && !this.window.isDestroyed()) {
            //                             const webContents = this.window.webContents;
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

        this.clipboardTimer = setTimeout(() => this.watchClipboard(maxItemSize, tempPath), 100); // 每100毫秒检查一次
    }

}

/**
 * 自动更新管理器
 * 使用electron-updater库实现自动检查更新和更新应用
 */

import { app, BrowserWindow, ipcMain, nativeImage, Notification } from 'electron';
import Store from 'electron-store';
import { autoUpdater } from 'electron-updater';
import fs from 'fs-extra';
import path from 'path';
import BackupManager from './BackupManager.js';
import { getUpdateText, UpdateLanguageConfig } from './languages.js';
import log from './log.js';

/**
 * 主进程中初始化更新服务的代码
 * 需要在main.ts中导入并使用
 */

// 本地开发时使用的更新配置文件路径
if (process.env.NODE_ENV === 'development') {
    autoUpdater.updateConfigPath = path.join(__dirname, "../dev-update.yml");
    autoUpdater.forceDevUpdateConfig = true;
}

export default class UpdaterService {
    private updateCheckInterval: NodeJS.Timeout | null = null;
    private isCheckingForUpdate = false;
    private isManualCheck = false; // 标记是否为手动检查更新
    private isBackupCompleted = false; // 标记是否已完成备份
    private language: UpdateLanguageConfig;
    private updateLimitTime: number | null | undefined; // 更新限制时间
    private updateStore: Store; // 用于存储更新配置的Store实例
    private static instance: UpdaterService; // 单例实例
    private static language: string; // 单例模式的语言

    constructor(language: string) {
        this.language = getUpdateText(language);
        log.info('[主进程] 更新服务初始化', language);

        // 创建更新配置存储实例
        this.updateStore = new Store({
            name: 'update-config',  // 不含扩展名的文件名
            cwd: app.getPath('userData'),  // 存储在应用的userData目录下
        });

        // 从Store中读取更新限制时间
        const updateConfig = this.updateStore.store as { updateLimitTime?: string };
        if (updateConfig.updateLimitTime) {
            this.updateLimitTime = Number(updateConfig.updateLimitTime);
        }

        // 配置自动更新
        autoUpdater.logger = log;
        autoUpdater.autoDownload = false;
        autoUpdater.autoInstallOnAppQuit = true;

        // 允许预发布版本更新
        autoUpdater.allowPrerelease = true;

        // 监听更新事件
        this.initAutoUpdateEvents();

        // 注册IPC事件处理
        this.registerIpcHandlers();
    }

    public static getInstance(language: string | undefined = undefined): UpdaterService {
        if (!UpdaterService.instance) {
            if (language) {
                UpdaterService.instance = new UpdaterService(language);
                return UpdaterService.instance;
            }
            UpdaterService.instance = new UpdaterService(UpdaterService.language);
        }
        UpdaterService.language = language ? language : 'chinese';
        return UpdaterService.instance;
    }

    /**
 * 初始化更新服务
 * @param mainWindow 主窗口实例
 */
    initUpdaterService() {
        try {
            // 启动自动更新检查，默认每60分钟检查一次
            this.startAutoUpdateCheck(60);

            log.info('[主进程] 更新服务初始化成功');
        } catch (error) {
            log.error('[主进程] 更新服务初始化失败:', error);
        }
    }

    /**
     * 初始化自动更新事件监听
     */
    private initAutoUpdateEvents() {

        // 检查到更新
        autoUpdater.on('update-available', (info: any) => {
            log.info('新版本信息:', info);
            log.info('检测到新版本:', info.version);
            this.isCheckingForUpdate = false;
            // 确保releaseNotes正确传递
            let releaseNotes = info.releaseNotes;
            // 如果releaseNotes是对象，尝试转换为字符串
            if (releaseNotes && typeof releaseNotes === 'object') {
                try {
                    // 如果是对象，可能包含不同格式的发行说明
                    if (releaseNotes.zh) {
                        releaseNotes = releaseNotes.zh; // 优先使用中文
                    } else if (releaseNotes.en) {
                        releaseNotes = releaseNotes.en; // 其次使用英文
                    } else {
                        // 尝试将对象转为字符串
                        releaseNotes = JSON.stringify(releaseNotes, null, 2);
                    }

                    // 处理Markdown格式，确保GitHub风格的更新日志正确显示
                    // 支持emoji图标和列表格式
                    if (typeof releaseNotes === 'string') {
                        // 保留Markdown格式，不需要额外处理
                        // 由于使用v-html渲染，Markdown格式会被浏览器解析为HTML
                    }
                } catch (e) {
                    log.error('处理releaseNotes出错:', e);
                    releaseNotes = '无法解析更新说明';
                }
            }

            setTimeout(() => {
                this.sendStatusToWindow('update-available', {
                    version: info.version,
                    releaseDate: info.releaseDate,
                    releaseNotes: releaseNotes
                });
            }, 1000);

            // 打开更新窗口而不是显示弹窗
            const { createUpdateWindow } = require('./main');
            createUpdateWindow();
        });

        // 没有检查到更新
        autoUpdater.on('update-not-available', (_info) => {
            log.info('当前已是最新版本，是否手动检查更新?', this.isManualCheck);
            this.isCheckingForUpdate = false;

            // 只有在手动检查更新时才显示通知
            if (this.isManualCheck) {
                // 使用Electron原生的Notification API显示系统级提示，告知用户当前已是最新版本
                new Notification({
                    title: this.language.checking,
                    body: `${this.language.upToDateText} (${app.getVersion()})`,
                    icon: nativeImage.createFromPath(path.join(process.env.VITE_PUBLIC, 'logo.png')),
                    silent: false
                }).show();

                // 重置手动检查标志
                this.isManualCheck = false;
            }
        });

        // 更新下载进度
        autoUpdater.on('download-progress', (progressObj) => {
            // 确保进度信息完整传递，包括下载速度和文件大小
            const progressData = {
                percent: progressObj.percent || 0,
                bytesPerSecond: progressObj.bytesPerSecond || 0,
                total: progressObj.total || 0,
                transferred: progressObj.transferred || 0,
                delta: progressObj.delta || 0
            };

            // 确保percent值是有效数字
            if (isNaN(progressData.percent)) {
                progressData.percent = 0;
            }

            log.info('下载进度:', progressData.percent.toFixed(2) + '%',
                '速度:', (progressData.bytesPerSecond / 1024).toFixed(2) + 'KB/s',
                '已下载:', (progressData.transferred / 1024 / 1024).toFixed(2) + 'MB',
                '总大小:', (progressData.total / 1024 / 1024).toFixed(2) + 'MB');

            log.info('发送到前端的进度数据:', JSON.stringify(progressData));
            this.sendStatusToWindow('download-progress', progressData);
        });

        // 更新取消事件
        autoUpdater.on('update-cancelled', (info) => {
            log.info('更新已取消:', info);
            // 发送取消消息到前端
            this.sendStatusToWindow('download-error', { error: '更新已取消' });
        });

        // 更新下载完成
        autoUpdater.on('update-downloaded', (info) => {
            log.info('更新已下载，准备备份用户数据');

            // 开始备份用户数据
            this.backupUserData().then(success => {
                this.isBackupCompleted = success;
                log.info(`备份用户数据${success ? '成功' : '失败'}, 发送更新下载完成消息`);

                // 发送更新下载完成消息，包含备份状态
                this.sendStatusToWindow('update-downloaded', {
                    version: info.version,
                    releaseDate: info.releaseDate,
                    releaseNotes: info.releaseNotes,
                    backupCompleted: success
                });

                // 如果备份成功，明确向渲染进程发送备份完成的消息
                if (success) {
                    const backupManager = BackupManager.getInstance();
                    if (backupManager) {
                        // 获取更新窗口
                        const existingWindows = BrowserWindow.getAllWindows();
                        // @ts-ignore
                        const updateWindow = existingWindows.find(win => win.uniqueId === 'update-window');

                        // 发送100%的备份进度
                        backupManager.setProgressCallback((progress, status) => {
                            // 确保100%的进度消息被发送
                            if (updateWindow && !updateWindow.isDestroyed()) {
                                log.info('发送备份完成消息:', progress, status);
                                updateWindow.webContents.send('backup-status', { progress, status });
                            }
                        });

                        // 确保最终备份进度100%被发送
                        if (updateWindow && !updateWindow.isDestroyed()) {
                            updateWindow.webContents.send('backup-status', {
                                progress: 100,
                                status: '备份完成'
                            });
                        }
                    }
                }
            });
        });
    }

    /**
     * 彻底重置 autoUpdater 实例，包括配置和事件
     * 用于强制中断下载过程
     */
    private resetAutoUpdater() {
        // 清除所有事件监听器
        autoUpdater.removeAllListeners();

        // 重置配置
        autoUpdater.logger = log;
        autoUpdater.autoDownload = false;
        autoUpdater.autoInstallOnAppQuit = true;
        autoUpdater.allowPrerelease = true;

        // 恢复本地开发配置（如果有）
        if (process.env.NODE_ENV === 'development') {
            autoUpdater.updateConfigPath = path.join(__dirname, "../dev-update.yml");
            autoUpdater.forceDevUpdateConfig = true;
        } else {
            autoUpdater.forceDevUpdateConfig = false;
        }

        // 重新注册事件
        this.initAutoUpdateEvents();

        log.info('autoUpdater 已完全重置');
    }

    /**
     * 注册IPC事件处理
     */
    private registerIpcHandlers() {
        // 手动检查更新
        ipcMain.handle('check-for-updates', async () => {
            return this.checkForUpdates(true); // 传入true表示手动检查
        });

        // 下载更新
        ipcMain.handle('download-update', async () => {
            return this.downloadUpdate();
        });

        // 取消下载更新
        ipcMain.handle('cancel-download', async () => {
            log.info('用户取消下载更新');
            try {
                // 1. 先通知前端下载已取消
                this.sendStatusToWindow('download-error', { error: '用户取消了下载' });

                // 2. 清理下载文件夹
                this.cleanDownloadFiles();

                // 3. 重置内部状态
                this.isBackupCompleted = false;

                // 4. 彻底重置 autoUpdater
                this.resetAutoUpdater();

                log.info('下载已彻底取消，临时文件已清理，下载进程已终止');
                return true;
            } catch (error) {
                log.error('取消下载失败:', error);
                return false;
            }
        });

        // 取消备份
        ipcMain.handle('cancel-backup', async () => {
            log.info('用户取消备份');
            try {
                // 中断备份进程
                const backupManager = BackupManager.getInstance();
                if (backupManager) {
                    // 删除部分备份文件
                    await backupManager.cleanBackupFiles();
                }

                // 重置内部状态
                this.isBackupCompleted = false;

                // 通知前端备份已取消
                this.sendStatusToWindow('download-error', { error: '用户取消了备份' });

                // 彻底重置 autoUpdater 以确保没有残留的下载或事件
                this.resetAutoUpdater();

                log.info('备份已取消，备份文件已清理，状态已重置');
                return true;
            } catch (error) {
                log.error('取消备份失败:', error);
                return false;
            }
        });

        // 立即安装更新
        ipcMain.handle('install-update', async () => {
            // 如果备份未完成，则先进行备份
            if (!this.isBackupCompleted) {
                const success = await this.backupUserData();
                this.isBackupCompleted = success;
                if (!success) {
                    log.error('备份失败，取消安装更新');
                    return false;
                }
            }

            autoUpdater.quitAndInstall(false, true);
            return true;
        });

        // 推迟更新提醒
        ipcMain.handle('postpone-update', async (_event, days: number) => {
            log.info(`用户选择 ${days} 天后再次提醒更新`);
            // 计算推迟的时间
            const now = new Date();
            now.setDate(now.getDate() + days);
            this.updateLimitTime = now.getTime();

            // 保存到Store
            this.updateStore.store = { updateLimitTime: this.updateLimitTime.toString() };
            log.info('[主进程] 更新限制时间已保存');
            return true;
        });
    }

    /**
     * 向渲染进程发送更新状态
     */
    private sendStatusToWindow(status: string, data: any = {}) {
        // 获取所有窗口，包括主窗口和更新窗口
        const existingWindows = BrowserWindow.getAllWindows();
        // @ts-ignore
        const updateWindow = existingWindows.find(win => win.uniqueId === 'update-window');
        if (updateWindow && !updateWindow.isDestroyed()) {
            log.info(`向渲染进程发送更新信息，状态: ${status}，数据: ${JSON.stringify(data)}`);
            updateWindow.webContents.send('update-status', { status, data });
        }
    }

    /**
     * 备份用户数据
     * @returns 备份是否成功
     */
    private async backupUserData(): Promise<boolean> {
        const backupManager = BackupManager.getInstance();
        if (!backupManager) {
            log.error('备份管理器未初始化');
            return false;
        }

        // 获取更新窗口
        const existingWindows = BrowserWindow.getAllWindows();
        // @ts-ignore
        const updateWindow = existingWindows.find(win => win.uniqueId === 'update-window');

        // 设置进度回调
        backupManager.setProgressCallback((progress, status) => {
            if (updateWindow && !updateWindow.isDestroyed()) {
                log.info(`发送备份进度: ${progress}%, 状态: ${status}`);
                updateWindow.webContents.send('backup-status', { progress, status });

                // 当备份完成时，明确设置isBackingUp为false
                if (progress === 100) {
                    this.isBackupCompleted = true;
                }
            }
        });

        // 执行备份
        return await backupManager.createBackup();
    }

    /**
     * 检查更新
     * @param isManual 是否为手动检查，默认为false
     */
    public async checkForUpdates(isManual: boolean = false): Promise<boolean> {
        if (this.isCheckingForUpdate) {
            log.info('已有更新检查正在进行中');
            return false;
        }
        if (!isManual && this.updateLimitTime) {
            const time = Date.now();
            if (time < this.updateLimitTime) {
                log.info('更新限制时间未到，不进行更新检查');
                return false;
            } else {
                // 时间已到，清除更新限制并删除配置文件
                log.info('更新限制时间已到，清除限制并删除配置文件');
                this.updateLimitTime = undefined;
                this.updateStore.clear();
                log.info('[主进程] 更新配置已清空');
            }
        }

        try {
            this.isCheckingForUpdate = true;
            this.isManualCheck = isManual; // 设置是否为手动检查的标志
            log.info(`开始${isManual ? '手动' : '自动'}检查更新...`);
            await autoUpdater.checkForUpdates();
            return true;
        } catch (error: any) {
            log.error('检查更新出错:', error);

            // 处理特定的GitHub release错误
            let errorMessage = error.message || this.language.unknown;

            // 只有在手动检查更新时才显示通知
            if (this.isManualCheck) {
                new Notification({
                    title: this.language.checkFailure,
                    body: errorMessage,
                    icon: nativeImage.createFromPath(path.join(process.env.VITE_PUBLIC, 'logo.png')),
                    silent: false
                }).show();

                // 重置手动检查标志
                this.isManualCheck = false;
            }

            return false;
        } finally {
            this.isCheckingForUpdate = false;
        }
    }

    /**
     * 下载更新
     */
    public async downloadUpdate(): Promise<boolean> {
        try {
            // 发送开始下载的状态
            this.sendStatusToWindow('download-started', {
                percent: 0,
                bytesPerSecond: 0,
                total: 0,
                transferred: 0
            });

            // 延迟100毫秒再发送一次，确保渲染进程能够接收到状态更新
            setTimeout(() => {
                this.sendStatusToWindow('download-started', {
                    percent: 0,
                    bytesPerSecond: 0,
                    total: 0,
                    transferred: 0
                });
            }, 100);

            log.info('开始下载更新...');
            await autoUpdater.downloadUpdate();
            return true;
        } catch (error: any) {
            log.error('下载更新出错:', error);
            this.sendStatusToWindow('download-error', { error: error.message });
            return false;
        }
    }

    /**
     * 启动定时检查更新
     * @param intervalMinutes 检查间隔（分钟）
     */
    public startAutoUpdateCheck(intervalMinutes: number = 60) {
        // 清除现有的定时器
        if (this.updateCheckInterval) {
            clearInterval(this.updateCheckInterval);
        }

        // 设置新的定时器
        const intervalMs = intervalMinutes * 60 * 1000;
        this.updateCheckInterval = setInterval(() => {
            this.checkForUpdates(false); // 传入false表示自动检查
        }, intervalMs);

        // 启动后延迟检查一次更新
        setTimeout(() => {
            this.checkForUpdates(false); // 传入false表示自动检查
        }, 10000); // 10秒后检查

        log.info(`已设置自动更新检查，间隔: ${intervalMinutes} 分钟`);
    }

    /**
     * 停止定时检查更新
     */
    public stopAutoUpdateCheck() {
        if (this.updateCheckInterval) {
            clearInterval(this.updateCheckInterval);
            this.updateCheckInterval = null;
            log.info('已停止自动更新检查');
        }
    }

    /**
     * 清理下载的临时文件
     */
    private cleanDownloadFiles(): boolean {
        try {
            const updaterCachePath = path.join(app.getPath('userData'), 'update-cache');
            if (fs.existsSync(updaterCachePath)) {
                log.info('清理下载缓存:', updaterCachePath);
                fs.removeSync(updaterCachePath);
            }

            // 获取electron-updater默认的下载文件夹
            const downloadPath = path.join(app.getPath('temp'), 'electron-updater');
            if (fs.existsSync(downloadPath)) {
                log.info('清理下载文件夹:', downloadPath);
                fs.removeSync(downloadPath);
            }

            return true;
        } catch (error) {
            log.error('清理下载文件失败:', error);
            return false;
        }
    }
}
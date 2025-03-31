/**
 * 自动更新管理器
 * 使用electron-updater库实现自动检查更新和更新应用
 */

import { app, BrowserWindow, ipcMain, nativeImage, Notification } from 'electron';
import { autoUpdater } from 'electron-updater';
import log from './log.js';
import path from 'path';
import { getUpdateText, UpdateLanguageConfig } from './languages.js';

/**
 * 主进程中初始化更新服务的代码
 * 需要在main.ts中导入并使用
 */

// 更新服务实例
let updaterService: UpdaterService | null = null;



// 本地开发时使用的更新配置文件路径
// autoUpdater.updateConfigPath = path.join(__dirname, "../dev-update.yml");

/**
 * 初始化更新服务
 * @param mainWindow 主窗口实例
 */
export function initUpdaterService(language: string) {
    try {
        // 创建更新服务实例
        updaterService = new UpdaterService(language);

        // 启动自动更新检查，默认每60分钟检查一次
        updaterService.startAutoUpdateCheck(60);

        log.info('[主进程] 更新服务初始化成功');
    } catch (error) {
        log.error('[主进程] 更新服务初始化失败:', error);
    }
}

/**
 * 获取更新服务实例
 */
export function getUpdaterService(): UpdaterService | null {
    return updaterService;
}

export default class UpdaterService {
    private updateCheckInterval: NodeJS.Timeout | null = null;
    private isCheckingForUpdate = false;
    private isManualCheck = false; // 标记是否为手动检查更新
    private language: UpdateLanguageConfig;

    constructor(language: string) {
        this.language = getUpdateText(language);
        log.info('[主进程] 更新服务初始化', language);

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

            this.sendStatusToWindow('update-available', {
                version: info.version,
                releaseDate: info.releaseDate,
                releaseNotes: releaseNotes
            });

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
            log.info('下载进度:', progressData.percent.toFixed(2) + '%',
                '速度:', (progressData.bytesPerSecond / 1024).toFixed(2) + 'KB/s',
                '已下载:', (progressData.transferred / 1024 / 1024).toFixed(2) + 'MB',
                '总大小:', (progressData.total / 1024 / 1024).toFixed(2) + 'MB');
            this.sendStatusToWindow('download-progress', progressData);
        });

        // 更新下载完成
        autoUpdater.on('update-downloaded', (info) => {
            log.info('更新已下载，准备安装');
            this.sendStatusToWindow('update-downloaded', {
                version: info.version,
                releaseDate: info.releaseDate,
                releaseNotes: info.releaseNotes
            });

            // 不再显示系统弹窗，由Update.vue组件内处理
            // 用户可以在Update.vue界面中选择立即安装或稍后安装
        });
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

        // 立即安装更新
        ipcMain.handle('install-update', async () => {
            autoUpdater.quitAndInstall(false, true);
            return true;
        });

        // 稍后安装更新
        ipcMain.handle('later-install-update', async () => {
            // 设置下次启动时安装
            log.info('用户选择稍后安装更新');
            return true;
        });

        // 推迟更新提醒
        ipcMain.handle('postpone-update', async (_event, days: number) => {
            log.info(`用户选择 ${days} 天后再次提醒更新`);
            return true;
        });
    }

    /**
     * 向渲染进程发送更新状态
     */
    private sendStatusToWindow(status: string, data: any = {}, retryTimes: number = 0) {
        // 获取所有窗口，包括主窗口和更新窗口
        const existingWindows = BrowserWindow.getAllWindows();
        // @ts-ignore
        const updateWindow = existingWindows.find(win => win.uniqueId === 'update-window');
        if (updateWindow && !updateWindow.isDestroyed()) {
            log.info(`向渲染进程发送更新信息，状态: ${status}，数据: ${JSON.stringify(data)}`);
            updateWindow.webContents.send('update-status', { status, data });
        } else {
            if (retryTimes < 100) {
                log.info(`渲染进程未准备好，重试发送更新信息，状态: ${status}，重试次数: ${retryTimes}`);
                // 等待一段时间后重试
                setTimeout(() => {
                    this.sendStatusToWindow(status, data, retryTimes + 1);
                }, 500); // 0.5秒后重试 
            }
        }
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
            this.sendStatusToWindow('download-started');
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
}
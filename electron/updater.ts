/**
 * 自动更新管理器
 * 使用electron-updater库实现自动检查更新和更新应用
 */

import { app, BrowserWindow, dialog, ipcMain } from 'electron';
import { autoUpdater } from 'electron-updater';
import log from './log.js';

/**
 * 主进程中初始化更新服务的代码
 * 需要在main.ts中导入并使用
 */

// 更新服务实例
let updaterService: UpdaterService | null = null;

/**
 * 初始化更新服务
 * @param mainWindow 主窗口实例
 */
export function initUpdaterService(mainWindow: BrowserWindow) {
    try {
        // 创建更新服务实例
        updaterService = new UpdaterService(mainWindow);
        
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
    private mainWindow: BrowserWindow;
    private updateCheckInterval: NodeJS.Timeout | null = null;
    private isCheckingForUpdate = false;

    constructor(mainWindow: BrowserWindow) {
        this.mainWindow = mainWindow;

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
        // 检查更新出错
        autoUpdater.on('error', (error) => {
            log.error('更新检查失败:', error);
            this.isCheckingForUpdate = false;

            // 处理特定的GitHub release错误
            let errorMessage = error.message;
            let userFriendlyMessage = '检查更新失败';

            // 检测GitHub release相关错误
            if (errorMessage.includes('Cannot parse releases feed') ||
                errorMessage.includes('Unable to find latest version on GitHub') ||
                errorMessage.includes('Unexpected end of JSON input')) {
                userFriendlyMessage = 'GitHub仓库版本检查失败';
                errorMessage = '请确保GitHub仓库已创建正确的发布版本，支持beta版本(v0.0.1-beta.1)格式';

                // 记录详细错误信息，帮助开发者排查
                log.debug('GitHub releases解析错误详情:', error);
            }
            // 检测找不到latest.yml文件的错误
            else if (errorMessage.includes('Cannot find latest.yml') && errorMessage.includes('HttpError: 404')) {
                userFriendlyMessage = '更新文件配置错误';
                errorMessage = '找不到更新配置文件(latest.yml)，请确保GitHub发布版本中包含了必要的更新文件';

                // 记录详细错误信息，帮助开发者排查
                log.debug('更新文件错误详情:', error);
                log.debug('提示: 请检查electron-builder配置，确保已启用yml文件生成');
            }

            this.sendStatusToWindow('update-error', {
                message: userFriendlyMessage,
                error: errorMessage
            });
        });

        // 检查到更新
        autoUpdater.on('update-available', (info) => {
            log.info('检测到新版本:', info.version);
            this.isCheckingForUpdate = false;
            this.sendStatusToWindow('update-available', {
                version: info.version,
                releaseDate: info.releaseDate,
                releaseNotes: info.releaseNotes
            });

            // 打开更新窗口而不是显示弹窗
            const { createUpdateWindow } = require('./main');
            createUpdateWindow();
        });

        // 没有检查到更新
        autoUpdater.on('update-not-available', (_info) => {
            log.info('当前已是最新版本');
            this.isCheckingForUpdate = false;
            this.sendStatusToWindow('update-not-available', { currentVersion: app.getVersion() });

            // 显示系统级提示，告知用户当前已是最新版本
            dialog.showMessageBox({
                type: 'info',
                title: '检查更新',
                message: '当前已是最新版本',
                detail: `当前版本: ${app.getVersion()}`,
                buttons: ['确定'],
                defaultId: 0
            });
        });

        // 更新下载进度
        autoUpdater.on('download-progress', (progressObj) => {
            this.sendStatusToWindow('download-progress', progressObj);
        });

        // 更新下载完成
        autoUpdater.on('update-downloaded', (info) => {
            log.info('更新已下载，准备安装');
            this.sendStatusToWindow('update-downloaded', {
                version: info.version,
                releaseDate: info.releaseDate,
                releaseNotes: info.releaseNotes
            });

            // 提示用户是否立即安装
            dialog.showMessageBox({
                type: 'info',
                title: '安装更新',
                message: `新版本 ${info.version} 已下载完成，是否立即安装？`,
                buttons: ['立即安装', '稍后安装'],
                defaultId: 0
            }).then(({ response }) => {
                if (response === 0) {
                    // 立即安装并重启应用
                    autoUpdater.quitAndInstall(false, true);
                }
            });
        });
    }

    /**
     * 注册IPC事件处理
     */
    private registerIpcHandlers() {
        // 手动检查更新
        ipcMain.handle('check-for-updates', async () => {
            return this.checkForUpdates();
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
    }

    /**
     * 向渲染进程发送更新状态
     */
    private sendStatusToWindow(status: string, data: any = {}) {
        if (this.mainWindow && !this.mainWindow.isDestroyed()) {
            this.mainWindow.webContents.send('update-status', { status, data });
        }
    }

    /**
     * 检查更新
     */
    public async checkForUpdates(): Promise<boolean> {
        if (this.isCheckingForUpdate) {
            log.info('已有更新检查正在进行中');
            return false;
        }

        try {
            this.isCheckingForUpdate = true;
            this.sendStatusToWindow('checking-for-update');
            log.info('开始检查更新...');
            await autoUpdater.checkForUpdates();
            return true;
        } catch (error: any) {
            log.error('检查更新出错:', error);

            // 处理特定的GitHub release错误
            let errorMessage = error.message || '未知错误';
            let userFriendlyMessage = '检查更新失败';

            // 检测GitHub release相关错误
            if (errorMessage.includes('Cannot parse releases feed') ||
                errorMessage.includes('Unable to find latest version on GitHub') ||
                errorMessage.includes('Unexpected end of JSON input')) {
                userFriendlyMessage = 'GitHub仓库版本检查失败';
                errorMessage = '请确保GitHub仓库已创建正确的发布版本，支持beta版本(v0.0.1-beta.1)格式';

                // 记录详细错误信息，帮助开发者排查
                log.debug('GitHub releases解析错误详情:', error);
                log.debug('当前allowPrerelease设置:', autoUpdater.allowPrerelease);
                log.debug('当前releaseType设置:', 'prerelease (已修改)');

                // 显示系统级提示，告知用户GitHub仓库配置问题
                dialog.showMessageBox({
                    type: 'warning',
                    title: '更新检查失败',
                    message: userFriendlyMessage,
                    detail: errorMessage,
                    buttons: ['确定'],
                    defaultId: 0
                });
            }
            // 检测找不到latest.yml文件的错误
            else if (errorMessage.includes('Cannot find latest.yml') && errorMessage.includes('HttpError: 404')) {
                userFriendlyMessage = '更新文件配置错误';
                errorMessage = '找不到更新配置文件(latest.yml)，请确保GitHub发布版本中包含了必要的更新文件';

                // 记录详细错误信息，帮助开发者排查
                log.debug('更新文件错误详情:', error);
                log.debug('提示: 请检查electron-builder配置，确保已启用yml文件生成');

                // 显示系统级提示，告知用户更新文件配置问题
                dialog.showMessageBox({
                    type: 'warning',
                    title: '更新检查失败',
                    message: userFriendlyMessage,
                    detail: errorMessage,
                    buttons: ['确定'],
                    defaultId: 0
                });
            }

            this.sendStatusToWindow('update-error', {
                message: userFriendlyMessage,
                error: errorMessage
            });

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
            this.checkForUpdates();
        }, intervalMs);

        // 启动后延迟检查一次更新
        setTimeout(() => {
            this.checkForUpdates();
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
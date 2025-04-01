/**
 * 备份管理器
 * 负责在更新时备份用户数据，以及在更新后恢复数据
 */

import { BrowserWindow, ipcMain } from 'electron';
import fs from 'fs-extra';
import os from 'os';
import path from 'path';
import { getConfigDir, getDBPath, getTempPath, settingsFileName } from './FileManager.js';
import log from './log.js';

export default class BackupManager {
    private backupDir: string;
    private dataDir: string;
    private tempDir: string;
    private configDir: string;
    private backupInProgress: boolean = false;
    private restoreInProgress: boolean = false;
    private progressCallback: ((progress: number, status: string) => void) | null = null;
    private static instance: BackupManager; // 单例实例

    constructor() {
        // 备份文件夹路径 - 使用系统临时目录
        this.backupDir = path.join(os.tmpdir(), 'clipboard-backup');
        // 需要备份的文件夹路径
        this.dataDir = getDBPath();
        this.tempDir = getTempPath();
        this.configDir = getConfigDir();

        log.info('[备份管理器] 初始化，备份目录:', this.backupDir);

        // 注册IPC事件处理
        this.registerIpcHandlers();
    }

    /**
     * 获取数据库实例的静态方法
     * 实现单例模式，确保整个应用中只有一个数据库连接
     * @returns {ClipboardDB} 数据库实例
     */
    public static getInstance(): BackupManager {
        if (!BackupManager.instance) {
            BackupManager.instance = new BackupManager();
        }
        return BackupManager.instance;
    }

    /**
     * 设置进度回调函数
     * @param callback 进度回调函数
     */
    public setProgressCallback(callback: (progress: number, status: string) => void) {
        this.progressCallback = callback;
    }

    /**
     * 更新进度
     * @param progress 进度百分比
     * @param status 状态描述
     */
    private updateProgress(progress: number, status: string) {
        if (this.progressCallback) {
            this.progressCallback(progress, status);
        }
    }

    /**
     * 检查是否存在备份
     * @returns 是否存在备份
     */
    public hasBackup(): boolean {
        return fs.existsSync(this.backupDir);
    }

    public getBackupConfig() {
        const settingsPath = path.join(this.backupDir, 'config', settingsFileName);
        return JSON.parse(fs.readFileSync(settingsPath, 'utf8'));;
    }

    /**
     * 创建备份
     * @returns 备份是否成功
     */
    public async createBackup(): Promise<boolean> {
        if (this.backupInProgress) {
            log.warn('[备份管理器] 备份已在进行中');
            return false;
        }

        try {
            this.backupInProgress = true;
            log.info('[备份管理器] 开始创建备份');
            this.updateProgress(0, '开始备份数据...');

            // 确保备份目录存在
            if (fs.existsSync(this.backupDir)) {
                log.info('[备份管理器] 删除旧的备份目录');
                await fs.remove(this.backupDir);
            }
            await fs.ensureDir(this.backupDir);
            this.updateProgress(10, '准备备份目录...');

            // 备份data文件夹
            if (fs.existsSync(this.dataDir)) {
                log.info('[备份管理器] 备份data文件夹');
                this.updateProgress(20, '备份数据文件夹...');
                await fs.copy(this.dataDir, path.join(this.backupDir, 'data'));
            } else {
                log.warn('[备份管理器] data文件夹不存在，跳过备份');
            }
            this.updateProgress(50, '数据文件夹备份完成');

            // 备份temp文件夹
            if (fs.existsSync(this.tempDir)) {
                log.info('[备份管理器] 备份temp文件夹');
                this.updateProgress(60, '备份临时文件夹...');
                await fs.copy(this.tempDir, path.join(this.backupDir, 'temp'));
            } else {
                log.warn('[备份管理器] temp文件夹不存在，跳过备份');
            }
            this.updateProgress(80, '临时文件夹备份完成');

            // 备份config文件夹
            if (fs.existsSync(this.configDir)) {
                log.info('[备份管理器] 备份config文件夹');
                this.updateProgress(90, '备份配置文件夹...');
                await fs.copy(this.configDir, path.join(this.backupDir, 'config'));
            } else {
                log.warn('[备份管理器] config文件夹不存在，跳过备份');
            }
            this.updateProgress(100, '备份完成');

            log.info('[备份管理器] 备份完成');
            this.backupInProgress = false;
            return true;
        } catch (error) {
            log.error('[备份管理器] 备份失败:', error);
            this.updateProgress(0, '备份失败');
            this.backupInProgress = false;
            return false;
        }
    }

    /**
     * 恢复备份
     * @returns 恢复是否成功
     */
    public async restoreBackup(): Promise<boolean> {
        if (this.restoreInProgress) {
            log.warn('[备份管理器] 恢复已在进行中');
            return false;
        }

        if (!this.hasBackup()) {
            log.warn('[备份管理器] 没有可用的备份');
            return false;
        }

        try {
            this.restoreInProgress = true;
            log.info('[备份管理器] 开始恢复备份');
            this.updateProgress(0, '开始恢复数据...');

            // 恢复data文件夹
            const backupDataDir = path.join(this.backupDir, 'data');
            if (fs.existsSync(backupDataDir)) {
                log.info('[备份管理器] 恢复data文件夹');
                this.updateProgress(20, '恢复数据文件夹...');
                // 确保目标目录存在
                await fs.ensureDir(this.dataDir);
                // 直接复制整个文件夹
                await fs.copy(backupDataDir, this.dataDir, { overwrite: true });
            } else {
                log.warn('[备份管理器] 备份中没有data文件夹，跳过恢复');
            }
            this.updateProgress(50, '数据文件夹恢复完成');

            // 恢复temp文件夹
            const backupTempDir = path.join(this.backupDir, 'temp');
            if (fs.existsSync(backupTempDir)) {
                log.info('[备份管理器] 恢复temp文件夹');
                this.updateProgress(60, '恢复临时文件夹...');
                // 确保目标目录存在
                await fs.ensureDir(this.tempDir);
                // 直接复制整个文件夹
                await fs.copy(backupTempDir, this.tempDir, { overwrite: true });
            } else {
                log.warn('[备份管理器] 备份中没有temp文件夹，跳过恢复');
            }
            this.updateProgress(80, '临时文件夹恢复完成');

            // 恢复config文件夹 - 这里需要特殊处理，合并配置文件
            const backupConfigDir = path.join(this.backupDir, 'config');
            if (fs.existsSync(backupConfigDir)) {
                log.info('[备份管理器] 恢复config文件夹');
                this.updateProgress(90, '恢复配置文件...');
                // 确保目标目录存在
                await fs.ensureDir(this.configDir);

                // 读取备份的配置文件目录
                const backupConfigFiles = await fs.readdir(backupConfigDir);

                // 遍历每个配置文件
                for (const fileName of backupConfigFiles) {
                    const backupFilePath = path.join(backupConfigDir, fileName);
                    const currentFilePath = path.join(this.configDir, fileName);

                    // 如果是文件夹，则跳过
                    if ((await fs.stat(backupFilePath)).isDirectory()) {
                        continue;
                    }

                    // 如果当前配置文件不存在，直接复制
                    if (!fs.existsSync(currentFilePath)) {
                        await fs.copy(backupFilePath, currentFilePath);
                        continue;
                    }

                    // 如果是JSON文件，尝试合并配置
                    if (fileName.endsWith('.conf') || fileName.endsWith('.json')) {
                        try {
                            // 读取备份的配置
                            const backupConfig = JSON.parse(await fs.readFile(backupFilePath, 'utf8'));
                            // 读取当前的配置
                            const currentConfig = JSON.parse(await fs.readFile(currentFilePath, 'utf8'));

                            // 合并配置，优先使用备份的配置
                            const mergedConfig = { ...currentConfig, ...backupConfig };

                            // 写入合并后的配置
                            await fs.writeFile(currentFilePath, JSON.stringify(mergedConfig, null, 4), 'utf8');
                        } catch (error) {
                            log.error(`[备份管理器] 合并配置文件 ${fileName} 失败:`, error);
                            // 如果合并失败，直接使用备份的配置
                            await fs.copy(backupFilePath, currentFilePath, { overwrite: true });
                        }
                    } else {
                        // 非JSON文件直接复制
                        await fs.copy(backupFilePath, currentFilePath, { overwrite: true });
                    }
                }
            } else {
                log.warn('[备份管理器] 备份中没有config文件夹，跳过恢复');
            }
            this.updateProgress(100, '恢复完成');

            log.info('[备份管理器] 恢复完成');
            this.restoreInProgress = false;
            return true;
        } catch (error) {
            log.error('[备份管理器] 恢复失败:', error);
            this.updateProgress(0, '恢复失败');
            this.restoreInProgress = false;
            return false;
        }
    }

    /**
     * 删除备份
     * @returns 删除是否成功
     */
    public async deleteBackup(): Promise<boolean> {
        try {
            if (fs.existsSync(this.backupDir)) {
                log.info('[备份管理器] 删除备份目录:', this.backupDir);
                await fs.remove(this.backupDir);
            }
            return true;
        } catch (error) {
            log.error('[备份管理器] 删除备份失败:', error);
            return false;
        }
    }

    /**
     * 清理备份文件
     * 当取消备份时使用
     * @returns 清理是否成功
     */
    public async cleanBackupFiles(): Promise<boolean> {
        try {
            // 重置备份状态
            this.backupInProgress = false;

            if (fs.existsSync(this.backupDir)) {
                log.info('[备份管理器] 清理备份文件:', this.backupDir);
                await fs.remove(this.backupDir);
                await fs.ensureDir(this.backupDir);
            }

            this.updateProgress(0, '备份已取消');
            return true;
        } catch (error) {
            log.error('[备份管理器] 清理备份文件失败:', error);
            return false;
        }
    }

    /**
     * 向渲染进程发送备份进度
     * @param window 窗口实例
     * @param progress 进度百分比
     * @param status 状态描述
     */
    public static sendProgressToWindow(window: BrowserWindow, progress: number, status: string) {
        if (window && !window.isDestroyed()) {
            window.webContents.send('backup-status', { progress, status });
        }
    }

    /**
     * 注册IPC事件处理
     */
    private registerIpcHandlers() {
        // 开始恢复备份
        ipcMain.handle('start-restore', async () => {
            return this.restoreUserData();
        });

        // 删除备份文件
        ipcMain.handle('remove-backup', async () => {
            log.info('[主进程] 删除备份文件');

            // 获取备份管理器实例
            const backupManager = BackupManager.getInstance();
            if (!backupManager) {
                log.error('[主进程] 备份管理器实例不存在');
                return false;
            }

            // 删除备份文件
            const result = await backupManager.deleteBackup();
            log.info('[主进程] 删除备份文件结果:', result);
            return result;
        });
    }

    /**
    * 恢复用户数据
    * @returns 恢复是否成功
    */
    private async restoreUserData(): Promise<boolean> {
        const backupManager = BackupManager.getInstance();
        if (!backupManager) {
            log.error('备份管理器未初始化');
            return false;
        }

        // 获取恢复窗口
        const existingWindows = BrowserWindow.getAllWindows();
        // @ts-ignore
        const restoreWindow = existingWindows.find(win => win.uniqueId === 'restore-window');

        // 设置进度回调
        backupManager.setProgressCallback((progress, status) => {
            if (restoreWindow && !restoreWindow.isDestroyed()) {
                restoreWindow.webContents.send('backup-status', { progress, status });
            }
        });

        // 执行恢复
        return await backupManager.restoreBackup();
    }
}
import { BrowserWindow, ipcMain } from "electron";
import { updateSettings, updateShortcutKeys } from "./FileManager";
import log from "./log";
import ClipboardListService from "./list";

const env = process.env.NODE_ENV;

export default class SettingsService {
    private static instance: SettingsService; // 单例实例

    public static devtoolConfig: any = {
        isDev: env === 'development',
        //    isDev: false,
        isShow: false,
    }

    constructor() {

        this.registerIpcHandlers();
    }

    public static getInstance() {
        if (!SettingsService.instance) {
            SettingsService.instance = new SettingsService(); 
        }
        return SettingsService.instance;
    }

    /**
  * 注册IPC事件处理
  */
    private registerIpcHandlers() {
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
            ClipboardListService.window?.webContents.send('load-shortcut-keys', JSON.stringify(config));
            return true;
        });

        // 监听修改开发者工具显示状态
        ipcMain.handle('update-devtool-show', async (_event, isShow) => {
            SettingsService.devtoolConfig.isShow = isShow;
            const existingWindows = BrowserWindow.getAllWindows();
            if (existingWindows.length > 0) {
                existingWindows.forEach((win) => {
                    win.webContents.send('show-devtool', JSON.stringify(SettingsService.devtoolConfig));
                });
            }
        });
    }
}
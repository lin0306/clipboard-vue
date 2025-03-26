import { globalShortcut, BrowserWindow } from 'electron';
import log from './log';

// 快捷键管理器
class ShortcutManager {

    private mainWindow: BrowserWindow | null = null;
    private showHotkey: string | null = null;

    constructor(mainWindow: BrowserWindow, showHotkey: string) {
        this.mainWindow = mainWindow;
        this.showHotkey = showHotkey;
    }

    // 加载快捷键配置
    async loadShortcuts() {
        try {
            this.registerShowHotkey();
        } catch (error) {
            log.error('加载快捷键配置失败:', error);
        }
    }

    // 注册显示应用的快捷键
    registerShowHotkey() {
        log.info('注册快捷键:', this.showHotkey);
        // 先注销之前的快捷键
        this.unregisterShowHotkey();

        // 如果有配置快捷键，则注册
        if (this.showHotkey) {
            try {
                globalShortcut.register(this.showHotkey, () => {
                    if (this.mainWindow) {
                        if (this.mainWindow.isMinimized()) {
                            this.mainWindow.restore();
                        }
                        this.mainWindow.show();
                        this.mainWindow.focus();
                    }
                });
                log.info(`已注册唤起应用快捷键: ${this.showHotkey}`);
            } catch (error) {
                log.error('注册唤起应用快捷键失败:', error);
            }
        }
    }

    // 注销显示应用的快捷键
    unregisterShowHotkey() {
        if (this.showHotkey) {
            try {
                globalShortcut.unregister(this.showHotkey);
            } catch (error) {
                log.error('注销唤起应用快捷键失败:', error);
            }
        }
    }

    // 清理所有快捷键
    cleanup() {
        this.unregisterShowHotkey();
        globalShortcut.unregisterAll();
    }
}

export default ShortcutManager;
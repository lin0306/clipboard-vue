/**
 * Store管理器
 * 统一管理应用的持久化存储
 */

import { app } from 'electron';
import Store from 'electron-store';
import log from './log.ts';

// 定义Store的类型
export interface UpdateStoreSchema {
    updateLimitTime?: string;
}

export interface AppStoreSchema {
    isFirstLaunch?: boolean;
    lastLaunchVersion?: string;
}

/**
 * Store管理器类
 * 使用单例模式，统一管理应用的所有Store实例
 */
export default class StoreManager {
    private static instance: StoreManager;
    
    // Store实例
    private updateStore: Store<UpdateStoreSchema>;
    private appStore: Store<AppStoreSchema>;

    private constructor() {
        // 初始化更新配置存储
        this.updateStore = new Store<UpdateStoreSchema>({
            name: 'update-config',  // 不含扩展名的文件名
            cwd: app.getPath('userData'),  // 存储在应用的userData目录下
        });

        // 初始化应用配置存储
        this.appStore = new Store<AppStoreSchema>({
            name: 'app-config',  // 不含扩展名的文件名
            cwd: app.getPath('userData'),  // 存储在应用的userData目录下
        });

        log.info('[Store管理器] 初始化完成');
    }

    /**
     * 获取StoreManager实例
     * @returns StoreManager实例
     */
    public static getInstance(): StoreManager {
        if (!StoreManager.instance) {
            StoreManager.instance = new StoreManager();
        }
        return StoreManager.instance;
    }

    /**
     * 获取更新配置Store
     * @returns 更新配置Store实例
     */
    public getUpdateStore(): Store<UpdateStoreSchema> {
        return this.updateStore;
    }

    /**
     * 获取应用配置Store
     * @returns 应用配置Store实例
     */
    public getAppStore(): Store<AppStoreSchema> {
        return this.appStore;
    }

    /**
     * 获取更新限制时间
     * @returns 更新限制时间（毫秒时间戳）或undefined
     */
    public getUpdateLimitTime(): number | undefined {
        const updateConfig = this.updateStore.store;
        if (updateConfig.updateLimitTime) {
            return Number(updateConfig.updateLimitTime);
        }
        return undefined;
    }

    /**
     * 设置更新限制时间
     * @param time 更新限制时间（毫秒时间戳）
     */
    public setUpdateLimitTime(time: number): void {
        this.updateStore.store = { updateLimitTime: time.toString() };
        log.info('[Store管理器] 更新限制时间已保存');
    }

    /**
     * 清除更新限制时间
     */
    public clearUpdateLimitTime(): void {
        this.updateStore.clear();
        log.info('[Store管理器] 更新配置已清空');
    }

    /**
     * 检查是否是首次启动应用
     * @returns 是否是首次启动
     */
    public isFirstLaunch(): boolean {
        const appConfig = this.appStore.store;
        // 如果isFirstLaunch字段不存在或为true，则认为是首次启动
        return appConfig.isFirstLaunch === undefined || appConfig.isFirstLaunch === true;
    }

    /**
     * 标记应用已启动过
     */
    public markAsLaunched(): void {
        this.appStore.set('isFirstLaunch', false);
        this.appStore.set('lastLaunchVersion', app.getVersion());
        log.info('[Store管理器] 已标记应用为非首次启动');
    }

    /**
     * 检查是否是新版本首次启动
     * @returns 是否是新版本首次启动
     */
    public isNewVersionFirstLaunch(): boolean {
        const appConfig = this.appStore.store;
        const currentVersion = app.getVersion();
        // 如果lastLaunchVersion不存在或与当前版本不同，则认为是新版本首次启动
        return appConfig.lastLaunchVersion === undefined || appConfig.lastLaunchVersion !== currentVersion;
    }

    /**
     * 更新最后启动版本
     */
    public updateLastLaunchVersion(): void {
        this.appStore.set('lastLaunchVersion', app.getVersion());
        log.info('[Store管理器] 已更新最后启动版本');
    }
}
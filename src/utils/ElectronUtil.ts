export class ElectronManager {

    private static _instance: ElectronManager;
    private static _msg: any;

    // 私有构造函数
    private constructor() {}

    // 获取单例实例
    public static getInstance(msg?: any): ElectronManager {
        if (!ElectronManager._instance) {
            ElectronManager._instance = new ElectronManager();
        }
        if (msg) {
            ElectronManager._msg = msg;
        }
        return ElectronManager._instance;
    }
}
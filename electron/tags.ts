import { ipcMain, shell } from "electron";
import ClipboardDB from "./db";
import log from "./log";
import ClipboardListService from "./list";

export default class TagsService {

    private static instance: TagsService; // 单例实例

    constructor() {

        this.registerIpcHandlers();
    }

    public static getInstance() {
        if (!TagsService.instance) {
            TagsService.instance = new TagsService();
        }
        return TagsService.instance;
    }

    /**
     * 注册IPC事件处理
     */
    private registerIpcHandlers() {
        // 监听剪贴板列表内容删除
        ipcMain.handle('add-tag', async (_event, name, color) => {
            log.info('[主进程] 标签添加', name, color);
            const db = ClipboardDB.getInstance()
            db?.addTag(name, color);
            const tags = db?.getAllTags();
            ClipboardListService.window?.webContents.send('load-tag-items', JSON.stringify(tags));
        });

        // 监听标签修改
        ipcMain.handle('update-tag', async (_event, id, name, color) => {
            log.info('[主进程] 更新标签', id, name, color);
            const db = ClipboardDB.getInstance()
            db?.updateTag(id, name, color);
            const tags = db?.getAllTags();
            ClipboardListService.window?.webContents.send('load-tag-items', JSON.stringify(tags));
        });

        // 监听标签删除
        ipcMain.handle('delete-tag', async (_event, id) => {
            log.info('[主进程] 删除标签', id);
            const db = ClipboardDB.getInstance()
            db?.deleteTag(id);
            const tags = db?.getAllTags();
            ClipboardListService.window?.webContents.send('load-tag-items', JSON.stringify(tags));
        });

        // 监听获取所有标签
        ipcMain.handle('get-all-tags', async () => {
            log.info('[主进程] 获取所有标签');
            const db = ClipboardDB.getInstance()
            return db?.getAllTags();
        });

        ipcMain.on('open-external-link', (_event, url) => {
            shell.openExternal(url);
        });
    }
}
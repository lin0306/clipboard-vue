/**
 * 剪贴板数据库模块
 * 负责管理剪贴板内容的存储、检索和操作
 */
import Database from 'better-sqlite3';
import fs from 'fs-extra';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getDBPath, getSettings } from './FileManager.js';
import log from './log.js';

// 获取当前文件的目录路径
let __dirname = path.dirname(fileURLToPath(import.meta.url));
// 获取当前环境
const env = process.env.NODE_ENV;
// 在生产环境中调整路径，移除asar包路径
if (env !== 'development') {
    __dirname = __dirname.replace("\\app.asar\\dist-electron", "");
}

/**
 * 剪贴板数据库类
 * 使用单例模式管理SQLite数据库连接和操作
 * 提供剪贴板内容和标签的CRUD操作
 */
class ClipboardDB {
    private static instance: ClipboardDB; // 单例实例
    private db: Database.Database | undefined; // SQLite数据库连接
    private static isInit: boolean = true; // 是否初始化
    /**
     * 静态方法，获取数据库实例
     * 实现单例模式，确保整个应用中只有一个数据库连接
     * @returns {ClipboardDB} 数据库实例

    /**
     * 私有构造函数，初始化数据库连接和表结构
     * 实现单例模式，确保只有一个数据库连接实例
     */
    private constructor() {
        if (!ClipboardDB.isInit) {
            return;
        }
        log.info("[数据库进程] 数据库初始化");
        const dbFolder = getDBPath();
        log.info("[数据库进程] 数据文件存储文件夹位置：", dbFolder);
        if (!fs.existsSync(dbFolder)) {
            fs.mkdirSync(dbFolder);
        }
        const dbPath = path.join(dbFolder, 'clipboard.db');
        log.info("[数据库进程] 数据文件存储位置：", dbPath);
        this.db = new Database(dbPath);
        this.initTables();
        log.info("[数据库进程] 数据库初始化完成");
    }

    /**
     * 获取数据库实例的静态方法
     * 实现单例模式，确保整个应用中只有一个数据库连接
     * @returns {ClipboardDB} 数据库实例
     */
    public static getInstance(isInit: boolean = true): ClipboardDB | undefined {
        if (!isInit) {
            ClipboardDB.isInit = false;
            return;
        }
        if (!ClipboardDB.isInit) {
            return;
        }
        
        if (!ClipboardDB.instance) {
            ClipboardDB.instance = new ClipboardDB();
        }
        return ClipboardDB.instance;
    }

    /**
     * 初始化数据库表结构
     * 创建剪贴板条目表、标签表和关联表
     */
    private initTables() {
        // 创建剪贴板条目表
        this.getDB().exec(`
                    CREATE TABLE IF NOT EXISTS clipboard_items (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        content TEXT NOT NULL,
                        copy_time INTEGER NOT NULL,
                        is_topped BOOLEAN DEFAULT 0,
                        top_time INTEGER,
                        type TEXT DEFAULT 'text',
                        file_path TEXT
                    )
                `);

        // 创建标签表
        this.getDB().exec(`
                    CREATE TABLE IF NOT EXISTS tags (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        name TEXT NOT NULL UNIQUE,
                        color TEXT,
                        created_at INTEGER NOT NULL
                    )
                `);

        // 创建剪贴板条目和标签的关联表
        this.getDB().exec(`
                    CREATE TABLE IF NOT EXISTS item_tags (
                        item_id INTEGER,
                        tag_id INTEGER,
                        FOREIGN KEY (item_id) REFERENCES clipboard_items (id) ON DELETE CASCADE,
                        FOREIGN KEY (tag_id) REFERENCES tags (id) ON DELETE CASCADE,
                        PRIMARY KEY (item_id, tag_id)
                    )
                `);
    }

    private getDB(): Database.Database {
        return this.db as Database.Database;
    }

    /**
     * 关闭数据库连接
     * 在应用退出前调用，确保资源正确释放
     */
    close() {
        this.getDB().close();
    }

    /**
     * 添加剪贴板条目
     * 支持文本和图片类型，处理重复内容的逻辑
     * @param {string} content 剪贴板内容
     * @param {string} type 内容类型，默认为'text'，也可以是'image'
     * @param {string|null} filePath 图片类型的文件路径，默认为null
     */
    addItem(content: string, type: string = 'text', filePath: string | null) {
        log.info("[数据库进程] 剪贴板内容添加开始", [content, type, filePath]);

        try {
            this.getDB().transaction(() => {
                // 覆盖相同内容的旧记录的复制时间
                if (type === 'text') {
                    log.info("[数据库进程] 查询相同文本内容的旧记录");
                    const row = this.getDB().prepare('SELECT id FROM clipboard_items WHERE content = ? AND type = ?').get(content, type) as { id: number };
                    if (row) {
                        this.updateItemTime(row.id, Date.now());
                        log.info("[数据库进程] 有查询到相同文本内容的记录，覆盖复制时间");
                        return;
                    }
                } else if (filePath) {
                    log.info("[数据库进程] 查询相同文件路径的旧记录");
                    const row = this.getDB().prepare('SELECT id FROM clipboard_items WHERE type = ? AND file_path = ?').get(type, filePath) as { id: number };
                    if (row) {
                        this.updateItemTime(row.id, Date.now());
                        log.info("[数据库进程] 有查询到相同文件内容的记录，覆盖复制时间");
                        return;
                    }
                }

                log.info("[数据库进程] 准备插入新的剪贴板记录");
                this.getDB().prepare('INSERT INTO clipboard_items (content, copy_time, type, file_path) VALUES (?, ?, ?, ?)').run(content, Date.now(), type, filePath);
            })();
            log.info("[数据库进程] 剪贴板内容添加成功");
        } catch (err) {
            log.error("[数据库进程] 剪贴板内容添加失败", err);
            throw err;
        } finally {
            log.info("[数据库进程] 剪贴板内容添加完成");
        }
    }

    /**
     * 历史记录数量限制和自动清理过期项目
     */
    async asyncClearingExpiredData() {
        log.info("[数据库进程] 异步清理剪贴板过期内容开始");
        try {
            // 获取配置
            const config = getSettings();
            const maxHistoryItems = config.maxHistoryItems || 2000;
            const autoCleanupDays = config.autoCleanupDays || 30;

            this.getDB().transaction(() => {
                // 自动清理过期项目
                if (autoCleanupDays > 0) {
                    const cutoffTime = Date.now() - (autoCleanupDays * 24 * 60 * 60 * 1000);
                    log.info(`[数据库进程] 清理${autoCleanupDays}天前的剪贴板记录`);

                    // 获取要删除的文件文件路径
                    const oldFileItems = this.getDB().prepare(
                        'SELECT id, file_path FROM clipboard_items WHERE is_topped = 0 AND copy_time < ? AND file_path IS NOT NULL'
                    ).all(cutoffTime) as { id: number, file_path: string }[];

                    // 删除过期的非置顶项目
                    const result = this.getDB().prepare(
                        'DELETE FROM clipboard_items WHERE is_topped = 0 AND copy_time < ?'
                    ).run(cutoffTime);

                    if (result.changes > 0) {
                        log.info(`[数据库进程] 已清理${result.changes}条过期记录`);

                        // 删除对应的图片文件
                        let deleteFileCnt = 0;
                        for (const item of oldFileItems) {
                            try {
                                if (fs.existsSync(item.file_path)) {
                                    fs.unlinkSync(item.file_path);
                                    log.info(`[数据库进程] 已删除过期文件: ${item.file_path}`);
                                }
                                deleteFileCnt++;
                            } catch (unlinkError) {
                                log.error(`[数据库进程] 删除过期文件失败: ${item.file_path}`, unlinkError);
                            }
                        }
                        log.info(`[数据库进程] 已清理${deleteFileCnt}条过期文件记录`);
                    }
                }

                // 检查历史记录数量是否超过限制
                const totalCount = this.getDB().prepare('SELECT COUNT(*) as count FROM clipboard_items').get() as { count: number };
                if (totalCount.count >= maxHistoryItems) {
                    log.info(`[数据库进程] 历史记录数量(${totalCount.count})已达到上限(${maxHistoryItems})，删除最早的非置顶记录`);

                    // 获取要删除的最早的非置顶记录数量
                    const deleteCount = totalCount.count - maxHistoryItems + 1; // +1 为即将添加的新记录腾出空间

                    // 获取要删除的图片文件路径
                    const oldImageItems = this.getDB().prepare(
                        `SELECT id, file_path FROM clipboard_items 
                             WHERE type = 'image' AND is_topped = 0 AND file_path IS NOT NULL 
                             ORDER BY copy_time ASC LIMIT ?`
                    ).all(deleteCount) as { id: number, file_path: string }[];

                    // 删除最早的非置顶记录
                    const result = this.getDB().prepare(
                        `DELETE FROM clipboard_items 
                             WHERE id IN (SELECT id FROM clipboard_items 
                                         WHERE is_topped = 0 
                                         ORDER BY copy_time ASC LIMIT ?)`
                    ).run(deleteCount);

                    if (result.changes > 0) {
                        log.info(`[数据库进程] 已删除${result.changes}条最早的记录`);

                        // 删除对应的图片文件
                        for (const item of oldImageItems) {
                            try {
                                if (fs.existsSync(item.file_path)) {
                                    fs.unlinkSync(item.file_path);
                                    log.info(`[数据库进程] 已删除图片文件: ${item.file_path}`);
                                }
                            } catch (unlinkError) {
                                log.error(`[数据库进程] 删除图片文件失败: ${item.file_path}`, unlinkError);
                            }
                        }
                    }
                }
            })();
        } catch (err) {
            log.error("[数据库进程] 异步清理剪贴板过期内容失败", err);
            throw err;
        } finally {
            log.info("[数据库进程] 异步清理剪贴板过期内容完成");
        }
    }

    /**
     * 获取剪贴板条目信息
     * @param {number} id 条目ID
     * @returns {any} 条目信息
     */
    getItemById(id: number): any {
        return this.getDB().prepare('SELECT * FROM clipboard_items WHERE id =?').get(id);
    }

    /**
     * 获取所有剪贴板条目
     * 按置顶状态和时间排序
     * @returns {Array} 剪贴板条目数组
     */
    getAllItems(): Array<any> {
        return this.getDB().prepare('SELECT * FROM clipboard_items ORDER BY is_topped DESC, CASE WHEN is_topped = 1 THEN top_time ELSE copy_time END DESC').all();
    }

    /**
     * 根据标签名获取剪贴板条目
     * @param {string} tagName 标签名称
     * @returns {Array} 符合条件的剪贴板条目数组
     */
    getItemsByTag(tagName: string): Array<any> {
        return this.getDB().prepare('SELECT ci.* FROM clipboard_items ci ' +
            'INNER JOIN item_tags it ON ci.id = it.item_id ' +
            'INNER JOIN tags t ON it.tag_id = t.id ' +
            'WHERE t.name = ? ' +
            'ORDER BY ci.is_topped DESC, CASE WHEN ci.is_topped = 1 THEN ci.top_time ELSE ci.copy_time END DESC')
            .all(tagName);
    }

    /**
     * 删除剪贴板条目
     * 如果是图片类型，同时删除对应的临时文件
     * @param {number} id 条目ID
     */
    deleteItem(id: number) {
        try {
            // 先获取要删除的内容信息
            const row = this.getDB().prepare('SELECT type, file_path FROM clipboard_items WHERE id = ?').get(id) as { type: string, file_path: string } | undefined;
            log.info('[数据库进程] 要删除的内容信息:', row);
            // 如果是图片类型，删除对应的临时文件
            if (row && row.file_path) {
                try {
                    fs.unlinkSync(row.file_path);
                } catch (unlinkError) {
                    console.error('删除临时图片文件失败:', unlinkError);
                }
            }

            // 删除数据库记录
            this.getDB().prepare('DELETE FROM clipboard_items WHERE id = ?').run(id);
            log.info('[数据库进程] 剪贴板内容删除成功');
        } catch (err) {
            throw err;
        }
    }

    /**
     * 清空所有剪贴板条目
     * 删除所有图片文件并清空数据库记录
     * @returns {Promise<void>} 完成清空操作的Promise
     */
    clearAll(): Promise<void> {
        return new Promise<void>(async (resolve, reject) => {
            try {
                // 读取配置文件获取临时文件存储路径
                const config = getSettings();
                const tempDir = config.tempPath;

                // 先获取所有图片类型的记录
                log.info('[数据库进程] 正在获取所有图片记录...');
                const rows = this.getDB().prepare('SELECT type, file_path FROM clipboard_items WHERE file_path IS NOT NULL').all() as { type: string, file_path: string }[];

                // 删除所有图片文件
                log.info('[数据库进程] 开始删除文件...');
                for (const row of rows) {
                    if (row.file_path) {
                        try {
                            fs.unlinkSync(row.file_path);
                            log.info(`[数据库进程] 成功删除文件: ${row.file_path}`);
                        } catch (unlinkError) {
                            console.error(`[数据库进程] 删除文件失败: ${row.file_path}`, unlinkError);
                        }
                    }
                }

                // 清空数据库记录
                log.info('[数据库进程] 正在清空数据库记录...');
                this.getDB().prepare('DELETE FROM clipboard_items').run();

                // 确保temp目录存在
                if (!fs.existsSync(tempDir)) {
                    log.info('[数据库进程] 正在创建临时目录...');
                    fs.mkdirSync(tempDir, { recursive: true, mode: 0o777 });
                    log.info('[数据库进程] 临时目录创建成功');
                }

                log.info('[数据库进程] 剪贴板内容和临时文件清理完成');
                resolve();
            } catch (err) {
                console.error('[数据库进程] 清空剪贴板时发生错误:', err);
                reject(err);
            }
        });
    }

    /**
     * 切换剪贴板条目的置顶状态
     * @param {number} id 条目ID
     * @param {boolean} isTopped 是否置顶
     */
    toggleTop(id: number, isTopped: boolean) {
        this.getDB().prepare('UPDATE clipboard_items SET is_topped = ?, top_time = ? WHERE id = ?').run(isTopped ? 1 : 0, isTopped ? Date.now() : null, id);
    }

    /**
     * 搜索剪贴板内容
     * 支持按内容和标签ID进行搜索
     * @param {string} content 搜索内容关键词
     * @param {number} tagId 标签ID
     * @returns {Array} 符合条件的剪贴板条目数组
     */
    searchItems(content: string, tagId: number): any[] {
        return this.searchItemsPaged(content, tagId, 1, 1000).items;
    }

    /**
     * 分页搜索剪贴板内容
     * 支持按内容和标签ID进行搜索，并支持分页
     * @param {string} content 搜索内容关键词
     * @param {number} tagId 标签ID
     * @param {number} page 页码，从1开始
     * @param {number} pageSize 每页条数
     * @returns {Object} 包含总条数和当前页数据的对象
     */
    searchItemsPaged(content: string, tagId: number, page: number = 1, pageSize: number = 10): { total: number, items: any[] } {
        // 构建基础SQL查询，用于计算总条数
        let countSql = 'SELECT COUNT(DISTINCT ci.id) as total FROM clipboard_items ci';
        const countParams = [];

        // 构建基础SQL查询，获取符合条件的剪贴板条目
        let itemsSql = 'SELECT DISTINCT ci.*, ('
            + 'SELECT json_group_array(json_object('
            + "'id', t.id, 'name', t.name, 'color', t.color, 'created_at', t.created_at"
            + ')) FROM tags t'
            + ' INNER JOIN item_tags it ON t.id = it.tag_id'
            + ' WHERE it.item_id = ci.id'
            + ') as tags_json FROM clipboard_items ci';
        const itemsParams = [];

        // 根据标签ID构建查询条件
        if (tagId && tagId !== null) {
            // 通过关联表连接标签和剪贴板条目
            const joinClause = ' INNER JOIN item_tags it ON ci.id = it.item_id'
                + ' INNER JOIN tags t ON it.tag_id = t.id'
                + ' WHERE t.id = ?';
            countSql += joinClause;
            itemsSql += joinClause;
            countParams.push(tagId);
            itemsParams.push(tagId);
        }

        // 根据内容关键词构建查询条件
        if (content && content !== null && content !== '') {
            const whereClause = (tagId && tagId !== null) ? ' AND ci.content LIKE ?' : ' WHERE ci.content LIKE ?';
            countSql += whereClause;
            itemsSql += whereClause;
            countParams.push(`%${content}%`);
            itemsParams.push(`%${content}%`);
        }

        // 添加排序条件：先按置顶状态，再按时间排序
        itemsSql += ' ORDER BY ci.is_topped DESC, CASE WHEN ci.is_topped = 1 THEN ci.top_time ELSE ci.copy_time END DESC';

        // 添加分页限制
        const offset = (page - 1) * pageSize;
        itemsSql += ' LIMIT ? OFFSET ?';
        itemsParams.push(pageSize, offset);

        // 获取总条数
        const countResult = this.getDB().prepare(countSql).get(countParams) as { total: number };
        const total = countResult.total;

        // 获取符合条件的剪贴板条目
        const items = this.getDB().prepare(itemsSql).all(itemsParams) as any[];

        // 处理JSON字符串为JavaScript对象
        for (const item of items) {
            try {
                item.tags = item.tags_json ? JSON.parse(item.tags_json) : [];
                delete item.tags_json; // 删除原始JSON字符串字段
            } catch (e) {
                log.error('[数据库进程] 解析标签JSON失败:', e);
                item.tags = [];
            }
        }

        return { total, items };
    }

    /**
     * 更新剪贴板条目的复制时间
     * @param {number} id 条目ID
     * @param {number} newTime 新的复制时间
     */
    updateItemTime(id: number, newTime: number) {
        this.getDB().prepare('UPDATE clipboard_items SET copy_time = ? WHERE id = ?').run(newTime, id);
    }

    /**
     * 检查和管理存储大小
     * 确保存储大小不超过配置的最大值
     * @returns {Promise<void>}
     */
    async checkStorageSize(): Promise<void> {
        try {
            const config = getSettings();
            const maxStorageSizeMB = config.maxStorageSize || 5000; // 默认5GB
            const maxStorageSizeBytes = maxStorageSizeMB * 1024 * 1024;

            // 获取临时目录路径
            const tempDir = config.tempPath;
            if (!tempDir || !fs.existsSync(tempDir)) {
                return;
            }

            // 计算当前存储大小
            let totalSize = 0;
            const files = fs.readdirSync(tempDir);
            for (const file of files) {
                const filePath = path.join(tempDir, file);
                const stats = fs.statSync(filePath);
                totalSize += stats.size;
            }

            log.info(`[数据库进程] 当前存储大小: ${totalSize / (1024 * 1024)}MB, 最大限制: ${maxStorageSizeMB}MB`);

            // 如果超过限制，删除最早的非置顶图片文件直到低于限制
            if (totalSize > maxStorageSizeBytes) {
                log.info(`[数据库进程] 存储大小超过限制，开始清理`);

                // 获取所有图片条目，按时间排序
                const fileItems = this.getDB().prepare(
                    'SELECT id, file_path, copy_time FROM clipboard_items WHERE is_topped = 0 AND file_path IS NOT NULL ORDER BY copy_time ASC'
                ).all() as { id: number, file_path: string, copy_time: number }[];

                let deletedSize = 0;
                let deletedCount = 0;

                for (const item of fileItems) {
                    if (totalSize - deletedSize <= maxStorageSizeBytes) {
                        break; // 已经低于限制，停止删除
                    }

                    try {
                        if (fs.existsSync(item.file_path)) {
                            const stats = fs.statSync(item.file_path);
                            const fileSize = stats.size;

                            // 删除文件
                            fs.unlinkSync(item.file_path);
                            // 删除数据库记录
                            this.getDB().prepare('DELETE FROM clipboard_items WHERE id = ?').run(item.id);

                            deletedSize += fileSize;
                            deletedCount++;
                            log.info(`[数据库进程] 已删除文件: ${item.file_path}, 大小: ${fileSize / (1024 * 1024)}MB`);
                        }
                    } catch (error) {
                        log.error(`[数据库进程] 删除文件失败: ${item.file_path}`, error);
                    }
                }

                log.info(`[数据库进程] 存储清理完成，已删除${deletedCount}个文件，释放${deletedSize / (1024 * 1024)}MB空间`);
            }
        } catch (error) {
            log.error('[数据库进程] 检查存储大小时出错:', error);
        }
    }

    // 标签相关的方法
    /**
     * 添加新标签
     * @param {string} name 标签名称
     * @param {string} color 标签颜色
     */
    addTag(name: string, color: string) {
        this.getDB().prepare('INSERT INTO tags (name, color, created_at) VALUES (?, ?, ?)').run(name, color, Date.now());
    }

    /**
     * 删除标签
     * @param {number} id 标签ID
     */
    deleteTag(id: number) {
        this.getDB().prepare('DELETE FROM tags WHERE id = ?').run(id);
    }

    /**
     * 更新标签
     * @param {number} id 标签ID
     * @param {string} name 标签名称
     * @param {string} color 标签颜色
     */
    updateTag(id: number, name: string, color: string) {
        this.getDB().prepare('UPDATE tags SET name = ?, color = ? WHERE id = ?').run(name, color, id);
    }

    /**
     * 获取所有标签
     * @returns {Array} 标签数组，按创建时间升序排列
     */
    getAllTags(): Array<any> {
        return this.getDB().prepare('SELECT * FROM tags ORDER BY created_at ASC').all();
    }

    /**
     * 剪贴板条目绑定标签
     * @param {number} itemId 剪贴板条目ID
     * @param {number} tagId 标签ID
     */
    addItemTag(itemId: number, tagId: number) {
        this.getDB().prepare('INSERT INTO item_tags (item_id, tag_id) VALUES (?, ?)').run(itemId, tagId);
    }

    /**
     * 移除剪贴板条目的标签
     * @param {number} itemId 剪贴板条目ID
     * @param {number} tagId 标签ID
     */
    removeItemTag(itemId: number, tagId: number) {
        this.getDB().prepare('DELETE FROM item_tags WHERE item_id = ? AND tag_id = ?').run(itemId, tagId);
    }

    /**
     * 获取剪贴板条目的所有标签
     * @param {number} itemId 剪贴板条目ID
     * @returns {Array} 标签数组
     */
    getItemTags(itemId: number): Array<any> {
        return this.getDB().prepare('SELECT t.* FROM tags t INNER JOIN item_tags it ON t.id = it.tag_id WHERE it.item_id = ?').all(itemId);
    }

    /**
     * 将剪贴板条目绑定到标签
     * 检查标签是否存在，避免重复绑定
     * @param {number} itemId 剪贴板条目ID
     * @param {number|string} tagId 标签ID
     * @throws {Error} 当标签不存在时抛出错误
     */
    bindItemToTag(itemId: number, tagId: any) {
        // 验证标签是否存在
        const tag = this.getDB().prepare('SELECT id FROM tags WHERE id = ?').get(tagId) as { id: number } | undefined;
        if (!tag) {
            throw new Error('标签不存在');
        }
        // 检查标签是否已经绑定
        const bindInfo = this.getDB().prepare('SELECT * FROM item_tags WHERE item_id = ? AND tag_id = ?').get(itemId, tag.id);
        if (bindInfo) {
            log.info('[数据库进程] 标签已绑定');
            return;
        }
        // 标签未绑定，执行绑定操作
        this.getDB().prepare('INSERT OR IGNORE INTO item_tags (item_id, tag_id) VALUES (?, ?)').run(itemId, tag.id);
    }
}

/**
 * 导出ClipboardDB类
 * 使用单例模式，通过getInstance()方法获取实例
 */
export default ClipboardDB;
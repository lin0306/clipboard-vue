/**
 * 剪贴板数据库模块
 * 负责管理剪贴板内容的存储、检索和操作
 */
import Database from 'better-sqlite3';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import log from './log.js'
import { getConfig } from './ConfigFileManager.js';

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
    private db: Database.Database; // SQLite数据库连接

    /**
     * 私有构造函数，初始化数据库连接和表结构
     * 实现单例模式，确保只有一个数据库连接实例
     */
    private constructor() {
        log.info("[数据库进程] 数据库初始化");
        const dbFolder = path.join(__dirname, '../data');
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
    public static getInstance(): ClipboardDB {
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
        this.db.exec(`
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
        this.db.exec(`
                    CREATE TABLE IF NOT EXISTS tags (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        name TEXT NOT NULL UNIQUE,
                        color TEXT,
                        created_at INTEGER NOT NULL
                    )
                `);

        // 创建剪贴板条目和标签的关联表
        this.db.exec(`
                    CREATE TABLE IF NOT EXISTS item_tags (
                        item_id INTEGER,
                        tag_id INTEGER,
                        FOREIGN KEY (item_id) REFERENCES clipboard_items (id) ON DELETE CASCADE,
                        FOREIGN KEY (tag_id) REFERENCES tags (id) ON DELETE CASCADE,
                        PRIMARY KEY (item_id, tag_id)
                    )
                `);
    }

    /**
     * 关闭数据库连接
     * 在应用退出前调用，确保资源正确释放
     */
    close() {
        this.db.close();
    }

    /**
     * 添加剪贴板条目
     * 支持文本和图片类型，处理重复内容的逻辑
     * @param {string} content 剪贴板内容
     * @param {string} type 内容类型，默认为'text'，也可以是'image'
     * @param {string|null} filePath 图片类型的文件路径，默认为null
     */
    addItem(content: string, type = 'text', filePath: string | null) {
        log.info("[数据库进程] 剪贴板内容添加开始", [content, type, filePath]);

        try {
            let copyTime = Date.now();

            // 将事务包装在单独的try-catch中
            try {
                this.db.transaction(() => {
                    // 删除相同内容的旧记录
                    if (type === 'text') {
                        log.info("[数据库进程] 删除相同文本内容的旧记录");
                        this.db.prepare('DELETE FROM clipboard_items WHERE content = ? AND type = ?').run(content, type);
                    } else if (type === 'image' && filePath) {
                        log.info("[数据库进程] 查询相同图片路径的记录");
                        const row = this.db.prepare('SELECT copy_time FROM clipboard_items WHERE type = ? AND file_path = ?').get('image', filePath) as { copy_time: number } | undefined;

                        if (row) {
                            copyTime = row.copy_time;
                            log.info("[数据库进程] 找到相同图片路径记录，使用原复制时间:", copyTime);
                        }

                        log.info("[数据库进程] 删除相同图片路径的旧记录");
                        this.db.prepare('DELETE FROM clipboard_items WHERE type = ? AND file_path = ?').run('image', filePath);
                    }

                    log.info("[数据库进程] 准备插入新的剪贴板记录");
                    this.db.prepare('INSERT INTO clipboard_items (content, copy_time, type, file_path) VALUES (?, ?, ?, ?)').run(content, copyTime, type, filePath);
                })();
            } catch (txError) {
                log.error("[数据库进程] 事务执行失败", txError);
                throw txError;
            }

            log.info("[数据库进程] 剪贴板内容添加成功");
        } catch (err) {
            log.error("[数据库进程] 剪贴板内容添加失败", err);
            throw err;
        } finally {
            log.info("[数据库进程] 剪贴板内容添加完成");
        }
    }

    /**
     * 获取所有剪贴板条目
     * 按置顶状态和时间排序
     * @returns {Array} 剪贴板条目数组
     */
    getAllItems() {
        return this.db.prepare('SELECT * FROM clipboard_items ORDER BY is_topped DESC, CASE WHEN is_topped = 1 THEN top_time ELSE copy_time END DESC').all();
    }

    /**
     * 根据标签名获取剪贴板条目
     * @param {string} tagName 标签名称
     * @returns {Array} 符合条件的剪贴板条目数组
     */
    getItemsByTag(tagName: string) {
        return this.db.prepare('SELECT ci.* FROM clipboard_items ci ' +
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
            const row = this.db.prepare('SELECT type, file_path FROM clipboard_items WHERE id = ?').get(id) as { type: string, file_path: string } | undefined;
            console.log('[数据库进程] 要删除的内容信息:', row);
            // 如果是图片类型，删除对应的临时文件
            if (row && row.type === 'image' && row.file_path) {
                try {
                    fs.unlinkSync(row.file_path);
                } catch (unlinkError) {
                    console.error('删除临时图片文件失败:', unlinkError);
                }
            }

            // 删除数据库记录
            this.db.prepare('DELETE FROM clipboard_items WHERE id = ?').run(id);
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
    clearAll() {
        return new Promise<void>(async (resolve, reject) => {
            try {
                // 读取配置文件获取临时文件存储路径
                const configPath = getConfig();
                const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
                const tempDir = config.tempPath;

                // 先获取所有图片类型的记录
                log.info('[数据库进程] 正在获取所有图片记录...');
                const rows = this.db.prepare('SELECT type, file_path FROM clipboard_items WHERE type = ?').all('image') as { type: string, file_path: string }[];

                // 删除所有图片文件
                log.info('[数据库进程] 开始删除图片文件...');
                for (const row of rows) {
                    if (row.file_path) {
                        try {
                            fs.unlinkSync(row.file_path);
                            log.info(`[数据库进程] 成功删除图片文件: ${row.file_path}`);
                        } catch (unlinkError) {
                            console.error(`[数据库进程] 删除图片文件失败: ${row.file_path}`, unlinkError);
                        }
                    }
                }

                // 清空数据库记录
                log.info('[数据库进程] 正在清空数据库记录...');
                this.db.prepare('DELETE FROM clipboard_items').run();

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
        this.db.prepare('UPDATE clipboard_items SET is_topped = ?, top_time = ? WHERE id = ?').run(isTopped ? 1 : 0, isTopped ? Date.now() : null, id);
    }

    /**
     * 搜索剪贴板内容
     * 支持按内容和标签ID进行搜索
     * @param {string} content 搜索内容关键词
     * @param {number} tagId 标签ID
     * @returns {Array} 符合条件的剪贴板条目数组
     */
    searchItems(content: string, tagId: number): any[] {
        
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
            itemsSql += ' INNER JOIN item_tags it ON ci.id = it.item_id'
                + ' INNER JOIN tags t ON it.tag_id = t.id'
                + ' WHERE t.id = ?';
            itemsParams.push(tagId);
        }
        // 根据内容关键词构建查询条件
        if (content && content !== null && content !== '') {
            itemsSql += (tagId && tagId !== null) ? ' AND ci.content LIKE ?' : ' WHERE ci.content LIKE ?';
            itemsParams.push(`%${content}%`);
        }

        // 添加排序条件：先按置顶状态，再按时间排序
        itemsSql += ' ORDER BY ci.is_topped DESC, CASE WHEN ci.is_topped = 1 THEN ci.top_time ELSE ci.copy_time END DESC';
        
        // 获取符合条件的剪贴板条目
        const items = this.db.prepare(itemsSql).all(itemsParams) as any[];
        
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
        
        return items;
    }

    /**
     * 更新剪贴板条目的复制时间
     * @param {number} id 条目ID
     * @param {Date} newTime 新的复制时间
     */
    updateItemTime(id: number, newTime: Date) {
        this.db.prepare('UPDATE clipboard_items SET copy_time = ? WHERE id = ?').run(newTime, id);
    }

    // 标签相关的方法
    /**
     * 添加新标签
     * @param {string} name 标签名称
     * @param {string} color 标签颜色
     */
    addTag(name: string, color: string) {
        this.db.prepare('INSERT INTO tags (name, color, created_at) VALUES (?, ?, ?)').run(name, color, Date.now());
    }

    /**
     * 删除标签
     * @param {number} id 标签ID
     */
    deleteTag(id: number) {
        this.db.prepare('DELETE FROM tags WHERE id = ?').run(id);
    }

    /**
     * 获取所有标签
     * @returns {Array} 标签数组，按创建时间升序排列
     */
    getAllTags() {
        return this.db.prepare('SELECT * FROM tags ORDER BY created_at ASC').all();
    }

    /**
     * 剪贴板条目绑定标签
     * @param {number} itemId 剪贴板条目ID
     * @param {number} tagId 标签ID
     */
    addItemTag(itemId: number, tagId: number) {
        this.db.prepare('INSERT INTO item_tags (item_id, tag_id) VALUES (?, ?)').run(itemId, tagId);
    }

    /**
     * 移除剪贴板条目的标签
     * @param {number} itemId 剪贴板条目ID
     * @param {number} tagId 标签ID
     */
    removeItemTag(itemId: number, tagId: number) {
        this.db.prepare('DELETE FROM item_tags WHERE item_id = ? AND tag_id = ?').run(itemId, tagId);
    }

    /**
     * 获取剪贴板条目的所有标签
     * @param {number} itemId 剪贴板条目ID
     * @returns {Array} 标签数组
     */
    getItemTags(itemId: number) {
        return this.db.prepare('SELECT t.* FROM tags t INNER JOIN item_tags it ON t.id = it.tag_id WHERE it.item_id = ?').all(itemId);
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
        const tag = this.db.prepare('SELECT id FROM tags WHERE id = ?').get(tagId) as { id: number } | undefined;
        if (!tag) {
            throw new Error('标签不存在');
        }
        // 检查标签是否已经绑定
        const bindInfo = this.db.prepare('SELECT * FROM item_tags WHERE item_id = ? AND tag_id = ?').get(itemId, tag.id);
        if (bindInfo) {
            log.info('[数据库进程] 标签已绑定');
            return;
        }
        // 标签未绑定，执行绑定操作
        this.db.prepare('INSERT OR IGNORE INTO item_tags (item_id, tag_id) VALUES (?, ?)').run(itemId, tag.id);
    }
}

/**
 * 导出ClipboardDB类
 * 使用单例模式，通过getInstance()方法获取实例
 */
export default ClipboardDB;
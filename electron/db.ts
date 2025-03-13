import Database from 'better-sqlite3';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import log from './log.js'

let __dirname = path.dirname(fileURLToPath(import.meta.url));
const env = process.env.NODE_ENV;
if (env !== 'development') {
    __dirname = __dirname.replace("\\app.asar\\dist-electron", "");
}

class ClipboardDB {
    private static instance: ClipboardDB;
    private db: Database.Database;

    private constructor() {
        const dbFolder = path.join(__dirname, '../data');
        log.info("[数据库进程] 数据文件存储文件夹位置：", dbFolder);
        if (!fs.existsSync(dbFolder)) {
            fs.mkdirSync(dbFolder);
        }
        const dbPath = path.join(dbFolder, 'clipboard.db');
        log.info("[数据库进程] 数据文件存储位置：", dbPath);
        this.db = new Database(dbPath);
        this.initTables();
    }

    public static getInstance(): ClipboardDB {
        if (!ClipboardDB.instance) {
            ClipboardDB.instance = new ClipboardDB();
        }
        return ClipboardDB.instance;
    }

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

    close() {
        this.db.close();
    }

    addItem(content: string, type = 'text', filePath = null) {
        this.db.transaction(() => {
            try {
                let copyTime = Date.now();

                // 删除相同内容的旧记录
                if (type === 'text') {
                    this.db.prepare('DELETE FROM clipboard_items WHERE content = ? AND type = ?').run(content, type);
                } else if (type === 'image' && filePath) {
                    const row = this.db.prepare('SELECT copy_time FROM clipboard_items WHERE type = ? AND file_path = ?').get('image', filePath) as { copy_time: number } | undefined;

                    if (row) {
                        copyTime = row.copy_time;
                    }
                    this.db.prepare('DELETE FROM clipboard_items WHERE type = ? AND file_path = ?').run('image', filePath);
                }

                this.db.prepare('INSERT INTO clipboard_items (content, copy_time, type, file_path) VALUES (?, ?, ?, ?)').run(content, copyTime, type, filePath);
            } catch (err) {
                throw err;
            }
        });
    }

    getAllItems() {
        return this.db.prepare('SELECT * FROM clipboard_items ORDER BY is_topped DESC, CASE WHEN is_topped = 1 THEN top_time ELSE copy_time END DESC').all();
    }

    getItemsByTag(tagName: string) {
        return this.db.prepare('SELECT ci.* FROM clipboard_items ci ' +
            'INNER JOIN item_tags it ON ci.id = it.item_id ' +
            'INNER JOIN tags t ON it.tag_id = t.id ' +
            'WHERE t.name = ? ' +
            'ORDER BY ci.is_topped DESC, CASE WHEN ci.is_topped = 1 THEN ci.top_time ELSE ci.copy_time END DESC')
            .all(tagName);
    }

    deleteItem(id: number) {
        try {
            // 先获取要删除的项目信息
            const row = this.db.prepare('SELECT type, file_path FROM clipboard_items WHERE id = ?').get(id) as { type: string, file_path: string } | undefined;

            // 如果是图片类型，删除对应的临时文件
            if (row && row.type === 'image' && row.file_path) {
                try {
                    fs.unlinkSync(row.file_path);
                } catch (unlinkError) {
                    console.error('删除临时图片文件失败:', unlinkError);
                }
            }

            // 删除数据库记录
            this.db.prepare('SELECT type, file_path FROM clipboard_items WHERE id = ?').run(id);
        } catch (err) {
            throw err;
        }
    }

    clearAll() {
        return new Promise<void>(async (resolve, reject) => {
            try {
                // 读取配置文件获取临时文件存储路径
                let configDir;
                if (env === 'development') {
                    configDir = path.join(__dirname, '../config');
                } else {
                    configDir = path.join(__dirname, './config');
                }
                log.info('[数据库进程] 配置文件目录:', configDir);
                const configPath = path.join(configDir, 'settings.conf');
                log.info('[数据库进程] 配置文件路径:', configPath);
                const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
                log.info('[数据库进程] 读取到的配置:', config);
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

    toggleTop(id: number, isTopped: boolean) {
        this.db.prepare('UPDATE clipboard_items SET is_topped = ?, top_time = ? WHERE id = ?').run(isTopped ? 1 : 0, isTopped ? Date.now() : null, id);
    }

    searchItems(query: string, tagName = null) {
        let sql = 'SELECT DISTINCT ci.* FROM clipboard_items ci';
        const params = [];

        if (tagName) {
            sql += ' INNER JOIN item_tags it ON ci.id = it.item_id'
                + ' INNER JOIN tags t ON it.tag_id = t.id'
                + ' WHERE t.name = ? AND ci.content LIKE ?';
            params.push(tagName, `%${query}%`);
        } else {
            sql += ' WHERE content LIKE ?';
            params.push(`%${query}%`);
        }

        sql += ' ORDER BY ci.is_topped DESC, CASE WHEN ci.is_topped = 1 THEN ci.top_time ELSE ci.copy_time END DESC';

        return this.db.prepare(sql).all(params);
    }

    updateItemTime(id: number, newTime: Date) {
        this.db.prepare('UPDATE clipboard_items SET copy_time = ? WHERE id = ?').run(newTime, id);
    }

    // 标签相关的方法
    addTag(name: string) {
        this.db.prepare('INSERT INTO tags (name, created_at) VALUES (?, ?)').run(name, Date.now());
    }

    deleteTag(id: number) {
        this.db.prepare('DELETE FROM tags WHERE id = ?').run(id);
    }

    getAllTags() {
        return this.db.prepare('SELECT * FROM tags ORDER BY created_at ASC').all();
    }

    addItemTag(itemId: number, tagId: number) {
        this.db.prepare('INSERT INTO item_tags (item_id, tag_id) VALUES (?, ?)').run(itemId, tagId);
    }

    removeItemTag(itemId: number, tagId: number) {
        this.db.prepare('DELETE FROM item_tags WHERE item_id = ? AND tag_id = ?').run(itemId, tagId);
    }

    getItemTags(itemId: number) {
        return this.db.prepare('SELECT t.* FROM tags t INNER JOIN item_tags it ON t.id = it.tag_id WHERE it.item_id = ?').all(itemId);
    }

    bindItemToTag(itemId: number, tagName: any) {
        const tag = this.db.prepare('SELECT id FROM tags WHERE name = ?').get(tagName) as { id: number } | undefined;
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
    };
}

export default ClipboardDB;
import Database from 'better-sqlite3';
import path from 'node:path';
import { app } from 'electron';

class ClipboardDB {
    private static instance: ClipboardDB;
    private db: Database.Database;

    private constructor() {
        const dbPath = path.join(app.getPath('userData'), 'clipboard.db');
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
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS clipboard_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                content TEXT NOT NULL,
                type TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
        `);
    }

    public saveClipboardContent(content: string, type: string): void {
        const stmt = this.db.prepare('INSERT INTO clipboard_history (content, type) VALUES (?, ?)');
        stmt.run(content, type);
    }

    public getClipboardHistory(limit: number = 50): any[] {
        const stmt = this.db.prepare('SELECT * FROM clipboard_history ORDER BY created_at DESC LIMIT ?');
        return stmt.all(limit);
    }

    public clearHistory(): void {
        const stmt = this.db.prepare('DELETE FROM clipboard_history');
        stmt.run();
    }
}

export default ClipboardDB;
"use strict";
var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
const electron = require("electron");
const node_url = require("node:url");
const path = require("node:path");
const Database = require("better-sqlite3");
var _documentCurrentScript = typeof document !== "undefined" ? document.currentScript : null;
const _ClipboardDB = class _ClipboardDB {
  constructor() {
    __publicField(this, "db");
    const dbPath = path.join(electron.app.getPath("userData"), "clipboard.db");
    this.db = new Database(dbPath);
    this.initTables();
  }
  static getInstance() {
    if (!_ClipboardDB.instance) {
      _ClipboardDB.instance = new _ClipboardDB();
    }
    return _ClipboardDB.instance;
  }
  initTables() {
    this.db.exec(`
            CREATE TABLE IF NOT EXISTS clipboard_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                content TEXT NOT NULL,
                type TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
        `);
  }
  saveClipboardContent(content, type) {
    const stmt = this.db.prepare("INSERT INTO clipboard_history (content, type) VALUES (?, ?)");
    stmt.run(content, type);
  }
  getClipboardHistory(limit = 50) {
    const stmt = this.db.prepare("SELECT * FROM clipboard_history ORDER BY created_at DESC LIMIT ?");
    return stmt.all(limit);
  }
  clearHistory() {
    const stmt = this.db.prepare("DELETE FROM clipboard_history");
    stmt.run();
  }
};
__publicField(_ClipboardDB, "instance");
let ClipboardDB = _ClipboardDB;
const __dirname$1 = path.dirname(node_url.fileURLToPath(typeof document === "undefined" ? require("url").pathToFileURL(__filename).href : _documentCurrentScript && _documentCurrentScript.tagName.toUpperCase() === "SCRIPT" && _documentCurrentScript.src || new URL("main.js", document.baseURI).href));
process.env.APP_ROOT = path.join(__dirname$1, "..");
const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
const MAIN_DIST = path.join(process.env.APP_ROOT, "dist-electron");
const RENDERER_DIST = path.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, "public") : RENDERER_DIST;
let win;
let lastClipboardContent = "";
function watchClipboard() {
  setInterval(() => {
    const currentContent = electron.clipboard.readText();
    if (currentContent !== lastClipboardContent && currentContent.trim() !== "") {
      lastClipboardContent = currentContent;
      const db = ClipboardDB.getInstance();
      db.saveClipboardContent(currentContent, "text");
      win == null ? void 0 : win.webContents.send("clipboard-updated", currentContent);
    }
  }, 1e3);
}
function createWindow() {
  win = new electron.BrowserWindow({
    icon: path.join(process.env.VITE_PUBLIC, "electron-vite.svg"),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: true,
      preload: path.join(path.dirname(node_url.fileURLToPath(typeof document === "undefined" ? require("url").pathToFileURL(__filename).href : _documentCurrentScript && _documentCurrentScript.tagName.toUpperCase() === "SCRIPT" && _documentCurrentScript.src || new URL("main.js", document.baseURI).href)), "preload.mjs")
    }
  });
  win.webContents.on("did-finish-load", () => {
    win == null ? void 0 : win.webContents.send("main-process-message", (/* @__PURE__ */ new Date()).toLocaleString());
  });
  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(RENDERER_DIST, "index.html"));
  }
  win.webContents.openDevTools({ mode: "detach" });
}
electron.ipcMain.handle("get-clipboard-history", async (event, limit = 50) => {
  const db = ClipboardDB.getInstance();
  return db.getClipboardHistory(limit);
});
electron.ipcMain.handle("clear-clipboard-history", async () => {
  const db = ClipboardDB.getInstance();
  db.clearHistory();
  return true;
});
electron.app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    electron.app.quit();
    win = null;
  }
});
electron.app.whenReady().then(() => {
  createWindow();
  watchClipboard();
  electron.app.on("activate", () => {
    if (electron.BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});
electron.app.on("window-all-closed", () => {
  if (process.platform === "darwin") {
    console.log("close");
    electron.app.quit();
  }
});
exports.MAIN_DIST = MAIN_DIST;
exports.RENDERER_DIST = RENDERER_DIST;
exports.VITE_DEV_SERVER_URL = VITE_DEV_SERVER_URL;

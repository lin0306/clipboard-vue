"use strict";var U=Object.defineProperty;var F=(n,e,t)=>e in n?U(n,e,{enumerable:!0,configurable:!0,writable:!0,value:t}):n[e]=t;var N=(n,e,t)=>F(n,typeof e!="symbol"?e+"":e,t);Object.defineProperty(exports,Symbol.toStringTag,{value:"Module"});const a=require("electron"),O=require("node:url"),r=require("node:path"),c=require("node:fs"),P=require("better-sqlite3");var m=typeof document<"u"?document.currentScript:null;const I=r.dirname(O.fileURLToPath(typeof document>"u"?require("url").pathToFileURL(__filename).href:m&&m.tagName.toUpperCase()==="SCRIPT"&&m.src||new URL("main.js",document.baseURI).href)),M=process.env.NODE_ENV,f=class f{constructor(){N(this,"db");const e=r.join(I,"../data");c.existsSync(e)||c.mkdirSync(e);const t=r.join(e,"clipboard.db");console.log("数据文件存储位置：",t),this.db=new P(t),this.initTables()}static getInstance(){return f.instance||(f.instance=new f),f.instance}initTables(){this.db.exec(`
                    CREATE TABLE IF NOT EXISTS clipboard_items (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        content TEXT NOT NULL,
                        copy_time INTEGER NOT NULL,
                        is_topped BOOLEAN DEFAULT 0,
                        top_time INTEGER,
                        type TEXT DEFAULT 'text',
                        file_path TEXT
                    )
                `),this.db.exec(`
                    CREATE TABLE IF NOT EXISTS tags (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        name TEXT NOT NULL UNIQUE,
                        created_at INTEGER NOT NULL
                    )
                `),this.db.exec(`
                    CREATE TABLE IF NOT EXISTS item_tags (
                        item_id INTEGER,
                        tag_id INTEGER,
                        FOREIGN KEY (item_id) REFERENCES clipboard_items (id) ON DELETE CASCADE,
                        FOREIGN KEY (tag_id) REFERENCES tags (id) ON DELETE CASCADE,
                        PRIMARY KEY (item_id, tag_id)
                    )
                `)}close(){this.db.close()}addItem(e,t="text",o=null){this.db.transaction(()=>{try{let s=Date.now();if(t==="text")this.db.prepare("DELETE FROM clipboard_items WHERE content = ? AND type = ?").run(e,t);else if(t==="image"&&o){const d=this.db.prepare("SELECT copy_time FROM clipboard_items WHERE type = ? AND file_path = ?").get("image",o);d&&(s=d.copy_time),this.db.prepare("DELETE FROM clipboard_items WHERE type = ? AND file_path = ?").run("image",o)}this.db.prepare("INSERT INTO clipboard_items (content, copy_time, type, file_path) VALUES (?, ?, ?, ?)").run(e,s,t,o)}catch(s){throw s}})}getAllItems(){return this.db.prepare("SELECT * FROM clipboard_items ORDER BY is_topped DESC, CASE WHEN is_topped = 1 THEN top_time ELSE copy_time END DESC").all()}getItemsByTag(e){return this.db.prepare("SELECT ci.* FROM clipboard_items ci INNER JOIN item_tags it ON ci.id = it.item_id INNER JOIN tags t ON it.tag_id = t.id WHERE t.name = ? ORDER BY ci.is_topped DESC, CASE WHEN ci.is_topped = 1 THEN ci.top_time ELSE ci.copy_time END DESC").all(e)}deleteItem(e){try{const t=this.db.prepare("SELECT type, file_path FROM clipboard_items WHERE id = ?").get(e);if(t&&t.type==="image"&&t.file_path)try{c.unlinkSync(t.file_path)}catch(o){console.error("删除临时图片文件失败:",o)}this.db.prepare("SELECT type, file_path FROM clipboard_items WHERE id = ?").run(e)}catch(t){throw t}}clearAll(){return new Promise(async(e,t)=>{try{let o;M==="development"?o=r.join(I,"../config"):o=r.join(I,"./resources/config"),console.log("配置文件目录:",o);const s=r.join(o,"settings.conf");console.log("配置文件路径:",s);const d=JSON.parse(c.readFileSync(s,"utf8"));console.log("读取到的配置:",d);const E=d.tempPath;console.log("[clearAll] 正在获取所有图片记录...");const p=this.db.prepare("SELECT type, file_path FROM clipboard_items WHERE type = ?").all("image");console.log("[clearAll] 开始删除图片文件...");for(const l of p)if(l.file_path)try{c.unlinkSync(l.file_path),console.log(`[clearAll] 成功删除图片文件: ${l.file_path}`)}catch(g){console.error(`[clearAll] 删除图片文件失败: ${l.file_path}`,g)}console.log("[clearAll] 正在清空数据库记录..."),this.db.prepare("DELETE FROM clipboard_items").run(),c.existsSync(E)||(console.log("[clearAll] 正在创建临时目录..."),c.mkdirSync(E,{recursive:!0,mode:511}),console.log("[clearAll] 临时目录创建成功")),console.log("[clearAll] 剪贴板内容和临时文件清理完成"),e()}catch(o){console.error("[clearAll] 清空剪贴板时发生错误:",o),t(o)}})}toggleTop(e,t){this.db.prepare("UPDATE clipboard_items SET is_topped = ?, top_time = ? WHERE id = ?").run(t?1:0,t?Date.now():null,e)}searchItems(e,t=null){let o="SELECT DISTINCT ci.* FROM clipboard_items ci";const s=[];return t?(o+=" INNER JOIN item_tags it ON ci.id = it.item_id INNER JOIN tags t ON it.tag_id = t.id WHERE t.name = ? AND ci.content LIKE ?",s.push(t,`%${e}%`)):(o+=" WHERE content LIKE ?",s.push(`%${e}%`)),o+=" ORDER BY ci.is_topped DESC, CASE WHEN ci.is_topped = 1 THEN ci.top_time ELSE ci.copy_time END DESC",this.db.prepare(o).all(s)}updateItemTime(e,t){this.db.prepare("UPDATE clipboard_items SET copy_time = ? WHERE id = ?").run(t,e)}addTag(e){this.db.prepare("INSERT INTO tags (name, created_at) VALUES (?, ?)").run(e,Date.now())}deleteTag(e){this.db.prepare("DELETE FROM tags WHERE id = ?").run(e)}getAllTags(){return this.db.prepare("SELECT * FROM tags ORDER BY created_at ASC").all()}addItemTag(e,t){this.db.prepare("INSERT INTO item_tags (item_id, tag_id) VALUES (?, ?)").run(e,t)}removeItemTag(e,t){this.db.prepare("DELETE FROM item_tags WHERE item_id = ? AND tag_id = ?").run(e,t)}getItemTags(e){return this.db.prepare("SELECT t.* FROM tags t INNER JOIN item_tags it ON t.id = it.tag_id WHERE it.item_id = ?").all(e)}bindItemToTag(e,t){const o=this.db.prepare("SELECT id FROM tags WHERE name = ?").get(t);if(!o)throw new Error("标签不存在");if(this.db.prepare("SELECT * FROM item_tags WHERE item_id = ? AND tag_id = ?").get(e,o.id)){console.log("标签已绑定");return}this.db.prepare("INSERT OR IGNORE INTO item_tags (item_id, tag_id) VALUES (?, ?)").run(e,o.id)}};N(f,"instance");let R=f;const h=r.dirname(O.fileURLToPath(typeof document>"u"?require("url").pathToFileURL(__filename).href:m&&m.tagName.toUpperCase()==="SCRIPT"&&m.src||new URL("main.js",document.baseURI).href));process.env.APP_ROOT=r.join(h,"..");const b=process.env.VITE_DEV_SERVER_URL,W=r.join(process.env.APP_ROOT,"dist-electron"),D=r.join(process.env.APP_ROOT,"dist");process.env.VITE_PUBLIC=b?r.join(process.env.APP_ROOT,"public"):D;const j=process.env.NODE_ENV;let i;const A=v();function L(){i=new a.BrowserWindow({icon:r.join(process.env.VITE_PUBLIC,"electron-vite.svg"),webPreferences:{nodeIntegration:!0,contextIsolation:!0,preload:r.join(r.dirname(O.fileURLToPath(typeof document>"u"?require("url").pathToFileURL(__filename).href:m&&m.tagName.toUpperCase()==="SCRIPT"&&m.src||new URL("main.js",document.baseURI).href)),"preload.mjs")}}),console.log("运行环境：",process.env.NODE_ENV);const n=A.theme||"light";console.log("读取到的主题配置:",n),i.webContents.on("did-finish-load",()=>{i==null||i.webContents.send("main-process-message",new Date().toLocaleString()),console.log("[主进程] 发送主题设置到渲染进程"),i==null||i.webContents.send("change-theme",n),console.log("[主进程] 窗口加载完成，开始监听剪贴板"),C()}),b?i.loadURL(b):i.loadFile(r.join(D,"index.html")),i.webContents.openDevTools({mode:"detach"}),i.on("closed",()=>{u&&(clearTimeout(u),u=null)})}a.ipcMain.handle("get-clipboard-history",async()=>R.getInstance().getAllItems());a.ipcMain.handle("clear-clipboard-history",async()=>(R.getInstance().clearAll(),!0));a.app.on("window-all-closed",()=>{process.platform!=="darwin"&&(a.app.quit(),i=null)});a.app.whenReady().then(()=>{L(),C(),a.app.on("activate",()=>{a.BrowserWindow.getAllWindows().length===0&&L()})});a.app.on("window-all-closed",()=>{process.platform==="darwin"&&(console.log("close"),a.app.quit())});let S=a.clipboard.readText(),y=a.clipboard.readImage().isEmpty()?null:a.clipboard.readImage().toPNG(),u=null;function C(){if(!i||i.isDestroyed()||!i.webContents||i.webContents.isDestroyed()){console.log("[主进程] 窗口或渲染进程不可用，跳过剪贴板检查");return}try{const n=a.clipboard.readText(),e=a.clipboard.readBuffer("FileNameW"),t=a.clipboard.readImage();if(!t.isEmpty()){const o=t.toPNG();if(y!==null&&Buffer.compare(o,y)!==0){console.log("[主进程] 检测到剪贴板中有图片"),console.log("[主进程] 检测到新的图片内容"),y=o;const d=Date.now(),E=r.join(A.tempPath||r.join(h,"temp"));let p=null;if(c.existsSync(E)){const g=c.readdirSync(E);for(const T of g)if(T.endsWith(".png")){const _=r.join(E,T),w=c.readFileSync(_);if(Buffer.compare(w,o)===0){p=_;break}}}else c.mkdirSync(E,{recursive:!0});let l;if(p?(l=p,console.log("[主进程] 找到相同内容的图片文件:",l)):(l=r.join(E,`clipboard_${d}.png`),c.writeFileSync(l,o),console.log("[主进程] 图片已保存到临时目录:",l)),i&&!i.isDestroyed()){const g=i.webContents;if(g&&!g.isDestroyed()){if(g.getProcessId()&&!g.isLoading())try{console.log("[主进程] 准备发送图片信息到渲染进程"),i.webContents.send("clipboard-file",{name:r.basename(l),path:l,type:"image",isNewImage:!p}),console.log("[主进程] 图片信息已发送到渲染进程")}catch(T){if(console.error("[主进程] 发送图片信息到渲染进程时出错:",T),!p)try{c.unlinkSync(l)}catch(_){console.error("[主进程] 清理临时文件时出错:",_)}}}else if(!p)try{c.unlinkSync(l)}catch(T){console.error("[主进程] 清理临时文件时出错:",T)}}}}if(console.log("监听文本变化",n,S),n&&n!==S&&(S=n,R.getInstance().addItem(n,"text",null),i&&!i.isDestroyed()))try{const s=i.webContents;s&&!s.isDestroyed()&&s.send("clipboard-updated",n)}catch(s){console.error("[主进程] 发送文本消息时出错:",s)}if(e&&e.length>0)try{const s=e.toString("utf16le").replace(/\x00/g,"").split(`\r
`).filter(Boolean);if(i&&!i.isDestroyed()){const d=i.webContents;d&&!d.isDestroyed()&&s.forEach(E=>{const p=r.basename(E);d.send("clipboard-file",{name:p,path:E,type:"file"})})}}catch(o){console.error("处理剪贴板文件时出错:",o)}}catch(n){console.error("[主进程] 检查剪贴板时出错:",n)}u=setTimeout(C,1e3)}function v(){let n;j==="development"?n=r.join(h,"../config"):n=r.join(h,"./resources/config"),console.log("配置文件目录:",n);const e=r.join(n,"settings.conf");console.log("配置文件路径:",e);const t=JSON.parse(c.readFileSync(e,"utf8"));return console.log("读取到的配置:",t),t}exports.MAIN_DIST=W;exports.RENDERER_DIST=D;exports.VITE_DEV_SERVER_URL=b;

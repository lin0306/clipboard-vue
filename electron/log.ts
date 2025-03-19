/**
 * 日志配置
 * 
 * 使用方法
 * GitHub访问[https://github.com/megahertz/electron-log]
 * 镜像加速[https://gitcode.com/gh_mirrors/el/electron-log?utm_source=csdn_github_accelerator]
 * 
 * 默认情况下，它将日志写入以下位置：
 * 在 Linux 上： ~/.config/{应用名称}/logs/main.log
 * 在 macOS 上： ~/Library/Logs/{应用名称}/main.log
 * 在 Windows 上： %USERPROFILE%\AppData\Roaming\{应用名称}\logs\main.log
 */


import log from 'electron-log/main'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// Optional, initialize the logger for any renderer process
log.initialize();

let __dirname = path.dirname(fileURLToPath(import.meta.url))
log.info("[日志配置] 程序文件夹位置", __dirname);

const env = process.env.NODE_ENV;
log.info("[日志配置] 运行环境：", process.env.NODE_ENV)
if (env !== 'development') {
    __dirname = __dirname.replace("\\app.asar\\dist-electron", "");
}

// 自定义日志文件位置配置
let logPath = path.join(__dirname, '../logs');
log.info("[日志配置] 日志文件位置：", logPath);

log.transports.file.resolvePathFn = () => path.join(logPath, 'main.log');

export default log;
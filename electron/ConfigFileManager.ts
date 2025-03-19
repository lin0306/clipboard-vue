/**
 * 管理Config文件夹下的文件读取，更新等操作
 */
import path from 'node:path'
import fs from 'node:fs'
import log from './log.js'
import { fileURLToPath } from 'node:url'

let __dirname = path.dirname(fileURLToPath(import.meta.url))
log.info("[配置文件] 程序文件夹位置", __dirname);

const env = process.env.NODE_ENV;
log.info("[配置文件] 运行环境：", process.env.NODE_ENV)
if (env !== 'development') {
    __dirname = __dirname.replace("\\app.asar\\dist-electron", "");
}

// 读取配置文件信息
export function getConfig() {
    const configPath = getConfigPath();
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    log.info('[配置文件] 读取到的配置:', config);
    return config;
}

// 更新配置文件信息
export function updateConfig(config: any) {
    const configPath = getConfigPath();
    fs.writeFileSync(configPath, JSON.stringify(config, null, 4));
}

// 获取配置文件路径
function getConfigPath() {
    let configDir;
    if (env === 'development') {
        configDir = path.join(__dirname, '../config');
    } else {
        configDir = path.join(__dirname, './config');
    }
    log.info('[配置文件] 配置文件目录:', configDir);
    const configPath = path.join(configDir, 'settings.conf');
    console.log('[配置文件] 配置文件路径:', configPath);
    return configPath;
}
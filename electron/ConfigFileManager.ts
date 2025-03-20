/**
 * 管理Config文件夹下的文件读取，更新等操作
 */
import path from 'node:path'
import fs from 'node:fs'
import log from './log.js'
import { fileURLToPath } from 'node:url'

let __dirname = path.dirname(fileURLToPath(import.meta.url))

const env = process.env.NODE_ENV;
if (env !== 'development') {
    __dirname = __dirname.replace("\\app.asar\\dist-electron", "");
}

const settingsFileName = 'settings.conf';
const shortcutKeyFileName = 'shortcut-key.conf';

// 读取配置文件信息
export function getConfig() {
    const configPath = getConfigPath(settingsFileName);
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    return config;
}

// 读取快捷键配置文件信息
export function getShortcutKeyConfig() {
    const configPath = getConfigPath(shortcutKeyFileName);
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    return config;
}

// 更新配置文件信息
export function updateConfig(config: any) {
    const configPath = getConfigPath(settingsFileName);
    fs.writeFileSync(configPath, JSON.stringify(config, null, 4));
}

// 获取配置文件路径
function getConfigPath(fileName: string) {
    let configDir;
    if (env === 'development') {
        configDir = path.join(__dirname, '../config');
    } else {
        configDir = path.join(__dirname, './config');
    }
    log.info('[配置文件] 配置文件夹目录:', configDir);
    const configPath = path.join(configDir, fileName);
    log.info('[配置文件] ' + fileName + ' 文件路径:', configPath);
    return configPath;
}
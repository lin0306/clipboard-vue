/**
 * 管理Config文件夹下的文件读取，更新等操作
 */
import fs from 'fs-extra'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { ref } from 'vue'
import log from './log.js'

let __dirname = path.dirname(fileURLToPath(import.meta.url))

const env = process.env.NODE_ENV;
if (env !== 'development') {
    __dirname = __dirname.replace("\\app.asar\\dist-electron", "");
}

export const settingsFileName = 'settings.conf';
const shortcutKeyFileName = 'shortcut-key.conf';

const settings = ref<any>(null);
const shortcutKeyConfig = ref<any>(null);

// 读取配置文件信息
export function getSettings() {
    if (settings.value) {
        return JSON.parse(JSON.stringify(settings.value));
    }
    const configPath = getConfigPath(settingsFileName);
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    settings.value = config;
    return config;
}

// 更新配置文件信息
export function updateSettings(config: any) {
    const configPath = getConfigPath(settingsFileName);
    fs.writeFileSync(configPath, JSON.stringify(config, null, 4));
    settings.value = config;
}

// 读取快捷键配置文件信息
export function getShortcutKeys() {
    if (shortcutKeyConfig.value) {
        return JSON.parse(JSON.stringify(shortcutKeyConfig.value));
    }
    const configPath = getConfigPath(shortcutKeyFileName);
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    shortcutKeyConfig.value = config;
    return config;
}

// 更新快捷键文件信息
export function updateShortcutKeys(config: any) {
    const configPath = getConfigPath(shortcutKeyFileName);
    fs.writeFileSync(configPath, JSON.stringify(config, null, 4));
    shortcutKeyConfig.value = config;
}

// 获取数据库路径
export function getDBPath() {
    return path.join(__dirname, '../data');
}

// 获取文件存储路径
export function getTempPath() {
    return path.join(__dirname, '../temp');
}

// 获取配置文件夹路径
export function getConfigDir() {
    let configDir;
    if (env === 'development') {
        configDir = path.join(__dirname, '../config');
    } else {
        configDir = path.join(__dirname, './config');
    }
    return configDir;
}

// 获取配置文件路径
function getConfigPath(fileName: string) {
    let configDir = getConfigDir();
    log.info('[配置文件] 配置文件夹目录:', configDir);
    const configPath = path.join(configDir, fileName);
    log.info('[配置文件] ' + fileName + ' 文件路径:', configPath);
    return configPath;
}

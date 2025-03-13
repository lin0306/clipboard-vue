import log from 'electron-log/main'

// Optional, initialize the logger for any renderer process
log.initialize();

export default log;

// 使用方法
// GitHub访问[https://github.com/megahertz/electron-log]
// 镜像加速[https://gitcode.com/gh_mirrors/el/electron-log?utm_source=csdn_github_accelerator]

// 默认情况下，它将日志写入以下位置：
// 在 Linux 上： ~/.config/{应用名称}/logs/main.log
// 在 macOS 上： ~/Library/Logs/{应用名称}/main.log
// 在 Windows 上： %USERPROFILE%\AppData\Roaming\{应用名称}\logs\main.log
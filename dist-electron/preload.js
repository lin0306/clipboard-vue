"use strict";
const electron = require("electron");
electron.contextBridge.exposeInMainWorld("ipcRenderer", {
  // 发送消息到主进程
  send: (channel, ...args) => {
    electron.ipcRenderer.send(channel, ...args);
  },
  // 从主进程接收消息
  on: (channel, callback) => {
    electron.ipcRenderer.on(channel, (_event, ...args) => callback(...args));
  },
  // 移除监听器
  removeAllListeners: (channel) => {
    electron.ipcRenderer.removeAllListeners(channel);
  },
  // 调用主进程方法并等待结果
  invoke: (channel, ...args) => {
    return electron.ipcRenderer.invoke(channel, ...args);
  }
});

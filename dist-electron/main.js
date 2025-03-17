"use strict";
var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
var _a;
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
const require$$0$5 = require("electron");
const node_url = require("node:url");
const path$6 = require("node:path");
const fs$5 = require("node:fs");
const Database = require("better-sqlite3");
const require$$2 = require("path");
const require$$0$1 = require("child_process");
const require$$1 = require("os");
const require$$0 = require("fs");
const require$$0$2 = require("util");
const require$$0$3 = require("events");
const require$$0$4 = require("http");
const require$$1$1 = require("https");
var _documentCurrentScript = typeof document !== "undefined" ? document.currentScript : null;
function getDefaultExportFromCjs(x) {
  return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, "default") ? x["default"] : x;
}
const fs$4 = require$$0;
const path$5 = require$$2;
var packageJson$1 = {
  findAndReadPackageJson,
  tryReadJsonAt
};
function findAndReadPackageJson() {
  return tryReadJsonAt(getMainModulePath()) || tryReadJsonAt(extractPathFromArgs()) || tryReadJsonAt(process.resourcesPath, "app.asar") || tryReadJsonAt(process.resourcesPath, "app") || tryReadJsonAt(process.cwd()) || { name: void 0, version: void 0 };
}
function tryReadJsonAt(...searchPaths) {
  if (!searchPaths[0]) {
    return void 0;
  }
  try {
    const searchPath = path$5.join(...searchPaths);
    const fileName = findUp("package.json", searchPath);
    if (!fileName) {
      return void 0;
    }
    const json = JSON.parse(fs$4.readFileSync(fileName, "utf8"));
    const name = (json == null ? void 0 : json.productName) || (json == null ? void 0 : json.name);
    if (!name || name.toLowerCase() === "electron") {
      return void 0;
    }
    if (name) {
      return { name, version: json == null ? void 0 : json.version };
    }
    return void 0;
  } catch (e) {
    return void 0;
  }
}
function findUp(fileName, cwd) {
  let currentPath = cwd;
  while (true) {
    const parsedPath = path$5.parse(currentPath);
    const root = parsedPath.root;
    const dir = parsedPath.dir;
    if (fs$4.existsSync(path$5.join(currentPath, fileName))) {
      return path$5.resolve(path$5.join(currentPath, fileName));
    }
    if (currentPath === root) {
      return null;
    }
    currentPath = dir;
  }
}
function extractPathFromArgs() {
  const matchedArgs = process.argv.filter((arg) => {
    return arg.indexOf("--user-data-dir=") === 0;
  });
  if (matchedArgs.length === 0 || typeof matchedArgs[0] !== "string") {
    return null;
  }
  const userDataDir = matchedArgs[0];
  return userDataDir.replace("--user-data-dir=", "");
}
function getMainModulePath() {
  var _a2;
  try {
    return (_a2 = require.main) == null ? void 0 : _a2.filename;
  } catch {
    return void 0;
  }
}
const childProcess = require$$0$1;
const os$3 = require$$1;
const path$4 = require$$2;
const packageJson = packageJson$1;
let NodeExternalApi$1 = class NodeExternalApi {
  constructor() {
    __publicField(this, "appName");
    __publicField(this, "appPackageJson");
    __publicField(this, "platform", process.platform);
  }
  getAppLogPath(appName = this.getAppName()) {
    if (this.platform === "darwin") {
      return path$4.join(this.getSystemPathHome(), "Library/Logs", appName);
    }
    return path$4.join(this.getAppUserDataPath(appName), "logs");
  }
  getAppName() {
    var _a2;
    const appName = this.appName || ((_a2 = this.getAppPackageJson()) == null ? void 0 : _a2.name);
    if (!appName) {
      throw new Error(
        "electron-log can't determine the app name. It tried these methods:\n1. Use `electron.app.name`\n2. Use productName or name from the nearest package.json`\nYou can also set it through log.transports.file.setAppName()"
      );
    }
    return appName;
  }
  /**
   * @private
   * @returns {undefined}
   */
  getAppPackageJson() {
    if (typeof this.appPackageJson !== "object") {
      this.appPackageJson = packageJson.findAndReadPackageJson();
    }
    return this.appPackageJson;
  }
  getAppUserDataPath(appName = this.getAppName()) {
    return appName ? path$4.join(this.getSystemPathAppData(), appName) : void 0;
  }
  getAppVersion() {
    var _a2;
    return (_a2 = this.getAppPackageJson()) == null ? void 0 : _a2.version;
  }
  getElectronLogPath() {
    return this.getAppLogPath();
  }
  getMacOsVersion() {
    const release = Number(os$3.release().split(".")[0]);
    if (release <= 19) {
      return `10.${release - 4}`;
    }
    return release - 9;
  }
  /**
   * @protected
   * @returns {string}
   */
  getOsVersion() {
    let osName = os$3.type().replace("_", " ");
    let osVersion = os$3.release();
    if (osName === "Darwin") {
      osName = "macOS";
      osVersion = this.getMacOsVersion();
    }
    return `${osName} ${osVersion}`;
  }
  /**
   * @return {PathVariables}
   */
  getPathVariables() {
    const appName = this.getAppName();
    const appVersion = this.getAppVersion();
    const self = this;
    return {
      appData: this.getSystemPathAppData(),
      appName,
      appVersion,
      get electronDefaultDir() {
        return self.getElectronLogPath();
      },
      home: this.getSystemPathHome(),
      libraryDefaultDir: this.getAppLogPath(appName),
      libraryTemplate: this.getAppLogPath("{appName}"),
      temp: this.getSystemPathTemp(),
      userData: this.getAppUserDataPath(appName)
    };
  }
  getSystemPathAppData() {
    const home = this.getSystemPathHome();
    switch (this.platform) {
      case "darwin": {
        return path$4.join(home, "Library/Application Support");
      }
      case "win32": {
        return process.env.APPDATA || path$4.join(home, "AppData/Roaming");
      }
      default: {
        return process.env.XDG_CONFIG_HOME || path$4.join(home, ".config");
      }
    }
  }
  getSystemPathHome() {
    var _a2;
    return ((_a2 = os$3.homedir) == null ? void 0 : _a2.call(os$3)) || process.env.HOME;
  }
  getSystemPathTemp() {
    return os$3.tmpdir();
  }
  getVersions() {
    return {
      app: `${this.getAppName()} ${this.getAppVersion()}`,
      electron: void 0,
      os: this.getOsVersion()
    };
  }
  isDev() {
    return process.env.NODE_ENV === "development" || process.env.ELECTRON_IS_DEV === "1";
  }
  isElectron() {
    return Boolean(process.versions.electron);
  }
  onAppEvent(_eventName, _handler) {
  }
  onAppReady(handler) {
    handler();
  }
  onEveryWebContentsEvent(eventName, handler) {
  }
  /**
   * Listen to async messages sent from opposite process
   * @param {string} channel
   * @param {function} listener
   */
  onIpc(channel, listener) {
  }
  onIpcInvoke(channel, listener) {
  }
  /**
   * @param {string} url
   * @param {Function} [logFunction]
   */
  openUrl(url, logFunction = console.error) {
    const startMap = { darwin: "open", win32: "start", linux: "xdg-open" };
    const start = startMap[process.platform] || "xdg-open";
    childProcess.exec(`${start} ${url}`, {}, (err) => {
      if (err) {
        logFunction(err);
      }
    });
  }
  setAppName(appName) {
    this.appName = appName;
  }
  setPlatform(platform) {
    this.platform = platform;
  }
  setPreloadFileForSessions({
    filePath,
    // eslint-disable-line no-unused-vars
    includeFutureSession = true,
    // eslint-disable-line no-unused-vars
    getSessions = () => []
    // eslint-disable-line no-unused-vars
  }) {
  }
  /**
   * Sent a message to opposite process
   * @param {string} channel
   * @param {any} message
   */
  sendIpc(channel, message) {
  }
  showErrorBox(title, message) {
  }
};
var NodeExternalApi_1 = NodeExternalApi$1;
const path$3 = require$$2;
const NodeExternalApi2 = NodeExternalApi_1;
let ElectronExternalApi$1 = class ElectronExternalApi extends NodeExternalApi2 {
  /**
   * @param {object} options
   * @param {typeof Electron} [options.electron]
   */
  constructor({ electron: electron2 } = {}) {
    super();
    /**
     * @type {typeof Electron}
     */
    __publicField(this, "electron");
    this.electron = electron2;
  }
  getAppName() {
    var _a2, _b;
    let appName;
    try {
      appName = this.appName || ((_a2 = this.electron.app) == null ? void 0 : _a2.name) || ((_b = this.electron.app) == null ? void 0 : _b.getName());
    } catch {
    }
    return appName || super.getAppName();
  }
  getAppUserDataPath(appName) {
    return this.getPath("userData") || super.getAppUserDataPath(appName);
  }
  getAppVersion() {
    var _a2;
    let appVersion;
    try {
      appVersion = (_a2 = this.electron.app) == null ? void 0 : _a2.getVersion();
    } catch {
    }
    return appVersion || super.getAppVersion();
  }
  getElectronLogPath() {
    return this.getPath("logs") || super.getElectronLogPath();
  }
  /**
   * @private
   * @param {any} name
   * @returns {string|undefined}
   */
  getPath(name) {
    var _a2;
    try {
      return (_a2 = this.electron.app) == null ? void 0 : _a2.getPath(name);
    } catch {
      return void 0;
    }
  }
  getVersions() {
    return {
      app: `${this.getAppName()} ${this.getAppVersion()}`,
      electron: `Electron ${process.versions.electron}`,
      os: this.getOsVersion()
    };
  }
  getSystemPathAppData() {
    return this.getPath("appData") || super.getSystemPathAppData();
  }
  isDev() {
    var _a2;
    if (((_a2 = this.electron.app) == null ? void 0 : _a2.isPackaged) !== void 0) {
      return !this.electron.app.isPackaged;
    }
    if (typeof process.execPath === "string") {
      const execFileName = path$3.basename(process.execPath).toLowerCase();
      return execFileName.startsWith("electron");
    }
    return super.isDev();
  }
  onAppEvent(eventName, handler) {
    var _a2;
    (_a2 = this.electron.app) == null ? void 0 : _a2.on(eventName, handler);
    return () => {
      var _a3;
      (_a3 = this.electron.app) == null ? void 0 : _a3.off(eventName, handler);
    };
  }
  onAppReady(handler) {
    var _a2, _b, _c;
    if ((_a2 = this.electron.app) == null ? void 0 : _a2.isReady()) {
      handler();
    } else if ((_b = this.electron.app) == null ? void 0 : _b.once) {
      (_c = this.electron.app) == null ? void 0 : _c.once("ready", handler);
    } else {
      handler();
    }
  }
  onEveryWebContentsEvent(eventName, handler) {
    var _a2, _b, _c;
    (_b = (_a2 = this.electron.webContents) == null ? void 0 : _a2.getAllWebContents()) == null ? void 0 : _b.forEach((webContents) => {
      webContents.on(eventName, handler);
    });
    (_c = this.electron.app) == null ? void 0 : _c.on("web-contents-created", onWebContentsCreated);
    return () => {
      var _a3, _b2;
      (_a3 = this.electron.webContents) == null ? void 0 : _a3.getAllWebContents().forEach((webContents) => {
        webContents.off(eventName, handler);
      });
      (_b2 = this.electron.app) == null ? void 0 : _b2.off("web-contents-created", onWebContentsCreated);
    };
    function onWebContentsCreated(_, webContents) {
      webContents.on(eventName, handler);
    }
  }
  /**
   * Listen to async messages sent from opposite process
   * @param {string} channel
   * @param {function} listener
   */
  onIpc(channel, listener) {
    var _a2;
    (_a2 = this.electron.ipcMain) == null ? void 0 : _a2.on(channel, listener);
  }
  onIpcInvoke(channel, listener) {
    var _a2, _b;
    (_b = (_a2 = this.electron.ipcMain) == null ? void 0 : _a2.handle) == null ? void 0 : _b.call(_a2, channel, listener);
  }
  /**
   * @param {string} url
   * @param {Function} [logFunction]
   */
  openUrl(url, logFunction = console.error) {
    var _a2;
    (_a2 = this.electron.shell) == null ? void 0 : _a2.openExternal(url).catch(logFunction);
  }
  setPreloadFileForSessions({
    filePath,
    includeFutureSession = true,
    getSessions = () => {
      var _a2;
      return [(_a2 = this.electron.session) == null ? void 0 : _a2.defaultSession];
    }
  }) {
    for (const session of getSessions().filter(Boolean)) {
      setPreload(session);
    }
    if (includeFutureSession) {
      this.onAppEvent("session-created", (session) => {
        setPreload(session);
      });
    }
    function setPreload(session) {
      if (typeof session.registerPreloadScript === "function") {
        session.registerPreloadScript({
          filePath,
          id: "electron-log-preload",
          type: "frame"
        });
      } else {
        session.setPreloads([...session.getPreloads(), filePath]);
      }
    }
  }
  /**
   * Sent a message to opposite process
   * @param {string} channel
   * @param {any} message
   */
  sendIpc(channel, message) {
    var _a2, _b;
    (_b = (_a2 = this.electron.BrowserWindow) == null ? void 0 : _a2.getAllWindows()) == null ? void 0 : _b.forEach((wnd) => {
      var _a3, _b2;
      if (((_a3 = wnd.webContents) == null ? void 0 : _a3.isDestroyed()) === false && ((_b2 = wnd.webContents) == null ? void 0 : _b2.isCrashed()) === false) {
        wnd.webContents.send(channel, message);
      }
    });
  }
  showErrorBox(title, message) {
    var _a2;
    (_a2 = this.electron.dialog) == null ? void 0 : _a2.showErrorBox(title, message);
  }
};
var ElectronExternalApi_1 = ElectronExternalApi$1;
var electronLogPreload = { exports: {} };
(function(module2) {
  let electron2 = {};
  try {
    electron2 = require("electron");
  } catch (e) {
  }
  if (electron2.ipcRenderer) {
    initialize2(electron2);
  }
  {
    module2.exports = initialize2;
  }
  function initialize2({ contextBridge, ipcRenderer }) {
    if (!ipcRenderer) {
      return;
    }
    ipcRenderer.on("__ELECTRON_LOG_IPC__", (_, message) => {
      window.postMessage({ cmd: "message", ...message });
    });
    ipcRenderer.invoke("__ELECTRON_LOG__", { cmd: "getOptions" }).catch((e) => console.error(new Error(
      `electron-log isn't initialized in the main process. Please call log.initialize() before. ${e.message}`
    )));
    const electronLog = {
      sendToMain(message) {
        try {
          ipcRenderer.send("__ELECTRON_LOG__", message);
        } catch (e) {
          console.error("electronLog.sendToMain ", e, "data:", message);
          ipcRenderer.send("__ELECTRON_LOG__", {
            cmd: "errorHandler",
            error: { message: e == null ? void 0 : e.message, stack: e == null ? void 0 : e.stack },
            errorName: "sendToMain"
          });
        }
      },
      log(...data) {
        electronLog.sendToMain({ data, level: "info" });
      }
    };
    for (const level of ["error", "warn", "info", "verbose", "debug", "silly"]) {
      electronLog[level] = (...data) => electronLog.sendToMain({
        data,
        level
      });
    }
    if (contextBridge && process.contextIsolated) {
      try {
        contextBridge.exposeInMainWorld("__electronLog", electronLog);
      } catch {
      }
    }
    if (typeof window === "object") {
      window.__electronLog = electronLog;
    } else {
      __electronLog = electronLog;
    }
  }
})(electronLogPreload);
var electronLogPreloadExports = electronLogPreload.exports;
const fs$3 = require$$0;
const os$2 = require$$1;
const path$2 = require$$2;
const preloadInitializeFn = electronLogPreloadExports;
var initialize$1 = {
  initialize({
    externalApi: externalApi2,
    getSessions,
    includeFutureSession,
    logger,
    preload = true,
    spyRendererConsole = false
  }) {
    externalApi2.onAppReady(() => {
      try {
        if (preload) {
          initializePreload({
            externalApi: externalApi2,
            getSessions,
            includeFutureSession,
            preloadOption: preload
          });
        }
        if (spyRendererConsole) {
          initializeSpyRendererConsole({ externalApi: externalApi2, logger });
        }
      } catch (err) {
        logger.warn(err);
      }
    });
  }
};
function initializePreload({
  externalApi: externalApi2,
  getSessions,
  includeFutureSession,
  preloadOption
}) {
  let preloadPath = typeof preloadOption === "string" ? preloadOption : void 0;
  try {
    preloadPath = path$2.resolve(
      __dirname,
      "../renderer/electron-log-preload.js"
    );
  } catch {
  }
  if (!preloadPath || !fs$3.existsSync(preloadPath)) {
    preloadPath = path$2.join(
      externalApi2.getAppUserDataPath() || os$2.tmpdir(),
      "electron-log-preload.js"
    );
    const preloadCode = `
      try {
        (${preloadInitializeFn.toString()})(require('electron'));
      } catch(e) {
        console.error(e);
      }
    `;
    fs$3.writeFileSync(preloadPath, preloadCode, "utf8");
  }
  externalApi2.setPreloadFileForSessions({
    filePath: preloadPath,
    includeFutureSession,
    getSessions
  });
}
function initializeSpyRendererConsole({ externalApi: externalApi2, logger }) {
  const levels = ["verbose", "info", "warning", "error"];
  externalApi2.onEveryWebContentsEvent(
    "console-message",
    (event, level, message) => {
      logger.processMessage({
        data: [message],
        level: levels[level],
        variables: { processType: "renderer" }
      });
    }
  );
}
var scope = scopeFactory$1;
function scopeFactory$1(logger) {
  return Object.defineProperties(scope2, {
    defaultLabel: { value: "", writable: true },
    labelPadding: { value: true, writable: true },
    maxLabelLength: { value: 0, writable: true },
    labelLength: {
      get() {
        switch (typeof scope2.labelPadding) {
          case "boolean":
            return scope2.labelPadding ? scope2.maxLabelLength : 0;
          case "number":
            return scope2.labelPadding;
          default:
            return 0;
        }
      }
    }
  });
  function scope2(label) {
    scope2.maxLabelLength = Math.max(scope2.maxLabelLength, label.length);
    const newScope = {};
    for (const level of logger.levels) {
      newScope[level] = (...d) => logger.logData(d, { level, scope: label });
    }
    newScope.log = newScope.info;
    return newScope;
  }
}
let Buffering$1 = class Buffering {
  constructor({ processMessage: processMessage2 }) {
    this.processMessage = processMessage2;
    this.buffer = [];
    this.enabled = false;
    this.begin = this.begin.bind(this);
    this.commit = this.commit.bind(this);
    this.reject = this.reject.bind(this);
  }
  addMessage(message) {
    this.buffer.push(message);
  }
  begin() {
    this.enabled = [];
  }
  commit() {
    this.enabled = false;
    this.buffer.forEach((item) => this.processMessage(item));
    this.buffer = [];
  }
  reject() {
    this.enabled = false;
    this.buffer = [];
  }
};
var Buffering_1 = Buffering$1;
const scopeFactory = scope;
const Buffering2 = Buffering_1;
let Logger$1 = (_a = class {
  constructor({
    allowUnknownLevel = false,
    dependencies = {},
    errorHandler,
    eventLogger,
    initializeFn,
    isDev = false,
    levels = ["error", "warn", "info", "verbose", "debug", "silly"],
    logId,
    transportFactories = {},
    variables
  } = {}) {
    __publicField(this, "dependencies", {});
    __publicField(this, "errorHandler", null);
    __publicField(this, "eventLogger", null);
    __publicField(this, "functions", {});
    __publicField(this, "hooks", []);
    __publicField(this, "isDev", false);
    __publicField(this, "levels", null);
    __publicField(this, "logId", null);
    __publicField(this, "scope", null);
    __publicField(this, "transports", {});
    __publicField(this, "variables", {});
    this.addLevel = this.addLevel.bind(this);
    this.create = this.create.bind(this);
    this.initialize = this.initialize.bind(this);
    this.logData = this.logData.bind(this);
    this.processMessage = this.processMessage.bind(this);
    this.allowUnknownLevel = allowUnknownLevel;
    this.buffering = new Buffering2(this);
    this.dependencies = dependencies;
    this.initializeFn = initializeFn;
    this.isDev = isDev;
    this.levels = levels;
    this.logId = logId;
    this.scope = scopeFactory(this);
    this.transportFactories = transportFactories;
    this.variables = variables || {};
    for (const name of this.levels) {
      this.addLevel(name, false);
    }
    this.log = this.info;
    this.functions.log = this.log;
    this.errorHandler = errorHandler;
    errorHandler == null ? void 0 : errorHandler.setOptions({ ...dependencies, logFn: this.error });
    this.eventLogger = eventLogger;
    eventLogger == null ? void 0 : eventLogger.setOptions({ ...dependencies, logger: this });
    for (const [name, factory] of Object.entries(transportFactories)) {
      this.transports[name] = factory(this, dependencies);
    }
    _a.instances[logId] = this;
  }
  static getInstance({ logId }) {
    return this.instances[logId] || this.instances.default;
  }
  addLevel(level, index = this.levels.length) {
    if (index !== false) {
      this.levels.splice(index, 0, level);
    }
    this[level] = (...args) => this.logData(args, { level });
    this.functions[level] = this[level];
  }
  catchErrors(options) {
    this.processMessage(
      {
        data: ["log.catchErrors is deprecated. Use log.errorHandler instead"],
        level: "warn"
      },
      { transports: ["console"] }
    );
    return this.errorHandler.startCatching(options);
  }
  create(options) {
    if (typeof options === "string") {
      options = { logId: options };
    }
    return new _a({
      dependencies: this.dependencies,
      errorHandler: this.errorHandler,
      initializeFn: this.initializeFn,
      isDev: this.isDev,
      transportFactories: this.transportFactories,
      variables: { ...this.variables },
      ...options
    });
  }
  compareLevels(passLevel, checkLevel, levels = this.levels) {
    const pass = levels.indexOf(passLevel);
    const check = levels.indexOf(checkLevel);
    if (check === -1 || pass === -1) {
      return true;
    }
    return check <= pass;
  }
  initialize(options = {}) {
    this.initializeFn({ logger: this, ...this.dependencies, ...options });
  }
  logData(data, options = {}) {
    if (this.buffering.enabled) {
      this.buffering.addMessage({ data, ...options });
    } else {
      this.processMessage({ data, ...options });
    }
  }
  processMessage(message, { transports = this.transports } = {}) {
    if (message.cmd === "errorHandler") {
      this.errorHandler.handle(message.error, {
        errorName: message.errorName,
        processType: "renderer",
        showDialog: Boolean(message.showDialog)
      });
      return;
    }
    let level = message.level;
    if (!this.allowUnknownLevel) {
      level = this.levels.includes(message.level) ? message.level : "info";
    }
    const normalizedMessage = {
      date: /* @__PURE__ */ new Date(),
      logId: this.logId,
      ...message,
      level,
      variables: {
        ...this.variables,
        ...message.variables
      }
    };
    for (const [transName, transFn] of this.transportEntries(transports)) {
      if (typeof transFn !== "function" || transFn.level === false) {
        continue;
      }
      if (!this.compareLevels(transFn.level, message.level)) {
        continue;
      }
      try {
        const transformedMsg = this.hooks.reduce((msg, hook) => {
          return msg ? hook(msg, transFn, transName) : msg;
        }, normalizedMessage);
        if (transformedMsg) {
          transFn({ ...transformedMsg, data: [...transformedMsg.data] });
        }
      } catch (e) {
        this.processInternalErrorFn(e);
      }
    }
  }
  processInternalErrorFn(_e) {
  }
  transportEntries(transports = this.transports) {
    const transportArray = Array.isArray(transports) ? transports : Object.entries(transports);
    return transportArray.map((item) => {
      switch (typeof item) {
        case "string":
          return this.transports[item] ? [item, this.transports[item]] : null;
        case "function":
          return [item.name, item];
        default:
          return Array.isArray(item) ? item : null;
      }
    }).filter(Boolean);
  }
}, __publicField(_a, "instances", {}), _a);
var Logger_1 = Logger$1;
let ErrorHandler$1 = class ErrorHandler {
  constructor({
    externalApi: externalApi2,
    logFn = void 0,
    onError = void 0,
    showDialog = void 0
  } = {}) {
    __publicField(this, "externalApi");
    __publicField(this, "isActive", false);
    __publicField(this, "logFn");
    __publicField(this, "onError");
    __publicField(this, "showDialog", true);
    this.createIssue = this.createIssue.bind(this);
    this.handleError = this.handleError.bind(this);
    this.handleRejection = this.handleRejection.bind(this);
    this.setOptions({ externalApi: externalApi2, logFn, onError, showDialog });
    this.startCatching = this.startCatching.bind(this);
    this.stopCatching = this.stopCatching.bind(this);
  }
  handle(error, {
    logFn = this.logFn,
    onError = this.onError,
    processType = "browser",
    showDialog = this.showDialog,
    errorName = ""
  } = {}) {
    var _a2;
    error = normalizeError(error);
    try {
      if (typeof onError === "function") {
        const versions = ((_a2 = this.externalApi) == null ? void 0 : _a2.getVersions()) || {};
        const createIssue = this.createIssue;
        const result = onError({
          createIssue,
          error,
          errorName,
          processType,
          versions
        });
        if (result === false) {
          return;
        }
      }
      errorName ? logFn(errorName, error) : logFn(error);
      if (showDialog && !errorName.includes("rejection") && this.externalApi) {
        this.externalApi.showErrorBox(
          `A JavaScript error occurred in the ${processType} process`,
          error.stack
        );
      }
    } catch {
      console.error(error);
    }
  }
  setOptions({ externalApi: externalApi2, logFn, onError, showDialog }) {
    if (typeof externalApi2 === "object") {
      this.externalApi = externalApi2;
    }
    if (typeof logFn === "function") {
      this.logFn = logFn;
    }
    if (typeof onError === "function") {
      this.onError = onError;
    }
    if (typeof showDialog === "boolean") {
      this.showDialog = showDialog;
    }
  }
  startCatching({ onError, showDialog } = {}) {
    if (this.isActive) {
      return;
    }
    this.isActive = true;
    this.setOptions({ onError, showDialog });
    process.on("uncaughtException", this.handleError);
    process.on("unhandledRejection", this.handleRejection);
  }
  stopCatching() {
    this.isActive = false;
    process.removeListener("uncaughtException", this.handleError);
    process.removeListener("unhandledRejection", this.handleRejection);
  }
  createIssue(pageUrl, queryParams) {
    var _a2;
    (_a2 = this.externalApi) == null ? void 0 : _a2.openUrl(
      `${pageUrl}?${new URLSearchParams(queryParams).toString()}`
    );
  }
  handleError(error) {
    this.handle(error, { errorName: "Unhandled" });
  }
  handleRejection(reason) {
    const error = reason instanceof Error ? reason : new Error(JSON.stringify(reason));
    this.handle(error, { errorName: "Unhandled rejection" });
  }
};
function normalizeError(e) {
  if (e instanceof Error) {
    return e;
  }
  if (e && typeof e === "object") {
    if (e.message) {
      return Object.assign(new Error(e.message), e);
    }
    try {
      return new Error(JSON.stringify(e));
    } catch (serErr) {
      return new Error(`Couldn't normalize error ${String(e)}: ${serErr}`);
    }
  }
  return new Error(`Can't normalize error ${String(e)}`);
}
var ErrorHandler_1 = ErrorHandler$1;
let EventLogger$1 = class EventLogger {
  constructor(options = {}) {
    __publicField(this, "disposers", []);
    __publicField(this, "format", "{eventSource}#{eventName}:");
    __publicField(this, "formatters", {
      app: {
        "certificate-error": ({ args }) => {
          return this.arrayToObject(args.slice(1, 4), [
            "url",
            "error",
            "certificate"
          ]);
        },
        "child-process-gone": ({ args }) => {
          return args.length === 1 ? args[0] : args;
        },
        "render-process-gone": ({ args: [webContents, details] }) => {
          return details && typeof details === "object" ? { ...details, ...this.getWebContentsDetails(webContents) } : [];
        }
      },
      webContents: {
        "console-message": ({ args: [level, message, line, sourceId] }) => {
          if (level < 3) {
            return void 0;
          }
          return { message, source: `${sourceId}:${line}` };
        },
        "did-fail-load": ({ args }) => {
          return this.arrayToObject(args, [
            "errorCode",
            "errorDescription",
            "validatedURL",
            "isMainFrame",
            "frameProcessId",
            "frameRoutingId"
          ]);
        },
        "did-fail-provisional-load": ({ args }) => {
          return this.arrayToObject(args, [
            "errorCode",
            "errorDescription",
            "validatedURL",
            "isMainFrame",
            "frameProcessId",
            "frameRoutingId"
          ]);
        },
        "plugin-crashed": ({ args }) => {
          return this.arrayToObject(args, ["name", "version"]);
        },
        "preload-error": ({ args }) => {
          return this.arrayToObject(args, ["preloadPath", "error"]);
        }
      }
    });
    __publicField(this, "events", {
      app: {
        "certificate-error": true,
        "child-process-gone": true,
        "render-process-gone": true
      },
      webContents: {
        // 'console-message': true,
        "did-fail-load": true,
        "did-fail-provisional-load": true,
        "plugin-crashed": true,
        "preload-error": true,
        "unresponsive": true
      }
    });
    __publicField(this, "externalApi");
    __publicField(this, "level", "error");
    __publicField(this, "scope", "");
    this.setOptions(options);
  }
  setOptions({
    events,
    externalApi: externalApi2,
    level,
    logger,
    format: format2,
    formatters,
    scope: scope2
  }) {
    if (typeof events === "object") {
      this.events = events;
    }
    if (typeof externalApi2 === "object") {
      this.externalApi = externalApi2;
    }
    if (typeof level === "string") {
      this.level = level;
    }
    if (typeof logger === "object") {
      this.logger = logger;
    }
    if (typeof format2 === "string" || typeof format2 === "function") {
      this.format = format2;
    }
    if (typeof formatters === "object") {
      this.formatters = formatters;
    }
    if (typeof scope2 === "string") {
      this.scope = scope2;
    }
  }
  startLogging(options = {}) {
    this.setOptions(options);
    this.disposeListeners();
    for (const eventName of this.getEventNames(this.events.app)) {
      this.disposers.push(
        this.externalApi.onAppEvent(eventName, (...handlerArgs) => {
          this.handleEvent({ eventSource: "app", eventName, handlerArgs });
        })
      );
    }
    for (const eventName of this.getEventNames(this.events.webContents)) {
      this.disposers.push(
        this.externalApi.onEveryWebContentsEvent(
          eventName,
          (...handlerArgs) => {
            this.handleEvent(
              { eventSource: "webContents", eventName, handlerArgs }
            );
          }
        )
      );
    }
  }
  stopLogging() {
    this.disposeListeners();
  }
  arrayToObject(array, fieldNames) {
    const obj = {};
    fieldNames.forEach((fieldName, index) => {
      obj[fieldName] = array[index];
    });
    if (array.length > fieldNames.length) {
      obj.unknownArgs = array.slice(fieldNames.length);
    }
    return obj;
  }
  disposeListeners() {
    this.disposers.forEach((disposer) => disposer());
    this.disposers = [];
  }
  formatEventLog({ eventName, eventSource, handlerArgs }) {
    var _a2;
    const [event, ...args] = handlerArgs;
    if (typeof this.format === "function") {
      return this.format({ args, event, eventName, eventSource });
    }
    const formatter = (_a2 = this.formatters[eventSource]) == null ? void 0 : _a2[eventName];
    let formattedArgs = args;
    if (typeof formatter === "function") {
      formattedArgs = formatter({ args, event, eventName, eventSource });
    }
    if (!formattedArgs) {
      return void 0;
    }
    const eventData = {};
    if (Array.isArray(formattedArgs)) {
      eventData.args = formattedArgs;
    } else if (typeof formattedArgs === "object") {
      Object.assign(eventData, formattedArgs);
    }
    if (eventSource === "webContents") {
      Object.assign(eventData, this.getWebContentsDetails(event == null ? void 0 : event.sender));
    }
    const title = this.format.replace("{eventSource}", eventSource === "app" ? "App" : "WebContents").replace("{eventName}", eventName);
    return [title, eventData];
  }
  getEventNames(eventMap) {
    if (!eventMap || typeof eventMap !== "object") {
      return [];
    }
    return Object.entries(eventMap).filter(([_, listen]) => listen).map(([eventName]) => eventName);
  }
  getWebContentsDetails(webContents) {
    if (!(webContents == null ? void 0 : webContents.loadURL)) {
      return {};
    }
    try {
      return {
        webContents: {
          id: webContents.id,
          url: webContents.getURL()
        }
      };
    } catch {
      return {};
    }
  }
  handleEvent({ eventName, eventSource, handlerArgs }) {
    var _a2;
    const log2 = this.formatEventLog({ eventName, eventSource, handlerArgs });
    if (log2) {
      const logFns = this.scope ? this.logger.scope(this.scope) : this.logger;
      (_a2 = logFns == null ? void 0 : logFns[this.level]) == null ? void 0 : _a2.call(logFns, ...log2);
    }
  }
};
var EventLogger_1 = EventLogger$1;
var transform_1 = { transform: transform$5 };
function transform$5({
  logger,
  message,
  transport,
  initialData = (message == null ? void 0 : message.data) || [],
  transforms = transport == null ? void 0 : transport.transforms
}) {
  return transforms.reduce((data, trans) => {
    if (typeof trans === "function") {
      return trans({ data, logger, message, transport });
    }
    return data;
  }, initialData);
}
const { transform: transform$4 } = transform_1;
var format$2 = {
  concatFirstStringElements: concatFirstStringElements$2,
  format({ message, logger, transport, data = message == null ? void 0 : message.data }) {
    switch (typeof transport.format) {
      case "string": {
        return transform$4({
          message,
          logger,
          transforms: [formatVariables, formatScope, formatText],
          transport,
          initialData: [transport.format, ...data]
        });
      }
      case "function": {
        return transport.format({
          data,
          level: (message == null ? void 0 : message.level) || "info",
          logger,
          message,
          transport
        });
      }
      default: {
        return data;
      }
    }
  }
};
function concatFirstStringElements$2({ data }) {
  if (typeof data[0] !== "string" || typeof data[1] !== "string") {
    return data;
  }
  if (data[0].match(/%[1cdfiOos]/)) {
    return data;
  }
  return [`${data[0]} ${data[1]}`, ...data.slice(2)];
}
function timeZoneFromOffset(minutesOffset) {
  const minutesPositive = Math.abs(minutesOffset);
  const sign = minutesOffset > 0 ? "-" : "+";
  const hours = Math.floor(minutesPositive / 60).toString().padStart(2, "0");
  const minutes = (minutesPositive % 60).toString().padStart(2, "0");
  return `${sign}${hours}:${minutes}`;
}
function formatScope({ data, logger, message }) {
  const { defaultLabel, labelLength } = (logger == null ? void 0 : logger.scope) || {};
  const template = data[0];
  let label = message.scope;
  if (!label) {
    label = defaultLabel;
  }
  let scopeText;
  if (label === "") {
    scopeText = labelLength > 0 ? "".padEnd(labelLength + 3) : "";
  } else if (typeof label === "string") {
    scopeText = ` (${label})`.padEnd(labelLength + 3);
  } else {
    scopeText = "";
  }
  data[0] = template.replace("{scope}", scopeText);
  return data;
}
function formatVariables({ data, message }) {
  let template = data[0];
  if (typeof template !== "string") {
    return data;
  }
  template = template.replace("{level}]", `${message.level}]`.padEnd(6, " "));
  const date = message.date || /* @__PURE__ */ new Date();
  data[0] = template.replace(/\{(\w+)}/g, (substring, name) => {
    var _a2;
    switch (name) {
      case "level":
        return message.level || "info";
      case "logId":
        return message.logId;
      case "y":
        return date.getFullYear().toString(10);
      case "m":
        return (date.getMonth() + 1).toString(10).padStart(2, "0");
      case "d":
        return date.getDate().toString(10).padStart(2, "0");
      case "h":
        return date.getHours().toString(10).padStart(2, "0");
      case "i":
        return date.getMinutes().toString(10).padStart(2, "0");
      case "s":
        return date.getSeconds().toString(10).padStart(2, "0");
      case "ms":
        return date.getMilliseconds().toString(10).padStart(3, "0");
      case "z":
        return timeZoneFromOffset(date.getTimezoneOffset());
      case "iso":
        return date.toISOString();
      default: {
        return ((_a2 = message.variables) == null ? void 0 : _a2[name]) || substring;
      }
    }
  }).trim();
  return data;
}
function formatText({ data }) {
  const template = data[0];
  if (typeof template !== "string") {
    return data;
  }
  const textTplPosition = template.lastIndexOf("{text}");
  if (textTplPosition === template.length - 6) {
    data[0] = template.replace(/\s?{text}/, "");
    if (data[0] === "") {
      data.shift();
    }
    return data;
  }
  const templatePieces = template.split("{text}");
  let result = [];
  if (templatePieces[0] !== "") {
    result.push(templatePieces[0]);
  }
  result = result.concat(data.slice(1));
  if (templatePieces[1] !== "") {
    result.push(templatePieces[1]);
  }
  return result;
}
var object = { exports: {} };
(function(module2) {
  const util = require$$0$2;
  module2.exports = {
    serialize,
    maxDepth({ data, transport, depth = (transport == null ? void 0 : transport.depth) ?? 6 }) {
      if (!data) {
        return data;
      }
      if (depth < 1) {
        if (Array.isArray(data)) return "[array]";
        if (typeof data === "object" && data) return "[object]";
        return data;
      }
      if (Array.isArray(data)) {
        return data.map((child) => module2.exports.maxDepth({
          data: child,
          depth: depth - 1
        }));
      }
      if (typeof data !== "object") {
        return data;
      }
      if (data && typeof data.toISOString === "function") {
        return data;
      }
      if (data === null) {
        return null;
      }
      if (data instanceof Error) {
        return data;
      }
      const newJson = {};
      for (const i in data) {
        if (!Object.prototype.hasOwnProperty.call(data, i)) continue;
        newJson[i] = module2.exports.maxDepth({
          data: data[i],
          depth: depth - 1
        });
      }
      return newJson;
    },
    toJSON({ data }) {
      return JSON.parse(JSON.stringify(data, createSerializer()));
    },
    toString({ data, transport }) {
      const inspectOptions = (transport == null ? void 0 : transport.inspectOptions) || {};
      const simplifiedData = data.map((item) => {
        if (item === void 0) {
          return void 0;
        }
        try {
          const str = JSON.stringify(item, createSerializer(), "  ");
          return str === void 0 ? void 0 : JSON.parse(str);
        } catch (e) {
          return item;
        }
      });
      return util.formatWithOptions(inspectOptions, ...simplifiedData);
    }
  };
  function createSerializer(options = {}) {
    const seen = /* @__PURE__ */ new WeakSet();
    return function(key, value) {
      if (typeof value === "object" && value !== null) {
        if (seen.has(value)) {
          return void 0;
        }
        seen.add(value);
      }
      return serialize(key, value, options);
    };
  }
  function serialize(key, value, options = {}) {
    const serializeMapAndSet = (options == null ? void 0 : options.serializeMapAndSet) !== false;
    if (value instanceof Error) {
      return value.stack;
    }
    if (!value) {
      return value;
    }
    if (typeof value === "function") {
      return `[function] ${value.toString()}`;
    }
    if (value instanceof Date) {
      return value.toISOString();
    }
    if (serializeMapAndSet && value instanceof Map && Object.fromEntries) {
      return Object.fromEntries(value);
    }
    if (serializeMapAndSet && value instanceof Set && Array.from) {
      return Array.from(value);
    }
    return value;
  }
})(object);
var objectExports = object.exports;
var style = {
  applyAnsiStyles({ data }) {
    return transformStyles(data, styleToAnsi, resetAnsiStyle);
  },
  removeStyles({ data }) {
    return transformStyles(data, () => "");
  }
};
const ANSI_COLORS = {
  unset: "\x1B[0m",
  black: "\x1B[30m",
  red: "\x1B[31m",
  green: "\x1B[32m",
  yellow: "\x1B[33m",
  blue: "\x1B[34m",
  magenta: "\x1B[35m",
  cyan: "\x1B[36m",
  white: "\x1B[37m"
};
function styleToAnsi(style2) {
  const color = style2.replace(/color:\s*(\w+).*/, "$1").toLowerCase();
  return ANSI_COLORS[color] || "";
}
function resetAnsiStyle(string) {
  return string + ANSI_COLORS.unset;
}
function transformStyles(data, onStyleFound, onStyleApplied) {
  const foundStyles = {};
  return data.reduce((result, item, index, array) => {
    if (foundStyles[index]) {
      return result;
    }
    if (typeof item === "string") {
      let valueIndex = index;
      let styleApplied = false;
      item = item.replace(/%[1cdfiOos]/g, (match) => {
        valueIndex += 1;
        if (match !== "%c") {
          return match;
        }
        const style2 = array[valueIndex];
        if (typeof style2 === "string") {
          foundStyles[valueIndex] = true;
          styleApplied = true;
          return onStyleFound(style2, item);
        }
        return match;
      });
      if (styleApplied && onStyleApplied) {
        item = onStyleApplied(item);
      }
    }
    result.push(item);
    return result;
  }, []);
}
const {
  concatFirstStringElements: concatFirstStringElements$1,
  format: format$1
} = format$2;
const { maxDepth: maxDepth$2, toJSON: toJSON$2 } = objectExports;
const {
  applyAnsiStyles,
  removeStyles: removeStyles$2
} = style;
const { transform: transform$3 } = transform_1;
const consoleMethods = {
  error: console.error,
  warn: console.warn,
  info: console.info,
  verbose: console.info,
  debug: console.debug,
  silly: console.debug,
  log: console.log
};
var console_1 = consoleTransportFactory;
const separator = process.platform === "win32" ? ">" : "›";
const DEFAULT_FORMAT = `%c{h}:{i}:{s}.{ms}{scope}%c ${separator} {text}`;
Object.assign(consoleTransportFactory, {
  DEFAULT_FORMAT
});
function consoleTransportFactory(logger) {
  return Object.assign(transport, {
    format: DEFAULT_FORMAT,
    level: "silly",
    transforms: [
      addTemplateColors,
      format$1,
      formatStyles,
      concatFirstStringElements$1,
      maxDepth$2,
      toJSON$2
    ],
    useStyles: process.env.FORCE_STYLES,
    writeFn({ message }) {
      const consoleLogFn = consoleMethods[message.level] || consoleMethods.info;
      consoleLogFn(...message.data);
    }
  });
  function transport(message) {
    const data = transform$3({ logger, message, transport });
    transport.writeFn({
      message: { ...message, data }
    });
  }
}
function addTemplateColors({ data, message, transport }) {
  if (transport.format !== DEFAULT_FORMAT) {
    return data;
  }
  return [`color:${levelToStyle(message.level)}`, "color:unset", ...data];
}
function canUseStyles(useStyleValue, level) {
  if (typeof useStyleValue === "boolean") {
    return useStyleValue;
  }
  const useStderr = level === "error" || level === "warn";
  const stream = useStderr ? process.stderr : process.stdout;
  return stream && stream.isTTY;
}
function formatStyles(args) {
  const { message, transport } = args;
  const useStyles = canUseStyles(transport.useStyles, message.level);
  const nextTransform = useStyles ? applyAnsiStyles : removeStyles$2;
  return nextTransform(args);
}
function levelToStyle(level) {
  const map = { error: "red", warn: "yellow", info: "cyan", default: "unset" };
  return map[level] || map.default;
}
const EventEmitter$1 = require$$0$3;
const fs$2 = require$$0;
const os$1 = require$$1;
let File$2 = class File extends EventEmitter$1 {
  constructor({
    path: path2,
    writeOptions = { encoding: "utf8", flag: "a", mode: 438 },
    writeAsync = false
  }) {
    super();
    __publicField(this, "asyncWriteQueue", []);
    __publicField(this, "bytesWritten", 0);
    __publicField(this, "hasActiveAsyncWriting", false);
    __publicField(this, "path", null);
    __publicField(this, "initialSize");
    __publicField(this, "writeOptions", null);
    __publicField(this, "writeAsync", false);
    this.path = path2;
    this.writeOptions = writeOptions;
    this.writeAsync = writeAsync;
  }
  get size() {
    return this.getSize();
  }
  clear() {
    try {
      fs$2.writeFileSync(this.path, "", {
        mode: this.writeOptions.mode,
        flag: "w"
      });
      this.reset();
      return true;
    } catch (e) {
      if (e.code === "ENOENT") {
        return true;
      }
      this.emit("error", e, this);
      return false;
    }
  }
  crop(bytesAfter) {
    try {
      const content = readFileSyncFromEnd(this.path, bytesAfter || 4096);
      this.clear();
      this.writeLine(`[log cropped]${os$1.EOL}${content}`);
    } catch (e) {
      this.emit(
        "error",
        new Error(`Couldn't crop file ${this.path}. ${e.message}`),
        this
      );
    }
  }
  getSize() {
    if (this.initialSize === void 0) {
      try {
        const stats = fs$2.statSync(this.path);
        this.initialSize = stats.size;
      } catch (e) {
        this.initialSize = 0;
      }
    }
    return this.initialSize + this.bytesWritten;
  }
  increaseBytesWrittenCounter(text) {
    this.bytesWritten += Buffer.byteLength(text, this.writeOptions.encoding);
  }
  isNull() {
    return false;
  }
  nextAsyncWrite() {
    const file2 = this;
    if (this.hasActiveAsyncWriting || this.asyncWriteQueue.length === 0) {
      return;
    }
    const text = this.asyncWriteQueue.join("");
    this.asyncWriteQueue = [];
    this.hasActiveAsyncWriting = true;
    fs$2.writeFile(this.path, text, this.writeOptions, (e) => {
      file2.hasActiveAsyncWriting = false;
      if (e) {
        file2.emit(
          "error",
          new Error(`Couldn't write to ${file2.path}. ${e.message}`),
          this
        );
      } else {
        file2.increaseBytesWrittenCounter(text);
      }
      file2.nextAsyncWrite();
    });
  }
  reset() {
    this.initialSize = void 0;
    this.bytesWritten = 0;
  }
  toString() {
    return this.path;
  }
  writeLine(text) {
    text += os$1.EOL;
    if (this.writeAsync) {
      this.asyncWriteQueue.push(text);
      this.nextAsyncWrite();
      return;
    }
    try {
      fs$2.writeFileSync(this.path, text, this.writeOptions);
      this.increaseBytesWrittenCounter(text);
    } catch (e) {
      this.emit(
        "error",
        new Error(`Couldn't write to ${this.path}. ${e.message}`),
        this
      );
    }
  }
};
var File_1 = File$2;
function readFileSyncFromEnd(filePath, bytesCount) {
  const buffer = Buffer.alloc(bytesCount);
  const stats = fs$2.statSync(filePath);
  const readLength = Math.min(stats.size, bytesCount);
  const offset = Math.max(0, stats.size - bytesCount);
  const fd = fs$2.openSync(filePath, "r");
  const totalBytes = fs$2.readSync(fd, buffer, 0, readLength, offset);
  fs$2.closeSync(fd);
  return buffer.toString("utf8", 0, totalBytes);
}
const File$1 = File_1;
let NullFile$1 = class NullFile extends File$1 {
  clear() {
  }
  crop() {
  }
  getSize() {
    return 0;
  }
  isNull() {
    return true;
  }
  writeLine() {
  }
};
var NullFile_1 = NullFile$1;
const EventEmitter = require$$0$3;
const fs$1 = require$$0;
const path$1 = require$$2;
const File2 = File_1;
const NullFile2 = NullFile_1;
let FileRegistry$1 = class FileRegistry extends EventEmitter {
  constructor() {
    super();
    __publicField(this, "store", {});
    this.emitError = this.emitError.bind(this);
  }
  /**
   * Provide a File object corresponding to the filePath
   * @param {string} filePath
   * @param {WriteOptions} [writeOptions]
   * @param {boolean} [writeAsync]
   * @return {File}
   */
  provide({ filePath, writeOptions = {}, writeAsync = false }) {
    let file2;
    try {
      filePath = path$1.resolve(filePath);
      if (this.store[filePath]) {
        return this.store[filePath];
      }
      file2 = this.createFile({ filePath, writeOptions, writeAsync });
    } catch (e) {
      file2 = new NullFile2({ path: filePath });
      this.emitError(e, file2);
    }
    file2.on("error", this.emitError);
    this.store[filePath] = file2;
    return file2;
  }
  /**
   * @param {string} filePath
   * @param {WriteOptions} writeOptions
   * @param {boolean} async
   * @return {File}
   * @private
   */
  createFile({ filePath, writeOptions, writeAsync }) {
    this.testFileWriting({ filePath, writeOptions });
    return new File2({ path: filePath, writeOptions, writeAsync });
  }
  /**
   * @param {Error} error
   * @param {File} file
   * @private
   */
  emitError(error, file2) {
    this.emit("error", error, file2);
  }
  /**
   * @param {string} filePath
   * @param {WriteOptions} writeOptions
   * @private
   */
  testFileWriting({ filePath, writeOptions }) {
    fs$1.mkdirSync(path$1.dirname(filePath), { recursive: true });
    fs$1.writeFileSync(filePath, "", { flag: "a", mode: writeOptions.mode });
  }
};
var FileRegistry_1 = FileRegistry$1;
const fs = require$$0;
const os = require$$1;
const path = require$$2;
const FileRegistry2 = FileRegistry_1;
const { transform: transform$2 } = transform_1;
const { removeStyles: removeStyles$1 } = style;
const {
  format,
  concatFirstStringElements
} = format$2;
const { toString } = objectExports;
var file = fileTransportFactory;
const globalRegistry = new FileRegistry2();
function fileTransportFactory(logger, { registry = globalRegistry, externalApi: externalApi2 } = {}) {
  let pathVariables;
  if (registry.listenerCount("error") < 1) {
    registry.on("error", (e, file2) => {
      logConsole(`Can't write to ${file2}`, e);
    });
  }
  return Object.assign(transport, {
    fileName: getDefaultFileName(logger.variables.processType),
    format: "[{y}-{m}-{d} {h}:{i}:{s}.{ms}] [{level}]{scope} {text}",
    getFile,
    inspectOptions: { depth: 5 },
    level: "silly",
    maxSize: 1024 ** 2,
    readAllLogs,
    sync: true,
    transforms: [removeStyles$1, format, concatFirstStringElements, toString],
    writeOptions: { flag: "a", mode: 438, encoding: "utf8" },
    archiveLogFn(file2) {
      const oldPath = file2.toString();
      const inf = path.parse(oldPath);
      try {
        fs.renameSync(oldPath, path.join(inf.dir, `${inf.name}.old${inf.ext}`));
      } catch (e) {
        logConsole("Could not rotate log", e);
        const quarterOfMaxSize = Math.round(transport.maxSize / 4);
        file2.crop(Math.min(quarterOfMaxSize, 256 * 1024));
      }
    },
    resolvePathFn(vars) {
      return path.join(vars.libraryDefaultDir, vars.fileName);
    },
    setAppName(name) {
      logger.dependencies.externalApi.setAppName(name);
    }
  });
  function transport(message) {
    const file2 = getFile(message);
    const needLogRotation = transport.maxSize > 0 && file2.size > transport.maxSize;
    if (needLogRotation) {
      transport.archiveLogFn(file2);
      file2.reset();
    }
    const content = transform$2({ logger, message, transport });
    file2.writeLine(content);
  }
  function initializeOnFirstAccess() {
    if (pathVariables) {
      return;
    }
    pathVariables = Object.create(
      Object.prototype,
      {
        ...Object.getOwnPropertyDescriptors(
          externalApi2.getPathVariables()
        ),
        fileName: {
          get() {
            return transport.fileName;
          },
          enumerable: true
        }
      }
    );
    if (typeof transport.archiveLog === "function") {
      transport.archiveLogFn = transport.archiveLog;
      logConsole("archiveLog is deprecated. Use archiveLogFn instead");
    }
    if (typeof transport.resolvePath === "function") {
      transport.resolvePathFn = transport.resolvePath;
      logConsole("resolvePath is deprecated. Use resolvePathFn instead");
    }
  }
  function logConsole(message, error = null, level = "error") {
    const data = [`electron-log.transports.file: ${message}`];
    if (error) {
      data.push(error);
    }
    logger.transports.console({ data, date: /* @__PURE__ */ new Date(), level });
  }
  function getFile(msg) {
    initializeOnFirstAccess();
    const filePath = transport.resolvePathFn(pathVariables, msg);
    return registry.provide({
      filePath,
      writeAsync: !transport.sync,
      writeOptions: transport.writeOptions
    });
  }
  function readAllLogs({ fileFilter = (f) => f.endsWith(".log") } = {}) {
    initializeOnFirstAccess();
    const logsPath = path.dirname(transport.resolvePathFn(pathVariables));
    if (!fs.existsSync(logsPath)) {
      return [];
    }
    return fs.readdirSync(logsPath).map((fileName) => path.join(logsPath, fileName)).filter(fileFilter).map((logPath) => {
      try {
        return {
          path: logPath,
          lines: fs.readFileSync(logPath, "utf8").split(os.EOL)
        };
      } catch {
        return null;
      }
    }).filter(Boolean);
  }
}
function getDefaultFileName(processType = process.type) {
  switch (processType) {
    case "renderer":
      return "renderer.log";
    case "worker":
      return "worker.log";
    default:
      return "main.log";
  }
}
const { maxDepth: maxDepth$1, toJSON: toJSON$1 } = objectExports;
const { transform: transform$1 } = transform_1;
var ipc = ipcTransportFactory;
function ipcTransportFactory(logger, { externalApi: externalApi2 }) {
  Object.assign(transport, {
    depth: 3,
    eventId: "__ELECTRON_LOG_IPC__",
    level: logger.isDev ? "silly" : false,
    transforms: [toJSON$1, maxDepth$1]
  });
  return (externalApi2 == null ? void 0 : externalApi2.isElectron()) ? transport : void 0;
  function transport(message) {
    var _a2;
    if (((_a2 = message == null ? void 0 : message.variables) == null ? void 0 : _a2.processType) === "renderer") {
      return;
    }
    externalApi2 == null ? void 0 : externalApi2.sendIpc(transport.eventId, {
      ...message,
      data: transform$1({ logger, message, transport })
    });
  }
}
const http = require$$0$4;
const https = require$$1$1;
const { transform } = transform_1;
const { removeStyles } = style;
const { toJSON, maxDepth } = objectExports;
var remote = remoteTransportFactory;
function remoteTransportFactory(logger) {
  return Object.assign(transport, {
    client: { name: "electron-application" },
    depth: 6,
    level: false,
    requestOptions: {},
    transforms: [removeStyles, toJSON, maxDepth],
    makeBodyFn({ message }) {
      return JSON.stringify({
        client: transport.client,
        data: message.data,
        date: message.date.getTime(),
        level: message.level,
        scope: message.scope,
        variables: message.variables
      });
    },
    processErrorFn({ error }) {
      logger.processMessage(
        {
          data: [`electron-log: can't POST ${transport.url}`, error],
          level: "warn"
        },
        { transports: ["console", "file"] }
      );
    },
    sendRequestFn({ serverUrl, requestOptions, body }) {
      const httpTransport = serverUrl.startsWith("https:") ? https : http;
      const request = httpTransport.request(serverUrl, {
        method: "POST",
        ...requestOptions,
        headers: {
          "Content-Type": "application/json",
          "Content-Length": body.length,
          ...requestOptions.headers
        }
      });
      request.write(body);
      request.end();
      return request;
    }
  });
  function transport(message) {
    if (!transport.url) {
      return;
    }
    const body = transport.makeBodyFn({
      logger,
      message: { ...message, data: transform({ logger, message, transport }) },
      transport
    });
    const request = transport.sendRequestFn({
      serverUrl: transport.url,
      requestOptions: transport.requestOptions,
      body: Buffer.from(body, "utf8")
    });
    request.on("error", (error) => transport.processErrorFn({
      error,
      logger,
      message,
      request,
      transport
    }));
  }
}
const Logger = Logger_1;
const ErrorHandler2 = ErrorHandler_1;
const EventLogger2 = EventLogger_1;
const transportConsole = console_1;
const transportFile = file;
const transportIpc = ipc;
const transportRemote = remote;
var createDefaultLogger_1 = createDefaultLogger$1;
function createDefaultLogger$1({ dependencies, initializeFn }) {
  var _a2;
  const defaultLogger2 = new Logger({
    dependencies,
    errorHandler: new ErrorHandler2(),
    eventLogger: new EventLogger2(),
    initializeFn,
    isDev: (_a2 = dependencies.externalApi) == null ? void 0 : _a2.isDev(),
    logId: "default",
    transportFactories: {
      console: transportConsole,
      file: transportFile,
      ipc: transportIpc,
      remote: transportRemote
    },
    variables: {
      processType: "main"
    }
  });
  defaultLogger2.default = defaultLogger2;
  defaultLogger2.Logger = Logger;
  defaultLogger2.processInternalErrorFn = (e) => {
    defaultLogger2.transports.console.writeFn({
      message: {
        data: ["Unhandled electron-log error", e],
        level: "error"
      }
    });
  };
  return defaultLogger2;
}
const electron = require$$0$5;
const ElectronExternalApi2 = ElectronExternalApi_1;
const { initialize } = initialize$1;
const createDefaultLogger = createDefaultLogger_1;
const externalApi = new ElectronExternalApi2({ electron });
const defaultLogger = createDefaultLogger({
  dependencies: { externalApi },
  initializeFn: initialize
});
var main$1 = defaultLogger;
externalApi.onIpc("__ELECTRON_LOG__", (_, message) => {
  if (message.scope) {
    defaultLogger.Logger.getInstance(message).scope(message.scope);
  }
  const date = new Date(message.date);
  processMessage({
    ...message,
    date: date.getTime() ? date : /* @__PURE__ */ new Date()
  });
});
externalApi.onIpcInvoke("__ELECTRON_LOG__", (_, { cmd = "", logId }) => {
  switch (cmd) {
    case "getOptions": {
      const logger = defaultLogger.Logger.getInstance({ logId });
      return {
        levels: logger.levels,
        logId
      };
    }
    default: {
      processMessage({ data: [`Unknown cmd '${cmd}'`], level: "error" });
      return {};
    }
  }
});
function processMessage(message) {
  var _a2;
  (_a2 = defaultLogger.Logger.getInstance(message)) == null ? void 0 : _a2.processMessage(message);
}
const main = main$1;
var main_1 = main;
const log = /* @__PURE__ */ getDefaultExportFromCjs(main_1);
log.initialize();
let __dirname$3 = path$6.dirname(node_url.fileURLToPath(typeof document === "undefined" ? require("url").pathToFileURL(__filename).href : _documentCurrentScript && _documentCurrentScript.tagName.toUpperCase() === "SCRIPT" && _documentCurrentScript.src || new URL("main.js", document.baseURI).href));
const env$2 = process.env.NODE_ENV;
if (env$2 !== "development") {
  __dirname$3 = __dirname$3.replace("\\app.asar\\dist-electron", "");
}
const _ClipboardDB = class _ClipboardDB {
  constructor() {
    __publicField(this, "db");
    log.info("[数据库进程] 数据库进程初始化");
    const dbFolder = path$6.join(__dirname$3, "../data");
    log.info("[数据库进程] 数据文件存储文件夹位置：", dbFolder);
    if (!fs$5.existsSync(dbFolder)) {
      fs$5.mkdirSync(dbFolder);
    }
    const dbPath = path$6.join(dbFolder, "clipboard.db");
    log.info("[数据库进程] 数据文件存储位置：", dbPath);
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
    log.info("[数据库进程] 初始化数据库表开始");
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
    this.db.exec(`
                    CREATE TABLE IF NOT EXISTS tags (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        name TEXT NOT NULL UNIQUE,
                        color TEXT,
                        created_at INTEGER NOT NULL
                    )
                `);
    this.db.exec(`
                    CREATE TABLE IF NOT EXISTS item_tags (
                        item_id INTEGER,
                        tag_id INTEGER,
                        FOREIGN KEY (item_id) REFERENCES clipboard_items (id) ON DELETE CASCADE,
                        FOREIGN KEY (tag_id) REFERENCES tags (id) ON DELETE CASCADE,
                        PRIMARY KEY (item_id, tag_id)
                    )
                `);
    log.info("[数据库进程] 初始化数据库表完成");
  }
  close() {
    this.db.close();
  }
  addItem(content, type = "text", filePath = null) {
    log.info("[数据库进程] 剪贴板内容添加开始", [content, type, filePath]);
    try {
      let copyTime = Date.now();
      log.info("[数据库进程] 设置初始复制时间:", copyTime);
      try {
        this.db.transaction(() => {
          log.info("[数据库进程] 事务开始");
          if (type === "text") {
            log.info("[数据库进程] 删除相同文本内容的旧记录");
            this.db.prepare("DELETE FROM clipboard_items WHERE content = ? AND type = ?").run(content, type);
          } else if (type === "image" && filePath) {
            log.info("[数据库进程] 查询相同图片路径的记录");
            const row = this.db.prepare("SELECT copy_time FROM clipboard_items WHERE type = ? AND file_path = ?").get("image", filePath);
            if (row) {
              copyTime = row.copy_time;
              log.info("[数据库进程] 找到相同图片路径记录，使用原复制时间:", copyTime);
            }
            log.info("[数据库进程] 删除相同图片路径的旧记录");
            this.db.prepare("DELETE FROM clipboard_items WHERE type = ? AND file_path = ?").run("image", filePath);
          }
          log.info("[数据库进程] 准备插入新的剪贴板记录");
          this.db.prepare("INSERT INTO clipboard_items (content, copy_time, type, file_path) VALUES (?, ?, ?, ?)").run(content, copyTime, type, filePath);
          log.info("[数据库进程] 事务执行完成");
        })();
        log.info("[数据库进程] 事务提交成功");
      } catch (txError) {
        log.error("[数据库进程] 事务执行失败", txError);
        throw txError;
      }
      log.info("[数据库进程] 剪贴板内容添加成功");
    } catch (err) {
      log.error("[数据库进程] 剪贴板内容添加失败", err);
      throw err;
    } finally {
      log.info("[数据库进程] 剪贴板内容添加完成");
    }
  }
  getAllItems() {
    return this.db.prepare("SELECT * FROM clipboard_items ORDER BY is_topped DESC, CASE WHEN is_topped = 1 THEN top_time ELSE copy_time END DESC").all();
  }
  getItemsByTag(tagName) {
    return this.db.prepare("SELECT ci.* FROM clipboard_items ci INNER JOIN item_tags it ON ci.id = it.item_id INNER JOIN tags t ON it.tag_id = t.id WHERE t.name = ? ORDER BY ci.is_topped DESC, CASE WHEN ci.is_topped = 1 THEN ci.top_time ELSE ci.copy_time END DESC").all(tagName);
  }
  deleteItem(id) {
    try {
      const row = this.db.prepare("SELECT type, file_path FROM clipboard_items WHERE id = ?").get(id);
      console.log("[数据库进程] 要删除的项目信息:", row);
      if (row && row.type === "image" && row.file_path) {
        try {
          fs$5.unlinkSync(row.file_path);
        } catch (unlinkError) {
          console.error("删除临时图片文件失败:", unlinkError);
        }
      }
      this.db.prepare("DELETE FROM clipboard_items WHERE id = ?").run(id);
      log.info("[数据库进程] 剪贴板内容删除成功");
    } catch (err) {
      throw err;
    }
  }
  clearAll() {
    return new Promise(async (resolve, reject) => {
      try {
        let configDir;
        if (env$2 === "development") {
          configDir = path$6.join(__dirname$3, "../config");
        } else {
          configDir = path$6.join(__dirname$3, "./config");
        }
        log.info("[数据库进程] 配置文件目录:", configDir);
        const configPath = path$6.join(configDir, "settings.conf");
        log.info("[数据库进程] 配置文件路径:", configPath);
        const config2 = JSON.parse(fs$5.readFileSync(configPath, "utf8"));
        log.info("[数据库进程] 读取到的配置:", config2);
        const tempDir = config2.tempPath;
        log.info("[数据库进程] 正在获取所有图片记录...");
        const rows = this.db.prepare("SELECT type, file_path FROM clipboard_items WHERE type = ?").all("image");
        log.info("[数据库进程] 开始删除图片文件...");
        for (const row of rows) {
          if (row.file_path) {
            try {
              fs$5.unlinkSync(row.file_path);
              log.info(`[数据库进程] 成功删除图片文件: ${row.file_path}`);
            } catch (unlinkError) {
              console.error(`[数据库进程] 删除图片文件失败: ${row.file_path}`, unlinkError);
            }
          }
        }
        log.info("[数据库进程] 正在清空数据库记录...");
        this.db.prepare("DELETE FROM clipboard_items").run();
        if (!fs$5.existsSync(tempDir)) {
          log.info("[数据库进程] 正在创建临时目录...");
          fs$5.mkdirSync(tempDir, { recursive: true, mode: 511 });
          log.info("[数据库进程] 临时目录创建成功");
        }
        log.info("[数据库进程] 剪贴板内容和临时文件清理完成");
        resolve();
      } catch (err) {
        console.error("[数据库进程] 清空剪贴板时发生错误:", err);
        reject(err);
      }
    });
  }
  toggleTop(id, isTopped) {
    this.db.prepare("UPDATE clipboard_items SET is_topped = ?, top_time = ? WHERE id = ?").run(isTopped ? 1 : 0, isTopped ? Date.now() : null, id);
  }
  /**
   * 搜索剪贴板内容
   * @param content 复制内容 
   * @param tagId 标签id
   * @returns 剪贴板内容列表
   */
  searchItems(content, tagId) {
    log.info("[数据库进程] 搜索剪贴板内容", [content, tagId]);
    let sql = "SELECT DISTINCT ci.* FROM clipboard_items ci";
    const params = [];
    if (tagId && tagId !== null) {
      sql += " INNER JOIN item_tags it ON ci.id = it.item_id INNER JOIN tags t ON it.tag_id = t.id WHERE t.id = ? AND ci.content LIKE ?";
      params.push(`%${tagId}%`);
    }
    if (content && content !== null && content !== "") {
      sql += " WHERE content LIKE ?";
      params.push(`%${content}%`);
    }
    sql += " ORDER BY ci.is_topped DESC, CASE WHEN ci.is_topped = 1 THEN ci.top_time ELSE ci.copy_time END DESC";
    log.info("[数据库进程] 搜索SQL:", sql);
    return this.db.prepare(sql).all(params);
  }
  updateItemTime(id, newTime) {
    this.db.prepare("UPDATE clipboard_items SET copy_time = ? WHERE id = ?").run(newTime, id);
  }
  // 标签相关的方法
  addTag(name, color) {
    this.db.prepare("INSERT INTO tags (name, color, created_at) VALUES (?, ?, ?)").run(name, color, Date.now());
  }
  deleteTag(id) {
    this.db.prepare("DELETE FROM tags WHERE id = ?").run(id);
  }
  getAllTags() {
    return this.db.prepare("SELECT * FROM tags ORDER BY created_at ASC").all();
  }
  addItemTag(itemId, tagId) {
    this.db.prepare("INSERT INTO item_tags (item_id, tag_id) VALUES (?, ?)").run(itemId, tagId);
  }
  removeItemTag(itemId, tagId) {
    this.db.prepare("DELETE FROM item_tags WHERE item_id = ? AND tag_id = ?").run(itemId, tagId);
  }
  getItemTags(itemId) {
    return this.db.prepare("SELECT t.* FROM tags t INNER JOIN item_tags it ON t.id = it.tag_id WHERE it.item_id = ?").all(itemId);
  }
  bindItemToTag(itemId, tagName) {
    const tag = this.db.prepare("SELECT id FROM tags WHERE name = ?").get(tagName);
    if (!tag) {
      throw new Error("标签不存在");
    }
    const bindInfo = this.db.prepare("SELECT * FROM item_tags WHERE item_id = ? AND tag_id = ?").get(itemId, tag.id);
    if (bindInfo) {
      log.info("[数据库进程] 标签已绑定");
      return;
    }
    this.db.prepare("INSERT OR IGNORE INTO item_tags (item_id, tag_id) VALUES (?, ?)").run(itemId, tag.id);
  }
};
__publicField(_ClipboardDB, "instance");
let ClipboardDB = _ClipboardDB;
let __dirname$2 = path$6.dirname(node_url.fileURLToPath(typeof document === "undefined" ? require("url").pathToFileURL(__filename).href : _documentCurrentScript && _documentCurrentScript.tagName.toUpperCase() === "SCRIPT" && _documentCurrentScript.src || new URL("main.js", document.baseURI).href));
log.info("[配置文件] 程序文件夹位置", __dirname$2);
const env$1 = process.env.NODE_ENV;
log.info("[配置文件] 运行环境：", process.env.NODE_ENV);
if (env$1 !== "development") {
  __dirname$2 = __dirname$2.replace("\\app.asar\\dist-electron", "");
}
function getConfig() {
  const configPath = getConfigPath();
  const config2 = JSON.parse(fs$5.readFileSync(configPath, "utf8"));
  log.info("[配置文件] 读取到的配置:", config2);
  return config2;
}
function updateConfig(config2) {
  const configPath = getConfigPath();
  fs$5.writeFileSync(configPath, JSON.stringify(config2, null, 4));
}
function getConfigPath() {
  let configDir;
  if (env$1 === "development") {
    configDir = path$6.join(__dirname$2, "../config");
  } else {
    configDir = path$6.join(__dirname$2, "./config");
  }
  log.info("[配置文件] 配置文件目录:", configDir);
  const configPath = path$6.join(configDir, "settings.conf");
  console.log("[配置文件] 配置文件路径:", configPath);
  return configPath;
}
let __dirname$1 = path$6.dirname(node_url.fileURLToPath(typeof document === "undefined" ? require("url").pathToFileURL(__filename).href : _documentCurrentScript && _documentCurrentScript.tagName.toUpperCase() === "SCRIPT" && _documentCurrentScript.src || new URL("main.js", document.baseURI).href));
log.info("[主进程] 程序文件夹位置", __dirname$1);
process.env.APP_ROOT = path$6.join(__dirname$1, "..");
const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
const MAIN_DIST = path$6.join(process.env.APP_ROOT, "dist-electron");
const RENDERER_DIST = path$6.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path$6.join(process.env.APP_ROOT, "public") : RENDERER_DIST;
const env = process.env.NODE_ENV;
log.info("[主进程] 运行环境：", process.env.NODE_ENV);
if (env !== "development") {
  __dirname$1 = __dirname$1.replace("\\app.asar\\dist-electron", "");
}
let win;
const config = getConfig();
function createMainWindow() {
  win = new require$$0$5.BrowserWindow({
    icon: path$6.join(process.env.VITE_PUBLIC, "electron-vite.svg"),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: true,
      preload: path$6.join(path$6.dirname(node_url.fileURLToPath(typeof document === "undefined" ? require("url").pathToFileURL(__filename).href : _documentCurrentScript && _documentCurrentScript.tagName.toUpperCase() === "SCRIPT" && _documentCurrentScript.src || new URL("main.js", document.baseURI).href)), "preload.mjs")
    }
  });
  const savedTheme = config.theme || "light";
  log.info("[主进程] 读取到的主题配置:", savedTheme);
  win.webContents.on("did-finish-load", () => {
    win == null ? void 0 : win.webContents.send("main-process-message", (/* @__PURE__ */ new Date()).toLocaleString());
    log.info("[主进程] 发送主题设置到渲染进程");
    win == null ? void 0 : win.webContents.send("init-themes", savedTheme);
    log.info("[主进程] 发送标签列表到渲染进程");
    const db = ClipboardDB.getInstance();
    const tags = db.getAllTags();
    win == null ? void 0 : win.webContents.send("load-tag-items", tags);
    log.info("[主进程] 窗口加载完成，开始监听剪贴板");
    watchClipboard();
  });
  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path$6.join(RENDERER_DIST, "index.html"));
  }
  win.webContents.openDevTools({ mode: "detach" });
  win.on("closed", () => {
    if (clipboardTimer) {
      clearTimeout(clipboardTimer);
      clipboardTimer = null;
    }
  });
}
require$$0$5.ipcMain.handle("clear-items", async () => {
  const db = ClipboardDB.getInstance();
  db.clearAll();
  return true;
});
require$$0$5.ipcMain.handle("search-items", async (_event, query, tagId) => {
  log.info("[主进程] 搜索剪贴板列表", query, tagId);
  const db = ClipboardDB.getInstance();
  return db.searchItems(query, tagId);
});
require$$0$5.ipcMain.handle("update-themes", async (_event, theme) => {
  log.info("[主进程] 更新主题", theme);
  config.theme = theme;
  updateConfig(config);
  return true;
});
require$$0$5.ipcMain.handle("top-item", async (_event, id) => {
  log.info("[主进程] 剪贴板内容置顶", id);
  const db = ClipboardDB.getInstance();
  db.toggleTop(id, true);
});
require$$0$5.ipcMain.handle("untop-item", async (_event, id) => {
  log.info("[主进程] 剪贴板内容取消置顶", id);
  const db = ClipboardDB.getInstance();
  db.toggleTop(id, false);
});
require$$0$5.ipcMain.handle("remove-item", async (_event, id) => {
  log.info("[主进程] 剪贴板内容删除", id);
  const db = ClipboardDB.getInstance();
  db.deleteItem(id);
});
require$$0$5.ipcMain.handle("add-tag", async (_event, name, color) => {
  log.info("[主进程] 标签添加", name, color);
  const db = ClipboardDB.getInstance();
  db.addTag(name, color);
  const tags = db.getAllTags();
  win == null ? void 0 : win.webContents.send("load-tag-items", tags);
});
require$$0$5.app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    require$$0$5.app.quit();
    win = null;
  }
});
const gotTheLock = require$$0$5.app.requestSingleInstanceLock();
if (!gotTheLock) {
  require$$0$5.app.quit();
} else {
  require$$0$5.app.whenReady().then(() => {
    createMainWindow();
    require$$0$5.app.on("activate", () => {
      if (require$$0$5.BrowserWindow.getAllWindows().length === 0) {
        createMainWindow();
      }
    });
  });
}
require$$0$5.app.on("window-all-closed", () => {
  if (process.platform === "darwin") {
    log.info("[主进程] 关闭程序");
    require$$0$5.app.quit();
  }
});
let lastText = require$$0$5.clipboard.readText();
let lastImage = require$$0$5.clipboard.readImage().isEmpty() ? null : require$$0$5.clipboard.readImage().toPNG();
let clipboardTimer = null;
function watchClipboard() {
  if (!win || win.isDestroyed() || !win.webContents || win.webContents.isDestroyed()) {
    log.info("[主进程] 窗口或渲染进程不可用，跳过剪贴板检查");
    return;
  }
  try {
    const currentText = require$$0$5.clipboard.readText();
    const currentFiles = require$$0$5.clipboard.readBuffer("FileNameW");
    const currentImage = require$$0$5.clipboard.readImage();
    if (!currentImage.isEmpty()) {
      const currentImageBuffer = currentImage.toPNG();
      const isImageChanged = lastImage !== null && Buffer.compare(currentImageBuffer, lastImage) !== 0;
      if (isImageChanged) {
        log.info("[主进程] 检测到剪贴板中有图片");
        log.info("[主进程] 检测到新的图片内容");
        lastImage = currentImageBuffer;
        const timestamp = Date.now();
        const tempDir = path$6.join(config.tempPath || path$6.join(__dirname$1, "temp"));
        let existingImagePath = null;
        if (fs$5.existsSync(tempDir)) {
          const files = fs$5.readdirSync(tempDir);
          for (const file2 of files) {
            if (file2.endsWith(".png")) {
              const filePath = path$6.join(tempDir, file2);
              const fileContent = fs$5.readFileSync(filePath);
              if (Buffer.compare(fileContent, currentImageBuffer) === 0) {
                existingImagePath = filePath;
                break;
              }
            }
          }
        } else {
          fs$5.mkdirSync(tempDir, { recursive: true });
        }
        let imagePath;
        if (existingImagePath) {
          imagePath = existingImagePath;
          log.info("[主进程] 找到相同内容的图片文件:", imagePath);
        } else {
          imagePath = path$6.join(tempDir, `clipboard_${timestamp}.png`);
          fs$5.writeFileSync(imagePath, currentImageBuffer);
          log.info("[主进程] 图片已保存到临时目录:", imagePath);
        }
        if (win && !win.isDestroyed()) {
          const webContents = win.webContents;
          if (webContents && !webContents.isDestroyed()) {
            if (webContents.getProcessId() && !webContents.isLoading()) {
              try {
                log.info("[主进程] 准备发送图片信息到渲染进程");
                win.webContents.send("clipboard-file", {
                  name: path$6.basename(imagePath),
                  path: imagePath,
                  type: "image",
                  isNewImage: !existingImagePath
                  // 标记是否为新图片
                });
                log.info("[主进程] 图片信息已发送到渲染进程");
              } catch (error) {
                log.error("[主进程] 发送图片信息到渲染进程时出错:", error);
                if (!existingImagePath) {
                  try {
                    fs$5.unlinkSync(imagePath);
                  } catch (unlinkError) {
                    log.error("[主进程] 清理临时文件时出错:", unlinkError);
                  }
                }
              }
            }
          } else if (!existingImagePath) {
            try {
              fs$5.unlinkSync(imagePath);
            } catch (unlinkError) {
              log.error("[主进程] 清理临时文件时出错:", unlinkError);
            }
          }
        }
      }
    }
    if (currentText && currentText !== lastText) {
      lastText = currentText;
      const db = ClipboardDB.getInstance();
      db.addItem(currentText, "text", null);
      if (win && !win.isDestroyed()) {
        try {
          const webContents = win.webContents;
          if (webContents && !webContents.isDestroyed()) {
            webContents.send("clipboard-updated", currentText);
          }
        } catch (error) {
          log.error("[主进程] 发送文本消息时出错:", error);
        }
      }
    }
    if (currentFiles && currentFiles.length > 0) {
      try {
        const filesString = currentFiles.toString("utf16le").replace(/\x00/g, "");
        const files = filesString.split("\r\n").filter(Boolean);
        if (win && !win.isDestroyed()) {
          const webContents = win.webContents;
          if (webContents && !webContents.isDestroyed()) {
            files.forEach((filePath) => {
              const fileName = path$6.basename(filePath);
              webContents.send("clipboard-file", {
                name: fileName,
                path: filePath,
                type: "file"
              });
            });
          }
        }
      } catch (error) {
        log.error("[主进程] 处理剪贴板文件时出错:", error);
      }
    }
  } catch (error) {
    log.error("[主进程] 检查剪贴板时出错:", error);
  }
  clipboardTimer = setTimeout(watchClipboard, 100);
}
exports.MAIN_DIST = MAIN_DIST;
exports.RENDERER_DIST = RENDERER_DIST;
exports.VITE_DEV_SERVER_URL = VITE_DEV_SERVER_URL;

# 剪贴板工具

一个基于 Electron + Vue 3 + TypeScript 开发的现代化剪贴板管理工具，帮助您高效管理和使用剪贴板内容。

## 功能特点

- **剪贴板历史记录**：自动保存剪贴板历史，随时查看和使用之前复制的内容
- **多语言支持**：支持中文和英文界面，满足不同用户的需求
- **主题切换**：内置多种主题，可根据个人喜好进行切换
- **快捷键支持**：通过自定义快捷键，快速唤醒应用和搜索内容
- **标签管理**：对剪贴板内容进行分类和标记，便于整理和查找
- **自定义设置**：灵活配置窗口大小、存储限制、自动清理等功能

## 安装说明

### 环境要求

- Node.js 16.x 或更高版本
- npm 或 yarn 包管理器

### 开发环境搭建

1. 克隆仓库到本地

```bash
git clone https://github.com/lin0306/clipboard-vue
cd clipboard
```

2. 安装依赖

```bash
npm install
# 或
yarn
```

3. 启动开发服务器

```bash
npm run dev
# 或
yarn dev
```

### 构建应用

```bash
npm run build
# 或
yarn build
```

构建完成后，可在 `build` 目录找到打包好的应用程序。

## 使用指南

### 基本操作

- 启动应用后，它会自动在后台运行并监控剪贴板内容
- 通过系统托盘图标或快捷键可以快速打开主界面
- 在主界面可以查看、搜索和使用剪贴板历史记录

### 设置说明

在设置界面，您可以配置以下选项：

- **通用设置**：主题、窗口大小、开机自启动、语言等
- **存储设置**：历史记录数量限制、存储大小限制、自动清理天数等
- **快捷键设置**：自定义唤醒和搜索快捷键

## 技术栈

- **前端框架**：Vue 3 + TypeScript
- **构建工具**：Vite
- **桌面应用框架**：Electron
- **UI 组件库**：Ant Design Vue
- **数据存储**：SQLite (better-sqlite3)

## 开发相关

### TypeScript 支持

TypeScript 默认无法处理 `.vue` 导入的类型信息，因此我们使用 `vue-tsc` 进行类型检查。在编辑器中，需要 [TypeScript Vue Plugin (Volar)](https://marketplace.visualstudio.com/items?itemName=Vue.vscode-typescript-vue-plugin) 使 TypeScript 语言服务能够识别 `.vue` 类型。

### 推荐的 IDE 设置

- [VS Code](https://code.visualstudio.com/) + [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) (并禁用 Vetur) + [TypeScript Vue Plugin (Volar)](https://marketplace.visualstudio.com/items?itemName=Vue.vscode-typescript-vue-plugin)

## 许可证

[LICENSE.txt](./LICENSE.txt) 文件中查看许可证信息。

# 发布指南

## 使用GitHub Actions自动发布

本项目已配置GitHub Actions工作流，可以自动构建和发布应用程序。当你推送一个新的标签（tag）时，GitHub Actions将自动触发构建和发布流程。

### 发布步骤

1. 确保你的代码已经准备好发布

2. 更新`package.json`中的版本号

   ```json
   {
     "version": "x.x.x"
   }
   ```

3. 提交你的更改

   ```bash
   git add .
   git commit -m "准备发布 vx.x.x"
   ```

4. 创建一个新的标签并推送

   ```bash
   git tag vx.x.x
   git push origin vx.x.x
   ```

5. 推送代码更改

   ```bash
   git push
   ```

6. GitHub Actions将自动构建应用并创建一个新的发布

   - 构建过程将生成Windows和macOS的安装包
   - 发布将自动包含这些安装包
   - 你可以在GitHub仓库的Releases页面查看发布状态

7. 删除标签

   ```bash
   git tag -d vx.x.x
   git push origin --delete vx.x.x
   ```

## 手动构建

如果你想在本地构建应用，可以使用以下命令：

```bash
npm run build
```

构建完成后，你可以在`release`目录下找到构建好的安装包。

## 注意事项

- 确保`package.json`中的`build.publish`配置正确指向你的GitHub仓库
- 确保GitHub仓库有正确的权限设置，以便GitHub Actions可以创建发布
- 如果你更改了应用名称或ID，记得同时更新`package.json`中的相关配置
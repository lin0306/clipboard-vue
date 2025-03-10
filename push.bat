@echo off
setlocal enabledelayedexpansion

:: 设置默认的commit消息
set "commit_msg=项目代码更新"

:: 解析命令行参数
:parse_args
if "%~1"=="-m" (
    if not "%~2"=="" (
        set "commit_msg=%~2"
        shift
    )
    shift
    goto parse_args
)

:: 执行git命令
echo 正在添加文件...
git add .

echo 正在提交更改...
git commit -m "%commit_msg%"

echo 正在推送到远程仓库...
git push

if %errorlevel% neq 0 (
    echo 推送过程中发生错误！
    exit /b 1
)

echo 推送完成！
exit /b 0
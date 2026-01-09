# 版本发布提交

## 执行步骤

### 1. 查看当前变更
- 运行 `git status` 查看有哪些文件被修改
- 运行 `git diff` 查看具体的代码变更内容
- 分析变更内容，理解本次更新做了什么

### 2. 更新 UPDATE_LOG.md
- 调用 `/update-log` skill 更新日志
- 版本号：如果用户指定了版本号（见下方参数），使用指定的；否则自动递增补丁版本

### 3. 同步 package.json 版本号
- 确保 package.json 中的 version 字段与更新日志版本一致

### 4. Git 提交
- `git add .` 添加所有变更
- `git commit -m "chore: 更新版本号到 vX.Y.Z 并更新更新日志"` 提交代码

### 5. 创建 Git Tag
- `git tag vX.Y.Z` 创建版本标签

### 6. 推送到远程
- `git push origin main` 推送代码
- `git push origin vX.Y.Z` 推送标签

## 参数
版本号: $ARGUMENTS

如果参数为空，则自动递增补丁版本。

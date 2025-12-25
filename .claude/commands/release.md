# 版本发布提交

请严格按照 UPDATE_LOG_RULE.md 的规则执行版本发布流程。

## 执行步骤

### 1. 查看当前变更
- 运行 `git status` 查看有哪些文件被修改
- 运行 `git diff` 查看具体的代码变更内容
- 分析变更内容，理解本次更新做了什么

### 2. 确定版本号
- 如果用户指定了版本号（见下方参数），使用指定的版本号
- 如果未指定，读取 package.json 当前版本，递增补丁版本（+0.0.1）

### 3. 更新 UPDATE_LOG.md
- 读取 UPDATE_LOG_RULE.md 确认格式要求
- 读取 UPDATE_LOG.md 前 15 行找到插入位置
- 在 `## 历史更新记录（AI 插入从此处开始）` 之后插入新版本记录
- 更新文件头部的 `*最后更新: YYYY-MM-DD*` 字段
- 字段结构按需使用：重大更新、新增功能、技术改进、问题修复、效果提升、文档更新
- 添加 `**更新者**: Claude` 标记

### 4. 同步 package.json 版本号
- 确保 package.json 中的 version 字段与更新日志版本一致

### 5. Git 提交
- `git add .` 添加所有变更
- `git commit -m "chore: 更新版本号到 vX.Y.Z 并更新更新日志"` 提交代码

### 6. 创建 Git Tag
- `git tag vX.Y.Z` 创建版本标签

### 7. 推送到远程
- `git push origin main` 推送代码
- `git push origin vX.Y.Z` 推送标签

## 注意事项
- 描述应客观准确，避免主观词汇
- 每条记录简洁明了，分类准确
- 确保覆盖所有重要变更，不遗漏

## 参数
版本号: $ARGUMENTS

如果参数为空，则自动递增补丁版本。

# UPDATE_LOG.md 更新规则

本仓库把主要前端实现拆分到私有子仓 `invoice-server/`。因此当需要发布新版本、更新日志或修订“版本号展示”时，请优先遵循以下规则。

## 1. 版本号来源

- 实际的应用版本号以 `invoice-server/package.json` 中的 `version` 为准。
- Vite 构建时会通过 `invoice-server/vite.config.ts` 注入 `__APP_VERSION__`，页面显示的版本号来自该常量。

## 2. 更新步骤（发布新版本）

1. 在子仓 `invoice-server/` 内修改：
   - `invoice-server/package.json`：把 `version` 更新为新版本号（例如 `v0.6.11` 对应 `0.6.11`）。
2. 在父仓 `invoice-pdf-printer/` 内修改：
   - `UPDATE_LOG.md`：在 “历史更新记录（AI 插入从此处开始）” 前插入新的版本段落，并更新顶部 `> 最后更新:` 日期。
3. 提交并推送：
   - 子仓 `invoice-server/` 推送完成后，在父仓提交 `invoice-server` 子模块指针更新。
4. 打版本 tag：
   - 父仓打 `v*` tag 并 push（触发 GitHub Actions 自动部署 Web）。

## 3. 日志内容建议

- 只记录用户可感知或部署相关的变更（构建/发布流程修复也应写入）。
- 对“CI/部署失败”的修复，需要写清楚关键原因与对应技术手段（例如 corepack 安装 pnpm、修复 pnpm-lock tarball 地址、子模块拉取鉴权等）。

## 4. 禁止项

- 不要手动改写 `UPDATE_LOG.md` 里已存在的旧版本历史正文（除非你明确要追溯式修订，且会带来不可逆的历史变化）。


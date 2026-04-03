# 发布与构建记录

## 2026-04-03（Web 部署成功）

本次发布主要完成了“公开壳仓 + 私有子仓”的拆分落地，并修复 CI 构建失败问题。最终结果是：GitHub Actions 在构建 Web 时已成功，速度明显提升。

关键变更：

- GitHub Actions：
  - 使用 `actions/checkout` 拉取子模块，并通过 `SUBMODULE_TOKEN`（或 `GITHUB_TOKEN`）确保 CI 能访问私有仓 `invoice-server`
  - 在 `setup-node` 后启用 `corepack`，显式安装/激活 `pnpm`，避免 `spawn pnpm ENOENT`
  - 在构建前临时重写 `invoice-server/pnpm-lock.yaml` 中内网 tarball 镜像地址（`http://120.79.94.153:4873/`）为 `https://registry.npmjs.org/`，解决大量 `ERR_SOCKET_TIMEOUT`
- 版本号显示：
  - 应用运行时显示版本号来自 `invoice-server/package.json`，由 `invoice-server/vite.config.ts` 注入 `__APP_VERSION__`


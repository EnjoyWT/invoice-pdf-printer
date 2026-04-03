#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

if [ ! -d "$ROOT_DIR/invoice-server" ]; then
  echo "未找到子模块目录: invoice-server"
  exit 1
fi

# 确保子模块内容可用（私有仓可能需要你本机已配置对应 SSH key/权限）
git submodule update --init --recursive

if ! command -v pnpm >/dev/null 2>&1; then
  echo "未检测到 pnpm，请先安装：corepack enable && corepack prepare pnpm@latest --activate"
  exit 1
fi

cd "$ROOT_DIR/invoice-server"

# 仅在缺少依赖时才安装，避免每次启动都等待安装
if [ ! -d "node_modules" ]; then
  pnpm install
fi

pnpm dev


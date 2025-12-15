# 发票打印助手

纯前端的发票打印与合并工具，支持大批量处理，兼顾桌面与移动端。

## 截图

<p align="center">
  <img src="https://github.com/EnjoyWT/invoice-pdf-printer/blob/main/public/0.5.0.png" width="889" height="448" />
</p>

## 特性

- 发票导入（含多文件追加/拖拽上传），多尺寸自动合并，默认 A4 双联排版
- 批量删除/确认，列表状态清晰可视化
- 统计数据与金额展示，直接打印
- 智能 PDF 布局与多策略 OCR 提取，提升识别与排版质量
- 兼容多种日期与发票类型，前端即可完成处理
- 移动端响应式适配，桌面与移动体验一致
- TypeScript 技术栈与 OCR 性能优化，前端侧完成识别与处理

## 快速开始

```bash
pnpm install
pnpm dev                 # 开发：默认 http://localhost:5173
pnpm build && pnpm preview  # 预览：默认 http://localhost:4173
```

## 部署

[![Deploy to Vercel](https://vercel.com/button)](https://vercel.com/import/project?template=https://github.com/EnjoyWT/invoice-pdf-printer)

## 说明

- 仓库由 AI 生成并经人工校准
- 日志与规则：见 [UPDATE_LOG.md](./UPDATE_LOG.md) 与 [UPDATE_LOG_RULE.md](./UPDATE_LOG_RULE.md)

## TODO

- 支持更多打印布局（低优先）

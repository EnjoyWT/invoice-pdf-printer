---
name: pdf-merge
description: 合并多张电子发票 PDF 为一个文件，支持 A4 双联排版，可选提取金额信息
---

# 发票 PDF 合并工具

将多张电子发票 PDF 合并成一个文件，采用 A4 双联排版（每页放 2 张发票），可选提取发票金额等信息。

## 适用场景

- 用户需要合并多张发票 PDF
- 用户需要打印发票（双联排版节省纸张）
- 用户需要统计发票总金额

## 函数签名

```typescript
interface MergeInvoicesOptions {
  inputPaths: string[]; // 必须：发票 PDF 文件路径数组
  outputPath?: string; // 可选：输出路径，默认生成临时路径
  extractAmount?: boolean; // 可选：是否提取金额，默认 false
}

interface MergeInvoicesResult {
  outputPath: string; // 合并后的 PDF 路径
  invoices?: InvoiceInfo[]; // 发票信息（如果 extractAmount 为 true）
  totalAmount?: number; // 总金额（如果 extractAmount 为 true）
  totalPages: number; // 合并后的总页数
}

async function mergeInvoices(
  options: MergeInvoicesOptions,
): Promise<MergeInvoicesResult>;
```

## 使用方式

### 方式一：CLI 命令行

```bash
# 进入 skill 目录
cd .claude/skills/pdf-merge

# 安装依赖（首次使用）
npm install

# 基本合并
npx ts-node scripts/merge-invoices.ts invoice1.pdf invoice2.pdf

# 指定输出路径
npx ts-node scripts/merge-invoices.ts -o merged.pdf invoice1.pdf invoice2.pdf

# 提取金额信息
npx ts-node scripts/merge-invoices.ts -e invoice1.pdf invoice2.pdf

# 完整示例
npx ts-node scripts/merge-invoices.ts -o ~/Desktop/merged.pdf -e ~/invoices/*.pdf
```

### 方式二：作为模块导入

```typescript
import { mergeInvoices } from "./.claude/skills/pdf-merge/scripts/merge-invoices";

const result = await mergeInvoices({
  inputPaths: ["invoice1.pdf", "invoice2.pdf"],
  outputPath: "./merged.pdf",
  extractAmount: true,
});

console.log(result.outputPath); // 输出路径
console.log(result.totalAmount); // 总金额
console.log(result.invoices); // 各发票详情
```

## 输出示例

```json
{
  "outputPath": "/Users/xxx/merged-invoices-1704067200000.pdf",
  "totalPages": 2,
  "invoices": [
    {
      "pageNumber": 1,
      "fileName": "invoice1.pdf",
      "type": "增值税普通发票",
      "amount": "1234.56",
      "date": "2025-01-09",
      "number": "12345678"
    },
    {
      "pageNumber": 2,
      "fileName": "invoice2.pdf",
      "type": "电子普通发票",
      "amount": "789.00",
      "date": "2025-01-08",
      "number": "87654321"
    }
  ],
  "totalAmount": 2023.56
}
```

## 依赖

| 库        | 版本    | 用途           |
| --------- | ------- | -------------- |
| pdf-lib   | ^1.17.1 | PDF 合并、布局 |
| pdf-parse | ^1.1.1  | 提取 PDF 文本  |

## 限制

- 仅支持**电子发票**（文本型 PDF），不支持扫描件
- 每张发票取第一页
- 输出固定为 A4 双联排版

## 执行步骤

当用户请求合并发票时：

1. 确认用户提供的发票文件路径
2. 确认是否需要提取金额（默认否）
3. 确认输出路径（可选，默认生成临时路径）
4. 执行合并命令
5. 返回结果给用户

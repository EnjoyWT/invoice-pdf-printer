# 发票统计功能测试指南

## 功能概述
新增了发票处理数量统计功能，包括前端显示和后端API接口。

## 后端接口

### 1. 查询发票处理数量
- **URL**: `GET /api/stats/invoice-count`
- **功能**: 查询当前累计处理的发票数量
- **存储**: 使用KV数据库持久化存储
- **响应格式**:
```json
{
  "success": true,
  "data": {
    "totalCount": 123
  }
}
```

### 2. 更新发票处理数量
- **URL**: `POST /api/stats/invoice-count`
- **功能**: 累加发票处理数量
- **存储**: 使用KV数据库持久化存储
- **请求体**:
```json
{
  "count": 5
}
```
- **响应格式**:
```json
{
  "success": true,
  "message": "Invoice count updated successfully",
  "data": {
    "addedCount": 5,
    "totalCount": 128
  }
}
```

### 3. 重置发票处理数量（管理用）
- **URL**: `DELETE /api/stats/invoice-count`
- **功能**: 重置发票处理数量为0
- **存储**: 使用KV数据库持久化存储
- **响应格式**:
```json
{
  "success": true,
  "message": "Invoice count reset successfully",
  "data": {
    "totalCount": 0
  }
}
```

## 前端功能

### 1. 页面初始化
- 页面加载时自动调用查询接口
- 成功时在左上角显示累计处理数量
- 失败时不显示统计标签

### 2. 发票处理完成后
- 自动调用更新接口，累加本次处理的发票数量
- 更新显示的总数量
- 如果接口调用失败，不影响主要功能

### 3. 错误处理
- 网络请求失败时，统计标签不显示
- 不影响发票处理的主要功能
- 错误信息会在控制台输出

## 测试步骤

### 1. 启动后端服务
```bash
cd /Users/sh/Desktop/sidework/cf-auth-system/auth-worker
npm start
# 或
wrangler dev
```

### 2. 启动前端服务
```bash
cd /Users/sh/Desktop/sidework/invoice-pdf-printer
npm run dev
```

### 3. 测试流程
1. 打开前端页面，查看左上角是否显示统计信息
2. 上传PDF文件进行处理
3. 处理完成后，查看统计数量是否更新
4. 刷新页面，确认统计数量持久化

### 4. API测试
可以使用curl命令测试API：

```bash
# 查询当前数量
curl https://auth.yoloxy.com/api/stats/invoice-count

# 增加5张发票
curl -X POST https://auth.yoloxy.com/api/stats/invoice-count \
  -H "Content-Type: application/json" \
  -d '{"count": 5}'

# 重置数量（管理用）
curl -X DELETE https://auth.yoloxy.com/api/stats/invoice-count
```

## 配置说明

### 前端API地址配置
在 `src/views/Home.vue` 中修改 `API_BASE_URL` 常量：
```typescript
const API_BASE_URL = 'http://localhost:8787'; // 根据实际部署地址调整
```

### 后端数据存储
使用KV数据库持久化存储，数据在服务重启后仍然保持。KV键为 `stats:invoice_count`。

## 注意事项
1. 确保后端服务正常运行
2. 检查CORS配置是否允许前端域名访问
3. 生产环境需要配置正确的API地址
4. 建议添加数据库持久化存储

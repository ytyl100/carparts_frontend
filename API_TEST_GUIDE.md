# Car Parts Search API 测试指南

## 功能概述

SearchParts 页面实现了完整的零件搜索功能，包括：
- ✅ 关键词搜索 (支持标准名称、原始名称、OE号、零件号)
- ✅ 按分类搜索
- ✅ 按品牌过滤
- ✅ 动态排序 (支持所有列快速排序)
- ✅ CSV 导出 (包含所有数据字段)
- ✅ 打印功能
- ✅ 详情模态框查看
- ✅ 加入采购单

## 数据结构

### 表格列 (按顺序)
| 列名 | 字段 | 来源 | 备注 |
|------|------|------|------|
| CarModel | carModel | Part | 车型 (如 "A05 2025") |
| OeNumber | oeNumber | Part | OE号 (如 "C589F271301-1202") |
| PartsNumber | partsNumber | Part | 零件号 (如 "2803101-DY21") |
| OriginalName | originalName | Part | 原始名称 (如 "前保险杠 白色") |
| Quantity | quantity | Part | 数量 |
| UNIT | unit | PriceRecord[0] | 单位 (如 "件", "pcs", "个") |
| CostInclTax | costInclTax | PriceRecord[0] | 含税价格 (¥) |
| Model | model | Part | 型号 |
| Brand | brand | Part | 品牌 |

## API 端点

### 搜索零件
```
GET /api/CarParts/search?term=<search_term>
```

**请求头:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**查询参数:**
- `term`: 搜索关键词 (必填)

**示例 cURL:**
```bash
curl -X 'GET' \
  'http://localhost:5017/api/CarParts/search?term=8407120' \
  -H 'accept: application/json' \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJodHRwOi8vc2NoZW1hcy54bWxzb2FwLm9yZy93cy8yMDA1LzA1L2lkZW50aXR5L2NsYWltcy9uYW1lIjoiVVNSMjAyMzEyMDEwMDAzIiwiaHR0cDovL3NjaGVtYXMueG1sc29hcC5vcmcvd3MvMjAwNS8wNS9pZGVudGl0eS9jbGFpbXMvbmFtZWlkZW50aWZpZXIiOiJVU1IyMDIzMTIwMTAwMDMiLCJqdGkiOiJhMjhhZDUzZS1iMDcyLTQxYjItYTk5ZC02MTc3M2RiMjYwMmMiLCJpYXQiOjE3ODAzODMwOTIsImh0dHA6Ly9zY2hlbWFzLm1pY3Jvc29mdC5jb20vd3MvMjAwOC8wNi9pZGVudGl0eS9jbGFpbXMvcm9sZSI6ImFkbWluIiwibmJmIjoxNzgwMzgzMDkyLCJleHAiOjE3ODA0Njk0OTIsImlzcyI6IkNoYXJnaW5nU3RhdGlvbkFQSSIsImF1ZCI6IkNoYXJnaW5nU3RhdGlvbkNsaWVudCJ9.sWGmhLuYwnwpZPyQiroxuNWJnRyD6I0ROfEnoM7CvE0'
```

**响应示例:**
```json
[
  {
    "id": "JL473ZQ100_p131",
    "subCategoryId": "Changan A05",
    "position": "",
    "partsNumber": "8407120-DY01",
    "oeNumber": "C589F270101-0500",
    "standardName": "前罩铰链总成（右）",
    "originalName": "前罩铰链总成（右）-Front hood hinge assembly (right)",
    "origin": "中国-China",
    "quantity": "20",
    "note": "",
    "date": "",
    "x": 1,
    "y": 7,
    "imageUrl": "",
    "brand": "长安",
    "model": "A05",
    "carModel": "A05 2025",
    "priceRecords": [
      {
        "brand": "长安",
        "manufacturer": "长安-浩驰",
        "description": "正厂/OEM",
        "costExclTax": 0,
        "costInclTax": 26,
        "saleExclTax": 0,
        "saleInclTax": 0,
        "unit": "pcs"
      }
    ],
    "replacementParts": [],
    "adaptableModels": [],
    "lastUpdated": "0001-01-01T00:00:00"
  }
]
```

## 前端实现详情

### SearchParts.tsx 功能列表

#### 1. 搜索功能
- **关键词搜索**: 通过输入框 + 搜索按钮，或按 `Enter` 键
- **分类搜索**: 选择分类下拉菜单
- **品牌过滤**: 选择品牌下拉菜单
- **错误处理**: 如果 API 不可用，自动降级到本地 Mock 数据搜索

#### 2. 排序功能
- 点击表头可按该列排序
- 支持升序 (↑) / 降序 (↓) 切换
- 支持排序的列:
  - CarModel
  - OeNumber
  - PartsNumber
  - OriginalName
  - Quantity
  - CostInclTax (数值排序)

#### 3. 导出功能
- **CSV 导出**: 导出表格数据为 CSV 文件
  - 文件名: `carparts-<timestamp>.csv`
  - 包含 BOM 标记确保 Excel 正确显示中文
  - 包含排序后的数据

#### 4. 打印功能
- 打印当前排序后的表格
- 自动生成 HTML 并打开打印对话框

#### 5. 详情查看
- 点击任何行或 "详情" 按钮可打开详情模态框
- 显示完整的零件信息及价格记录

#### 6. 采购单功能
- "加入采购单" 按钮可将选中零件加入购物车
- 自动传递价格记录信息

## 错误处理

### API 不可用时的行为
如果后端 API 不可用，SearchParts 会自动:
1. 捕捉 API 错误
2. 使用本地 `PARTS_MOCK` 数据进行搜索
3. 在控制台输出错误信息便于调试

## 测试步骤

### 前置条件
1. 用户已登录
2. 后端 API 服务正在运行 (http://localhost:5017/api)
3. 用户拥有有效的认证 Token

### 测试流程
1. 导航到 SearchParts 页面
2. 在搜索框输入关键词 (如 "8407120")
3. 按 `Enter` 或点击 "搜索" 按钮
4. 验证表格数据正确显示所有列
5. 测试排序: 点击列头
6. 测试导出: 点击 "导出CSV" 按钮
7. 测试打印: 点击 "打印" 按钮
8. 测试详情: 点击任意行或 "详情" 按钮
9. 测试采购单: 点击 "加入采购单" 按钮

## 文件修改列表

### 1. `services/repositoryClient.ts`
- searchParts 方法已正确配置
- 使用 Bearer Token 认证
- 端点: `CarParts/search`

### 2. `components/SearchParts.tsx`
- 已添加所有表格列及排序功能
- 已实现 CSV 导出和打印功能
- 已改进错误处理和降级逻辑
- 已添加回车键支持搜索

### 3. `types.ts`
- Part 接口包含所有必要字段:
  - partsNumber
  - brand
  - model
  - carModel
  - origin
- PriceRecord 接口包含 unit 字段

## 常见问题

### Q: 搜索返回无结果？
A: 
- 确认搜索词正确
- 检查后端 API 是否返回数据
- 查看浏览器控制台是否有错误信息

### Q: 表格列显示不完整？
A: 
- 检查 Part 数据是否包含所有字段
- 后端返回的数据结构必须符合 API 文档

### Q: 导出的 CSV 在 Excel 中显示乱码？
A: 
- 已自动添加 BOM 标记 (UTF-8 with BOM)
- 在 Excel 中选择用 UTF-8 编码打开文件

### Q: Token 过期如何处理？
A: 
- 用户需要重新登录获取新 Token
- Token 自动存储在 localStorage
- repositoryClient 会自动读取并使用

## 性能注意事项

1. 大量数据搜索可能需要优化
2. 建议后端实现分页
3. CSV 导出大文件时可能耗时较长

## 安全性说明

1. Token 存储在 localStorage 中（可考虑更安全的存储方式）
2. 所有 API 请求自动附加 Token
3. 敏感信息（如价格数据）通过 API 安全传输

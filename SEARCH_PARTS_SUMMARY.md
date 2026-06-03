# SearchParts 功能总结

## ✅ 已实现功能

### 表格显示
- **9 个列**: CarModel | OeNumber | PartsNumber | OriginalName | Quantity | UNIT | CostInclTax | Model | Brand

### 搜索功能
- 输入关键词搜索（支持 Enter 键）
- 按分类搜索
- 按品牌过滤
- API 不可用时自动降级到本地数据

### 排序功能
点击任意列头快速排序：
- ↑ 升序
- ↓ 降序

### 导出功能
- 📄 CSV 导出（支持中文，自动生成时间戳文件名）
- 🖨️ 打印功能

### 详情功能
- 点击行或"详情"按钮查看完整信息
- 显示价格记录
- 加入采购单

## 📊 数据字段映射

```
后端返回字段          →  表格显示
───────────────────────────────────
carModel             →  CarModel
oeNumber             →  OeNumber  
partsNumber          →  PartsNumber
originalName         →  OriginalName
quantity             →  Quantity
priceRecords[0].unit →  UNIT
priceRecords[0].costInclTax → CostInclTax
model                →  Model
brand                →  Brand
```

## 🔐 认证

所有 API 请求自动包含:
```
Authorization: Bearer <token>
```

Token 从 localStorage 读取，登录时自动保存。

## 🚀 API 端点

```
GET /api/CarParts/search?term=<keyword>
```

**示例:**
```
GET /api/CarParts/search?term=8407120
```

## 📝 测试检查清单

- [ ] 输入关键词搜索
- [ ] 按 Enter 键搜索
- [ ] 选择分类搜索
- [ ] 按品牌过滤
- [ ] 点击列头排序
- [ ] 导出 CSV 文件
- [ ] 打印表格
- [ ] 点击详情查看完整信息
- [ ] 加入采购单
- [ ] 无搜索结果时显示"无结果"
- [ ] 搜索中显示加载状态

## 💾 文件变更

| 文件 | 变更 |
|------|------|
| `SearchParts.tsx` | 改进错误处理、添加 Enter 键支持 |
| `repositoryClient.ts` | API 方法已正确配置 |
| `types.ts` | Part 接口已包含所有字段 |

## ⚠️ 依赖条件

1. 用户已登录（获得 Token）
2. 后端 API 运行在 http://localhost:5017/api
3. 点击搜索前确保输入关键词或选择分类

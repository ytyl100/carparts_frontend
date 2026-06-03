// Test Script for SearchParts API Integration
// 使用方法: 在浏览器控制台中复制粘贴这个脚本

// 测试用 Token（示例）
const TEST_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJodHRwOi8vc2NoZW1hcy54bWxzb2FwLm9yZy93cy8yMDA1LzA1L2lkZW50aXR5L2NsYWltcy9uYW1lIjoiVVNSMjAyMzEyMDEwMDAzIiwiaHR0cDovL3NjaGVtYXMueG1sc29hcC5vcmcvd3MvMjAwNS8wNS9pZGVudGl0eS9jbGFpbXMvbmFtZWlkZW50aWZpZXIiOiJVU1IyMDIzMTIwMTAwMDMiLCJqdGkiOiJhMjhhZDUzZS1iMDcyLTQxYjItYTk5ZC02MTc3M2RiMjYwMmMiLCJpYXQiOjE3ODAzODMwOTIsImh0dHA6Ly9zY2hlbWFzLm1pY3Jvc29mdC5jb20vd3MvMjAwOC8wNi9pZGVudGl0eS9jbGFpbXMvcm9sZSI6ImFkbWluIiwibmJmIjoxNzgwMzgzMDkyLCJleHAiOjE3ODA0Njk0OTIsImlzcyI6IkNoYXJnaW5nU3RhdGlvbkFQSSIsImF1ZCI6IkNoYXJnaW5nU3RhdGlvbkNsaWVudCJ9.sWGmhLuYwnwpZPyQiroxuNWJnRyD6I0ROfEnoM7CvE0';

const API_BASE_URL = 'http://localhost:5017/api';

/**
 * 测试 1: 验证 API 连接
 */
async function testApiConnection() {
  console.log('🧪 测试 1: 验证 API 连接...\n');
  try {
    const response = await fetch(`${API_BASE_URL}/CarParts/search?term=8407120`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${TEST_TOKEN}`,
        'Accept': 'application/json'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ API 连接成功！');
      console.log(`📊 返回数据条数: ${data.length}`);
      if (data.length > 0) {
        console.log('📋 第一条数据示例:');
        console.table(data[0]);
      }
      return data;
    } else {
      console.error(`❌ API 返回错误: ${response.status} ${response.statusText}`);
      return null;
    }
  } catch (error) {
    console.error('❌ API 连接失败:', error.message);
    return null;
  }
}

/**
 * 测试 2: 验证数据字段
 */
async function testDataFields(data) {
  if (!data || data.length === 0) {
    console.log('⚠️ 无数据，跳过字段验证');
    return;
  }

  console.log('\n🧪 测试 2: 验证数据字段...\n');
  
  const requiredFields = [
    'carModel',
    'oeNumber',
    'partsNumber',
    'originalName',
    'quantity',
    'model',
    'brand'
  ];
  
  const firstItem = data[0];
  const priceRecord = firstItem.priceRecords?.[0];
  
  console.log('✅ 检查必要字段:');
  requiredFields.forEach(field => {
    const value = firstItem[field];
    const status = value !== undefined ? '✅' : '❌';
    console.log(`  ${status} ${field}: ${value}`);
  });
  
  console.log('\n✅ 检查价格记录字段:');
  ['unit', 'costInclTax'].forEach(field => {
    const value = priceRecord?.[field];
    const status = value !== undefined ? '✅' : '❌';
    console.log(`  ${status} priceRecords[0].${field}: ${value}`);
  });
}

/**
 * 测试 3: 验证表格数据映射
 */
function testTableMapping(data) {
  if (!data || data.length === 0) {
    console.log('\n⚠️ 无数据，跳过表格映射验证');
    return;
  }

  console.log('\n🧪 测试 3: 验证表格数据映射...\n');
  
  const tableData = data.slice(0, 3).map(item => ({
    'CarModel': item.carModel,
    'OeNumber': item.oeNumber,
    'PartsNumber': item.partsNumber,
    'OriginalName': item.originalName,
    'Quantity': item.quantity,
    'UNIT': item.priceRecords?.[0]?.unit,
    'CostInclTax': item.priceRecords?.[0]?.costInclTax,
    'Model': item.model,
    'Brand': item.brand
  }));
  
  console.log('✅ 表格数据映射示例 (前3行):');
  console.table(tableData);
}

/**
 * 测试 4: 验证 CSV 导出格式
 */
function testCsvExport(data) {
  if (!data || data.length === 0) {
    console.log('\n⚠️ 无数据，跳过 CSV 导出验证');
    return;
  }

  console.log('\n🧪 测试 4: 验证 CSV 导出格式...\n');
  
  const headers = ['CarModel', 'OeNumber', 'PartsNumber', 'OriginalName', 'Quantity', 'UNIT', 'CostInclTax(PriceRecords)', 'Model', 'Brand'];
  
  const rows = data.slice(0, 2).map(p => [
    p.carModel || '',
    p.oeNumber || '',
    p.partsNumber || '',
    p.originalName || '',
    p.quantity || '',
    p.priceRecords?.[0]?.unit || '件',
    p.priceRecords?.[0]?.costInclTax || '',
    p.model || '',
    p.brand || ''
  ]);
  
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
  ].join('\n');
  
  console.log('✅ CSV 导出格式示例:');
  console.log(csvContent);
}

/**
 * 测试 5: 模拟搜索功能
 */
async function testSearchFunctionality() {
  console.log('\n🧪 测试 5: 模拟搜索功能...\n');
  
  const searchTerms = ['8407120', '前罩', 'A05'];
  
  for (const term of searchTerms) {
    try {
      const response = await fetch(`${API_BASE_URL}/CarParts/search?term=${term}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${TEST_TOKEN}`,
          'Accept': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log(`✅ 搜索 "${term}": ${data.length} 条结果`);
      } else {
        console.log(`❌ 搜索 "${term}": ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.log(`❌ 搜索 "${term}": ${error.message}`);
    }
  }
}

/**
 * 测试 6: 验证排序逻辑
 */
function testSortingLogic(data) {
  if (!data || data.length < 2) {
    console.log('\n⚠️ 数据不足，跳过排序验证');
    return;
  }

  console.log('\n🧪 测试 6: 验证排序逻辑...\n');
  
  // 测试字符串排序
  const sortedByCarModel = [...data].sort((a, b) => 
    (a.carModel || '').localeCompare(b.carModel || '')
  );
  
  console.log('✅ 按 CarModel 升序排序示例:');
  console.table(sortedByCarModel.slice(0, 3).map(d => ({
    carModel: d.carModel,
    oeNumber: d.oeNumber
  })));
  
  // 测试数值排序
  const sortedByPrice = [...data].sort((a, b) => {
    const aPrice = a.priceRecords?.[0]?.costInclTax || 0;
    const bPrice = b.priceRecords?.[0]?.costInclTax || 0;
    return aPrice - bPrice;
  });
  
  console.log('\n✅ 按 CostInclTax 升序排序示例:');
  console.table(sortedByPrice.slice(0, 3).map(d => ({
    carModel: d.carModel,
    costInclTax: d.priceRecords?.[0]?.costInclTax
  })));
}

/**
 * 运行所有测试
 */
async function runAllTests() {
  console.clear();
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║         SearchParts API Integration Test Suite              ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  
  const data = await testApiConnection();
  
  if (data) {
    await testDataFields(data);
    testTableMapping(data);
    testCsvExport(data);
    await testSearchFunctionality();
    testSortingLogic(data);
    
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║                    ✅ 测试完成！                              ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
  } else {
    console.log('\n❌ API 连接失败，无法继续测试');
    console.log('请检查:');
    console.log('1. 后端 API 是否运行在 http://localhost:5017/api');
    console.log('2. Token 是否有效');
    console.log('3. 浏览器控制台是否显示网络错误');
  }
}

// 执行所有测试
runAllTests();

// 提示如何在控制台中使用
console.log('\n💡 提示: 您也可以独立运行以下任何测试:');
console.log('  - testApiConnection() - 测试 API 连接');
console.log('  - testSearchFunctionality() - 测试搜索功能');
console.log('  - runAllTests() - 运行所有测试');

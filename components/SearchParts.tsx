import React, { useState, useEffect, useRef } from 'react';
import { Part, PriceRecord, ReplacementPart, AdaptableModel, SubCategory, Brand, MainCategory } from '../types';
import { MockApiClient } from '../services/repositoryClient';
import { PARTS_MOCK } from '../data';
import * as XLSX from 'xlsx';

// 自动化分类匹配缓存
const categoryMatchCache: Record<string, SubCategory> = {};

interface SearchPartsProps {
  onAddToCart: (item: any) => void;
  isAdmin?: boolean;
}

type SortField = 'carModel' | 'oeNumber' | 'partsNumber' | 'originalName' | 'quantity' | 'costInclTax' | null;
type SortOrder = 'asc' | 'desc';

interface PendingAction {
  type: 'DELETE' | 'BIND_CATEGORY' | 'ADD_PART';
  data: any;
  action: () => void;
  title: string;
}

const SearchParts: React.FC<SearchPartsProps> = ({ onAddToCart, isAdmin = false }) => {
  // 基础搜索状态
  const [term, setTerm] = useState('');
  const [category, setCategory] = useState('');
  const [brand, setBrand] = useState('');
  const [results, setResults] = useState<Part[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Part | null>(null);
  const [sortField, setSortField] = useState<SortField>(null);
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  // API数据状态 - 替代原来的Mock数据
  const [apiBrands, setApiBrands] = useState<Brand[]>([]);
  const [apiMainCategories, setApiMainCategories] = useState<MainCategory[]>([]);
  const [apiSubCategories, setApiSubCategories] = useState<SubCategory[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  // 管理模式状态
  const [isManageMode, setIsManageMode] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [modifiedParts, setModifiedParts] = useState<Set<string>>(new Set());

  // 快速选择类目状态 (基于品牌->地区->型号->发布日期->代码->主类目->子类目 层级)
  const [showCategorySelector, setShowCategorySelector] = useState(false);
  // Hierarchy selection states
  const [bindBrandId, setBindBrandId] = useState('');
  const [bindRegion, setBindRegion] = useState<string | null>(null);
  const [bindModel, setBindModel] = useState<string | null>(null);
  const [bindDate, setBindDate] = useState<string | null>(null);
  const [bindCode, setBindCode] = useState<string | null>(null);
  // Hierarchy data
  const [bindHierarchy, setBindHierarchy] = useState<any>(null);
  const [bindHierarchyLoading, setBindHierarchyLoading] = useState(false);
  // Category selection
  const [bindMainCategories, setBindMainCategories] = useState<MainCategory[]>([]);
  const [bindSubCategories, setBindSubCategories] = useState<SubCategory[]>([]);
  const [selectedBindMainCategory, setSelectedBindMainCategory] = useState('');
  const [selectedBindSubCategory, setSelectedBindSubCategory] = useState('');
  const [bindMainLoading, setBindMainLoading] = useState(false);
  const [bindSubLoading, setBindSubLoading] = useState(false);

  // 图片路径编辑状态
  const [editingImagePathPartId, setEditingImagePathPartId] = useState<string | null>(null);
  const [tempImagePath, setTempImagePath] = useState('');

  // 详情模态框选项卡状态
  const [activeDetailTab, setActiveDetailTab] = useState<'price' | 'replace' | 'applicable'>('price');

  // ========== Excel导入相关状态 ==========
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importStage, setImportStage] = useState<'select' | 'validating' | 'duplicates' | 'confirm' | 'importing' | 'done'>('select');
  const [importRows, setImportRows] = useState<any[]>([]);
  const [importErrors, setImportErrors] = useState<{ row: number; reason: string }[]>([]);
  const [importDuplicates, setImportDuplicates] = useState<{ rowIndex: number; existingParts: Part[] }[]>([]);
  const [importOverwriteMap, setImportOverwriteMap] = useState<Record<number, boolean>>({});
  const [importResult, setImportResult] = useState<{ added: number; updated: number; skipped: number; message: string } | null>(null);
  const REQUIRED_HEADERS = ['OeNumber', 'PartsNumber', 'OriginalName', 'CostInclTax(PriceRecords)'];

  useEffect(() => {
    // initial show none
  }, []);

  // 组件加载时从API获取基础数据
  useEffect(() => {
    const loadApiData = async () => {
      setDataLoading(true);
      try {
        const [brandsData, mainCatsData, subCatsData] = await Promise.all([
          MockApiClient.getBrands(),
          MockApiClient.getMainCategories(),
          MockApiClient.getSubCategories()
        ]);
        setApiBrands(brandsData);
        setApiMainCategories(mainCatsData);
        setApiSubCategories(subCatsData);
      } catch (error) {
        console.error('加载API数据失败:', error);
      } finally {
        setDataLoading(false);
      }
    };
    loadApiData();
  }, []);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  // 删除零部件
  const handleDeletePart = () => {
    if (!selected) return;
    setPendingAction({
      type: 'DELETE',
      title: '确认删除零配件',
      data: selected,
      action: async () => {
        try {
          // 调用后端删除 API
          await MockApiClient.deletePart(selected.id);
          setResults(results.filter(p => p.id !== selected.id));
          setSelected(null);
          setPendingAction(null);
          setModifiedParts(prev => {
            const updated = new Set(prev);
            updated.delete(selected.id);
            return updated;
          });
          console.log(`零部件 ${selected.id} 已从后端删除`);
        } catch (e) {
          console.error('Delete failed:', e);
          alert('删除失败，请检查网络连接或后端服务');
        }
      }
    });
  };

  // 保存修改到后端
  const handleSaveModifications = async () => {
    if (!selected) return;
    try {
      // 调用后端更新 API
      const updated = await MockApiClient.updatePart(selected);
      
      // 确保返回的数据包含所有必要字段
      const completeData = { 
        ...selected,  // 用原始数据作为基础
        ...updated,   // 合并后端返回的数据
        id: selected.id  // 确保ID不变
      };
      
      // 更新results数组
      const newResults = results.map(p => p.id === selected.id ? completeData : p);
      setResults(newResults);
      
      // 清除修改标记
      setModifiedParts(prev => {
        const newSet = new Set(prev);
        newSet.delete(selected.id);
        return newSet;
      });
      
      console.log(`零部件 ${selected.id} 已保存到后端`, completeData);
      
      // 使用 setTimeout 确保状态更新完成后再关闭模态框
      setTimeout(() => {
        setSelected(null);
      }, 50);
      
    } catch (e) {
      console.error('Save failed:', e);
      alert('保存失败，请检查网络连接或后端服务');
    }
  };

  // 更新零部件字段
  const handleUpdatePart = (field: keyof Part, value: any) => {
    if (!selected) return;
    const updated = { ...selected, [field]: value };
    setSelected(updated);
    setResults(results.map(p => p.id === selected.id ? updated : p));
    setModifiedParts(prev => new Set(prev).add(selected.id));
  };

  const handleUpdateArrayItem = (field: 'priceRecords' | 'replacementParts' | 'adaptableModels', index: number, key: string, value: any) => {
    if (!selected) return;
    const currentArray = [...(selected[field] || [])] as any[];
    currentArray[index] = { ...currentArray[index], [key]: value };
    handleUpdatePart(field, currentArray);
  };

  const handleAddPriceRecord = () => {
    if (!selected) return;
    const current = selected.priceRecords || [];
    const newItem: PriceRecord = {
      brand: '',
      manufacturer: '',
      description: '',
      costExclTax: 0,
      costInclTax: 0,
      saleExclTax: 0,
      saleInclTax: 0,
      unit: 'RMB'
    };
    handleUpdatePart('priceRecords', [...current, newItem]);
  };

  const handleRemoveArrayItem = (field: 'priceRecords' | 'replacementParts' | 'adaptableModels', index: number) => {
    if (!selected) return;
    const currentArray = [...(selected[field] || [])] as any[];
    currentArray.splice(index, 1);
    handleUpdatePart(field, currentArray);
  };

  const handleAddReplacementPart = () => {
    if (!selected) return;
    const current = selected.replacementParts || [];
    const newItem: ReplacementPart = {
      brand: '',
      originalOe: '',
      replacementOe: '',
      note: '',
      costExclTax: 0,
      costInclTax: 0,
      saleExclTax: 0,
      saleInclTax: 0,
      unit: 'RMB'
    };
    handleUpdatePart('replacementParts', [...current, newItem]);
  };

  const handleAddAdaptableModel = () => {
    if (!selected) return;
    const current = selected.adaptableModels || [];
    const newItem: AdaptableModel = {
      brand: '',
      region: '',
      modelName: '',
      productionDate: '',
      modelCode: '',
      costExclTax: 0,
      costInclTax: 0,
      saleExclTax: 0,
      saleInclTax: 0,
      unit: 'RMB'
    };
    handleUpdatePart('adaptableModels', [...current, newItem]);
  };

  // ========== Hierarchy-based Category Binding ==========

  // 打开类目选择器 (重置所有状态)
  const openCategorySelector = () => {
    setBindBrandId('');
    setBindRegion(null);
    setBindModel(null);
    setBindDate(null);
    setBindCode(null);
    setBindHierarchy(null);
    setBindMainCategories([]);
    setBindSubCategories([]);
    setSelectedBindMainCategory('');
    setSelectedBindSubCategory('');
    setShowCategorySelector(true);
  };

  // 选择品牌后加载层级数据
  const handleBindBrandSelect = async (brandId: string) => {
    setBindBrandId(brandId);
    setBindRegion(null);
    setBindModel(null);
    setBindDate(null);
    setBindCode(null);
    setBindMainCategories([]);
    setBindSubCategories([]);
    setSelectedBindMainCategory('');
    setSelectedBindSubCategory('');
    if (!brandId) { setBindHierarchy(null); return; }

    setBindHierarchyLoading(true);
    try {
      const hierarchy = await MockApiClient.getHierarchyByBrandId(brandId);
      setBindHierarchy(hierarchy);
    } catch (e) {
      console.error('Failed to load hierarchy:', e);
      setBindHierarchy(null);
    } finally {
      setBindHierarchyLoading(false);
    }
  };

  // Derived data from brand hierarchy
  const bindHasRegions = !!(bindHierarchy && bindHierarchy.regions && bindHierarchy.regions.length > 0);
  
  const bindRegions = bindHierarchy?.regions || [];
  
  const bindCurrentRegionData = bindHasRegions && bindRegion
    ? bindRegions.find((r: any) => r.regionName === bindRegion) : null;
  
  const bindModels = bindHasRegions
    ? (bindCurrentRegionData?.models || [])
    : (bindHierarchy?.regions?.[0]?.models || []);
  
  const bindCurrentModelData = bindModel
    ? bindModels.find((m: any) => m.modelName === bindModel) : null;
  
  const bindHasReleases = !!(bindCurrentModelData && bindCurrentModelData.releases && bindCurrentModelData.releases.length > 0);
  
  const bindReleases = bindCurrentModelData?.releases || [];
  
  const bindCurrentReleaseData = bindHasReleases && bindDate
    ? bindReleases.find((r: any) => r.period === bindDate) : null;
  
  const bindCodes = bindHasReleases
    ? (bindCurrentReleaseData?.codes || [])
    : (bindCurrentModelData?.codes || []);

  // 选择code后加载主类目
  const handleBindCodeSelect = async (code: string) => {
    setBindCode(code);
    setBindMainCategories([]);
    setBindSubCategories([]);
    setSelectedBindMainCategory('');
    setSelectedBindSubCategory('');
    if (!code) return;

    setBindMainLoading(true);
    try {
      const mains = await MockApiClient.getMainCategoriesByVehicleCode(code);
      setBindMainCategories(mains);
    } catch (e) {
      console.error('Failed to load main categories:', e);
      setBindMainCategories(MAIN_CATEGORIES);
    } finally {
      setBindMainLoading(false);
    }
  };

  // 选择主类目后加载子类目
  const handleBindMainSelect = async (mainCatId: string) => {
    setSelectedBindMainCategory(mainCatId);
    setBindSubCategories([]);
    setSelectedBindSubCategory('');
    if (!mainCatId) return;

    setBindSubLoading(true);
    try {
      const subs = await MockApiClient.getSubCategoriesByParentId(mainCatId);
      setBindSubCategories(subs);
    } catch (e) {
      console.error('Failed to load subcategories:', e);
      const filtered = apiSubCategories.filter(s => s.parentId === mainCatId);
      setBindSubCategories(filtered);
    } finally {
      setBindSubLoading(false);
    }
  };

  // 判断是否可以绑定 (所有层级都已完成选择)
  const canBind = !!bindBrandId && !!bindCode && !!selectedBindMainCategory && !!selectedBindSubCategory
    && (bindHasRegions ? !!bindRegion : true)
    && !!bindModel
    && (bindHasReleases ? !!bindDate : true);

  // 绑定类目
  const handleBindCategory = async () => {
    if (!selected || !selectedBindSubCategory) return;
    
    const brandName = apiBrands.find(b => b.id === bindBrandId)?.name || '';
    
    setPendingAction({
      type: 'BIND_CATEGORY',
      title: '确认绑定分类',
      data: { 
        part: selected, 
        subCategoryId: selectedBindSubCategory,
        hierarchy: {
          brand: brandName,
          region: bindRegion || '-',
          model: bindModel || '-',
          date: bindDate || '-',
          code: bindCode || '-',
          mainCategory: selectedBindMainCategory,
          subCategory: selectedBindSubCategory
        }
      },
      action: async () => {
        try {
          const updated = { ...selected, subCategoryId: selectedBindSubCategory, brand: brandName };
          const result = await MockApiClient.updatePart(updated);
          
          const completeData = { 
            ...updated,
            ...result,
            id: selected.id
          };
          
          const newResults = results.map(p => p.id === selected.id ? completeData : p);
          setResults(newResults);
          
          setModifiedParts(prev => {
            const newSet = new Set(prev);
            newSet.delete(selected.id);
            return newSet;
          });
          
          console.log(`零部件 ${selected.id} 已绑定到分类 ${selectedBindSubCategory} (路径: ${brandName} > ${bindRegion || '-'} > ${bindModel} > ${bindDate || '-'} > ${bindCode} > ${selectedBindMainCategory} > ${selectedBindSubCategory})`);
          
          setTimeout(() => {
            setSelected(completeData);
            setShowCategorySelector(false);
            setPendingAction(null);
          }, 50);
          
        } catch (e) {
          console.error('Bind category failed:', e);
          alert('绑定分类失败，请检查网络连接或后端服务');
          setPendingAction(null);
        }
      }
    });
  };

  // 添加新零部件 (基于层级选择的分类)
  const handleAddNewPart = async () => {
    if (!selectedBindSubCategory) {
      alert('请先完成所有层级筛选并选择子分类');
      return;
    }

    const brandName = apiBrands.find(b => b.id === bindBrandId)?.name || '';
    
    const newPart: Part = {
      id: Date.now().toString(),
      subCategoryId: selectedBindSubCategory,
      position: '00000',
      oeNumber: 'OE-' + Date.now(),
      standardName: '新零件',
      originalName: 'New Part',
      quantity: '1',
      note: '',
      date: new Date().toISOString(),
      x: 50,
      y: 50,
      imageUrl: '',
      brand: brandName,
      partsNumber: 'PART-' + Date.now(),
      carModel: bindModel || '',
      origin: '中国',
      priceRecords: [],
      replacementParts: [],
      adaptableModels: []
    };

    setPendingAction({
      type: 'ADD_PART',
      title: '确认添加新零件',
      data: newPart,
      action: async () => {
        try {
          const createdPart = await MockApiClient.createPart(newPart);
          
          const completeData = { 
            ...newPart,
            ...createdPart,
            id: createdPart.id || newPart.id
          };
          
          setResults([...results, completeData]);
          setModifiedParts(prev => new Set(prev).add(completeData.id));
          
          console.log(`新零部件 ${completeData.id} 已创建于分类路径: ${brandName} > ${bindRegion || '-'} > ${bindModel} > ${bindDate || '-'} > ${bindCode} > ${selectedBindMainCategory} > ${selectedBindSubCategory}`);
          
          setTimeout(() => {
            setSelected(completeData);
            setShowCategorySelector(false);
            setPendingAction(null);
          }, 50);
          
        } catch (e) {
          console.error('Add part failed:', e);
          alert('添加零部件失败，请检查网络连接或后端服务');
          setPendingAction(null);
        }
      }
    });
  };

  const getSortedResults = (): Part[] => {
    if (!sortField) return results;

    return [...results].sort((a, b) => {
      let aVal: any = '';
      let bVal: any = '';

      if (sortField === 'costInclTax') {
        aVal = (a.priceRecords?.[0]?.costInclTax || 0);
        bVal = (b.priceRecords?.[0]?.costInclTax || 0);
      } else if (sortField === 'carModel' || sortField === 'oeNumber' || sortField === 'partsNumber' || sortField === 'originalName' || sortField === 'quantity') {
        aVal = (a as any)[sortField];
        bVal = (b as any)[sortField];
      }

      if (aVal === undefined || aVal === null) aVal = '';
      if (bVal === undefined || bVal === null) bVal = '';

      if (typeof aVal === 'string') {
        const comparison = aVal.localeCompare(bVal);
        return sortOrder === 'asc' ? comparison : -comparison;
      } else {
        return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
      }
    });
  };

  const exportToCSV = () => {
    const sortedData = getSortedResults();
    const headers = ['CarModel', 'OeNumber', 'PartsNumber', 'OriginalName', 'Quantity', 'UNIT', 'CostInclTax(PriceRecords)', 'Model', 'Brand'];
    
    const rows = sortedData.map(p => [
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

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `carparts-${new Date().getTime()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const printResults = () => {
    const sortedData = getSortedResults();
    const printWindow = window.open('', '', 'height=600,width=800');
    if (!printWindow) return;

    const html = `
      <html>
        <head>
          <title>Car Parts Search Results</title>
          <style>
            table { border-collapse: collapse; width: 100%; font-size: 12px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; font-weight: bold; }
            tr:nth-child(even) { background-color: #f9f9f9; }
          </style>
        </head>
        <body>
          <h2>Car Parts Search Results</h2>
          <table>
            <thead>
              <tr>
                <th>CarModel</th>
                <th>OeNumber</th>
                <th>PartsNumber</th>
                <th>OriginalName</th>
                <th>Quantity</th>
                <th>UNIT</th>
                <th>CostInclTax</th>
                <th>Model</th>
                <th>Brand</th>
              </tr>
            </thead>
            <tbody>
              ${sortedData.map(p => `
                <tr>
                  <td>${p.carModel || ''}</td>
                  <td>${p.oeNumber || ''}</td>
                  <td>${p.partsNumber || ''}</td>
                  <td>${p.originalName || ''}</td>
                  <td>${p.quantity || ''}</td>
                  <td>${p.priceRecords?.[0]?.unit || '件'}</td>
                  <td>${p.priceRecords?.[0]?.costInclTax || ''}</td>
                  <td>${p.model || ''}</td>
                  <td>${p.brand || ''}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </body>
      </html>
    `;
    
    printWindow.document.write(html);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  // ========== Excel导入功能 ==========

  // 规范化表头：去除空格、括号全角转半角
  const normalizeHeader = (h: string): string => {
    return h.replace(/\s+/g, '')
      .replace(/（/g, '(')
      .replace(/）/g, ')')
      .trim();
  };

  // 检查表头是否包含必需列
  const validateHeaders = (headers: string[]): { valid: boolean; missing: string[] } => {
    const normalized = headers.map(normalizeHeader);
    const missing: string[] = [];
    for (const required of REQUIRED_HEADERS) {
      const found = normalized.some(h => h.toLowerCase() === required.toLowerCase());
      if (!found) {
        // 尝试更宽松的匹配
        const partialMatch = normalized.some(h =>
          h.toLowerCase().includes(required.toLowerCase().replace(/[()]/g, ''))
        );
        if (!partialMatch) {
          missing.push(required);
        }
      }
    }
    return { valid: missing.length === 0, missing };
  };

  // 从表头找到匹配的列索引
  const findColumnIndex = (headers: string[], targetNames: string[]): number => {
    const normalized = headers.map(normalizeHeader);
    for (const target of targetNames) {
      const idx = normalized.findIndex(h =>
        h.toLowerCase() === target.toLowerCase()
      );
      if (idx !== -1) return idx;
    }
    // 宽松匹配
    for (const target of targetNames) {
      const idx = normalized.findIndex(h =>
        h.toLowerCase().includes(target.toLowerCase().replace(/[()]/g, ''))
      );
      if (idx !== -1) return idx;
    }
    return -1;
  };

  // 解析Excel并验证
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportStage('validating');
    setImportErrors([]);
    setImportDuplicates([]);
    setImportOverwriteMap({});
    setImportResult(null);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, defval: '' });

      if (jsonData.length < 2) {
        setImportErrors([{ row: 0, reason: 'Excel文件为空或只有表头，没有数据行' }]);
        setImportStage('confirm');
        return;
      }

      const rawHeaders = jsonData[0] as string[];
      const headerCheck = validateHeaders(rawHeaders);

      if (!headerCheck.valid) {
        setImportErrors([{
          row: 0,
          reason: `表头缺少必需列: ${headerCheck.missing.join(', ')}。请确保Excel包含以下列：OeNumber, PartsNumber, OriginalName, CostInclTax(PriceRecords)`
        }]);
        setImportStage('confirm');
        return;
      }

      // 找到各列索引
      const idxCarModel = findColumnIndex(rawHeaders, ['CarModel', 'carModel']);
      const idxOeNumber = findColumnIndex(rawHeaders, ['OeNumber', 'oeNumber']);
      const idxPartsNumber = findColumnIndex(rawHeaders, ['PartsNumber', 'partsNumber']);
      const idxOriginalName = findColumnIndex(rawHeaders, ['OriginalName', 'originalName']);
      const idxQuantity = findColumnIndex(rawHeaders, ['Quantity', 'quantity']);
      const idxUnit = findColumnIndex(rawHeaders, ['UNIT', 'unit']);
      const idxCostInclTaxAdaptable = findColumnIndex(rawHeaders, ['CostInclTax(AdaptableModels)']);
      const idxCostInclTaxPriceRecords = findColumnIndex(rawHeaders, ['CostInclTax(PriceRecords)', 'CostInclTax（PriceRecords）']);
      const idxModel = findColumnIndex(rawHeaders, ['Model', 'model']);
      const idxBrand = findColumnIndex(rawHeaders, ['Brand', 'brand']);

      const parsedRows: any[] = [];
      const errors: { row: number; reason: string }[] = [];

      for (let i = 1; i < jsonData.length; i++) {
        const row = jsonData[i] as string[];
        const rowNum = i + 1; // Excel行号(1-indexed)

        // 跳过完全空行
        if (row.every(cell => !cell || String(cell).trim() === '')) continue;

        const oeNumber = String(idxOeNumber >= 0 ? (row[idxOeNumber] || '') : '').trim();
        const partsNumber = String(idxPartsNumber >= 0 ? (row[idxPartsNumber] || '') : '').trim();
        const originalName = String(idxOriginalName >= 0 ? (row[idxOriginalName] || '') : '').trim();
        const quantityRaw = String(idxQuantity >= 0 ? (row[idxQuantity] || '') : '').trim();
        const costInclTaxAdaptableRaw = String(idxCostInclTaxAdaptable >= 0 ? (row[idxCostInclTaxAdaptable] || '') : '').trim();
        const costInclTaxPriceRaw = String(idxCostInclTaxPriceRecords >= 0 ? (row[idxCostInclTaxPriceRecords] || '') : '').trim();

        // 验证规则
        // (1) OeNumber与PartsNumber必须其中一个不为空
        if (!oeNumber && !partsNumber) {
          errors.push({ row: rowNum, reason: 'OeNumber与PartsNumber均为空，至少需要一个' });
          continue;
        }

        // (2) OriginalName不为空
        if (!originalName) {
          errors.push({ row: rowNum, reason: 'OriginalName为空' });
          continue;
        }

        // (3) CostInclTax(AdaptableModels)与CostInclTax(PriceRecords)至少一个不为空
        if (!costInclTaxAdaptableRaw && !costInclTaxPriceRaw) {
          errors.push({ row: rowNum, reason: 'CostInclTax(AdaptableModels)与CostInclTax(PriceRecords)均为空，至少需要一个' });
          continue;
        }

        // (4) Quantity默认为100
        const quantity = quantityRaw || '100';

        // 解析价格
        const costInclTaxPrice = parseFloat(costInclTaxPriceRaw.replace(/[￥¥$,]/g, '')) || 0;
        const costInclTaxAdaptable = parseFloat(costInclTaxAdaptableRaw.replace(/[￥¥$,]/g, '')) || 0;
        const unit = String(idxUnit >= 0 ? (row[idxUnit] || '') : '').trim() || '件';
        const carModel = String(idxCarModel >= 0 ? (row[idxCarModel] || '') : '').trim();
        const model = String(idxModel >= 0 ? (row[idxModel] || '') : '').trim();
        const brand = String(idxBrand >= 0 ? (row[idxBrand] || '') : '').trim();
        const subCategoryIdRaw = String(idxSubCategoryId >= 0 ? (row[idxSubCategoryId] || '') : '').trim();
        
        // 自动化分类匹配
        let matchedSubCategoryId = '';
        let matchedSubCategoryName = '';
        if (subCategoryIdRaw) {
          const matched = autoMatchCategory(subCategoryIdRaw);
          if (matched) {
            matchedSubCategoryId = matched.id;
            matchedSubCategoryName = matched.name;
          }
        }

        // 生成唯一ID
        const brandPrefix = brand ? brand.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase() : 'import';
        const uniqueId = `${brandPrefix}_p${Date.now()}_${i}`;

        parsedRows.push({
          rowIndex: i,
          excelRow: rowNum,
          oeNumber,
          partsNumber,
          originalName,
          quantity,
          unit,
          costInclTaxPrice,
          costInclTaxAdaptable,
          carModel,
          model,
          brand,
          subCategoryId: matchedSubCategoryId,
          subCategoryName: matchedSubCategoryName,
          id: uniqueId,
        });
      }

      setImportErrors(errors);
      setImportRows(parsedRows);

      if (parsedRows.length === 0) {
        setImportStage('confirm');
        return;
      }

      // 检查重复 - 对每个有效行搜索已有的零部件
      setImportStage('duplicates');
      const duplicateResults: { rowIndex: number; existingParts: Part[] }[] = [];

      for (const row of parsedRows) {
        const existingParts: Part[] = [];
        try {
          if (row.oeNumber) {
            const found = await MockApiClient.searchParts(row.oeNumber);
            if (found && found.length > 0) {
              const matches = found.filter((p: Part) =>
                p.oeNumber?.toLowerCase() === row.oeNumber.toLowerCase() ||
                (row.partsNumber && p.partsNumber?.toLowerCase() === row.partsNumber.toLowerCase())
              );
              if (matches.length > 0) {
                existingParts.push(...matches);
              }
            }
          }
          if (row.partsNumber && existingParts.length === 0) {
            const found = await MockApiClient.searchParts(row.partsNumber);
            if (found && found.length > 0) {
              const matches = found.filter((p: Part) =>
                p.partsNumber?.toLowerCase() === row.partsNumber.toLowerCase() ||
                (row.oeNumber && p.oeNumber?.toLowerCase() === row.oeNumber.toLowerCase())
              );
              if (matches.length > 0) {
                existingParts.push(...matches);
              }
            }
          }
        } catch (err) {
          console.error(`搜索重复失败 (行${row.excelRow}):`, err);
        }

        if (existingParts.length > 0) {
          duplicateResults.push({ rowIndex: row.rowIndex, existingParts });
        }
      }

      // 去重：同一个existing part可能匹配多行
      setImportDuplicates(duplicateResults);

      // 默认：有重复的行默认不覆盖
      const defaultMap: Record<number, boolean> = {};
      duplicateResults.forEach(d => { defaultMap[d.rowIndex] = false; });
      setImportOverwriteMap(defaultMap);

      setImportStage('confirm');
    } catch (err: any) {
      console.error('Excel解析失败:', err);
      setImportErrors([{ row: 0, reason: `文件解析失败: ${err.message || '未知错误'}` }]);
      setImportStage('confirm');
    }
  };

  // 切换覆盖选项
  const toggleOverwrite = (rowIndex: number) => {
    setImportOverwriteMap(prev => ({ ...prev, [rowIndex]: !prev[rowIndex] }));
  };

  // 全选/取消全选覆盖
  const toggleAllOverwrite = (value: boolean) => {
    const newMap: Record<number, boolean> = {};
    importDuplicates.forEach(d => { newMap[d.rowIndex] = value; });
    setImportOverwriteMap(newMap);
  };

  // 执行导入
  const handleImportExecute = async () => {
    setImportStage('importing');

    try {
      const partsToUpdate: Part[] = [];
      let addedCount = 0;
      let updatedCount = 0;
      let skippedCount = importErrors.length;

      for (const row of importRows) {
        const isDuplicate = importDuplicates.some(d => d.rowIndex === row.rowIndex);
        const shouldOverwrite = importOverwriteMap[row.rowIndex] || false;

        if (isDuplicate && !shouldOverwrite) {
          skippedCount++;
          continue;
        }

        // 如果是重复且同意覆盖，使用已有零件的id
        let existingPart: Part | null = null;
        if (isDuplicate && shouldOverwrite) {
          const dup = importDuplicates.find(d => d.rowIndex === row.rowIndex);
          if (dup && dup.existingParts.length > 0) {
            existingPart = dup.existingParts[0];
          }
        }

        // 构建Part数据结构
        const part: Part = {
          id: existingPart?.id || row.id,
          subCategoryId: row.subCategoryId || existingPart?.subCategoryId || '',
          position: existingPart?.position || '00000',
          oeNumber: row.oeNumber || existingPart?.oeNumber || '',
          partsNumber: row.partsNumber || existingPart?.partsNumber || '',
          standardName: existingPart?.standardName || row.originalName,
          originalName: row.originalName || existingPart?.originalName || '',
          quantity: row.quantity || existingPart?.quantity || '100',
          note: existingPart?.note || '',
          date: existingPart?.date || '',
          x: existingPart?.x ?? 1,
          y: existingPart?.y ?? 1,
          imageUrl: existingPart?.imageUrl || '',
          origin: existingPart?.origin || '',
          brand: row.brand || existingPart?.brand || '',
          model: row.model || existingPart?.model || '',
          carModel: row.carModel || existingPart?.carModel || '',
          priceRecords: [
            {
              brand: row.brand || '',
              manufacturer: row.brand || '',
              description: '原厂品质',
              costExclTax: 0,
              costInclTax: row.costInclTaxPrice,
              saleExclTax: 0,
              saleInclTax: 0,
              unit: row.unit || 'RMB',
            }
          ],
          replacementParts: existingPart?.replacementParts || [],
          adaptableModels: row.costInclTaxAdaptable > 0 ? [
            {
              brand: row.brand || '',
              region: '',
              modelName: row.model || '',
              productionDate: '',
              modelCode: '',
              costExclTax: 0,
              costInclTax: row.costInclTaxAdaptable,
              saleExclTax: 0,
              saleInclTax: 0,
              unit: row.unit || 'RMB',
            }
          ] : (existingPart?.adaptableModels || []),
        };

        partsToUpdate.push(part);
        if (existingPart) {
          updatedCount++;
        } else {
          addedCount++;
        }
      }

      if (partsToUpdate.length > 0) {
        const response = await MockApiClient.batchUpdate({ UPDATED_PARTS: partsToUpdate });
        setImportResult({
          added: addedCount,
          updated: updatedCount,
          skipped: skippedCount,
          message: response.message || `成功导入 ${partsToUpdate.length} 条记录`,
        });
      } else {
        setImportResult({
          added: 0,
          updated: 0,
          skipped: skippedCount,
          message: '没有数据需要导入',
        });
      }

      setImportStage('done');
    } catch (err: any) {
      console.error('导入失败:', err);
      setImportResult({
        added: 0,
        updated: 0,
        skipped: importRows.length,
        message: `导入失败: ${err.message || '网络错误'}`,
      });
      setImportStage('done');
    }
  };

  // 关闭导入弹窗并刷新
  const handleCloseImport = () => {
    setShowImportModal(false);
    setImportStage('select');
    setImportRows([]);
    setImportErrors([]);
    setImportDuplicates([]);
    setImportOverwriteMap({});
    setImportResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    // 重新搜索刷新数据
    if (term || category) {
      doSearch();
    }
  };

  const doSearch = async () => {
    setLoading(true);
    try {
      let parts: Part[] = [];
      
      // 优先按 vehicleCode 获取配件（如果有选择车型）
      if (selectedVehicleCode) {
        // 获取该 vehicleCode 下的所有主类目 -> 子类目 -> 配件
        try {
          const mainCats = await MockApiClient.getMainCategoriesByVehicleCode(selectedVehicleCode);
          const subCatIds: string[] = [];
          
          for (const mc of mainCats) {
            const subs = await MockApiClient.getSubCategoriesByParentId(mc.id);
            subCatIds.push(...subs.map(s => s.id));
          }
          
          // 获取所有子类目的配件
          const allParts: Part[] = [];
          for (const scId of subCatIds) {
            try {
              const ps = await MockApiClient.getPartsBySubCategoryId(scId);
              allParts.push(...ps);
            } catch { /* skip */ }
          }
          
          parts = allParts;
        } catch (e) {
          console.error('VehicleCode search failed:', e);
          parts = [];
        }
        
        // 如果有搜索词，再过滤
        if (term.trim()) {
          const t = term.toLowerCase();
          parts = parts.filter(p => 
            p.standardName?.toLowerCase().includes(t) ||
            p.originalName?.toLowerCase().includes(t) ||
            p.oeNumber?.toLowerCase().includes(t) ||
            p.partsNumber?.toLowerCase().includes(t)
          );
        }
      } else if (term.trim()) {
        // 纯关键词搜索
        try {
          parts = await MockApiClient.searchParts(term.trim());
        } catch (apiError: any) {
          console.error('API search failed:', apiError);
          const t = term.toLowerCase();
          parts = (PARTS_MOCK || []).filter(p => {
            return (
              p.standardName?.toLowerCase().includes(t) ||
              p.originalName?.toLowerCase().includes(t) ||
              p.oeNumber?.toLowerCase().includes(t) ||
              p.partsNumber?.toLowerCase().includes(t)
            );
          });
        }
      } else if (category) {
        // 按子类目筛选
        try {
          parts = await MockApiClient.getPartsBySubCategoryId(category);
        } catch (apiError: any) {
          console.error('Category search failed:', apiError);
          parts = (PARTS_MOCK || []).filter(p => p.subCategoryId === category);
        }
      } else {
        // 默认显示所有（用API）
        try {
          parts = await MockApiClient.searchParts('');
        } catch {
          parts = PARTS_MOCK;
        }
      }

      setResults(parts);
    } catch (e) {
      console.error('Search failed', e);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const openDetail = async (part: Part) => {
    try {
      const full = await MockApiClient.getPartById(part.id);
      setSelected(full || part);
    } catch (e) {
      setSelected(part);
    }
  };

  return (
    <div className="p-6 bg-white">
      <div className="flex items-center space-x-3 mb-4">
        <input
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === 'Enter') {
              doSearch();
            }
          }}
          placeholder="输入关键词或OE号进行搜索"
          className="pl-3 pr-8 py-1.5 text-xs border border-gray-200 rounded w-80 focus:ring-1 focus:ring-blue-500 outline-none"
        />
        <select value={category} onChange={e => setCategory(e.target.value)} className="px-3 py-1.5 text-xs border border-gray-200 rounded">
          <option value="">全部分类</option>
          {apiSubCategories.map(sc => (
            <option key={sc.id} value={sc.id}>{sc.name}</option>
          ))}
        </select>
        <select value={brand} onChange={e => setBrand(e.target.value)} className="px-3 py-1.5 text-xs border border-gray-200 rounded">
          <option value="">全部品牌</option>
          {apiBrands.map(b => (
            <option key={b.id} value={b.name}>{b.name}</option>
          ))}
        </select>
        <button onClick={doSearch} className="px-4 py-2 bg-blue-600 text-white font-black text-xs rounded shadow">搜索</button>
        <button onClick={() => { setTerm(''); setCategory(''); setBrand(''); setSelectedVehicleCode(''); setQuickSearchBrandId(''); setResults([]); setSortField(null); }} className="px-4 py-2 border border-gray-200 text-xs rounded">重置</button>
        
        {isAdmin && (
          <div className="ml-auto flex items-center space-x-2">
            <button
              onClick={() => setShowImportModal(true)}
              className="px-3 py-2 bg-indigo-600 text-white text-xs rounded font-semibold hover:bg-indigo-700 transition-colors"
            >
              <i className="fa-solid fa-file-import mr-1"></i>导入Excel
            </button>
            <button
              onClick={() => setIsManageMode(!isManageMode)}
              className={`px-4 py-2 rounded text-xs font-black transition-all ${isManageMode ? 'bg-orange-600 text-white shadow-md' : 'bg-gray-200 text-gray-600'}`}
            >
              <i className={`fa-solid ${isManageMode ? 'fa-screwdriver-wrench' : 'fa-eye'} mr-1`}></i>
              {isManageMode ? '管理模式' : '浏览模式'}
            </button>
          </div>
        )}
      </div>

      {results.length > 0 && (
        <div className="flex items-center space-x-2 mb-4">
          <button onClick={exportToCSV} className="px-3 py-2 bg-green-600 text-white text-xs rounded font-semibold">导出CSV</button>
          <button onClick={printResults} className="px-3 py-2 bg-purple-600 text-white text-xs rounded font-semibold">打印</button>
          {isAdmin && (
            <button
              onClick={() => setShowImportModal(true)}
              className="px-3 py-2 bg-indigo-600 text-white text-xs rounded font-semibold hover:bg-indigo-700 transition-colors"
            >
              <i className="fa-solid fa-file-import mr-1"></i>导入Excel
            </button>
          )}
          <span className="text-xs text-gray-600">共 {results.length} 条记录</span>
        </div>
      )}

      {/* 隐藏的文件选择器 */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls"
        onChange={handleFileSelect}
        className="hidden"
      />

      <div className="bg-white border rounded shadow-sm overflow-auto">
        <table className="w-full text-left border-collapse table-fixed min-w-[1200px]">
          <thead className="sticky top-0 text-[10px] font-black z-20 border-b bg-gray-50 text-gray-500">
            <tr>
              <th className="w-24 px-3 py-3 text-center cursor-pointer hover:bg-gray-100" onClick={() => handleSort('carModel')}>
                CarModel {sortField === 'carModel' && (sortOrder === 'asc' ? '↑' : '↓')}
              </th>
              <th className="w-28 px-3 py-3 cursor-pointer hover:bg-gray-100" onClick={() => handleSort('oeNumber')}>
                OeNumber {sortField === 'oeNumber' && (sortOrder === 'asc' ? '↑' : '↓')}
              </th>
              <th className="w-28 px-3 py-3 cursor-pointer hover:bg-gray-100" onClick={() => handleSort('partsNumber')}>
                PartsNumber {sortField === 'partsNumber' && (sortOrder === 'asc' ? '↑' : '↓')}
              </th>
              <th className="w-40 px-3 py-3 cursor-pointer hover:bg-gray-100" onClick={() => handleSort('originalName')}>
                OriginalName {sortField === 'originalName' && (sortOrder === 'asc' ? '↑' : '↓')}
              </th>
              <th className="w-20 px-3 py-3 text-center cursor-pointer hover:bg-gray-100" onClick={() => handleSort('quantity')}>
                Quantity {sortField === 'quantity' && (sortOrder === 'asc' ? '↑' : '↓')}
              </th>
              <th className="w-16 px-3 py-3 text-center">UNIT</th>
              <th className="w-24 px-3 py-3 text-right cursor-pointer hover:bg-gray-100" onClick={() => handleSort('costInclTax')}>
                CostInclTax {sortField === 'costInclTax' && (sortOrder === 'asc' ? '↑' : '↓')}
              </th>
              <th className="w-20 px-3 py-3">Model</th>
              <th className="w-20 px-3 py-3">Brand</th>
              <th className="w-40 px-3 py-3">操作</th>
            </tr>
          </thead>
          <tbody className="text-[11px]">
            {loading ? (
              <tr><td colSpan={10} className="px-3 py-6 text-center">搜索中...</td></tr>
            ) : results.length === 0 ? (
              <tr><td colSpan={10} className="px-3 py-6 text-center text-gray-400">无结果</td></tr>
            ) : getSortedResults().map(p => (
              <tr key={p.id} className="cursor-pointer border-b border-gray-50 hover:bg-gray-50">
                <td className="px-3 py-3 text-center font-semibold">{p.carModel || '-'}</td>
                <td className="px-3 py-3 font-mono font-bold" onClick={() => openDetail(p)}>{p.oeNumber || '-'}</td>
                <td className="px-3 py-3 font-mono" onClick={() => openDetail(p)}>{p.partsNumber || '-'}</td>
                <td className="px-3 py-3" onClick={() => openDetail(p)}>{p.originalName}</td>
                <td className="px-3 py-3 text-center">{p.quantity || '-'}</td>
                <td className="px-3 py-3 text-center">{p.priceRecords?.[0]?.unit || '件'}</td>
                <td className="px-3 py-3 text-right font-semibold">¥{p.priceRecords?.[0]?.costInclTax || '-'}</td>
                <td className="px-3 py-3">{p.model || '-'}</td>
                <td className="px-3 py-3">{p.brand || '-'}</td>
                <td className="px-3 py-3">
                  <div className="flex items-center space-x-2">
                    <button onClick={() => openDetail(p)} className="px-3 py-1 bg-white border border-gray-200 rounded text-[11px]">详情</button>
                    {isAdmin && isManageMode && (
                      <button onClick={() => { openDetail(p); }} className="px-3 py-1 bg-orange-500 text-white rounded text-[11px]">编辑</button>
                    )}
                    {isAdmin && isManageMode && (
                      <button onClick={() => { setSelected(p); handleDeletePart(); }} className="px-3 py-1 bg-red-500 text-white rounded text-[11px]">删除</button>
                    )}
                    <button onClick={() => onAddToCart({ id: Date.now().toString(), part: p, selectedPrice: (p.priceRecords||[])[0] || null, timestamp: Date.now() })} className="px-3 py-1 bg-blue-600 text-white rounded text-[11px]">加入采购单</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Detail Modal with Management Features */}
      {selected && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
          <div className={`bg-white w-[1100px] max-w-[95%] rounded shadow-lg overflow-hidden flex flex-col max-h-[90vh] ${isManageMode ? 'ring-4 ring-orange-300' : ''}`}>
            {/* Header */}
            <div className={`px-4 py-3 border-b flex items-center justify-between flex-shrink-0 ${isManageMode ? 'bg-orange-50' : 'bg-white'}`}>
              <div>
                <div className="text-sm text-gray-500">OE号: {selected.oeNumber} | Parts号: {selected.partsNumber}</div>
                <div className="text-lg font-bold">{selected.standardName}</div>
              </div>
              <div className="flex items-center space-x-2">
                {isAdmin && (
                  <button
                    onClick={() => setIsManageMode(!isManageMode)}
                    className={`px-3 py-1 rounded text-xs font-black transition-all ${isManageMode ? 'bg-orange-600 text-white' : 'bg-gray-200 text-gray-600'}`}
                  >
                    <i className={`fa-solid ${isManageMode ? 'fa-screwdriver-wrench' : 'fa-eye'}`}></i>
                  </button>
                )}
                <button onClick={() => setSelected(null)} className="px-3 py-1 text-sm">关闭</button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto p-4">
              {/* Top: Image + Basic Info */}
              <div className={`grid ${isManageMode ? 'grid-cols-2' : 'grid-cols-2'} gap-4 mb-4`}>
                {/* Image Section */}
                <div className="relative">
                  <img src={selected.imageUrl} alt="" className="w-full h-48 object-contain bg-gray-50 p-4 rounded" />
                  {isManageMode && isAdmin && (
                    <button
                      onClick={() => {
                        setTempImagePath(selected.imageUrl || '');
                        setEditingImagePathPartId(selected.id);
                      }}
                      className="absolute bottom-2 right-2 px-3 py-1 bg-blue-600 text-white text-[10px] font-bold rounded hover:bg-blue-500 shadow-lg transition-all"
                    >
                      <i className="fa-solid fa-image mr-1"></i>修改图片路径
                    </button>
                  )}
                </div>

                {/* Basic Info */}
                <div className="space-y-2">
                  {isManageMode ? (
                    <>
                      <div>
                        <label className="text-xs font-semibold text-gray-600">原厂名称</label>
                        <input type="text" value={selected.originalName} onChange={(e) => handleUpdatePart('originalName', e.target.value)} className="w-full px-2 py-1 text-sm border rounded" />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-xs font-semibold text-gray-600">车型</label>
                          <input type="text" value={selected.carModel || ''} onChange={(e) => handleUpdatePart('carModel', e.target.value)} className="w-full px-2 py-1 text-sm border rounded" />
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-gray-600">品牌</label>
                          <input type="text" value={selected.brand || ''} onChange={(e) => handleUpdatePart('brand', e.target.value)} className="w-full px-2 py-1 text-sm border rounded" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-xs font-semibold text-gray-600">数量</label>
                          <input type="text" value={selected.quantity || ''} onChange={(e) => handleUpdatePart('quantity', e.target.value)} className="w-full px-2 py-1 text-sm border rounded" />
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-gray-600">来源</label>
                          <input type="text" value={selected.origin || ''} onChange={(e) => handleUpdatePart('origin', e.target.value)} className="w-full px-2 py-1 text-sm border rounded" />
                        </div>
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-gray-600">位置</label>
                        <input type="text" value={selected.position || ''} onChange={(e) => handleUpdatePart('position', e.target.value)} className="w-full px-2 py-1 text-sm border rounded" />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-gray-600">备注</label>
                        <textarea value={selected.note || ''} onChange={(e) => handleUpdatePart('note', e.target.value)} className="w-full px-2 py-1 text-sm border rounded" rows={2}></textarea>
                      </div>
                    </>
                  ) : (
                    <>
                      <p className="text-sm text-gray-600">原厂名称：{selected.originalName}</p>
                      <p className="text-sm text-gray-600">车型：{selected.carModel} ({selected.model})</p>
                      <p className="text-sm text-gray-600">品牌：{selected.brand}</p>
                      <p className="text-sm text-gray-600">数量：{selected.quantity}</p>
                      <p className="text-sm text-gray-600">来源：{selected.origin}</p>
                      <p className="text-sm text-gray-600">位置：{selected.position}</p>
                      <p className="text-sm text-gray-600">备注：{selected.note}</p>
                    </>
                  )}
                </div>
              </div>

              {/* Sub-Tabs Panel: Price Records / Replacement Parts / Adaptable Models */}
              <div className="border-t pt-3">
                <div className={`flex border-b mb-3 ${isManageMode ? 'bg-orange-50' : 'bg-gray-50'}`}>
                  {(['price', 'replace', 'applicable'] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveDetailTab(tab)}
                      className={`flex-1 py-2 text-[11px] font-bold uppercase tracking-widest rounded-t transition-all ${
                        activeDetailTab === tab
                          ? (isManageMode ? 'bg-orange-500 text-white' : 'bg-white text-blue-600 shadow-sm border-b-2 border-blue-600')
                          : 'text-gray-400 hover:text-gray-600'
                      }`}
                    >
                      {tab === 'price' ? '价格详情' : tab === 'replace' ? '替换零件' : '适配车型'}
                    </button>
                  ))}
                </div>

                {/* Price Records Tab */}
                {activeDetailTab === 'price' && (
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-[11px] font-bold text-gray-500">价格信息维护</span>
                      {isManageMode && isAdmin && (
                        <button onClick={handleAddPriceRecord} className="text-[11px] font-bold text-orange-600 hover:underline">
                          + 添加报价
                        </button>
                      )}
                    </div>
                    <div className="overflow-auto max-h-[300px]">
                      <table className="w-full text-[11px] text-left border-collapse">
                        <thead className="sticky top-0 bg-gray-50 text-gray-500 z-10">
                          <tr>
                            <th className="px-2 py-2 border-b">品牌</th>
                            <th className="px-2 py-2 border-b">厂商</th>
                            <th className="px-2 py-2 border-b">说明</th>
                            <th className="px-2 py-2 border-b text-right">进价(未含税)</th>
                            <th className="px-2 py-2 border-b text-right">进价(含税)</th>
                            <th className="px-2 py-2 border-b text-right">销售价(未含税)</th>
                            <th className="px-2 py-2 border-b text-right text-blue-600">销售价(含税)</th>
                            <th className="px-2 py-2 border-b text-center w-14">单位</th>
                            {isManageMode && isAdmin && <th className="px-2 py-2 border-b w-8"></th>}
                          </tr>
                        </thead>
                        <tbody>
                          {(selected.priceRecords || []).map((pr, i) => (
                            <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                              <td className="px-2 py-2">
                                {isManageMode && isAdmin ? (
                                  <input className="w-full border border-orange-200 rounded px-1 py-0.5 text-[11px]" value={pr.brand}
                                    onChange={(e) => handleUpdateArrayItem('priceRecords', i, 'brand', e.target.value)} />
                                ) : pr.brand}
                              </td>
                              <td className="px-2 py-2">
                                {isManageMode && isAdmin ? (
                                  <input className="w-full border border-orange-200 rounded px-1 py-0.5 text-[11px]" value={pr.manufacturer}
                                    onChange={(e) => handleUpdateArrayItem('priceRecords', i, 'manufacturer', e.target.value)} />
                                ) : pr.manufacturer}
                              </td>
                              <td className="px-2 py-2">
                                {isManageMode && isAdmin ? (
                                  <input className="w-full border border-orange-200 rounded px-1 py-0.5 text-[11px]" value={pr.description}
                                    onChange={(e) => handleUpdateArrayItem('priceRecords', i, 'description', e.target.value)} />
                                ) : pr.description}
                              </td>
                              <td className="px-2 py-2 text-right">
                                {isManageMode && isAdmin ? (
                                  <input type="number" className="w-full text-right border border-orange-200 rounded px-1 py-0.5 text-[11px]" value={pr.costExclTax}
                                    onChange={(e) => handleUpdateArrayItem('priceRecords', i, 'costExclTax', parseFloat(e.target.value) || 0)} />
                                ) : `¥${(pr.costExclTax ?? 0).toFixed(2)}`}
                              </td>
                              <td className="px-2 py-2 text-right">
                                {isManageMode && isAdmin ? (
                                  <input type="number" className="w-full text-right border border-orange-200 rounded px-1 py-0.5 text-[11px]" value={pr.costInclTax}
                                    onChange={(e) => handleUpdateArrayItem('priceRecords', i, 'costInclTax', parseFloat(e.target.value) || 0)} />
                                ) : `¥${(pr.costInclTax ?? 0).toFixed(2)}`}
                              </td>
                              <td className="px-2 py-2 text-right">
                                {isManageMode && isAdmin ? (
                                  <input type="number" className="w-full text-right border border-orange-200 rounded px-1 py-0.5 text-[11px]" value={pr.saleExclTax}
                                    onChange={(e) => handleUpdateArrayItem('priceRecords', i, 'saleExclTax', parseFloat(e.target.value) || 0)} />
                                ) : `¥${(pr.saleExclTax ?? 0).toFixed(2)}`}
                              </td>
                              <td className="px-2 py-2 text-right font-bold text-blue-700">
                                {isManageMode && isAdmin ? (
                                  <input type="number" className="w-full text-right border border-orange-200 rounded px-1 py-0.5 text-[11px]" value={pr.saleInclTax}
                                    onChange={(e) => handleUpdateArrayItem('priceRecords', i, 'saleInclTax', parseFloat(e.target.value) || 0)} />
                                ) : `¥${(pr.saleInclTax ?? 0).toFixed(2)}`}
                              </td>
                              <td className="px-2 py-2 text-center">
                                {isManageMode && isAdmin ? (
                                  <input className="w-full text-center border border-orange-200 rounded px-1 py-0.5 text-[11px]" value={pr.unit || 'RMB'}
                                    onChange={(e) => handleUpdateArrayItem('priceRecords', i, 'unit', e.target.value)} />
                                ) : (pr.unit || 'RMB')}
                              </td>
                              {isManageMode && isAdmin && (
                                <td className="px-2 py-2 text-center">
                                  <button onClick={() => handleRemoveArrayItem('priceRecords', i)} className="text-red-400 hover:text-red-600">
                                    <i className="fa-solid fa-times"></i>
                                  </button>
                                </td>
                              )}
                            </tr>
                          ))}
                          {(!selected.priceRecords || selected.priceRecords.length === 0) && (
                            <tr><td colSpan={isManageMode && isAdmin ? 9 : 8} className="px-2 py-4 text-center text-gray-400 text-xs">暂无价格信息</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Replacement Parts Tab */}
                {activeDetailTab === 'replace' && (
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-[11px] font-bold text-gray-500">替换零件信息维护</span>
                      {isManageMode && isAdmin && (
                        <button onClick={handleAddReplacementPart} className="text-[11px] font-bold text-orange-600 hover:underline">
                          + 添加替换零件
                        </button>
                      )}
                    </div>
                    <div className="overflow-auto max-h-[300px]">
                      <table className="w-full text-[11px] text-left border-collapse">
                        <thead className="sticky top-0 bg-gray-50 text-gray-500 z-10">
                          <tr>
                            <th className="px-2 py-2 border-b">品牌</th>
                            <th className="px-2 py-2 border-b">原厂OE号</th>
                            <th className="px-2 py-2 border-b">替换OE号</th>
                            <th className="px-2 py-2 border-b">备注</th>
                            <th className="px-2 py-2 border-b text-right">进价(未含税)</th>
                            <th className="px-2 py-2 border-b text-right">进价(含税)</th>
                            <th className="px-2 py-2 border-b text-right">售价(未含税)</th>
                            <th className="px-2 py-2 border-b text-right text-blue-600">售价(含税)</th>
                            <th className="px-2 py-2 border-b text-center w-14">单位</th>
                            {isManageMode && isAdmin && <th className="px-2 py-2 border-b w-8"></th>}
                          </tr>
                        </thead>
                        <tbody>
                          {(selected.replacementParts || []).map((rp, i) => (
                            <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                              <td className="px-2 py-2">
                                {isManageMode && isAdmin ? (
                                  <input className="w-full border border-orange-200 rounded px-1 py-0.5 text-[11px]" value={rp.brand}
                                    onChange={(e) => handleUpdateArrayItem('replacementParts', i, 'brand', e.target.value)} />
                                ) : rp.brand}
                              </td>
                              <td className="px-2 py-2 font-mono">
                                {isManageMode && isAdmin ? (
                                  <input className="w-full border border-orange-200 rounded px-1 py-0.5 text-[11px]" value={rp.originalOe}
                                    onChange={(e) => handleUpdateArrayItem('replacementParts', i, 'originalOe', e.target.value)} />
                                ) : rp.originalOe}
                              </td>
                              <td className="px-2 py-2 font-mono font-bold text-emerald-600">
                                {isManageMode && isAdmin ? (
                                  <input className="w-full border border-orange-200 rounded px-1 py-0.5 text-[11px]" value={rp.replacementOe}
                                    onChange={(e) => handleUpdateArrayItem('replacementParts', i, 'replacementOe', e.target.value)} />
                                ) : rp.replacementOe}
                              </td>
                              <td className="px-2 py-2">
                                {isManageMode && isAdmin ? (
                                  <input className="w-full border border-orange-200 rounded px-1 py-0.5 text-[11px]" value={rp.note}
                                    onChange={(e) => handleUpdateArrayItem('replacementParts', i, 'note', e.target.value)} />
                                ) : rp.note}
                              </td>
                              <td className="px-2 py-2 text-right">
                                {isManageMode && isAdmin ? (
                                  <input type="number" className="w-full text-right border border-orange-200 rounded px-1 py-0.5 text-[11px]" value={rp.costExclTax}
                                    onChange={(e) => handleUpdateArrayItem('replacementParts', i, 'costExclTax', parseFloat(e.target.value) || 0)} />
                                ) : `¥${(rp.costExclTax ?? 0).toFixed(2)}`}
                              </td>
                              <td className="px-2 py-2 text-right">
                                {isManageMode && isAdmin ? (
                                  <input type="number" className="w-full text-right border border-orange-200 rounded px-1 py-0.5 text-[11px]" value={rp.costInclTax}
                                    onChange={(e) => handleUpdateArrayItem('replacementParts', i, 'costInclTax', parseFloat(e.target.value) || 0)} />
                                ) : `¥${(rp.costInclTax ?? 0).toFixed(2)}`}
                              </td>
                              <td className="px-2 py-2 text-right">
                                {isManageMode && isAdmin ? (
                                  <input type="number" className="w-full text-right border border-orange-200 rounded px-1 py-0.5 text-[11px]" value={rp.saleExclTax}
                                    onChange={(e) => handleUpdateArrayItem('replacementParts', i, 'saleExclTax', parseFloat(e.target.value) || 0)} />
                                ) : `¥${(rp.saleExclTax ?? 0).toFixed(2)}`}
                              </td>
                              <td className="px-2 py-2 text-right font-bold text-blue-700">
                                {isManageMode && isAdmin ? (
                                  <input type="number" className="w-full text-right border border-orange-200 rounded px-1 py-0.5 text-[11px]" value={rp.saleInclTax}
                                    onChange={(e) => handleUpdateArrayItem('replacementParts', i, 'saleInclTax', parseFloat(e.target.value) || 0)} />
                                ) : `¥${(rp.saleInclTax ?? 0).toFixed(2)}`}
                              </td>
                              <td className="px-2 py-2 text-center">
                                {isManageMode && isAdmin ? (
                                  <input className="w-full text-center border border-orange-200 rounded px-1 py-0.5 text-[11px]" value={rp.unit || 'RMB'}
                                    onChange={(e) => handleUpdateArrayItem('replacementParts', i, 'unit', e.target.value)} />
                                ) : (rp.unit || 'RMB')}
                              </td>
                              {isManageMode && isAdmin && (
                                <td className="px-2 py-2 text-center">
                                  <button onClick={() => handleRemoveArrayItem('replacementParts', i)} className="text-red-400 hover:text-red-600">
                                    <i className="fa-solid fa-times"></i>
                                  </button>
                                </td>
                              )}
                            </tr>
                          ))}
                          {(!selected.replacementParts || selected.replacementParts.length === 0) && (
                            <tr><td colSpan={isManageMode && isAdmin ? 10 : 9} className="px-2 py-4 text-center text-gray-400 text-xs">暂无替换零件信息</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Adaptable Models Tab */}
                {activeDetailTab === 'applicable' && (
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-[11px] font-bold text-gray-500">适配车型信息维护</span>
                      {isManageMode && isAdmin && (
                        <button onClick={handleAddAdaptableModel} className="text-[11px] font-bold text-orange-600 hover:underline">
                          + 添加适配车型
                        </button>
                      )}
                    </div>
                    <div className="overflow-auto max-h-[300px]">
                      <table className="w-full text-[11px] text-left border-collapse">
                        <thead className="sticky top-0 bg-gray-50 text-gray-500 z-10">
                          <tr>
                            <th className="px-2 py-2 border-b">品牌</th>
                            <th className="px-2 py-2 border-b">地区</th>
                            <th className="px-2 py-2 border-b">车型名称</th>
                            <th className="px-2 py-2 border-b">生产日期</th>
                            <th className="px-2 py-2 border-b">车型代码</th>
                            <th className="px-2 py-2 border-b text-right">进价(未含税)</th>
                            <th className="px-2 py-2 border-b text-right">进价(含税)</th>
                            <th className="px-2 py-2 border-b text-right">售价(未含税)</th>
                            <th className="px-2 py-2 border-b text-right text-blue-600">售价(含税)</th>
                            <th className="px-2 py-2 border-b text-center w-14">单位</th>
                            {isManageMode && isAdmin && <th className="px-2 py-2 border-b w-8"></th>}
                          </tr>
                        </thead>
                        <tbody>
                          {(selected.adaptableModels || []).map((am, i) => (
                            <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                              <td className="px-2 py-2">
                                {isManageMode && isAdmin ? (
                                  <input className="w-full border border-orange-200 rounded px-1 py-0.5 text-[11px]" value={am.brand}
                                    onChange={(e) => handleUpdateArrayItem('adaptableModels', i, 'brand', e.target.value)} />
                                ) : am.brand}
                              </td>
                              <td className="px-2 py-2">
                                {isManageMode && isAdmin ? (
                                  <input className="w-full border border-orange-200 rounded px-1 py-0.5 text-[11px]" value={am.region}
                                    onChange={(e) => handleUpdateArrayItem('adaptableModels', i, 'region', e.target.value)} />
                                ) : am.region}
                              </td>
                              <td className="px-2 py-2 font-bold">
                                {isManageMode && isAdmin ? (
                                  <input className="w-full border border-orange-200 rounded px-1 py-0.5 text-[11px]" value={am.modelName}
                                    onChange={(e) => handleUpdateArrayItem('adaptableModels', i, 'modelName', e.target.value)} />
                                ) : am.modelName}
                              </td>
                              <td className="px-2 py-2 font-mono">
                                {isManageMode && isAdmin ? (
                                  <input className="w-full border border-orange-200 rounded px-1 py-0.5 text-[11px]" value={am.productionDate}
                                    onChange={(e) => handleUpdateArrayItem('adaptableModels', i, 'productionDate', e.target.value)} />
                                ) : am.productionDate}
                              </td>
                              <td className="px-2 py-2 font-mono text-gray-500">
                                {isManageMode && isAdmin ? (
                                  <input className="w-full border border-orange-200 rounded px-1 py-0.5 text-[11px]" value={am.modelCode}
                                    onChange={(e) => handleUpdateArrayItem('adaptableModels', i, 'modelCode', e.target.value)} />
                                ) : am.modelCode}
                              </td>
                              <td className="px-2 py-2 text-right">
                                {isManageMode && isAdmin ? (
                                  <input type="number" className="w-full text-right border border-orange-200 rounded px-1 py-0.5 text-[11px]" value={am.costExclTax}
                                    onChange={(e) => handleUpdateArrayItem('adaptableModels', i, 'costExclTax', parseFloat(e.target.value) || 0)} />
                                ) : `¥${(am.costExclTax ?? 0).toFixed(2)}`}
                              </td>
                              <td className="px-2 py-2 text-right">
                                {isManageMode && isAdmin ? (
                                  <input type="number" className="w-full text-right border border-orange-200 rounded px-1 py-0.5 text-[11px]" value={am.costInclTax}
                                    onChange={(e) => handleUpdateArrayItem('adaptableModels', i, 'costInclTax', parseFloat(e.target.value) || 0)} />
                                ) : `¥${(am.costInclTax ?? 0).toFixed(2)}`}
                              </td>
                              <td className="px-2 py-2 text-right">
                                {isManageMode && isAdmin ? (
                                  <input type="number" className="w-full text-right border border-orange-200 rounded px-1 py-0.5 text-[11px]" value={am.saleExclTax}
                                    onChange={(e) => handleUpdateArrayItem('adaptableModels', i, 'saleExclTax', parseFloat(e.target.value) || 0)} />
                                ) : `¥${(am.saleExclTax ?? 0).toFixed(2)}`}
                              </td>
                              <td className="px-2 py-2 text-right font-bold text-blue-700">
                                {isManageMode && isAdmin ? (
                                  <input type="number" className="w-full text-right border border-orange-200 rounded px-1 py-0.5 text-[11px]" value={am.saleInclTax}
                                    onChange={(e) => handleUpdateArrayItem('adaptableModels', i, 'saleInclTax', parseFloat(e.target.value) || 0)} />
                                ) : `¥${(am.saleInclTax ?? 0).toFixed(2)}`}
                              </td>
                              <td className="px-2 py-2 text-center">
                                {isManageMode && isAdmin ? (
                                  <input className="w-full text-center border border-orange-200 rounded px-1 py-0.5 text-[11px]" value={am.unit || 'RMB'}
                                    onChange={(e) => handleUpdateArrayItem('adaptableModels', i, 'unit', e.target.value)} />
                                ) : (am.unit || 'RMB')}
                              </td>
                              {isManageMode && isAdmin && (
                                <td className="px-2 py-2 text-center">
                                  <button onClick={() => handleRemoveArrayItem('adaptableModels', i)} className="text-red-400 hover:text-red-600">
                                    <i className="fa-solid fa-times"></i>
                                  </button>
                                </td>
                              )}
                            </tr>
                          ))}
                          {(!selected.adaptableModels || selected.adaptableModels.length === 0) && (
                            <tr><td colSpan={isManageMode && isAdmin ? 11 : 10} className="px-2 py-4 text-center text-gray-400 text-xs">暂无适配车型信息</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

              {/* Management Section */}
              {isManageMode && isAdmin && (
                <div className="border-t pt-4 mt-4 space-y-3">
                  {modifiedParts.has(selected.id) && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded p-3 text-xs text-yellow-800">
                      <div className="flex items-start space-x-2 mb-2">
                        <i className="fa-solid fa-exclamation-triangle mt-0.5"></i>
                        <span><strong>该零件已修改</strong> - 有待保存的更改</span>
                      </div>
                      <button
                        onClick={handleSaveModifications}
                        className="inline-block px-4 py-2 bg-yellow-600 text-white rounded text-xs font-bold hover:bg-yellow-700"
                      >
                        <i className="fa-solid fa-floppy-disk mr-1"></i>保存修改到服务器
                      </button>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-3 gap-3">
                    <button
                      onClick={handleSaveModifications}
                      className={`px-3 py-2 bg-green-600 text-white rounded text-xs font-semibold hover:bg-green-700 ${!modifiedParts.has(selected.id) ? 'opacity-50' : ''}`}
                    >
                      <i className="fa-solid fa-floppy-disk mr-1"></i>保存修改
                    </button>
                    <button
                      onClick={openCategorySelector}
                      className="px-3 py-2 bg-blue-500 text-white rounded text-xs font-semibold hover:bg-blue-600"
                    >
                      <i className="fa-solid fa-sitemap mr-1"></i>绑定分类
                    </button>
                    <button
                      onClick={handleDeletePart}
                      className="px-3 py-2 bg-red-500 text-white rounded text-xs font-semibold hover:bg-red-600"
                    >
                      <i className="fa-solid fa-trash mr-1"></i>删除零件
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Image Path Edit Modal */}
      {editingImagePathPartId && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setEditingImagePathPartId(null)} />
          <div className="relative bg-white w-full max-w-md rounded-xl shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b flex items-center justify-between bg-gray-50">
              <h3 className="text-sm font-bold text-gray-800">修改零件图片路径</h3>
              <button onClick={() => setEditingImagePathPartId(null)} className="text-gray-400 hover:text-gray-600">
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
            <div className="p-6">
              <label className="block text-[11px] font-bold text-gray-500 uppercase mb-2">图片 URL 路径</label>
              <textarea 
                className="w-full h-24 p-3 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none font-mono"
                value={tempImagePath}
                onChange={(e) => setTempImagePath(e.target.value)}
                placeholder="https://example.com/image.png"
              />
              <div className="mt-4 flex space-x-3">
                <button 
                  onClick={() => setEditingImagePathPartId(null)}
                  className="flex-1 py-2 text-xs font-bold text-gray-500 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  取消
                </button>
                <button 
                  onClick={() => {
                    handleUpdatePart('imageUrl', tempImagePath);
                    setEditingImagePathPartId(null);
                  }}
                  className="flex-[2] py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-lg shadow-lg transition-colors"
                >
                  保存修改
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Category Selector Modal - Hierarchy Based */}
      {showCategorySelector && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
          <div className="bg-white w-[700px] max-w-[95%] rounded shadow-lg p-6 overflow-auto max-h-[85vh]">
            <h2 className="text-lg font-bold mb-1">绑定零部件分类</h2>
            <p className="text-xs text-gray-400 mb-4">按层级依次选择：品牌 → 地区 → 型号 → 发布日期 → 代码 → 主类目 → 子类目</p>
            
            <div className="space-y-3">
              {/* Step 1: Brand Selection */}
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">
                  <span className="inline-block w-5 h-5 bg-blue-600 text-white text-[10px] rounded-full text-center leading-5 mr-1">1</span>
                  选择品牌
                </label>
                <select 
                  value={bindBrandId} 
                  onChange={(e) => handleBindBrandSelect(e.target.value)} 
                  className="w-full px-3 py-2 text-sm border rounded focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="">请选择品牌</option>
                  {apiBrands.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
                {bindHierarchyLoading && <span className="text-xs text-blue-500 ml-1">加载层级数据...</span>}
              </div>

              {/* Step 2: Region Selection (if has regions) */}
              {bindHierarchy && bindHasRegions && (
                <div className="animate-in fade-in duration-200">
                  <label className="block text-xs font-bold text-gray-500 mb-1">
                    <span className="inline-block w-5 h-5 bg-blue-600 text-white text-[10px] rounded-full text-center leading-5 mr-1">2</span>
                    选择地区
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {bindRegions.map((r: any) => (
                      <button
                        key={r.regionName}
                        onClick={() => { setBindRegion(r.regionName); setBindModel(null); setBindDate(null); setBindCode(null); setBindMainCategories([]); setBindSubCategories([]); setSelectedBindMainCategory(''); setSelectedBindSubCategory(''); }}
                        className={`px-3 py-1.5 text-xs font-bold rounded-full border transition-all ${
                          bindRegion === r.regionName
                            ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                            : 'bg-white text-gray-600 border-gray-200 hover:border-blue-400 hover:text-blue-600'
                        }`}
                      >
                        {r.regionName}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 3: Model Selection */}
              {(bindHierarchy && (!bindHasRegions || bindRegion)) && (
                <div className="animate-in fade-in duration-200">
                  <label className="block text-xs font-bold text-gray-500 mb-1">
                    <span className="inline-block w-5 h-5 bg-blue-600 text-white text-[10px] rounded-full text-center leading-5 mr-1">{bindHasRegions ? '3' : '2'}</span>
                    选择型号
                  </label>
                  <div className="flex flex-wrap gap-2 max-h-[120px] overflow-y-auto">
                    {(bindModels || []).map((m: any) => (
                      <button
                        key={m.modelName}
                        onClick={() => { setBindModel(m.modelName); setBindDate(null); setBindCode(null); setBindMainCategories([]); setBindSubCategories([]); setSelectedBindMainCategory(''); setSelectedBindSubCategory(''); }}
                        className={`px-3 py-1.5 text-xs font-bold rounded-full border transition-all ${
                          bindModel === m.modelName
                            ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                            : 'bg-white text-gray-600 border-gray-200 hover:border-blue-400 hover:text-blue-600'
                        }`}
                      >
                        {m.modelName}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 4: Release/Date Selection (if has releases) */}
              {bindModel && bindHasReleases && (
                <div className="animate-in fade-in duration-200">
                  <label className="block text-xs font-bold text-gray-500 mb-1">
                    <span className="inline-block w-5 h-5 bg-blue-600 text-white text-[10px] rounded-full text-center leading-5 mr-1">{bindHasRegions ? '4' : '3'}</span>
                    选择发布日期
                  </label>
                  <div className="flex flex-wrap gap-2 max-h-[120px] overflow-y-auto">
                    {bindReleases.map((r: any) => (
                      <button
                        key={r.period}
                        onClick={() => { setBindDate(r.period); setBindCode(null); setBindMainCategories([]); setBindSubCategories([]); setSelectedBindMainCategory(''); setSelectedBindSubCategory(''); }}
                        className={`px-3 py-1.5 text-xs font-bold rounded-full border transition-all ${
                          bindDate === r.period
                            ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                            : 'bg-white text-gray-600 border-gray-200 hover:border-blue-400 hover:text-blue-600'
                        }`}
                      >
                        {r.period}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 5: Code Selection */}
              {bindModel && (!bindHasReleases || bindDate) && (
                <div className="animate-in fade-in duration-200">
                  <label className="block text-xs font-bold text-gray-500 mb-1">
                    <span className="inline-block w-5 h-5 bg-blue-600 text-white text-[10px] rounded-full text-center leading-5 mr-1">
                      {bindHasRegions ? (bindHasReleases ? '5' : '4') : (bindHasReleases ? '4' : '3')}
                    </span>
                    选择代码
                  </label>
                  <div className="flex flex-wrap gap-2 max-h-[120px] overflow-y-auto">
                    {bindCodes.map((c: string) => (
                      <button
                        key={c}
                        onClick={() => handleBindCodeSelect(c)}
                        className={`px-3 py-1.5 text-xs font-mono font-bold rounded-full border transition-all ${
                          bindCode === c
                            ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                            : 'bg-white text-gray-600 border-gray-200 hover:border-blue-400 hover:text-blue-600'
                        }`}
                      >
                        {c}
                      </button>
                    ))}
                    {bindCodes.length === 0 && (
                      <span className="text-xs text-gray-400">该层级无可用代码</span>
                    )}
                  </div>
                </div>
              )}

              {/* Step 6: Main Category Selection */}
              {bindCode && (
                <div className="animate-in fade-in duration-200">
                  <label className="block text-xs font-bold text-gray-500 mb-1">
                    <span className="inline-block w-5 h-5 bg-green-600 text-white text-[10px] rounded-full text-center leading-5 mr-1">
                      {bindHasRegions ? (bindHasReleases ? '6' : '5') : (bindHasReleases ? '5' : '4')}
                    </span>
                    选择主类目 (Main Category)
                  </label>
                  {bindMainLoading ? (
                    <span className="text-xs text-blue-500">加载主类目...</span>
                  ) : (
                    <div className="flex flex-wrap gap-2 max-h-[120px] overflow-y-auto">
                      {bindMainCategories.map(cat => (
                        <button
                          key={cat.id}
                          onClick={() => handleBindMainSelect(cat.id)}
                          className={`px-3 py-1.5 text-xs font-bold rounded-full border transition-all ${
                            selectedBindMainCategory === cat.id
                              ? 'bg-green-600 text-white border-green-600 shadow-md'
                              : 'bg-white text-gray-600 border-gray-200 hover:border-green-400 hover:text-green-600'
                          }`}
                        >
                          {cat.icon && <i className={`fa-solid ${cat.icon} mr-1`}></i>}
                          {cat.name}
                        </button>
                      ))}
                      {bindMainCategories.length === 0 && (
                        <span className="text-xs text-gray-400">该代码下无主类目</span>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Step 7: Sub Category Selection */}
              {selectedBindMainCategory && (
                <div className="animate-in fade-in duration-200">
                  <label className="block text-xs font-bold text-gray-500 mb-1">
                    <span className="inline-block w-5 h-5 bg-green-600 text-white text-[10px] rounded-full text-center leading-5 mr-1">
                      {bindHasRegions ? (bindHasReleases ? '7' : '6') : (bindHasReleases ? '6' : '5')}
                    </span>
                    选择子类目 (Sub Category)
                  </label>
                  {bindSubLoading ? (
                    <span className="text-xs text-blue-500">加载子类目...</span>
                  ) : (
                    <div className="flex flex-wrap gap-2 max-h-[120px] overflow-y-auto">
                      {bindSubCategories.map(cat => (
                        <button
                          key={cat.id}
                          onClick={() => setSelectedBindSubCategory(cat.id)}
                          className={`px-3 py-1.5 text-xs font-bold rounded-full border transition-all ${
                            selectedBindSubCategory === cat.id
                              ? 'bg-green-600 text-white border-green-600 shadow-md'
                              : 'bg-white text-gray-600 border-gray-200 hover:border-green-400 hover:text-green-600'
                          }`}
                        >
                          {cat.code} - {cat.name}
                        </button>
                      ))}
                      {bindSubCategories.length === 0 && (
                        <span className="text-xs text-gray-400">该主类目下无子类目</span>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Current Selection Path */}
              {bindBrandId && (
                <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-xs">
                  <span className="font-bold text-blue-700">当前路径：</span>
                  <span className="text-gray-600">
                    {apiBrands.find(b => b.id === bindBrandId)?.name || ''}
                    {bindRegion ? ` > ${bindRegion}` : ''}
                    {bindModel ? ` > ${bindModel}` : ''}
                    {bindDate ? ` > ${bindDate}` : ''}
                    {bindCode ? ` > ${bindCode}` : ''}
                    {selectedBindMainCategory ? ` > ${bindMainCategories.find(c => c.id === selectedBindMainCategory)?.name || ''}` : ''}
                    {selectedBindSubCategory ? ` > ${bindSubCategories.find(c => c.id === selectedBindSubCategory)?.name || ''}` : ''}
                  </span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center space-x-2 pt-4 border-t">
                <button
                  onClick={handleBindCategory}
                  disabled={!canBind}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all"
                >
                  <i className="fa-solid fa-link mr-1"></i>绑定分类
                </button>
                <button
                  onClick={() => setShowCategorySelector(false)}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded font-semibold hover:bg-gray-300 transition-all"
                >
                  取消
                </button>
              </div>

              {/* Add New Part Option */}
              <div className="border-t pt-4">
                <h3 className="text-sm font-semibold mb-2">或在此分类下添加新零件</h3>
                <button
                  onClick={handleAddNewPart}
                  disabled={!canBind}
                  className="w-full px-4 py-2 bg-green-600 text-white rounded font-semibold hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all"
                >
                  <i className="fa-solid fa-plus mr-1"></i>添加新零件
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Excel导入弹窗 */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
          <div className="bg-white w-[800px] max-w-[95%] max-h-[90vh] rounded shadow-lg flex flex-col overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b flex items-center justify-between bg-indigo-50 flex-shrink-0">
              <div className="flex items-center space-x-2">
                <i className="fa-solid fa-file-import text-indigo-600 text-lg"></i>
                <h2 className="text-lg font-bold text-gray-800">Excel数据导入</h2>
              </div>
              <button onClick={handleCloseImport} className="text-gray-400 hover:text-gray-600">
                <i className="fa-solid fa-xmark text-lg"></i>
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto p-6">
              {/* Stage: Select File */}
              {importStage === 'select' && (
                <div className="flex flex-col items-center justify-center py-12 space-y-6">
                  <div className="w-24 h-24 bg-indigo-50 rounded-full flex items-center justify-center">
                    <i className="fa-solid fa-file-excel text-indigo-500 text-4xl"></i>
                  </div>
                  <div className="text-center space-y-2">
                    <h3 className="text-base font-bold text-gray-700">选择Excel文件导入零部件数据</h3>
                    <p className="text-xs text-gray-500 max-w-md">
                      支持 .xlsx / .xls 格式。文件需包含以下列：<br/>
                      <span className="font-mono text-indigo-600">OeNumber, PartsNumber, OriginalName, Quantity, CostInclTax(PriceRecords)</span>
                    </p>
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-left mt-3">
                      <p className="text-[11px] font-bold text-yellow-800 mb-2">导入规则：</p>
                      <ul className="text-[11px] text-yellow-700 space-y-1 list-disc list-inside">
                        <li>OeNumber与PartsNumber必须其中一个不为空</li>
                        <li>OriginalName不能为空</li>
                        <li>CostInclTax(AdaptableModels)与CostInclTax(PriceRecords)至少一个不为空</li>
                        <li>Quantity为空时默认为100</li>
                      </ul>
                    </div>
                  </div>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors shadow-lg flex items-center space-x-2"
                  >
                    <i className="fa-solid fa-upload"></i>
                    <span>选择Excel文件</span>
                  </button>
                </div>
              )}

              {/* Stage: Validating */}
              {importStage === 'validating' && (
                <div className="flex flex-col items-center justify-center py-16 space-y-4">
                  <div className="animate-spin w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full"></div>
                  <p className="text-sm text-gray-600">正在解析Excel文件并验证数据...</p>
                </div>
              )}

              {/* Stage: Checking Duplicates */}
              {importStage === 'duplicates' && (
                <div className="flex flex-col items-center justify-center py-16 space-y-4">
                  <div className="animate-spin w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full"></div>
                  <p className="text-sm text-gray-600">正在检查重复零部件...</p>
                  <p className="text-xs text-gray-400">正在对比已有数据</p>
                </div>
              )}

              {/* Stage: Confirm / Show Results */}
              {(importStage === 'confirm' || importStage === 'done') && (
                <div className="space-y-4">
                  {/* Summary */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-green-700">{importRows.length}</div>
                      <div className="text-[11px] text-green-600">有效数据行</div>
                    </div>
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-red-700">{importErrors.length}</div>
                      <div className="text-[11px] text-red-600">校验失败行</div>
                    </div>
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-yellow-700">{importDuplicates.length}</div>
                      <div className="text-[11px] text-yellow-600">重复零部件</div>
                    </div>
                  </div>

                  {/* Import Result */}
                  {importStage === 'done' && importResult && (
                    <div className={`rounded-lg p-4 border ${importResult.message.includes('失败') ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-200'}`}>
                      <div className="flex items-start space-x-3">
                        <i className={`fa-solid ${importResult.message.includes('失败') ? 'fa-circle-exclamation text-red-500' : 'fa-circle-check text-blue-500'} text-lg mt-0.5`}></i>
                        <div>
                          <h4 className="font-bold text-sm text-gray-800">导入结果</h4>
                          <p className="text-xs text-gray-600 mt-1">{importResult.message}</p>
                          <div className="flex items-center space-x-4 mt-2 text-[11px]">
                            <span className="text-green-600 font-semibold">新增: {importResult.added}</span>
                            <span className="text-blue-600 font-semibold">更新: {importResult.updated}</span>
                            <span className="text-gray-500 font-semibold">跳过: {importResult.skipped}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Error Rows */}
                  {importErrors.length > 0 && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <h4 className="text-sm font-bold text-red-800 mb-2 flex items-center">
                        <i className="fa-solid fa-triangle-exclamation mr-2"></i>
                        校验失败 ({importErrors.length}行) - 以下数据将跳过导入
                      </h4>
                      <div className="max-h-[120px] overflow-auto">
                        <table className="w-full text-[11px]">
                          <thead>
                            <tr className="text-red-600">
                              <th className="text-left py-1 w-16">行号</th>
                              <th className="text-left py-1">原因</th>
                            </tr>
                          </thead>
                          <tbody>
                            {importErrors.map((err, i) => (
                              <tr key={i} className="border-t border-red-100">
                                <td className="py-1 font-mono">{err.row}</td>
                                <td className="py-1">{err.reason}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Duplicate Rows */}
                  {importDuplicates.length > 0 && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-bold text-yellow-800 flex items-center">
                          <i className="fa-solid fa-clone mr-2"></i>
                          发现重复零部件 ({importDuplicates.length}行)
                        </h4>
                        <div className="flex items-center space-x-2">
                          <button onClick={() => toggleAllOverwrite(true)} className="text-[10px] px-2 py-1 bg-yellow-200 text-yellow-800 rounded hover:bg-yellow-300">全选覆盖</button>
                          <button onClick={() => toggleAllOverwrite(false)} className="text-[10px] px-2 py-1 bg-gray-200 text-gray-600 rounded hover:bg-gray-300">全不覆盖</button>
                        </div>
                      </div>
                      <p className="text-[11px] text-yellow-700 mb-2">勾选"覆盖"将更新已有零件数据，不勾选则跳过该行</p>
                      <div className="max-h-[200px] overflow-auto">
                        <table className="w-full text-[11px]">
                          <thead>
                            <tr className="text-yellow-700">
                              <th className="text-left py-1 w-16">行号</th>
                              <th className="text-left py-1">OE号</th>
                              <th className="text-left py-1">零件号</th>
                              <th className="text-left py-1">名称</th>
                              <th className="text-left py-1">已存在ID</th>
                              <th className="text-center py-1 w-16">覆盖</th>
                            </tr>
                          </thead>
                          <tbody>
                            {importDuplicates.map((dup) => {
                              const row = importRows.find(r => r.rowIndex === dup.rowIndex);
                              if (!row) return null;
                              return (
                                <tr key={dup.rowIndex} className="border-t border-yellow-100">
                                  <td className="py-1 font-mono">{row.excelRow}</td>
                                  <td className="py-1 font-mono text-[10px]">{row.oeNumber || '-'}</td>
                                  <td className="py-1 font-mono text-[10px]">{row.partsNumber || '-'}</td>
                                  <td className="py-1 max-w-[150px] truncate">{row.originalName}</td>
                                  <td className="py-1 font-mono text-[10px] text-gray-500">
                                    {dup.existingParts.map(p => p.id).join(', ')}
                                  </td>
                                  <td className="py-1 text-center">
                                    <input
                                      type="checkbox"
                                      checked={importOverwriteMap[dup.rowIndex] || false}
                                      onChange={() => toggleOverwrite(dup.rowIndex)}
                                      className="w-4 h-4 accent-yellow-600"
                                    />
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Valid Rows Preview */}
                  {importRows.length > 0 && (
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <h4 className="text-sm font-bold text-gray-700 mb-2 flex items-center">
                        <i className="fa-solid fa-list-check mr-2"></i>
                        待导入数据预览 ({importRows.length}行)
                      </h4>
                      <div className="max-h-[200px] overflow-auto">
                        <table className="w-full text-[11px]">
                          <thead>
                            <tr className="text-gray-500">
                              <th className="text-left py-1">行号</th>
                              <th className="text-left py-1">车型</th>
                              <th className="text-left py-1">OE号</th>
                              <th className="text-left py-1">零件号</th>
                              <th className="text-left py-1">名称</th>
                              <th className="text-center py-1">数量</th>
                              <th className="text-right py-1">含税价</th>
                              <th className="text-left py-1">品牌</th>
                              <th className="text-center py-1">状态</th>
                            </tr>
                          </thead>
                          <tbody>
                            {importRows.map((row) => {
                              const isDup = importDuplicates.some(d => d.rowIndex === row.rowIndex);
                              const willOverwrite = importOverwriteMap[row.rowIndex];
                              return (
                                <tr key={row.rowIndex} className="border-t border-gray-100">
                                  <td className="py-1 font-mono">{row.excelRow}</td>
                                  <td className="py-1">{row.carModel || '-'}</td>
                                  <td className="py-1 font-mono text-[10px]">{row.oeNumber || '-'}</td>
                                  <td className="py-1 font-mono text-[10px]">{row.partsNumber || '-'}</td>
                                  <td className="py-1 max-w-[180px] truncate">{row.originalName}</td>
                                  <td className="py-1 text-center">{row.quantity}</td>
                                  <td className="py-1 text-right">¥{row.costInclTaxPrice || row.costInclTaxAdaptable || 0}</td>
                                  <td className="py-1">{row.brand || '-'}</td>
                                  <td className="py-1 text-center">
                                    {isDup ? (
                                      willOverwrite ? (
                                        <span className="text-[10px] bg-yellow-200 text-yellow-800 px-1.5 py-0.5 rounded">覆盖更新</span>
                                      ) : (
                                        <span className="text-[10px] bg-gray-200 text-gray-500 px-1.5 py-0.5 rounded">跳过</span>
                                      )
                                    ) : (
                                      <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded">新增</span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Stage: Importing */}
              {importStage === 'importing' && (
                <div className="flex flex-col items-center justify-center py-16 space-y-4">
                  <div className="animate-spin w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full"></div>
                  <p className="text-sm text-gray-600">正在导入数据到服务器...</p>
                  <p className="text-xs text-gray-400">请稍候</p>
                </div>
              )}
            </div>

            {/* Footer */}
            {(importStage === 'confirm' || importStage === 'done') && (
              <div className="px-6 py-4 border-t bg-gray-50 flex items-center justify-end space-x-3 flex-shrink-0">
                {importStage === 'confirm' && importRows.length > 0 && (
                  <button
                    onClick={handleImportExecute}
                    className="px-6 py-2 bg-indigo-600 text-white rounded font-semibold hover:bg-indigo-700 transition-colors flex items-center space-x-2"
                  >
                    <i className="fa-solid fa-cloud-upload-alt"></i>
                    <span>确认导入 ({importRows.filter(r => {
                      const isDup = importDuplicates.some(d => d.rowIndex === r.rowIndex);
                      return !isDup || importOverwriteMap[r.rowIndex];
                    }).length}条)</span>
                  </button>
                )}
                <button
                  onClick={handleCloseImport}
                  className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded font-semibold hover:bg-gray-100 transition-colors"
                >
                  {importStage === 'done' ? '关闭' : '取消'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {pendingAction && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
          <div className="bg-white rounded shadow-lg p-6 max-w-sm">
            <h2 className="text-lg font-bold mb-4">{pendingAction.title}</h2>
            <div className="bg-gray-50 p-3 rounded mb-4 text-sm text-gray-600">
              {pendingAction.type === 'DELETE' && `确定要删除零件 "${pendingAction.data.standardName}" 吗？此操作不可撤销。`}
              {pendingAction.type === 'BIND_CATEGORY' && (
                <div>
                  <p className="mb-2">确定要将此零件绑定到以下分类路径吗？</p>
                  {pendingAction.data.hierarchy && (
                    <div className="text-xs text-blue-700 font-mono bg-white p-2 rounded border border-blue-100">
                      {pendingAction.data.hierarchy.brand}
                      {` > ${pendingAction.data.hierarchy.region}`}
                      {` > ${pendingAction.data.hierarchy.model}`}
                      {` > ${pendingAction.data.hierarchy.date}`}
                      {` > ${pendingAction.data.hierarchy.code}`}
                      {` > ${pendingAction.data.hierarchy.mainCategory}`}
                      {` > ${pendingAction.data.hierarchy.subCategory}`}
                    </div>
                  )}
                </div>
              )}
              {pendingAction.type === 'ADD_PART' && `确定要在选定的分类下添加新零件 "${pendingAction.data.standardName}" 吗？`}
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={pendingAction.action}
                className={`flex-1 px-4 py-2 text-white rounded font-semibold ${
                  pendingAction.type === 'DELETE' ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                确认
              </button>
              <button
                onClick={() => setPendingAction(null)}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded font-semibold hover:bg-gray-300"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchParts;

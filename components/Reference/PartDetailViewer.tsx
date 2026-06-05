
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { SubCategory, Part, PriceRecord, ReplacementPart, AdaptableModel, CartItem } from '../types';
import { PARTS_MOCK } from '../data';

interface PartDetailViewerProps {
  subCategory: SubCategory;
  onAddToCart: (item: CartItem) => void;
  isAdmin?: boolean;
}

interface PendingAction {
  type: 'SAVE' | 'DELETE' | 'SUB_REMOVE';
  data: any;
  action: () => void;
  title: string;
}

const PartDetailViewer: React.FC<PartDetailViewerProps> = ({ subCategory, onAddToCart, isAdmin = false }) => {
  // Mode State
  const [isManageMode, setIsManageMode] = useState(false);
  
  // Data State
  const [localParts, setLocalParts] = useState<Part[]>(PARTS_MOCK);
  // Initialize background image with the sub-category's current image URL
  const [bgImage, setBgImage] = useState<string>(subCategory.image); 
  
  // Selection State
  const [selectedPart, setSelectedPart] = useState<Part | null>(null);
  const [selectedPrice, setSelectedPrice] = useState<PriceRecord | null>(null);
  const [activeTab, setActiveTab] = useState<'price' | 'replace' | 'applicable'>('price');
  const [adaptableBrandFilter, setAdaptableBrandFilter] = useState('全部');

  // Confirmation State
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);

  // Image Path Editing State
  const [editingImagePathPartId, setEditingImagePathPartId] = useState<string | null>(null);
  const [tempImagePath, setTempImagePath] = useState('');
  
  // Derive the current living version of the selected part from localParts
  const currentPart = useMemo(() => 
    localParts.find(p => p.id === selectedPart?.id) || null
  , [localParts, selectedPart]);
  
  // UI Layout State (Resizable Panels)
  const [leftWidthPercent, setLeftWidthPercent] = useState(33.33);
  const [isResizing, setIsResizing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Zoom and Search
  const [zoom, setZoom] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDraggingPart, setIsDraggingPart] = useState(false);
  
  const diagramRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setSelectedPrice(null);
  }, [selectedPart]);

  // Resizing logic for columns
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing || !containerRef.current) return;
      
      const containerRect = containerRef.current.getBoundingClientRect();
      let newLeftWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100;
      
      if (newLeftWidth < 25) newLeftWidth = 25;
      if (newLeftWidth > 50) newLeftWidth = 50;
      
      setLeftWidthPercent(newLeftWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    } else {
      document.body.style.cursor = 'default';
      document.body.style.userSelect = 'auto';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  // Filter parts by current subCategory.id AND search query
  const filteredParts = useMemo(() => {
    return localParts.filter(p => 
      p.subCategoryId === subCategory.id && (
        p.standardName.includes(searchQuery) || 
        p.oeNumber.includes(searchQuery) || 
        p.position.includes(searchQuery)
      )
    );
  }, [localParts, searchQuery, subCategory.id]);

  // Coordinate Management (Dragging markers on diagram)
  const handleMouseDownPart = (e: React.MouseEvent, partId: string) => {
    if (!isManageMode) return;
    setIsDraggingPart(true);
    
    const startX = e.clientX;
    const startY = e.clientY;
    const part = localParts.find(p => p.id === partId);
    if (!part) return;

    const initialX = part.x || 0;
    const initialY = part.y || 0;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const rect = diagramRef.current?.getBoundingClientRect();
      if (!rect) return;
      
      const deltaX = ((moveEvent.clientX - startX) / rect.width) * 100 / zoom;
      const deltaY = ((moveEvent.clientY - startY) / rect.height) * 100 / zoom;
      
      setLocalParts(prev => prev.map(p => 
        p.id === partId ? { 
          ...p, 
          x: Math.max(0, Math.min(100, initialX + deltaX)), 
          y: Math.max(0, Math.min(100, initialY + deltaY)) 
        } : p
      ));
    };

    const onMouseUp = () => {
      setIsDraggingPart(false);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  const handleAddPart = () => {
    const newPart: Part = {
      id: Date.now().toString(),
      subCategoryId: subCategory.id,
      position: '00000',
      oeNumber: 'OE-000-000',
      standardName: '新零件',
      originalName: 'New Part',
      quantity: '01',
      note: '',
      date: '',
      x: 50,
      y: 50,
      imageUrl: 'https://img.icons8.com/fluency/144/package.png',
      priceRecords: [],
      replacementParts: [],
      adaptableModels: []
    };
    setLocalParts([...localParts, newPart]);
    setSelectedPart(newPart);
  };

  const handleDeletePart = (id: string) => {
    const part = localParts.find(p => p.id === id);
    if (!part) return;

    setPendingAction({
      type: 'DELETE',
      title: '确认删除零配件',
      data: part,
      action: () => {
        setLocalParts(localParts.filter(p => p.id !== id));
        if (selectedPart?.id === id) setSelectedPart(null);
        setPendingAction(null);
      }
    });
  };

  const handleUpdatePartField = (id: string, field: keyof Part, value: any) => {
    setLocalParts(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  const handleAddSubItem = (type: 'price' | 'replace' | 'applicable') => {
    if (!currentPart) return;
    setLocalParts(prev => prev.map(p => {
      if (p.id !== currentPart.id) return p;
      if (type === 'price') {
        const newItem: PriceRecord = { brand: '', manufacturer: '', description: '', costExclTax: 0, costInclTax: 0, saleExclTax: 0, saleInclTax: 0 };
        return { ...p, priceRecords: [...(p.priceRecords || []), newItem] };
      } else if (type === 'replace') {
        const newItem: ReplacementPart = { brand: '', originalOe: p.oeNumber, replacementOe: '', note: '' };
        return { ...p, replacementParts: [...(p.replacementParts || []), newItem] };
      } else {
        const newItem: AdaptableModel = { brand: '', region: '', modelName: '', productionDate: '', modelCode: '' };
        return { ...p, adaptableModels: [...(p.adaptableModels || []), newItem] };
      }
    }));
  };

  const handleUpdateSubItem = (type: 'price' | 'replace' | 'applicable', index: number, field: string, value: any) => {
    if (!currentPart) return;
    setLocalParts(prev => prev.map(p => {
      if (p.id !== currentPart.id) return p;
      const copy = { ...p };
      if (type === 'price' && copy.priceRecords) {
        const list = [...copy.priceRecords];
        (list[index] as any)[field] = value;
        copy.priceRecords = list;
      } else if (type === 'replace' && copy.replacementParts) {
        const list = [...copy.replacementParts];
        (list[index] as any)[field] = value;
        copy.replacementParts = list;
      } else if (type === 'applicable' && copy.adaptableModels) {
        const list = [...copy.adaptableModels];
        (list[index] as any)[field] = value;
        copy.adaptableModels = list;
      }
      return copy;
    }));
  };

  const handleRemoveSubItem = (type: 'price' | 'replace' | 'applicable', index: number) => {
    if (!currentPart) return;
    
    let subItem: any = null;
    let title = '';

    if (type === 'price') {
      subItem = currentPart.priceRecords![index];
      title = '确认删除价格记录';
    } else if (type === 'replace') {
      subItem = currentPart.replacementParts![index];
      title = '确认删除替换件';
    } else if (type === 'applicable') {
      subItem = currentPart.adaptableModels![index];
      title = '确认删除适用车型';
    }

    setPendingAction({
      type: 'SUB_REMOVE',
      title,
      data: subItem,
      action: () => {
        setLocalParts(prev => prev.map(p => {
          if (p.id !== currentPart.id) return p;
          const copy = { ...p };
          if (type === 'price' && copy.priceRecords) copy.priceRecords = copy.priceRecords.filter((_, i) => i !== index);
          else if (type === 'replace' && copy.replacementParts) copy.replacementParts = copy.replacementParts.filter((_, i) => i !== index);
          else if (type === 'applicable' && copy.adaptableModels) copy.adaptableModels = copy.adaptableModels.filter((_, i) => i !== index);
          return copy;
        }));
        setPendingAction(null);
      }
    });
  };

  const handleBgUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => setBgImage(event.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleFinalSave = () => {
    // 1. Identify modified or new parts compared to initial PARTS_MOCK
    const modifiedParts = localParts.filter(current => {
      const original = PARTS_MOCK.find(p => p.id === current.id);
      if (!original) return true; // It's a brand new part added during this session
      return JSON.stringify(current) !== JSON.stringify(original); // Data has changed
    });

    // 2. Identify deleted parts
    const deletedPartIds = PARTS_MOCK
      .filter(original => !localParts.find(p => p.id === original.id))
      .map(p => p.id);

    // 3. Construct the payload for confirmation
    const compositeData: any = {
      UPDATED_PARTS: modifiedParts,
      DELETED_PART_IDS: deletedPartIds
    };

    // 4. Check for sub-category changes (image background)
    if (bgImage !== subCategory.image) {
      compositeData.SUB_CATEGORIES_UPDATE = {
        id: subCategory.id,
        name: subCategory.name,
        new_background_image: bgImage.startsWith('data:') ? '[Base64 Data]' : bgImage,
        full_image_data: bgImage 
      };
    }

    setPendingAction({
      type: 'SAVE',
      title: '确认提交变更数据',
      data: compositeData,
      action: () => {
        setIsManageMode(false);
        setPendingAction(null);
        alert('变更数据已成功同步到系统内存。');
      }
    });
  };

  return (
    <div className={`flex flex-col h-full bg-white overflow-hidden ${isManageMode ? 'ring-4 ring-orange-500/20' : ''}`}>
      {/* Top Controls */}
      <div className={`px-4 py-2 border-b flex items-center justify-between shadow-sm z-30 ${isManageMode ? 'bg-orange-50' : 'bg-white'}`}>
        <div className="flex items-center space-x-3">
          <span className="text-sm font-bold text-gray-800 flex items-center">
            <i className={`fa-solid ${isManageMode ? 'fa-screwdriver-wrench text-orange-500' : 'fa-diagram-project text-blue-500'} mr-2`}></i>
            {subCategory.code} {subCategory.name}
          </span>
          {isManageMode && (
            <div className="flex items-center space-x-2 border-l border-gray-200 pl-3 ml-2">
              <button onClick={handleAddPart} className="px-3 py-1 bg-white border border-orange-200 text-orange-600 text-[11px] font-bold rounded hover:bg-orange-500 hover:text-white transition-all">
                <i className="fa-solid fa-plus mr-1"></i>新增零件
              </button>
              {currentPart && (
                <button 
                  onClick={() => {
                    console.log('Top bar image button clicked', currentPart.id);
                    setTempImagePath(currentPart.imageUrl || '');
                    setEditingImagePathPartId(currentPart.id);
                  }} 
                  className="px-3 py-1 bg-white border border-blue-200 text-blue-600 text-[11px] font-bold rounded hover:bg-blue-500 hover:text-white transition-all"
                >
                  <i className="fa-solid fa-link mr-1"></i>修改零件图片
                </button>
              )}
              <button onClick={() => fileInputRef.current?.click()} className="px-3 py-1 bg-white border border-gray-200 text-gray-600 text-[11px] font-bold rounded hover:bg-gray-100 transition-all">
                <i className="fa-solid fa-image mr-1"></i>更换背景图
              </button>
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleBgUpload} />
            </div>
          )}
        </div>
        
        <div className="flex items-center space-x-4">
           {/* Mode Switcher - Only visible to Admins */}
           {isAdmin && (
             <div className="flex items-center space-x-1 bg-gray-100 p-1 rounded-lg border border-gray-200">
               <button onClick={() => setIsManageMode(false)} className={`px-4 py-1 rounded text-[11px] font-black transition-all ${!isManageMode ? 'bg-blue-600 text-white shadow-md' : 'text-gray-400'}`}>浏览模式</button>
               <button onClick={() => setIsManageMode(true)} className={`px-4 py-1 rounded text-[11px] font-black transition-all ${isManageMode ? 'bg-orange-600 text-white shadow-md' : 'text-gray-400'}`}>管理模式</button>
             </div>
           )}
           <div className="relative">
             <input type="text" placeholder="搜索零件..." className="pl-3 pr-8 py-1.5 text-xs border border-gray-200 rounded w-48 focus:ring-1 focus:ring-blue-500 outline-none" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
             <i className="fa-solid fa-search absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 text-[10px]"></i>
           </div>
        </div>
      </div>

      {/* Main Resizable Body Container */}
      <div className="flex-1 flex overflow-hidden" ref={containerRef}>
        
        {/* Left Diagram Section */}
        <div 
          className="relative bg-[#fdfdfd] border-r border-gray-200 overflow-hidden flex flex-col"
          style={{ width: `${leftWidthPercent}%` }}
        >
          <div className="flex-1 relative overflow-auto custom-scrollbar" ref={diagramRef}>
            <div className="absolute top-4 right-4 flex flex-col space-y-1 z-20">
              <button onClick={() => setZoom(z => Math.min(z + 0.2, 3))} className="w-8 h-8 bg-white/90 border border-gray-200 rounded flex items-center justify-center hover:bg-white shadow-sm transition-all"><i className="fa-solid fa-plus text-xs text-gray-600"></i></button>
              <button onClick={() => setZoom(z => Math.max(z - 0.2, 0.5))} className="w-8 h-8 bg-white/90 border border-gray-200 rounded flex items-center justify-center hover:bg-white shadow-sm transition-all"><i className="fa-solid fa-minus text-xs text-gray-600"></i></button>
            </div>

            <div 
              className="relative w-full h-full min-h-[600px] flex items-center justify-center transition-transform duration-200 ease-out origin-center" 
              style={{ transform: `scale(${zoom})` }}
            >
              <div className="relative w-full h-full bg-white">
                {bgImage && (
                  <img 
                    src={bgImage} 
                    className="absolute inset-0 w-full h-full object-cover opacity-70 pointer-events-none" 
                    alt="Technical Diagram" 
                  />
                )}
                
                <svg className="absolute inset-0 w-full h-full opacity-[0.03] pointer-events-none">
                  <pattern id="diagramGrid" width="5%" height="5%" patternUnits="userSpaceOnUse">
                    <path d="M 50 0 L 0 0 0 50" fill="none" stroke="gray" strokeWidth="0.5"/>
                  </pattern>
                  <rect width="100%" height="100%" fill="url(#diagramGrid)" />
                </svg>

                {filteredParts.map((part) => (
                    <div key={part.id} className="absolute" style={{ left: `${part.x}%`, top: `${part.y}%` }} onMouseDown={(e) => handleMouseDownPart(e, part.id)}>
                      <div className={`relative flex flex-col items-center justify-center transition-all duration-300 ${isDraggingPart ? 'cursor-grabbing' : isManageMode ? 'cursor-grab' : 'cursor-pointer'} ${selectedPart?.id === part.id ? 'scale-110' : 'hover:scale-105'}`} onClick={() => !isDraggingPart && setSelectedPart(part)}>
                        <div className="absolute -top-10 left-1/2 -translate-x-1/2 flex flex-col items-center">
                          <div className={`px-2 py-0.5 text-[11px] font-black border-2 rounded transition-all whitespace-nowrap shadow-sm ${selectedPart?.id === part.id ? (isManageMode ? 'bg-orange-600 border-orange-700' : 'bg-blue-600 border-blue-700') + ' text-white' : 'bg-white text-gray-800 border-gray-300 group-hover:border-blue-400'}`}>{part.position}</div>
                          <div className={`w-[2px] h-6 ${selectedPart?.id === part.id ? (isManageMode ? 'bg-orange-600' : 'bg-blue-600') : 'bg-gray-400'}`}></div>
                          <div className={`w-2 h-2 rounded-full -mt-1 ${selectedPart?.id === part.id ? (isManageMode ? 'bg-orange-600 ring-4 ring-orange-100' : 'bg-blue-600 ring-4 ring-blue-100') : 'bg-gray-400'}`}></div>
                        </div>
                        <div className={`w-24 h-24 bg-white/40 backdrop-blur-[2px] rounded-xl border-2 flex items-center justify-center p-2 transition-all ${selectedPart?.id === part.id ? (isManageMode ? 'border-orange-500 shadow-2xl scale-105' : 'border-blue-500 shadow-2xl') : 'border-transparent hover:bg-white/60 hover:border-blue-200'}`}>
                          <img src={part.imageUrl} alt="" className="w-full h-full object-contain" />
                        </div>
                      </div>
                    </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Divider Bar */}
        <div 
          onMouseDown={() => setIsResizing(true)}
          className={`w-1.5 flex-shrink-0 cursor-col-resize hover:bg-blue-400 transition-colors z-40 flex items-center justify-center ${isResizing ? 'bg-blue-600' : 'bg-gray-200'}`}
        >
          <div className="h-10 w-[1px] bg-white/30"></div>
        </div>

        {/* Right Data Panel Section */}
        <div 
          className={`flex flex-col bg-white border-l shadow-xl z-10 overflow-hidden ${isManageMode ? 'border-orange-200' : 'border-gray-200'}`}
          style={{ width: `${100 - leftWidthPercent}%`}}
        >
          <div className="flex-1 overflow-auto custom-scrollbar">
            <table className="w-full text-left border-collapse table-fixed min-w-[600px]">
              <thead className={`sticky top-0 text-[10px] font-black z-20 border-b ${isManageMode ? 'bg-orange-100 text-orange-700' : 'bg-gray-50 text-gray-500'}`}>
                <tr>
                  <th className="w-12 px-2 py-3 text-center">位置</th>
                  <th className="w-24 px-2 py-3">零件OE号</th>
                  <th className="w-24 px-2 py-3">标准名称</th>
                  <th className="w-24 px-2 py-3">原厂名称</th>
                  <th className="w-10 px-2 py-3 text-center">数量</th>
                  <th className="w-20 px-2 py-3">备注</th>
                  <th className="w-16 px-2 py-3">日期</th>
                  <th className="w-12 px-2 py-3 text-center">操作</th>
                </tr>
              </thead>
              <tbody className="text-[11px]">
                {filteredParts.map(part => (
                  <tr key={part.id} onClick={() => setSelectedPart(part)} className={`cursor-pointer border-b border-gray-50 transition-all ${selectedPart?.id === part.id ? (isManageMode ? 'bg-orange-50' : 'bg-blue-50') + ' border-l-4 ' + (isManageMode ? 'border-l-orange-500' : 'border-l-blue-500') : 'hover:bg-gray-50 border-l-4 border-l-transparent'}`}>
                    <td className="px-1 py-3 text-center">
                      {isManageMode && selectedPart?.id === part.id ? <input className="w-full text-center border-orange-200 rounded" value={part.position} onChange={e => handleUpdatePartField(part.id, 'position', e.target.value)} /> : part.position}
                    </td>
                    <td className="px-1 py-3 font-mono font-bold text-blue-700 truncate">
                      {isManageMode && selectedPart?.id === part.id ? <input className="w-full border-orange-200 rounded" value={part.oeNumber} onChange={e => handleUpdatePartField(part.id, 'oeNumber', e.target.value)} /> : part.oeNumber}
                    </td>
                    <td className="px-1 py-3 font-bold truncate">
                      {isManageMode && selectedPart?.id === part.id ? <input className="w-full border-orange-200 rounded" value={part.standardName} onChange={e => handleUpdatePartField(part.id, 'standardName', e.target.value)} /> : part.standardName}
                    </td>
                    <td className="px-1 py-3 text-gray-500 truncate">
                      {isManageMode && selectedPart?.id === part.id ? <input className="w-full border-orange-200 rounded" value={part.originalName} onChange={e => handleUpdatePartField(part.id, 'originalName', e.target.value)} /> : part.originalName}
                    </td>
                    <td className="px-1 py-3 text-center">
                      {isManageMode && selectedPart?.id === part.id ? <input className="w-full text-center border-orange-200 rounded" value={part.quantity} onChange={e => handleUpdatePartField(part.id, 'quantity', e.target.value)} /> : part.quantity}
                    </td>
                    <td className="px-1 py-3 truncate">
                      {isManageMode && selectedPart?.id === part.id ? <input className="w-full border-orange-200 rounded" value={part.note} onChange={e => handleUpdatePartField(part.id, 'note', e.target.value)} /> : part.note}
                    </td>
                    <td className="px-1 py-3 text-gray-400">
                      {isManageMode && selectedPart?.id === part.id ? <input className="w-full border-orange-200 rounded" value={part.date} onChange={e => handleUpdatePartField(part.id, 'date', e.target.value)} /> : part.date}
                    </td>
                    <td className="px-1 py-3 text-center">
                      {isManageMode ? (
                        <div className="flex items-center justify-center space-x-2">
                          <button 
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              console.log('Table image button clicked', part.id);
                              setTempImagePath(part.imageUrl || '');
                              setEditingImagePathPartId(part.id);
                            }} 
                            className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-full transition-all hover:scale-110"
                            title="修改图片路径"
                          >
                            <i className="fa-solid fa-image"></i>
                          </button>
                          <button 
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              handleDeletePart(part.id); 
                            }} 
                            className="p-1.5 text-red-500 hover:bg-red-50 rounded-full transition-all hover:scale-110"
                            title="删除零件"
                          >
                            <i className="fa-solid fa-trash"></i>
                          </button>
                        </div>
                      ) : (
                        <i className={`fa-solid fa-chevron-right text-gray-200 ${selectedPart?.id === part.id ? 'text-blue-500' : ''}`}></i>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Sub-Tabs Panel Section */}
          <div className="h-[400px] border-t-2 flex flex-col bg-white shadow-inner flex-shrink-0">
            <div className={`flex border-b p-1 ${isManageMode ? 'bg-orange-50' : 'bg-gray-50'}`}>
               {['price', 'replace', 'applicable'].map((tab) => (
                  <button key={tab} onClick={() => setActiveTab(tab as any)} className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded transition-all ${activeTab === tab ? (isManageMode ? 'bg-orange-500 text-white' : 'bg-white text-blue-600 shadow-sm') : 'text-gray-400 hover:text-gray-600'}`}>
                    {tab === 'price' ? '价格详情' : tab === 'replace' ? '替换件' : '适用车型'}
                  </button>
               ))}
            </div>

            <div className="flex-1 overflow-auto custom-scrollbar">
              {activeTab === 'price' && (
                <div className="p-0">
                  <div className="flex justify-between items-center px-4 py-2 border-b bg-gray-50/50">
                    <span className="text-[10px] font-bold text-gray-400 uppercase">价格信息维护</span>
                    {isManageMode && currentPart && <button onClick={() => handleAddSubItem('price')} className="text-[10px] font-bold text-orange-600 hover:underline">+ 添加报价</button>}
                  </div>
                  <table className="w-full text-[10px] text-left min-w-[500px]">
                    <thead className="sticky top-0 bg-white border-b border-gray-100 z-10 text-gray-400">
                      <tr>
                        <th className="px-2 py-3">品牌</th><th className="px-2 py-3">厂商</th><th className="px-2 py-3">说明</th>
                        <th className="px-2 py-3 text-right">进价(未含税)</th><th className="px-2 py-3 text-right">进价(含税)</th>
                        <th className="px-2 py-3 text-right">销售价(未含税)</th><th className="px-2 py-3 text-right font-black text-blue-600">销售价(含税)</th>
                        {isManageMode && <th className="w-8 px-2 py-3"></th>}
                      </tr>
                    </thead>
                    <tbody>
                      {currentPart?.priceRecords?.map((p, i) => (
                        <tr key={i} onClick={() => !isManageMode && setSelectedPrice(p)} className={`border-b border-gray-50 transition-all ${selectedPrice === p ? 'bg-blue-600 text-white' : 'hover:bg-blue-50'}`}>
                          <td className="px-2 py-3 font-bold">{isManageMode ? <input className="w-full bg-transparent border-b border-orange-200 outline-none" value={p.brand} onChange={e => handleUpdateSubItem('price', i, 'brand', e.target.value)} /> : p.brand}</td>
                          <td className="px-2 py-3">{isManageMode ? <input className="w-full bg-transparent border-b border-orange-200 outline-none" value={p.manufacturer} onChange={e => handleUpdateSubItem('price', i, 'manufacturer', e.target.value)} /> : p.manufacturer}</td>
                          <td className="px-2 py-3">{isManageMode ? <input className="w-full bg-transparent border-b border-orange-200 outline-none" value={p.description} onChange={e => handleUpdateSubItem('price', i, 'description', e.target.value)} /> : p.description}</td>
                          <td className="px-2 py-3 text-right">{isManageMode ? <input type="number" className="w-full text-right bg-transparent border-b border-orange-200 outline-none" value={p.costExclTax} onChange={e => handleUpdateSubItem('price', i, 'costExclTax', parseFloat(e.target.value))} /> : `¥${p.costExclTax.toFixed(2)}`}</td>
                          <td className="px-2 py-3 text-right">{isManageMode ? <input type="number" className="w-full text-right bg-transparent border-b border-orange-200 outline-none" value={p.costInclTax} onChange={e => handleUpdateSubItem('price', i, 'costInclTax', parseFloat(e.target.value))} /> : `¥${p.costInclTax.toFixed(2)}`}</td>
                          <td className="px-2 py-3 text-right">{isManageMode ? <input type="number" className="w-full text-right bg-transparent border-b border-orange-200 outline-none" value={p.saleExclTax} onChange={e => handleUpdateSubItem('price', i, 'saleExclTax', parseFloat(e.target.value))} /> : `¥${p.saleExclTax.toFixed(2)}`}</td>
                          <td className={`px-2 py-3 text-right font-bold ${selectedPrice === p ? 'text-white' : 'text-blue-700'}`}>{isManageMode ? <input type="number" className="w-full text-right bg-transparent border-b border-orange-200 outline-none" value={p.saleInclTax} onChange={e => handleUpdateSubItem('price', i, 'saleInclTax', parseFloat(e.target.value))} /> : `¥${p.saleInclTax.toFixed(2)}`}</td>
                          {isManageMode && <td className="px-2 py-3"><button onClick={() => handleRemoveSubItem('price', i)} className="text-red-400 hover:text-red-600"><i className="fa-solid fa-times"></i></button></td>}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {activeTab === 'replace' && (
                <div className="p-0">
                  <div className="flex justify-between items-center px-4 py-2 border-b bg-gray-50/50">
                    <span className="text-[10px] font-bold text-gray-400 uppercase">替换件信息维护</span>
                    {isManageMode && currentPart && <button onClick={() => handleAddSubItem('replace')} className="text-[10px] font-bold text-orange-600 hover:underline">+ 添加替换件</button>}
                  </div>
                  <table className="w-full text-[11px] text-left">
                    <thead className="bg-white border-b border-gray-100 text-gray-400">
                      <tr>
                        <th className="px-4 py-3">品牌</th><th className="px-4 py-3">原厂零件号</th><th className="px-4 py-3">替换零件号</th><th className="px-4 py-3">备注</th>
                        {isManageMode && <th className="w-8 px-4 py-3"></th>}
                      </tr>
                    </thead>
                    <tbody>
                      {currentPart?.replacementParts?.map((r, i) => (
                        <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                          <td className="px-4 py-3">{isManageMode ? <input className="w-full border-orange-200 rounded px-2 py-1 outline-none" value={r.brand} onChange={e => handleUpdateSubItem('replace', i, 'brand', e.target.value)} /> : r.brand}</td>
                          <td className="px-4 py-3 font-mono">{isManageMode ? <input className="w-full border-orange-200 rounded px-2 py-1 outline-none" value={r.originalOe} onChange={e => handleUpdateSubItem('replace', i, 'originalOe', e.target.value)} /> : r.originalOe}</td>
                          <td className="px-4 py-3 font-mono font-bold text-emerald-600">{isManageMode ? <input className="w-full border-orange-200 rounded px-2 py-1 outline-none" value={r.replacementOe} onChange={e => handleUpdateSubItem('replace', i, 'replacementOe', e.target.value)} /> : r.replacementOe}</td>
                          <td className="px-4 py-3 text-gray-500">{isManageMode ? <input className="w-full border-orange-200 rounded px-2 py-1 outline-none" value={r.note} onChange={e => handleUpdateSubItem('replace', i, 'note', e.target.value)} /> : r.note}</td>
                          {isManageMode && <td className="px-4 py-3"><button onClick={() => handleRemoveSubItem('replace', i)} className="text-red-400 hover:text-red-600"><i className="fa-solid fa-times"></i></button></td>}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {activeTab === 'applicable' && (
                <div className="flex flex-col h-full">
                  <div className="flex items-center space-x-2 px-4 py-2 border-b bg-gray-50">
                    {['全部', '丰田', '本田'].map(b => (
                      <button key={b} onClick={() => setAdaptableBrandFilter(b)} className={`px-3 py-1 text-[10px] font-bold rounded transition-all ${adaptableBrandFilter === b ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>{b}</button>
                    ))}
                    <div className="flex-1"></div>
                    {isManageMode && currentPart && <button onClick={() => handleAddSubItem('applicable')} className="text-[10px] font-bold text-orange-600 hover:underline">+ 添加适配车型</button>}
                  </div>
                  <table className="w-full text-[11px] text-left">
                    <thead className="bg-white border-b border-gray-100 text-gray-400 sticky top-0">
                      <tr>
                        <th className="px-4 py-3">品牌</th><th className="px-4 py-3">地区</th><th className="px-4 py-3">车型名称</th><th className="px-4 py-3">车辆生产日期</th><th className="px-4 py-3">车型代码</th>
                        {isManageMode && <th className="w-8 px-4 py-3"></th>}
                      </tr>
                    </thead>
                    <tbody>
                      {currentPart?.adaptableModels?.filter(m => adaptableBrandFilter === '全部' || m.brand === adaptableBrandFilter).map((m, i) => (
                        <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                          <td className="px-4 py-3">{isManageMode ? <input className="w-full border-orange-200 rounded px-2 py-1 outline-none" value={m.brand} onChange={e => handleUpdateSubItem('applicable', i, 'brand', e.target.value)} /> : m.brand}</td>
                          <td className="px-4 py-3">{isManageMode ? <input className="w-full border-orange-200 rounded px-2 py-1 outline-none" value={m.region} onChange={e => handleUpdateSubItem('applicable', i, 'region', e.target.value)} /> : m.region}</td>
                          <td className="px-4 py-3 font-bold">{isManageMode ? <input className="w-full border-orange-200 rounded px-2 py-1 outline-none" value={m.modelName} onChange={e => handleUpdateSubItem('applicable', i, 'modelName', e.target.value)} /> : m.modelName}</td>
                          <td className="px-4 py-3 font-mono">{isManageMode ? <input className="w-full border-orange-200 rounded px-2 py-1 outline-none" value={m.productionDate} onChange={e => handleUpdateSubItem('applicable', i, 'productionDate', e.target.value)} /> : m.productionDate}</td>
                          <td className="px-4 py-3 font-mono text-gray-500">{isManageMode ? <input className="w-full border-orange-200 rounded px-2 py-1 outline-none" value={m.modelCode} onChange={e => handleUpdateSubItem('applicable', i, 'modelCode', e.target.value)} /> : m.modelCode}</td>
                          {isManageMode && <td className="px-4 py-3"><button onClick={() => handleRemoveSubItem('applicable', i)} className="text-red-400 hover:text-red-600"><i className="fa-solid fa-times"></i></button></td>}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            
            {/* Footer Summary Section */}
            {currentPart && (
               <div className={`px-5 py-4 flex flex-col space-y-3 transition-colors flex-shrink-0 ${isManageMode ? 'bg-orange-900 text-white' : 'bg-[#1a202c] text-white'}`}>
                  <div className="flex justify-between items-center">
                    <div className="flex flex-col">
                      <span className="text-[9px] text-gray-500 font-black uppercase tracking-widest">{isManageMode ? '实时数据索引同步' : '当前选中零件'}</span>
                      <span className={`text-[12px] font-black font-mono tracking-tighter ${isManageMode ? 'text-orange-400' : 'text-blue-400'}`}>
                        {currentPart.oeNumber} {isManageMode && `[XY: ${currentPart.x?.toFixed(1)}%, ${currentPart.y?.toFixed(1)}%]`}
                        {isManageMode && (
                          <button 
                            onClick={() => {
                              console.log('Footer image button clicked', currentPart.id);
                              setTempImagePath(currentPart.imageUrl || '');
                              setEditingImagePathPartId(currentPart.id);
                            }}
                            className="ml-2 text-[10px] bg-orange-500/20 hover:bg-orange-500/40 px-2 py-0.5 rounded text-orange-300 transition-colors"
                          >
                            <i className="fa-solid fa-edit mr-1"></i>修改图片路径
                          </button>
                        )}
                      </span>
                    </div>
                    {!isManageMode && (
                      <div className="text-right">
                        <span className="text-[9px] text-gray-500 font-black uppercase tracking-widest">售价(含税)</span>
                        <div className="text-xl font-black">{selectedPrice ? `¥${selectedPrice.saleInclTax.toFixed(2)}` : '--'}</div>
                      </div>
                    )}
                  </div>
                  {isManageMode ? (
                    <div className="flex space-x-2">
                       <button onClick={handleFinalSave} className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-black uppercase tracking-widest rounded shadow-lg transition-all active:scale-95"><i className="fa-solid fa-check mr-2"></i>保存修改并返回浏览</button>
                       <button onClick={() => { setLocalParts(PARTS_MOCK); setBgImage(subCategory.image); }} className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-gray-300 text-[11px] font-black uppercase tracking-widest rounded">重置数据</button>
                    </div>
                  ) : (
                    <button onClick={() => selectedPrice && onAddToCart({ id: Math.random().toString(36).substr(2, 9), part: currentPart, selectedPrice: selectedPrice, timestamp: Date.now() })} disabled={!selectedPrice} className={`w-full py-3 text-[11px] font-black uppercase tracking-[0.2em] rounded transition-all active:scale-[0.98] ${selectedPrice ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/40' : 'bg-gray-800 text-gray-600 cursor-not-allowed'}`}>
                      {selectedPrice ? '加入采购单' : '请先在列表中选择报价'}
                    </button>
                  )}
               </div>
            )}
          </div>
        </div>
      </div>

      {/* Generic Confirmation Review Modal (JSON Based) */}
      {pendingAction && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setPendingAction(null)} />
          <div className="relative bg-[#1a202c] w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden border border-white/10 animate-in zoom-in duration-200">
            <div className={`px-6 py-4 flex items-center justify-between border-b border-white/5 ${
              pendingAction.type === 'DELETE' ? 'bg-red-500/10' : 'bg-emerald-500/10'
            }`}>
              <div className="flex items-center space-x-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  pendingAction.type === 'DELETE' ? 'bg-red-500 text-white' : 'bg-emerald-500 text-white'
                }`}>
                  <i className={`fa-solid ${
                    pendingAction.type === 'DELETE' ? 'fa-trash' : (pendingAction.type === 'SAVE' ? 'fa-shield-check' : 'fa-times')
                  } text-sm`}></i>
                </div>
                <div>
                  <h3 className="text-white text-sm font-black uppercase tracking-widest">
                    {pendingAction.title}
                  </h3>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">
                    Review dataset changes and structure details below
                  </p>
                </div>
              </div>
              <button onClick={() => setPendingAction(null)} className="text-gray-500 hover:text-white transition-colors">
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            <div className="p-6">
              <div className="bg-black/50 rounded-xl p-4 border border-white/5 overflow-auto max-h-[450px] custom-scrollbar">
                <pre className="text-emerald-400 font-mono text-[11px] leading-relaxed">
                  {JSON.stringify(pendingAction.data, null, 2)}
                </pre>
              </div>
              
              <div className="mt-6 flex space-x-3">
                <button 
                  onClick={() => setPendingAction(null)}
                  className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-gray-400 text-[11px] font-black uppercase tracking-widest rounded-lg border border-white/10 transition-all"
                >
                  取消 / Cancel
                </button>
                <button 
                  onClick={() => {
                    pendingAction.action();
                  }}
                  className={`flex-[1.5] py-3 text-white text-[11px] font-black uppercase tracking-widest rounded-lg shadow-xl transition-all active:scale-95 ${
                    pendingAction.type === 'DELETE' 
                      ? 'bg-red-600 hover:bg-red-500 shadow-red-900/40' 
                      : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/40'
                  }`}
                >
                  <i className={`fa-solid ${pendingAction.type === 'DELETE' ? 'fa-trash-can' : 'fa-check-double'} mr-2`}></i>
                  确认执行 / Execute Action
                </button>
              </div>
            </div>

            <div className="px-6 py-3 bg-black/30 border-t border-white/5">
              <p className="text-[9px] text-gray-500 font-medium text-center italic">
                注意：确认后此零件及类目背景的修改将应用到系统内存状态。
              </p>
            </div>
          </div>
        </div>
      )}
      {/* Image Path Edit Modal */}
      {editingImagePathPartId && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setEditingImagePathPartId(null)} />
          <div className="relative bg-white w-full max-w-md rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
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
                    handleUpdatePartField(editingImagePathPartId, 'imageUrl', tempImagePath);
                    setEditingImagePathPartId(null);
                  }}
                  className="flex-[2] py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-lg shadow-lg shadow-blue-200 transition-colors"
                >
                  保存修改
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PartDetailViewer;

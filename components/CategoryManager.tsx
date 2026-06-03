import React, { useState, useEffect } from 'react';
import { MainCategory, SubCategory, ModelInfo } from '../types';
import { MockApiClient } from '../services/repositoryClient';

interface CategoryManagerProps {
  selectedModel: ModelInfo | null;
}

const CategoryManager: React.FC<CategoryManagerProps> = ({ selectedModel }) => {
  const [mainCategories, setMainCategories] = useState<MainCategory[]>([]);
  const [subCategories, setSubCategories] = useState<SubCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // 获取数据
  useEffect(() => {
    if (selectedModel) {
      loadData();
    }
  }, [selectedModel]);

  const loadData = async () => {
    if (!selectedModel) return;
    
    setLoading(true);
    try {
      const mains = await MockApiClient.getMainCategoriesByVehicleCode(selectedModel.modelCode);
      setMainCategories(mains);
      
      // 获取所有子类目
      const allSubs: SubCategory[] = [];
      for (const main of mains) {
        const subs = await MockApiClient.getSubCategoriesByParentId(main.id);
        allSubs.push(...subs);
      }
      setSubCategories(allSubs);
    } catch (error) {
      showMessage('error', '获取数据失败');
      console.error('Load data error:', error);
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  // MainCategory CRUD操作
  const handleCreateMainCategory = async () => {
    if (!selectedModel) return;
    
    const newMain: MainCategory = {
      id: `m${Date.now()}_${selectedModel.modelCode}`,
      name: '新大类',
      icon: 'fa-box',
      vehicleCode: selectedModel.modelCode,
      isDefault: false,
      createdDate: new Date().toISOString(),
      lastUpdated: new Date().toISOString()
    };

    try {
      const result = await MockApiClient.createMainCategory(newMain);
      setMainCategories(prev => [...prev, result]);
      showMessage('success', '大类创建成功');
    } catch (error) {
      showMessage('error', '大类创建失败');
      console.error('Create main category error:', error);
    }
  };

  const handleUpdateMainCategory = async (main: MainCategory) => {
    try {
      const result = await MockApiClient.updateMainCategory(main);
      setMainCategories(prev => prev.map(m => m.id === result.id ? result : m));
      showMessage('success', '大类更新成功');
    } catch (error) {
      showMessage('error', '大类更新失败');
      console.error('Update main category error:', error);
    }
  };

  const handleDeleteMainCategory = async (mainId: string) => {
    if (!window.confirm('确定要删除这个大类吗？')) return;
    
    try {
      await MockApiClient.deleteMainCategory(mainId);
      setMainCategories(prev => prev.filter(m => m.id !== mainId));
      setSubCategories(prev => prev.filter(s => s.parentId !== mainId));
      showMessage('success', '大类删除成功');
    } catch (error) {
      showMessage('error', '大类删除失败');
      console.error('Delete main category error:', error);
    }
  };

  // SubCategory CRUD操作
  const handleCreateSubCategory = async (parentId: string) => {
    const newSub: SubCategory = {
      id: `s${Date.now()}`,
      name: '新子组',
      code: '0000(0000)',
      image: 'https://picsum.photos/seed/new/300/300',
      parentId: parentId,
      isDefault: false,
      createdDate: new Date().toISOString(),
      lastUpdated: new Date().toISOString()
    };

    try {
      const result = await MockApiClient.createSubCategory(newSub);
      setSubCategories(prev => [...prev, result]);
      showMessage('success', '子组创建成功');
    } catch (error) {
      showMessage('error', '子组创建失败');
      console.error('Create sub category error:', error);
    }
  };

  const handleUpdateSubCategory = async (sub: SubCategory) => {
    try {
      const result = await MockApiClient.updateSubCategory(sub);
      setSubCategories(prev => prev.map(s => s.id === result.id ? result : s));
      showMessage('success', '子组更新成功');
    } catch (error) {
      showMessage('error', '子组更新失败');
      console.error('Update sub category error:', error);
    }
  };

  const handleDeleteSubCategory = async (subId: string) => {
    if (!window.confirm('确定要删除这个子组吗？')) return;
    
    try {
      await MockApiClient.deleteSubCategory(subId);
      setSubCategories(prev => prev.filter(s => s.id !== subId));
      showMessage('success', '子组删除成功');
    } catch (error) {
      showMessage('error', '子组删除失败');
      console.error('Delete sub category error:', error);
    }
  };

  if (!selectedModel) {
    return (
      <div className="p-6 text-center text-gray-500">
        请先选择车型
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">分类管理</h2>
        <p className="text-gray-600">当前车型: {selectedModel.modelCode}</p>
      </div>

      {message && (
        <div className={`mb-4 p-4 rounded-lg ${
          message.type === 'success' 
            ? 'bg-green-100 text-green-800 border border-green-200' 
            : 'bg-red-100 text-red-800 border border-red-200'
        }`}>
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Main Categories Section */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-800">大类管理</h3>
            <button
              onClick={handleCreateMainCategory}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              添加大类
            </button>
          </div>
          
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {mainCategories.map(main => (
              <div key={main.id} className="border rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <i className={`fa-solid ${main.icon} text-lg`}></i>
                      <input
                        type="text"
                        value={main.name}
                        onChange={(e) => {
                          const updated = {...main, name: e.target.value};
                          setMainCategories(prev => prev.map(m => m.id === main.id ? updated : m));
                        }}
                        className="font-medium text-gray-800 bg-transparent border-b border-transparent hover:border-gray-300 focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                    <div className="text-sm text-gray-500">
                      ID: {main.id}
                    </div>
                    <div className="text-sm text-gray-500">
                      创建时间: {new Date(main.createdDate).toLocaleString()}
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleUpdateMainCategory(main)}
                      className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                    >
                      保存
                    </button>
                    <button
                      onClick={() => handleDeleteMainCategory(main.id)}
                      className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                    >
                      删除
                    </button>
                  </div>
                </div>
                
                {/* Sub Categories under this Main Category */}
                <div className="mt-4 pl-6 border-l-2 border-gray-200">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-700">子组列表</span>
                    <button
                      onClick={() => handleCreateSubCategory(main.id)}
                      className="px-2 py-1 bg-blue-100 text-blue-600 text-xs rounded hover:bg-blue-200"
                    >
                      添加子组
                    </button>
                  </div>
                  
                  <div className="space-y-2">
                    {subCategories
                      .filter(sub => sub.parentId === main.id)
                      .map(sub => (
                        <div key={sub.id} className="flex items-center space-x-2 bg-gray-50 p-2 rounded">
                          <img src={sub.image} alt={sub.name} className="w-8 h-8 rounded object-cover" />
                          <input
                            type="text"
                            value={sub.name}
                            onChange={(e) => {
                              const updated = {...sub, name: e.target.value};
                              setSubCategories(prev => prev.map(s => s.id === sub.id ? updated : s));
                            }}
                            className="flex-1 text-sm bg-transparent border-b border-transparent hover:border-gray-300 focus:border-blue-500 focus:outline-none"
                          />
                          <input
                            type="text"
                            value={sub.code}
                            onChange={(e) => {
                              const updated = {...sub, code: e.target.value};
                              setSubCategories(prev => prev.map(s => s.id === sub.id ? updated : s));
                            }}
                            className="w-24 text-xs bg-transparent border-b border-transparent hover:border-gray-300 focus:border-blue-500 focus:outline-none"
                          />
                          <button
                            onClick={() => handleUpdateSubCategory(sub)}
                            className="px-2 py-1 bg-green-100 text-green-600 text-xs rounded hover:bg-green-200"
                          >
                            保存
                          </button>
                          <button
                            onClick={() => handleDeleteSubCategory(sub.id)}
                            className="px-2 py-1 bg-red-100 text-red-600 text-xs rounded hover:bg-red-200"
                          >
                            删除
                          </button>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Preview Section */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">数据预览</h3>
          
          <div className="mb-4">
            <h4 className="font-medium text-gray-700 mb-2">大类总数: {mainCategories.length}</h4>
            <div className="text-sm text-gray-500 space-y-1">
              {mainCategories.map(main => (
                <div key={main.id} className="flex items-center space-x-2">
                  <i className={`fa-solid ${main.icon} text-gray-400`}></i>
                  <span>{main.name}</span>
                  <span className="text-gray-400">({subCategories.filter(s => s.parentId === main.id).length}个子组)</span>
                </div>
              ))}
            </div>
          </div>
          
          <div>
            <h4 className="font-medium text-gray-700 mb-2">子组总数: {subCategories.length}</h4>
            <div className="text-sm text-gray-500 max-h-64 overflow-y-auto space-y-1">
              {subCategories.map(sub => (
                <div key={sub.id} className="flex items-center space-x-2">
                  <img src={sub.image} alt={sub.name} className="w-6 h-6 rounded object-cover" />
                  <span>{sub.name}</span>
                  <span className="text-gray-400 text-xs">[{sub.code}]</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CategoryManager;
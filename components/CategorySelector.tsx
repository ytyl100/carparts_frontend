import React, { useState, useRef, useMemo, useEffect } from "react";
import { MainCategory, SubCategory, ModelInfo } from "../types";
import { MAIN_CATEGORIES, SUB_CATEGORIES } from "../data";
import { MockApiClient } from "../services/repositoryClient";

interface CategorySelectorProps {
  onSelect: (sub: SubCategory, main: MainCategory) => void;
  selectedModel: ModelInfo | null;
  isAdmin?: boolean;
  onCategoryChange?: () => void; // 添加分类变化回调
}

interface ChangeConfirmation {
  type: "CREATE" | "UPDATE" | "DELETE";
  target: "MAIN" | "SUB";
  data: any;
  action: () => void;
}

const CategorySelector: React.FC<CategorySelectorProps> = ({
  onSelect,
  selectedModel,
  isAdmin = false,
  onCategoryChange, // 添加分类变化回调参数
}) => {
  // Mode State
  const [isManageMode, setIsManageMode] = useState(false);

  // Data State
  const [localMainCategories, setLocalMainCategories] =
    useState<MainCategory[]>(MAIN_CATEGORIES);
  const [localSubCategories, setLocalSubCategories] = useState<SubCategory[]>(
    [],
  );
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);
  const [isLoadingSubCategories, setIsLoadingSubCategories] = useState(false);

  // Filtered Main Categories based on Hierarchical relationship with Model Code
  const filteredMainCategories = useMemo(() => {
    return localMainCategories;
  }, [localMainCategories]);

  // Selection & UI State
  const [activeMain, setActiveMain] = useState("");

  // Update activeMain when filteredMainCategories changes
  useEffect(() => {
    setActiveMain(filteredMainCategories[0]?.id || "");
  }, [filteredMainCategories]);

  const [search, setSearch] = useState("");

  // Editing Modal States
  const [editingMain, setEditingMain] = useState<MainCategory | null>(null);
  const [editingSub, setEditingSub] = useState<SubCategory | null>(null);

  // Confirmation Modal State
  const [pendingConfirmation, setPendingConfirmation] =
    useState<ChangeConfirmation | null>(null);

  const subFileInputRef = useRef<HTMLInputElement>(null);

  const filteredSubs = localSubCategories.filter(
    (s) =>
      s.parentId === activeMain &&
      (s.name.includes(search) || s.code.includes(search)),
  );

  // Fetch main categories when model changes
  useEffect(() => {
    if (selectedModel) {
      setIsLoadingCategories(true);
      MockApiClient.getMainCategoriesByVehicleCode(selectedModel.modelCode)
        .then((categories: MainCategory[]) => {
          setLocalMainCategories(categories);
          setIsLoadingCategories(false);
        })
        .catch((error) => {
          console.error("Failed to fetch main categories:", error);
          setIsLoadingCategories(false);
          // Fallback to mock data if API fails
          setLocalMainCategories(MAIN_CATEGORIES);
        });
    }
  }, [selectedModel]);

  // Fetch subcategories when activeMain changes
  useEffect(() => {
    if (activeMain) {
      setIsLoadingSubCategories(true);
      console.log("Fetching subcategories for main:", activeMain);
      MockApiClient.getSubCategoriesByParentId(activeMain)
        .then((subCategories: SubCategory[]) => {
          console.log("Fetched subcategories:", subCategories);
          setLocalSubCategories(subCategories);
          setIsLoadingSubCategories(false);
        })
        .catch((error) => {
          console.error("Failed to fetch subcategories:", error);
          setIsLoadingSubCategories(false);
          // Fallback to mock data if API fails
          setLocalSubCategories(
            SUB_CATEGORIES.filter((s) => s.parentId === activeMain),
          );
        });
    }
  }, [activeMain]);

  // Utility: Show JSON Review Modal
  const requestConfirmation = (
    type: "CREATE" | "UPDATE" | "DELETE",
    target: "MAIN" | "SUB",
    data: any,
    action: () => void,
  ) => {
    setPendingConfirmation({ type, target, data, action });
  };

  // Restoration: Reset all data to original defaults
  const handleResetData = () => {
    if (confirm("确定要恢复所有数据到初始状态吗？当前的所有修改都将丢失。")) {
      setLocalMainCategories(MAIN_CATEGORIES);
      setLocalSubCategories(SUB_CATEGORIES);
      setActiveMain(filteredMainCategories[0]?.id || "");
      alert("数据已还原。");
    }
  };

  // CRUD for Main Categories
  const handleAddMain = () => {
    const newMain: MainCategory = {
      id: `m${Date.now()}`,
      name: "新大类",
      icon: "fa-box",
      vehicleCode: selectedModel?.modelCode || "*",
    };
    setEditingMain(newMain);
  };

  const onSaveMain = async (updated: MainCategory) => {
    const isNew = !localMainCategories.find((m) => m.id === updated.id);
    requestConfirmation(isNew ? "CREATE" : "UPDATE", "MAIN", updated, async () => {
      try {
        if (isNew) {
          // 调用API创建新的MainCategory
          const result = await MockApiClient.createMainCategory(updated);
          setLocalMainCategories([...localMainCategories, result]);
          setActiveMain(result.id);
        } else {
          // 调用API更新现有MainCategory
          const result = await MockApiClient.updateMainCategory(updated);
          setLocalMainCategories((prev) =>
            prev.map((m) => (m.id === result.id ? result : m)),
          );
        }
        setEditingMain(null);
        // 调用回调通知其他组件数据已更新
        if (onCategoryChange) {
          onCategoryChange();
        }
      } catch (error) {
        console.error('保存主分类失败:', error);
        alert('保存失败，请稍后重试');
      }
    });
  };

  const handleDeleteMain = (main: MainCategory) => {
    requestConfirmation("DELETE", "MAIN", main, async () => {
      try {
        // 调用API删除MainCategory
        await MockApiClient.deleteMainCategory(main.id);
        setLocalMainCategories((prev) => prev.filter((m) => m.id !== main.id));
        setLocalSubCategories((prev) =>
          prev.filter((s) => s.parentId !== main.id),
        );
        if (activeMain === main.id) {
          const remaining = filteredMainCategories.filter(
            (m) => m.id !== main.id,
          );
          setActiveMain(remaining[0]?.id || "");
        }
        // 调用回调通知其他组件数据已更新
        if (onCategoryChange) {
          onCategoryChange();
        }
      } catch (error) {
        console.error('删除主分类失败:', error);
        alert('删除失败，请稍后重试');
      }
    });
  };

  // CRUD for Sub Categories
  const handleAddSub = () => {
    const newSub: SubCategory = {
      id: `s${Date.now()}`,
      name: "新子组",
      code: "0000(0000)",
      image: "https://picsum.photos/seed/new/300/300",
      parentId: activeMain,
    };
    setEditingSub(newSub);
  };

  const onSaveSub = async (updated: SubCategory) => {
    const isNew = !localSubCategories.find((s) => s.id === updated.id);
    requestConfirmation(isNew ? "CREATE" : "UPDATE", "SUB", updated, async () => {
      try {
        if (isNew) {
          // 调用API创建新的SubCategory
          const result = await MockApiClient.createSubCategory(updated);
          setLocalSubCategories([...localSubCategories, result]);
        } else {
          // 调用API更新现有SubCategory
          const result = await MockApiClient.updateSubCategory(updated);
          setLocalSubCategories((prev) =>
            prev.map((s) => (s.id === result.id ? result : s)),
          );
        }
        setEditingSub(null);
        // 调用回调通知其他组件数据已更新
        if (onCategoryChange) {
          onCategoryChange();
        }
      } catch (error) {
        console.error('保存子分类失败:', error);
        alert('保存失败，请稍后重试');
      }
    });
  };

  const handleDeleteSub = (sub: SubCategory) => {
    requestConfirmation("DELETE", "SUB", sub, async () => {
      try {
        // 调用API删除SubCategory
        await MockApiClient.deleteSubCategory(sub.id);
        setLocalSubCategories((prev) => prev.filter((s) => s.id !== sub.id));
        // 调用回调通知其他组件数据已更新
        if (onCategoryChange) {
          onCategoryChange();
        }
      } catch (error) {
        console.error('删除子分类失败:', error);
        alert('删除失败，请稍后重试');
      }
    });
  };

  const handleSubImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && editingSub) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setEditingSub({ ...editingSub, image: event.target?.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  if (isLoadingCategories) {
    return (
      <div className="flex-1 flex items-center justify-center bg-white">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin"></div>
          <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">
            正在同步主分类...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex h-full bg-white relative ${isManageMode ? "ring-4 ring-orange-500/10" : ""}`}
    >
      {/* Sidebar: Main Categories */}
      <div
        className={`w-28 border-r border-gray-100 flex flex-col py-4 items-center space-y-4 overflow-y-auto custom-scrollbar ${isManageMode ? "bg-orange-50/30" : ""}`}
      >
        {filteredMainCategories.map((main) => (
          <div key={main.id} className="relative group w-20">
            <button
              onClick={() => setActiveMain(main.id)}
              className={`flex flex-col items-center justify-center w-full h-20 rounded-lg transition-all relative ${
                activeMain === main.id
                  ? isManageMode
                    ? "bg-orange-600 text-white shadow-lg"
                    : "bg-blue-600 text-white shadow-lg shadow-blue-200"
                  : "text-gray-400 hover:bg-gray-50 hover:text-gray-600"
              }`}
            >
              <i className={`fa-solid ${main.icon} text-2xl mb-1`}></i>
              <span className="text-[10px] font-black text-center leading-tight px-1 uppercase tracking-tighter">
                {main.name}
              </span>
            </button>

            {isManageMode && (
              <div className="absolute -top-2 -right-2 flex flex-col space-y-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                <button
                  onClick={() => setEditingMain(main)}
                  className="w-6 h-6 bg-white border border-gray-200 rounded-full flex items-center justify-center text-[10px] text-blue-600 shadow-sm hover:bg-blue-50"
                >
                  <i className="fa-solid fa-pen"></i>
                </button>
                <button
                  onClick={() => handleDeleteMain(main)}
                  className="w-6 h-6 bg-white border border-gray-200 rounded-full flex items-center justify-center text-[10px] text-red-500 shadow-sm hover:bg-red-50"
                >
                  <i className="fa-solid fa-trash"></i>
                </button>
              </div>
            )}
          </div>
        ))}

        {isManageMode && (
          <button
            onClick={handleAddMain}
            className="w-20 h-10 border-2 border-dashed border-orange-300 rounded-lg text-orange-400 hover:bg-orange-50 transition-all flex items-center justify-center"
          >
            <i className="fa-solid fa-plus"></i>
          </button>
        )}
      </div>

      {/* Grid: Subcategories */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Sub Header */}
        <div
          className={`flex items-center justify-between px-6 py-4 border-b ${isManageMode ? "bg-orange-50/50" : "bg-white"}`}
        >
          <div className="flex items-center space-x-4">
            <div className="flex flex-col">
              <h2 className="text-lg font-black text-gray-800 flex items-center tracking-tight">
                {isManageMode ? (
                  <span className="text-orange-600 mr-2">管理子组</span>
                ) : (
                  "选择子组"
                )}
                <span className="ml-3 px-2 py-0.5 bg-gray-100 rounded text-[10px] text-gray-500 font-bold uppercase tracking-widest">
                  ITEMS: {filteredSubs.length}
                </span>
              </h2>
              {selectedModel && (
                <span className="text-[10px] font-bold text-blue-500 uppercase tracking-tighter">
                  PARENT VEHICLE: {selectedModel.modelCode}
                </span>
              )}
            </div>

            {/* Mode Switcher - Only visible to Admins */}
            {isAdmin && (
              <div className="flex items-center space-x-1 bg-gray-100 p-1 rounded-full border border-gray-200 ml-4">
                <button
                  onClick={() => setIsManageMode(false)}
                  className={`px-4 py-1 rounded-full text-[10px] font-black uppercase transition-all ${!isManageMode ? "bg-white text-blue-600 shadow-sm" : "text-gray-400"}`}
                >
                  浏览模式
                </button>
                <button
                  onClick={() => setIsManageMode(true)}
                  className={`px-4 py-1 rounded-full text-[10px] font-black uppercase transition-all ${isManageMode ? "bg-orange-600 text-white shadow-sm" : "text-gray-400"}`}
                >
                  管理模式
                </button>
              </div>
            )}

            {isManageMode && (
              <button
                onClick={handleResetData}
                className="ml-2 text-[10px] font-black uppercase text-gray-400 hover:text-red-500 transition-colors"
              >
                <i className="fa-solid fa-rotate-left mr-1"></i>还原数据
              </button>
            )}
          </div>

          <div className="flex items-center space-x-3">
            <div className="relative">
              <input
                type="text"
                placeholder="搜索子组名称/代码..."
                className="pl-9 pr-4 py-2 text-xs border border-gray-200 rounded-lg w-64 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <i className="fa-solid fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 text-[10px]"></i>
            </div>
            {isManageMode && (
              <button
                onClick={handleAddSub}
                className="px-4 py-2 bg-orange-600 text-white text-[11px] font-black uppercase tracking-widest rounded-lg hover:bg-orange-700 shadow-lg shadow-orange-200 transition-all active:scale-95"
              >
                <i className="fa-solid fa-plus mr-2"></i>添加子组
              </button>
            )}
          </div>
        </div>

        {/* Categories Grid */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-6">
            {filteredSubs.map((sub) => (
              <div
                key={sub.id}
                onClick={() =>
                  !isManageMode &&
                  onSelect(
                    sub,
                    localMainCategories.find((m) => m.id === activeMain)!,
                  )
                }
                className={`group relative bg-white border rounded-xl p-3 transition-all duration-300 ${
                  isManageMode
                    ? "border-orange-100 hover:border-orange-400 cursor-default"
                    : "cursor-pointer hover:border-blue-500 hover:shadow-2xl hover:-translate-y-1 border-gray-100"
                }`}
              >
                <div className="aspect-square bg-gray-50 rounded-lg overflow-hidden mb-3 flex items-center justify-center p-3 relative">
                  <img
                    src={sub.image}
                    alt={sub.name}
                    className="max-w-full max-h-full object-contain group-hover:scale-110 transition-transform duration-500"
                  />

                  {isManageMode && (
                    <div className="absolute inset-0 bg-orange-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-2">
                      <button
                        onClick={() => setEditingSub(sub)}
                        className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-blue-600 hover:bg-blue-50 shadow-lg"
                      >
                        <i className="fa-solid fa-pen text-sm"></i>
                      </button>
                      <button
                        onClick={() => handleDeleteSub(sub)}
                        className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-red-500 hover:bg-red-50 shadow-lg"
                      >
                        <i className="fa-solid fa-trash text-sm"></i>
                      </button>
                    </div>
                  )}
                </div>

                <div className="text-center">
                  <div
                    className={`text-[10px] font-mono mb-0.5 tracking-tighter ${isManageMode ? "text-orange-400" : "text-gray-400"}`}
                  >
                    {sub.code}
                  </div>
                  <div
                    className={`text-sm font-black truncate tracking-tight transition-colors ${isManageMode ? "text-gray-700" : "text-gray-800 group-hover:text-blue-600"}`}
                  >
                    {sub.name}
                  </div>
                </div>
              </div>
            ))}

            {filteredSubs.length === 0 && (
              <div className="col-span-full h-64 flex flex-col items-center justify-center text-gray-300">
                <i className="fa-solid fa-layer-group text-6xl mb-4 opacity-20"></i>
                <p className="text-sm font-bold uppercase tracking-widest opacity-40">
                  暂无子组数据
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Editing Main Category Modal */}
      {editingMain && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"
            onClick={() => setEditingMain(null)}
          />
          <div className="relative bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in duration-200">
            <div className="px-6 py-4 bg-orange-50 border-b border-orange-100 flex items-center justify-between">
              <h3 className="text-sm font-black text-orange-800 uppercase tracking-widest">
                编辑大类属性
              </h3>
              <button onClick={() => setEditingMain(null)}>
                <i className="fa-solid fa-xmark text-orange-300"></i>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  类目名称
                </label>
                <input
                  type="text"
                  className="w-full px-4 py-2 bg-gray-50 border border-gray-100 rounded-lg text-sm font-bold outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  value={editingMain.name}
                  onChange={(e) =>
                    setEditingMain({ ...editingMain, name: e.target.value })
                  }
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  图标样式 (FontAwesome)
                </label>
                <div className="flex space-x-2">
                  <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center text-orange-600">
                    <i className={`fa-solid ${editingMain.icon}`}></i>
                  </div>
                  <input
                    type="text"
                    className="flex-1 px-4 py-2 bg-gray-50 border border-gray-100 rounded-lg text-sm font-mono outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                    value={editingMain.icon}
                    onChange={(e) =>
                      setEditingMain({ ...editingMain, icon: e.target.value })
                    }
                    placeholder="例如: fa-engine"
                  />
                </div>
              </div>
              <button
                onClick={() => onSaveMain(editingMain)}
                className="w-full py-3 bg-orange-600 text-white text-xs font-black uppercase tracking-[0.2em] rounded-lg shadow-lg shadow-orange-200 transition-all active:scale-95"
              >
                确认修改
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Editing Sub Category Modal */}
      {editingSub && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"
            onClick={() => setEditingSub(null)}
          />
          <div className="relative bg-white w-full max-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in duration-200">
            <div className="px-6 py-4 bg-orange-50 border-b border-orange-100 flex items-center justify-between">
              <h3 className="text-sm font-black text-orange-800 uppercase tracking-widest">
                编辑子组属性
              </h3>
              <button onClick={() => setEditingSub(null)}>
                <i className="fa-solid fa-xmark text-orange-300"></i>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex space-x-4">
                <div
                  className="w-32 h-32 bg-gray-50 rounded-xl overflow-hidden border-2 border-dashed border-gray-200 flex items-center justify-center p-1 flex-shrink-0 cursor-pointer hover:bg-gray-100 transition-colors relative group"
                  onClick={() => subFileInputRef.current?.click()}
                >
                  <img
                    src={editingSub.image}
                    className="max-w-full max-h-full object-contain"
                    alt=""
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <i className="fa-solid fa-camera text-white text-xl"></i>
                  </div>
                  <input
                    type="file"
                    ref={subFileInputRef}
                    className="hidden"
                    accept="image/*"
                    onChange={handleSubImageUpload}
                  />
                </div>
                <div className="flex-1 space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                      子组名称
                    </label>
                    <input
                      type="text"
                      className="w-full px-4 py-2 bg-gray-50 border border-gray-100 rounded-lg text-sm font-bold outline-none focus:ring-2 focus:ring-orange-500/20"
                      value={editingSub.name}
                      onChange={(e) =>
                        setEditingSub({ ...editingSub, name: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                      分类编号
                    </label>
                    <input
                      type="text"
                      className="w-full px-4 py-2 bg-gray-50 border border-gray-100 rounded-lg text-sm font-mono outline-none focus:ring-2 focus:ring-orange-500/20"
                      value={editingSub.code}
                      onChange={(e) =>
                        setEditingSub({ ...editingSub, code: e.target.value })
                      }
                      placeholder="0000(0000)"
                    />
                  </div>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  缩略图 URL / 预览
                </label>
                <input
                  type="text"
                  className="w-full px-4 py-2 bg-gray-50 border border-gray-100 rounded-lg text-xs font-mono outline-none focus:ring-2 focus:ring-orange-500/20"
                  value={
                    editingSub.image.startsWith("data:")
                      ? "已上传本地图片"
                      : editingSub.image
                  }
                  onChange={(e) =>
                    setEditingSub({ ...editingSub, image: e.target.value })
                  }
                  placeholder="HTTP URL 或通过左侧上传"
                />
              </div>
              <button
                onClick={() => onSaveSub(editingSub)}
                className="w-full py-3 bg-orange-600 text-white text-xs font-black uppercase tracking-[0.2em] rounded-lg shadow-lg shadow-orange-200 transition-all active:scale-95"
              >
                确认修改
              </button>
            </div>
          </div>
        </div>
      )}

      {/* JSON Confirmation Review Modal */}
      {pendingConfirmation && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
            onClick={() => setPendingConfirmation(null)}
          />
          <div className="relative bg-[#1a202c] w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden border border-white/10 animate-in zoom-in duration-200">
            <div
              className={`px-6 py-4 flex items-center justify-between border-b border-white/5 ${
                pendingConfirmation.type === "DELETE"
                  ? "bg-red-500/10"
                  : "bg-emerald-500/10"
              }`}
            >
              <div className="flex items-center space-x-3">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    pendingConfirmation.type === "DELETE"
                      ? "bg-red-500 text-white"
                      : "bg-emerald-500 text-white"
                  }`}
                >
                  <i
                    className={`fa-solid ${
                      pendingConfirmation.type === "DELETE"
                        ? "fa-trash"
                        : pendingConfirmation.type === "CREATE"
                          ? "fa-plus"
                          : "fa-check"
                    } text-sm`}
                  ></i>
                </div>
                <div>
                  <h3 className="text-white text-sm font-black uppercase tracking-widest">
                    {pendingConfirmation.type === "DELETE"
                      ? "确认删除"
                      : "确认保存更改"}
                  </h3>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">
                    Review {pendingConfirmation.target} data changes below
                  </p>
                </div>
              </div>
              <button
                onClick={() => setPendingConfirmation(null)}
                className="text-gray-500 hover:text-white transition-colors"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            <div className="p-6">
              <div className="bg-black/50 rounded-xl p-4 border border-white/5 overflow-auto max-h-[400px] custom-scrollbar">
                <pre className="text-emerald-400 font-mono text-xs leading-relaxed">
                  {JSON.stringify(pendingConfirmation.data, null, 2)}
                </pre>
              </div>

              <div className="mt-6 flex space-x-3">
                <button
                  onClick={() => setPendingConfirmation(null)}
                  className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-gray-400 text-[11px] font-black uppercase tracking-widest rounded-lg border border-white/10 transition-all"
                >
                  弃用修改 / Discard
                </button>
                <button
                  onClick={() => {
                    pendingConfirmation.action();
                    setPendingConfirmation(null);
                  }}
                  className={`flex-[1.5] py-3 text-white text-[11px] font-black uppercase tracking-widest rounded-lg shadow-xl transition-all active:scale-95 ${
                    pendingConfirmation.type === "DELETE"
                      ? "bg-red-600 hover:bg-red-500 shadow-red-900/40"
                      : "bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/40"
                  }`}
                >
                  <i className="fa-solid fa-shield-check mr-2"></i>
                  确认并应用 / Accept Change
                </button>
              </div>
            </div>

            <div className="px-6 py-3 bg-black/30 border-t border-white/5">
              <p className="text-[9px] text-gray-500 font-medium text-center italic">
                注意：确认后数据将立即在当前会话中同步。
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CategorySelector;

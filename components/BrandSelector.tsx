import React, { useState, useMemo, useRef, useEffect } from "react";
import { Brand } from "../types";
import { MockApiClient } from "../services/repositoryClient";

interface BrandSelectorProps {
  onSelect: (brand: Brand) => void;
  isAdmin?: boolean;
}

interface PendingSaveAction {
  title: string;
  data: Brand[];
  action: () => void;
}

interface CustomModalState {
  type: "confirm";
  title: string;
  description: string;
  onConfirm: () => void;
  accentColor: "red" | "orange" | "blue";
}

const ALPHABET = ["全部", "热门", ..."ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("")];

const BrandSelector: React.FC<BrandSelectorProps> = ({
  onSelect,
  isAdmin = false,
}) => {
  const [isManageMode, setIsManageMode] = useState(false);
  const [localBrands, setLocalBrands] = useState<Brand[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("全部");
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);
  const [pendingSave, setPendingSave] = useState<PendingSaveAction | null>(
    null,
  );
  const [activeModal, setActiveModal] = useState<CustomModalState | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setIsLoading(true);
    MockApiClient.getBrands().then((data) => {
      setLocalBrands(data);
      setIsLoading(false);
    });
  }, []);

  const filteredBrands = useMemo(() => {
    return localBrands.filter((brand) => {
      if (activeFilter === "全部") return true;
      if (activeFilter === "热门") return brand.isHot;
      return brand.firstLetter === activeFilter;
    });
  }, [localBrands, activeFilter]);

  const handleResetData = () => {
    setActiveModal({
      type: "confirm",
      title: "还原品牌数据",
      description:
        "确定要还原所有品牌数据吗？当前会话中未保存的更改将永久丢失。",
      accentColor: "orange",
      onConfirm: () => {
        MockApiClient.getBrands().then((data) => setLocalBrands(data));
        setActiveModal(null);
      },
    });
  };

  const handleSaveAll = () => {
    setPendingSave({
      title: "确认保存品牌层级变更 (BRANDS JSON)",
      data: localBrands,
      action: () => {
        console.log("开始批量更新品牌数据:", localBrands);
        
        // 调用批量更新API
        MockApiClient.replaceAllBrands(localBrands)
          .then((response) => {
            console.log("API响应:", response);
            
            if (response.success) {
              // 先关闭管理模式和清除待保存状态
              setIsManageMode(false);
              setPendingSave(null);
              
              // 强制刷新数据 - 先清空再设置
              setLocalBrands([]);
              setTimeout(() => {
                setLocalBrands([...localBrands]);
                console.log("数据已更新，当前品牌数量:", localBrands.length);
              }, 100);
              
              alert(`品牌数据已成功更新：${response.message}`);
            } else {
              alert("更新失败：" + response.message);
              throw new Error(response.message);
            }
          })
          .catch((error) => {
            console.error("批量更新失败:", error);
            alert("更新失败，请稍后重试");
            // 如果更新失败，保持管理模式以便用户可以重试
          });
      },
    });
  };

  const handleAddBrand = () => {
    const newBrand: Brand = {
      id: Date.now().toString(),
      name: "新品牌",
      logo: "https://logo.clearbit.com/google.com",
      firstLetter: "A",
      isHot: false,
    };
    setEditingBrand(newBrand);
  };

  const onSaveBrand = (updated: Brand) => {
    const isNew = !localBrands.find((b) => b.id === updated.id);
    if (isNew) {
      setLocalBrands([...localBrands, updated]);
    } else {
      setLocalBrands((prev) =>
        prev.map((b) => (b.id === updated.id ? updated : b)),
      );
    }
    setEditingBrand(null);
  };

  const handleDeleteBrand = (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation();
    console.log("Deleting brand:", id);
    setActiveModal({
      type: "confirm",
      title: "确认删除品牌",
      description: `确定要从数据库中永久删除品牌 "${name}" 吗？`,
      accentColor: "red",
      onConfirm: () => {
        setLocalBrands((prev) => prev.filter((b) => b.id !== id));
        setActiveModal(null);
      },
    });
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && editingBrand) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setEditingBrand({
          ...editingBrand,
          logo: event.target?.result as string,
        });
      };
      reader.readAsDataURL(file);
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-white">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin"></div>
          <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">
            正在同步品牌库...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col h-full bg-white relative ${isManageMode ? "ring-4 ring-orange-500/10" : ""}`}
    >
      {isAdmin && (
        <div
          className={`px-6 py-3 border-b flex items-center justify-between transition-colors ${isManageMode ? "bg-orange-50" : "bg-white"}`}
        >
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1 bg-gray-100 p-1 rounded-full border border-gray-200">
              <button
                onClick={() => setIsManageMode(false)}
                className={`px-5 py-1.5 rounded-full text-[10px] font-black uppercase transition-all ${!isManageMode ? "bg-blue-600 text-white shadow-md" : "text-gray-400"}`}
              >
                浏览模式
              </button>
              <button
                onClick={() => setIsManageMode(true)}
                className={`px-5 py-1.5 rounded-full text-[10px] font-black uppercase transition-all ${isManageMode ? "bg-orange-600 text-white shadow-md" : "text-gray-400"}`}
              >
                管理模式
              </button>
            </div>
            {isManageMode && (
              <span className="text-[10px] font-bold text-orange-600 animate-pulse">
                <i className="fa-solid fa-tags mr-1"></i>管理汽车品牌库
              </span>
            )}
          </div>

          {isManageMode && (
            <div className="flex items-center space-x-3">
              <button
                onClick={handleResetData}
                className="px-4 py-1.5 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-red-500 transition-colors"
              >
                <i className="fa-solid fa-rotate-left mr-1"></i>还原数据
              </button>
              <button
                onClick={handleAddBrand}
                className="px-4 py-1.5 bg-white border border-orange-200 text-orange-600 text-[10px] font-black uppercase tracking-widest rounded shadow-sm hover:bg-orange-50 transition-all"
              >
                <i className="fa-solid fa-plus mr-1"></i>新增品牌
              </button>
              <button
                onClick={handleSaveAll}
                className="px-6 py-1.5 bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest rounded shadow-lg shadow-emerald-200 hover:bg-emerald-700 active:scale-95 transition-all"
              >
                保存更改并预览 JSON
              </button>
            </div>
          )}
        </div>
      )}

      <div className="p-6 flex flex-col flex-1 overflow-hidden">
        <div className="mb-6 flex flex-wrap gap-1 border-b border-gray-100 pb-4">
          {ALPHABET.map((letter) => (
            <button
              key={letter}
              onClick={() => setActiveFilter(letter)}
              className={`px-3 py-1 rounded text-sm transition-colors ${
                activeFilter === letter
                  ? isManageMode
                    ? "bg-orange-600 text-white font-bold shadow-md"
                    : "bg-blue-600 text-white font-bold shadow-md"
                  : "text-gray-500 hover:bg-gray-100"
              }`}
            >
              {letter}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-4 custom-scrollbar overflow-y-auto pr-2 flex-1 pb-10">
          {filteredBrands.map((brand) => (
            <div key={brand.id} className="relative group">
              <button
                onClick={() => !isManageMode && onSelect(brand)}
                className={`flex flex-col items-center justify-center w-full p-4 bg-white border rounded-lg transition-all ${
                  isManageMode
                    ? "border-orange-100 cursor-default"
                    : "border-gray-100 hover:border-blue-500 hover:shadow-md cursor-pointer"
                }`}
              >
                <div className="w-16 h-16 mb-3 flex items-center justify-center bg-gray-50 rounded p-2">
                  <img
                    src={brand.logo}
                    alt={brand.name}
                    className={`max-w-full max-h-full object-contain transition-all ${!isManageMode ? "grayscale group-hover:grayscale-0" : ""}`}
                  />
                </div>
                <span
                  className={`text-sm font-medium transition-colors ${isManageMode ? "text-gray-700" : "text-gray-700 group-hover:text-blue-600"}`}
                >
                  {brand.name}
                </span>
                {brand.isHot && !isManageMode && (
                  <span className="absolute top-1 right-1 text-[8px] bg-red-500 text-white px-1 rounded-sm font-black uppercase animate-pulse">
                    Hot
                  </span>
                )}
              </button>

              {isManageMode && (
                <div className="absolute -top-2 -right-2 flex flex-col space-y-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                  <button
                    onClick={() => setEditingBrand(brand)}
                    className="w-6 h-6 bg-white border border-gray-200 rounded-full flex items-center justify-center text-[10px] text-blue-600 shadow-sm hover:bg-blue-50"
                  >
                    <i className="fa-solid fa-pen"></i>
                  </button>
                  <button
                    onClick={(e) => handleDeleteBrand(e, brand.id, brand.name)}
                    className="w-6 h-6 bg-white border border-gray-200 rounded-full flex items-center justify-center text-[10px] text-red-500 shadow-sm hover:bg-red-50"
                  >
                    <i className="fa-solid fa-trash"></i>
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {editingBrand && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"
            onClick={() => setEditingBrand(null)}
          />
          <div className="relative bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in duration-200">
            <div className="px-6 py-4 bg-orange-50 border-b border-orange-100 flex items-center justify-between">
              <h3 className="text-sm font-black text-orange-800 uppercase tracking-widest">
                编辑品牌属性
              </h3>
              <button
                onClick={() => setEditingBrand(null)}
                className="text-orange-300 hover:text-orange-500"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex flex-col items-center space-y-3 pb-2">
                <div
                  className="w-24 h-24 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center p-2 relative group cursor-pointer overflow-hidden"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <img
                    src={editingBrand.logo}
                    alt=""
                    className="max-w-full max-h-full object-contain"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <i className="fa-solid fa-camera text-white text-xl"></i>
                  </div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept="image/*"
                    onChange={handleLogoUpload}
                  />
                </div>
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  点击更新 Logo
                </span>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                  品牌名称
                </label>
                <input
                  type="text"
                  className="w-full px-4 py-2 bg-gray-50 border border-gray-100 rounded-lg text-sm font-bold outline-none"
                  value={editingBrand.name}
                  onChange={(e) =>
                    setEditingBrand({ ...editingBrand, name: e.target.value })
                  }
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                  首字母
                </label>
                <select
                  className="w-full px-4 py-2 bg-gray-50 border border-gray-100 rounded-lg text-sm font-bold outline-none"
                  value={editingBrand.firstLetter}
                  onChange={(e) =>
                    setEditingBrand({ ...editingBrand, firstLetter: e.target.value })
                  }
                >
                  <option value="">请选择</option>
                  {"ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").map((letter) => (
                    <option key={letter} value={letter}>
                      {letter}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                  是否热门
                </label>
                <div className="flex items-center space-x-4">
                  <label className="flex items-center space-x-2">
                    <input
                      type="radio"
                      name="isHot"
                      checked={editingBrand.isHot === true}
                      onChange={() => setEditingBrand({ ...editingBrand, isHot: true })}
                      className="w-4 h-4 text-orange-600"
                    />
                    <span className="text-sm font-bold">是</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="radio"
                      name="isHot"
                      checked={editingBrand.isHot === false}
                      onChange={() => setEditingBrand({ ...editingBrand, isHot: false })}
                      className="w-4 h-4 text-orange-600"
                    />
                    <span className="text-sm font-bold">否</span>
                  </label>
                </div>
              </div>
              <button
                onClick={() => onSaveBrand(editingBrand)}
                className="w-full py-3 bg-orange-600 text-white text-xs font-black uppercase tracking-[0.2em] rounded-lg shadow-lg"
              >
                保存品牌信息
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Action UI Modal (Replacement for prompt/confirm) */}
      {activeModal && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setActiveModal(null)}
          />
          <div className="relative bg-white w-full max-sm rounded-xl shadow-2xl overflow-hidden animate-in zoom-in duration-200 border border-gray-100">
            <div
              className={`px-6 py-4 flex items-center justify-between border-b ${activeModal.accentColor === "red" ? "bg-red-50" : activeModal.accentColor === "orange" ? "bg-orange-50" : "bg-blue-50"}`}
            >
              <h3
                className={`text-sm font-black uppercase tracking-widest ${activeModal.accentColor === "red" ? "text-red-700" : activeModal.accentColor === "orange" ? "text-orange-700" : "text-blue-700"}`}
              >
                {activeModal.title}
              </h3>
              <button
                onClick={() => setActiveModal(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
            <div className="p-6 space-y-4">
              {activeModal.description && (
                <p className="text-xs text-gray-500 font-bold leading-relaxed">
                  {activeModal.description}
                </p>
              )}
              <div className="flex space-x-2 pt-2">
                <button 
                  onClick={() => setActiveModal(null)}
                  className="flex-1 py-2 text-[10px] font-black uppercase tracking-widest bg-gray-100 text-gray-500 rounded hover:bg-gray-200 transition-all"
                >
                  取消
                </button>
                <button 
                  onClick={() => activeModal.onConfirm()}
                  className={`flex-[1.5] py-2 text-[10px] font-black uppercase tracking-widest text-white rounded shadow-lg transition-all active:scale-95 ${
                    activeModal.accentColor === "red" 
                      ? "bg-red-600 hover:bg-red-700 shadow-red-200" 
                      : activeModal.accentColor === "orange" 
                        ? "bg-orange-600 hover:bg-orange-700 shadow-orange-200" 
                        : "bg-blue-600 hover:bg-blue-700 shadow-blue-200"
                  }`}
                >
                  确认
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation JSON Modal */}
      {pendingSave && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
            onClick={() => setPendingSave(null)}
          />
          <div className="relative bg-[#1a202c] w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden border border-white/10 animate-in zoom-in duration-200">
            <div className="px-6 py-4 flex items-center justify-between border-b border-white/5 bg-emerald-500/10">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center bg-emerald-500 text-white">
                  <i className="fa-solid fa-database text-sm"></i>
                </div>
                <div>
                  <h3 className="text-white text-sm font-black uppercase tracking-widest">
                    {pendingSave.title}
                  </h3>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">
                    Review and confirm the new brand data structure
                  </p>
                </div>
              </div>
              <button
                onClick={() => setPendingSave(null)}
                className="text-gray-500 hover:text-white transition-colors"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            <div className="p-6">
              <div className="bg-black/50 rounded-xl p-4 border border-white/5 overflow-auto max-h-[450px] custom-scrollbar">
                <pre className="text-emerald-400 font-mono text-[11px] leading-relaxed">
                  {JSON.stringify(pendingSave.data, null, 2)}
                </pre>
              </div>

              <div className="mt-6 flex space-x-3">
                <button
                  onClick={() => setPendingSave(null)}
                  className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-gray-400 text-[11px] font-black uppercase tracking-widest rounded-lg border border-white/10 transition-all"
                >
                  弃用修改 / Discard
                </button>
                <button
                  onClick={() => {
                    pendingSave.action();
                    setPendingSave(null);
                  }}
                  className="flex-[1.5] py-3 bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-black uppercase tracking-widest rounded-lg shadow-xl shadow-emerald-900/40 transition-all active:scale-95"
                >
                  确认保存 / Confirm Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BrandSelector;

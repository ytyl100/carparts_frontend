import React, { useState, useMemo, useEffect } from "react";
import { ModelInfo, Brand, VehicleHierarchy } from "../types";
import { MockApiClient } from "../services/repositoryClient";
import { VEHICLE_HIERARCHY } from "../data";

interface ModelFilterProps {
  selectedBrand: Brand | null;
  onConfirm: (model: ModelInfo) => void;
  isAdmin?: boolean;
}

interface PendingHierarchyAction {
  title: string;
  data: any;
  action: () => void;
}

interface CustomModalState {
  type: "input" | "confirm";
  title: string;
  description?: string;
  defaultValue?: string;
  onConfirm: (val?: string) => void;
}

interface DragState {
  column: number;
  index: number;
  key: string;
}

const ModelFilter: React.FC<ModelFilterProps> = ({
  selectedBrand,
  onConfirm,
  isAdmin = false,
}) => {
  // Mode State
  const [isManageMode, setIsManageMode] = useState(false);

  // Local Data State (VEHICLE_HIERARCHY is now an array)
  const [localHierarchy, setLocalHierarchy] =
    useState<any[]>(VEHICLE_HIERARCHY);
  const [pendingAction, setPendingAction] =
    useState<PendingHierarchyAction | null>(null);
  const [isLoadingHierarchy, setIsLoadingHierarchy] = useState(false);

  // Custom UI Modal State (Replacing native prompt/confirm)
  const [activeModal, setActiveModal] = useState<CustomModalState | null>(null);
  const [modalInputValue, setModalInputValue] = useState("");

  // Drag and Drop State
  const [dragItem, setDragItem] = useState<DragState | null>(null);
  const [dropTarget, setDropTarget] = useState<{
    column: number;
    index: number;
  } | null>(null);

  // Selection State
  const [region, setRegion] = useState<string | null>(null);
  const [modelName, setModelName] = useState<string | null>(null);
  const [date, setDate] = useState<string | null>(null);
  const [code, setCode] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  // Brand data entry point from local state array
  const brandData = useMemo(() => {
    if (!selectedBrand) return null;
    return localHierarchy.find((h) => h.id === selectedBrand.id) || null;
  }, [selectedBrand, localHierarchy]);

  // Determine what each column represents
  const hasRegions = !!(brandData && brandData.regions);
  console.log("brandData:", brandData);
  console.log("hasRegions:", hasRegions);

  // Available data per column
  const availableRegions = useMemo(
    () => (hasRegions ? Object.keys(brandData.regions) : []),
    [brandData, hasRegions],
  );
  console.log("availableRegions:", availableRegions);

  const currentRegionData = useMemo(() => {
    if (!hasRegions) return brandData;
    return region ? brandData.regions[region] : null;
  }, [brandData, hasRegions, region]);

  const availableModels = useMemo(
    () => (currentRegionData ? Object.keys(currentRegionData.models) : []),
    [currentRegionData],
  );

  const currentModelData = useMemo(() => {
    return modelName ? currentRegionData?.models[modelName] : null;
  }, [currentRegionData, modelName]);

  const hasReleases = !!(currentModelData && currentModelData.releases);
  const availableDates = useMemo(
    () => (hasReleases ? Object.keys(currentModelData.releases) : []),
    [currentModelData, hasReleases],
  );

  const availableCodes = useMemo(() => {
    if (!currentModelData) return [];
    if (hasReleases) {
      return date ? currentModelData.releases[date] : [];
    }
    return currentModelData.codes || [];
  }, [currentModelData, hasReleases, date]);

  // Handle Search on models
  const filteredModels = useMemo(
    () =>
      availableModels.filter((m) =>
        m.toLowerCase().includes(search.toLowerCase()),
      ),
    [availableModels, search],
  );

  // Fetch hierarchy data when brand changes
  useEffect(() => {
    if (selectedBrand) {
      setIsLoadingHierarchy(true);
      MockApiClient.getHierarchyByBrandId(selectedBrand.id)
        .then((hierarchyData: VehicleHierarchy) => {
          console.log("API Response:", hierarchyData); // Debug log
          // Transform API response to component expected format
          const transformedData = {
            id: hierarchyData.brandId,
            regions: hierarchyData.regions.reduce((acc: any, region) => {
              acc[region.regionName] = {
                models: region.models.reduce((modelAcc: any, model) => {
                  modelAcc[model.modelName] = {
                    releases: model.releases.reduce(
                      (releaseAcc: any, release) => {
                        releaseAcc[release.period] = release.codes;
                        return releaseAcc;
                      },
                      {},
                    ),
                    codes: model.codes,
                  };
                  return modelAcc;
                }, {}),
              };
              return acc;
            }, {}),
          };
          console.log("Transformed data:", transformedData); // Debug log
          setLocalHierarchy([transformedData]);
          setIsLoadingHierarchy(false);
        })
        .catch((error) => {
          console.error("Failed to fetch hierarchy data:", error);
          setIsLoadingHierarchy(false);
          // Fallback to mock data if API fails
          setLocalHierarchy(VEHICLE_HIERARCHY);
        });
    }
  }, [selectedBrand]);

  // Resets when brand changes
  useEffect(() => {
    setRegion(null);
    setModelName(null);
    setDate(null);
    setCode(null);
    setSearch("");
  }, [selectedBrand]);

  const handleRegionSelect = (r: string) => {
    setRegion(r);
    setModelName(null);
    setDate(null);
    setCode(null);
  };

  const handleModelSelect = (m: string) => {
    setModelName(m);
    setDate(null);
    setCode(null);
  };

  const handleDateSelect = (d: string) => {
    setDate(d);
    setCode(null);
  };

  const handleCodeSelect = (c: string) => {
    setCode(c);
  };

  // Logic to determine if user can confirm selection
  const canConfirm = !!modelName && (hasReleases ? !!date : true) && !!code;

  // 转换数据格式为API所需的格式
  const transformToApiFormat = (hierarchyData: any, brandId: string) => {
    const result: any = {
      id: brandId,
      regions: {},
    };

    if (hierarchyData.regions) {
      // 有地区结构的数据
      Object.keys(hierarchyData.regions).forEach((regionName) => {
        const regionData = hierarchyData.regions[regionName];
        const regionResult: any = {
          models: {},
        };

        Object.keys(regionData.models).forEach((modelName) => {
          const modelData = regionData.models[modelName];
          const modelResult: any = {};

          if (modelData.releases) {
            // 转换releases格式从对象到数组
            const releasesArray: any[] = [];
            Object.keys(modelData.releases).forEach((period) => {
              releasesArray.push({
                period: period,
                codes: modelData.releases[period],
              });
            });
            modelResult.releases = releasesArray;
          }

          if (modelData.codes) {
            modelResult.codes = modelData.codes;
          }

          regionResult.models[modelName] = modelResult;
        });

        result.regions[regionName] = regionResult;
      });
    } else if (hierarchyData.models) {
      // 无地区结构的数据，创建默认地区
      result.regions = {
        一般地区: {
          models: {},
        },
      };

      Object.keys(hierarchyData.models).forEach((modelName) => {
        const modelData = hierarchyData.models[modelName];
        const modelResult: any = {};

        if (modelData.releases) {
          // 转换releases格式从对象到数组
          const releasesArray: any[] = [];
          Object.keys(modelData.releases).forEach((period) => {
            releasesArray.push({
              period: period,
              codes: modelData.releases[period],
            });
          });
          modelResult.releases = releasesArray;
        }

        if (modelData.codes) {
          modelResult.codes = modelData.codes;
        }

        result.regions["一般地区"].models[modelName] = modelResult;
      });
    }

    return result;
  };

  /**
   * Helper to perform deep immutable updates on the array structure.
   */
  const updateHierarchy = (updater: (draft: any[]) => void) => {
    setLocalHierarchy((prev) => {
      const draft = JSON.parse(JSON.stringify(prev));
      updater(draft);
      return draft;
    });
  };

  const handleSaveAll = () => {
    if (!selectedBrand) return;

    // Find brand data in array
    const currentBrandJson = localHierarchy.find(
      (h) => h.id === selectedBrand.id,
    );

    // 转换数据格式为API所需的格式
    const apiData = transformToApiFormat(currentBrandJson, selectedBrand.id);
    console.log("API Data:", apiData);
    setPendingAction({
      title: `确认更新品牌 [${selectedBrand.name}] 的数据`,
      data: apiData,
      action: () => {
        // 调用API更新数据
        MockApiClient.updateVehicleHierarchy(selectedBrand.id, apiData)
          .then((response) => {
            console.log("API更新成功:", response);
            setIsManageMode(false);
            setPendingAction(null);
            alert("车辆数据更新已同步到服务器。");
          })
          .catch((error) => {
            console.error("API更新失败:", error);
            alert("数据同步失败，请稍后重试。");
          });
      },
    });
  };

  const handleReset = () => {
    setActiveModal({
      type: "confirm",
      title: "还原改动",
      description: "确定要还原所有改动吗？当前未保存的修改将丢失。",
      onConfirm: () => {
        setLocalHierarchy(VEHICLE_HIERARCHY);
        setRegion(null);
        setModelName(null);
        setDate(null);
        setCode(null);
        setActiveModal(null);
      },
    });
  };

  // Drag and Drop Logic
  const handleDragStart = (
    e: React.DragEvent,
    column: number,
    index: number,
    key: string,
  ) => {
    if (!isManageMode) return;
    setDragItem({ column, index, key });
    e.dataTransfer.effectAllowed = "move";
    const img = new Image();
    img.src =
      "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
    e.dataTransfer.setDragImage(img, 0, 0);
  };

  const handleDragOver = (
    e: React.DragEvent,
    column: number,
    index: number,
  ) => {
    if (!isManageMode || !dragItem || dragItem.column !== column) return;
    e.preventDefault();
    setDropTarget({ column, index });
  };

  const handleDrop = (
    e: React.DragEvent,
    targetColumn: number,
    targetIndex: number,
  ) => {
    if (
      !isManageMode ||
      !dragItem ||
      dragItem.column !== targetColumn ||
      dragItem.index === targetIndex
    ) {
      setDragItem(null);
      setDropTarget(null);
      return;
    }

    const sourceIndex = dragItem.index;
    const bid = selectedBrand?.id;
    if (!bid) return;

    updateHierarchy((draft) => {
      const brandIdx = draft.findIndex((h: any) => h.id === bid);
      if (brandIdx === -1) return;
      const brandDraft = draft[brandIdx];
      const d_hasRegions = !!brandDraft.regions;

      const reorderObject = (
        obj: Record<string, any>,
        from: number,
        to: number,
      ) => {
        const keys = Object.keys(obj);
        const [movedKey] = keys.splice(from, 1);
        keys.splice(to, 0, movedKey);
        const newObj: Record<string, any> = {};
        keys.forEach((k) => {
          newObj[k] = obj[k];
        });
        return newObj;
      };

      const reorderArray = (arr: any[], from: number, to: number) => {
        const result = Array.from(arr);
        const [removed] = result.splice(from, 1);
        result.splice(to, 0, removed);
        return result;
      };

      if (targetColumn === 1) {
        if (d_hasRegions) {
          brandDraft.regions = reorderObject(
            brandDraft.regions,
            sourceIndex,
            targetIndex,
          );
        } else {
          brandDraft.models = reorderObject(
            brandDraft.models,
            sourceIndex,
            targetIndex,
          );
        }
      } else if (targetColumn === 2) {
        if (d_hasRegions) {
          if (region)
            brandDraft.regions[region].models = reorderObject(
              brandDraft.regions[region].models,
              sourceIndex,
              targetIndex,
            );
        } else if (modelName) {
          const m_draft = brandDraft.models[modelName];
          if (m_draft.releases) {
            m_draft.releases = reorderObject(
              m_draft.releases,
              sourceIndex,
              targetIndex,
            );
          } else if (m_draft.codes) {
            m_draft.codes = reorderArray(
              m_draft.codes,
              sourceIndex,
              targetIndex,
            );
          }
        }
      } else if (targetColumn === 3) {
        const m_draft = d_hasRegions
          ? brandDraft.regions[region!]?.models[modelName!]
          : brandDraft.models[modelName!];
        if (m_draft) {
          if (m_draft.releases) {
            m_draft.releases = reorderObject(
              m_draft.releases,
              sourceIndex,
              targetIndex,
            );
          } else if (m_draft.codes) {
            m_draft.codes = reorderArray(
              m_draft.codes,
              sourceIndex,
              targetIndex,
            );
          }
        }
      } else if (targetColumn === 4) {
        const m_draft = d_hasRegions
          ? brandDraft.regions[region!]?.models[modelName!]
          : brandDraft.models[modelName!];
        if (m_draft && m_draft.releases && m_draft.releases[date!]) {
          m_draft.releases[date!] = reorderArray(
            m_draft.releases[date!],
            sourceIndex,
            targetIndex,
          );
        }
      }
    });

    setDragItem(null);
    setDropTarget(null);
  };

  const handleAddItem = (column: number) => {
    if (!selectedBrand) return;
    const bid = selectedBrand.id;

    setActiveModal({
      type: "input",
      title: "新增项",
      description: "请输入名称:",
      defaultValue: "",
      onConfirm: (name) => {
        if (!name) return;
        updateHierarchy((draft) => {
          let brandIdx = draft.findIndex((h: any) => h.id === bid);
          if (brandIdx === -1) {
            draft.push({ id: bid, models: {} });
            brandIdx = draft.length - 1;
          }
          const brandDraft = draft[brandIdx];
          const d_hasRegions = !!brandDraft.regions;

          if (column === 1) {
            // Region or Model
            if (d_hasRegions) {
              brandDraft.regions[name] = { models: {} };
            } else {
              brandDraft.models[name] = { codes: [] };
            }
          } else if (column === 2) {
            // Model or Release/Code
            if (d_hasRegions) {
              if (region && brandDraft.regions[region]) {
                brandDraft.regions[region].models[name] = { releases: {} };
              }
            } else if (modelName && brandDraft.models[modelName]) {
              const m_draft = brandDraft.models[modelName];
              if (m_draft.releases) {
                m_draft.releases[name] = [];
              } else {
                m_draft.releases = { [name]: [] };
                delete m_draft.codes;
              }
            }
          } else if (column === 3) {
            // Release or Codes
            if (modelName) {
              const m_draft = d_hasRegions
                ? brandDraft.regions[region!]?.models[modelName]
                : brandDraft.models[modelName];
              if (m_draft) {
                if (m_draft.releases) {
                  m_draft.releases[name] = [];
                } else {
                  if (!m_draft.codes) m_draft.codes = [];
                  m_draft.codes.push(name);
                }
              }
            }
          } else if (column === 4) {
            // Codes
            if (modelName && date) {
              const m_draft = d_hasRegions
                ? brandDraft.regions[region!]?.models[modelName]
                : brandDraft.models[modelName];
              if (m_draft && m_draft.releases && m_draft.releases[date]) {
                m_draft.releases[date].push(name);
              }
            }
          }
        });
        setActiveModal(null);
      },
    });
  };

  const handleDeleteItem = (
    e: React.MouseEvent,
    column: number,
    key: string,
  ) => {
    e.stopPropagation();
    if (!selectedBrand) return;
    const bid = selectedBrand.id;

    setActiveModal({
      type: "confirm",
      title: "确认删除",
      description: `确定删除 "${key}" 吗？`,
      onConfirm: () => {
        updateHierarchy((draft) => {
          const brandIdx = draft.findIndex((h: any) => h.id === bid);
          if (brandIdx === -1) return;
          const brandDraft = draft[brandIdx];
          const d_hasRegions = !!brandDraft.regions;

          if (column === 1) {
            if (d_hasRegions) {
              delete brandDraft.regions[key];
            } else {
              delete brandDraft.models[key];
            }
          } else if (column === 2) {
            if (d_hasRegions) {
              if (region) delete brandDraft.regions[region].models[key];
            } else {
              const m_draft = brandDraft.models[modelName!];
              if (m_draft && m_draft.releases) {
                delete m_draft.releases[key];
              }
            }
          } else if (column === 3) {
            const m_draft = d_hasRegions
              ? brandDraft.regions[region!]?.models[modelName!]
              : brandDraft.models[modelName!];
            if (m_draft) {
              if (m_draft.releases) {
                delete m_draft.releases[key];
              } else if (m_draft.codes) {
                m_draft.codes = m_draft.codes.filter((c: string) => c !== key);
              }
            }
          } else if (column === 4) {
            const m_draft = d_hasRegions
              ? brandDraft.regions[region!]?.models[modelName!]
              : brandDraft.models[modelName!];
            if (m_draft && m_draft.releases && m_draft.releases[date!]) {
              m_draft.releases[date!] = m_draft.releases[date!].filter(
                (c: string) => c !== key,
              );
            }
          }
        });

        // Cleanup selection
        if (column === 1) {
          if (hasRegions) {
            if (region === key) setRegion(null);
          } else {
            if (modelName === key) setModelName(null);
          }
        } else if (column === 2) {
          if (hasRegions) {
            if (modelName === key) setModelName(null);
          } else {
            if (date === key) setDate(null);
          }
        } else if (column === 3) {
          if (hasReleases) {
            if (date === key) setDate(null);
          } else {
            if (code === key) setCode(null);
          }
        } else if (column === 4) {
          if (code === key) setCode(null);
        }
        setActiveModal(null);
      },
    });
  };

  const handleEditItem = (
    e: React.MouseEvent,
    column: number,
    oldKey: string,
  ) => {
    e.stopPropagation();
    if (!selectedBrand) return;
    const bid = selectedBrand.id;

    setActiveModal({
      type: "input",
      title: "编辑名称",
      description: "请输入新名称:",
      defaultValue: oldKey,
      onConfirm: (newKey) => {
        if (!newKey || newKey === oldKey) {
          setActiveModal(null);
          return;
        }
        updateHierarchy((draft) => {
          const brandIdx = draft.findIndex((h: any) => h.id === bid);
          if (brandIdx === -1) return;
          const brandDraft = draft[brandIdx];
          const d_hasRegions = !!brandDraft.regions;

          if (column === 1) {
            if (d_hasRegions) {
              brandDraft.regions[newKey] = brandDraft.regions[oldKey];
              delete brandDraft.regions[oldKey];
            } else {
              brandDraft.models[newKey] = brandDraft.models[oldKey];
              delete brandDraft.models[oldKey];
            }
          } else if (column === 2) {
            if (d_hasRegions) {
              if (region && brandDraft.regions[region]) {
                brandDraft.regions[region].models[newKey] =
                  brandDraft.regions[region].models[oldKey];
                delete brandDraft.regions[region].models[oldKey];
              }
            } else {
              const m_draft = brandDraft.models[modelName!];
              if (m_draft && m_draft.releases) {
                m_draft.releases[newKey] = m_draft.releases[oldKey];
                delete m_draft.releases[oldKey];
              }
            }
          } else if (column === 3) {
            const m_draft = d_hasRegions
              ? brandDraft.regions[region!]?.models[modelName!]
              : brandDraft.models[modelName!];
            if (m_draft) {
              if (m_draft.releases) {
                m_draft.releases[newKey] = m_draft.releases[oldKey];
                delete m_draft.releases[oldKey];
              } else if (m_draft.codes) {
                const idx = m_draft.codes.indexOf(oldKey);
                if (idx > -1) m_draft.codes[idx] = newKey;
              }
            }
          } else if (column === 4) {
            const m_draft = d_hasRegions
              ? brandDraft.regions[region!]?.models[modelName!]
              : brandDraft.models[modelName!];
            if (m_draft && m_draft.releases && m_draft.releases[date!]) {
              const idx = m_draft.releases[date!].indexOf(oldKey);
              if (idx > -1) m_draft.releases[date!][idx] = newKey;
            }
          }
        });

        // Update selection
        if (column === 1) {
          if (hasRegions) {
            if (region === oldKey) setRegion(newKey);
          } else {
            if (modelName === oldKey) setModelName(newKey);
          }
        } else if (column === 2) {
          if (hasRegions) {
            if (modelName === oldKey) setModelName(newKey);
          } else {
            if (date === oldKey) setDate(newKey);
          }
        } else if (column === 3) {
          if (hasReleases) {
            if (date === oldKey) setDate(newKey);
          } else {
            if (code === oldKey) setCode(newKey);
          }
        } else if (column === 4) {
          if (code === oldKey) setCode(newKey);
        }
        setActiveModal(null);
      },
    });
  };

  // Sync internal modal input with default value when modal opens
  useEffect(() => {
    if (activeModal && activeModal.type === "input") {
      setModalInputValue(activeModal.defaultValue || "");
    }
  }, [activeModal]);

  // Column Labels
  const col1Label = hasRegions ? "1. 选择地区" : "1. 汽车型号";
  const col2Label = hasRegions
    ? "2. 汽车型号"
    : hasReleases
      ? "2. 发布日期"
      : "2. 车型代码";
  const col3Label = hasRegions
    ? hasReleases
      ? "3. 发布日期"
      : "3. 车型代码"
    : hasReleases
      ? "3. 车型代码"
      : "---";
  const col4Label = hasRegions && hasReleases ? "4. 车型代码" : "---";

  if (isLoadingHierarchy) {
    return (
      <div className="flex-1 flex items-center justify-center bg-white">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin"></div>
          <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">
            正在同步车辆层级...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col h-full bg-white border-t border-gray-200 select-none ${isManageMode ? "ring-4 ring-orange-500/10" : ""}`}
    >
      {/* Management Toolbar - Only visible to Admins */}
      {isAdmin && (
        <div
          className={`px-4 py-2 border-b flex items-center justify-between transition-colors ${isManageMode ? "bg-orange-50" : "bg-white"}`}
        >
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-1 bg-gray-100 p-1 rounded-full border border-gray-200">
              <button
                onClick={() => setIsManageMode(false)}
                className={`px-4 py-1 rounded-full text-[10px] font-black uppercase transition-all ${!isManageMode ? "bg-blue-600 text-white shadow-md" : "text-gray-400"}`}
              >
                浏览模式
              </button>
              <button
                onClick={() => setIsManageMode(true)}
                className={`px-4 py-1 rounded-full text-[10px] font-black uppercase transition-all ${isManageMode ? "bg-orange-600 text-white shadow-md" : "text-gray-400"}`}
              >
                管理模式
              </button>
            </div>
            {isManageMode && (
              <span className="text-[10px] font-bold text-orange-600 animate-pulse">
                <i className="fa-solid fa-screwdriver-wrench mr-1"></i>
                正在编辑车辆层级结构 (支持拖动排序)
              </span>
            )}
          </div>

          {isManageMode && (
            <div className="flex items-center space-x-2">
              <button
                onClick={handleReset}
                className="px-4 py-1.5 bg-white border border-gray-200 text-gray-500 text-[10px] font-bold uppercase rounded hover:bg-gray-50"
              >
                还原
              </button>
              <button
                onClick={handleSaveAll}
                className="px-4 py-1.5 bg-emerald-600 text-white text-[10px] font-bold uppercase rounded shadow-lg shadow-emerald-200 hover:bg-emerald-700 active:scale-95 transition-all"
              >
                保存更改并预览 JSON
              </button>
            </div>
          )}
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* Column 1 */}
        <div className="flex-1 border-r border-gray-100 flex flex-col">
          <div className="px-4 py-2 bg-gray-50 text-[11px] font-bold text-gray-500 uppercase border-b border-gray-100 flex justify-between items-center h-[41px]">
            <span>{col1Label}</span>
            {isManageMode && (
              <button
                onClick={() => handleAddItem(1)}
                className="text-orange-600 hover:scale-110"
              >
                <i className="fa-solid fa-plus-circle"></i>
              </button>
            )}
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {(hasRegions ? availableRegions : filteredModels).map(
              (item, idx) => (
                <div
                  key={item}
                  draggable={isManageMode}
                  onDragStart={(e) => handleDragStart(e, 1, idx, item)}
                  onDragOver={(e) => handleDragOver(e, 1, idx)}
                  onDrop={(e) => handleDrop(e, 1, idx)}
                  onClick={() =>
                    hasRegions
                      ? handleRegionSelect(item)
                      : handleModelSelect(item)
                  }
                  className={`group px-4 py-3 text-sm cursor-pointer border-l-4 transition-all flex justify-between items-center ${
                    (hasRegions ? region === item : modelName === item)
                      ? isManageMode
                        ? "bg-orange-600 text-white border-orange-600 shadow-md font-bold"
                        : "bg-blue-600 text-white border-blue-600 font-bold shadow-md"
                      : "hover:bg-gray-50 border-transparent text-gray-700"
                  } ${dropTarget?.column === 1 && dropTarget?.index === idx ? "border-t-4 border-t-blue-500" : ""} ${dragItem?.column === 1 && dragItem?.index === idx ? "opacity-30" : ""}`}
                >
                  <div className="flex items-center space-x-2 overflow-hidden">
                    {isManageMode && (
                      <i className="fa-solid fa-grip-vertical text-white/40 text-[10px] cursor-move"></i>
                    )}
                    <span className="truncate">{item}</span>
                  </div>
                  {isManageMode && (
                    <div className="flex space-x-2 opacity-0 group-hover:opacity-100 flex-shrink-0">
                      <button
                        onClick={(e) => handleEditItem(e, 1, item)}
                        className="text-white/60 hover:text-white"
                      >
                        <i className="fa-solid fa-edit text-xs"></i>
                      </button>
                      <button
                        onClick={(e) => handleDeleteItem(e, 1, item)}
                        className="text-white/60 hover:text-white"
                      >
                        <i className="fa-solid fa-trash text-xs"></i>
                      </button>
                    </div>
                  )}
                </div>
              ),
            )}
          </div>
        </div>

        {/* Column 2 */}
        <div className="flex-[1.5] border-r border-gray-100 flex flex-col bg-gray-50/20">
          <div className="px-4 py-2 bg-gray-50 text-[11px] font-bold text-gray-500 uppercase border-b border-gray-100 flex justify-between items-center h-[41px]">
            <span>{col2Label}</span>
            {isManageMode && (hasRegions ? !!region : !!modelName) && (
              <button
                onClick={() => handleAddItem(2)}
                className="text-orange-600 hover:scale-110"
              >
                <i className="fa-solid fa-plus-circle"></i>
              </button>
            )}
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {hasRegions ? (
              region ? (
                filteredModels.map((m, idx) => (
                  <div
                    key={m}
                    draggable={isManageMode}
                    onDragStart={(e) => handleDragStart(e, 2, idx, m)}
                    onDragOver={(e) => handleDragOver(e, 2, idx)}
                    onDrop={(e) => handleDrop(e, 2, idx)}
                    onClick={() => handleModelSelect(m)}
                    className={`group px-4 py-3 text-sm cursor-pointer border-l-4 transition-all flex justify-between items-center ${modelName === m ? (isManageMode ? "bg-orange-600 text-white border-orange-600 font-bold shadow-md" : "bg-blue-600 text-white border-blue-600 font-bold shadow-md") : "hover:bg-gray-50 border-transparent text-gray-700"} ${dropTarget?.column === 2 && dropTarget?.index === idx ? "border-t-4 border-t-blue-500" : ""} ${dragItem?.column === 2 && dragItem?.index === idx ? "opacity-30" : ""}`}
                  >
                    <div className="flex items-center space-x-2 overflow-hidden">
                      {isManageMode && (
                        <i className="fa-solid fa-grip-vertical text-white/40 text-[10px] cursor-move"></i>
                      )}
                      <span className="truncate">{m}</span>
                    </div>
                    {isManageMode && (
                      <div className="flex space-x-2 opacity-0 group-hover:opacity-100 flex-shrink-0">
                        <button
                          onClick={(e) => handleEditItem(e, 2, m)}
                          className="text-white/60 hover:text-white"
                        >
                          <i className="fa-solid fa-edit text-xs"></i>
                        </button>
                        <button
                          onClick={(e) => handleDeleteItem(e, 2, m)}
                          className="text-white/60 hover:text-white"
                        >
                          <i className="fa-solid fa-trash text-xs"></i>
                        </button>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-gray-300 italic text-xs px-6 text-center">
                  请先选择地区
                </div>
              )
            ) : modelName ? (
              hasReleases ? (
                availableDates.map((d, idx) => (
                  <div
                    key={d}
                    draggable={isManageMode}
                    onDragStart={(e) => handleDragStart(e, 2, idx, d)}
                    onDragOver={(e) => handleDragOver(e, 2, idx)}
                    onDrop={(e) => handleDrop(e, 2, idx)}
                    onClick={() => handleDateSelect(d)}
                    className={`group px-4 py-3 text-sm cursor-pointer border-l-4 transition-all flex justify-between items-center ${date === d ? (isManageMode ? "bg-orange-600 text-white border-orange-600 font-bold shadow-md" : "bg-blue-600 text-white border-blue-600 font-bold shadow-md") : "hover:bg-gray-50 border-transparent text-gray-700"} ${dropTarget?.column === 2 && dropTarget?.index === idx ? "border-t-4 border-t-blue-500" : ""} ${dragItem?.column === 2 && dragItem?.index === idx ? "opacity-30" : ""}`}
                  >
                    <div className="flex items-center space-x-2 overflow-hidden">
                      {isManageMode && (
                        <i className="fa-solid fa-grip-vertical text-white/40 text-[10px] cursor-move"></i>
                      )}
                      <span className="truncate">{d}</span>
                    </div>
                    {isManageMode && (
                      <div className="flex space-x-2 opacity-0 group-hover:opacity-100 flex-shrink-0">
                        <button
                          onClick={(e) => handleEditItem(e, 2, d)}
                          className="text-white/60 hover:text-white"
                        >
                          <i className="fa-solid fa-edit text-xs"></i>
                        </button>
                        <button
                          onClick={(e) => handleDeleteItem(e, 2, d)}
                          className="text-white/60 hover:text-white"
                        >
                          <i className="fa-solid fa-trash text-xs"></i>
                        </button>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                availableCodes.map((c, idx) => (
                  <div
                    key={c}
                    draggable={isManageMode}
                    onDragStart={(e) => handleDragStart(e, 2, idx, c)}
                    onDragOver={(e) => handleDragOver(e, 2, idx)}
                    onDrop={(e) => handleDrop(e, 2, idx)}
                    onClick={() => handleCodeSelect(c)}
                    className={`group px-4 py-3 text-sm cursor-pointer border-l-4 transition-all flex justify-between items-center ${code === c ? (isManageMode ? "bg-orange-600 text-white border-orange-600 font-bold shadow-md font-mono" : "bg-blue-600 text-white border-blue-600 font-bold shadow-md font-mono") : "hover:bg-gray-50 border-transparent text-gray-700 font-mono"} ${dropTarget?.column === 2 && dropTarget?.index === idx ? "border-t-4 border-t-blue-500" : ""} ${dragItem?.column === 2 && dragItem?.index === idx ? "opacity-30" : ""}`}
                  >
                    <div className="flex items-center space-x-2 overflow-hidden">
                      {isManageMode && (
                        <i className="fa-solid fa-grip-vertical text-white/40 text-[10px] cursor-move"></i>
                      )}
                      <span className="truncate">{c}</span>
                    </div>
                    {isManageMode && (
                      <div className="flex space-x-2 opacity-0 group-hover:opacity-100 flex-shrink-0">
                        <button
                          onClick={(e) => handleEditItem(e, 2, c)}
                          className="text-white/60 hover:text-white"
                        >
                          <i className="fa-solid fa-edit text-xs"></i>
                        </button>
                        <button
                          onClick={(e) => handleDeleteItem(e, 2, c)}
                          className="text-white/60 hover:text-white"
                        >
                          <i className="fa-solid fa-trash text-xs"></i>
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-gray-300 italic text-xs px-6 text-center">
                请先选择车型
              </div>
            )}
          </div>
        </div>

        {/* Column 3 */}
        <div className="flex-[1.2] border-r border-gray-100 flex flex-col bg-gray-50/10">
          <div className="px-4 py-2 bg-gray-50 text-[11px] font-bold text-gray-500 uppercase border-b border-gray-100 flex justify-between items-center h-[41px]">
            <span>{col3Label}</span>
            {isManageMode && modelName && (
              <button
                onClick={() => handleAddItem(3)}
                className="text-orange-600 hover:scale-110"
              >
                <i className="fa-solid fa-plus-circle"></i>
              </button>
            )}
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {modelName ? (
              hasRegions ? (
                hasReleases ? (
                  availableDates.map((d, idx) => (
                    <div
                      key={d}
                      draggable={isManageMode}
                      onDragStart={(e) => handleDragStart(e, 3, idx, d)}
                      onDragOver={(e) => handleDragOver(e, 3, idx)}
                      onDrop={(e) => handleDrop(e, 3, idx)}
                      onClick={() => handleDateSelect(d)}
                      className={`group px-4 py-3 text-sm cursor-pointer border-l-4 transition-all flex justify-between items-center ${date === d ? (isManageMode ? "bg-orange-600 text-white border-orange-600 font-bold shadow-md" : "bg-blue-600 text-white border-blue-600 font-bold shadow-md") : "hover:bg-gray-50 border-transparent text-gray-700"} ${dropTarget?.column === 3 && dropTarget?.index === idx ? "border-t-4 border-t-blue-500" : ""} ${dragItem?.column === 3 && dragItem?.index === idx ? "opacity-30" : ""}`}
                    >
                      <div className="flex items-center space-x-2 overflow-hidden">
                        {isManageMode && (
                          <i className="fa-solid fa-grip-vertical text-white/40 text-[10px] cursor-move"></i>
                        )}
                        <span className="truncate">{d}</span>
                      </div>
                      {isManageMode && (
                        <div className="flex space-x-2 opacity-0 group-hover:opacity-100 flex-shrink-0">
                          <button
                            onClick={(e) => handleEditItem(e, 3, d)}
                            className="text-white/60 hover:text-white"
                          >
                            <i className="fa-solid fa-edit text-xs"></i>
                          </button>
                          <button
                            onClick={(e) => handleDeleteItem(e, 3, d)}
                            className="text-white/60 hover:text-white"
                          >
                            <i className="fa-solid fa-trash text-xs"></i>
                          </button>
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  availableCodes.map((c, idx) => (
                    <div
                      key={c}
                      draggable={isManageMode}
                      onDragStart={(e) => handleDragStart(e, 3, idx, c)}
                      onDragOver={(e) => handleDragOver(e, 3, idx)}
                      onDrop={(e) => handleDrop(e, 3, idx)}
                      onClick={() => handleCodeSelect(c)}
                      className={`group px-4 py-3 text-sm cursor-pointer border-l-4 transition-all flex justify-between items-center ${code === c ? (isManageMode ? "bg-orange-600 text-white border-orange-600 font-bold shadow-md font-mono" : "bg-blue-600 text-white border-blue-600 font-bold shadow-md font-mono") : "hover:bg-gray-50 border-transparent text-gray-700 font-mono"} ${dropTarget?.column === 3 && dropTarget?.index === idx ? "border-t-4 border-t-blue-500" : ""} ${dragItem?.column === 3 && dragItem?.index === idx ? "opacity-30" : ""}`}
                    >
                      <div className="flex items-center space-x-2 overflow-hidden">
                        {isManageMode && (
                          <i className="fa-solid fa-grip-vertical text-white/40 text-[10px] cursor-move"></i>
                        )}
                        <span className="truncate">{c}</span>
                      </div>
                      {isManageMode && (
                        <div className="flex space-x-2 opacity-0 group-hover:opacity-100 flex-shrink-0">
                          <button
                            onClick={(e) => handleEditItem(e, 3, c)}
                            className="text-white/60 hover:text-white"
                          >
                            <i className="fa-solid fa-edit text-xs"></i>
                          </button>
                          <button
                            onClick={(e) => handleDeleteItem(e, 3, c)}
                            className="text-white/60 hover:text-white"
                          >
                            <i className="fa-solid fa-trash text-xs"></i>
                          </button>
                        </div>
                      )}
                    </div>
                  ))
                )
              ) : hasReleases ? (
                date ? (
                  availableCodes.map((c, idx) => (
                    <div
                      key={c}
                      draggable={isManageMode}
                      onDragStart={(e) => handleDragStart(e, 3, idx, c)}
                      onDragOver={(e) => handleDragOver(e, 3, idx)}
                      onDrop={(e) => handleDrop(e, 3, idx)}
                      onClick={() => handleCodeSelect(c)}
                      className={`group px-4 py-3 text-sm cursor-pointer border-l-4 transition-all flex justify-between items-center ${code === c ? (isManageMode ? "bg-orange-600 text-white border-orange-600 font-bold shadow-md font-mono" : "bg-blue-600 text-white border-blue-600 font-bold shadow-md font-mono") : "hover:bg-gray-50 border-transparent text-gray-700 font-mono"} ${dropTarget?.column === 3 && dropTarget?.index === idx ? "border-t-4 border-t-blue-500" : ""} ${dragItem?.column === 3 && dragItem?.index === idx ? "opacity-30" : ""}`}
                    >
                      <div className="flex items-center space-x-2 overflow-hidden">
                        {isManageMode && (
                          <i className="fa-solid fa-grip-vertical text-white/40 text-[10px] cursor-move"></i>
                        )}
                        <span className="truncate">{c}</span>
                      </div>
                      {isManageMode && (
                        <div className="flex space-x-2 opacity-0 group-hover:opacity-100 flex-shrink-0">
                          <button
                            onClick={(e) => handleEditItem(e, 3, c)}
                            className="text-white/60 hover:text-white"
                          >
                            <i className="fa-solid fa-edit text-xs"></i>
                          </button>
                          <button
                            onClick={(e) => handleDeleteItem(e, 3, c)}
                            className="text-white/60 hover:text-white"
                          >
                            <i className="fa-solid fa-trash text-xs"></i>
                          </button>
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-gray-300 italic text-xs px-6 text-center">
                    请先选择发布日期
                  </div>
                )
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-gray-300 italic text-xs px-6 text-center">
                  无更多选项
                </div>
              )
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-gray-300 italic text-xs px-6 text-center">
                请先完成前置选择
              </div>
            )}
          </div>
        </div>

        {/* Column 4 */}
        <div className="flex-[1.2] flex flex-col">
          <div className="px-4 py-2 bg-gray-50 text-[11px] font-bold text-gray-500 uppercase border-b border-gray-100 flex justify-between items-center h-[41px]">
            <span>{col4Label}</span>
            <div className="flex items-center space-x-2">
              {isManageMode && date && (
                <button
                  onClick={() => handleAddItem(4)}
                  className="text-orange-600 hover:scale-110"
                >
                  <i className="fa-solid fa-plus-circle"></i>
                </button>
              )}
              <button
                disabled={!canConfirm || isManageMode}
                onClick={() =>
                  onConfirm({
                    region: region || "N/A",
                    modelName: modelName!,
                    dateRange: date || "N/A",
                    modelCode: code!,
                  })
                }
                className={`px-4 py-1.5 text-[10px] rounded font-bold uppercase tracking-wider transition-all ${
                  canConfirm && !isManageMode
                    ? "bg-blue-600 text-white hover:bg-blue-700 shadow-md active:scale-95"
                    : "bg-gray-200 text-gray-400 cursor-not-allowed"
                }`}
              >
                确认选择
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {hasRegions && hasReleases ? (
              date ? (
                availableCodes.map((c, idx) => (
                  <div
                    key={c}
                    draggable={isManageMode}
                    onDragStart={(e) => handleDragStart(e, 4, idx, c)}
                    onDragOver={(e) => handleDragOver(e, 4, idx)}
                    onDrop={(e) => handleDrop(e, 4, idx)}
                    onClick={() => handleCodeSelect(c)}
                    className={`group px-4 py-3 text-sm cursor-pointer border-l-4 transition-all flex justify-between items-center ${code === c ? (isManageMode ? "bg-orange-600 text-white border-orange-600 font-bold shadow-md font-mono" : "bg-blue-600 text-white border-blue-600 font-bold shadow-md font-mono") : "hover:bg-gray-50 border-transparent text-gray-700 font-mono"} ${dropTarget?.column === 4 && dropTarget?.index === idx ? "border-t-4 border-t-blue-500" : ""} ${dragItem?.column === 4 && dragItem?.index === idx ? "opacity-30" : ""}`}
                  >
                    <div className="flex items-center space-x-2 overflow-hidden">
                      {isManageMode && (
                        <i className="fa-solid fa-grip-vertical text-white/40 text-[10px] cursor-move"></i>
                      )}
                      <span className="truncate">{c}</span>
                    </div>
                    {isManageMode && (
                      <div className="flex space-x-2 opacity-0 group-hover:opacity-100 flex-shrink-0">
                        <button
                          onClick={(e) => handleEditItem(e, 4, c)}
                          className="text-white/60 hover:text-white"
                        >
                          <i className="fa-solid fa-edit text-xs"></i>
                        </button>
                        <button
                          onClick={(e) => handleDeleteItem(e, 4, c)}
                          className="text-white/60 hover:text-white"
                        >
                          <i className="fa-solid fa-trash text-xs"></i>
                        </button>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-gray-300 italic text-xs px-6 text-center">
                  请选择发布日期
                </div>
              )
            ) : (
              <div className="flex flex-col items-center justify-center h-full p-6 text-center space-y-4">
                <i
                  className={`fa-solid fa-circle-check text-5xl transition-colors ${canConfirm ? "text-blue-200" : "text-gray-100"}`}
                ></i>
                <p className="text-[11px] text-gray-400 font-bold uppercase tracking-widest leading-relaxed">
                  {canConfirm
                    ? isManageMode
                      ? "正在管理模式，点击上方保存"
                      : "选择已就绪，请点击确认"
                    : "完成前置过滤以查看代码"}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Custom Action UI Modal (Replacement for prompt/confirm) */}
      {activeModal && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setActiveModal(null)}
          />
          <div className="relative bg-white w-full max-sm rounded-xl shadow-2xl overflow-hidden animate-in zoom-in duration-200 border border-gray-100">
            <div
              className={`px-6 py-4 flex items-center justify-between border-b ${activeModal.type === "confirm" ? "bg-orange-50" : "bg-blue-50"}`}
            >
              <h3
                className={`text-sm font-black uppercase tracking-widest ${activeModal.type === "confirm" ? "text-orange-700" : "text-blue-700"}`}
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
              {activeModal.type === "input" && (
                <input
                  autoFocus
                  className="w-full px-4 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 outline-none font-bold"
                  value={modalInputValue}
                  onChange={(e) => setModalInputValue(e.target.value)}
                  onKeyDown={(e) =>
                    e.key === "Enter" && activeModal.onConfirm(modalInputValue)
                  }
                  placeholder="在此输入..."
                />
              )}
              <div className="flex space-x-2 pt-2">
                <button
                  onClick={() => setActiveModal(null)}
                  className="flex-1 py-2 text-[10px] font-black uppercase tracking-widest bg-gray-100 text-gray-500 rounded hover:bg-gray-200 transition-all"
                >
                  取消
                </button>
                <button
                  onClick={() =>
                    activeModal.onConfirm(
                      activeModal.type === "input"
                        ? modalInputValue
                        : undefined,
                    )
                  }
                  className={`flex-[1.5] py-2 text-[10px] font-black uppercase tracking-widest text-white rounded shadow-lg transition-all active:scale-95 ${
                    activeModal.type === "confirm"
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
      {pendingAction && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
            onClick={() => setPendingAction(null)}
          />
          <div className="relative bg-[#1a202c] w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden border border-white/10 animate-in zoom-in duration-200">
            <div className="px-6 py-4 flex items-center justify-between border-b border-white/5 bg-emerald-500/10">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center bg-emerald-500 text-white">
                  <i className="fa-solid fa-database text-sm"></i>
                </div>
                <div>
                  <h3 className="text-white text-sm font-black uppercase tracking-widest">
                    {pendingAction.title}
                  </h3>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">
                    Review and confirm the new vehicle data structure
                  </p>
                </div>
              </div>
              <button
                onClick={() => setPendingAction(null)}
                className="text-gray-500 hover:text-white transition-colors"
              >
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
                  拒绝 / Discard
                </button>
                <button
                  onClick={() => {
                    pendingAction.action();
                  }}
                  className="flex-[1.5] py-3 text-white text-[11px] font-black uppercase tracking-widest rounded-lg shadow-xl transition-all active:scale-95 bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/40"
                >
                  <i className="fa-solid fa-check-double mr-2"></i>
                  接受改动 / Apply Changes
                </button>
              </div>
            </div>

            <div className="px-6 py-3 bg-black/30 border-t border-white/5">
              <p className="text-[9px] text-gray-500 font-medium text-center italic">
                注意：确认后车辆层级数据将在当前会话中生效。
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ModelFilter;

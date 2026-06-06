import React, { useState, useEffect } from "react";
import {
  ViewStep,
  Brand,
  ModelInfo,
  MainCategory,
  SubCategory,
  CartItem,
} from "./types";
import Header from "./components/Header";
import Breadcrumbs from "./components/Breadcrumbs";
import BrandSelector from "./components/BrandSelector";
import ModelFilter from "./components/ModelFilter";
import CategorySelector from "./components/CategorySelector";
import CategoryManager from "./components/CategoryManager";
import PartDetailViewer from "./components/PartDetailViewer";
import CartModal from "./components/CartModal";
import LoginModal from "./components/LoginModal";
import Home from "./components/Home";
import SearchParts from "./components/SearchParts";
import { MockApiClient } from "./services/repositoryClient";

const App: React.FC = () => {
  const [step, setStep] = useState<ViewStep>(ViewStep.HOME);
  const [selectedBrand, setSelectedBrand] = useState<Brand | null>(null);
  const [selectedModel, setSelectedModel] = useState<ModelInfo | null>(null);
  const [selectedMainCategory, setSelectedMainCategory] =
    useState<MainCategory | null>(null);
  const [selectedSubCategory, setSelectedSubCategory] =
    useState<SubCategory | null>(null);

  // Auth State
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  // Cart State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState(false);

  // Auto-login if token exists
  useEffect(() => {
    if (MockApiClient.hasAccessToken()) {
      MockApiClient.getProfile()
        .then((profile) => {
          setCurrentUser(profile.username);
          setIsAdmin(profile.role === "Administrator");
        })
        .catch(() => {
          localStorage.removeItem("ev_token");
        });
    }
  }, []);

  const handleStart = () => {
    if (!currentUser) {
      setIsLoginModalOpen(true);
    } else {
      setStep(ViewStep.BRAND_SELECT);
    }
  };

  const handleLoginSuccess = (username: string, adminStatus: boolean) => {
    setCurrentUser(username);
    setIsAdmin(adminStatus);
    setStep(ViewStep.BRAND_SELECT);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setIsAdmin(false);
    localStorage.removeItem("ev_token");
    setStep(ViewStep.HOME);
  };

  const handleBrandSelect = (brand: Brand) => {
    setSelectedBrand(brand);
    setStep(ViewStep.MODEL_FILTER);
  };

  const handleModelConfirm = (model: ModelInfo) => {
    setSelectedModel(model);
    setStep(ViewStep.CATEGORY_SELECT);
  };

  const handleSubCategorySelect = (sub: SubCategory, main: MainCategory) => {
    setSelectedMainCategory(main);
    setSelectedSubCategory(sub);
    setStep(ViewStep.PART_DETAIL);
  };

  const addToCart = (item: CartItem) => {
    // 检验是否重复：如果 oeNumber 或 partsNumber 任意一项在采购单中存在
    const isDuplicate = cart.some((cartItem) => {
      const cartPart = cartItem.part;
      const newPart = item.part;
      return (
        (cartPart.oeNumber && newPart.oeNumber && cartPart.oeNumber === newPart.oeNumber) ||
        (cartPart.partsNumber && newPart.partsNumber && cartPart.partsNumber === newPart.partsNumber)
      );
    });

    if (isDuplicate) {
      setDuplicateWarning(true);
      return;
    }

    setCart((prev) => [...prev, item]);
    setIsCartOpen(true);
  };

  const removeFromCart = (cartItemId: string) => {
    setCart((prev) => prev.filter((item) => item.id !== cartItemId));
  };

  const handleBack = () => {
    if (step === ViewStep.PART_DETAIL) setStep(ViewStep.CATEGORY_SELECT);
    else if (step === ViewStep.CATEGORY_SELECT) setStep(ViewStep.MODEL_FILTER);
    else if (step === ViewStep.MODEL_FILTER) setStep(ViewStep.BRAND_SELECT);
    else if (step === ViewStep.BRAND_SELECT) setStep(ViewStep.HOME);
    else if (step === ViewStep.SEARCH) setStep(ViewStep.HOME);
  };

  const handleNavigateTo = (targetStep: ViewStep) => {
    if (!currentUser) {
      setIsLoginModalOpen(true);
      return;
    }

    if (targetStep === ViewStep.BRAND_SELECT) {
      setStep(ViewStep.BRAND_SELECT);
    } else if (targetStep === ViewStep.MODEL_FILTER && selectedBrand) {
      setStep(ViewStep.MODEL_FILTER);
    } else if (targetStep === ViewStep.CATEGORY_SELECT && selectedModel) {
      setStep(ViewStep.CATEGORY_SELECT);
    } else if (targetStep === ViewStep.PART_DETAIL && selectedSubCategory) {
      setStep(ViewStep.PART_DETAIL);
    }
  };

  const renderContent = () => {
    switch (step) {
      case ViewStep.HOME:
        return <Home onStart={handleStart} />;
      case ViewStep.BRAND_SELECT:
        return <BrandSelector onSelect={handleBrandSelect} isAdmin={isAdmin} />;
      case ViewStep.MODEL_FILTER:
        return (
          <ModelFilter
            selectedBrand={selectedBrand}
            onConfirm={handleModelConfirm}
            isAdmin={isAdmin}
          />
        );
      case ViewStep.CATEGORY_SELECT:
        return (
          <CategorySelector
            onSelect={handleSubCategorySelect}
            selectedModel={selectedModel}
            isAdmin={isAdmin}
          />
        );
      case ViewStep.CATEGORY_MANAGER:
        return (
          <CategoryManager
            selectedModel={selectedModel}
          />
        );
      case ViewStep.PART_DETAIL:
        return (
          <PartDetailViewer
            subCategory={selectedSubCategory!}
            onAddToCart={addToCart}
            isAdmin={isAdmin}
          />
        );
      case ViewStep.SEARCH:
        return (
          <SearchParts onAddToCart={addToCart} isAdmin={isAdmin} />
        );
      default:
        return <Home onStart={handleStart} />;
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-100 text-gray-800">
      <Header
        currentUser={currentUser}
        onLogout={handleLogout}
        onLoginClick={() => setIsLoginModalOpen(true)}
        onSearchClick={() => {
          if (!currentUser) setIsLoginModalOpen(true);
          else setStep(ViewStep.SEARCH);
        }}
        onManageClick={() => setStep(ViewStep.CATEGORY_MANAGER)}
        onHomeClick={() => setStep(ViewStep.HOME)}
        isAdmin={isAdmin}
      />

      <main className="flex-1 flex flex-col relative overflow-hidden">
        {step !== ViewStep.HOME && (
          <div className="bg-blue-50 border-b border-blue-100 px-4 py-2 flex items-center justify-between shadow-sm z-20">
            <div className="flex items-center space-x-2 text-sm">
              <button
                onClick={handleBack}
                className="flex items-center space-x-1 px-3 py-1.5 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
              >
                <i className="fa-solid fa-chevron-left text-[10px]"></i>
                <span>返回</span>
              </button>
              <div className="h-4 w-[1px] bg-gray-300 mx-2"></div>
              <Breadcrumbs
                step={step}
                brand={selectedBrand}
                model={selectedModel}
                mainCategory={selectedMainCategory}
                subCategory={selectedSubCategory}
                onNavigate={handleNavigateTo}
              />
            </div>

            <div className="text-sm flex items-center space-x-6">
              <button
                onClick={() => setIsCartOpen(true)}
                className="relative flex items-center space-x-2 bg-white px-4 py-1.5 border border-blue-200 rounded-full shadow-sm hover:shadow-md transition-all group"
              >
                <i className="fa-solid fa-cart-shopping text-blue-600"></i>
                <span className="font-bold text-gray-700">我的采购单</span>
                {cart.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] flex items-center justify-center rounded-full font-bold shadow-sm animate-bounce">
                    {cart.length}
                  </span>
                )}
              </button>
              <div className="flex flex-col text-[11px] items-end leading-tight">
                <span className="text-gray-500">
                  账户余额 <span className="text-red-500 font-bold">0.00</span>{" "}
                  点
                </span>
                <button className="text-blue-600 hover:underline font-bold uppercase tracking-tighter">
                  Top Up
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-auto">{renderContent()}</div>
      </main>

      <div className={isCartOpen ? "block" : "hidden"}>
        <CartModal
          isOpen={isCartOpen}
          onClose={() => setIsCartOpen(false)}
          items={cart}
          onRemove={removeFromCart}
        />
      </div>

      {/* 重复添加警告弹窗 */}
      {duplicateWarning && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]">
          <div className="bg-white rounded-lg shadow-2xl p-6 max-w-sm mx-4">
            <div className="text-center">
              <div className="text-4xl mb-3">⚠️</div>
              <h3 className="text-lg font-bold text-gray-800 mb-2">重复添加</h3>
              <p className="text-gray-600 mb-4">当前选择的零部件已经在采购单内，请不要重复采购</p>
              <button
                onClick={() => setDuplicateWarning(false)}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors"
              >
                确定
              </button>
            </div>
          </div>
        </div>
      )}

      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onLoginSuccess={handleLoginSuccess}
      />
    </div>
  );
};

export default App;

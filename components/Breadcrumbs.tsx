import React from "react";
import {
  ViewStep,
  Brand,
  ModelInfo,
  MainCategory,
  SubCategory,
} from "../types";

interface BreadcrumbsProps {
  step: ViewStep;
  brand: Brand | null;
  model: ModelInfo | null;
  mainCategory: MainCategory | null;
  subCategory: SubCategory | null;
  onNavigate: (step: ViewStep) => void;
}

const Breadcrumbs: React.FC<BreadcrumbsProps> = ({
  step,
  brand,
  model,
  mainCategory,
  subCategory,
  onNavigate,
}) => {
  return (
    <div className="flex items-center space-x-0">
      <BreadcrumbItem
        label="当前品牌"
        value={brand?.name}
        icon={brand?.logo}
        active={step === ViewStep.MODEL_FILTER}
        onClick={() => onNavigate(ViewStep.BRAND_SELECT)}
      />
      <BreadcrumbItem
        label="地区/车型/日期"
        value={
          model
            ? `${model.region}/${model.modelName}/${model.dateRange}`
            : undefined
        }
        active={step === ViewStep.CATEGORY_SELECT}
        onClick={() => onNavigate(ViewStep.MODEL_FILTER)}
      />
      <BreadcrumbItem
        label="总组"
        value={mainCategory?.name}
        active={step === ViewStep.PART_DETAIL}
        onClick={() => onNavigate(ViewStep.CATEGORY_SELECT)}
      />
      <BreadcrumbItem
        label="子组"
        value={subCategory?.name}
        active={step === ViewStep.PART_DETAIL}
        isLast
      />
    </div>
  );
};

const BreadcrumbItem: React.FC<{
  label: string;
  value?: string;
  active?: boolean;
  icon?: string;
  isLast?: boolean;
  onClick?: () => void;
}> = ({ label, value, active, icon, isLast, onClick }) => {
  const isClickable = !!value && !isLast;

  return (
    <div
      className={`relative flex flex-col justify-center px-4 py-1 h-full min-w-[120px] transition-colors ${active ? "bg-blue-100/50" : ""} ${isClickable ? "cursor-pointer hover:bg-blue-50" : ""}`}
      onClick={isClickable ? onClick : undefined}
    >
      <span className="text-[10px] text-gray-400 uppercase leading-tight">
        {label}
      </span>
      <div className="flex items-center space-x-2">
        {icon && <img src={icon} alt="" className="w-4 h-4 object-contain" />}
        <span
          className={`text-xs font-semibold truncate max-w-[180px] ${value ? "text-blue-700" : "text-gray-300"}`}
        >
          {value || "---"}
        </span>
      </div>
      {!isLast && (
        <div className="absolute right-0 top-1/2 -translate-y-1/2 h-8 w-[1px] bg-gray-200"></div>
      )}
    </div>
  );
};

export default Breadcrumbs;

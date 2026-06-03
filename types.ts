
export enum ViewStep {
  HOME = 'HOME',
  BRAND_SELECT = 'BRAND_SELECT',
  MODEL_FILTER = 'MODEL_FILTER',
  CATEGORY_SELECT = 'CATEGORY_SELECT',
  CATEGORY_MANAGER = 'CATEGORY_MANAGER',
  PART_DETAIL = 'PART_DETAIL'
  ,
  SEARCH = 'SEARCH'
}

export interface Brand {
  id: string;
  name: string;
  logo: string;
  firstLetter: string;
  isHot?: boolean;
  createdDate?: string;
  lastUpdated?: string;
  description?: string;
  country?: string;
}

export interface ModelInfo {
  region: string;
  modelName: string;
  dateRange: string;
  modelCode: string;
}

export interface MainCategory {
  id: string;
  name: string;
  icon: string;
  vehicleCode: string;
  isDefault?: boolean;
  createdDate?: string;
  lastUpdated?: string;
  description?: string;
  displayOrder?: number;
  imageUrl?: string;
}

export interface SubCategory {
  id: string;
  name: string;
  code: string;
  parentId: string;
  image: string;
  isDefault?: boolean;
  createdDate?: string;
  lastUpdated?: string;
  description?: string;
  displayOrder?: number;
}

export interface ReplacementPart {
  brand: string;
  originalOe: string;
  replacementOe: string;
  note: string;
  costExclTax: number;
  costInclTax: number;
  saleExclTax: number;
  saleInclTax: number;
  unit?: string;
}

export interface AdaptableModel {
  brand: string;
  region: string;
  modelName: string;
  productionDate: string;
  modelCode: string;
  costExclTax: number;
  costInclTax: number;
  saleExclTax: number;
  saleInclTax: number;
  unit?: string;
}

export interface PriceRecord {
  brand: string;
  manufacturer: string;
  description: string;
  costExclTax: number;
  costInclTax: number;
  saleExclTax: number;
  saleInclTax: number;
  unit?: string;
}

export interface Part {
  id: string;
  subCategoryId: string;
  position: string;
  oeNumber: string;
  partsNumber?: string;
  standardName: string;
  originalName: string;
  quantity: string;
  note: string;
  date: string;
  x?: number;
  y?: number;
  imageUrl?: string;
  origin?: string;
  brand?: string;
  model?: string;
  carModel?: string;
  priceRecords?: PriceRecord[];
  replacementParts?: ReplacementPart[];
  adaptableModels?: AdaptableModel[];
  price?: number;
  stockQuantity?: number;
}

export interface CartItem {
  id: string;
  part: Part;
  selectedPrice: PriceRecord;
  timestamp: number;
}

// API Related Interfaces
export interface LoginRequest {
  username: string;
  password?: string;
}

export interface AuthResponse {
  id: string;
  userId: string;
  name: string;
  status: string;
  registeredAt: string;
  approvedBy: string;
  approvedAt: string;
  rejectionReason: string | null;
  roles: {
    roleId: string;
    roleName: string;
  }[];
  token: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
}

export interface VehicleHierarchy {
  brandId: string;
  brandName: string;
  regions: {
    regionName: string;
    models: {
      modelName: string;
      releases: {
        period: string;
        codes: string[];
      }[];
      codes: string[];
    }[];
  }[];
}

export interface BatchUpdateResponse {
  success: boolean;
  totalCount: number;
  addedCount: number;
  updatedCount: number;
  removedCount: number;
  message: string;
}


import axios, { AxiosInstance } from 'axios';
import { 
  Brand, Part, MainCategory, SubCategory, 
  LoginRequest, AuthResponse, RegisterRequest, VehicleHierarchy,
  ModelInfo, BatchUpdateResponse
} from '../types';
import { BRANDS, VEHICLE_HIERARCHY, MAIN_CATEGORIES, SUB_CATEGORIES, PARTS_MOCK } from '../data';

const USE_MOCK = false; // Switch to false to use real API

class RepositoryClient {
  private static instance: RepositoryClient;
  private token: string | null = null;
  
  private authUrl = 'http://auth.xhfair.com/api/Auth/login';
  private baseUrl = 'http://cp.xhfair.com/api';
  //private baseUrl = 'http://localhost:5017/api';

  private authApi: AxiosInstance;
  private api: AxiosInstance;

  constructor() {
    this.authApi = axios.create({
      baseURL: this.authUrl,
      headers: { 'Content-Type': 'application/json' }
    });
    this.api = axios.create({
      baseURL: this.baseUrl,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  static getInstance() {
    if (!this.instance) this.instance = new RepositoryClient();
    return this.instance;
  }

  setAccessToken(token: string) { 
    this.token = token; 
    localStorage.setItem('ev_token', token);
  }
  
  getAccessToken() {
    return this.token || localStorage.getItem('ev_token');
  }

  hasAccessToken = () => !!this.getAccessToken();

  private async request<T>(
    endpoint: string, 
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' = 'POST', 
    data: any = {}, 
    needAuth = true,
    useAuth = false,
    mockData?: T
  ): Promise<T> {
    if (USE_MOCK && mockData !== undefined) {
      console.log(`[MOCK] ${method} ${endpoint}`, data);
      return new Promise((resolve) => setTimeout(() => resolve(mockData), 500));
    }

    const apiInstance = useAuth ? this.authApi : this.api;
    try {
      const response = await apiInstance.request({
        url: endpoint,
        method,
        data: (method !== 'GET') ? data : undefined,
        params: method === 'GET' ? data : undefined,
        headers: { 
          'Authorization': needAuth && this.getAccessToken() ? `Bearer ${this.getAccessToken()}` : '' 
        }
      });
      return response.data;
    } catch (e: any) {
      console.error(`API request failed: ${e.message}`, e.response?.data);
      throw e;
    }
  }

  // --- Auth Methods ---
  adminLogin = (request: LoginRequest) => {
    const mockResp: AuthResponse = {
      id: 'mock-admin-001',
      userId: request.username || 'mock-user',
      name: request.username || 'Mock User',
      status: 'Active',
      registeredAt: new Date().toISOString(),
      approvedBy: 'system',
      approvedAt: new Date().toISOString(),
      rejectionReason: null,
      roles: [{ roleId: 'r1', roleName: 'Administrator' }],
      token: 'mock-token-123'
    };
    return this.request<AuthResponse>('', 'POST', request, false, true, mockResp).then(res => {
      if (res.token) this.setAccessToken(res.token);
      return res;
    });
  };

  getProfile = () =>
    this.request<any>('profile', 'GET', {}, true, true, {
      id: 'admin-001',
      username: 'admin',
      role: 'Administrator',
      email: 'admin@cloudboat.ev'
    });

  // --- Brands Methods ---
  getBrands = () =>
    this.request<Brand[]>('Brands', 'GET', {}, true, false, BRANDS);

  getHotBrands = () =>
    this.request<Brand[]>('Brands/hot', 'GET', {}, true, false, BRANDS.filter(b => b.isHot));

  createBrand = (brand: Brand) =>
    this.request<Brand>('api/brands', 'POST', brand, true, false, { ...brand, id: Date.now().toString() });

  replaceAllBrands = (brands: Brand[]): Promise<BatchUpdateResponse> =>
    this.request<BatchUpdateResponse>('Brands/batch', 'PUT', brands, true, false);

  // --- MainCategories Methods ---
  getMainCategories = () =>
    this.request<MainCategory[]>('api/maincategories', 'GET', {}, true, false, MAIN_CATEGORIES);

  getMainCategoriesByVehicleCode = (vehicleCode: string) =>
    this.request<MainCategory[]>(`MainCategories/vehicle/${encodeURIComponent(vehicleCode)}`, 'GET', {}, true, false);

  createMainCategory = (mainCategory: MainCategory) =>
    this.request<MainCategory>('MainCategories', 'POST', mainCategory, true, false, { ...mainCategory, id: `m${Date.now()}` });

  updateMainCategory = (mainCategory: MainCategory) =>
    this.request<MainCategory>(`MainCategories/${encodeURIComponent(mainCategory.id)}`, 'PUT', mainCategory, true, false, mainCategory);

  deleteMainCategory = (id: string) =>
    this.request<void>(`MainCategories/${encodeURIComponent(id)}`, 'DELETE', {}, true, false);

  // --- SubCategories Methods ---
  getSubCategories = () =>
    this.request<SubCategory[]>('api/subcategories', 'GET', {}, true, false, SUB_CATEGORIES);

  getSubCategoriesByParentId = (parentId: string) =>
    this.request<SubCategory[]>(`SubCategories/parent/${encodeURIComponent(parentId)}`, 'GET', {}, true, false);

  createSubCategory = (subCategory: SubCategory) =>
    this.request<SubCategory>('SubCategories', 'POST', subCategory, true, false, { ...subCategory, id: `s${Date.now()}` });

  updateSubCategory = (subCategory: SubCategory) =>
    this.request<SubCategory>(`SubCategories/${encodeURIComponent(subCategory.id)}`, 'PUT', subCategory, true, false, subCategory);

  deleteSubCategory = (id: string) =>
    this.request<void>(`SubCategories/${encodeURIComponent(id)}`, 'DELETE', {}, true, false);

  // --- Parts Methods ---
  getPartsBySubCategoryId = (subCategoryId: string) => {
    const mock = undefined; // PARTS_MOCK.filter(p => p.subCategoryId === subCategoryId);
    return this.request<Part[]>(`CarParts/category/${subCategoryId}`, 'GET', {}, true, false, mock);
  };

  getPartByOeNumber = (oeNumber: string) => {
    const mock = undefined; // PARTS_MOCK.find(p => p.oeNumber === oeNumber);
    return this.request<Part>(`api/parts/oe/${encodeURIComponent(oeNumber)}`, 'GET', {}, true, false, mock);
  };

  // Free text search for car parts (backend: GET api/parts/search?term=...)
  searchParts = (term: string) => {
    // let mock = PARTS_MOCK.filter(p => {
    //   const t = term?.toLowerCase() || '';
    //   return (
    //     p.standardName.toLowerCase().includes(t) ||
    //     p.originalName.toLowerCase().includes(t) ||
    //     p.oeNumber.toLowerCase().includes(t)
    //   );
    // });
    const mock = undefined; // Disable mock for search to test real API
    return this.request<Part[]>(`CarParts/search`, 'GET', { term }, true, false, mock);
  };

  // Get parts by category (backend: GET api/parts/category/{category})
  getPartsByCategory = (category: string) => {
    const mock = undefined; // PARTS_MOCK.filter(p => p.subCategoryId === category || p.subCategoryId === category);
    return this.request<Part[]>(`CarParts/category/${encodeURIComponent(category)}`, 'GET', {}, true, false, mock);
  };

  // Get part details by id (backend: GET api/parts/{id})
  getPartById = (id: string) => {
    const mock = undefined; // PARTS_MOCK.find(p => p.id === id) || null;
    return this.request<Part | null>(`CarParts/${encodeURIComponent(id)}`, 'GET', {}, true, false, mock);
  };

  // --- VehicleHierarchy Methods ---
  getHierarchyByBrandId = (brandId: string) =>
    this.request<VehicleHierarchy>(`VehicleHierarchy/brands/${brandId}`, 'GET', {}, true, false);
  
  // 添加更新VehicleHierarchy的方法
  updateVehicleHierarchy = (brandId: string, hierarchyData: any) =>
    this.request<any>(`VehicleHierarchy/brands/${brandId}`, 'PUT', hierarchyData, true, false);

  // 批量更新汽车零部件数据
  batchUpdate = (updateData: {
    UPDATED_PARTS?: Part[];
    SUB_CATEGORIES_UPDATE?: {
      id: string;
      name: string;
      image: string;
    };
  }): Promise<BatchUpdateResponse> => {
    return this.request<BatchUpdateResponse>(
      'CarParts/batch-update', 
      'POST', 
      updateData, 
      true, 
      false
    );
  };

  // 更新单个零部件
  updatePart = (part: Part) =>
    this.request<Part>(`CarParts/${encodeURIComponent(part.id)}`, 'PUT', part, true, false, part);

  // 删除零部件
  deletePart = (id: string) =>
    this.request<void>(`CarParts/${encodeURIComponent(id)}`, 'DELETE', {}, true, false);

  // 创建新零部件
  createPart = (part: Part) =>
    this.request<Part>('CarParts', 'POST', part, true, false, { ...part, id: `p${Date.now()}` });

}

export const MockApiClient = RepositoryClient.getInstance();

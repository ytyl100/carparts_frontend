
import { Brand, MainCategory, SubCategory, Part, PriceRecord } from './types';

export const BRANDS: Brand[] = [
  { id: '1', name: '丰田', logo: 'https://logo.clearbit.com/toyota.com', firstLetter: 'F', isHot: true },
  { id: '2', name: '雷克萨斯', logo: 'https://logo.clearbit.com/lexus.com', firstLetter: 'L', isHot: true },
  { id: '3', name: '日产', logo: 'https://logo.clearbit.com/nissan-global.com', firstLetter: 'R', isHot: true },
  { id: '4', name: '本田', logo: 'https://logo.clearbit.com/honda.com', firstLetter: 'B', isHot: true },
  { id: '5', name: '比亚迪', logo: 'https://logo.clearbit.com/byd.com', firstLetter: 'B', isHot: true },
];

/**
 * Unified Hierarchical Vehicle Data
 */
export const VEHICLE_HIERARCHY: any[] = [
  { 
    "id":"1",
    "regions": {
      "一般地区": {
        "models": {
          "荣放: RAV4 (CHINA)": {
            "releases": {
              "200903 - 201307": ["ACA33", "ACA37", "ACA38", "GSA33", "GSA38"],
              "201308 - 201812": ["ASU40", "GSU45", "ZSA42", "ZSA44"],
              "201901 - 至今": ["MXAA52", "MXAA54", "AXAH52"]
            }
          },
          "COROLLA (CHINA)": {
            "releases": {
              "200705 - 201406": ["ZRE152", "ZRE153"],
              "201407 - 201905": ["ZRE181", "ZRE182"],
              "201906 - 至今": ["ZWE211", "MZEA11"]
            }
          }
        }
      },
      "欧洲": {
        "models": {
          "YARIS (EUROPE)": {
            "releases": { "201108 - 201406": ["KSP130", "NLP130"], "201407 - 202003": ["NSP130", "NCP131"] }
          },
          "AYGO": {
            "releases": { "200502 - 201405": ["KGB10"], "201405 - 202111": ["KGB40"] }
          }
        }
      },
      "日本": {
        "models": {
          "Vanguard": {
            "codes": ["GSA33", "ACA33W", "ACA38W"]
          },
          "Alphard": {
            "releases": { "200804 - 201501": ["ANH20", "GGH20"], "201501 - 至今": ["AGH30", "GGH30"] }
          }
        }
      },
      "美国/加拿大": {
        "models": {
          "Tacoma": {
            "releases": { "201509 - 202312": ["GRN305", "GRN310", "TRN245"] }
          }
        }
      }
    }
  },
  { "id":"2",
    "regions": {
      "一般地区": {
        "models": {
          "雷萨: LEXUS CT200H": { "releases": { "201012 - 至今": ["ZWA10"] } },
          "雷萨: LEXUS ES300H": { "releases": { "201206 - 201806": ["AVV60"], "201807 - 至今": ["AXZH10"] } }
        }
      },
      "日本": {
        "models": {
          "雷萨: LEXUS LS500": { "releases": { "201710 - 至今": ["VXFA50", "VXFA55"] } }
        }
      }
    }
  },
  { "id":"3", 
    "regions": {
      "一般地区-左侧驾驶": {
        "models": {
          "天籁: ALTIMA (L32)": { "releases": { "2007 - 2013": ["L32L", "CL32"] } }
        }
      },
      "一般地区-右侧驾驶": {
        "models": {
          "天籁: ALTIMA (R32)": { "releases": { "2007 - 2013": ["R32R"] } }
        }
      }
    }
  },
  { "id":"4", "name": "本田",
    "models": {
      "雅阁: Accord": { "codes": ["CV1", "CV2", "CV3"] },
      "思域: Civic": { "codes": ["FE1", "FE2", "FL1"] },
      "CR-V": { "codes": ["RW1", "RW2", "RT5", "RT6"] }
    }
  },
  { "id":"5", "name": "比亚迪",
    "models": {
      "汉 EV": {
        "releases": {
          "2020款": ["BYD7009BEV", "BYD7009BEV1"],
          "2021款": ["BYD7009BEV2"],
          "2022款": ["BYD7009BEV-D1"]
        }
      },
      "唐 DM": {
        "releases": {
          "2018 - 2020": ["唐DM-2.0T"],
          "2021 - 至今": ["唐DM-i", "唐DM-p"]
        }
      },
      "秦 PLUS": {
        "releases": { "2021款": ["秦PLUS-DM-i", "秦PLUS-EV"] }
      }
    }
  }  
];

/**
 * Main Categories filtered and associated with unique vehicle model codes.
 * This structure fulfills the requirement of Model Code being the parent of Categories.
 */
export const MAIN_CATEGORIES: MainCategory[] = [
  // Categories associated with Toyota RAV4 (ACA33)
  { id: 'm1_ACA33', name: '工具/发动机/燃油', icon: 'fa-wrench', vehicleCode: 'ACA33' },
  { id: 'm2_ACA33', name: '传动系统/底盘', icon: 'fa-gears', vehicleCode: 'ACA33' },
  { id: 'm3_ACA33', name: '车身', icon: 'fa-car-side', vehicleCode: 'ACA33' },
  { id: 'm4_ACA33', name: '电气', icon: 'fa-bolt', vehicleCode: 'ACA33' },

  // Categories associated with Toyota Corolla (ZWE211)
  { id: 'm1_ZWE211', name: '工具/发动机/燃油', icon: 'fa-wrench', vehicleCode: 'ZWE211' },
  { id: 'm2_ZWE211', name: '传动系统/底盘', icon: 'fa-gears', vehicleCode: 'ZWE211' },
  { id: 'm3_ZWE211', name: '车身', icon: 'fa-car-side', vehicleCode: 'ZWE211' },
  { id: 'm4_ZWE211', name: '电气', icon: 'fa-bolt', vehicleCode: 'ZWE211' },

  // Categories associated with BYD Han EV (BYD7009BEV)
  { id: 'm1_BYD7009BEV', name: '高压电池/电机/电控', icon: 'fa-battery-full', vehicleCode: 'BYD7009BEV' },
  { id: 'm2_BYD7009BEV', name: '传动系统/底盘', icon: 'fa-gears', vehicleCode: 'BYD7009BEV' },
  { id: 'm3_BYD7009BEV', name: '车身', icon: 'fa-car-side', vehicleCode: 'BYD7009BEV' },
  { id: 'm4_BYD7009BEV', name: '辅助电气/多媒体', icon: 'fa-bolt', vehicleCode: 'BYD7009BEV' },
  
  // Default/Fallback entries for codes not explicitly defined above
  { id: 'm1', name: '工具/发动机/燃油', icon: 'fa-wrench', vehicleCode: '*' },
  { id: 'm2', name: '传动系统/底盘', icon: 'fa-gears', vehicleCode: '*' },
  { id: 'm3', name: '车身', icon: 'fa-car-side', vehicleCode: '*' },
  { id: 'm4', name: '电气', icon: 'fa-bolt', vehicleCode: '*' },
];

export const SUB_CATEGORIES: SubCategory[] = [
  // Links to m1_ACA33
  { id: 's1', name: '标准工具', code: '0901(0001)', parentId: 'm1_ACA33', image: 'https://picsum.photos/seed/tool1/300/300' },
  { id: 's2', name: '单体发动机总成', code: '1101(0001)', parentId: 'm1_ACA33', image: 'https://picsum.photos/seed/eng1/300/300' },
  { id: 's3', name: '发动机大修密封垫', code: '1104(0001)', parentId: 'm1_ACA33', image: 'https://picsum.photos/seed/eng2/300/300' },
  
  // Links to m2_ACA33
  { id: 's4', name: '离合器总成', code: '3101(0001)', parentId: 'm2_ACA33', image: 'https://picsum.photos/seed/clutch1/300/300' },
  { id: 's5', name: '前桥/悬架系统', code: '4301(0001)', parentId: 'm2_ACA33', image: 'https://picsum.photos/seed/axle1/300/300' },
  { id: 's6', name: '转向传动机构', code: '4501(0001)', parentId: 'm2_ACA33', image: 'https://picsum.photos/seed/steer1/300/300' },
  
  // Links to m3_ACA33
  { id: 's7', name: '前围板', code: '5101(0001)', parentId: 'm3_ACA33', image: 'https://picsum.photos/seed/body1/300/300' },
  { id: 's8', name: '侧围板/门槛', code: '6101(0001)', parentId: 'm3_ACA33', image: 'https://picsum.photos/seed/body2/300/300' },
  { id: 's9', name: '行李箱盖', code: '6701(0001)', parentId: 'm3_ACA33', image: 'https://picsum.photos/seed/body3/300/300' },
  { id: 's10', name: '前保险杠', code: '5201(0001)', parentId: 'm3_ACA33', image: 'https://picsum.photos/seed/body4/300/300' },
  
  // Links to m4_ACA33
  { id: 's11', name: '空调装置', code: '8101(0001)', parentId: 'm4_ACA33', image: 'https://picsum.photos/seed/elec1/300/300' },
  { id: 's12', name: '组合仪表', code: '8201(0001)', parentId: 'm4_ACA33', image: 'https://picsum.photos/seed/elec2/300/300' },
  { id: 's13', name: '开关和继电器', code: '8401(0001)', parentId: 'm4_ACA33', image: 'https://picsum.photos/seed/elec3/300/300' },
  { id: 's14', name: '灯光系统', code: '8105(0001)', parentId: 'm4_ACA33', image: 'https://picsum.photos/seed/elec4/300/300' },

  // Generic Fallbacks for other Main Categories
  { id: 's15', name: '通用附件', code: '9999(0000)', parentId: 'm1', image: 'https://picsum.photos/seed/gen/300/300' },
];

const DEFAULT_ADAPTABLE: any[] = [
  { brand: '丰田', region: '一般地区', modelName: '荣放：RAV4 (CHINA)', productionDate: '200903 - 201307', modelCode: 'ACA3#' },
  { brand: '丰田', region: '欧洲', modelName: 'RAV4 (EUROPE)', productionDate: '200801 - 201212', modelCode: 'ALA30' }
];

export const PARTS_MOCK: Part[] = [
  // --- s1: 标准工具 (Tools) ---
  { 
    id: 'p1', subCategoryId: 's1', position: '09110', oeNumber: '091110R010', standardName: '千斤顶', originalName: '千斤顶总成', quantity: '01', note: '(ACA3#)', date: '', x: 55, y: 15, 
    imageUrl: 'https://img.icons8.com/color/144/car-jack.png',
    priceRecords: [{ brand: '一汽丰田', manufacturer: '丰田', description: '原厂品质', costExclTax: 0, costInclTax: 0, saleExclTax: 23.89, saleInclTax: 27.00 }],
    replacementParts: [
      { brand: '丰田', originalOe: '091110R010', replacementOe: '091110R011', note: '改进型号' },
      { brand: '一汽丰田', originalOe: '091110R010', replacementOe: '09111-0R012', note: '最新批次' }
    ],
    adaptableModels: DEFAULT_ADAPTABLE
  },
  { 
    id: 'p2', subCategoryId: 's1', position: '09113', oeNumber: '091130R020', standardName: '千斤顶把手', originalName: '千斤顶把手', quantity: '01', note: '(ACA3#)', date: '', x: 25, y: 35, 
    imageUrl: 'https://img.icons8.com/color/144/wrench.png',
    priceRecords: [{ brand: '一汽丰田', manufacturer: '丰田', description: '原厂附件', costExclTax: 12.00, costInclTax: 13.56, saleExclTax: 25.00, saleInclTax: 28.25 }],
    replacementParts: [
      { brand: '丰田', originalOe: '091130R020', replacementOe: '09113-ABC-123', note: '加长款兼容' }
    ],
    adaptableModels: DEFAULT_ADAPTABLE
  },
  { 
    id: 'p3', subCategoryId: 's1', position: '09120', oeNumber: '091200R020', standardName: '工具包', originalName: '工具袋', quantity: '01', note: '(ACA3#)', date: '', x: 25, y: 65, 
    imageUrl: 'https://img.icons8.com/color/144/pouch.png',
    priceRecords: [{ brand: '丰田', manufacturer: '丰田', description: '原厂工具袋', costExclTax: 5.00, costInclTax: 5.65, saleExclTax: 12.00, saleInclTax: 13.56 }],
    replacementParts: [
      { brand: '丰田', originalOe: '091200R020', replacementOe: '09120-PACK-001', note: '大容量款' }
    ],
    adaptableModels: DEFAULT_ADAPTABLE
  },

  // --- s2: 单体发动机总成 (Engine Assembly) ---
  { 
    id: 'e1', subCategoryId: 's2', position: '11101', oeNumber: '11101-39545', standardName: '气缸盖', originalName: 'CYLINDER HEAD', quantity: '01', note: '2.4L Engine', date: '2009-2013', x: 50, y: 30, 
    imageUrl: 'https://img.icons8.com/external-flat-icons-maxicons/144/external-engine-car-maintenance-flat-flat-icons-maxicons.png',
    priceRecords: [{ brand: '丰田原厂', manufacturer: '丰田', description: '日本进口', costExclTax: 1200, costInclTax: 1356, saleExclTax: 2500, saleInclTax: 2825 }],
    replacementParts: [
      { brand: '丰田', originalOe: '11101-39545', replacementOe: '11101-39546', note: '气道优化版' }
    ],
    adaptableModels: DEFAULT_ADAPTABLE
  },
  { 
    id: 'e2', subCategoryId: 's2', position: '13101', oeNumber: '13101-28040', standardName: '活塞', originalName: 'PISTON', quantity: '04', note: 'STD size', date: '2009-2013', x: 30, y: 50, 
    imageUrl: 'https://img.icons8.com/color/144/piston.png',
    priceRecords: [{ brand: '一汽丰田', manufacturer: '丰田', description: '原厂件', costExclTax: 150, costInclTax: 169.5, saleExclTax: 320, saleInclTax: 361.6 }],
    replacementParts: [],
    adaptableModels: DEFAULT_ADAPTABLE
  },

  // --- s3: 发动机大修密封垫 (Engine Gaskets) ---
  { 
    id: 'g1', subCategoryId: 's3', position: '04111', oeNumber: '04111-28652', standardName: '大修包', originalName: 'OVERHAUL GASKET KIT', quantity: '01', note: 'Full set', date: '', x: 45, y: 45, 
    imageUrl: 'https://img.icons8.com/external-others-inmotus-design/144/external-Gasket-car-parts-others-inmotus-design.png',
    priceRecords: [{ brand: '丰田', manufacturer: '丰田', description: '全车密封垫', costExclTax: 450, costInclTax: 508, saleExclTax: 880, saleInclTax: 994 }],
    replacementParts: [
      { brand: '维克多', originalOe: '04111-28652', replacementOe: 'VR-GASKET-XP', note: '强化竞技级' }
    ],
    adaptableModels: DEFAULT_ADAPTABLE
  },

  // --- s4: 离合器总成 (Clutch) ---
  { 
    id: 'c1', subCategoryId: 's4', position: '31210', oeNumber: '31210-33050', standardName: '离合器压盘', originalName: 'CLUTCH COVER', quantity: '01', note: 'MT models', date: '', x: 50, y: 40, 
    imageUrl: 'https://img.icons8.com/external-flat-icons-maxicons/144/external-clutch-car-parts-flat-flat-icons-maxicons.png',
    priceRecords: [{ brand: '爱信 AISIN', manufacturer: 'AISIN', description: '配套件', costExclTax: 280, costInclTax: 316, saleExclTax: 550, saleInclTax: 621 }],
    replacementParts: [
      { brand: 'LUK', originalOe: '31210-33050', replacementOe: 'LUK-CP-9901', note: '德系配套品质' }
    ],
    adaptableModels: DEFAULT_ADAPTABLE
  },
  { 
    id: 'c2', subCategoryId: 's4', position: '31250', oeNumber: '31250-02120', standardName: '离合器片', originalName: 'CLUTCH DISC', quantity: '01', note: 'MT models', date: '', x: 50, y: 60, 
    imageUrl: 'https://img.icons8.com/external-flat-icons-maxicons/144/external-brake-disc-car-parts-flat-flat-icons-maxicons.png',
    priceRecords: [{ brand: '爱信 AISIN', manufacturer: 'AISIN', description: '配套件', costExclTax: 220, costInclTax: 248, saleExclTax: 420, saleInclTax: 474 }],
    replacementParts: [
      { brand: 'EXEDY', originalOe: '31250-02120', replacementOe: 'EXD-31250', note: '高性能替换' }
    ],
    adaptableModels: DEFAULT_ADAPTABLE
  }
];

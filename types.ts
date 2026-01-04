// 原始广告数据记录
export interface RawAdRecord {
  date: string;
  campaign_name: string;
  adset_name: string;
  ad_name: string;
  spend: number;
  impressions: number;
  link_clicks: number;
  purchases: number;
  purchase_value: number;
  adds_to_cart: number;
  checkouts_initiated: number;
  level?: 'Campaign' | 'AdSet' | 'Ad';  // 数据层级
  reach?: number;  // 触达人数（用于 CPM 类型）
  landing_page_views?: number;  // 落地页浏览量（用于 Click-to-PV Rate 计算）
  frequency?: number;  // 广告展示频次（用于场景6诊断）
}

// 聚合指标
export interface AggregatedMetrics {
  spend: number;
  impressions: number;
  link_clicks: number;
  purchases: number;
  purchase_value: number;
  adds_to_cart: number;
  checkouts_initiated: number;
  landing_page_views?: number;  // 落地页浏览量
  roi: number;
  cpa: number;
  cpc: number;
  ctr: number;
  cpm: number;
  cpatc: number;
  atc_rate: number;
  acos: number;
  cvr: number;
  aov: number;
  // 新增中间转化指标
  click_to_pv_rate: number;  // Landing Page Views / Link Clicks
  checkout_rate: number;      // Checkouts Initiated / Adds to Cart
  purchase_rate: number;      // Purchases / Checkouts Initiated
  frequency?: number;         // 广告展示频次
}

// 广告层级分类
export enum CampaignLayer {
  AWARENESS = 'Awareness',
  TRAFFIC = 'Traffic',
  CONVERSION = 'Conversion'
}

// 筛选规则
export interface FilterRule {
  field: 'campaign_name' | 'adset_name' | 'ad_name';
  operator: 'contains' | 'not_contains' | 'equals';
  value: string;
}

// 广告配置
export interface AdConfiguration {
  id: string;
  name: string;
  level: 'Campaign' | 'AdSet' | 'Ad';
  budget: number;
  targetType: 'ROI' | 'CPC' | 'CPM';
  targetValue: number;
  rules: FilterRule[];
  rulesLogic?: 'AND' | 'OR';  // 规则逻辑：AND=全部匹配，OR=任一匹配，默认AND
  campaignPeriod?: {
    startDate: string;
    endDate: string;
  };
}

// 用户基准指标
export interface UserBenchmarks {
  targetRoi: number;
  targetCpa: number;
  budgetCap: number;
}

// Todo项
export interface TodoItem {
  id: string;
  projectId: string;                    // 子项目 ID
  projectName: string;                  // 子项目名称
  level: 'Campaign' | 'AdSet' | 'Ad';   // 层级
  itemId: string;                       // Campaign/AdSet/Ad ID
  itemName: string;                     // 名称
  quadrant?: string;                    // 所属象限
  metrics?: {
    spend: number;
    kpi: number;
    delta: number;
    benchmark?: number;
    vsAvg?: number;
  };
  markedAt: string;                     // 标记时间
  note?: string;                        // 备注
  status: 'pending' | 'in-progress' | 'done';
  // Legacy fields for backward compatibility
  source?: 'BusinessLine' | 'Execution' | 'Quadrant';
  subProject?: string;
  name?: string;
  recommendation?: string;
  timestamp?: number;
  completed?: boolean;
}

// 层级分类配置
export interface LayerConfiguration {
  awareness: {
    rules: LayerFilterRule[];
    logic: 'AND' | 'OR';
  };
  traffic: {
    rules: LayerFilterRule[];
    logic: 'AND' | 'OR';
  };
  conversion: {
    rules: LayerFilterRule[];
    logic: 'AND' | 'OR';
  };
}

// 层级筛选规则
export interface LayerFilterRule {
  field: 'campaign_name' | 'adset_name' | 'ad_name';
  operator: 'contains' | 'not_contains' | 'equals';
  value: string;
}

// 默认层级配置
export const DEFAULT_LAYER_CONFIG: LayerConfiguration = {
  awareness: {
    rules: [{ field: 'campaign_name', operator: 'contains', value: '-AW-' }],
    logic: 'OR'
  },
  traffic: {
    rules: [{ field: 'campaign_name', operator: 'contains', value: '-TR-' }],
    logic: 'OR'
  },
  conversion: {
    rules: [{ field: 'campaign_name', operator: 'contains', value: '-CV-' }],
    logic: 'OR'
  }
};

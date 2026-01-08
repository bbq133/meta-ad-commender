// 调优规则引擎
// 基于广告调优规则指南.md中的123条组合规则

// ==================== 类型定义 ====================

export interface RuleCondition {
    metric: string;
    operator: '>' | '<' | '>=' | '<=' | '==';
    threshold: number; // 基于均值的百分比偏差，如 -10 表示低于均值10%
}

export interface OptimizationRule {
    id: string;
    kpi: 'ROI' | 'CPC' | 'CPM';
    level: 'Campaign' | 'AdSet' | 'Ad';
    scenario: 'single' | 'combo';
    priority: number; // 1=最高优先级
    conditions: RuleCondition[];
    guidance: string;
}

export interface CampaignMetrics {
    spend: number;
    roi?: number;
    cvr?: number;
    aov?: number;
    cpa?: number;
    cpatc?: number;
    atc_rate?: number;
    ctr?: number;
    cpc?: number;
    cpm?: number;
    reach?: number;
    impressions?: number;
    frequency?: number;
    clicks?: number;
    // 原始数据字段用于公式计算
    link_clicks?: number;
    landing_page_views?: number;
    purchases?: number;
    adds_to_cart?: number;
    checkouts_initiated?: number;
    purchase_value?: number;
}

// ==================== 规则库 ====================

const OPTIMIZATION_RULES: OptimizationRule[] = [
    // ========== 零值/极低值检测规则（最高优先级）==========
    {
        id: 'roi-campaign-zero-or-negative',
        kpi: 'ROI',
        level: 'Campaign',
        scenario: 'single',
        priority: 0, // 最高优先级
        conditions: [
            { metric: 'roi', operator: '<=', threshold: -90 } // ROI低于平均值90%以上
        ],
        guidance: '🚨 ROI极低或为零，立即进行预算调整或全面进行检查'
    },
    {
        id: 'roi-adset-zero-or-negative',
        kpi: 'ROI',
        level: 'AdSet',
        scenario: 'single',
        priority: 0,
        conditions: [
            { metric: 'roi', operator: '<=', threshold: -90 }
        ],
        guidance: '🚨 ROI极低或为零，立即暂停此受众'
    },
    {
        id: 'roi-ad-zero-or-negative',
        kpi: 'ROI',
        level: 'Ad',
        scenario: 'single',
        priority: 0,
        conditions: [
            { metric: 'roi', operator: '<=', threshold: -90 }
        ],
        guidance: '🚨 ROI极低或为零，立即暂停此素材'
    },

    // ========== ROI - Campaign 规则 (24条) ==========
    {
        id: 'roi-campaign-combo-high-loss',
        kpi: 'ROI',
        level: 'Campaign',
        scenario: 'combo',
        priority: 1,
        conditions: [
            { metric: 'spend', operator: '>', threshold: 0 },
            { metric: 'roi', operator: '<', threshold: -10 }
        ],
        guidance: '⚠️ 高亏损，立即暂停或大幅降预算'
    },
    {
        id: 'roi-campaign-combo-triple-hit',
        kpi: 'ROI',
        level: 'Campaign',
        scenario: 'combo',
        priority: 1,
        conditions: [
            { metric: 'ctr', operator: '<', threshold: -20 },
            { metric: 'cpc', operator: '>', threshold: 20 },
            { metric: 'cvr', operator: '<', threshold: -15 }
        ],
        guidance: '⚠️ 三重打击：流量难、成本高、转化差，立即暂停'
    },
    {
        id: 'roi-campaign-combo-high-spend-low-performance',
        kpi: 'ROI',
        level: 'Campaign',
        scenario: 'combo',
        priority: 1,
        conditions: [
            { metric: 'spend', operator: '>', threshold: 0 },
            { metric: 'cpc', operator: '>', threshold: 20 },
            { metric: 'cvr', operator: '<', threshold: -15 }
        ],
        guidance: '⚠️ 高消耗+高成本+低转化，最危险组合'
    },
    {
        id: 'roi-campaign-combo-cart-abandon',
        kpi: 'ROI',
        level: 'Campaign',
        scenario: 'combo',
        priority: 2,
        conditions: [
            { metric: 'atc_rate', operator: '>=', threshold: -5 },
            { metric: 'cvr', operator: '<', threshold: -20 }
        ],
        guidance: '🛒 弃购严重，检查结账流程/运费/支付方式'
    },
    {
        id: 'roi-campaign-combo-funnel-collapse',
        kpi: 'ROI',
        level: 'Campaign',
        scenario: 'combo',
        priority: 2,
        conditions: [
            { metric: 'atc_rate', operator: '<', threshold: -15 },
            { metric: 'cvr', operator: '<', threshold: -15 },
            { metric: 'aov', operator: '<', threshold: -10 }
        ],
        guidance: '全漏斗崩溃，从选品到定价全面问题'
    },
    {
        id: 'roi-campaign-combo-traffic-landing',
        kpi: 'ROI',
        level: 'Campaign',
        scenario: 'combo',
        priority: 2,
        conditions: [
            { metric: 'ctr', operator: '<', threshold: -20 },
            { metric: 'atc_rate', operator: '<', threshold: -15 }
        ],
        guidance: '流量不精准且落地页差，全链路重构'
    },
    {
        id: 'roi-campaign-combo-cost-mismatch',
        kpi: 'ROI',
        level: 'Campaign',
        scenario: 'combo',
        priority: 2,
        conditions: [
            { metric: 'cpc', operator: '>', threshold: 20 },
            { metric: 'cpatc', operator: '>', threshold: 20 }
        ],
        guidance: '点击贵且加购难，受众完全不匹配'
    },
    {
        id: 'roi-campaign-combo-roi-cpa',
        kpi: 'ROI',
        level: 'Campaign',
        scenario: 'combo',
        priority: 3,
        conditions: [
            { metric: 'roi', operator: '<', threshold: -10 },
            { metric: 'cpa', operator: '>', threshold: 15 }
        ],
        guidance: '转化低且成本高，素材与受众双重问题'
    },
    {
        id: 'roi-campaign-combo-ctr-cpc',
        kpi: 'ROI',
        level: 'Campaign',
        scenario: 'combo',
        priority: 3,
        conditions: [
            { metric: 'ctr', operator: '<', threshold: -20 },
            { metric: 'cpc', operator: '>', threshold: 20 }
        ],
        guidance: '素材质量差且竞争激烈，需重做'
    },
    {
        id: 'roi-campaign-combo-cvr-cpa',
        kpi: 'ROI',
        level: 'Campaign',
        scenario: 'combo',
        priority: 3,
        conditions: [
            { metric: 'cvr', operator: '<', threshold: -15 },
            { metric: 'cpa', operator: '>', threshold: 20 }
        ],
        guidance: '落地页转化极差，成本失控'
    },
    {
        id: 'roi-campaign-combo-aov-cpa',
        kpi: 'ROI',
        level: 'Campaign',
        scenario: 'combo',
        priority: 3,
        conditions: [
            { metric: 'aov', operator: '<', threshold: -10 },
            { metric: 'cpa', operator: '>', threshold: 15 }
        ],
        guidance: '客单价低且获客成本高，利润空间压缩'
    },
    {
        id: 'roi-campaign-combo-atc-aov',
        kpi: 'ROI',
        level: 'Campaign',
        scenario: 'combo',
        priority: 3,
        conditions: [
            { metric: 'atc_rate', operator: '<', threshold: -15 },
            { metric: 'aov', operator: '<', threshold: -10 }
        ],
        guidance: '用户购买意愿弱且客单价低，产品吸引力不足'
    },
    {
        id: 'roi-campaign-combo-cpatc-cvr',
        kpi: 'ROI',
        level: 'Campaign',
        scenario: 'combo',
        priority: 3,
        conditions: [
            { metric: 'cpatc', operator: '>', threshold: 20 },
            { metric: 'cvr', operator: '<', threshold: -15 }
        ],
        guidance: '加购难且下单更难，全链路转化崩溃'
    },
    {
        id: 'roi-campaign-combo-ctr-cvr',
        kpi: 'ROI',
        level: 'Campaign',
        scenario: 'combo',
        priority: 3,
        conditions: [
            { metric: 'ctr', operator: '<', threshold: -20 },
            { metric: 'cvr', operator: '<', threshold: -15 }
        ],
        guidance: '流量获取和转化双失败，选品或定位错误'
    },
    {
        id: 'roi-campaign-combo-cpc-cvr',
        kpi: 'ROI',
        level: 'Campaign',
        scenario: 'combo',
        priority: 3,
        conditions: [
            { metric: 'cpc', operator: '>', threshold: 20 },
            { metric: 'cvr', operator: '<', threshold: -15 }
        ],
        guidance: '买量贵但转化差，ROI严重受损'
    },
    {
        id: 'roi-campaign-combo-atc-cpa',
        kpi: 'ROI',
        level: 'Campaign',
        scenario: 'combo',
        priority: 3,
        conditions: [
            { metric: 'atc_rate', operator: '<', threshold: -15 },
            { metric: 'cpa', operator: '>', threshold: 15 }
        ],
        guidance: '加购率低推高获客成本，需优化产品详情页'
    },
    {
        id: 'roi-campaign-combo-spend-cpa',
        kpi: 'ROI',
        level: 'Campaign',
        scenario: 'combo',
        priority: 2,
        conditions: [
            { metric: 'spend', operator: '>', threshold: 0 },
            { metric: 'cpa', operator: '>', threshold: 20 }
        ],
        guidance: '高预算低效消耗，紧急降预算或暂停'
    },
    {
        id: 'roi-campaign-combo-spend-cvr',
        kpi: 'ROI',
        level: 'Campaign',
        scenario: 'combo',
        priority: 2,
        conditions: [
            { metric: 'spend', operator: '>', threshold: 0 },
            { metric: 'cvr', operator: '<', threshold: -15 }
        ],
        guidance: '烧钱但不转化，检查落地页或产品匹配度'
    },
    {
        id: 'roi-campaign-combo-roi-ctr',
        kpi: 'ROI',
        level: 'Campaign',
        scenario: 'combo',
        priority: 3,
        conditions: [
            { metric: 'roi', operator: '<', threshold: -10 },
            { metric: 'ctr', operator: '<', threshold: -20 }
        ],
        guidance: 'ROI差且流量获取难，素材完全失败'
    },
    {
        id: 'roi-campaign-combo-cost-chain',
        kpi: 'ROI',
        level: 'Campaign',
        scenario: 'combo',
        priority: 2,
        conditions: [
            { metric: 'cpa', operator: '>', threshold: 15 },
            { metric: 'cpatc', operator: '>', threshold: 20 },
            { metric: 'cvr', operator: '<', threshold: -15 }
        ],
        guidance: '成本链条全面失控，需整体优化策略'
    },
    {
        id: 'roi-campaign-combo-business-failure',
        kpi: 'ROI',
        level: 'Campaign',
        scenario: 'combo',
        priority: 1,
        conditions: [
            { metric: 'roi', operator: '<', threshold: -10 },
            { metric: 'aov', operator: '<', threshold: -10 },
            { metric: 'cvr', operator: '<', threshold: -15 }
        ],
        guidance: '⚠️ 利润低、客单价低、转化率低，需全面优化产品和策略'
    },
    {
        id: 'roi-campaign-combo-landing-issue',
        kpi: 'ROI',
        level: 'Campaign',
        scenario: 'combo',
        priority: 3,
        conditions: [
            { metric: 'ctr', operator: '>=', threshold: -5 },
            { metric: 'atc_rate', operator: '<', threshold: -20 },
            { metric: 'cvr', operator: '<', threshold: -20 }
        ],
        guidance: '流量可以但后链路崩溃，落地页严重问题'
    },
    {
        id: 'roi-campaign-combo-audience-wrong',
        kpi: 'ROI',
        level: 'Campaign',
        scenario: 'combo',
        priority: 2,
        conditions: [
            { metric: 'cpc', operator: '>', threshold: 20 },
            { metric: 'cpa', operator: '>', threshold: 15 },
            { metric: 'cpatc', operator: '>', threshold: 20 }
        ],
        guidance: '全成本指标超标，受众定向完全错误'
    },
    {
        id: 'roi-campaign-combo-cvr-aov',
        kpi: 'ROI',
        level: 'Campaign',
        scenario: 'combo',
        priority: 3,
        conditions: [
            { metric: 'cvr', operator: '<', threshold: -15 },
            { metric: 'aov', operator: '<', threshold: -10 }
        ],
        guidance: '全面优化转化漏斗和产品定价'
    },

    // ========== ROI - AdSet 规则 (15条) ==========
    {
        id: 'roi-adset-combo-cvr-cpa',
        kpi: 'ROI',
        level: 'AdSet',
        scenario: 'combo',
        priority: 3,
        conditions: [
            { metric: 'cvr', operator: '<', threshold: -15 },
            { metric: 'cpa', operator: '>', threshold: 15 }
        ],
        guidance: '受众不精准，细分受众'
    },
    {
        id: 'roi-adset-combo-atc-cpatc',
        kpi: 'ROI',
        level: 'AdSet',
        scenario: 'combo',
        priority: 3,
        conditions: [
            { metric: 'atc_rate', operator: '<', threshold: -15 },
            { metric: 'cpatc', operator: '>', threshold: 20 }
        ],
        guidance: '受众对产品无购买意向，更换受众'
    },
    {
        id: 'roi-adset-combo-ctr-cpc',
        kpi: 'ROI',
        level: 'AdSet',
        scenario: 'combo',
        priority: 3,
        conditions: [
            { metric: 'ctr', operator: '<', threshold: -20 },
            { metric: 'cpc', operator: '>', threshold: 20 }
        ],
        guidance: '受众质量差且竞争激烈，重新定向'
    },
    {
        id: 'roi-adset-combo-roi-cvr',
        kpi: 'ROI',
        level: 'AdSet',
        scenario: 'combo',
        priority: 3,
        conditions: [
            { metric: 'roi', operator: '<', threshold: -10 },
            { metric: 'cvr', operator: '<', threshold: -15 }
        ],
        guidance: 'ROI差且转化低，受众与产品不匹配'
    },
    {
        id: 'roi-adset-combo-cpa-cpatc',
        kpi: 'ROI',
        level: 'AdSet',
        scenario: 'combo',
        priority: 3,
        conditions: [
            { metric: 'cpa', operator: '>', threshold: 15 },
            { metric: 'cpatc', operator: '>', threshold: 20 }
        ],
        guidance: '成本双高，受众购买力不足或兴趣不符'
    },
    {
        id: 'roi-adset-combo-ctr-cvr',
        kpi: 'ROI',
        level: 'AdSet',
        scenario: 'combo',
        priority: 3,
        conditions: [
            { metric: 'ctr', operator: '<', threshold: -20 },
            { metric: 'cvr', operator: '<', threshold: -15 }
        ],
        guidance: '受众对广告和产品都不感冒，需重新选择'
    },
    {
        id: 'roi-adset-combo-atc-cvr',
        kpi: 'ROI',
        level: 'AdSet',
        scenario: 'combo',
        priority: 3,
        conditions: [
            { metric: 'atc_rate', operator: '<', threshold: -15 },
            { metric: 'cvr', operator: '<', threshold: -15 }
        ],
        guidance: '加购和转化双低，受众决策意愿弱'
    },
    {
        id: 'roi-adset-combo-cpc-cpa',
        kpi: 'ROI',
        level: 'AdSet',
        scenario: 'combo',
        priority: 3,
        conditions: [
            { metric: 'cpc', operator: '>', threshold: 20 },
            { metric: 'cpa', operator: '>', threshold: 15 }
        ],
        guidance: '流量成本和转化成本双超标'
    },
    {
        id: 'roi-adset-combo-triple-issue',
        kpi: 'ROI',
        level: 'AdSet',
        scenario: 'combo',
        priority: 2,
        conditions: [
            { metric: 'roi', operator: '<', threshold: -10 },
            { metric: 'cpa', operator: '>', threshold: 15 },
            { metric: 'cvr', operator: '<', threshold: -15 }
        ],
        guidance: '三重问题：利润差、成本高、转化低'
    },
    {
        id: 'roi-adset-combo-ctr-atc',
        kpi: 'ROI',
        level: 'AdSet',
        scenario: 'combo',
        priority: 3,
        conditions: [
            { metric: 'ctr', operator: '<', threshold: -20 },
            { metric: 'atc_rate', operator: '<', threshold: -15 }
        ],
        guidance: '点击率和加购率双低，受众兴趣不足'
    },
    {
        id: 'roi-adset-combo-cost-collapse',
        kpi: 'ROI',
        level: 'AdSet',
        scenario: 'combo',
        priority: 2,
        conditions: [
            { metric: 'cpatc', operator: '>', threshold: 20 },
            { metric: 'cvr', operator: '<', threshold: -15 },
            { metric: 'cpa', operator: '>', threshold: 15 }
        ],
        guidance: '全成本链条失控，受众完全错误'
    },
    {
        id: 'roi-adset-combo-roi-cpc',
        kpi: 'ROI',
        level: 'AdSet',
        scenario: 'combo',
        priority: 3,
        conditions: [
            { metric: 'roi', operator: '<', threshold: -10 },
            { metric: 'cpc', operator: '>', threshold: 20 }
        ],
        guidance: '买量贵导致ROI差，竞争过激'
    },
    {
        id: 'roi-adset-combo-cvr-cpc',
        kpi: 'ROI',
        level: 'AdSet',
        scenario: 'combo',
        priority: 3,
        conditions: [
            { metric: 'cvr', operator: '<', threshold: -15 },
            { metric: 'cpc', operator: '>', threshold: 20 }
        ],
        guidance: '高价买来低质量流量'
    },
    {
        id: 'roi-adset-combo-atc-cpa',
        kpi: 'ROI',
        level: 'AdSet',
        scenario: 'combo',
        priority: 3,
        conditions: [
            { metric: 'atc_rate', operator: '<', threshold: -15 },
            { metric: 'cpa', operator: '>', threshold: 15 }
        ],
        guidance: '加购意愿低推高获客成本'
    },
    {
        id: 'roi-adset-combo-full-failure',
        kpi: 'ROI',
        level: 'AdSet',
        scenario: 'combo',
        priority: 2,
        conditions: [
            { metric: 'ctr', operator: '<', threshold: -20 },
            { metric: 'cpa', operator: '>', threshold: 15 },
            { metric: 'cvr', operator: '<', threshold: -15 }
        ],
        guidance: '流量、成本、转化全面失败'
    },

    // ========== ROI - Ad 规则 (12条) ==========
    {
        id: 'roi-ad-combo-cvr-ctr',
        kpi: 'ROI',
        level: 'Ad',
        scenario: 'combo',
        priority: 3,
        conditions: [
            { metric: 'cvr', operator: '<', threshold: -15 },
            { metric: 'ctr', operator: '<', threshold: -20 }
        ],
        guidance: '素材与产品不匹配，重新策划'
    },
    {
        id: 'roi-ad-combo-cpc-atc',
        kpi: 'ROI',
        level: 'Ad',
        scenario: 'combo',
        priority: 3,
        conditions: [
            { metric: 'cpc', operator: '>', threshold: 20 },
            { metric: 'atc_rate', operator: '<', threshold: -20 }
        ],
        guidance: '素材吸引了错误的人群，重做素材'
    },
    {
        id: 'roi-ad-combo-roi-ctr',
        kpi: 'ROI',
        level: 'Ad',
        scenario: 'combo',
        priority: 3,
        conditions: [
            { metric: 'roi', operator: '<', threshold: -10 },
            { metric: 'ctr', operator: '<', threshold: -20 }
        ],
        guidance: 'ROI差且流量获取难，素材完全失败'
    },
    {
        id: 'roi-ad-combo-triple-funnel',
        kpi: 'ROI',
        level: 'Ad',
        scenario: 'combo',
        priority: 2,
        conditions: [
            { metric: 'ctr', operator: '<', threshold: -20 },
            { metric: 'atc_rate', operator: '<', threshold: -20 },
            { metric: 'cvr', operator: '<', threshold: -15 }
        ],
        guidance: '三层漏斗全崩，素材定位根本错误'
    },
    {
        id: 'roi-ad-combo-atc-cvr',
        kpi: 'ROI',
        level: 'Ad',
        scenario: 'combo',
        priority: 3,
        conditions: [
            { metric: 'atc_rate', operator: '<', threshold: -20 },
            { metric: 'cvr', operator: '<', threshold: -15 }
        ],
        guidance: '素材引流但不转化，与落地页脱节'
    },
    {
        id: 'roi-ad-combo-cpc-cvr',
        kpi: 'ROI',
        level: 'Ad',
        scenario: 'combo',
        priority: 3,
        conditions: [
            { metric: 'cpc', operator: '>', threshold: 20 },
            { metric: 'cvr', operator: '<', threshold: -15 }
        ],
        guidance: '素材吸引高价低质流量'
    },
    {
        id: 'roi-ad-combo-roi-atc',
        kpi: 'ROI',
        level: 'Ad',
        scenario: 'combo',
        priority: 3,
        conditions: [
            { metric: 'roi', operator: '<', threshold: -10 },
            { metric: 'atc_rate', operator: '<', threshold: -20 }
        ],
        guidance: '素材无法激发购买欲望'
    },
    {
        id: 'roi-ad-combo-ctr-cpc',
        kpi: 'ROI',
        level: 'Ad',
        scenario: 'combo',
        priority: 3,
        conditions: [
            { metric: 'ctr', operator: '<', threshold: -20 },
            { metric: 'cpc', operator: '>', threshold: 20 }
        ],
        guidance: '素材弱吸引力遇高竞争'
    },
    {
        id: 'roi-ad-combo-atc-cpa',
        kpi: 'ROI',
        level: 'Ad',
        scenario: 'combo',
        priority: 3,
        conditions: [
            { metric: 'atc_rate', operator: '<', threshold: -20 },
            { metric: 'cpa', operator: '>', threshold: 15 }
        ],
        guidance: '加购率低导致获客成本飙升'
    },
    {
        id: 'roi-ad-combo-cvr-cpa',
        kpi: 'ROI',
        level: 'Ad',
        scenario: 'combo',
        priority: 3,
        conditions: [
            { metric: 'cvr', operator: '<', threshold: -15 },
            { metric: 'cpa', operator: '>', threshold: 15 }
        ],
        guidance: '素材引来无效流量，转化成本失控'
    },
    {
        id: 'roi-ad-combo-full-fail',
        kpi: 'ROI',
        level: 'Ad',
        scenario: 'combo',
        priority: 2,
        conditions: [
            { metric: 'roi', operator: '<', threshold: -10 },
            { metric: 'cvr', operator: '<', threshold: -15 },
            { metric: 'ctr', operator: '<', threshold: -20 }
        ],
        guidance: '全面失败，需更换素材方向'
    },
    {
        id: 'roi-ad-combo-high-cost-chain',
        kpi: 'ROI',
        level: 'Ad',
        scenario: 'combo',
        priority: 2,
        conditions: [
            { metric: 'cpc', operator: '>', threshold: 20 },
            { metric: 'atc_rate', operator: '<', threshold: -20 },
            { metric: 'cvr', operator: '<', threshold: -15 }
        ],
        guidance: '高价买量但转化链路全断'
    },

    // ========== CPC - Campaign 规则 (14条) ==========
    {
        id: 'cpc-campaign-combo-worst',
        kpi: 'CPC',
        level: 'Campaign',
        scenario: 'combo',
        priority: 1,
        conditions: [
            { metric: 'ctr', operator: '<', threshold: -20 },
            { metric: 'cpm', operator: '>', threshold: 20 }
        ],
        guidance: '⚠️ 最差场景：素材差且流量贵，立即暂停重做'
    },
    {
        id: 'cpc-campaign-combo-high-price',
        kpi: 'CPC',
        level: 'Campaign',
        scenario: 'combo',
        priority: 2,
        conditions: [
            { metric: 'spend', operator: '>', threshold: 0 },
            { metric: 'cpc', operator: '>', threshold: 20 }
        ],
        guidance: '高价买量，需限制预算或降出价'
    },
    {
        id: 'cpc-campaign-combo-invalid-impr',
        kpi: 'CPC',
        level: 'Campaign',
        scenario: 'combo',
        priority: 2,
        conditions: [
            { metric: 'impressions', operator: '>', threshold: 20 },
            { metric: 'clicks', operator: '<', threshold: -30 }
        ],
        guidance: '严重无效曝光，检查素材是否违规或跑偏'
    },
    {
        id: 'cpc-campaign-combo-double-cost',
        kpi: 'CPC',
        level: 'Campaign',
        scenario: 'combo',
        priority: 3,
        conditions: [
            { metric: 'cpc', operator: '>', threshold: 20 },
            { metric: 'cpm', operator: '>', threshold: 20 }
        ],
        guidance: '双成本超标，竞争过于激烈'
    },
    {
        id: 'cpc-campaign-combo-ctr-spend',
        kpi: 'CPC',
        level: 'Campaign',
        scenario: 'combo',
        priority: 3,
        conditions: [
            { metric: 'ctr', operator: '<', threshold: -20 },
            { metric: 'spend', operator: '>', threshold: 0 }
        ],
        guidance: '烧钱但流量质量差，降预算'
    },
    {
        id: 'cpc-campaign-combo-cpm-spend',
        kpi: 'CPC',
        level: 'Campaign',
        scenario: 'combo',
        priority: 3,
        conditions: [
            { metric: 'cpm', operator: '>', threshold: 20 },
            { metric: 'spend', operator: '>', threshold: 0 }
        ],
        guidance: '高价抢量导致预算快速消耗'
    },
    {
        id: 'cpc-campaign-combo-clicks-spend',
        kpi: 'CPC',
        level: 'Campaign',
        scenario: 'combo',
        priority: 3,
        conditions: [
            { metric: 'clicks', operator: '<', threshold: 0 },
            { metric: 'spend', operator: '>', threshold: 0 }
        ],
        guidance: '花钱多但点击少，极低效率'
    },
    {
        id: 'cpc-campaign-combo-triple-fail',
        kpi: 'CPC',
        level: 'Campaign',
        scenario: 'combo',
        priority: 1,
        conditions: [
            { metric: 'ctr', operator: '<', threshold: -20 },
            { metric: 'cpc', operator: '>', threshold: 20 },
            { metric: 'cpm', operator: '>', threshold: 20 }
        ],
        guidance: '⚠️ 三重失败：素材差+成本高+竞争激烈'
    },
    {
        id: 'cpc-campaign-combo-impr-ctr',
        kpi: 'CPC',
        level: 'Campaign',
        scenario: 'combo',
        priority: 3,
        conditions: [
            { metric: 'impressions', operator: '>', threshold: 0 },
            { metric: 'ctr', operator: '<', threshold: -30 }
        ],
        guidance: '曝光浪费，素材完全无吸引力'
    },
    {
        id: 'cpc-campaign-combo-cpc-clicks',
        kpi: 'CPC',
        level: 'Campaign',
        scenario: 'combo',
        priority: 3,
        conditions: [
            { metric: 'cpc', operator: '>', threshold: 25 },
            { metric: 'clicks', operator: '<', threshold: -20 }
        ],
        guidance: '单价贵且点击量少，双重损失'
    },
    {
        id: 'cpc-campaign-combo-cpm-ctr-clicks',
        kpi: 'CPC',
        level: 'Campaign',
        scenario: 'combo',
        priority: 2,
        conditions: [
            { metric: 'cpm', operator: '>', threshold: 20 },
            { metric: 'ctr', operator: '<', threshold: -20 },
            { metric: 'clicks', operator: '<', threshold: -15 }
        ],
        guidance: '高价购买无效曝光'
    },
    {
        id: 'cpc-campaign-combo-spend-cpm-cpc',
        kpi: 'CPC',
        level: 'Campaign',
        scenario: 'combo',
        priority: 2,
        conditions: [
            { metric: 'spend', operator: '>', threshold: 0 },
            { metric: 'cpm', operator: '>', threshold: 20 },
            { metric: 'cpc', operator: '>', threshold: 20 }
        ],
        guidance: '预算在高竞争环境快速消耗'
    },
    {
        id: 'cpc-campaign-combo-impr-clicks-ctr',
        kpi: 'CPC',
        level: 'Campaign',
        scenario: 'combo',
        priority: 2,
        conditions: [
            { metric: 'impressions', operator: '>', threshold: 10 },
            { metric: 'clicks', operator: '<', threshold: -20 },
            { metric: 'ctr', operator: '<', threshold: -25 }
        ],
        guidance: '大量曝光无转化，素材失败'
    },
    {
        id: 'cpc-campaign-combo-cpc-spend-ctr',
        kpi: 'CPC',
        level: 'Campaign',
        scenario: 'combo',
        priority: 2,
        conditions: [
            { metric: 'cpc', operator: '>', threshold: 20 },
            { metric: 'spend', operator: '>', threshold: 0 },
            { metric: 'ctr', operator: '<', threshold: -20 }
        ],
        guidance: '高消耗低效率，需全面优化'
    },

    // ========== KPI正常但中间指标异常的规则（新增）==========
    // ROI正常场景
    {
        id: 'roi-campaign-normal-but-ctr-low',
        kpi: 'ROI',
        level: 'Campaign',
        scenario: 'combo',
        priority: 4,
        conditions: [
            { metric: 'roi', operator: '>=', threshold: -5 },
            { metric: 'ctr', operator: '<', threshold: -20 }
        ],
        guidance: '💡 ROI达标但CTR偏低，优化素材可进一步提升效果'
    },
    {
        id: 'roi-campaign-normal-but-cpc-high',
        kpi: 'ROI',
        level: 'Campaign',
        scenario: 'combo',
        priority: 4,
        conditions: [
            { metric: 'roi', operator: '>=', threshold: -5 },
            { metric: 'cpc', operator: '>', threshold: 20 }
        ],
        guidance: '💡 ROI达标但CPC偏高，降低出价或优化受众可降低成本'
    },
    {
        id: 'roi-campaign-normal-but-cvr-low',
        kpi: 'ROI',
        level: 'Campaign',
        scenario: 'combo',
        priority: 4,
        conditions: [
            { metric: 'roi', operator: '>=', threshold: -5 },
            { metric: 'cvr', operator: '<', threshold: -15 }
        ],
        guidance: '💡 ROI达标但CVR偏低，优化落地页可提升转化'
    },
    {
        id: 'roi-campaign-normal-but-cpa-high',
        kpi: 'ROI',
        level: 'Campaign',
        scenario: 'combo',
        priority: 4,
        conditions: [
            { metric: 'roi', operator: '>=', threshold: -5 },
            { metric: 'cpa', operator: '>', threshold: 15 }
        ],
        guidance: '💡 ROI达标但CPA偏高，优化转化路径可降低获客成本'
    },
    {
        id: 'roi-campaign-normal-but-atc-low',
        kpi: 'ROI',
        level: 'Campaign',
        scenario: 'combo',
        priority: 4,
        conditions: [
            { metric: 'roi', operator: '>=', threshold: -5 },
            { metric: 'atc_rate', operator: '<', threshold: -20 }
        ],
        guidance: '💡 ROI达标但加购率偏低，优化产品详情页可提升意向'
    },
    {
        id: 'roi-campaign-normal-but-aov-low',
        kpi: 'ROI',
        level: 'Campaign',
        scenario: 'combo',
        priority: 4,
        conditions: [
            { metric: 'roi', operator: '>=', threshold: -5 },
            { metric: 'aov', operator: '<', threshold: -15 }
        ],
        guidance: '💡 ROI达标但客单价偏低，尝试推荐高价商品或组合销售'
    },

    // AdSet层级 - KPI正常但中间指标异常
    {
        id: 'roi-adset-normal-but-ctr-low',
        kpi: 'ROI',
        level: 'AdSet',
        scenario: 'combo',
        priority: 4,
        conditions: [
            { metric: 'roi', operator: '>=', threshold: -5 },
            { metric: 'ctr', operator: '<', threshold: -20 }
        ],
        guidance: '💡 ROI达标但CTR偏低，测试新受众或调整定向'
    },
    {
        id: 'roi-adset-normal-but-cpc-high',
        kpi: 'ROI',
        level: 'AdSet',
        scenario: 'combo',
        priority: 4,
        conditions: [
            { metric: 'roi', operator: '>=', threshold: -5 },
            { metric: 'cpc', operator: '>', threshold: 20 }
        ],
        guidance: '💡 ROI达标但CPC偏高，扩大受众范围降低竞争'
    },
    {
        id: 'roi-adset-normal-but-cvr-low',
        kpi: 'ROI',
        level: 'AdSet',
        scenario: 'combo',
        priority: 4,
        conditions: [
            { metric: 'roi', operator: '>=', threshold: -5 },
            { metric: 'cvr', operator: '<', threshold: -15 }
        ],
        guidance: '💡 ROI达标但CVR偏低，细分受众提升精准度'
    },
    {
        id: 'roi-adset-normal-but-atc-low',
        kpi: 'ROI',
        level: 'AdSet',
        scenario: 'combo',
        priority: 4,
        conditions: [
            { metric: 'roi', operator: '>=', threshold: -5 },
            { metric: 'atc_rate', operator: '<', threshold: -20 }
        ],
        guidance: '💡 ROI达标但加购率偏低，调整受众兴趣标签'
    },

    // Ad层级 - KPI正常但中间指标异常
    {
        id: 'roi-ad-normal-but-ctr-low',
        kpi: 'ROI',
        level: 'Ad',
        scenario: 'combo',
        priority: 4,
        conditions: [
            { metric: 'roi', operator: '>=', threshold: -5 },
            { metric: 'ctr', operator: '<', threshold: -20 }
        ],
        guidance: '💡 ROI达标但CTR偏低，优化素材创意可提升吸引力'
    },
    {
        id: 'roi-ad-normal-but-cpc-high',
        kpi: 'ROI',
        level: 'Ad',
        scenario: 'combo',
        priority: 4,
        conditions: [
            { metric: 'roi', operator: '>=', threshold: -5 },
            { metric: 'cpc', operator: '>', threshold: 20 }
        ],
        guidance: '💡 ROI达标但CPC偏高，测试不同素材风格降低成本'
    },
    {
        id: 'roi-ad-normal-but-cvr-low',
        kpi: 'ROI',
        level: 'Ad',
        scenario: 'combo',
        priority: 4,
        conditions: [
            { metric: 'roi', operator: '>=', threshold: -5 },
            { metric: 'cvr', operator: '<', threshold: -15 }
        ],
        guidance: '💡 ROI达标但CVR偏低，确保素材与落地页一致性'
    },
    {
        id: 'roi-ad-normal-but-atc-low',
        kpi: 'ROI',
        level: 'Ad',
        scenario: 'combo',
        priority: 4,
        conditions: [
            { metric: 'roi', operator: '>=', threshold: -5 },
            { metric: 'atc_rate', operator: '<', threshold: -20 }
        ],
        guidance: '💡 ROI达标但加购率偏低，强化产品卖点展示'
    },

    // CPC类型 - KPI正常但中间指标异常
    {
        id: 'cpc-campaign-normal-but-ctr-low',
        kpi: 'CPC',
        level: 'Campaign',
        scenario: 'combo',
        priority: 4,
        conditions: [
            { metric: 'cpc', operator: '<=', threshold: 10 },
            { metric: 'ctr', operator: '<', threshold: -20 }
        ],
        guidance: '💡 CPC达标但CTR偏低，优化素材可提升点击率'
    },
    {
        id: 'cpc-campaign-normal-but-cpm-high',
        kpi: 'CPC',
        level: 'Campaign',
        scenario: 'combo',
        priority: 4,
        conditions: [
            { metric: 'cpc', operator: '<=', threshold: 10 },
            { metric: 'cpm', operator: '>', threshold: 20 }
        ],
        guidance: '💡 CPC达标但CPM偏高，调整出价策略或受众'
    },
    {
        id: 'cpc-campaign-normal-but-clicks-low',
        kpi: 'CPC',
        level: 'Campaign',
        scenario: 'combo',
        priority: 4,
        conditions: [
            { metric: 'cpc', operator: '<=', threshold: 10 },
            { metric: 'clicks', operator: '<', threshold: -20 }
        ],
        guidance: '💡 CPC达标但点击量偏低，增加预算或扩大受众'
    },

    // ========== P4多指标组合规则 - Campaign层级 ==========
    {
        id: 'roi-campaign-normal-but-ctr-cpc-bad',
        kpi: 'ROI',
        level: 'Campaign',
        scenario: 'combo',
        priority: 4,
        conditions: [
            { metric: 'roi', operator: '>=', threshold: -5 },
            { metric: 'ctr', operator: '<', threshold: -20 },
            { metric: 'cpc', operator: '>', threshold: 20 }
        ],
        guidance: '💡 ROI达标但素材弱且竞争激烈，优化素材并调整出价'
    },
    {
        id: 'roi-campaign-normal-but-cvr-cpa-bad',
        kpi: 'ROI',
        level: 'Campaign',
        scenario: 'combo',
        priority: 4,
        conditions: [
            { metric: 'roi', operator: '>=', threshold: -5 },
            { metric: 'cvr', operator: '<', threshold: -15 },
            { metric: 'cpa', operator: '>', threshold: 15 }
        ],
        guidance: '💡 ROI达标但转化效率差，优化落地页并降低获客成本'
    },
    {
        id: 'roi-campaign-normal-but-ctr-cvr-bad',
        kpi: 'ROI',
        level: 'Campaign',
        scenario: 'combo',
        priority: 4,
        conditions: [
            { metric: 'roi', operator: '>=', threshold: -5 },
            { metric: 'ctr', operator: '<', threshold: -20 },
            { metric: 'cvr', operator: '<', threshold: -15 }
        ],
        guidance: '💡 ROI达标但全链路转化弱，优化素材和落地页'
    },
    {
        id: 'roi-campaign-normal-but-atc-cvr-bad',
        kpi: 'ROI',
        level: 'Campaign',
        scenario: 'combo',
        priority: 4,
        conditions: [
            { metric: 'roi', operator: '>=', threshold: -5 },
            { metric: 'atc_rate', operator: '<', threshold: -20 },
            { metric: 'cvr', operator: '<', threshold: -15 }
        ],
        guidance: '💡 ROI达标但购买意愿弱，优化产品详情页和结账流程'
    },
    {
        id: 'roi-campaign-normal-but-cpc-cvr-bad',
        kpi: 'ROI',
        level: 'Campaign',
        scenario: 'combo',
        priority: 4,
        conditions: [
            { metric: 'roi', operator: '>=', threshold: -5 },
            { metric: 'cpc', operator: '>', threshold: 20 },
            { metric: 'cvr', operator: '<', threshold: -15 }
        ],
        guidance: '💡 ROI达标但买量贵且转化差，降低出价并优化落地页'
    },
    {
        id: 'roi-campaign-normal-but-aov-cvr-bad',
        kpi: 'ROI',
        level: 'Campaign',
        scenario: 'combo',
        priority: 4,
        conditions: [
            { metric: 'roi', operator: '>=', threshold: -5 },
            { metric: 'aov', operator: '<', threshold: -15 },
            { metric: 'cvr', operator: '<', threshold: -15 }
        ],
        guidance: '💡 ROI达标但客单价和转化双低，推荐高价商品并优化转化'
    },
    {
        id: 'roi-campaign-normal-but-cpa-cpatc-bad',
        kpi: 'ROI',
        level: 'Campaign',
        scenario: 'combo',
        priority: 4,
        conditions: [
            { metric: 'roi', operator: '>=', threshold: -5 },
            { metric: 'cpa', operator: '>', threshold: 15 },
            { metric: 'cpatc', operator: '>', threshold: 20 }
        ],
        guidance: '💡 ROI达标但成本链条偏高，优化转化路径降低成本'
    },
    {
        id: 'roi-campaign-normal-but-ctr-atc-bad',
        kpi: 'ROI',
        level: 'Campaign',
        scenario: 'combo',
        priority: 4,
        conditions: [
            { metric: 'roi', operator: '>=', threshold: -5 },
            { metric: 'ctr', operator: '<', threshold: -20 },
            { metric: 'atc_rate', operator: '<', threshold: -20 }
        ],
        guidance: '💡 ROI达标但素材吸引力不足，重新设计素材突出卖点'
    },
    {
        id: 'roi-campaign-normal-but-cpm-cpc-bad',
        kpi: 'ROI',
        level: 'Campaign',
        scenario: 'combo',
        priority: 4,
        conditions: [
            { metric: 'roi', operator: '>=', threshold: -5 },
            { metric: 'cpm', operator: '>', threshold: 20 },
            { metric: 'cpc', operator: '>', threshold: 20 }
        ],
        guidance: '💡 ROI达标但流量成本双高，调整出价策略或扩大受众'
    },
    {
        id: 'roi-campaign-normal-but-clicks-ctr-bad',
        kpi: 'ROI',
        level: 'Campaign',
        scenario: 'combo',
        priority: 4,
        conditions: [
            { metric: 'roi', operator: '>=', threshold: -5 },
            { metric: 'clicks', operator: '<', threshold: -20 },
            { metric: 'ctr', operator: '<', threshold: -20 }
        ],
        guidance: '💡 ROI达标但曝光转化效率低，优化素材提升点击率'
    },

    // ========== P4多指标组合规则 - AdSet层级 ==========
    {
        id: 'roi-adset-normal-but-ctr-cvr-bad',
        kpi: 'ROI',
        level: 'AdSet',
        scenario: 'combo',
        priority: 4,
        conditions: [
            { metric: 'roi', operator: '>=', threshold: -5 },
            { metric: 'ctr', operator: '<', threshold: -20 },
            { metric: 'cvr', operator: '<', threshold: -15 }
        ],
        guidance: '💡 ROI达标但受众不精准，细分受众提升转化'
    },
    {
        id: 'roi-adset-normal-but-cpc-cpa-bad',
        kpi: 'ROI',
        level: 'AdSet',
        scenario: 'combo',
        priority: 4,
        conditions: [
            { metric: 'roi', operator: '>=', threshold: -5 },
            { metric: 'cpc', operator: '>', threshold: 20 },
            { metric: 'cpa', operator: '>', threshold: 15 }
        ],
        guidance: '💡 ROI达标但受众成本高，扩大受众范围降低竞争'
    },
    {
        id: 'roi-adset-normal-but-atc-cvr-bad',
        kpi: 'ROI',
        level: 'AdSet',
        scenario: 'combo',
        priority: 4,
        conditions: [
            { metric: 'roi', operator: '>=', threshold: -5 },
            { metric: 'atc_rate', operator: '<', threshold: -20 },
            { metric: 'cvr', operator: '<', threshold: -15 }
        ],
        guidance: '💡 ROI达标但受众购买意愿弱，调整受众兴趣标签'
    },
    {
        id: 'roi-adset-normal-but-ctr-cpc-bad',
        kpi: 'ROI',
        level: 'AdSet',
        scenario: 'combo',
        priority: 4,
        conditions: [
            { metric: 'roi', operator: '>=', threshold: -5 },
            { metric: 'ctr', operator: '<', threshold: -20 },
            { metric: 'cpc', operator: '>', threshold: 20 }
        ],
        guidance: '💡 ROI达标但受众竞争激烈，测试新受众或调整定向'
    },
    {
        id: 'roi-adset-normal-but-cvr-cpatc-bad',
        kpi: 'ROI',
        level: 'AdSet',
        scenario: 'combo',
        priority: 4,
        conditions: [
            { metric: 'roi', operator: '>=', threshold: -5 },
            { metric: 'cvr', operator: '<', threshold: -15 },
            { metric: 'cpatc', operator: '>', threshold: 20 }
        ],
        guidance: '💡 ROI达标但受众转化成本高，优化受众精准度'
    },
    {
        id: 'roi-adset-normal-but-cpa-cvr-bad',
        kpi: 'ROI',
        level: 'AdSet',
        scenario: 'combo',
        priority: 4,
        conditions: [
            { metric: 'roi', operator: '>=', threshold: -5 },
            { metric: 'cpa', operator: '>', threshold: 15 },
            { metric: 'cvr', operator: '<', threshold: -15 }
        ],
        guidance: '💡 ROI达标但受众质量差，更换受众或细分定向'
    },

    // ========== P4多指标组合规则 - Ad层级 ==========
    {
        id: 'roi-ad-normal-but-ctr-cvr-bad',
        kpi: 'ROI',
        level: 'Ad',
        scenario: 'combo',
        priority: 4,
        conditions: [
            { metric: 'roi', operator: '>=', threshold: -5 },
            { metric: 'ctr', operator: '<', threshold: -20 },
            { metric: 'cvr', operator: '<', threshold: -15 }
        ],
        guidance: '💡 ROI达标但素材与产品不符，重新策划素材'
    },
    {
        id: 'roi-ad-normal-but-cpc-cvr-bad',
        kpi: 'ROI',
        level: 'Ad',
        scenario: 'combo',
        priority: 4,
        conditions: [
            { metric: 'roi', operator: '>=', threshold: -5 },
            { metric: 'cpc', operator: '>', threshold: 20 },
            { metric: 'cvr', operator: '<', threshold: -15 }
        ],
        guidance: '💡 ROI达标但素材吸引错误人群，调整素材定位'
    },
    {
        id: 'roi-ad-normal-but-atc-cvr-bad',
        kpi: 'ROI',
        level: 'Ad',
        scenario: 'combo',
        priority: 4,
        conditions: [
            { metric: 'roi', operator: '>=', threshold: -5 },
            { metric: 'atc_rate', operator: '<', threshold: -20 },
            { metric: 'cvr', operator: '<', threshold: -15 }
        ],
        guidance: '💡 ROI达标但素材无法激发购买，强化产品卖点'
    },
    {
        id: 'roi-ad-normal-but-ctr-cpc-bad',
        kpi: 'ROI',
        level: 'Ad',
        scenario: 'combo',
        priority: 4,
        conditions: [
            { metric: 'roi', operator: '>=', threshold: -5 },
            { metric: 'ctr', operator: '<', threshold: -20 },
            { metric: 'cpc', operator: '>', threshold: 20 }
        ],
        guidance: '💡 ROI达标但素材弱且竞争激烈，测试新素材风格'
    },
    {
        id: 'roi-ad-normal-but-cpa-cvr-bad',
        kpi: 'ROI',
        level: 'Ad',
        scenario: 'combo',
        priority: 4,
        conditions: [
            { metric: 'roi', operator: '>=', threshold: -5 },
            { metric: 'cpa', operator: '>', threshold: 15 },
            { metric: 'cvr', operator: '<', threshold: -15 }
        ],
        guidance: '💡 ROI达标但素材引流质量差，优化素材与落地页一致性'
    },
    {
        id: 'roi-ad-normal-but-atc-cpa-bad',
        kpi: 'ROI',
        level: 'Ad',
        scenario: 'combo',
        priority: 4,
        conditions: [
            { metric: 'roi', operator: '>=', threshold: -5 },
            { metric: 'atc_rate', operator: '<', threshold: -20 },
            { metric: 'cpa', operator: '>', threshold: 15 }
        ],
        guidance: '💡 ROI达标但素材加购转化差，优化素材展示产品价值'
    },

    // ========== P4多指标组合规则 - CPC类型 ==========
    {
        id: 'cpc-campaign-normal-but-ctr-cpm-bad',
        kpi: 'CPC',
        level: 'Campaign',
        scenario: 'combo',
        priority: 4,
        conditions: [
            { metric: 'cpc', operator: '<=', threshold: 10 },
            { metric: 'ctr', operator: '<', threshold: -20 },
            { metric: 'cpm', operator: '>', threshold: 20 }
        ],
        guidance: '💡 CPC达标但曝光成本高且点击率低，优化素材提升CTR'
    },
    {
        id: 'cpc-campaign-normal-but-clicks-impressions-bad',
        kpi: 'CPC',
        level: 'Campaign',
        scenario: 'combo',
        priority: 4,
        conditions: [
            { metric: 'cpc', operator: '<=', threshold: 10 },
            { metric: 'clicks', operator: '<', threshold: -20 },
            { metric: 'impressions', operator: '>', threshold: 20 }
        ],
        guidance: '💡 CPC达标但曝光多点击少，素材吸引力不足'
    },
    {
        id: 'cpc-campaign-normal-but-ctr-clicks-bad',
        kpi: 'CPC',
        level: 'Campaign',
        scenario: 'combo',
        priority: 4,
        conditions: [
            { metric: 'cpc', operator: '<=', threshold: 10 },
            { metric: 'ctr', operator: '<', threshold: -20 },
            { metric: 'clicks', operator: '<', threshold: -20 }
        ],
        guidance: '💡 CPC达标但整体流量获取效率低，增加预算并优化素材'
    }
];

// ==================== 核心函数 ====================

/**
 * 获取调优指导建议
 */
export function getOptimizationGuidance(
    level: 'Campaign' | 'AdSet' | 'Ad',
    kpi: 'ROI' | 'CPC' | 'CPM',
    metrics: CampaignMetrics,
    benchmark: CampaignMetrics
): string {
    // 筛选适用规则
    const applicableRules = OPTIMIZATION_RULES
        .filter(r => r.level === level && r.kpi === kpi)
        .sort((a, b) => a.priority - b.priority);

    // 按优先级匹配规则
    for (const rule of applicableRules) {
        if (matchesRule(rule, metrics, benchmark)) {
            return rule.guidance;
        }
    }

    // 无匹配规则
    return '✅ 表现正常';
}

/**
 * 检查是否匹配规则
 */
function matchesRule(
    rule: OptimizationRule,
    metrics: CampaignMetrics,
    benchmark: CampaignMetrics
): boolean {
    return rule.conditions.every(cond => {
        const actualValue = (metrics as any)[cond.metric] || 0;
        const benchmarkValue = (benchmark as any)[cond.metric] || 0;

        // 🆕 特殊处理：ROI为0或负数的情况
        if (cond.metric === 'roi' && actualValue <= 0 && benchmarkValue > 0) {
            // ROI为0或负数时，视为-100%偏差
            const vsAvgPercent = -100;
            switch (cond.operator) {
                case '>':
                    return vsAvgPercent > cond.threshold;
                case '<':
                    return vsAvgPercent < cond.threshold;
                case '>=':
                    return vsAvgPercent >= cond.threshold;
                case '<=':
                    return vsAvgPercent <= cond.threshold;
                case '==':
                    return Math.abs(vsAvgPercent - cond.threshold) < 0.1;
                default:
                    return false;
            }
        }

        // 计算 vs Avg 百分比
        const vsAvgPercent = benchmarkValue !== 0
            ? ((actualValue - benchmarkValue) / benchmarkValue) * 100
            : 0;

        switch (cond.operator) {
            case '>':
                return vsAvgPercent > cond.threshold;
            case '<':
                return vsAvgPercent < cond.threshold;
            case '>=':
                return vsAvgPercent >= cond.threshold;
            case '<=':
                return vsAvgPercent <= cond.threshold;
            case '==':
                return Math.abs(vsAvgPercent - cond.threshold) < 0.1;
            default:
                return false;
        }
    });
}

/**
 * 获取触发的条件列表
 */
export function getTriggeredConditions(
    metrics: CampaignMetrics,
    benchmark: CampaignMetrics,
    kpi: 'ROI' | 'CPC' | 'CPM'
): string[] {
    const conditions: string[] = [];

    // 检查关键指标
    const keyMetrics = kpi === 'ROI'
        ? ['spend', 'roi', 'cvr', 'cpa', 'atc_rate', 'ctr', 'cpc']
        : kpi === 'CPC'
            ? ['spend', 'cpc', 'cpm', 'ctr', 'clicks']
            : ['spend', 'cpm', 'reach', 'impressions', 'frequency'];

    for (const metric of keyMetrics) {
        const actualValue = (metrics as any)[metric];
        const benchmarkValue = (benchmark as any)[metric];

        if (actualValue === undefined || benchmarkValue === undefined) continue;

        const vsAvgPercent = benchmarkValue !== 0
            ? ((actualValue - benchmarkValue) / benchmarkValue) * 100
            : 0;

        if (Math.abs(vsAvgPercent) > 10) {
            const sign = vsAvgPercent > 0 ? '+' : '';
            conditions.push(`${metric.toUpperCase()}: ${sign}${vsAvgPercent.toFixed(1)}%`);
        }
    }

    return conditions;
}

/**
 * 获取优先级等级
 */
export function getPriorityLevel(guidance: string): 'P0' | 'P1' | 'P2' | 'OK' {
    if (guidance.includes('立即') || guidance.includes('暂停') ||
        guidance.includes('三重') || guidance.includes('高亏损') ||
        guidance.includes('最危险')) {
        return 'P0';
    }

    if (guidance.includes('⚠️') || guidance.includes('严重') ||
        guidance.includes('失控') || guidance.includes('崩溃')) {
        return 'P1';
    }

    if (guidance.includes('优化') || guidance.includes('调整') ||
        guidance.includes('检查')) {
        return 'P2';
    }

    return 'OK';
}

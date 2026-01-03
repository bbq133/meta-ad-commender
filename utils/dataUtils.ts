import { RawAdRecord, AggregatedMetrics, AdConfiguration, CampaignLayer } from '../types';

// 计算聚合指标
export const calculateMetrics = (records: RawAdRecord[]): AggregatedMetrics => {
    const totals = records.reduce((acc, curr) => ({
        spend: acc.spend + (curr.spend || 0),
        impressions: acc.impressions + (curr.impressions || 0),
        link_clicks: acc.link_clicks + (curr.link_clicks || 0),
        purchases: acc.purchases + (curr.purchases || 0),
        purchase_value: acc.purchase_value + (curr.purchase_value || 0),
        adds_to_cart: acc.adds_to_cart + (curr.adds_to_cart || 0),
        checkouts_initiated: acc.checkouts_initiated + (curr.checkouts_initiated || 0),
    }), {
        spend: 0,
        impressions: 0,
        link_clicks: 0,
        purchases: 0,
        purchase_value: 0,
        adds_to_cart: 0,
        checkouts_initiated: 0
    });

    const { spend, impressions, link_clicks, purchases, purchase_value, adds_to_cart } = totals;

    return {
        ...totals,
        roi: spend > 0 ? purchase_value / spend : 0,
        cpa: purchases > 0 ? spend / purchases : 0,
        cpc: link_clicks > 0 ? spend / link_clicks : 0,
        ctr: impressions > 0 ? link_clicks / impressions : 0,
        cpm: impressions > 0 ? (spend / impressions) * 1000 : 0,
        cpatc: adds_to_cart > 0 ? spend / adds_to_cart : 0,
        atc_rate: link_clicks > 0 ? adds_to_cart / link_clicks : 0,
        acos: purchase_value > 0 ? (spend / purchase_value) * 100 : 0,
        cvr: link_clicks > 0 ? purchases / link_clicks : 0,
        aov: purchases > 0 ? purchase_value / purchases : 0,
    };
};

// 匹配配置规则（支持AND/OR逻辑）
export const matchesConfig = (record: RawAdRecord, config: AdConfiguration): boolean => {
    if (config.rules.length === 0) return true;

    const logic = config.rulesLogic || 'AND';  // 默认AND逻辑（向后兼容）
    
    const checkRule = (rule: import('../types').FilterRule) => {
        const fieldValue = String(record[rule.field] || '').toLowerCase();
        const targetValue = rule.value.toLowerCase();

        switch (rule.operator) {
            case 'contains': return fieldValue.includes(targetValue);
            case 'not_contains': return !fieldValue.includes(targetValue);
            case 'equals': return fieldValue === targetValue;
            default: return true;
        }
    };

    if (logic === 'AND') {
        // AND逻辑：所有规则都必须匹配
        return config.rules.every(checkRule);
    } else {
        // OR逻辑：任一规则匹配即可
        return config.rules.some(checkRule);
    }
};

// 匹配单个层级规则
const matchesLayerRule = (record: RawAdRecord, rule: import('../types').LayerFilterRule): boolean => {
    const fieldValue = String(record[rule.field] || '').toLowerCase();
    const targetValue = rule.value.toLowerCase();
    
    switch (rule.operator) {
        case 'contains': return fieldValue.includes(targetValue);
        case 'not_contains': return !fieldValue.includes(targetValue);
        case 'equals': return fieldValue === targetValue;
        default: return false;
    }
};

// 匹配层级规则组（支持AND/OR逻辑）
const matchesLayerRules = (
    record: RawAdRecord, 
    rules: import('../types').LayerFilterRule[], 
    logic: 'AND' | 'OR'
): boolean => {
    if (rules.length === 0) return false;
    
    if (logic === 'AND') {
        // AND逻辑：所有规则都必须匹配
        return rules.every(rule => matchesLayerRule(record, rule));
    } else {
        // OR逻辑：任一规则匹配即可
        return rules.some(rule => matchesLayerRule(record, rule));
    }
};

// 分类广告系列
export const classifyCampaign = (record: RawAdRecord, config?: import('../types').LayerConfiguration): CampaignLayer => {
    // 如果没有提供配置，使用默认规则（向后兼容）
    if (!config) {
        const upperName = record.campaign_name.toUpperCase();
        if (upperName.includes('-AW-')) return CampaignLayer.AWARENESS;
        if (upperName.includes('-TR-')) return CampaignLayer.TRAFFIC;
        if (upperName.includes('-CV-')) return CampaignLayer.CONVERSION;
        return CampaignLayer.CONVERSION;
    }
    
    // 使用配置进行分类
    // 检查 Awareness
    if (matchesLayerRules(record, config.awareness.rules, config.awareness.logic)) {
        return CampaignLayer.AWARENESS;
    }
    
    // 检查 Traffic
    if (matchesLayerRules(record, config.traffic.rules, config.traffic.logic)) {
        return CampaignLayer.TRAFFIC;
    }
    
    // 检查 Conversion
    if (matchesLayerRules(record, config.conversion.rules, config.conversion.logic)) {
        return CampaignLayer.CONVERSION;
    }
    
    // 默认归类为 Conversion
    return CampaignLayer.CONVERSION;
};

// 格式化货币
export const formatCurrency = (val: number): string => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(val);
};

// 格式化百分比
export const formatPercent = (val: number, decimals: number = 2): string => {
    return (val * 100).toFixed(decimals) + '%';
};

// 格式化数字
export const formatNumber = (val: number): string => {
    return new Intl.NumberFormat('en-US').format(Math.round(val));
};

// 计算变化率
export const getDelta = (curr: number, prev: number): number => {
    if (prev <= 0) return 0;
    return (curr - prev) / prev;
};

// ============ 智能预算计算工具函数 ============

// 计算两个日期之间的天数差（包含首尾两天）
export const getDaysDiff = (startDate: string, endDate: string): number => {
    const start = new Date(startDate + 'T00:00:00').getTime();
    const end = new Date(endDate + 'T00:00:00').getTime();
    const diffMs = end - start;
    return Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1; // +1 包含首尾两天
};

// 获取两个日期区间的重叠部分
export const getOverlapPeriod = (
    period1Start: string,
    period1End: string,
    period2Start: string,
    period2End: string
): { start: string; end: string; days: number } | null => {
    // 重叠区间的开始日期 = 两个开始日期中较晚的
    const overlapStart = period1Start > period2Start ? period1Start : period2Start;

    // 重叠区间的结束日期 = 两个结束日期中较早的
    const overlapEnd = period1End < period2End ? period1End : period2End;

    // 如果开始日期晚于结束日期，说明没有重叠
    if (overlapStart > overlapEnd) {
        return null;
    }

    const days = getDaysDiff(overlapStart, overlapEnd);

    return { start: overlapStart, end: overlapEnd, days };
};

// 计算单个业务线在指定时间段内的应分配预算
export const calculateConfigBudget = (
    config: AdConfiguration,
    selectedStart: string,
    selectedEnd: string
): { allocatedBudget: number; dailyBudget: number; overlapDays: number } => {
    // 如果没有设置投放周期，返回0
    if (!config.campaignPeriod) {
        return { allocatedBudget: 0, dailyBudget: 0, overlapDays: 0 };
    }

    const { startDate, endDate } = config.campaignPeriod;

    // 计算重叠区间
    const overlap = getOverlapPeriod(startDate, endDate, selectedStart, selectedEnd);

    // 如果没有重叠，返回0
    if (!overlap) {
        return { allocatedBudget: 0, dailyBudget: 0, overlapDays: 0 };
    }

    // 计算投放总天数
    const totalDays = getDaysDiff(startDate, endDate);

    // 计算日均预算
    const dailyBudget = config.budget / totalDays;

    // 计算应分配预算
    const allocatedBudget = dailyBudget * overlap.days;

    return {
        allocatedBudget,
        dailyBudget,
        overlapDays: overlap.days
    };
};

// 计算所有业务线在指定时间段内的总预算
export interface BudgetBreakdown {
    configName: string;
    totalBudget: number;
    dailyBudget: number;
    overlapDays: number;
    allocatedBudget: number;
    campaignPeriod?: { startDate: string; endDate: string };
}

export const calculateTotalBudget = (
    configs: AdConfiguration[],
    selectedStart: string,
    selectedEnd: string
): { totalBudget: number; breakdown: BudgetBreakdown[] } => {
    const breakdown: BudgetBreakdown[] = [];
    let totalBudget = 0;

    configs.forEach(config => {
        const { allocatedBudget, dailyBudget, overlapDays } = calculateConfigBudget(
            config,
            selectedStart,
            selectedEnd
        );

        breakdown.push({
            configName: config.name,
            totalBudget: config.budget,
            dailyBudget,
            overlapDays,
            allocatedBudget,
            campaignPeriod: config.campaignPeriod
        });

        totalBudget += allocatedBudget;
    });

    return { totalBudget, breakdown };
};

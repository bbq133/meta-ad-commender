import { RawAdRecord } from '../types';

// ============ Metric Calculation Helpers ============

export const calculateROI = (r: RawAdRecord): number => {
    if (r.spend === 0) return 0;
    return r.purchase_value / r.spend;
};

export const calculateCVR = (r: RawAdRecord): number => {
    if (r.link_clicks === 0) return 0;
    return r.purchases / r.link_clicks;
};

export const calculateAOV = (r: RawAdRecord): number => {
    if (r.purchases === 0) return 0;
    return r.purchase_value / r.purchases;
};

export const calculateCPA = (r: RawAdRecord): number => {
    if (r.purchases === 0) return 0;
    return r.spend / r.purchases;
};

export const calculateCPATC = (r: RawAdRecord): number => {
    if (r.adds_to_cart === 0) return 0;
    return r.spend / r.adds_to_cart;
};

export const calculateATCRate = (r: RawAdRecord): number => {
    if (r.link_clicks === 0) return 0;
    return r.adds_to_cart / r.link_clicks;
};

export const calculateCTR = (r: RawAdRecord): number => {
    if (r.impressions === 0) return 0;
    return r.link_clicks / r.impressions;
};

export const calculateCPC = (r: RawAdRecord): number => {
    if (r.link_clicks === 0) return 0;
    return r.spend / r.link_clicks;
};

export const calculateCPM = (r: RawAdRecord): number => {
    if (r.impressions === 0) return 0;
    return (r.spend / r.impressions) * 1000;
};

export const calculateFrequency = (r: RawAdRecord): number => {
    if (!r.reach || r.reach === 0) return 0;
    return r.impressions / r.reach;
};

// ============ Benchmark Calculation ============

export interface BenchmarkMetrics {
    spend: number;
    roi: number;
    cvr: number;
    aov: number;
    cpa: number;
    cpatc: number;
    atc_rate: number;
    ctr: number;
    cpc: number;
    cpm: number;
    reach: number;
    impressions: number;
    frequency: number;
    clicks: number;
}

const average = (values: number[]): number => {
    if (values.length === 0) return 0;
    return values.reduce((sum, v) => sum + v, 0) / values.length;
};

export const calculateBenchmark = (
    data: RawAdRecord[],
    level: 'Campaign' | 'AdSet' | 'Ad'
): BenchmarkMetrics => {
    if (data.length === 0) {
        return {
            spend: 0, roi: 0, cvr: 0, aov: 0, cpa: 0, cpatc: 0,
            atc_rate: 0, ctr: 0, cpc: 0, cpm: 0, reach: 0,
            impressions: 0, frequency: 0, clicks: 0
        };
    }

    // Group by entity name based on level
    const entityMap = new Map<string, RawAdRecord[]>();
    data.forEach(record => {
        const key = level === 'Campaign' ? record.campaign_name :
            level === 'AdSet' ? record.adset_name : record.ad_name;
        if (!entityMap.has(key)) entityMap.set(key, []);
        entityMap.get(key)!.push(record);
    });

    // Calculate aggregated metrics for each entity (for summable metrics average)
    const entityMetrics = Array.from(entityMap.values()).map(records => {
        const totalSpend = records.reduce((sum, r) => sum + r.spend, 0);
        const totalImpressions = records.reduce((sum, r) => sum + r.impressions, 0);
        const totalClicks = records.reduce((sum, r) => sum + r.link_clicks, 0);
        const totalReach = records.reduce((sum, r) => sum + (r.reach || 0), 0);

        return {
            spend: totalSpend,
            impressions: totalImpressions,
            clicks: totalClicks,
            reach: totalReach
        };
    });

    // Calculate global aggregated data (for ratio metrics)
    const globalTotalSpend = data.reduce((sum, r) => sum + r.spend, 0);
    const globalTotalRevenue = data.reduce((sum, r) => sum + r.purchase_value, 0);
    const globalTotalClicks = data.reduce((sum, r) => sum + r.link_clicks, 0);
    const globalTotalImpressions = data.reduce((sum, r) => sum + r.impressions, 0);
    const globalTotalPurchases = data.reduce((sum, r) => sum + r.purchases, 0);
    const globalTotalATC = data.reduce((sum, r) => sum + r.adds_to_cart, 0);
    const globalTotalReach = data.reduce((sum, r) => sum + (r.reach || 0), 0);

    // Return benchmark metrics
    return {
        // Summable metrics: use layer-specific average
        spend: average(entityMetrics.map(m => m.spend)),
        impressions: average(entityMetrics.map(m => m.impressions)),
        clicks: average(entityMetrics.map(m => m.clicks)),
        reach: average(entityMetrics.map(m => m.reach)),

        // Ratio metrics: use global aggregated data (same across all levels)
        roi: globalTotalSpend > 0 ? globalTotalRevenue / globalTotalSpend : 0,
        cvr: globalTotalClicks > 0 ? globalTotalPurchases / globalTotalClicks : 0,
        aov: globalTotalPurchases > 0 ? globalTotalRevenue / globalTotalPurchases : 0,
        cpa: globalTotalPurchases > 0 ? globalTotalSpend / globalTotalPurchases : 0,
        cpatc: globalTotalATC > 0 ? globalTotalSpend / globalTotalATC : 0,
        atc_rate: globalTotalClicks > 0 ? globalTotalATC / globalTotalClicks : 0,
        ctr: globalTotalImpressions > 0 ? globalTotalClicks / globalTotalImpressions : 0,
        cpc: globalTotalClicks > 0 ? globalTotalSpend / globalTotalClicks : 0,
        cpm: globalTotalImpressions > 0 ? (globalTotalSpend / globalTotalImpressions) * 1000 : 0,
        frequency: globalTotalReach > 0 ? globalTotalImpressions / globalTotalReach : 0
    };
};

export const calculateVsAvg = (current: number, benchmark: number): number => {
    if (benchmark === 0) return 0;
    return ((current - benchmark) / benchmark) * 100;
};

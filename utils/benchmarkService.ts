import { RawAdRecord, LayerConfiguration, CampaignLayer, LayerFilterRule, DEFAULT_LAYER_CONFIG } from '../types';
import { CampaignBenchmarks } from './benchmarkCalculator';

// Benchmark 结果接口
export interface LayerBenchmarks {
    awareness: CampaignBenchmarks & { hasData: boolean };
    traffic: CampaignBenchmarks & { hasData: boolean };
    conversion: CampaignBenchmarks & { hasData: boolean };
    // 全局 Fallback 数据
    global: CampaignBenchmarks;
}

// 检查是否匹配规则
const matchesRules = (campaignName: string, rules: LayerFilterRule[], logic: 'AND' | 'OR'): boolean => {
    if (!rules || rules.length === 0) return false;

    const results = rules.map(rule => {
        // 目前仅支持 campaign_name 筛选
        if (rule.field !== 'campaign_name') return false;

        const value = campaignName;
        const target = rule.value;

        switch (rule.operator) {
            case 'contains':
                return value.includes(target);
            case 'not_contains':
                return !value.includes(target);
            case 'equals':
                return value === target;
            default:
                return false;
        }
    });

    return logic === 'AND'
        ? results.every(r => r)
        : results.some(r => r);
};

// 获取 Campaign 所属层级
export const getCampaignLayer = (campaignName: string, layerConfig: LayerConfiguration): CampaignLayer => {
    // 1. 检查 Awareness 规则
    if (matchesRules(campaignName, layerConfig.awareness.rules, layerConfig.awareness.logic)) {
        return CampaignLayer.AWARENESS;
    }

    // 2. 检查 Traffic 规则
    if (matchesRules(campaignName, layerConfig.traffic.rules, layerConfig.traffic.logic)) {
        return CampaignLayer.TRAFFIC;
    }

    // 3. 检查 Conversion 规则
    if (matchesRules(campaignName, layerConfig.conversion.rules, layerConfig.conversion.logic)) {
        return CampaignLayer.CONVERSION;
    }

    // 4. 默认 fallback 到 Conversion (与 LayerConfigModal 中的逻辑保持一致)
    return CampaignLayer.CONVERSION;
};

// 计算各层级的 Benchmarks
export const calculateLayerBenchmarks = (allData: RawAdRecord[], layerConfig: LayerConfiguration = DEFAULT_LAYER_CONFIG): LayerBenchmarks => {
    // 1. 初始化容器
    const layerData = {
        [CampaignLayer.AWARENESS]: [] as RawAdRecord[],
        [CampaignLayer.TRAFFIC]: [] as RawAdRecord[],
        [CampaignLayer.CONVERSION]: [] as RawAdRecord[]
    };

    // 2. 数据分类
    // 按 Campaign Name 分组，避免重复计算
    const campaignMap = new Map<string, RawAdRecord[]>();
    allData.forEach(r => {
        if (!campaignMap.has(r.campaign_name)) {
            campaignMap.set(r.campaign_name, []);
        }
        campaignMap.get(r.campaign_name)!.push(r);
    });

    campaignMap.forEach((records, campaignName) => {
        const layer = getCampaignLayer(campaignName, layerConfig);
        layerData[layer].push(...records);
    });

    // 3. 辅助计算函数 (加权平均)
    const calcBenchmarks = (data: RawAdRecord[]): CampaignBenchmarks => {
        const spend = data.reduce((sum, r) => sum + r.spend, 0);
        const impressions = data.reduce((sum, r) => sum + r.impressions, 0);
        const clicks = data.reduce((sum, r) => sum + r.link_clicks, 0);
        const revenue = data.reduce((sum, r) => sum + r.purchase_value, 0);
        const purchases = data.reduce((sum, r) => sum + r.purchases, 0);
        const atc = data.reduce((sum, r) => sum + r.adds_to_cart, 0);
        const checkouts = data.reduce((sum, r) => sum + r.checkouts_initiated, 0);
        const reach = data.reduce((sum, r) => sum + (r.reach || 0), 0);
        const landingPageViews = data.reduce((sum, r) => sum + (r.landing_page_views || 0), 0);
        const totalFrequency = data.reduce((sum, r) => sum + (r.frequency || 0), 0); // Note: Frequency average needs care, simple average of sums might be wrong if we want weighted. But frequency is usually ratio. Weighted Frequency = Total Impressions / Total Reach.

        // Weighted Average Calculation
        const avgRoi = spend > 0 ? revenue / spend : 0;
        const avgCpc = clicks > 0 ? spend / clicks : 0;
        const avgCpm = impressions > 0 ? (spend / impressions) * 1000 : 0;
        const avgCtr = impressions > 0 ? clicks / impressions : 0;
        const avgCvr = clicks > 0 ? purchases / clicks : 0;
        const avgCpa = purchases > 0 ? spend / purchases : 0;
        const avgCpatc = atc > 0 ? spend / atc : 0;
        const avgAtcRate = clicks > 0 ? atc / clicks : 0;
        const avgCheckoutRate = atc > 0 ? checkouts / atc : 0;
        const avgPurchaseRate = checkouts > 0 ? purchases / checkouts : 0;
        const avgClickToPvRate = clicks > 0 ? landingPageViews / clicks : 0;
        const avgAov = purchases > 0 ? revenue / purchases : 0;
        // Weighted frequency
        const avgFrequency = reach > 0 ? impressions / reach : 0;

        // ACOS is inverse of ROI (Spend / Revenue) or 0 if Revenue 0
        const avgAcos = revenue > 0 ? spend / revenue : 0;

        return {
            avgCpa,
            avgCpatc,
            avgCpc,
            avgCvr,
            avgCtr,
            avgCpm,
            avgAtcRate,
            avgCheckoutRate,
            avgPurchaseRate,
            avgClickToPvRate,
            avgRoi,
            avgAov,
            avgFrequency
        };
    };

    // 4. 计算各层级 KPI
    const awarenessBenchmarks = calcBenchmarks(layerData[CampaignLayer.AWARENESS]);
    const trafficBenchmarks = calcBenchmarks(layerData[CampaignLayer.TRAFFIC]);
    const conversionBenchmarks = calcBenchmarks(layerData[CampaignLayer.CONVERSION]);
    const globalBenchmarks = calcBenchmarks(allData);

    return {
        awareness: {
            ...awarenessBenchmarks,
            hasData: layerData[CampaignLayer.AWARENESS].length > 0
        },
        traffic: {
            ...trafficBenchmarks,
            hasData: layerData[CampaignLayer.TRAFFIC].length > 0
        },
        conversion: {
            ...conversionBenchmarks,
            hasData: layerData[CampaignLayer.CONVERSION].length > 0
        },
        global: globalBenchmarks
    };
};

// 根据 KPI 类型获取 Benchmark (含 Fallback 逻辑)
export const getBenchmarkForKPI = (
    kpiType: 'ROI' | 'CPC' | 'CPM',
    benchmarks: LayerBenchmarks
): number => {
    switch (kpiType) {
        case 'ROI':
            // 优先使用 Conversion Layer 的 ROI
            if (benchmarks.conversion.hasData) {
                return benchmarks.conversion.avgRoi;
            }
            // Fallback: 使用全局 ROI
            return benchmarks.global.avgRoi;

        case 'CPC':
            // 优先使用 Traffic Layer 的 CPC
            if (benchmarks.traffic.hasData) {
                return benchmarks.traffic.avgCpc;
            }
            // Fallback: 使用全局 CPC
            return benchmarks.global.avgCpc;

        case 'CPM':
            // 优先使用 Awareness Layer 的 CPM
            if (benchmarks.awareness.hasData) {
                return benchmarks.awareness.avgCpm;
            }
            // Fallback: 使用全局 CPM
            return benchmarks.global.avgCpm;

        default:
            return 0;
    }
};

// 为 AI 诊断获取带有上下文的 Benchmark 描述
export const getBenchmarkDescription = (
    kpiType: 'ROI' | 'CPC' | 'CPM',
    benchmarks: LayerBenchmarks
): string => {
    const value = getBenchmarkForKPI(kpiType, benchmarks);
    let source = 'Global Average';

    if (kpiType === 'ROI' && benchmarks.conversion.hasData) source = 'Conversion Layer';
    if (kpiType === 'CPC' && benchmarks.traffic.hasData) source = 'Traffic Layer';
    if (kpiType === 'CPM' && benchmarks.awareness.hasData) source = 'Awareness Layer';

    return `${value.toFixed(2)} (${source})`;
};

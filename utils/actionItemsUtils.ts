import { RawAdRecord, AdConfiguration } from '../types';
import { QuadrantThresholds } from './quadrantUtils';
import { calculateBenchmarkROI, calculatePriority } from './priorityUtils';
import { diagnoseAd, convertToAdDiagnosticDetail, AdDiagnosticContext } from './adDiagnostics';

// Action Item 类型定义

// 中间指标类型
export interface IntermediateMetrics {
    ctr?: number;        // 点击率 %
    cpc?: number;        // 点击成本 $
    cpm?: number;        // 千次展示成本 $
    cvr?: number;        // 转化率 %
    cpa?: number;        // 获客成本 $
    atc_rate?: number;   // 加购率 %
    cpatc?: number;      // 加购成本 $
    aov?: number;        // 客单价 $
    frequency?: number;  // 频次
    reach?: number;      // 触达人数
    impressions?: number; // 展示次数
    clicks?: number;     // 点击次数
    purchases?: number;  // 购买次数
    // 原始数据字段（用于诊断公式计算）
    adds_to_cart?: number;          // 加购次数
    checkouts_initiated?: number;   // 发起结账次数
    landing_page_views?: number;    // 落地页浏览次数
    purchase_value?: number;        // 购买金额
    // 新增中间转化指标
    click_to_pv_rate?: number;  // Click-to-PV Rate (小数格式)
    checkout_rate?: number;      // Checkout Rate (小数格式)
    purchase_rate?: number;      // Purchase Rate (小数格式)
}

export interface ActionCampaign {
    id: string;
    campaignName: string;
    businessLine: string;
    businessLineId: string;
    spend: number;
    avgSpend: number;
    lastSpend?: number;
    kpiType: 'ROI' | 'CPC' | 'CPM';
    targetValue: number;
    actualValue: number;
    gapPercentage: number;
    avgValue: number;
    lastValue?: number;
    quadrant: string;
    priority?: 'P0' | 'P1' | null;  // 优先级字段

    // 中间指标
    metrics?: IntermediateMetrics;
    avgMetrics?: IntermediateMetrics;
    lastMetrics?: IntermediateMetrics;
}

export interface ActionAdSet {
    id: string;
    adSetName: string;
    campaignName: string;
    businessLine: string;
    businessLineId: string;
    spend: number;
    avgSpend: number;
    lastSpend?: number;
    kpiType: 'ROI' | 'CPC' | 'CPM';
    targetValue: number;
    actualValue: number;
    gapPercentage: number;
    avgValue: number;
    lastValue?: number;
    vsAvgPercentage: number;

    // 中间指标
    metrics?: IntermediateMetrics;
    avgMetrics?: IntermediateMetrics;
    lastMetrics?: IntermediateMetrics;
}

export interface ActionAd {
    id: string;
    adName: string;
    adSetName: string;
    campaignName: string;
    businessLine: string;
    businessLineId: string;
    spend: number;
    avgSpend: number;
    lastSpend?: number;
    kpiType: 'ROI' | 'CPC' | 'CPM';
    targetValue: number;
    actualValue: number;
    gapPercentage: number;
    avgValue: number;
    lastValue?: number;
    vsAvgPercentage: number;

    // 中间指标
    metrics?: IntermediateMetrics;
    avgMetrics?: IntermediateMetrics;
    lastMetrics?: IntermediateMetrics;

    // Ad 诊断新增字段
    diagnosticDetails?: import('./campaignDiagnostics').DiagnosticDetail[];
    activeDays?: number;           // 上线天数
    videoPlayRate3s?: number;      // 3秒播放率
}

export interface ActionItemsResult {
    campaigns: ActionCampaign[];
    adSets: ActionAdSet[];
    ads: ActionAd[];
}

// 计算 KPI 值
const calculateKPI = (records: RawAdRecord[], kpiType: 'ROI' | 'CPC' | 'CPM'): number => {
    const totalSpend = records.reduce((sum, r) => sum + r.spend, 0);
    const totalRevenue = records.reduce((sum, r) => sum + r.purchase_value, 0);
    const totalClicks = records.reduce((sum, r) => sum + r.link_clicks, 0);
    const totalImpressions = records.reduce((sum, r) => sum + r.impressions, 0);

    if (kpiType === 'ROI') {
        return totalSpend > 0 ? totalRevenue / totalSpend : 0;
    } else if (kpiType === 'CPC') {
        return totalClicks > 0 ? totalSpend / totalClicks : 0;
    } else {
        return totalImpressions > 0 ? (totalSpend / totalImpressions) * 1000 : 0;
    }
};

// 计算中间指标
const calculateMetrics = (records: RawAdRecord[]): IntermediateMetrics => {
    const totalSpend = records.reduce((sum, r) => sum + r.spend, 0);
    const totalImpressions = records.reduce((sum, r) => sum + r.impressions, 0);
    const totalClicks = records.reduce((sum, r) => sum + r.link_clicks, 0);
    const totalPurchases = records.reduce((sum, r) => sum + r.purchases, 0);
    const totalPurchaseValue = records.reduce((sum, r) => sum + r.purchase_value, 0);
    const totalATC = records.reduce((sum, r) => sum + r.adds_to_cart, 0);
    const totalReach = records.reduce((sum, r) => sum + (r.reach || 0), 0);
    const totalCheckouts = records.reduce((sum, r) => sum + (r.checkouts_initiated || 0), 0);
    const totalLandingPageViews = records.reduce((sum, r) => sum + (r.landing_page_views || 0), 0);

    // 计算频次（Frequency）- 总曝光数 ÷ 总触达人数
    const calculatedFrequency = totalReach > 0 ? totalImpressions / totalReach : 0;

    return {
        ctr: totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0,
        cpc: totalClicks > 0 ? totalSpend / totalClicks : 0,
        cpm: totalImpressions > 0 ? (totalSpend / totalImpressions) * 1000 : 0,
        cvr: totalClicks > 0 ? (totalPurchases / totalClicks) * 100 : 0,
        cpa: totalPurchases > 0 ? totalSpend / totalPurchases : 0,
        atc_rate: totalClicks > 0 ? (totalATC / totalClicks) * 100 : 0,
        cpatc: totalATC > 0 ? totalSpend / totalATC : 0,
        aov: totalPurchases > 0 ? totalPurchaseValue / totalPurchases : 0,
        frequency: calculatedFrequency,
        reach: totalReach,
        impressions: totalImpressions,
        clicks: totalClicks,
        purchases: totalPurchases,
        // 原始数据字段（用于诊断公式计算）
        adds_to_cart: totalATC,
        checkouts_initiated: totalCheckouts,
        landing_page_views: totalLandingPageViews,
        purchase_value: totalPurchaseValue,
        // 新增中间转化指标（注意：这些是小数格式，不是百分比）
        click_to_pv_rate: totalClicks > 0 ? totalLandingPageViews / totalClicks : 0,
        checkout_rate: totalATC > 0 ? totalCheckouts / totalATC : 0,
        purchase_rate: totalCheckouts > 0 ? totalPurchases / totalCheckouts : 0,
    };
};

// 计算差距百分比
const calculateGapPercentage = (actual: number, target: number): number => {
    if (target === 0) return 0;
    return ((actual - target) / target) * 100;
};

// 检查记录是否匹配配置规则
const matchesConfig = (record: RawAdRecord, config: AdConfiguration): boolean => {
    if (!config.rules || config.rules.length === 0) return false;

    const rulesLogic = config.rulesLogic || 'AND';
    const ruleResults = config.rules.map(rule => {
        const recordValue = record[rule.field as keyof RawAdRecord];
        if (typeof recordValue === 'string') {
            if (rule.operator === 'contains') return recordValue.includes(rule.value);
            if (rule.operator === 'equals') return recordValue === rule.value;
            if (rule.operator === 'startsWith') return recordValue.startsWith(rule.value);
        }
        return false;
    });

    return rulesLogic === 'AND'
        ? ruleResults.every(r => r)
        : ruleResults.some(r => r);
};

// 辅助函数：计算对比周期的 Spend
const getComparisonSpend = (
    comparisonData: RawAdRecord[] | undefined,
    config: AdConfiguration,
    filterFn: (r: RawAdRecord) => boolean
): number | undefined => {
    if (!comparisonData || comparisonData.length === 0) return undefined;

    const matchingRecords = comparisonData.filter(r =>
        matchesConfig(r, config) && filterFn(r)
    );

    return matchingRecords.length > 0
        ? matchingRecords.reduce((sum, r) => sum + r.spend, 0)
        : undefined;
};

// 辅助函数：计算对比周期的 KPI 值
const getComparisonKPI = (
    comparisonData: RawAdRecord[] | undefined,
    config: AdConfiguration,
    filterFn: (r: RawAdRecord) => boolean,
    kpiType: 'ROI' | 'CPC' | 'CPM'
): number | undefined => {
    if (!comparisonData || comparisonData.length === 0) return undefined;

    const matchingRecords = comparisonData.filter(r =>
        matchesConfig(r, config) && filterFn(r)
    );

    return matchingRecords.length > 0
        ? calculateKPI(matchingRecords, kpiType)
        : undefined;
};

// 辅助函数：计算对比周期的中间指标
const getComparisonMetrics = (
    comparisonData: RawAdRecord[] | undefined,
    config: AdConfiguration,
    filterFn: (r: RawAdRecord) => boolean
): IntermediateMetrics | undefined => {
    if (!comparisonData || comparisonData.length === 0) return undefined;

    const matchingRecords = comparisonData.filter(r =>
        matchesConfig(r, config) && filterFn(r)
    );

    return matchingRecords.length > 0
        ? calculateMetrics(matchingRecords)
        : undefined;
};

// 生成 Action Items
export const generateActionItems = (
    data: RawAdRecord[],
    configs: AdConfiguration[],
    businessLineThresholds: Map<string, QuadrantThresholds>,
    comparisonData?: RawAdRecord[]
): ActionItemsResult => {
    const campaigns: ActionCampaign[] = [];
    const adSets: ActionAdSet[] = [];
    const ads: ActionAd[] = [];

    // ============ 全局 Ad 平均值计算 (用于 Ad 素材诊断) ============
    // 按 Ad 分组计算全局平均值 (不受业务线配置限制)
    const globalAdMap = new Map<string, { spend: number; revenue: number; clicks: number; impressions: number; videoPlays3s: number; reach: number }>();
    data.forEach(r => {
        const adKey = `${r.campaign_name}|${r.adset_name}|${r.ad_name}`;
        if (!globalAdMap.has(adKey)) {
            globalAdMap.set(adKey, { spend: 0, revenue: 0, clicks: 0, impressions: 0, videoPlays3s: 0, reach: 0 });
        }
        const current = globalAdMap.get(adKey)!;
        current.spend += r.spend;
        current.revenue += r.purchase_value;
        current.clicks += r.link_clicks;
        current.impressions += r.impressions;
        current.videoPlays3s += r.video_plays_3s || 0;
        current.reach += r.reach || 0;
    });

    // 计算每个 Ad 的指标
    const adMetricsArray: { roi: number; ctr: number; videoPlayRate3s: number | undefined; frequency: number }[] = [];
    globalAdMap.forEach(adData => {
        if (adData.spend > 0) {  // 排除无花费的 Ad
            const roi = adData.spend > 0 ? adData.revenue / adData.spend : 0;
            const ctr = adData.impressions > 0 ? adData.clicks / adData.impressions : 0;
            const videoPlayRate3s = adData.impressions > 0 ? adData.videoPlays3s / adData.impressions : undefined;
            const frequency = adData.reach > 0 ? adData.impressions / adData.reach : 0;
            adMetricsArray.push({ roi, ctr, videoPlayRate3s, frequency });
        }
    });

    // 计算全局 Ad 平均值 (算术平均)
    const globalAdCount = adMetricsArray.length;
    const globalAdAvgRoi = globalAdCount > 0
        ? adMetricsArray.reduce((sum, m) => sum + m.roi, 0) / globalAdCount
        : 0;
    const globalAdAvgCtr = globalAdCount > 0
        ? adMetricsArray.reduce((sum, m) => sum + m.ctr, 0) / globalAdCount
        : 0;
    const validVideoPlayRates = adMetricsArray.filter(m => m.videoPlayRate3s !== undefined);
    const globalAdAvgVideoPlayRate3s = validVideoPlayRates.length > 0
        ? validVideoPlayRates.reduce((sum, m) => sum + (m.videoPlayRate3s || 0), 0) / validVideoPlayRates.length
        : undefined;
    // ============ 全局 Ad 平均值计算结束 ============

    // 遍历每个业务线配置
    configs.forEach(config => {
        const kpiType = config.targetType;
        const businessLine = config.name;
        const businessLineId = config.id;

        // 获取该业务线的阈值（从 Business Line 页面传递过来的）
        const thresholds = businessLineThresholds.get(businessLineId);
        if (!thresholds) {
            console.warn(`No thresholds found for business line: ${businessLine}`);
            return;
        }

        const targetValue = thresholds.kpiThreshold; // 使用调整后的 KPI 阈值
        const avgSpend = thresholds.spendThreshold; // 使用调整后的 Spend 阈值

        // 筛选匹配该业务线的数据
        const matchingData = data.filter(r => matchesConfig(r, config));
        if (matchingData.length === 0) return;

        // 计算该业务线的平均 KPI
        const avgKPI = calculateKPI(matchingData, kpiType);

        // 计算该业务线的 Benchmark ROI (用于优先级计算)
        // Benchmark = Total Revenue / Total Spend (加权平均)
        let benchmarkROI: number | null = null;
        if (kpiType === 'ROI') {
            // 收集所有 Campaign 的 revenue 和 spend 数据
            const campaignDataForBenchmark: Array<{ revenue: number; spend: number }> = [];
            const tempCampaignMapForBenchmark = new Map<string, { revenue: number; spend: number }>();

            matchingData.forEach(r => {
                const campaignKey = r.campaign_name;
                if (!tempCampaignMapForBenchmark.has(campaignKey)) {
                    tempCampaignMapForBenchmark.set(campaignKey, { revenue: 0, spend: 0 });
                }
                const current = tempCampaignMapForBenchmark.get(campaignKey)!;
                current.revenue += r.purchase_value;
                current.spend += r.spend;
            });

            tempCampaignMapForBenchmark.forEach(data => {
                campaignDataForBenchmark.push(data);
            });

            benchmarkROI = calculateBenchmarkROI(campaignDataForBenchmark);
        }

        // 计算该业务线的平均中间指标
        const avgMetrics = calculateMetrics(matchingData);

        // 计算该业务线的平均 Spend（按 Campaign 计算）
        const campaignSpends: number[] = [];
        const tempCampaignMap = new Map<string, number>();
        matchingData.forEach(r => {
            const current = tempCampaignMap.get(r.campaign_name) || 0;
            tempCampaignMap.set(r.campaign_name, current + r.spend);
        });
        tempCampaignMap.forEach(spend => campaignSpends.push(spend));
        const avgBusinessLineSpend = campaignSpends.length > 0
            ? campaignSpends.reduce((sum, s) => sum + s, 0) / campaignSpends.length
            : 0;

        // 按 Campaign 分组
        const campaignMap = new Map<string, RawAdRecord[]>();
        matchingData.forEach(r => {
            if (!campaignMap.has(r.campaign_name)) campaignMap.set(r.campaign_name, []);
            campaignMap.get(r.campaign_name)!.push(r);
        });

        // 遍历每个 Campaign
        campaignMap.forEach((campaignRecords, campaignName) => {
            const campaignSpend = campaignRecords.reduce((sum, r) => sum + r.spend, 0);
            const campaignKPI = calculateKPI(campaignRecords, kpiType);

            // 计算Campaign的中间指标
            const campaignMetrics = calculateMetrics(campaignRecords);

            // 计算对比周期的 Spend
            const campaignLastSpend = getComparisonSpend(
                comparisonData,
                config,
                r => r.campaign_name === campaignName
            );

            // 计算对比周期的 KPI 值
            const campaignLastValue = getComparisonKPI(
                comparisonData,
                config,
                r => r.campaign_name === campaignName,
                kpiType
            );

            // 计算对比周期的中间指标
            const campaignLastMetrics = getComparisonMetrics(
                comparisonData,
                config,
                r => r.campaign_name === campaignName
            );

            // 判断象限（使用调整后的阈值）
            let quadrant: string;
            const isHighSpend = campaignSpend >= avgSpend;
            const isGoodKPI = kpiType === 'ROI'
                ? campaignKPI >= targetValue
                : campaignKPI <= targetValue;

            if (!isHighSpend && isGoodKPI) quadrant = 'excellent';
            else if (isHighSpend && isGoodKPI) quadrant = 'potential';
            else if (!isHighSpend && !isGoodKPI) quadrant = 'watch';
            else quadrant = 'problem';

            // 只处理「观察区」和「问题区」的 Campaign
            if (quadrant === 'watch' || quadrant === 'problem') {
                // 计算优先级（仅针对 ROI 类型）
                const priority = benchmarkROI !== null
                    ? calculatePriority(campaignKPI, benchmarkROI, kpiType)
                    : null;

                // 添加到 Campaign 列表
                campaigns.push({
                    id: `campaign-${campaignName}-${businessLineId}`,
                    campaignName,
                    businessLine,
                    businessLineId,
                    spend: campaignSpend,
                    avgSpend: avgBusinessLineSpend,
                    lastSpend: campaignLastSpend,
                    kpiType,
                    targetValue,
                    actualValue: campaignKPI,
                    gapPercentage: calculateGapPercentage(campaignKPI, targetValue),
                    avgValue: avgKPI,
                    lastValue: campaignLastValue,
                    quadrant,
                    priority,  // 添加优先级字段
                    // 中间指标
                    metrics: campaignMetrics,
                    avgMetrics: avgMetrics,
                    lastMetrics: campaignLastMetrics,
                });

                // 处理该 Campaign 下的 AdSet
                const adSetMap = new Map<string, RawAdRecord[]>();
                campaignRecords.forEach(r => {
                    if (!adSetMap.has(r.adset_name)) adSetMap.set(r.adset_name, []);
                    adSetMap.get(r.adset_name)!.push(r);
                });

                adSetMap.forEach((adSetRecords, adSetName) => {
                    const adSetSpend = adSetRecords.reduce((sum, r) => sum + r.spend, 0);
                    const adSetKPI = calculateKPI(adSetRecords, kpiType);

                    // 计算AdSet的中间指标
                    const adSetMetrics = calculateMetrics(adSetRecords);

                    // 计算对比周期的 Spend
                    const adSetLastSpend = getComparisonSpend(
                        comparisonData,
                        config,
                        r => r.campaign_name === campaignName && r.adset_name === adSetName
                    );

                    // 计算对比周期的 KPI 值
                    const adSetLastValue = getComparisonKPI(
                        comparisonData,
                        config,
                        r => r.campaign_name === campaignName && r.adset_name === adSetName,
                        kpiType
                    );

                    // 计算对比周期的中间指标
                    const adSetLastMetrics = getComparisonMetrics(
                        comparisonData,
                        config,
                        r => r.campaign_name === campaignName && r.adset_name === adSetName
                    );

                    // 判断是否低于平均 KPI
                    const isBelowAvg = kpiType === 'ROI'
                        ? adSetKPI < avgKPI
                        : adSetKPI > avgKPI;

                    if (isBelowAvg) {
                        adSets.push({
                            id: `adset-${adSetName}-${businessLineId}`,
                            adSetName,
                            campaignName,
                            businessLine,
                            businessLineId,
                            spend: adSetSpend,
                            avgSpend: avgBusinessLineSpend,
                            lastSpend: adSetLastSpend,
                            kpiType,
                            targetValue,
                            actualValue: adSetKPI,
                            gapPercentage: calculateGapPercentage(adSetKPI, targetValue),
                            avgValue: avgKPI,
                            lastValue: adSetLastValue,
                            vsAvgPercentage: calculateGapPercentage(adSetKPI, avgKPI),
                            // 中间指标
                            metrics: adSetMetrics,
                            avgMetrics: avgMetrics,
                            lastMetrics: adSetLastMetrics,
                        });
                    }

                    // 注意：Ad 的处理逻辑已移到下方独立处理，不再依赖 AdSet 的筛选结果
                });
            }
        });

        // ============ 独立处理 Ad 列表（解耦自 Campaign/AdSet）============
        // Ad 的筛选只与日期范围相关，不依赖 Campaign 象限和 AdSet 的 KPI 判断
        // 中间指标与 Campaign 的中间指标保持一致（使用业务线级别的 avgMetrics）

        // 按 Ad 分组（直接从业务线匹配数据遍历，不经过 Campaign/AdSet 过滤）
        const adGroupMap = new Map<string, { campaignName: string; adSetName: string; records: RawAdRecord[] }>();
        matchingData.forEach(r => {
            const adKey = `${r.campaign_name}|${r.adset_name}|${r.ad_name}`;
            if (!adGroupMap.has(adKey)) {
                adGroupMap.set(adKey, {
                    campaignName: r.campaign_name,
                    adSetName: r.adset_name,
                    records: []
                });
            }
            adGroupMap.get(adKey)!.records.push(r);
        });

        // 遍历每个 Ad
        adGroupMap.forEach(({ campaignName, adSetName, records: adRecords }, adKey) => {
            const adName = adRecords[0].ad_name;
            const adSpend = adRecords.reduce((sum, r) => sum + r.spend, 0);
            const adKPI = calculateKPI(adRecords, kpiType);

            // 计算 Ad 的中间指标
            const adMetrics = calculateMetrics(adRecords);

            // 计算对比周期的 Spend
            const adLastSpend = getComparisonSpend(
                comparisonData,
                config,
                r => r.campaign_name === campaignName && r.adset_name === adSetName && r.ad_name === adName
            );

            // 计算对比周期的 KPI 值
            const adLastValue = getComparisonKPI(
                comparisonData,
                config,
                r => r.campaign_name === campaignName && r.adset_name === adSetName && r.ad_name === adName,
                kpiType
            );

            // 计算对比周期的中间指标
            const adLastMetrics = getComparisonMetrics(
                comparisonData,
                config,
                r => r.campaign_name === campaignName && r.adset_name === adSetName && r.ad_name === adName
            );

            // 判断是否低于平均 KPI（使用业务线级别的平均值）
            const isAdBelowAvg = kpiType === 'ROI'
                ? adKPI < avgKPI
                : adKPI > avgKPI;

            if (isAdBelowAvg) {
                // 计算 Ad 诊断所需的上下文
                const adDates = adRecords
                    .filter(r => r.spend > 0)
                    .map(r => new Date(r.date))
                    .sort((a, b) => a.getTime() - b.getTime());
                const firstSpendDate = adDates.length > 0 ? adDates[0] : new Date();
                const activeDays = Math.ceil((new Date().getTime() - firstSpendDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

                // 计算 3秒播放率
                const totalVideoPlays3s = adRecords.reduce((sum, r) => sum + (r.video_plays_3s || 0), 0);
                const totalImpressions = adRecords.reduce((sum, r) => sum + r.impressions, 0);
                const videoPlayRate3s = totalImpressions > 0 ? totalVideoPlays3s / totalImpressions : undefined;

                // 计算当前 Ad 的 CTR (小数格式)
                const adCtr = totalImpressions > 0 ? adRecords.reduce((sum, r) => sum + r.link_clicks, 0) / totalImpressions : 0;

                // 计算当前 Ad 的 Frequency
                const totalReach = adRecords.reduce((sum, r) => sum + (r.reach || 0), 0);
                const adFrequency = totalReach > 0 ? totalImpressions / totalReach : 0;

                // 构建诊断上下文 - 使用全局 Ad 平均值 (不受业务线限制)
                const diagContext: AdDiagnosticContext = {
                    spend: adSpend,
                    roi: kpiType === 'ROI' ? adKPI : 0,
                    avgRoi: globalAdAvgRoi,  // 使用全局 Ad 平均 ROI
                    ctr: adCtr,              // 使用直接计算的 CTR (小数格式)
                    avgCtr: globalAdAvgCtr,  // 使用全局 Ad 平均 CTR
                    frequency: adFrequency,  // 使用直接计算的 Frequency
                    activeDays,
                    videoPlayRate3s,
                    avgVideoPlayRate3s: globalAdAvgVideoPlayRate3s  // 使用全局 Ad 平均 3秒播放率
                };

                // 执行诊断
                const diagResult = diagnoseAd(diagContext);
                let diagnosticDetails: import('./campaignDiagnostics').DiagnosticDetail[] | undefined;
                if (diagResult) {
                    const diagDetail = convertToAdDiagnosticDetail(diagResult, diagContext);
                    diagnosticDetails = [diagDetail];
                }

                ads.push({
                    id: `ad-${adName}-${businessLineId}`,
                    adName,
                    adSetName,
                    campaignName,
                    businessLine,
                    businessLineId,
                    spend: adSpend,
                    avgSpend: avgBusinessLineSpend,
                    lastSpend: adLastSpend,
                    kpiType,
                    targetValue,
                    actualValue: adKPI,
                    gapPercentage: calculateGapPercentage(adKPI, targetValue),
                    avgValue: avgKPI,
                    lastValue: adLastValue,
                    vsAvgPercentage: calculateGapPercentage(adKPI, avgKPI),
                    // 中间指标 - 与 Campaign 保持一致，使用业务线级别的 avgMetrics
                    metrics: adMetrics,
                    avgMetrics: avgMetrics,
                    lastMetrics: adLastMetrics,
                    // Ad 诊断新增字段
                    diagnosticDetails,
                    activeDays,
                    videoPlayRate3s,
                });
            }
        });
    });

    // 按差距百分比排序（问题最严重的排在前面）
    campaigns.sort((a, b) => {
        if (a.kpiType === 'ROI') return a.gapPercentage - b.gapPercentage;
        return b.gapPercentage - a.gapPercentage;
    });
    adSets.sort((a, b) => {
        if (a.kpiType === 'ROI') return a.gapPercentage - b.gapPercentage;
        return b.gapPercentage - a.gapPercentage;
    });
    ads.sort((a, b) => {
        if (a.kpiType === 'ROI') return a.gapPercentage - b.gapPercentage;
        return b.gapPercentage - a.gapPercentage;
    });

    return { campaigns, adSets, ads };
};

// 导出为 CSV
export const exportActionItemsToCSV = (result: ActionItemsResult): string => {
    const lines: string[] = [];

    // Campaign Sheet
    lines.push('=== 需要调整的 Campaign ===');
    lines.push('Campaign Name,业务线,Spend,KPI,Target,Actual,Gap%,Priority');
    result.campaigns.forEach(c => {
        const priorityText = c.priority || '-';
        lines.push(`"${c.campaignName}","${c.businessLine}",${c.spend.toFixed(2)},${c.kpiType},${c.targetValue},${c.actualValue.toFixed(2)},${c.gapPercentage.toFixed(1)}%,${priorityText}`);
    });

    lines.push('');

    // AdSet Sheet
    lines.push('=== 需要调整的人群 ===');
    lines.push('AdSet Name,Campaign,业务线,KPI,Target,Actual,Gap%,Avg,vs Avg%');
    result.adSets.forEach(a => {
        lines.push(`"${a.adSetName}","${a.campaignName}","${a.businessLine}",${a.kpiType},${a.targetValue},${a.actualValue.toFixed(2)},${a.gapPercentage.toFixed(1)}%,${a.avgValue.toFixed(2)},${a.vsAvgPercentage.toFixed(1)}%`);
    });

    lines.push('');

    // Ad Sheet
    lines.push('=== 需要调整的素材 ===');
    lines.push('Ad Name,AdSet,Campaign,业务线,KPI,Target,Actual,Gap%,Avg,vs Avg%');
    result.ads.forEach(a => {
        lines.push(`"${a.adName}","${a.adSetName}","${a.campaignName}","${a.businessLine}",${a.kpiType},${a.targetValue},${a.actualValue.toFixed(2)},${a.gapPercentage.toFixed(1)}%,${a.avgValue.toFixed(2)},${a.vsAvgPercentage.toFixed(1)}%`);
    });

    return lines.join('\n');
};

// ============ New Audience Action Items ============

// New Audience Action Item 类型定义
export interface NewAudienceActionAdSet {
    id: string;
    adSetName: string;
    campaignName: string;
    businessLine: string;
    businessLineId: string;
    durationDays: number;
    spend: number;
    avgSpend: number;
    lastSpend?: number;
    kpiType: 'ROI' | 'CPC' | 'CPM';
    targetValue: number;
    avgValue: number;
    actualValue: number;
    lastValue?: number;
    vsAvgPercentage: number;

    // 中间指标
    metrics?: IntermediateMetrics;
    avgMetrics?: IntermediateMetrics;
    lastMetrics?: IntermediateMetrics;
}

export interface NewAudienceActionAd {
    id: string;
    adName: string;
    adSetName: string;
    campaignName: string;
    businessLine: string;
    businessLineId: string;
    durationDays: number;
    spend: number;
    avgSpend: number;
    lastSpend?: number;
    kpiType: 'ROI' | 'CPC' | 'CPM';
    targetValue: number;
    avgValue: number;
    actualValue: number;
    lastValue?: number;
    vsAvgPercentage: number;

    // 中间指标
    metrics?: IntermediateMetrics;
    avgMetrics?: IntermediateMetrics;
    lastMetrics?: IntermediateMetrics;
}

export interface NewAudienceActionItemsResult {
    adSets: NewAudienceActionAdSet[];
    ads: NewAudienceActionAd[];
}

// 生成 New Audience Action Items
export const generateNewAudienceActionItems = (
    data: RawAdRecord[],
    configs: AdConfiguration[],
    businessLineThresholds: Map<string, QuadrantThresholds>,
    endDate: string,
    comparisonData?: RawAdRecord[]
): NewAudienceActionItemsResult => {
    const adSets: NewAudienceActionAdSet[] = [];
    const ads: NewAudienceActionAd[] = [];

    const endDateObj = new Date(endDate);

    // 遍历每个业务线配置
    configs.forEach(config => {
        const kpiType = config.targetType;
        const businessLine = config.name;
        const businessLineId = config.id;

        // 获取该业务线的阈值（从 Business Line 页面传递过来的）
        const thresholds = businessLineThresholds.get(businessLineId);
        if (!thresholds) {
            console.warn(`No thresholds found for business line: ${businessLine}`);
            return;
        }

        const targetValue = thresholds.kpiThreshold; // 使用调整后的 KPI 阈值

        // 筛选匹配该业务线的数据
        const matchingData = data.filter(r => matchesConfig(r, config));
        if (matchingData.length === 0) return;

        // 计算该业务线的平均 KPI
        const avgKPI = calculateKPI(matchingData, kpiType);

        // 计算该业务线的平均中间指标
        const avgMetrics = calculateMetrics(matchingData);

        // 计算该业务线的平均 Spend（按 AdSet 计算）
        const adSetSpends: number[] = [];
        const tempAdSetMap = new Map<string, number>();
        matchingData.forEach(r => {
            const current = tempAdSetMap.get(r.adset_name) || 0;
            tempAdSetMap.set(r.adset_name, current + r.spend);
        });
        tempAdSetMap.forEach(spend => adSetSpends.push(spend));
        const avgBusinessLineSpend = adSetSpends.length > 0
            ? adSetSpends.reduce((sum, s) => sum + s, 0) / adSetSpends.length
            : 0;

        // 按 AdSet 分组
        const adSetMap = new Map<string, { campaignName: string; records: RawAdRecord[] }>();
        matchingData.forEach(r => {
            if (!adSetMap.has(r.adset_name)) {
                adSetMap.set(r.adset_name, { campaignName: r.campaign_name, records: [] });
            }
            adSetMap.get(r.adset_name)!.records.push(r);
        });

        // 遍历每个 AdSet
        adSetMap.forEach(({ campaignName, records: adSetRecords }, adSetName) => {
            // 计算 AdSet 首次投放日期和投放时长
            const adSetDates = adSetRecords
                .filter(r => r.spend > 0)
                .map(r => new Date(r.date))
                .sort((a, b) => a.getTime() - b.getTime());

            if (adSetDates.length === 0) return;

            const firstSpendDate = adSetDates[0];
            const durationDays = Math.ceil((endDateObj.getTime() - firstSpendDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

            // 只处理投放时长 < 7 天的 AdSet
            if (durationDays >= 7) return;

            const adSetSpend = adSetRecords.reduce((sum, r) => sum + r.spend, 0);
            const adSetKPI = calculateKPI(adSetRecords, kpiType);

            // 计算AdSet的中间指标
            const adSetMetrics = calculateMetrics(adSetRecords);

            // 计算对比周期的 Spend
            const adSetLastSpend = getComparisonSpend(
                comparisonData,
                config,
                r => r.adset_name === adSetName
            );

            // 计算对比周期的 KPI 值
            const adSetLastValue = getComparisonKPI(
                comparisonData,
                config,
                r => r.adset_name === adSetName,
                kpiType
            );

            // 计算对比周期的中间指标
            const adSetLastMetrics = getComparisonMetrics(
                comparisonData,
                config,
                r => r.adset_name === adSetName
            );

            // 判断是否低于平均 KPI
            const isBelowAvg = kpiType === 'ROI'
                ? adSetKPI < avgKPI
                : adSetKPI > avgKPI;

            if (isBelowAvg) {
                adSets.push({
                    id: `na-adset-${adSetName}-${businessLineId}`,
                    adSetName,
                    campaignName,
                    businessLine,
                    businessLineId,
                    durationDays,
                    spend: adSetSpend,
                    avgSpend: avgBusinessLineSpend,
                    lastSpend: adSetLastSpend,
                    kpiType,
                    targetValue,
                    avgValue: avgKPI,
                    actualValue: adSetKPI,
                    lastValue: adSetLastValue,
                    vsAvgPercentage: calculateGapPercentage(adSetKPI, avgKPI),
                    // 中间指标
                    metrics: adSetMetrics,
                    avgMetrics: avgMetrics,
                    lastMetrics: adSetLastMetrics,
                });
            }

            // 处理该 AdSet 下的 Ad（所有 Ad 都算作新受众）
            const adMap = new Map<string, RawAdRecord[]>();
            adSetRecords.forEach(r => {
                if (!adMap.has(r.ad_name)) adMap.set(r.ad_name, []);
                adMap.get(r.ad_name)!.push(r);
            });

            adMap.forEach((adRecords, adName) => {
                const adSpend = adRecords.reduce((sum, r) => sum + r.spend, 0);
                const adKPI = calculateKPI(adRecords, kpiType);

                // 计算Ad的中间指标
                const adMetrics = calculateMetrics(adRecords);

                // 计算对比周期的 Spend
                const adLastSpend = getComparisonSpend(
                    comparisonData,
                    config,
                    r => r.adset_name === adSetName && r.ad_name === adName
                );

                // 计算对比周期的 KPI 值
                const adLastValue = getComparisonKPI(
                    comparisonData,
                    config,
                    r => r.adset_name === adSetName && r.ad_name === adName,
                    kpiType
                );

                // 计算对比周期的中间指标
                const adLastMetrics = getComparisonMetrics(
                    comparisonData,
                    config,
                    r => r.adset_name === adSetName && r.ad_name === adName
                );

                // 判断是否低于平均 KPI
                const isAdBelowAvg = kpiType === 'ROI'
                    ? adKPI < avgKPI
                    : adKPI > avgKPI;

                if (isAdBelowAvg) {
                    ads.push({
                        id: `na-ad-${adName}-${businessLineId}`,
                        adName,
                        adSetName,
                        campaignName,
                        businessLine,
                        businessLineId,
                        durationDays,
                        spend: adSpend,
                        avgSpend: avgBusinessLineSpend,
                        lastSpend: adLastSpend,
                        kpiType,
                        targetValue,
                        avgValue: avgKPI,
                        actualValue: adKPI,
                        lastValue: adLastValue,
                        vsAvgPercentage: calculateGapPercentage(adKPI, avgKPI),
                        // 中间指标
                        metrics: adMetrics,
                        avgMetrics: avgMetrics,
                        lastMetrics: adLastMetrics,
                    });
                }
            });
        });
    });

    // 按差距百分比排序
    adSets.sort((a, b) => {
        if (a.kpiType === 'ROI') return a.vsAvgPercentage - b.vsAvgPercentage;
        return b.vsAvgPercentage - a.vsAvgPercentage;
    });
    ads.sort((a, b) => {
        if (a.kpiType === 'ROI') return a.vsAvgPercentage - b.vsAvgPercentage;
        return b.vsAvgPercentage - a.vsAvgPercentage;
    });

    return { adSets, ads };
};

// 导出 New Audience Action Items 为 CSV
export const exportNewAudienceActionItemsToCSV = (result: NewAudienceActionItemsResult): string => {
    const lines: string[] = [];

    // AdSet Sheet
    lines.push('=== 需要调整的人群（新受众）===');
    lines.push('AdSet Name,Campaign,业务线,投放时长,KPI,Avg,Actual,vs Avg%');
    result.adSets.forEach(a => {
        lines.push(`"${a.adSetName}","${a.campaignName}","${a.businessLine}",${a.durationDays}天,${a.kpiType},${a.avgValue.toFixed(2)},${a.actualValue.toFixed(2)},${a.vsAvgPercentage.toFixed(1)}%`);
    });

    lines.push('');

    // Ad Sheet
    lines.push('=== 需要调整的素材（新受众）===');
    lines.push('Ad Name,AdSet,Campaign,业务线,投放时长,KPI,Avg,Actual,vs Avg%');
    result.ads.forEach(a => {
        lines.push(`"${a.adName}","${a.adSetName}","${a.campaignName}","${a.businessLine}",${a.durationDays}天,${a.kpiType},${a.avgValue.toFixed(2)},${a.actualValue.toFixed(2)},${a.vsAvgPercentage.toFixed(1)}%`);
    });

    return lines.join('\n');
};

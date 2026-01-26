// AI 智能诊断 - 数据统计工具
// 用于将 Action Items 数据转换为 AI 可分析的摘要格式

import { ActionItemsResult, ActionCampaign, ActionAd } from './actionItemsUtils';
import { diagnoseAd, AdDiagnosticContext, AdDiagnosticResult } from './adDiagnostics';

/**
 * 诊断详情（简化版，用于AI分析）
 */
export interface DiagnosticDetail {
    campaignName: string;
    priority: 'P0' | 'P1' | 'P2' | number | null;  // 🆕 支持 P2 和数字
    scenario: string;
    diagnosis: string;
    action: string;
}

/**
 * 数据摘要（供 AI 分析）
 */
export interface DataSummary {
    // 基础统计
    totalCampaigns: number;
    totalSpend: number;
    p0Count: number;
    p1Count: number;
    p2Count: number;  // 🆕 新增 P2 统计

    // Campaign 按优先级分类
    campaignsByPriority: {
        p0Campaigns: string[];  // P0 Campaign 名称列表
        p1Campaigns: string[];  // P1 Campaign 名称列表
        p2Campaigns: string[];  // P2 Campaign 名称列表
    };

    // 素材问题分类（从 Ad 诊断中提取）
    materialIssues: {
        category: string;      // 素材问题类型
        count: number;         // 数量
        percentage: number;    // 占比
        suggestions: string[]; // 建议
        adNames: string[];     // 🆕 Ad 名称列表
    }[];

    // 问题分类统计（保留兼容）
    problemCategories: {
        category: string;
        count: number;
        percentage: number;
        examples: string[];
    }[];

    // Action 摘要
    topActions: {
        priority: 'P0' | 'P1' | 'P2';
        action: string;
        count: number;
    }[];

    // 诊断详情
    diagnosticDetails: DiagnosticDetail[];
    // 🆕 聚合后的 Ad 摘要
    aggregatedAds: AggregatedAdResult[];
}

/**
 * 聚合后的 Ad 摘要结果
 */
export interface AggregatedAdResult {
    adName: string;
    kpiType: 'ROI' | 'CPC' | 'CPM';

    // 数据
    spend: number;
    impressions: number;
    clicks: number;
    purchases: number;
    revenue: number;

    // KPI
    kpiValue: number;       // 实际值
    kpiBenchmark: number;   // 基准值

    // 中间指标
    ctr: number;
    cvr: number;
    frequency: number;

    // 诊断结果
    decisionCategory: '扩量投放' | '缩量或者关停' | '保持投放和观察' | '观察，积累消耗';
    suggestion: string;
    originalScenarios: string[]; // 原始的多个场景（如果有不同）
}

/**
 * 从诊断场景中提取问题类别
 */
function extractProblemCategory(scenario: string, diagnosis: string): string {
    const scenarioLower = scenario.toLowerCase();
    const diagnosisLower = diagnosis.toLowerCase();

    // CPC 相关
    if (scenarioLower.includes('cpc') || diagnosisLower.includes('点击成本') || diagnosisLower.includes('cpc')) {
        return '竞价问题';
    }

    // CTR / 素材相关
    if (scenarioLower.includes('ctr') || diagnosisLower.includes('点击率') ||
        diagnosisLower.includes('素材') || diagnosisLower.includes('创意')) {
        return '素材问题';
    }

    // CVR / 落地页相关
    if (scenarioLower.includes('cvr') || diagnosisLower.includes('转化率') ||
        diagnosisLower.includes('落地页') || diagnosisLower.includes('着陆页')) {
        return '落地页问题';
    }

    // 频次 / 受众饱和
    if (scenarioLower.includes('频次') || diagnosisLower.includes('frequency') ||
        diagnosisLower.includes('饱和') || diagnosisLower.includes('疲劳')) {
        return '受众饱和';
    }

    // 预算相关
    if (scenarioLower.includes('预算') || diagnosisLower.includes('spend') ||
        diagnosisLower.includes('花费') || diagnosisLower.includes('budget')) {
        return '预算问题';
    }

    // CPM 相关
    if (scenarioLower.includes('cpm') || diagnosisLower.includes('千次展示')) {
        return 'CPM异常';
    }

    // ROI 相关
    if (scenarioLower.includes('roi') || diagnosisLower.includes('投资回报')) {
        return 'ROI异常';
    }

    return '其他问题';
}

/**
 * 将诊断场景映射到 4 大类决策
 */
function mapScenarioToDecision(scenario: string, subScenario?: string): '扩量投放' | '缩量或者关停' | '保持投放和观察' | '观察，积累消耗' {
    const scenarioLower = scenario.toLowerCase();

    if (scenarioLower.includes('投放时间') || scenarioLower.includes('时间过短')) {
        return '观察，积累消耗';
    }

    if (scenarioLower.includes('僵尸') ||
        scenarioLower.includes('开头流失') ||
        scenarioLower.includes('视觉不突出') ||
        scenarioLower.includes('点击党') ||
        scenarioLower.includes('低客单') ||
        scenarioLower.includes('素材疲劳')) {
        return '缩量或者关停';
    }

    if (scenarioLower.includes('爆款')) {
        if (subScenario?.includes('衰退')) {
            return '保持投放和观察';
        }
        return '扩量投放';
    }

    if (scenarioLower.includes('潜力') || scenarioLower.includes('观察')) {
        return '保持投放和观察';
    }

    // 默认
    return '保持投放和观察';
}

/**
 * 从Ad诊断中提取素材问题类别
 */
function extractMaterialIssue(scenario: string, diagnosis: string): string | null {
    const scenarioLower = scenario.toLowerCase();
    const diagnosisLower = diagnosis.toLowerCase();

    // 投放时间过短
    if (scenarioLower.includes('投放时间') || scenarioLower.includes('时间过短')) {
        return '投放时间过短';
    }

    // 僵尸素材
    if (scenarioLower.includes('僵尸') || diagnosisLower.includes('僵尸')) {
        return '僵尸素材';
    }

    // 视觉不突出
    if (scenarioLower.includes('视觉') || diagnosisLower.includes('视觉')) {
        return '视觉不突出';
    }

    // 点击党
    if (scenarioLower.includes('点击') && (scenarioLower.includes('党') || diagnosisLower.includes('点击党'))) {
        return '点击党';
    }

    // 低客单
    if (scenarioLower.includes('低客单') || scenarioLower.includes('aov')) {
        return '低客单';
    }

    // 素材疲劳
    if (scenarioLower.includes('疲劳') || diagnosisLower.includes('疲劳')) {
        return '素材疲劳';
    }

    // 爆款素材
    if (scenarioLower.includes('爆款') || scenarioLower.includes('top')) {
        return '爆款素材';
    }

    return null;
}

/**
 * 简化 Action 描述
 */
function simplifyAction(action: string): string {
    if (action.includes('下调') && action.includes('预算')) {
        return '下调预算';
    }
    if (action.includes('暂停')) {
        return '暂停广告';
    }
    if (action.includes('优化') && action.includes('素材')) {
        return '优化素材';
    }
    if (action.includes('检查') && action.includes('落地页')) {
        return '检查落地页';
    }
    if (action.includes('调整') && action.includes('出价')) {
        return '调整出价';
    }
    if (action.includes('扩大') && action.includes('受众')) {
        return '扩大受众';
    }
    if (action.includes('更换') && action.includes('素材')) {
        return '更换素材';
    }
    if (action.includes('核查')) {
        return '人工核查';
    }

    // 默认返回前25个字符
    return action.length > 25 ? action.substring(0, 25) + '...' : action;
}

/**
 * 标准化优先级为字符串
 */
function normalizePriority(priority: any): 'P0' | 'P1' | 'P2' | null {
    if (priority === 0 || priority === 'P0') return 'P0';
    if (priority === 1 || priority === 'P1') return 'P1';
    if (priority === 2 || priority === 'P2') return 'P2';
    return null;
}

/**
 * 从 Action Items 数据中生成数据摘要
 */
export function generateDataSummary(
    result: ActionItemsResult,
    diagnosticsMap: Map<string, DiagnosticDetail[]>,  // campaignId -> diagnosticDetails
    adDiagnosticsMap?: Map<string, DiagnosticDetail[]>  // 🆕 adId -> diagnosticDetails (可选)
): DataSummary {
    const campaigns = result.campaigns;

    // 基础统计
    const totalCampaigns = campaigns.length;
    const totalSpend = campaigns.reduce((sum, c) => sum + c.spend, 0);

    const p0Count = campaigns.filter(c => normalizePriority(c.priority) === 'P0').length;
    const p1Count = campaigns.filter(c => normalizePriority(c.priority) === 'P1').length;
    const p2Count = campaigns.filter(c => normalizePriority(c.priority) === 'P2').length;

    // 🆕 Campaign 按优先级分类
    const campaignsByPriority = {
        p0Campaigns: campaigns
            .filter(c => normalizePriority(c.priority) === 'P0')
            .map(c => c.campaignName)
            .slice(0, 10),  // 最多显示10个
        p1Campaigns: campaigns
            .filter(c => normalizePriority(c.priority) === 'P1')
            .map(c => c.campaignName)
            .slice(0, 10),
        p2Campaigns: campaigns
            .filter(c => normalizePriority(c.priority) === 'P2')
            .map(c => c.campaignName)
            .slice(0, 10)
    };

    // 🆕 素材问题分类（从 Ad 诊断中提取）
    const materialIssueMap = new Map<string, { count: number; suggestions: Set<string>; adNames: Set<string> }>();
    let totalAdIssues = 0;

    if (adDiagnosticsMap) {
        adDiagnosticsMap.forEach((diagResults) => {
            diagResults.forEach(diag => {
                const issueCategory = extractMaterialIssue(diag.scenario, diag.diagnosis);
                if (issueCategory) {
                    if (!materialIssueMap.has(issueCategory)) {
                        materialIssueMap.set(issueCategory, { count: 0, suggestions: new Set(), adNames: new Set() });
                    }
                    const data = materialIssueMap.get(issueCategory)!;
                    data.count++;
                    totalAdIssues++;

                    // 🆕 收集 Ad 名称（注意：diag.campaignName 在 Ad 诊断中存储的是 Ad 名称）
                    data.adNames.add(diag.campaignName);

                    // 提取建议的第一句话
                    const actionLines = diag.action.split('\n').filter(line => line.trim());
                    if (actionLines.length > 0 && data.suggestions.size < 3) {
                        data.suggestions.add(actionLines[0].substring(0, 100));
                    }
                }
            });
        });
    }

    const materialIssues = Array.from(materialIssueMap.entries())
        .map(([category, data]) => ({
            category,
            count: data.count,
            percentage: totalAdIssues > 0 ? (data.count / totalAdIssues) * 100 : 0,
            suggestions: Array.from(data.suggestions),
            adNames: Array.from(data.adNames)  // 🆕 添加 Ad 名称列表
        }))
        .sort((a, b) => b.count - a.count);

    // 问题分类统计（保留兼容）
    const problemMap = new Map<string, { count: number; examples: string[] }>();

    diagnosticsMap.forEach((diagResults) => {
        diagResults.forEach(diag => {
            const category = extractProblemCategory(diag.scenario, diag.diagnosis);

            if (!problemMap.has(category)) {
                problemMap.set(category, { count: 0, examples: [] });
            }

            const data = problemMap.get(category)!;
            data.count++;
            if (data.examples.length < 3) {
                data.examples.push(diag.diagnosis);
            }
        });
    });

    // 计算问题总数
    let totalProblems = 0;
    problemMap.forEach(data => totalProblems += data.count);

    const problemCategories = Array.from(problemMap.entries())
        .map(([category, data]) => ({
            category,
            count: data.count,
            percentage: totalProblems > 0 ? (data.count / totalProblems) * 100 : 0,
            examples: data.examples
        }))
        .sort((a, b) => b.count - a.count);

    // Action 摘要
    const actionMap = new Map<string, { priority: 'P0' | 'P1' | 'P2'; count: number }>();

    diagnosticsMap.forEach((diagResults, campaignId) => {
        const campaign = campaigns.find(c => c.id === campaignId);
        const priority = normalizePriority(campaign?.priority);

        if (!priority) return;

        diagResults.forEach(diag => {
            const actionKey = simplifyAction(diag.action);

            if (!actionMap.has(actionKey)) {
                actionMap.set(actionKey, { priority, count: 0 });
            }

            const existing = actionMap.get(actionKey)!;
            existing.count++;
            // 优先级：P0 > P1 > P2
            if (priority === 'P0' || (priority === 'P1' && existing.priority === 'P2')) {
                existing.priority = priority;
            }
        });
    });

    const topActions = Array.from(actionMap.entries())
        .map(([action, data]) => ({
            priority: data.priority,
            action,
            count: data.count
        }))
        .sort((a, b) => {
            if (a.priority === 'P0' && b.priority !== 'P0') return -1;
            if (a.priority !== 'P0' && b.priority === 'P0') return 1;
            if (a.priority === 'P1' && b.priority === 'P2') return -1;
            if (a.priority === 'P2' && b.priority === 'P1') return 1;
            return b.count - a.count;
        })
        .slice(0, 5);

    // 诊断详情（扁平化）
    const diagnosticDetails: DiagnosticDetail[] = [];
    diagnosticsMap.forEach((diagResults, campaignId) => {
        const campaign = campaigns.find(c => c.id === campaignId);

        diagResults.forEach(diag => {
            diagnosticDetails.push({
                campaignName: campaign?.campaignName || 'Unknown',
                priority: normalizePriority(campaign?.priority),
                scenario: diag.scenario,
                diagnosis: diag.diagnosis,
                action: diag.action
            });
        });
    });

    return {
        totalCampaigns,
        totalSpend,
        p0Count,
        p1Count,
        p2Count,
        campaignsByPriority,
        materialIssues,
        problemCategories,
        topActions,
        diagnosticDetails,
        aggregatedAds: aggregateAndDiagnoseAds(result.ads) // 🆕 生成聚合摘要
    };
}

/**
 * 聚合 Ad 数据并重新诊断
 */
export function aggregateAndDiagnoseAds(ads: ActionAd[]): AggregatedAdResult[] {
    const adMap = new Map<string, {
        adName: string;
        spends: number[];
        impressions: number[];
        clicks: number[];
        purchases: number[];
        revenues: number[];
        reaches: number[];
        videoPlayRates: number[];
        activeDays: number[];

        // Benchmarks (collect per ad to calculate weighted avg)
        roiBenchmarks: { val: number; weight: number }[];
        ctrBenchmarks: { val: number; weight: number }[];
        cvrBenchmarks: { val: number; weight: number }[];
        freqBenchmarks: { val: number; weight: number }[];
        videoPlayRateBenchmarks: { val: number; weight: number }[];

        // Other info
        kpiTypes: ('ROI' | 'CPC' | 'CPM')[];
        targetValues: number[];

        // Context
        adsetBudgets: number[];
        activeAdsList: number[];
    }>();

    // 1. 聚合数据
    ads.forEach(ad => {
        if (!adMap.has(ad.adName)) {
            adMap.set(ad.adName, {
                adName: ad.adName,
                spends: [], impressions: [], clicks: [], purchases: [], revenues: [], reaches: [], videoPlayRates: [], activeDays: [],
                roiBenchmarks: [], ctrBenchmarks: [], cvrBenchmarks: [], freqBenchmarks: [], videoPlayRateBenchmarks: [],
                kpiTypes: [], targetValues: [], adsetBudgets: [], activeAdsList: []
            });
        }

        const entry = adMap.get(ad.adName)!;
        entry.spends.push(ad.spend);
        entry.impressions.push(ad.metrics?.impressions || 0);
        entry.clicks.push(ad.metrics?.clicks || 0);
        entry.purchases.push(ad.metrics?.purchases || 0);
        entry.revenues.push(ad.metrics?.purchase_value || 0);
        entry.reaches.push(ad.metrics?.reach || 0);
        entry.videoPlayRates.push(ad.videoPlayRate3s || 0);
        entry.activeDays.push(ad.activeDays || 0);
        entry.kpiTypes.push(ad.kpiType);
        entry.targetValues.push(ad.targetValue);

        // 尝试从 DiagnosticDetails 中提取 Benchmark
        // 如果没有 DiagnosticDetails，降级使用 Ad 上的 avgMetrics
        let roiBench = 0, ctrBench = 0, cvrBench = 0, freqBench = 0, videoBench = 0;

        if (ad.diagnosticDetails && ad.diagnosticDetails.length > 0) {
            const steps = ad.diagnosticDetails[0].steps;
            const contextStep = steps.find(s => s.stepNumber === 0);
            if (contextStep) {
                // 这里只能大致反推，因为 condition 里的 thresholdValue 是动态的
                // 更好的方式是扩展 AdDiagnosticContext 传递出来，但修改 ActionAd 结构影响较大
                // 我们暂时使用 avgMetric 作为 Benchmark 的近似值，它在 actionItemsUtils 中被作为 Benchmark 传入
            }
        }

        // 使用 ActionAd 上的 avgValue / avgMetrics
        roiBench = (ad.kpiType === 'ROI') ? ad.avgValue : 0;
        ctrBench = ad.avgMetrics?.ctr ? ad.avgMetrics.ctr / 100 : 0; // avgMetrics.ctr 是百分比 (0-100)
        cvrBench = ad.avgMetrics?.cvr ? ad.avgMetrics.cvr / 100 : 0; // avgMetrics.cvr 是百分比
        freqBench = ad.avgMetrics?.frequency || 0;

        // Video Benchmark 比较特殊，如果没有存储在 metrics 中，很难获取。
        // 暂时假设为 0 或忽略视频特定逻辑中的 Benchmark 依赖（会降级处理）

        const weight = ad.spend; //以此Ad的Spend作为权重
        entry.roiBenchmarks.push({ val: roiBench, weight });
        entry.ctrBenchmarks.push({ val: ctrBench, weight });
        entry.cvrBenchmarks.push({ val: cvrBench, weight });
        entry.freqBenchmarks.push({ val: freqBench, weight });

        // Adset Context Approximation
        // 我们没有保留 AdAdsetBudget，但可以大致估算
        // 这里只是为了诊断 Zombie，如果缺失影响不大
        entry.adsetBudgets.push(ad.spend * 2); // Dummy
        entry.activeAdsList.push(1); // Dummy
    });

    // 2. 计算与重诊断
    const results: AggregatedAdResult[] = [];

    // 计算全局平均 Ad Spend (用于 Zombie 判定)
    let globalTotalSpend = 0;
    let globalAdCount = 0;
    adMap.forEach(data => {
        globalTotalSpend += data.spends.reduce((a, b) => a + b, 0);
        globalAdCount += 1;
    });
    const globalAvgAdSpend = globalAdCount > 0 ? globalTotalSpend / globalAdCount : 0;

    adMap.forEach((data, adName) => {
        const totalSpend = data.spends.reduce((a, b) => a + b, 0);
        const totalImpressions = data.impressions.reduce((a, b) => a + b, 0);
        const totalClicks = data.clicks.reduce((a, b) => a + b, 0);
        const totalPurchases = data.purchases.reduce((a, b) => a + b, 0);
        const totalRevenue = data.revenues.reduce((a, b) => a + b, 0);
        const totalReach = data.reaches.reduce((a, b) => a + b, 0); // Reach 不能简单相加，但作为近似
        const maxActiveDays = Math.max(...data.activeDays);

        // 加权平均 Benchmark
        const calcWeightedAvg = (items: { val: number; weight: number }[]) => {
            const totalW = items.reduce((sum, i) => sum + i.weight, 0);
            if (totalW === 0) return items.length > 0 ? items[0].val : 0;
            return items.reduce((sum, i) => sum + i.val * i.weight, 0) / totalW;
        };

        const roiBenchmark = calcWeightedAvg(data.roiBenchmarks);
        const ctrBenchmark = calcWeightedAvg(data.ctrBenchmarks);
        const cvrBenchmark = calcWeightedAvg(data.cvrBenchmarks);
        const frequencyBenchmark = calcWeightedAvg(data.freqBenchmarks);

        // 计算实际 KPI
        const roi = totalSpend > 0 ? totalRevenue / totalSpend : 0;
        const ctr = totalImpressions > 0 ? totalClicks / totalImpressions : 0;
        const cvr = totalClicks > 0 ? totalPurchases / totalClicks : 0;
        const frequency = totalReach > 0 ? totalImpressions / totalReach : 0;

        // 视频 3s 播放率
        // data.videoPlayRates 是比率，如果不加权不准。应该还原 numPlays
        let totalVideoPlays = 0;
        data.videoPlayRates.forEach((rate, idx) => {
            totalVideoPlays += rate * data.impressions[idx];
        });
        const videoPlayRate3s = totalImpressions > 0 ? totalVideoPlays / totalImpressions : 0;

        const isVideo = adName.toLowerCase().includes('video'); // 简单判定

        // 构造诊断上下文
        const context: AdDiagnosticContext = {
            spend: totalSpend,
            activeDays: maxActiveDays,

            // 使用全局平均 Spend 作为 "AdsetBudget" (Expected Spend)
            // ActiveAds = 1, 所以 Threshold = globalAvgAdSpend * 0.5
            adsetBudget: globalAvgAdSpend,
            activeAds: 1,

            roi,
            ctr,
            cvr, // context 需要 0-1 小数? check adDiagnostics
            // adDiagnostics: calculates cvr by conversions/clicks. It expects pure ratio.
            // But verify: checkClickParty: cvr < cvrBenchmark.
            // In actionItemsUtils, cvr is *100. And benchmark is from avgMetrics * 100?
            // Wait. actionItemsUtils line 152: cvr: (purchases/clicks)*100.
            // So avgMetrics.cvr IS A PERCENTAGE (0-100).
            // My calcWeightedAvg returns PERCENTAGE.
            // My `cvr` const above (totalPurchases/totalClicks) is RATIO (0-1).
            // I need to be consistent.

            frequency,

            roiBenchmark,
            ctrBenchmark: ctrBenchmark, // is this % or ratio?
            cvrBenchmark: cvrBenchmark, // is this % or ratio?
            frequencyBenchmark,

            isVideo,
            videoPlayRate3s,
            videoPlayRate3sBenchmark: 0.3 // Default/Mock since we lost it
        };

        // 修正 Context 中的 Benchmark 单位
        // actionItemsUtils 中 avgMetrics 存储的是 0-100 的值
        // 但 diagnoseAd 内部计算比较时，需要看它怎么用。
        // checkClickParty: if (ctr > ctrBenchmark)
        // ActionAd passing context:
        // ctr: adCtr (ratio 0-1)
        // ctrBenchmark: globalAdAvgCtr (ratio 0-1)
        // Wait, actionItemsUtils line 300: sum(ctr)/count.
        // adData.ctr at line 286: clicks/impressions (Ratio).
        // So globalAdAvgCtr is RATIO (0-1).
        // But avgMetrics.ctr (from calculateMetrics) is PERCENTAGE (0-100).
        // My code above for `ctrBench`: `ad.avgMetrics.ctr / 100`. So it is RATIO.
        // My code above for `ctr`: `totalClicks / totalImpressions`. So it is RATIO.
        // MATCHED.

        // CVR:
        // actionItemsUtils line 302: globalAdAvgCvr (Ratio, 0 or 1).
        // avgMetrics.cvr is PERCENTAGE.
        // My code above for `cvrBench`: `ad.avgMetrics.cvr / 100`. Ratio.
        // My code above for `cvr`: Ratio.
        // MATCHED.

        const diagResult = diagnoseAd(context);

        if (diagResult) {
            results.push({
                adName,
                kpiType: data.kpiTypes[0] || 'ROI',
                spend: totalSpend,
                impressions: totalImpressions,
                clicks: totalClicks,
                purchases: totalPurchases,
                revenue: totalRevenue,
                kpiValue: (data.kpiTypes[0] === 'CPC') ? (totalClicks > 0 ? totalSpend / totalClicks : 0) :
                    (data.kpiTypes[0] === 'CPM') ? (totalImpressions > 0 ? totalSpend / totalImpressions * 1000 : 0) :
                        roi, // Default ROI
                kpiBenchmark: roiBenchmark, // Use ROI benchmark as primary for now.
                // Note: if KPI is CPC, roiBenchmark is wrong.
                // We logic: if KPI type is CPC, use avgCPC?
                // data.targetValues[0] is the target.

                ctr,
                cvr,
                frequency,

                decisionCategory: mapScenarioToDecision(diagResult.scenario, diagResult.subScenario),
                suggestion: diagResult.action.split('\n')[0], // 第一行作为建议
                originalScenarios: [diagResult.scenario]
            });
        }
    });

    // 排序: 扩量 -> 观察 -> 关停
    // Map decision to sort weight
    const weightMap: Record<string, number> = {
        '扩量投放': 3,
        '保持投放和观察': 2,
        '观察，积累消耗': 1,
        '缩量或者关停': 0
    };

    return results.sort((a, b) => weightMap[b.decisionCategory] - weightMap[a.decisionCategory]);
}

/**
 * 简化版：直接从 campaigns 生成基础摘要（无需诊断详情）
 */
export function generateBasicSummary(campaigns: ActionCampaign[]): {
    totalCampaigns: number;
    totalSpend: number;
    p0Count: number;
    p1Count: number;
} {
    return {
        totalCampaigns: campaigns.length,
        totalSpend: campaigns.reduce((sum, c) => sum + c.spend, 0),
        p0Count: campaigns.filter(c => c.priority === 'P0').length,
        p1Count: campaigns.filter(c => c.priority === 'P1').length
    };
}

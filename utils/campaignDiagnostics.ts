import { AggregatedMetrics } from '../types';
import { CampaignBenchmarks } from './benchmarkCalculator';

// 趋势状态类型
export type TrendStatus = 'improving' | 'declining' | 'stable';

// 趋势信息接口
export interface TrendInfo {
    l3dROI: number;              // 最近3天ROI
    l7dROI: number;              // 最近7天ROI
    benchmarkROI: number;        // Benchmark ROI
    trend: TrendStatus;          // 趋势状态
    isRecoveryCase2: boolean;    // 是否为回暖情况2（ROI已超过Benchmark）
    shouldShowNormalAction: boolean;  // 是否显示正常Action（非回暖情况2时为true）
}

// 诊断步骤接口
export interface DiagnosticStep {
    stepNumber: number;
    stepName: string;
    icon?: string;
    content: {
        condition?: string;         // 条件表达式
        actualValue?: number;       // 实际值
        thresholdValue?: number;    // 阈值
        formula?: string;           // 计算公式
        calculation?: string;       // 计算过程
        result?: boolean;           // 判定结果
        diagnosis?: string;         // 诊断结论
        description?: string;       // 详细描述
        actions?: string[];         // 建议列表
        metric?: string;            // 指标名称
        // V2 新增：趋势相关字段
        l3dValue?: number;          // L3D ROI值
        l7dValue?: number;          // L7D ROI值
        trend?: TrendStatus;        // 趋势状态
        trendIcon?: string;         // 趋势图标
        isRecoveryCase2?: boolean;  // 是否为回暖情况2
        recoveryMessage?: string;   // 回暖情况2的特殊提示
        // V2 新增：并行检测字段
        multiIndicators?: boolean;  // 是否多指标
        multiConditions?: Array<{ name: string; actualValue: number; thresholdValue: number; result: boolean }>;
    };
}

// 子问题接口（用于Double Kill等多问题场景）
export interface SubProblem {
    name: string;
    metric: string;
    steps: DiagnosticStep[];
}

// 诊断结果接口
export interface DiagnosticResult {
    scenario: string;           // 异常场景名称
    diagnosis: string;          // 归因诊断
    action: string;            // Action建议
    priority: number;          // 优先级 (1=最高紧急, 2=重要, 3=一般)
    metrics?: {                // 相关指标快照
        [key: string]: number;
    };
    trendInfo?: TrendInfo;     // V2 新增：趋势信息
}

// 详细诊断结果接口（包含步骤信息）
export interface DiagnosticDetail extends DiagnosticResult {
    steps: DiagnosticStep[];
    subProblems?: SubProblem[];
}

/**
 * 计算趋势状态
 * @param l3dROI - 最近3天ROI
 * @param l7dROI - 最近7天ROI  
 * @param benchmarkROI - Benchmark ROI
 * @returns 趋势信息
 */
export const calculateTrend = (
    l3dROI: number,
    l7dROI: number,
    benchmarkROI: number
): TrendInfo => {
    let trend: TrendStatus;
    let isRecoveryCase2 = false;

    // 判断趋势
    if (l3dROI > l7dROI * 1.1) {
        // 回暖：L3D_ROI > L7D_ROI × 110%
        trend = 'improving';
        // 检查是否为回暖情况2：L3D_ROI >= Benchmark
        if (l3dROI >= benchmarkROI) {
            isRecoveryCase2 = true;
        }
    } else if (l3dROI < l7dROI * 0.9) {
        // 恶化：L3D_ROI < L7D_ROI × 90%
        trend = 'declining';
    } else {
        // 平稳：L7D_ROI × 90% <= L3D_ROI <= L7D_ROI × 110%
        trend = 'stable';
    }

    return {
        l3dROI,
        l7dROI,
        benchmarkROI,
        trend,
        isRecoveryCase2,
        shouldShowNormalAction: !isRecoveryCase2
    };
};

/**
 * 获取趋势图标
 */
export const getTrendIcon = (trend: TrendStatus): string => {
    switch (trend) {
        case 'improving': return '📈';
        case 'declining': return '📉';
        case 'stable': return '➡️';
    }
};

/**
 * 获取趋势中文名称
 */
export const getTrendLabel = (trend: TrendStatus): string => {
    switch (trend) {
        case 'improving': return '回暖';
        case 'declining': return '恶化';
        case 'stable': return '平稳';
    }
};

/**
 * 主诊断函数 - 按优先级顺序检查6大场景
 * @param metrics - Campaign的聚合指标
 * @param benchmarks - 所有Campaign的基准值
 * @returns 诊断结果，如果表现正常则返回null
 */
export const diagnoseCampaign = (
    metrics: AggregatedMetrics,
    benchmarks: CampaignBenchmarks
): DiagnosticResult | null => {

    // 按优先级顺序检查7大场景（V2：新增AOV）

    // 1. 检查CPA异常高（优先级最高）
    const cpaResult = checkHighCPA(metrics, benchmarks);
    if (cpaResult) return cpaResult;

    // 1.5. 检查AOV异常低（V2新增）
    const aovResult = checkLowAOV(metrics, benchmarks);
    if (aovResult) return aovResult;

    // 2. 检查CVR异常低
    const cvrResult = checkLowCVR(metrics, benchmarks);
    if (cvrResult) return cvrResult;

    // 3. 检查CPC异常高
    const cpcResult = checkHighCPC(metrics, benchmarks);
    if (cpcResult) return cpcResult;

    // 4. 检查CPATC异常高
    const cpatcResult = checkHighCPATC(metrics, benchmarks);
    if (cpatcResult) return cpatcResult;

    // 注意：场景5和场景6需要额外的上下文信息（adsetCount, activeDays等）
    // 这些场景需要在调用层面单独处理

    // 如果都不满足，返回null（表现正常）
    return null;
};

/**
 * 场景1：检查CPA异常高
 */
const checkHighCPA = (
    metrics: AggregatedMetrics,
    benchmarks: CampaignBenchmarks
): DiagnosticResult | null => {

    // 前提条件：Spend >= 1 × Avg CPA
    if (metrics.spend < benchmarks.avgCpa) return null;

    // 移除CPA前置判定，直接检查CPC和CVR

    const { cpc, cvr } = metrics;
    const { avgCpc, avgCvr } = benchmarks;

    // V2 方案B: 显示所有检查的指标（包含通过/不通过状态）
    const indicators: Array<{ name: string; diagnosis: string; action: string; metric: string; value: number; isAbnormal: boolean; direction: string }> = [];

    // 检查 CPC
    const cpcAbnormal = cpc > avgCpc * 1.1;
    indicators.push({
        name: 'CPC',
        diagnosis: '流量成本过高',
        action: '请排查CPC是否异常排查素材或竞价贵',
        metric: 'cpc',
        value: cpc,
        isAbnormal: cpcAbnormal,
        direction: '↑'
    });

    // 检查 CVR
    const cvrAbnormal = cvr < avgCvr * 0.9;
    indicators.push({
        name: 'CVR',
        diagnosis: '转化能力不足',
        action: '请排查CVR是否异常，排查漏斗流失点',
        metric: 'cvr',
        value: cvr,
        isAbnormal: cvrAbnormal,
        direction: '↓'
    });

    // 只取异常的问题来生成诊断和建议
    const abnormalIndicators = indicators.filter(i => i.isAbnormal);

    // 如果没有异常指标，返回 null
    if (abnormalIndicators.length === 0) return null;

    // 判断是否为 Double Kill
    const isDoubleKill = cpcAbnormal && cvrAbnormal;

    // 合并异常指标的诊断和建议
    let combinedDiagnosis: string;
    let combinedAction: string;
    let priority: number;

    if (isDoubleKill) {
        combinedDiagnosis = '流量贵且转化差';
        combinedAction = '请排查AOV是否异常，若AOV正常则转人工判断是否关停';
        priority = 1;
    } else {
        combinedDiagnosis = abnormalIndicators.map(p => p.diagnosis).join(' + ');
        combinedAction = abnormalIndicators.map(p => p.action).join('\n\n');
        priority = 2;
    }

    // 显示所有指标的检查状态
    const allIndicatorsStatus = indicators.map(i =>
        i.isAbnormal ? `${i.name} ${i.direction} 异常` : `${i.name} ✓ 正常`
    ).join(', ');

    return {
        scenario: 'CPA异常高',
        diagnosis: `${combinedDiagnosis} (${allIndicatorsStatus})`,
        action: combinedAction,
        priority,
        metrics: {
            ...Object.fromEntries(indicators.map(p => [p.metric, p.value])),
            cpa: metrics.cpa
        }
    };
};


/**
 * 场景1.5：检查AOV异常低（V2新增）
 */
const checkLowAOV = (
    metrics: AggregatedMetrics,
    benchmarks: CampaignBenchmarks
): DiagnosticResult | null => {

    // 前提条件：Spend >= 1 × Avg CPA
    if (metrics.spend < benchmarks.avgCpa) return null;

    const aov = metrics.aov || 0;
    const avgAov = benchmarks.avgAov || 0;

    // 判定条件：AOV < Avg AOV × 60%
    if (aov < avgAov * 0.6) {
        return {
            scenario: 'AOV异常低',
            diagnosis: '人群消费力低 / 素材误导',
            action: '引流品导致客单低。\n1. 【素材问题】：检查是否在用低价配件（如线材）做素材，建议改推高客单价的主机/Bundle；在落地页加Bundle的Variant，引导用户提高单价\n2. 【受众问题】：当前人群消费力弱，建议调整为Max conv. value的Performance Goal或排除低收入人群/配件人群\n3. 【落地页问题】：在落地页/购物车页增加"Frequently Bought Together"组合购插件，或设置阶梯折扣（买2件9折）；检查免邮门槛，将免邮门槛设定在AOV的1.2倍（如AOV=$40则免邮线设$49），并在购物车顶部加进度条提示"再买$9免邮"',
            priority: 2,
            metrics: { aov, avgAov }
        };
    }

    return null;
};

/**
 * 场景2：检查CVR异常低（漏斗分析）- V2并行检测
 */
const checkLowCVR = (
    metrics: AggregatedMetrics,
    benchmarks: CampaignBenchmarks
): DiagnosticResult | null => {

    // 前提条件：Spend >= 1 × Avg CPA
    if (metrics.spend < benchmarks.avgCpa) return null;

    // 移除CVR前置判定，直接检查4个漏斗指标

    const { click_to_pv_rate, atc_rate, checkout_rate, purchase_rate } = metrics;
    const { avgClickToPvRate, avgAtcRate, avgCheckoutRate, avgPurchaseRate } = benchmarks;

    // V2 方案B: 显示所有检查的指标（包含通过/不通过状态）
    const indicators: Array<{ name: string; diagnosis: string; action: string; metric: string; value: number; isAbnormal: boolean }> = [];

    // 检查所有4个漏斗指标
    const clickToPvAbnormal = click_to_pv_rate < avgClickToPvRate * 0.9;
    indicators.push({
        name: 'Click-to-PV Rate',
        diagnosis: '加载速度/误触',
        action: '1. 落地页加载过慢，请优先优化移动端 LCP；压缩图片大小 (TinyPNG)，检查是否安装过多无用插件，或检查服务器地区\n2. 投放版位问题，排查广告版位，重点关注是否过多投放到AN版位',
        metric: 'click_to_pv_rate',
        value: click_to_pv_rate,
        isAbnormal: clickToPvAbnormal
    });

    const atcAbnormal = atc_rate < avgAtcRate * 0.9;
    indicators.push({
        name: 'ATC Rate',
        diagnosis: '吸引力不足/不匹配',
        action: '【页面吸引力不足】：排查素材与落地页是否货不对板；检查首屏信息传递；检查价格竞争力；将Reviews挪到首屏；增加Trust Badge；检查移动端"加购按钮"是否悬浮（Sticky ATC）\n【流量不准】：查Breakdown（Age），若某年龄段花费>10%预算且0转化则排除；检查Audience Network是否消耗过大；排除点击高但加购低的国家/州\n【缩小受众】：IG加must also match；LAL改用Purchase（Value-based）做种子；排除"Flash Sale Seekers"',
        metric: 'atc_rate',
        value: atc_rate,
        isAbnormal: atcAbnormal
    });

    const checkoutAbnormal = checkout_rate < avgCheckoutRate * 0.9;
    indicators.push({
        name: 'Checkout Rate',
        diagnosis: '运费/信任感',
        action: '购物车流失严重，检查运费是否过高；检查是否强制注册（建议开启Guest Checkout）；检查隐形费用；排查背书/价格问题',
        metric: 'checkout_rate',
        value: checkout_rate,
        isAbnormal: checkoutAbnormal
    });

    const purchaseAbnormal = purchase_rate < avgPurchaseRate * 0.9;
    indicators.push({
        name: 'Purchase Rate',
        diagnosis: '技术故障/支付通道',
        action: '测试下单检查支付路径（PayPal/信用卡等）',
        metric: 'purchase_rate',
        value: purchase_rate,
        isAbnormal: purchaseAbnormal
    });

    // 只取异常的问题来生成诊断和建议
    const abnormalIndicators = indicators.filter(i => i.isAbnormal);

    // 如果没有异常指标，返回 null
    if (abnormalIndicators.length === 0) return null;

    // 合并异常指标的诊断和建议
    const combinedDiagnosis = abnormalIndicators.map(p => p.diagnosis).join(' + ');
    const combinedAction = abnormalIndicators.map(p => p.action).join('\n\n');

    // 显示所有指标的检查状态
    const allIndicatorsStatus = indicators.map(i =>
        i.isAbnormal ? `${i.name} ↓` : `${i.name} ✓`
    ).join(', ');

    return {
        scenario: 'CVR异常低',
        diagnosis: `${combinedDiagnosis} (${allIndicatorsStatus})`,
        action: combinedAction,
        priority: 2,
        metrics: {
            ...Object.fromEntries(indicators.map(p => [p.metric, p.value])),
            cvr: metrics.cvr
        }
    };
};

/**
 * 场景3：检查CPC异常高 - V2并行检测
 */
const checkHighCPC = (
    metrics: AggregatedMetrics,
    benchmarks: CampaignBenchmarks
): DiagnosticResult | null => {

    // 前提条件：Impressions >= 1000
    if (metrics.impressions < 1000) return null;

    // 移除CPC前置判定，直接检查CTR和CPM

    const { ctr, cpm } = metrics;
    const { avgCtr, avgCpm } = benchmarks;

    // V2 方案B: 显示所有检查的指标（包含通过/不通过状态）
    const indicators: Array<{ name: string; diagnosis: string; action: string; metric: string; value: number; isAbnormal: boolean; direction: string }> = [];

    // 检查 CTR
    const ctrAbnormal = ctr < avgCtr * 0.9;
    indicators.push({
        name: 'CTR',
        diagnosis: '素材/受众问题',
        action: '素材缺乏吸引力（前3秒完播率低）、素材疲劳或受众疲劳（frequency过高）\n\n1. 素材疲劳\n   a. 静态图改轮播 (Carousel): 把单图变成产品多角度展示或"使用前 vs 使用后"\n   b. 视频改静态图拼贴: 截取视频里最炸的 4 个瞬间，拼成一张图\n   c. 视频改GIF: 截取 3 秒微动图，循环播放\n\n2. 素材缺乏吸引力\n   a. 视频：视觉重置，保留后半段，仅剪掉前 3 秒，换成倒放画面、强烈对比图、或满屏大字幕提问；调整视频首帧\n   b. 单图：加Text Overlay（如 "50% OFF"、"Best Seller"）；裁剪构图放大细节；换高饱和度背景色\n   c. 轮播：换首图，把"效果最炸裂的图"挪到第一张；在第一张图右侧加箭头引导滑动\n\n3. 优化受众，更换新人群',
        metric: 'ctr',
        value: ctr,
        isAbnormal: ctrAbnormal,
        direction: '↓'
    });

    // 检查 CPM（仅当CTR正常时才判定为CPM问题）
    const ctrNormal = ctr >= avgCtr * 1.1; // CTR > Benchmark 10%
    const cpmAbnormal = cpm > avgCpm * 1.1 && ctrNormal;
    indicators.push({
        name: 'CPM',
        diagnosis: '市场竞价/人群贵',
        action: '素材表现正常，但市场竞争过热（竞品上新/大促等）\n\n1. 放宽定向：\n   a. 通投：直接移除所有 Interest 标签，仅保留 Age/Gender/Geo，让算法自动寻人 (Broad Targeting)\n   b. 智能扩量：勾选 "Advantage+ Audience" 选项\n   c. LAL 进阶：如果在跑 LAL 1%，尝试新建组跑 LAL 5% 或 10%\n   d. 国家合并：如果分开跑 UK/DE/FR，尝试合并为一个 "Tier 1 Europe" 大组\n2. 避开竞价高峰',
        metric: 'cpm',
        value: cpm,
        isAbnormal: cpmAbnormal,
        direction: '↑'
    });

    // 只取异常的问题来生成诊断和建议
    const abnormalIndicators = indicators.filter(i => i.isAbnormal);

    // 如果没有异常指标，返回 null
    if (abnormalIndicators.length === 0) return null;

    // 合并异常指标的诊断和建议
    const combinedDiagnosis = abnormalIndicators.map(p => p.diagnosis).join(' + ');
    const combinedAction = abnormalIndicators.map(p => p.action).join('\n\n');

    // 显示所有指标的检查状态
    const allIndicatorsStatus = indicators.map(i =>
        i.isAbnormal ? `${i.name} ${i.direction} 异常` : `${i.name} ✓ 正常`
    ).join(', ');

    return {
        scenario: 'CPC异常高',
        diagnosis: `${combinedDiagnosis} (${allIndicatorsStatus})`,
        action: combinedAction,
        priority: 2,
        metrics: {
            ...Object.fromEntries(indicators.map(p => [p.metric, p.value])),
            cpc: metrics.cpc
        }
    };
};

/**
 * 场景4：检查CPATC异常高
 */
const checkHighCPATC = (
    metrics: AggregatedMetrics,
    benchmarks: CampaignBenchmarks
): DiagnosticResult | null => {

    // 前提条件：Spend >= 1 × Avg CPATC
    if (metrics.spend < benchmarks.avgCpatc) return null;

    // 判断CPATC是否异常高
    if (metrics.cpatc <= benchmarks.avgCpatc * 1.1) return null;

    const { atc_rate } = metrics;
    const { avgAtcRate } = benchmarks;

    // 素材与页面不符
    if (atc_rate < avgAtcRate * 0.9) {
        return {
            scenario: 'CPATC异常高',
            diagnosis: '素材与页面不符',
            action: '素材与LP信息有偏差、不一致，用户被素材吸引点击，但发现落地页不是想要的\n1. 优化素材&LP一致性',
            priority: 2,
            metrics: { atc_rate, cpatc: metrics.cpatc }
        };
    }

    return null;
};


// Campaign上下文信息（用于场景5和6）
export interface CampaignContext {
    adsetCount?: number;        // AdSet数量
    activeDays?: number;        // 运行天数
    dailyBudget?: number;       // 日预算
    campaignBudget?: number;    // Campaign总预算
}

/**
 * 扩展的诊断函数 - 包含所有6个场景
 * @param metrics - Campaign的聚合指标
 * @param benchmarks - 所有Campaign的基准值
 * @param context - 额外的上下文信息（用于场景5和6）
 * @returns 诊断结果，如果表现正常则返回null
 */
export const diagnoseCampaignWithContext = (
    metrics: AggregatedMetrics,
    benchmarks: CampaignBenchmarks,
    context?: CampaignContext
): DiagnosticResult | null => {

    // 先检查场景1-4
    const basicResult = diagnoseCampaign(metrics, benchmarks);
    if (basicResult) return basicResult;

    // 如果有上下文，检查场景5和6
    if (context) {
        // 5. 检查预算分散
        const budgetResult = checkBudgetDilution(metrics, benchmarks, context);
        if (budgetResult) return budgetResult;

        // 6. 检查花费困难
        const deliveryResult = checkDeliveryIssue(metrics, benchmarks, context);
        if (deliveryResult) return deliveryResult;
    }

    return null;
};

/**
 * 场景5：检查预算分散
 */
const checkBudgetDilution = (
    metrics: AggregatedMetrics,
    benchmarks: CampaignBenchmarks,
    context: CampaignContext
): DiagnosticResult | null => {

    // 前提条件
    if (!context.adsetCount || !context.campaignBudget) return null;
    if (metrics.spend === 0) return null; // Campaign未激活
    if (context.adsetCount < 3) return null; // AdSet数量少于3个

    // 计算平均每组预算
    const avgBudgetPerAdset = context.campaignBudget / context.adsetCount;

    // 判定：平均每组预算 < 1 × Avg CPA
    if (avgBudgetPerAdset < benchmarks.avgCpa) {
        return {
            scenario: '预算分散',
            diagnosis: '预算过度分散',
            action: `预算被严重稀释：Campaign预算只有 $${context.campaignBudget.toFixed(0)} 但开了 ${context.adsetCount} 个组，平均每组 $${avgBudgetPerAdset.toFixed(0)} 无法支撑转化\n1. 关停表现差的组，集中预算\n2. 增加总预算\n3. 缩小受众`,
            priority: 2,
            metrics: {
                campaignBudget: context.campaignBudget,
                adsetCount: context.adsetCount,
                avgBudgetPerAdset,
                avgCpa: benchmarks.avgCpa
            }
        };
    }

    return null;
};

/**
 * 场景6：检查花费困难
 */
const checkDeliveryIssue = (
    metrics: AggregatedMetrics,
    benchmarks: CampaignBenchmarks,
    context: CampaignContext
): DiagnosticResult | null => {

    // 前提条件
    if (!context.activeDays || !context.dailyBudget) return null;
    if (context.activeDays <= 1) return null; // 新广告（运行≤24小时）

    // 计算Spend Pacing
    const spendPacing = metrics.spend / context.dailyBudget;

    // 判定：Spend Pacing < 80%
    if (spendPacing < 0.8) {
        const frequencyNote = metrics.frequency
            ? `\n当前Frequency: ${metrics.frequency.toFixed(1)}${metrics.frequency > 3 ? '（过高，受众疲劳）' : ''}`
            : '';

        return {
            scenario: '花费困难',
            diagnosis: '竞价/受众过窄',
            action: `Delivery Issue (Spend Pacing: ${(spendPacing * 100).toFixed(0)}%)${frequencyNote}\n1. 出价过低：Cost Cap建议提价，或改用Highest Volume（Lowest Cost）并取消Cost Cap限制\n2. 受众过窄/耗尽：检查Frequency是否过高，建议放宽定向\n3. 质量太差：检查质量分是否被系统降权`,
            priority: 2,
            metrics: {
                spend: metrics.spend,
                dailyBudget: context.dailyBudget,
                spendPacing,
                frequency: metrics.frequency
            }
        };
    }

    return null;
};

/**
 * 将诊断结果转换为详细步骤格式
 * @param result - 基础诊断结果
 * @param metrics - Campaign指标
 * @param benchmarks - 基准值
 * @param context - 上下文信息（可选）
 * @param trendInfo - 趋势信息（可选，V2新增）
 * @returns 详细诊断结果
 */
export const convertToDetailedDiagnostic = (
    result: DiagnosticResult,
    metrics: AggregatedMetrics,
    benchmarks: CampaignBenchmarks,
    context?: CampaignContext,
    trendInfo?: TrendInfo
): DiagnosticDetail => {
    const steps: DiagnosticStep[] = [];
    let subProblems: SubProblem[] | undefined;

    // 步骤0: 触发条件
    const prerequisiteStep = createPrerequisiteStep(result.scenario, metrics, benchmarks, context);
    if (prerequisiteStep) steps.push(prerequisiteStep);

    // 步骤1: 核心异常场景（仅场景1-4 + AOV）
    if (['CPA异常高', 'AOV异常低', 'CVR异常低', 'CPC异常高', 'CPATC异常高'].includes(result.scenario)) {
        steps.push(createScenarioStep(result, metrics, benchmarks));
    }

    // 步骤2-5: 下钻检查、公式、判定、归因（根据场景不同）
    if (result.scenario === 'CPA异常高') {
        const drillDownSteps = createCPADrillDownSteps(result, metrics, benchmarks);
        if (drillDownSteps.subProblems) {
            subProblems = drillDownSteps.subProblems;
        } else {
            steps.push(...drillDownSteps.steps);
        }
    } else if (result.scenario === 'AOV异常低') {
        // V2 新增：AOV场景步骤
        steps.push({
            stepNumber: 2,
            stepName: '下钻检查指标',
            icon: '📊',
            content: { metric: 'AOV' }
        });
        steps.push({
            stepNumber: 3,
            stepName: '公式',
            icon: '📐',
            content: {
                formula: 'AOV = Purchase_Value / Purchases',
                calculation: `$${((metrics.aov || 0) * (metrics.purchases || 1)).toFixed(2)} / ${metrics.purchases || 0} = $${(metrics.aov || 0).toFixed(2)}`
            }
        });
        steps.push({
            stepNumber: 4,
            stepName: '判定条件',
            icon: '✓',
            content: {
                condition: 'AOV < Benchmark × 60%',
                actualValue: metrics.aov || 0,
                thresholdValue: benchmarks.avgAov * 0.6,
                result: true
            }
        });
    } else if (result.scenario === 'CVR异常低') {
        steps.push(...createCVRDrillDownSteps(result, metrics, benchmarks));
    } else if (result.scenario === 'CPC异常高') {
        steps.push(...createCPCDrillDownSteps(result, metrics, benchmarks));
    } else if (result.scenario === 'CPATC异常高') {
        steps.push(...createCPATCDrillDownSteps(result, metrics, benchmarks));
    } else if (result.scenario === '预算分散') {
        steps.push(...createBudgetDilutionSteps(result, metrics, benchmarks, context));
    } else if (result.scenario === '花费困难') {
        steps.push(...createDeliveryIssueSteps(result, metrics, benchmarks, context));
    }

    // V2 新增：如果有趋势信息，移除原有的步骤5（归因诊断）和步骤6（Action建议）
    // 因为它们将被趋势逻辑、趋势决策和Action建议取代
    if (trendInfo) {
        // 只保留步骤0-4
        const filteredSteps = steps.filter(step => step.stepNumber <= 4);
        steps.length = 0;
        steps.push(...filteredSteps);

        // 添加新的趋势步骤
        steps.push(createTrendLogicStep(trendInfo));
        steps.push(createTrendDecisionStep(trendInfo, result.action));

        // 添加Action建议作为步骤7
        steps.push({
            stepNumber: 7,
            stepName: 'Action建议',
            icon: '💡',
            content: {
                actions: trendInfo.isRecoveryCase2
                    ? ['虽然 ROI 低于 Benchmark，但近期趋势显示回暖，暂不执行关停/调整，保留关停1-2天']
                    : result.action.split('\n').filter(line => line.trim())
            }
        });
    }

    // 调试日志：检查步骤数组
    console.log("📊 Diagnostic Steps for", result.scenario, ":", steps.map(s => `Step ${s.stepNumber}: ${s.stepName}`).join(", "));


    return {
        ...result,
        steps,
        subProblems,
        trendInfo
    };
};

// ========== 辅助函数：创建各个步骤 ==========

function createPrerequisiteStep(
    scenario: string,
    metrics: AggregatedMetrics,
    benchmarks: CampaignBenchmarks,
    context?: CampaignContext
): DiagnosticStep | null {
    // 场景1-4 + AOV的前提条件
    if (['CPA异常高', 'AOV异常低', 'CVR异常低', 'CPC异常高', 'CPATC异常高'].includes(scenario)) {
        return {
            stepNumber: 0,
            stepName: '触发条件',
            icon: '🔍',
            content: {
                condition: 'Spend ≥ 1 × Avg CPA',
                actualValue: metrics.spend,
                thresholdValue: benchmarks.avgCpa,
                result: metrics.spend >= benchmarks.avgCpa
            }
        };
    }

    // 场景5的触发条件
    if (scenario === '预算分散' && context) {
        return {
            stepNumber: 0,
            stepName: '触发条件',
            icon: '🔍',
            content: {
                condition: 'ROI ≥ 1.2 × Benchmark',
                actualValue: metrics.roi,
                thresholdValue: benchmarks.avgRoi * 1.2,
                result: (metrics.roi || 0) >= (benchmarks.avgRoi || 0) * 1.2
            }
        };
    }

    // 场景6的前提条件
    if (scenario === '花费困难' && context) {
        const spendPacing = metrics.spend / context.dailyBudget;
        return {
            stepNumber: 0,
            stepName: '触发条件',
            icon: '🔍',
            content: {
                condition: 'Spend / Daily Budget < 0.7',
                actualValue: spendPacing,
                thresholdValue: 0.7,
                result: spendPacing < 0.7,
                description: `花费进度: ${(spendPacing * 100).toFixed(0)}% `
            }
        };
    }

    return null;
}

function createScenarioStep(
    result: DiagnosticResult,
    metrics: AggregatedMetrics,
    benchmarks: CampaignBenchmarks
): DiagnosticStep {
    const icons: { [key: string]: string } = {
        1: '🔴',
        2: '🟡',
        3: '🟢'
    };

    return {
        stepNumber: 1,
        stepName: '核心异常场景',
        icon: icons[result.priority] || '🟡',
        content: {
            diagnosis: result.scenario + (result.diagnosis.includes('Double Kill') ? ' (Double Kill)' : '')
        }
    };
}

function createCPADrillDownSteps(
    result: DiagnosticResult,
    metrics: AggregatedMetrics,
    benchmarks: CampaignBenchmarks
): { steps: DiagnosticStep[]; subProblems?: SubProblem[] } {
    const { avgCpc, avgCvr } = benchmarks;

    // 从原始数据计算 CPC 和 CVR
    const spend = metrics.spend || 0;
    const linkClicks = metrics.link_clicks || 0;
    const purchases = metrics.purchases || 0;

    // CPC = Spend / Link Clicks（分母为0时结果为0）
    const cpcValue = linkClicks > 0 ? spend / linkClicks : 0;
    // CVR = Purchases / Link Clicks（分母为0时结果为0）
    const cvrValue = linkClicks > 0 ? purchases / linkClicks : 0;

    const cpcAbnormal = cpcValue > avgCpc * 1.1;
    const cvrAbnormal = cvrValue < avgCvr * 0.9;

    // 判断是否为 Double Kill
    const isDoubleKill = cpcAbnormal && cvrAbnormal;

    // 步骤2: 下钻检查指标（显示所有指标状态）
    const cpcStatus = cpcAbnormal ? '↑ 异常' : '✓ 正常';
    const cvrStatus = cvrAbnormal ? '↓ 异常' : '✓ 正常';

    const step2: DiagnosticStep = {
        stepNumber: 2,
        stepName: '下钻检查指标',
        icon: '📊',
        content: {
            metric: `CPC ${cpcStatus}, CVR ${cvrStatus}`,
            multiIndicators: true,
            multiConditions: [
                {
                    name: 'CPC',
                    actualValue: cpcValue,
                    thresholdValue: avgCpc * 1.1,
                    result: cpcAbnormal
                },
                {
                    name: 'CVR',
                    actualValue: cvrValue,
                    thresholdValue: avgCvr * 0.9,
                    result: cvrAbnormal
                }
            ]
        }
    };

    // 步骤3: 公式（显示所有异常指标的公式）
    const formulas: string[] = [];
    if (cpcAbnormal) {
        formulas.push(`CPC: $${spend.toFixed(2)} / ${linkClicks} = $${cpcValue.toFixed(2)}`);
    }
    if (cvrAbnormal) {
        formulas.push(`CVR: ${purchases} / ${linkClicks} = ${(cvrValue * 100).toFixed(2)}%`);
    }

    const step3: DiagnosticStep = {
        stepNumber: 3,
        stepName: '公式',
        icon: '📐',
        content: {
            formula: isDoubleKill
                ? 'CPC = Spend / Link Clicks\nCVR = Purchases / Link Clicks'
                : cpcAbnormal
                    ? 'CPC = Spend / Link Clicks'
                    : 'CVR = Purchases / Link Clicks',
            calculation: formulas.join('\n')
        }
    };

    // 步骤4: 判定条件（显示所有异常指标的判定）
    const conditions: Array<{ name: string; actualValue: number; thresholdValue: number; result: boolean }> = [];
    if (cpcAbnormal) {
        conditions.push({
            name: 'CPC > Benchmark × 1.1',
            actualValue: cpcValue,
            thresholdValue: avgCpc * 1.1,
            result: true
        });
    }
    if (cvrAbnormal) {
        conditions.push({
            name: 'CVR < Benchmark × 0.9',
            actualValue: cvrValue,
            thresholdValue: avgCvr * 0.9,
            result: true
        });
    }

    const step4: DiagnosticStep = {
        stepNumber: 4,
        stepName: '判定条件',
        icon: '✓',
        content: {
            multiIndicators: true,
            multiConditions: conditions
        }
    };

    // 步骤5: 归因诊断
    const step5: DiagnosticStep = {
        stepNumber: 5,
        stepName: '归因诊断',
        icon: '🎯',
        content: {
            diagnosis: isDoubleKill
                ? '流量贵且转化差'
                : cpcAbnormal
                    ? '流量成本过高'
                    : '转化能力不足'
        }
    };

    return {
        steps: [step2, step3, step4, step5]
    };
}

function createCVRDrillDownSteps(
    result: DiagnosticResult,
    metrics: AggregatedMetrics,
    benchmarks: CampaignBenchmarks
): DiagnosticStep[] {
    const steps: DiagnosticStep[] = [];

    // V2: 从原始数据计算所有比率
    // 获取原始数值
    const lpv = metrics.landing_page_views || 0;
    const clicks = metrics.link_clicks || 0;
    const atc = metrics.adds_to_cart || 0;
    const ic = metrics.checkouts_initiated || 0;
    const purch = metrics.purchases || 0;

    // 按照用户公式计算比率（分母为0时结果为0）
    // Click-to-PV Rate = Landing Page Views / Link Clicks
    const clickToPvValue = clicks > 0 ? lpv / clicks : 0;
    // ATC Rate = Adds to Cart / Landing Page Views
    const atcValue = lpv > 0 ? atc / lpv : 0;
    // Checkout Rate = Initiated Checkouts / Adds to Cart
    const checkoutValue = atc > 0 ? ic / atc : 0;
    // Purchase Rate = Purchases / Initiated Checkouts
    const purchaseValue = ic > 0 ? purch / ic : 0;

    const clickToPvAbnormal = clickToPvValue < benchmarks.avgClickToPvRate * 0.9;
    const atcAbnormal = atcValue < benchmarks.avgAtcRate * 0.9;
    const checkoutAbnormal = checkoutValue < benchmarks.avgCheckoutRate * 0.9;
    const purchaseAbnormal = purchaseValue < benchmarks.avgPurchaseRate * 0.9;

    const indicators = [
        {
            name: 'Click-to-PV',
            formula: 'LPV / Clicks',
            calculation: `${lpv} / ${clicks} = ${(clickToPvValue * 100).toFixed(1)}%`,
            condition: 'Click-to-PV < 90%',
            actualValue: clickToPvValue,
            thresholdValue: benchmarks.avgClickToPvRate * 0.9,
            isAbnormal: clickToPvAbnormal,
            statusIcon: clickToPvAbnormal ? '↓' : '✓'
        },
        {
            name: 'ATC Rate',
            formula: 'ATC / LPV',
            calculation: `${atc} / ${lpv} = ${(atcValue * 100).toFixed(1)}%`,
            condition: 'ATC Rate < 90%',
            actualValue: atcValue,
            thresholdValue: benchmarks.avgAtcRate * 0.9,
            isAbnormal: atcAbnormal,
            statusIcon: atcAbnormal ? '↓' : '✓'
        },
        {
            name: 'Checkout',
            formula: 'IC / ATC',
            calculation: `${ic} / ${atc} = ${(checkoutValue * 100).toFixed(1)}%`,
            condition: 'Checkout < 90%',
            actualValue: checkoutValue,
            thresholdValue: benchmarks.avgCheckoutRate * 0.9,
            isAbnormal: checkoutAbnormal,
            statusIcon: checkoutAbnormal ? '↓' : '✓'
        },
        {
            name: 'Purchase',
            formula: 'Purch / IC',
            calculation: `${purch} / ${ic} = ${(purchaseValue * 100).toFixed(1)}%`,
            condition: 'Purchase < 90%',
            actualValue: purchaseValue,
            thresholdValue: benchmarks.avgPurchaseRate * 0.9,
            isAbnormal: purchaseAbnormal,
            statusIcon: purchaseAbnormal ? '↓' : '✓'
        }
    ];

    // 步骤2: 下钻检查指标（显示所有指标及状态）
    steps.push({
        stepNumber: 2,
        stepName: '下钻检查指标',
        icon: '📊',
        content: {
            metric: indicators.map(i => `${i.name} ${i.statusIcon}`).join(', '),
            multiIndicators: true
        }
    });

    // 步骤3: 公式（全部显示）
    steps.push({
        stepNumber: 3,
        stepName: '公式',
        icon: '📐',
        content: {
            formula: indicators.map(i => i.formula).join(' | '),
            calculation: indicators.map(i => `${i.name}: ${i.calculation}`).join('\n')
        }
    });

    // 步骤4: 判定条件（全部显示，标注结果）
    steps.push({
        stepNumber: 4,
        stepName: '判定条件',
        icon: '✓',
        content: {
            condition: indicators.map(i => `${i.condition} → ${i.isAbnormal ? '异常' : '正常'}`).join('\n'),
            multiConditions: indicators.map(i => ({
                name: i.name,
                actualValue: i.actualValue,
                thresholdValue: i.thresholdValue,
                result: i.isAbnormal
            }))
        }
    });

    return steps;
}

function createCPCDrillDownSteps(
    result: DiagnosticResult,
    metrics: AggregatedMetrics,
    benchmarks: CampaignBenchmarks
): DiagnosticStep[] {
    const steps: DiagnosticStep[] = [];

    // V2: 从原始数据计算 CTR 和 CPM
    const linkClicks = metrics.link_clicks || 0;
    const impressions = metrics.impressions || 0;
    const spend = metrics.spend || 0;

    // 按照用户公式计算比率（分母为0时结果为0）
    // CTR = Link Clicks / Impressions
    const ctrValue = impressions > 0 ? linkClicks / impressions : 0;
    // CPM = (Spend / Impressions) × 1000
    const cpmValue = impressions > 0 ? (spend / impressions) * 1000 : 0;

    const ctrAbnormal = ctrValue < benchmarks.avgCtr * 0.9;
    const cpmAbnormal = cpmValue > benchmarks.avgCpm * 1.1;

    const indicators = [
        {
            name: 'CTR',
            formula: 'Link Clicks / Impressions',
            calculation: `${linkClicks} / ${impressions} = ${(ctrValue * 100).toFixed(2)}%`,
            condition: 'CTR < Benchmark × 90%',
            actualValue: ctrValue,
            thresholdValue: benchmarks.avgCtr * 0.9,
            isAbnormal: ctrAbnormal,
            statusIcon: ctrAbnormal ? '↓ 异常' : '✓ 正常'
        },
        {
            name: 'CPM',
            formula: 'Spend / Impressions × 1000',
            calculation: `$${spend.toFixed(2)} / ${impressions} × 1000 = $${cpmValue.toFixed(2)}`,
            condition: 'CPM > Benchmark × 110%',
            actualValue: cpmValue,
            thresholdValue: benchmarks.avgCpm * 1.1,
            isAbnormal: cpmAbnormal,
            statusIcon: cpmAbnormal ? '↑ 异常' : '✓ 正常'
        }
    ];

    // 步骤2: 下钻检查指标（显示所有指标及状态）
    steps.push({
        stepNumber: 2,
        stepName: '下钻检查指标',
        icon: '📊',
        content: {
            metric: indicators.map(i => `${i.name} ${i.statusIcon}`).join(', '),
            multiIndicators: true
        }
    });

    // 步骤3: 公式（全部显示）
    steps.push({
        stepNumber: 3,
        stepName: '公式',
        icon: '📐',
        content: {
            formula: indicators.map(i => i.formula).join(' | '),
            calculation: indicators.map(i => `${i.name}: ${i.calculation}`).join('\n')
        }
    });

    // 步骤4: 判定条件（全部显示，标注结果）
    steps.push({
        stepNumber: 4,
        stepName: '判定条件',
        icon: '✓',
        content: {
            condition: indicators.map(i => `${i.condition} → ${i.isAbnormal ? '异常' : '正常'}`).join('\n'),
            multiConditions: indicators.map(i => ({
                name: i.name,
                actualValue: i.actualValue,
                thresholdValue: i.thresholdValue,
                result: i.isAbnormal
            }))
        }
    });

    return steps;
}

function createCPATCDrillDownSteps(
    result: DiagnosticResult,
    metrics: AggregatedMetrics,
    benchmarks: CampaignBenchmarks
): DiagnosticStep[] {
    // 从原始数据计算 CPATC
    const spend = metrics.spend || 0;
    const atc = metrics.adds_to_cart || 0;
    // CPATC = Spend / Add to Carts（分母为0时结果为0）
    const cpatcValue = atc > 0 ? spend / atc : 0;
    const cpatcAbnormal = cpatcValue > benchmarks.avgCpatc * 1.1;

    return [
        {
            stepNumber: 2,
            stepName: '下钻检查指标',
            icon: '📊',
            content: {
                metric: `CPATC ${cpatcAbnormal ? '↑ 异常' : '✓ 正常'}`
            }
        },
        {
            stepNumber: 3,
            stepName: '公式',
            icon: '📐',
            content: {
                formula: 'CPATC = Spend / Add to Carts',
                calculation: `$${spend.toFixed(2)} / ${atc} = $${cpatcValue.toFixed(2)}`
            }
        },
        {
            stepNumber: 4,
            stepName: '判定条件',
            icon: '✓',
            content: {
                condition: 'CPATC > Benchmark 10%',
                actualValue: cpatcValue,
                thresholdValue: benchmarks.avgCpatc * 1.1,
                result: cpatcAbnormal
            }
        },
        {
            stepNumber: 5,
            stepName: '归因诊断',
            icon: '🎯',
            content: {
                diagnosis: result.diagnosis,
                description: result.action.split('\n')[0]
            }
        },
        {
            stepNumber: 6,
            stepName: 'Action建议',
            icon: '💡',
            content: {
                actions: [
                    '1. 优化素材KSP',
                    '2. 并非素材吸引力不够，而是产品不匹配，导致用户点击后不感兴趣'
                ]
            }
        }
    ];
}

function createBudgetDilutionSteps(
    result: DiagnosticResult,
    metrics: AggregatedMetrics,
    benchmarks: CampaignBenchmarks,
    context?: CampaignContext
): DiagnosticStep[] {
    if (!context) {
        return [];
    }

    const avgBudgetPerAdset = context.campaignBudget / context.adsetCount;

    return [
        {
            stepNumber: 1,
            stepName: '核心异常场景',
            icon: '🟡',
            content: {
                diagnosis: '预算分散',
                description: `Campaign预算分散到${context.adsetCount}个AdSet，单个AdSet预算不足`
            }
        },
        {
            stepNumber: 2,
            stepName: '下钻检查指标',
            icon: '📊',
            content: {
                metric: 'Campaign_Budget / Active_Ad_Set_Count'
            }
        },
        {
            stepNumber: 3,
            stepName: '公式',
            icon: '📐',
            content: {
                formula: 'Campaign_Budget / Active_Ad_Set_Count',
                calculation: `$${(context.campaignBudget || 0).toFixed(2)} / ${context.adsetCount || 1} = $${(avgBudgetPerAdset || 0).toFixed(2)}`
            }
        },
        {
            stepNumber: 4,
            stepName: '判定条件',
            icon: '✓',
            content: {
                condition: '< 1 × Avg CPA (平均每个AdSet预算太小)',
                actualValue: avgBudgetPerAdset,
                thresholdValue: benchmarks.avgCpa,
                result: avgBudgetPerAdset < benchmarks.avgCpa
            }
        },
        {
            stepNumber: 5,
            stepName: '归因诊断',
            icon: '🎯',
            content: {
                diagnosis: '预算过度散',
                description: `Campaign预算只有$100，但开了10个AdSet，平均每组$10，无法支撑转化`
            }
        },
        {
            stepNumber: 6,
            stepName: 'Action建议',
            icon: '💡',
            content: {
                actions: [
                    '1. 关闭表现差的AdSet，集中预算',
                    '2. 增加总预算'
                ]
            }
        }
    ];
}

function createDeliveryIssueSteps(
    result: DiagnosticResult,
    metrics: AggregatedMetrics,
    benchmarks: CampaignBenchmarks,
    context?: CampaignContext
): DiagnosticStep[] {
    if (!context) return [];

    const spendPacing = metrics.spend / context.dailyBudget;

    return [
        {
            stepNumber: 1,
            stepName: '核心异常场景',
            icon: '🟡',
            content: {
                diagnosis: '花费困难',
                description: `Spend Pacing仅${(spendPacing * 100).toFixed(0)}%，投放受限`
            }
        },
        {
            stepNumber: 2,
            stepName: '下钻检查指标',
            icon: '📊',
            content: {
                metric: 'Spend / Daily_Budget'
            }
        },
        {
            stepNumber: 3,
            stepName: '公式',
            icon: '📐',
            content: {
                formula: 'Spend / Daily_Budget',
                calculation: `$${(metrics.spend || 0).toFixed(2)} / $${(context.dailyBudget || 1).toFixed(2)} = ${((spendPacing || 0) * 100).toFixed(0)}%`
            }
        },
        {
            stepNumber: 4,
            stepName: '判定条件',
            icon: '✓',
            content: {
                condition: '< 80% (给了钱却花不出去)',
                actualValue: spendPacing,
                thresholdValue: 0.8,
                result: spendPacing < 0.8,
                description: metrics.frequency ? `辅助判断: Frequency ${(metrics.frequency || 0).toFixed(2)}` : undefined
            }
        },
        {
            stepNumber: 5,
            stepName: '归因诊断',
            icon: '🎯',
            content: {
                diagnosis: result.diagnosis
            }
        },
        {
            stepNumber: 6,
            stepName: 'Action建议',
            icon: '💡',
            content: {
                actions: result.action.split('\n').filter(a => a.trim())
            }
        }
    ];
}

function createActionStep(result: DiagnosticResult): DiagnosticStep {
    // 将action字符串分割成数组
    const actions = result.action.split('\n').filter(line => line.trim());

    return {
        stepNumber: 5,
        stepName: 'Action建议',
        icon: '📋',
        content: {
            actions
        }
    };
}

/**
 * 诊断所有匹配的场景（支持多场景显示）
 * @param metrics - Campaign的聚合指标
 * @param benchmarks - 所有Campaign的基准值
 * @param context - 上下文信息（可选，用于场景5和6）
 * @returns 所有匹配的诊断结果数组
 */
export const diagnoseAllScenarios = (
    metrics: AggregatedMetrics,
    benchmarks: CampaignBenchmarks,
    context?: CampaignContext
): DiagnosticResult[] => {
    const results: DiagnosticResult[] = [];

    // 检查所有场景，不在第一个匹配时就返回

    // 1. 检查CPA异常高
    const cpaResult = checkHighCPA(metrics, benchmarks);
    if (cpaResult) results.push(cpaResult);

    // 1.5. 检查AOV异常低（V2新增）
    const aovResult = checkLowAOV(metrics, benchmarks);
    if (aovResult) results.push(aovResult);

    // 2. 检查CVR异常低
    const cvrResult = checkLowCVR(metrics, benchmarks);
    if (cvrResult) results.push(cvrResult);

    // 3. 检查CPC异常高
    const cpcResult = checkHighCPC(metrics, benchmarks);
    if (cpcResult) results.push(cpcResult);

    // 4. 检查CPATC异常高
    const cpatcResult = checkHighCPATC(metrics, benchmarks);
    if (cpatcResult) results.push(cpatcResult);

    // 5. 检查预算稀释（需要context）
    if (context) {
        const budgetResult = checkBudgetDilution(metrics, benchmarks, context);
        if (budgetResult) results.push(budgetResult);
    }

    // 6. 检查花费困难（需要context）
    if (context) {
        const deliveryResult = checkDeliveryIssue(metrics, benchmarks, context);
        if (deliveryResult) results.push(deliveryResult);
    }

    return results;
};

// ========== V2 新增：趋势步骤创建函数 ==========

/**
 * 创建趋势逻辑步骤（步骤5）
 */
function createTrendLogicStep(trendInfo: TrendInfo): DiagnosticStep {
    const trendIcon = getTrendIcon(trendInfo.trend);
    const trendLabel = getTrendLabel(trendInfo.trend);

    return {
        stepNumber: 5,
        stepName: '趋势逻辑',
        icon: '📈',
        content: {
            formula: 'L3D_ROI vs L7D_ROI',
            calculation: `L3D: ${trendInfo.l3dROI.toFixed(2)} | L7D: ${trendInfo.l7dROI.toFixed(2)}`,
            l3dValue: trendInfo.l3dROI,
            l7dValue: trendInfo.l7dROI,
            trend: trendInfo.trend,
            trendIcon: trendIcon,
            description: `${trendIcon} 趋势: ${trendLabel}`
        }
    };
}

/**
 * 创建趋势决策步骤（步骤6）
 */
function createTrendDecisionStep(trendInfo: TrendInfo, originalAction: string): DiagnosticStep {
    const trendIcon = getTrendIcon(trendInfo.trend);
    const trendLabel = getTrendLabel(trendInfo.trend);

    // 回暖情况2的特殊提示
    const recoveryCase2Message = '虽然 ROI 低于 Benchmark，但近期趋势显示回暖，暂不执行关停/调整，保留关停1-2天';

    return {
        stepNumber: 6,
        stepName: '趋势决策',
        icon: trendIcon,
        content: {
            trend: trendInfo.trend,
            trendIcon: trendIcon,
            diagnosis: `${trendIcon} ${trendLabel}`,
            isRecoveryCase2: trendInfo.isRecoveryCase2,
            recoveryMessage: trendInfo.isRecoveryCase2 ? recoveryCase2Message : undefined
        }
    };
}

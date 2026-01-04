import { AggregatedMetrics } from '../types';
import { CampaignBenchmarks } from './benchmarkCalculator';

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
}

// 详细诊断结果接口（包含步骤信息）
export interface DiagnosticDetail extends DiagnosticResult {
    steps: DiagnosticStep[];
    subProblems?: SubProblem[];
}

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

    // 按优先级顺序检查6大场景

    // 1. 检查CPA异常高（优先级最高）
    const cpaResult = checkHighCPA(metrics, benchmarks);
    if (cpaResult) return cpaResult;

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

    // 判断CPA是否异常高（高于平均值20%以上）
    if (metrics.cpa <= benchmarks.avgCpa * 1.2) return null;

    const { cpc, cvr } = metrics;
    const { avgCpc, avgCvr } = benchmarks;

    // 分支1: Double Kill - 最严重（CPC高 且 CVR低）
    if (cpc > avgCpc * 1.5 && cvr < avgCvr * 0.5) {
        // 调试：输出步骤信息
    console.log('📊 Diagnostic Steps for', result.scenario, ':', steps.map(s => `Step ${s.stepNumber}: ${s.stepName}`).join(', '));
    
        return {
            scenario: 'CPA异常高',
            diagnosis: 'Double Kill（哪哪都不行）',
            action: '建议直接关停。流量贵且承接差，通常意味着选品失败或素材严重老化',
            priority: 1,
            metrics: { cpc, cvr, cpa: metrics.cpa }
        };
    }

    // 分支2: 流量成本过高
    if (cpc > avgCpc * 1.5) {
        return {
            scenario: 'CPA异常高',
            diagnosis: '流量成本过高',
            action: '部分受众竞争过热，建议避开高峰或优化素材点击率',
            priority: 2,
            metrics: { cpc, cpa: metrics.cpa }
        };
    }

    // 分支3: 转化能力不足
    if (cvr < avgCvr * 0.5) {
        return {
            scenario: 'CPA异常高',
            diagnosis: '转化能力不足',
            action: '需排查落地页承接能力',
            priority: 2,
            metrics: { cvr, cpa: metrics.cpa }
        };
    }

    return null;
};

/**
 * 场景2：检查CVR异常低（漏斗分析）
 */
const checkLowCVR = (
    metrics: AggregatedMetrics,
    benchmarks: CampaignBenchmarks
): DiagnosticResult | null => {

    // 前提条件：Spend >= 1 × Avg CPA
    if (metrics.spend < benchmarks.avgCpa) return null;

    // 判断CVR是否异常低
    if (metrics.cvr >= benchmarks.avgCvr * 0.5) return null;

    const { click_to_pv_rate, atc_rate, checkout_rate, purchase_rate } = metrics;
    const { avgClickToPvRate, avgAtcRate, avgCheckoutRate, avgPurchaseRate } = benchmarks;

    // 分支1: 加载速度/误触问题
    if (click_to_pv_rate < avgClickToPvRate * 0.5) {
        return {
            scenario: 'CVR异常低',
            diagnosis: '加载速度/误触',
            action: '可能是：\n1. 落地页加载过慢，请优先优化移动端 LCP\n2. 投放版位问题，排查广告版位',
            priority: 2,
            metrics: { click_to_pv_rate, cvr: metrics.cvr }
        };
    }

    // 分支2: 吸引力不足/不匹配
    if (atc_rate < avgAtcRate * 0.5) {
        return {
            scenario: 'CVR异常低',
            diagnosis: '吸引力不足/不匹配',
            action: '页面吸引力不足\n1. 检查首屏信息传递、价格竞争力\n2. 排查素材承诺与落地页内容是否货不对板',
            priority: 2,
            metrics: { atc_rate, cvr: metrics.cvr }
        };
    }

    // 分支3: 运费/信任感问题
    if (checkout_rate < avgCheckoutRate * 0.5) {
        return {
            scenario: 'CVR异常低',
            diagnosis: '运费/信任感',
            action: '购物车流失严重\n1. 检查运费是否过高劝退\n2. 是否存在隐形费用、绑定费用\n3. 页面缺乏信任背书',
            priority: 2,
            metrics: { checkout_rate, cvr: metrics.cvr }
        };
    }

    // 分支4: 技术故障/支付通道
    if (purchase_rate < avgPurchaseRate * 0.5) {
        return {
            scenario: 'CVR异常低',
            diagnosis: '技术故障/支付通道',
            action: '支付成功率异常\n1. 可能存在支付通道技术故障，需测试下单检查路径',
            priority: 2,
            metrics: { purchase_rate, cvr: metrics.cvr }
        };
    }

    return null;
};

/**
 * 场景3：检查CPC异常高
 */
const checkHighCPC = (
    metrics: AggregatedMetrics,
    benchmarks: CampaignBenchmarks
): DiagnosticResult | null => {

    // 前提条件：Impressions >= 1000
    if (metrics.impressions < 1000) return null;

    // 判断CPC是否异常高
    if (metrics.cpc <= benchmarks.avgCpc * 1.5) return null;

    const { ctr, cpm } = metrics;
    const { avgCtr, avgCpm } = benchmarks;

    // 分支1: 素材/受众问题
    if (ctr < avgCtr * 0.5) {
        return {
            scenario: 'CPC异常高',
            diagnosis: '素材/受众问题',
            action: '素材缺乏吸引力（前3秒完播率低）或受众疲劳\n1. 优化素材\n2. 优化受众',
            priority: 2,
            metrics: { ctr, cpc: metrics.cpc }
        };
    }

    // 分支2: 市场竞价/人群贵（CTR正常但CPM高）
    if (ctr >= avgCtr * 0.5 && cpm > avgCpm * 1.5) {
        return {
            scenario: 'CPC异常高',
            diagnosis: '市场竞价/人群贵',
            action: '素材表现正常，但市场竞争过热\n1. 放宽定向或避开竞价高峰',
            priority: 2,
            metrics: { cpm, cpc: metrics.cpc }
        };
    }

    return null;
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
    if (metrics.cpatc <= benchmarks.avgCpatc * 1.5) return null;

    const { atc_rate } = metrics;
    const { avgAtcRate } = benchmarks;

    // 素材与页面不符
    if (atc_rate < avgAtcRate * 0.5) {
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
            action: `预算被严重稀释：Campaign预算只有 $${context.campaignBudget.toFixed(0)} 但开了 ${context.adsetCount} 个组，平均每组 $${avgBudgetPerAdset.toFixed(0)} 无法支撑转化\n1. 关停表现差的组，集中预算\n2. 增加总预算`,
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
            action: `Delivery Issue (Spend Pacing: ${(spendPacing * 100).toFixed(0)}%)${frequencyNote}\n1. 出价过低：若使用 Cost Cap，建议提价\n2. 受众过窄/耗尽：检查 Frequency 是否过高，建议放宽定向\n3. 质量太差：检查质量分，被系统降权`,
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
 * @returns 详细诊断结果
 */
export const convertToDetailedDiagnostic = (
    result: DiagnosticResult,
    metrics: AggregatedMetrics,
    benchmarks: CampaignBenchmarks,
    context?: CampaignContext
): DiagnosticDetail => {
    const steps: DiagnosticStep[] = [];
    let subProblems: SubProblem[] | undefined;

    // 步骤0: 触发条件
    const prerequisiteStep = createPrerequisiteStep(result.scenario, metrics, benchmarks, context);
    if (prerequisiteStep) steps.push(prerequisiteStep);

    // 步骤1: 核心异常场景（仅场景1-4）
    if (['CPA异常高', 'CVR异常低', 'CPC异常高', 'CPATC异常高'].includes(result.scenario)) {
        steps.push(createScenarioStep(result, metrics, benchmarks));
    }

    // 步骤2-4: 下钻检查、判定、归因（根据场景不同）
    if (result.scenario === 'CPA异常高') {
        const drillDownSteps = createCPADrillDownSteps(result, metrics, benchmarks);
        if (drillDownSteps.subProblems) {
            subProblems = drillDownSteps.subProblems;
        } else {
            steps.push(...drillDownSteps.steps);
        }
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

    // 调试日志：检查步骤数组
    console.log("📊 Diagnostic Steps for", result.scenario, ":", steps.map(s => `Step ${s.stepNumber}: ${s.stepName}`).join(", "));


    return {
        ...result,
        steps,
        subProblems
    };
};

// ========== 辅助函数：创建各个步骤 ==========

function createPrerequisiteStep(
    scenario: string,
    metrics: AggregatedMetrics,
    benchmarks: CampaignBenchmarks,
    context?: CampaignContext
): DiagnosticStep | null {
    // 场景1-4的前提条件
    if (['CPA异常高', 'CVR异常低', 'CPC异常高', 'CPATC异常高'].includes(scenario)) {
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

    let description = '';
    let actualValue: number | undefined;
    let thresholdValue: number | undefined;

    if (result.scenario === 'CPA异常高') {
        actualValue = metrics.cpa;
        thresholdValue = benchmarks.avgCpa;
        const deviation = ((actualValue / thresholdValue - 1) * 100).toFixed(1);
        description = `当前CPA比基准高出${deviation}% `;
    } else if (result.scenario === 'CVR异常低') {
        actualValue = metrics.cvr;
        thresholdValue = benchmarks.avgCvr;
        const deviation = ((1 - actualValue / thresholdValue) * 100).toFixed(1);
        description = `当前CVR比基准低${deviation}% `;
    } else if (result.scenario === 'CPC异常高') {
        actualValue = metrics.cpc;
        thresholdValue = benchmarks.avgCpc;
        const deviation = ((actualValue / thresholdValue - 1) * 100).toFixed(1);
        description = `当前CPC比基准高出${deviation}% `;
    } else if (result.scenario === 'CPATC异常高') {
        actualValue = metrics.cpatc;
        thresholdValue = benchmarks.avgCpatc;
        const deviation = ((actualValue / thresholdValue - 1) * 100).toFixed(1);
        description = `当前CPATC比基准高出${deviation}% `;
    }

    return {
        stepNumber: 1,
        stepName: '核心异常场景',
        icon: icons[result.priority] || '🟡',
        content: {
            diagnosis: result.scenario + (result.diagnosis.includes('Double Kill') ? ' (Double Kill)' : ''),
            actualValue,
            thresholdValue,
            description
        }
    };
}

function createCPADrillDownSteps(
    result: DiagnosticResult,
    metrics: AggregatedMetrics,
    benchmarks: CampaignBenchmarks
): { steps: DiagnosticStep[]; subProblems?: SubProblem[] } {
    const { cpc, cvr } = metrics;
    const { avgCpc, avgCvr } = benchmarks;

    // Double Kill情况
    if (cpc > avgCpc * 1.5 && cvr < avgCvr * 0.5) {
        return {
            steps: [],
            subProblems: [
                {
                    name: '问题1: CPC异常高',
                    metric: 'CPC',
                    steps: [{
                        stepNumber: 2,
                        stepName: '下钻检查 - CPC',
                        icon: '🔸',
                        content: {
                            metric: 'CPC',
                            formula: 'Spend / Link Clicks',
                            calculation: `$${(metrics.spend || 0).toFixed(2)} / ${metrics.link_clicks || 0} = $${(cpc || 0).toFixed(2)}`,
                            condition: 'CPC > Benchmark 50%',
                            actualValue: cpc,
                            thresholdValue: avgCpc * 1.5,
                            result: true,
                            diagnosis: '流量成本过高'
                        }
                    }]
                },
                {
                    name: '问题2: CVR异常低',
                    metric: 'CVR',
                    steps: [{
                        stepNumber: 2,
                        stepName: '下钻检查 - CVR',
                        icon: '🔸',
                        content: {
                            metric: 'CVR',
                            formula: 'Purchases / Link Clicks',
                            calculation: `${metrics.purchases || 0} / ${metrics.link_clicks || 0} = ${((cvr || 0) * 100).toFixed(2)}%`,
                            condition: 'CVR < Benchmark × 0.5',
                            actualValue: cvr,
                            thresholdValue: avgCvr * 0.5,
                            result: true,
                            diagnosis: '转化能力不足'
                        }
                    }]
                }
            ]
        };
    }

    // 单一问题：CPC高
    if (cpc > avgCpc * 1.5) {
        return {
            steps: [
                {
                    stepNumber: 2,
                    stepName: '下钻检查指标',
                    icon: '📊',
                    content: {
                        metric: 'CPC'
                    }
                },
                {
                    stepNumber: 3,
                    stepName: '公式',
                    icon: '📐',
                    content: {
                        formula: 'CPC = Spend / Link Clicks',
                        calculation: `$${(metrics.spend || 0).toFixed(2)} / ${metrics.link_clicks || 0} = $${(cpc || 0).toFixed(2)}`
                    }
                },
                {
                    stepNumber: 4,
                    stepName: '判定条件',
                    icon: '✓',
                    content: {
                        condition: 'CPC > Benchmark 50%',
                        actualValue: cpc,
                        thresholdValue: avgCpc * 1.5,
                        result: true
                    }
                },
                {
                    stepNumber: 5,
                    stepName: '归因诊断',
                    icon: '🎯',
                    content: {
                        diagnosis: '流量成本过高'
                    }
                },
                {
                    stepNumber: 6,
                    stepName: 'Action建议',
                    icon: '💡',
                    content: {
                        actions: [
                            '1. 优化素材',
                            '2. 优化受众'
                        ]
                    }
                }
            ]
        };
    }

    // 单一问题：CVR低
    return {
        steps: [
            {
                stepNumber: 2,
                stepName: '下钻检查指标',
                icon: '📊',
                content: {
                    metric: 'CVR'
                }
            },
            {
                stepNumber: 3,
                stepName: '公式',
                icon: '📐',
                content: {
                    formula: 'CVR = Purchases / Link Clicks',
                    calculation: `${metrics.purchases || 0} / ${metrics.link_clicks || 0} = ${((cvr || 0) * 100).toFixed(2)}%`
                }
            },
            {
                stepNumber: 4,
                stepName: '判定条件',
                icon: '✓',
                content: {
                    condition: 'CVR < Benchmark 50%',
                    actualValue: cvr,
                    thresholdValue: avgCvr * 0.5,
                    result: true
                }
            },
            {
                stepNumber: 5,
                stepName: '归因诊断',
                icon: '🎯',
                content: {
                    diagnosis: '转化能力不足'
                }
            },
            {
                stepNumber: 6,
                stepName: 'Action建议',
                icon: '💡',
                content: {
                    actions: [
                        '1. 优化素材和落地页，提升CVR',
                        '2. 检查素材吸引力和产品匹配度'
                    ]
                }
            }
        ]
    };
}

function createCVRDrillDownSteps(
    result: DiagnosticResult,
    metrics: AggregatedMetrics,
    benchmarks: CampaignBenchmarks
): DiagnosticStep[] {
    const steps: DiagnosticStep[] = [];

    // 根据归因诊断确定下钻指标
    let metric = '';
    let formula = '';
    let calculation = '';
    let condition = '';
    let actualValue = 0;
    let thresholdValue = 0;

    if (result.diagnosis.includes('加载速度')) {
        metric = 'Click-to-PV Rate';
        formula = 'Landing Page Views / Link Clicks';
        actualValue = metrics.click_to_pv_rate || 0;
        thresholdValue = benchmarks.avgClickToPvRate * 0.5;
        calculation = `${metrics.landing_page_views || 0} / ${metrics.link_clicks} = ${(actualValue * 100).toFixed(2)}%`;
        condition = 'Click-to-PV Rate < Benchmark × 0.5';
    } else if (result.diagnosis.includes('吸引力')) {
        metric = 'ATC Rate';
        formula = 'Add to Carts / Landing Page Views';
        actualValue = metrics.atc_rate || 0;
        thresholdValue = benchmarks.avgAtcRate * 0.5;
        calculation = `${metrics.adds_to_cart} / ${metrics.landing_page_views || 0} = ${(actualValue * 100).toFixed(2)}%`;
        condition = 'ATC Rate < Benchmark × 0.5';
    } else if (result.diagnosis.includes('运费')) {
        metric = 'Checkout Rate';
        formula = 'Checkouts / Add to Carts';
        actualValue = metrics.checkout_rate || 0;
        thresholdValue = benchmarks.avgCheckoutRate * 0.5;
        calculation = `${metrics.checkouts_initiated} / ${metrics.adds_to_cart} = ${(actualValue * 100).toFixed(2)}%`;
        condition = 'Checkout Rate < Benchmark × 0.5';
    } else {
        metric = 'Purchase Rate';
        formula = 'Purchases / Checkouts';
        actualValue = metrics.purchase_rate || 0;
        thresholdValue = benchmarks.avgPurchaseRate * 0.5;
        calculation = `${metrics.purchases} / ${metrics.checkouts_initiated} = ${(actualValue * 100).toFixed(2)}%`;
        condition = 'Purchase Rate < Benchmark × 0.5';
    }

    steps.push({
        stepNumber: 2,
        stepName: '下钻检查指标',
        icon: '📊',
        content: { metric }
    });

    steps.push({
        stepNumber: 3,
        stepName: '公式',
        icon: '📐',
        content: { formula, calculation }
    });

    steps.push({
        stepNumber: 4,
        stepName: '判定条件',
        icon: '✓',
        content: {
            condition,
            actualValue,
            thresholdValue,
            result: true
        }
    });

    steps.push({
        stepNumber: 5,
        stepName: '归因诊断',
        icon: '🎯',
        content: {
            diagnosis: result.diagnosis
        }
    });

    steps.push({
        stepNumber: 6,
        stepName: 'Action建议',
        icon: '💡',
        content: {
            actions: result.action.split('\n').filter(a => a.trim())
        }
    });

    return steps;
}

function createCPCDrillDownSteps(
    result: DiagnosticResult,
    metrics: AggregatedMetrics,
    benchmarks: CampaignBenchmarks
): DiagnosticStep[] {
    return [
        {
            stepNumber: 2,
            stepName: '下钻检查指标',
            icon: '📊',
            content: {
                metric: 'CPC'
            }
        },
        {
            stepNumber: 3,
            stepName: '公式',
            icon: '📐',
            content: {
                formula: 'CPC = Spend / Link Clicks',
                calculation: `$${(metrics.spend || 0).toFixed(2)} / ${metrics.link_clicks || 0} = $${(metrics.cpc || 0).toFixed(2)}`
            }
        },
        {
            stepNumber: 5,
            stepName: '判定条件',
            icon: '✓',
            content: {
                condition: 'CPC > Benchmark 50%',
                actualValue: metrics.cpc,
                thresholdValue: benchmarks.avgCpc * 1.5,
                result: true
            }
        },
        {
            stepNumber: 5,
            stepName: '归因诊断',
            icon: '🎯',
            content: {
                diagnosis: result.diagnosis,
                description: '流量成本过高，影响整体效率'
            }
        }
    ,
        {
            stepNumber: 6,
            stepName: 'Action建议',
            icon: '💡',
            content: {
                actions: [
                    '1. 优化素材',
                    '2. 优化受众'
                ]
            }
        }
    ];
}

function createCPATCDrillDownSteps(
    result: DiagnosticResult,
    metrics: AggregatedMetrics,
    benchmarks: CampaignBenchmarks
): DiagnosticStep[] {
    return [
        {
            stepNumber: 2,
            stepName: '下钻检查指标',
            icon: '📊',
            content: {
                metric: 'CPATC'
            }
        },
        {
            stepNumber: 3,
            stepName: '公式',
            icon: '📐',
            content: {
                formula: 'CPATC = Spend / Add to Carts',
                calculation: `$${(metrics.spend || 0).toFixed(2)} / ${metrics.adds_to_cart || 0} = $${(metrics.cpatc || 0).toFixed(2)}`
            }
        },
        {
            stepNumber: 5,
            stepName: '判定条件',
            icon: '✓',
            content: {
                condition: 'CPATC > Benchmark 50%',
                actualValue: metrics.cpatc,
                thresholdValue: benchmarks.avgCpatc * 1.5,
                result: true
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
        }
    ,
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

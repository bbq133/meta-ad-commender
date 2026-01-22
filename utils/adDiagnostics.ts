/**
 * Ad 素材诊断引擎
 * 为"需要调整的素材"提供诊断流程
 */

import { DiagnosticStep, DiagnosticDetail, DiagnosticResult } from './campaignDiagnostics';

// Ad 诊断上下文
export interface AdDiagnosticContext {
    // 基础数据
    spend: number;              // 花费
    activeDays: number;         // 上线天数

    // Adset相关
    adsetBudget: number;        // Adset预算 (Campaign Budget / AdSet总数)
    activeAds: number;          // Adset中活跃的AD数量 (spend > 0)

    // 性能指标
    roi: number;                // ROI
    ctr: number;                // 点击率
    cvr: number;                // 转化率 (conversions / clicks × 100%)
    frequency: number;          // 频次

    // Benchmark（基准值）
    roiBenchmark: number;       // ROI基准 (原avgRoi)
    ctrBenchmark: number;       // CTR基准 (原avgCtr)
    cvrBenchmark: number;       // CVR基准
    frequencyBenchmark: number; // 频次基准

    // 视频相关（可选）
    isVideo: boolean;           // 是否为视频素材 (Ad name包含"video")
    videoPlayRate3s?: number;   // 3秒播放率 (可选)
    videoPlayRate3sBenchmark?: number; // 3秒播放率基准 (原avgVideoPlayRate3s)
}

// Ad 诊断场景枚举
export type AdDiagnosticScenario =
    | '投放时间过短'
    | '僵尸素材'
    | '开头流失'
    | '视觉不突出'
    | '点击党'
    | '低客单'
    | '爆款素材'
    | '素材疲劳'
    | '潜力/观察';

// Ad 诊断结果
export interface AdDiagnosticResult extends DiagnosticResult {
    scenario: AdDiagnosticScenario;
    subScenario?: string;  // 子场景 (如爆款素材的"当红爆款"或"衰退爆款")
}

/**
 * 主诊断函数 - 按优先级顺序检查8大场景 (P0-P7)
 */
export const diagnoseAd = (context: AdDiagnosticContext): AdDiagnosticResult | null => {
    // 按优先级顺序检查

    // P0. 检查投放时间过短（前置筛选）
    const timeResult = checkInsufficientTime(context);
    if (timeResult) return timeResult;

    // P1. 检查僵尸素材
    const zombieResult = checkZombieAd(context);
    if (zombieResult) return zombieResult;

    // P2. 检查开头流失/视觉不突出
    const visualResult = checkVisualIssue(context);
    if (visualResult) return visualResult;

    // P3. 检查点击党
    const clickPartyResult = checkClickParty(context);
    if (clickPartyResult) return clickPartyResult;

    // P4. 检查低客单
    const lowAOVResult = checkLowAOV(context);
    if (lowAOVResult) return lowAOVResult;

    // P5. 检查爆款素材
    const topResult = checkTopPerformer(context);
    if (topResult) return topResult;

    // P6. 检查素材疲劳
    const fatigueResult = checkAdFatigue(context);
    if (fatigueResult) return fatigueResult;

    // P7. 默认为潜力/观察
    return checkPotentialAd(context);
};

/**
 * 场景P0: 投放时间过短
 * 判定条件: Active Days < 48小时
 */
const checkInsufficientTime = (context: AdDiagnosticContext): AdDiagnosticResult | null => {
    const { activeDays } = context;

    if (activeDays < 2) {  // 48小时 = 2天
        return {
            scenario: '投放时间过短',
            diagnosis: '数据积累不足：素材上线时间太短，系统还在学习期，数据不具备分析意义。',
            action: `[动作] 让系统先跳过，不做判断

执行步骤：
1. 等待素材运行满48小时后再进行诊断。
2. 继续观察数据表现。
3. 不做任何干预。`,
            priority: 0  // P0
        };
    }
    return null;
};

/**
 * 场景P1: 僵尸素材
 * 判定条件: Spent < (Adset Budget / Active Ads) × 50% 且 Active Days > 48h
 */
const checkZombieAd = (context: AdDiagnosticContext): AdDiagnosticResult | null => {
    const { spend, activeDays, adsetBudget, activeAds } = context;

    // 计算理论分配预算
    const theoreticalBudget = adsetBudget / Math.max(activeAds, 1);
    const zombieThreshold = theoreticalBudget * 0.5;

    // 上线超过48小时且花费低于理论分配的50%
    if (activeDays > 2 && spend < zombieThreshold) {
        return {
            scenario: '僵尸素材',
            diagnosis: '系统判死刑：初始竞争力太弱，连展示机会都没有，无分析意义。',
            action: `[动作] 直接关停

执行步骤：
1. 无需任何挽救措施。
2. 直接在后台关停该素材/广告。
3. 腾出预算和坑位给新素材。`,
            priority: 1  // P1
        };
    }
    return null;
};

/**
 * 场景P2: 开头流失/视觉不突出
 * 判定条件: Spent > (Adset Budget / Active Ads) × 50% 且 ROI < Benchmark
 * 子场景: 视频素材检查3秒播放率，非视频素材检查CTR
 */
const checkVisualIssue = (context: AdDiagnosticContext): AdDiagnosticResult | null => {
    const { spend, adsetBudget, activeAds, roi, roiBenchmark, isVideo, videoPlayRate3s, videoPlayRate3sBenchmark, ctr, ctrBenchmark } = context;

    // 计算理论分配预算
    const theoreticalBudget = adsetBudget / Math.max(activeAds, 1);
    const spendThreshold = theoreticalBudget * 0.5;

    // 前提条件：花费超过理论分配的50% 且 ROI低于Benchmark
    if (spend <= spendThreshold || roi >= roiBenchmark) {
        return null;
    }

    // 视频素材：检查3秒播放率
    if (isVideo && videoPlayRate3s !== undefined && videoPlayRate3sBenchmark !== undefined) {
        if (videoPlayRate3s < videoPlayRate3sBenchmark) {
            return {
                scenario: '开头流失',
                diagnosis: '前3秒吸引力不足：流量入口堵塞，用户划走，浪费了中后段的好内容。',
                action: `[方案 C-01] 开头急救 SOP
(保留中后段，仅重做前3秒)

执行步骤：
1. 剪刀手：保留原视频的中后段核心卖点，仅剪掉前 3 秒。
2. 换头：替换为倒放画面、高对比度图片、或满屏大字幕提问。
3. 加料：在第 1 秒加入 "Stop!" 音效或 AI 语音提问。
4. 替换：制作成新变体上传。`,
                priority: 2  // P2
            };
        }
    }

    // 非视频素材：检查CTR
    if (!isVideo && ctr < ctrBenchmark) {
        return {
            scenario: '视觉不突出',
            diagnosis: '广告存在感弱，未能抓取用户注意力。',
            action: `[方案] 视觉改善

执行步骤：
a. 单图素材：
- 加Text Overlay：在图片显眼位置加色块文字，如 "50% OFF"、"Best Seller" 或痛点问句。
- 裁剪构图：放大产品细节或人物表情。
- 换背景色：如果产品是白色的，把背景换成高饱和度的亮色（如亮橙/紫）以跳脱出来。

b. 轮播素材：
- 换首图：把"效果最炸裂的图"或"痛点最痛的图"挪到第一张。
- 引导滑动：在第一张图的最右侧加一个箭头或半截图案，暗示用户"后面还有内容"，诱导滑动。

c. Collection素材：
- 换封面素材：选择最吸引眼球的图片作为封面。`,
            priority: 2  // P2
        };
    }

    return null;
};

/**
 * 场景P3: 点击党
 * 判定条件: CTR > Benchmark 且 CVR < Benchmark 且 ROI < Benchmark
 */
const checkClickParty = (context: AdDiagnosticContext): AdDiagnosticResult | null => {
    const { ctr, ctrBenchmark, cvr, cvrBenchmark, roi, roiBenchmark } = context;

    if (ctr > ctrBenchmark && cvr < cvrBenchmark && roi < roiBenchmark) {
        return {
            scenario: '点击党',
            diagnosis: '诱导性强：素材承诺与人群不匹配，或落地页无法承接流量。',
            action: `[方案 L-01] 下钻清洗与落地页检查 SOP

执行步骤：
1. 下钻：关停表现差的 AdSet 里的 ad。
2. 落地页：检查 Offer 一致性及死链。

详细检查项：
- 检查视频里承诺的优惠（如半价），落地页首屏是否第一眼可见。
- 点击广告链接，确保无 404 错误或白屏。
- 在落地页首屏增加安全支付图标或好评截图。`,
            priority: 3  // P3
        };
    }
    return null;
};

/**
 * 场景P4: 低客单
 * 判定条件: CTR > Benchmark 且 CVR > Benchmark 但 ROI < Benchmark
 */
const checkLowAOV = (context: AdDiagnosticContext): AdDiagnosticResult | null => {
    const { ctr, ctrBenchmark, cvr, cvrBenchmark, roi, roiBenchmark } = context;

    if (ctr > ctrBenchmark && cvr > cvrBenchmark && roi < roiBenchmark) {
        return {
            scenario: '低客单',
            diagnosis: '客单价太低：流量和转化都不错，但客单价拉低了整体ROI。',
            action: `[方案] 提升客单价

执行步骤：
1. 捆绑销售 (Bundle)：落地页增加 "Buy 2 Get 10% Off" 选项。
2. 加购 (Upsell)：在结账页增加高利润配件（如贴膜/电池）。
3. 换承接页：如果是落到 PDP，试试落到集合页。

详细策略：
- 在落地页/购物车页增加 "Frequently Bought Together" 组合购插件。
- 设置阶梯折扣（买2件9折）。
- 检查免邮门槛，将免邮门槛设定在 AOV 的 1.2 倍（如 AOV=$40 则免邮线设 $49）。
- 在购物车顶部加进度条提示 "再买$9免邮"。`,
            priority: 4  // P4
        };
    }
    return null;
};

/**
 * 场景P5: 爆款素材
 * 判定条件: ROI >= Benchmark
 */
const checkTopPerformer = (context: AdDiagnosticContext): AdDiagnosticResult | null => {
    const { roi, roiBenchmark, frequency } = context;

    if (roi >= roiBenchmark) {
        // 根据频次决定子场景
        if (frequency < 2.5) {
            return {
                scenario: '爆款素材',
                subScenario: '当红爆款',
                diagnosis: '全能选手：吸睛且带货，核心盈利资产。',
                action: `[分支执行] 频次 < 2.5 -> 执行扩量 SOP

执行步骤：
1. 保持投放：正常投放，可视情况扩量。
2. 延展：让设计师参考该素材制作类似素材。`,
                priority: 5  // P5
            };
        } else {
            return {
                scenario: '爆款素材',
                subScenario: '衰退爆款',
                diagnosis: '全能选手：吸睛且带货，但频次偏高需要迭代。',
                action: `[分支执行] 频次 >= 2.5 -> 执行迭代 SOP

执行步骤：
1. 保持投放：只要 ROI 为正，就保持投放。
2. 续命：参考【视觉刷新】制作变体，作为新素材补充流量。`,
                priority: 5  // P5
            };
        }
    }
    return null;
};

/**
 * 场景P6: 素材疲劳
 * 判定条件: Frequency > Benchmark 且 ROI < Benchmark
 */
const checkAdFatigue = (context: AdDiagnosticContext): AdDiagnosticResult | null => {
    const { roi, roiBenchmark, frequency, frequencyBenchmark } = context;

    if (frequency > frequencyBenchmark && roi < roiBenchmark) {
        return {
            scenario: '素材疲劳',
            diagnosis: '老素材衰退：受众产生视觉疲劳，效能耗尽。',
            action: `[方案 C-02] 视觉刷新 (复活术) SOP
(低成本翻新老素材)

执行步骤：
1. 镜像翻转：将视频画面水平左右翻转。
2. 变速：整体加速 1.2 倍，改变视频节奏。
3. 换滤镜：叠加一层暖色或冷色滤镜，或更换视频边框颜色。
4. 换声：更换背景音乐 (BGM) 或配音员性别。
5. 上架：完成上述修改后作为新素材上传，同时关停旧素材。`,
            priority: 6  // P6
        };
    }
    return null;
};

/**
 * 场景P7: 潜力/观察
 * 判定条件: 以上条件均不满足
 */
const checkPotentialAd = (context: AdDiagnosticContext): AdDiagnosticResult => {
    return {
        scenario: '潜力/观察',
        diagnosis: '系统寻优中：表现尚可但未跑出量，需要手动扶持。',
        action: `[方案 B-01] 强制拿量 SOP

执行步骤：
条件允许的情况下单独 Adset 投放（单独预算、改出价策略、提高出价等）

详细策略：
1. 新建组：复制原 AdSet，单独投放这一个素材。
2. 改策略：将出价策略改为 Cost Cap（成本上限）。
3. 设出价：出价设为 KPI 的 1.2 倍（例如目标 CPA $20，出价设 $24），强制系统给量测试。
4. 观察：等待消耗满 2 倍 CPA 后再做最终判断。`,
        priority: 7  // P7
    };
};

/**
 * 将诊断结果转换为详细步骤格式
 */
export const convertToAdDiagnosticDetail = (
    result: AdDiagnosticResult,
    context: AdDiagnosticContext
): DiagnosticDetail => {
    const steps: DiagnosticStep[] = [];

    // 步骤 0: 触发条件
    steps.push(createAdPrerequisiteStep(result.scenario, context));

    // 步骤 1: 核心场景
    steps.push(createAdScenarioStep(result));

    // 步骤 2: 归因诊断
    steps.push(createAdAttributionStep(result));

    // 步骤 3: Action建议
    steps.push(createAdActionStep(result));

    return {
        ...result,
        steps
    };
};

/**
 * 创建触发条件步骤
 */
function createAdPrerequisiteStep(scenario: AdDiagnosticScenario, context: AdDiagnosticContext): DiagnosticStep {
    const {
        spend, activeDays, adsetBudget, activeAds,
        videoPlayRate3s, videoPlayRate3sBenchmark,
        ctr, ctrBenchmark, cvr, cvrBenchmark,
        roi, roiBenchmark, frequency, frequencyBenchmark,
        isVideo
    } = context;

    let condition = '';
    let actualValue: number | undefined;
    let thresholdValue: number | undefined;
    let result = true;
    let description = '';

    // 计算理论分配预算
    const theoreticalBudget = adsetBudget / Math.max(activeAds, 1);
    const zombieThreshold = theoreticalBudget * 0.5;

    switch (scenario) {
        case '投放时间过短':
            condition = 'Active Days < 48h';
            actualValue = activeDays;
            thresholdValue = 2;
            description = `上线天数: ${activeDays}天`;
            break;
        case '僵尸素材':
            condition = 'Spent < (Adset Budget / Active Ads) × 50% 且 Active Days > 48h';
            actualValue = spend;
            thresholdValue = zombieThreshold;
            description = `Spend: $${spend.toFixed(2)}, 理论分配: $${theoreticalBudget.toFixed(2)}, 阈值: $${zombieThreshold.toFixed(2)}, 上线: ${activeDays}天`;
            break;
        case '开头流失':
            condition = 'Spent > (Budget/Ads)×50% 且 ROI < Benchmark 且 3秒播放率 < Benchmark';
            actualValue = videoPlayRate3s;
            thresholdValue = videoPlayRate3sBenchmark;
            description = `Spend: $${spend.toFixed(2)}, 3秒播放率: ${((videoPlayRate3s || 0) * 100).toFixed(1)}% (Benchmark: ${((videoPlayRate3sBenchmark || 0) * 100).toFixed(1)}%)`;
            break;
        case '视觉不突出':
            condition = 'Spent > (Budget/Ads)×50% 且 ROI < Benchmark 且 CTR < Benchmark';
            actualValue = ctr;
            thresholdValue = ctrBenchmark;
            description = `Spend: $${spend.toFixed(2)}, CTR: ${(ctr * 100).toFixed(2)}% (Benchmark: ${(ctrBenchmark * 100).toFixed(2)}%)`;
            break;
        case '点击党':
            condition = 'CTR > Benchmark 且 CVR < Benchmark 且 ROI < Benchmark';
            actualValue = cvr;
            thresholdValue = cvrBenchmark;
            description = `CTR: ${(ctr * 100).toFixed(2)}% (Benchmark: ${(ctrBenchmark * 100).toFixed(2)}%), CVR: ${(cvr * 100).toFixed(2)}% (Benchmark: ${(cvrBenchmark * 100).toFixed(2)}%), ROI: ${roi.toFixed(2)}x (Benchmark: ${roiBenchmark.toFixed(2)}x)`;
            break;
        case '低客单':
            condition = 'CTR > Benchmark 且 CVR > Benchmark 但 ROI < Benchmark';
            actualValue = roi;
            thresholdValue = roiBenchmark;
            description = `CTR: ${(ctr * 100).toFixed(2)}% (Benchmark: ${(ctrBenchmark * 100).toFixed(2)}%), CVR: ${(cvr * 100).toFixed(2)}% (Benchmark: ${(cvrBenchmark * 100).toFixed(2)}%), ROI: ${roi.toFixed(2)}x (Benchmark: ${roiBenchmark.toFixed(2)}x)`;
            break;
        case '爆款素材':
            condition = 'ROI >= Benchmark';
            actualValue = roi;
            thresholdValue = roiBenchmark;
            description = `ROI: ${roi.toFixed(2)}x (Benchmark: ${roiBenchmark.toFixed(2)}x), 频次: ${frequency.toFixed(1)}`;
            break;
        case '素材疲劳':
            condition = '频次 > Benchmark 且 ROI < Benchmark';
            actualValue = frequency;
            thresholdValue = frequencyBenchmark;
            description = `频次: ${frequency.toFixed(1)} (Benchmark: ${frequencyBenchmark.toFixed(1)}), ROI: ${roi.toFixed(2)}x (Benchmark: ${roiBenchmark.toFixed(2)}x)`;
            break;
        case '潜力/观察':
            condition = '以上条件均不满足';
            description = `ROI: ${roi.toFixed(2)}x, 频次: ${frequency.toFixed(1)}, 上线: ${activeDays}天`;
            break;
    }

    return {
        stepNumber: 0,
        stepName: '触发条件',
        icon: '🔍',
        content: {
            condition,
            actualValue,
            thresholdValue,
            result,
            description
        }
    };
}

/**
 * 创建核心场景步骤
 */
function createAdScenarioStep(result: AdDiagnosticResult): DiagnosticStep {
    const priorityIcons: { [key: number]: string } = {
        1: '🔴',
        2: '🟡',
        3: '🟢'
    };

    let scenarioName = result.scenario;
    if (result.subScenario) {
        scenarioName += ` (${result.subScenario})`;
    }

    return {
        stepNumber: 1,
        stepName: '核心场景',
        icon: priorityIcons[result.priority] || '🟡',
        content: {
            diagnosis: scenarioName
        }
    };
}

/**
 * 创建归因诊断步骤
 */
function createAdAttributionStep(result: AdDiagnosticResult): DiagnosticStep {
    return {
        stepNumber: 2,
        stepName: '归因诊断',
        icon: '🔎',
        content: {
            diagnosis: result.diagnosis.split('：')[0],  // 取冒号前的简短诊断
            description: result.diagnosis
        }
    };
}

/**
 * 创建Action建议步骤
 */
function createAdActionStep(result: AdDiagnosticResult): DiagnosticStep {
    // 将 action 文本分割成列表项
    const actionLines = result.action.split('\n').filter(line => line.trim());

    return {
        stepNumber: 3,
        stepName: 'Action建议',
        icon: '💡',
        content: {
            actions: actionLines
        }
    };
}

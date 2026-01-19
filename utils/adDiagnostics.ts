/**
 * Ad 素材诊断引擎
 * 为"需要调整的素材"提供诊断流程
 */

import { DiagnosticStep, DiagnosticDetail, DiagnosticResult } from './campaignDiagnostics';

// Ad 诊断上下文
export interface AdDiagnosticContext {
    spend: number;              // 花费
    roi: number;                // ROI
    avgRoi: number;             // 业务线平均 ROI
    ctr: number;                // 点击率
    avgCtr: number;             // 业务线平均点击率
    frequency: number;          // 频次
    activeDays: number;         // 上线天数
    videoPlayRate3s?: number;   // 3秒播放率 (可选)
    avgVideoPlayRate3s?: number; // 业务线平均3秒播放率 (可选)
}

// Ad 诊断场景枚举
export type AdDiagnosticScenario =
    | '僵尸素材'
    | '开头流失'
    | '点击欺诈/诱导'
    | '爆款素材'
    | '素材疲劳'
    | '潜力/观察';

// Ad 诊断结果
export interface AdDiagnosticResult extends DiagnosticResult {
    scenario: AdDiagnosticScenario;
    subScenario?: string;  // 子场景 (如爆款素材的"当红爆款"或"衰退爆款")
}

/**
 * 主诊断函数 - 按优先级顺序检查6大场景
 */
export const diagnoseAd = (context: AdDiagnosticContext): AdDiagnosticResult | null => {
    // 按优先级顺序检查

    // 1. 检查僵尸素材 (最高优先级)
    const zombieResult = checkZombieAd(context);
    if (zombieResult) return zombieResult;

    // 2. 检查开头流失
    const introResult = checkIntroDropOff(context);
    if (introResult) return introResult;

    // 3. 检查点击欺诈/诱导
    const fraudResult = checkClickFraud(context);
    if (fraudResult) return fraudResult;

    // 4. 检查爆款素材
    const topResult = checkTopPerformer(context);
    if (topResult) return topResult;

    // 5. 检查素材疲劳
    const fatigueResult = checkAdFatigue(context);
    if (fatigueResult) return fatigueResult;

    // 6. 默认为潜力/观察
    return checkPotentialAd(context);
};

/**
 * 场景1: 僵尸素材
 * 判定条件: Spend < $10 且 上线 > 48h
 */
const checkZombieAd = (context: AdDiagnosticContext): AdDiagnosticResult | null => {
    const { spend, activeDays } = context;

    // 上线超过48小时 = 2天
    if (spend < 10 && activeDays > 2) {
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
 * 场景2: 开头流失
 * 判定条件: Spend > $10 且 3秒播放率 < 20%
 */
const checkIntroDropOff = (context: AdDiagnosticContext): AdDiagnosticResult | null => {
    const { spend, videoPlayRate3s } = context;

    // 如果没有3秒播放率数据，跳过此场景
    if (videoPlayRate3s === undefined) return null;

    if (spend > 10 && videoPlayRate3s < 0.2) {
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
    return null;
};

/**
 * 场景3: 点击欺诈/诱导
 * 判定条件: 3秒率达标 且 CTR > 全局平均 且 ROI < 全局平均 * 0.8
 */
const checkClickFraud = (context: AdDiagnosticContext): AdDiagnosticResult | null => {
    const { ctr, avgCtr, roi, avgRoi, videoPlayRate3s } = context;

    // 3秒率达标 (>=20%) 或没有3秒率数据时按达标处理
    const videoPlayRateOk = videoPlayRate3s === undefined || videoPlayRate3s >= 0.2;

    if (videoPlayRateOk && ctr > avgCtr && roi < avgRoi * 0.8) {
        return {
            scenario: '点击欺诈/诱导',
            diagnosis: '诱导性过强：素材承诺与人群不匹配，或落地页无法承接流量。',
            action: `[方案 L-01] 下钻清洗与落地页检查 SOP

执行步骤：
1. 下钻诊断：检查该素材在各 AdSet 的表现。若仅在某人群组 ROI 极低，关停该组；若全线低，关停素材。
2. 一致性核对：检查视频里承诺的优惠（如半价），落地页首屏是否第一眼可见。
3. 死链排查：点击广告链接，确保无 404 错误或白屏。
4. 信任增强：在落地页首屏增加安全支付图标或好评截图。`,
            priority: 3  // P3
        };
    }
    return null;
};

/**
 * 场景4: 爆款素材
 * 判定条件: ROI >= 全局平均
 */
const checkTopPerformer = (context: AdDiagnosticContext): AdDiagnosticResult | null => {
    const { roi, avgRoi, frequency } = context;

    if (roi >= avgRoi) {
        // 根据频次决定子场景
        if (frequency < 2.5) {
            return {
                scenario: '爆款素材',
                subScenario: '当红爆款',
                diagnosis: '全能选手：吸睛且带货，核心盈利资产。',
                action: `[分支执行] 频次 < 2.5 -> 执行 [C-Scale] 扩量 SOP

执行步骤：
1. 复制：将该素材 ID 复制到 CBO (Scaling Campaign) 中。
2. 加预算：所在的 AdSet 预算提升 20% (每 24h 操作一次)。
3. 延展：通知剪辑师基于此脚本制作 3 个微调变体。`,
                priority: 4  // P4
            };
        } else {
            return {
                scenario: '爆款素材',
                subScenario: '衰退爆款',
                diagnosis: '全能选手：吸睛且带货，但频次偏高需要迭代。',
                action: `[分支执行] 频次 >= 2.5 -> 执行 [C-Iterate] 迭代 SOP

执行步骤：
1. 勿关停：只要 ROI 为正，绝对不要关停。
2. 续命：参考下方 [C-02] 手法制作变体，作为新素材补充流量。`,
                priority: 4  // P4
            };
        }
    }
    return null;
};

/**
 * 场景5: 素材疲劳
 * 判定条件: Freq > 2.5 且 ROI < 全局平均
 */
const checkAdFatigue = (context: AdDiagnosticContext): AdDiagnosticResult | null => {
    const { roi, avgRoi, frequency } = context;

    if (frequency > 2.5 && roi < avgRoi) {
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
            priority: 5  // P5
        };
    }
    return null;
};

/**
 * 场景6: 潜力/观察
 * 判定条件: 以上条件均不满足
 */
const checkPotentialAd = (context: AdDiagnosticContext): AdDiagnosticResult => {
    return {
        scenario: '潜力/观察',
        diagnosis: '系统寻优中：表现尚可但未跑出量，需要手动扶持。',
        action: `[方案 B-01] 强制拿量 SOP

执行步骤：
1. 新建组：复制原 AdSet，单独投放这一个素材。
2. 改策略：将出价策略改为 Cost Cap (成本上限)。
3. 设出价：出价设为 KPI 的 1.2 倍 (例如目标 CPA $20，出价设 $24)，强制系统给量测试。
4. 观察：等待消耗满 2 倍 CPA 后再做最终判断。`,
        priority: 6  // P6
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
    const { spend, activeDays, videoPlayRate3s, ctr, avgCtr, roi, avgRoi, frequency } = context;

    let condition = '';
    let actualValue: number | undefined;
    let thresholdValue: number | undefined;
    let result = true;
    let description = '';

    switch (scenario) {
        case '僵尸素材':
            condition = 'Spend < $10 且 上线 > 48h';
            actualValue = spend;
            thresholdValue = 10;
            description = `Spend: $${spend.toFixed(2)}, 上线天数: ${activeDays}`;
            break;
        case '开头流失':
            condition = 'Spend > $10 且 3秒播放率 < 20%';
            actualValue = videoPlayRate3s;
            thresholdValue = 0.2;
            description = `Spend: $${spend.toFixed(2)}, 3秒播放率: ${((videoPlayRate3s || 0) * 100).toFixed(1)}%`;
            break;
        case '点击欺诈/诱导':
            condition = '3秒率达标 且 CTR > 全局平均 且 ROI < 全局平均×0.8';
            actualValue = roi;
            thresholdValue = avgRoi * 0.8;
            description = `CTR: ${(ctr * 100).toFixed(2)}% (全局Avg: ${(avgCtr * 100).toFixed(2)}%), ROI: ${roi.toFixed(2)}x (全局Avg×0.8: ${(avgRoi * 0.8).toFixed(2)}x)`;
            break;
        case '爆款素材':
            condition = 'ROI >= 全局平均';
            actualValue = roi;
            thresholdValue = avgRoi;
            description = `ROI: ${roi.toFixed(2)}x (全局Avg: ${avgRoi.toFixed(2)}x), 频次: ${frequency.toFixed(1)}`;
            break;
        case '素材疲劳':
            condition = '频次 > 2.5 且 ROI < 全局平均';
            actualValue = frequency;
            thresholdValue = 2.5;
            description = `频次: ${frequency.toFixed(1)}, ROI: ${roi.toFixed(2)}x (全局Avg: ${avgRoi.toFixed(2)}x)`;
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

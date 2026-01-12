// AI 智能诊断 - 数据统计工具
// 用于将 Action Items 数据转换为 AI 可分析的摘要格式

import { ActionItemsResult, ActionCampaign } from './actionItemsUtils';

/**
 * 诊断详情（简化版，用于AI分析）
 */
export interface DiagnosticDetail {
    campaignName: string;
    priority: 'P0' | 'P1' | null;
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

    // 问题分类统计
    problemCategories: {
        category: string;      // 问题类别
        count: number;         // 数量
        percentage: number;    // 占比
        examples: string[];    // 示例描述
    }[];

    // Action 摘要
    topActions: {
        priority: 'P0' | 'P1';
        action: string;
        count: number;
    }[];

    // 诊断详情
    diagnosticDetails: DiagnosticDetail[];
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
 * 从 Action Items 数据中生成数据摘要
 */
export function generateDataSummary(
    result: ActionItemsResult,
    diagnosticsMap: Map<string, DiagnosticDetail[]>  // campaignId -> diagnosticDetails
): DataSummary {
    const campaigns = result.campaigns;

    // 基础统计
    const totalCampaigns = campaigns.length;
    const totalSpend = campaigns.reduce((sum, c) => sum + c.spend, 0);
    const p0Count = campaigns.filter(c => c.priority === 'P0').length;
    const p1Count = campaigns.filter(c => c.priority === 'P1').length;

    // 问题分类统计
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
    const actionMap = new Map<string, { priority: 'P0' | 'P1'; count: number }>();

    diagnosticsMap.forEach((diagResults, campaignId) => {
        const campaign = campaigns.find(c => c.id === campaignId);
        const priority = campaign?.priority as 'P0' | 'P1' | null;

        if (!priority) return;

        diagResults.forEach(diag => {
            const actionKey = simplifyAction(diag.action);

            if (!actionMap.has(actionKey)) {
                actionMap.set(actionKey, { priority, count: 0 });
            }

            const existing = actionMap.get(actionKey)!;
            existing.count++;
            // 如果有 P0 级别的，优先使用 P0
            if (priority === 'P0') {
                existing.priority = 'P0';
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
                priority: campaign?.priority || null,
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
        problemCategories,
        topActions,
        diagnosticDetails
    };
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

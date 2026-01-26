// Gemini API Service
// 用于调用 Google Gemini API 生成 AI 智能诊断报告

import { GoogleGenerativeAI } from '@google/generative-ai';
import { DataSummary, DiagnosticDetail } from '../utils/aiSummaryUtils';

/**
 * AI 总结结果
 */
export interface AISummaryResult {
    conclusion: string;           // 今日诊断结论
    campaignProblems: {           // Campaign 问题
        p0: {
            description: string;  // 描述：X条 (P0优先级)
            campaigns: string[];  // Campaign 名称列表
        };
        p1: {
            description: string;  // 描述：X条 (P1优先级)
            campaigns: string[];  // Campaign 名称列表
        };
        p2: {
            description: string;  // 描述：X条 (P2优先级)
            campaigns: string[];  // Campaign 名称列表
        };
    };
    materialIssues: {             // 素材情况
        category: string;         // 问题类型
        percentage: string;       // 占比
        suggestion: string;       // 建议
        ads: string[];            // Ad 名称列表
    }[];
}

/**
 * Gemini API Service
 */
export class GeminiService {
    private genAI: GoogleGenerativeAI;
    private model: any;

    constructor(apiKey: string) {
        this.genAI = new GoogleGenerativeAI(apiKey);
        this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    }

    /**
     * 生成调优概览总结
     */
    async generateOptimizationSummary(dataSummary: DataSummary): Promise<AISummaryResult> {
        const prompt = this.buildPrompt(dataSummary);

        try {
            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();

            return this.parseResponse(text, dataSummary);
        } catch (error) {
            console.error('Gemini API error:', error);
            throw error;
        }
    }

    /**
     * 构建 Prompt
     */
    private buildPrompt(summary: DataSummary): string {
        // Campaign 按优先级分类
        const p0CampaignsText = summary.campaignsByPriority.p0Campaigns.length > 0
            ? summary.campaignsByPriority.p0Campaigns.map((name, i) => `  ${i + 1}. ${name}`).join('\n')
            : '  暂无';
        const p1CampaignsText = summary.campaignsByPriority.p1Campaigns.length > 0
            ? summary.campaignsByPriority.p1Campaigns.map((name, i) => `  ${i + 1}. ${name}`).join('\n')
            : '  暂无';
        const p2CampaignsText = summary.campaignsByPriority.p2Campaigns.length > 0
            ? summary.campaignsByPriority.p2Campaigns.map((name, i) => `  ${i + 1}. ${name}`).join('\n')
            : '  暂无';

        // 素材问题分类
        const materialIssuesText = summary.materialIssues.length > 0
            ? summary.materialIssues.map(issue => `- ${issue.category}: ${issue.count}条 (${issue.percentage.toFixed(1)}%)\n  建议: ${issue.suggestions.slice(0, 2).join('; ')}`).join('\n')
            : '- 暂无Ad层级数据';

        // 问题分类信息
        const problemsText = summary.problemCategories.length > 0
            ? summary.problemCategories.map(p => `- ${p.category}: ${p.count}条 (${p.percentage.toFixed(1)}%)`).join('\n')
            : '- 暂无明确的问题分类';

        // 问题详情示例
        const examplesText = summary.problemCategories.length > 0
            ? summary.problemCategories.slice(0, 3).map(p => `
### ${p.category}
${p.examples.map((ex, i) => `${i + 1}. ${ex}`).join('\n')}
`).join('\n')
            : '暂无示例';

        // Action 建议
        const actionsText = summary.topActions.length > 0
            ? summary.topActions.map((a, i) => `${i + 1}. [${a.priority}] ${a.action} (影响 ${a.count} 条Campaign)`).join('\n')
            : '- 暂无高频Action建议';

        // 诊断详情
        const diagDetailsText = summary.diagnosticDetails.length > 0
            ? summary.diagnosticDetails.slice(0, 50).map((d, i) => `
${i + 1}. Campaign: ${d.campaignName}
   - 优先级: ${d.priority || '无'}
   - 场景: ${d.scenario}
   - 诊断: ${d.diagnosis}
   - 建议: ${d.action}
`).join('\n')
            : '暂无详细诊断数据';

        return `你是Meta广告优化专家。请根据以下数据生成一份简洁的调优概览报告。

## 📊 数据概况

- Campaign总数: ${summary.totalCampaigns}
- 总花费: $${summary.totalSpend.toFixed(2)}
- P0优先级（立即关停）: ${summary.p0Count} 条
- P1优先级（下调预算）: ${summary.p1Count} 条
- P2优先级（保持观察）: ${summary.p2Count} 条

## 🎯 Campaign 按优先级分类

### P0 - 立即关停 (${summary.p0Count}条)
${p0CampaignsText}

### P1 - 下调预算 (${summary.p1Count}条)
${p1CampaignsText}

### P2 - 保持观察 (${summary.p2Count}条)
${p2CampaignsText}

## 🎨 素材问题分类统计

${materialIssuesText}

## 🔍 Campaign问题分类统计

${problemsText}

问题详情示例：
${examplesText}

## 💡 高频 Action 建议

${actionsText}

## 📋 Campaign 诊断详情

${diagDetailsText}

## 🎨 Ad 素材诊断详情（按问题分类）

${summary.materialIssues.length > 0 ? summary.materialIssues.map((issue, i) => `
### ${i + 1}. ${issue.category} (${issue.percentage.toFixed(0)}%)
相关 Ad 名称（前10个）：
${issue.adNames.slice(0, 10).map((name, j) => `  ${j + 1}. ${name}`).join('\n')}
建议：${issue.suggestions.length > 0 ? issue.suggestions[0] : '排查相关素材'}
`).join('\n') : '暂无 Ad 层级诊断数据'}

---

请生成以下内容（严格按照JSON格式输出）：

\`\`\`json
{
  "conclusion": "系统扫描显示${summary.totalCampaigns}条 Campaign 触发 ROI 预警，涉及风险消耗 $${summary.totalSpend.toFixed(2)}",
  "campaignProblems": {
    "p0": {
      "description": "${summary.p0Count}条 (P0优先级)",
      "campaigns": ["Campaign名称1", "Campaign名称2", "Campaign名称3"]
    },
    "p1": {
      "description": "${summary.p1Count}条 (P1优先级)",
      "campaigns": ["Campaign名称1", "Campaign名称2"]
    },
    "p2": {
      "description": "${summary.p2Count}条 (P2优先级)",
      "campaigns": ["Campaign名称1", "Campaign名称2"]
    }
  },
  "materialIssues": [
    {
      "category": "僵尸素材",
      "percentage": "25%",
      "suggestion": "建议直接关停该素材",
      "ads": ["Ad名称1", "Ad名称2", "Ad名称3"]
    },
    {
      "category": "开头流失",
      "percentage": "20%",
      "suggestion": "建议重做前3秒内容",
      "ads": ["Ad名称4", "Ad名称5"]
    }
  ]
}
\`\`\`

要求：
1. **conclusion** 格式固定：系统扫描显示XX条 Campaign 触发 ROI 预警，涉及风险消耗 $XXX
2. **campaignProblems** 必须包含 p0、p1、p2 三个对象
   - 每个对象包含 description（描述）和 campaigns（Campaign名称数组）
   - 从上面提供的 "Campaign 按优先级分类" 数据中提取对应优先级的Campaign名称
   - campaigns 数组包含所有对应优先级的Campaign名称，不要遗漏
3. **materialIssues** 数组列出2-3个最严重的素材问题
   - 每个对象包含：category（问题类型）、percentage（占比）、suggestion（建议）、ads（Ad名称数组）
   - 从上面提供的 "素材问题分类统计" 数据中提取问题类型、占比和建议
   - 注意：ads 数组应该包含 Ad 名称，不是 Campaign 名称
   - ads 数组包含所有相关的Ad名称，不要遗漏
4. 使用简洁的商业语言，突出数据
5. 严格使用JSON格式

请直接输出JSON，不要有任何其他文字。`;
    }

    /**
     * 解析 AI 响应
     */
    private parseResponse(text: string, summary: DataSummary): AISummaryResult {
        try {
            // 清理响应文本
            let cleanText = text.trim();

            // 移除可能的 markdown 代码块标记
            cleanText = cleanText.replace(/```json\s*/gi, '');
            cleanText = cleanText.replace(/```\s*/g, '');
            cleanText = cleanText.trim();

            const parsed = JSON.parse(cleanText);

            return {
                conclusion: parsed.conclusion || this.generateFallbackConclusion(summary),
                campaignProblems: parsed.campaignProblems || {
                    p0: {
                        description: `${summary.p0Count}条 (P0优先级)`,
                        campaigns: summary.campaignsByPriority.p0Campaigns
                    },
                    p1: {
                        description: `${summary.p1Count}条 (P1优先级)`,
                        campaigns: summary.campaignsByPriority.p1Campaigns
                    },
                    p2: {
                        description: `${summary.p2Count}条 (P2优先级)`,
                        campaigns: summary.campaignsByPriority.p2Campaigns
                    }
                },
                materialIssues: Array.isArray(parsed.materialIssues) ? parsed.materialIssues : []
            };
        } catch (error) {
            console.error('Failed to parse AI response:', error);
            console.log('Raw response:', text);

            // 降级处理：使用本地生成
            return this.generateFallbackResult(summary);
        }
    }

    /**
     * 生成降级结论
     */
    private generateFallbackConclusion(summary: DataSummary): string {
        return `系统扫描显示 ${summary.totalCampaigns} 条 Campaign 触发预警，涉及风险消耗 $${summary.totalSpend.toFixed(2)}。`;
    }

    /**
     * 生成降级结果
     */
    private generateFallbackResult(summary: DataSummary): AISummaryResult {
        // 生成素材问题列表（使用已有的 adNames）
        const materialIssues: AISummaryResult['materialIssues'] = [];
        if (summary.materialIssues.length > 0) {
            summary.materialIssues.slice(0, 3).forEach(issue => {
                const suggestion = issue.suggestions.length > 0 ? issue.suggestions[0] : '建议排查相关素材';
                materialIssues.push({
                    category: issue.category,
                    percentage: `${issue.percentage.toFixed(0)}%`,
                    suggestion,
                    ads: issue.adNames
                });
            });
        }

        // 如果没有素材问题，添加默认提示
        if (materialIssues.length === 0) {
            materialIssues.push({
                category: '暂无Ad层级诊断数据',
                percentage: '0%',
                suggestion: '',
                ads: []
            });
        }

        return {
            conclusion: this.generateFallbackConclusion(summary),
            campaignProblems: {
                p0: {
                    description: `${summary.p0Count}条 (P0优先级)`,
                    campaigns: summary.campaignsByPriority.p0Campaigns
                },
                p1: {
                    description: `${summary.p1Count}条 (P1优先级)`,
                    campaigns: summary.campaignsByPriority.p1Campaigns
                },
                p2: {
                    description: `${summary.p2Count}条 (P2优先级)`,
                    campaigns: summary.campaignsByPriority.p2Campaigns
                }
            },
            materialIssues
        };
    }

    /**
     * 生成降级的 MaterialIssues 列表
     */
    private generateFallbackMaterialIssues(summary: DataSummary): AISummaryResult['materialIssues'] {
        const materialIssues: AISummaryResult['materialIssues'] = [];
        if (summary.materialIssues.length > 0) {
            summary.materialIssues.slice(0, 3).forEach(issue => {
                const relatedAds = summary.diagnosticDetails
                    .filter(d => d.scenario.includes(issue.category))
                    .map(d => d.campaignName);

                const suggestion = issue.suggestions.length > 0 ? issue.suggestions[0] : '建议排查相关素材';
                materialIssues.push({
                    category: issue.category,
                    percentage: `${issue.percentage.toFixed(0)}%`,
                    suggestion,
                    ads: relatedAds
                });
            });
        }

        if (materialIssues.length === 0) {
            materialIssues.push({
                category: '暂无Ad层级诊断数据',
                percentage: '0%',
                suggestion: '',
                ads: []
            });
        }
        return materialIssues;
    }

    /**
     * 批量总结 Campaign 诊断（归因诊断 + Action）
     */
    async summarizeCampaignDiagnostics(
        campaigns: Array<{ id: string; campaignName: string; diagnostics: DiagnosticDetail[] }>
    ): Promise<Map<string, { attribution: string; action: string }>> {
        // 构建批量 Prompt
        const campaignsData = campaigns.map((c, i) => {
            const diagText = c.diagnostics.map(d =>
                `  - 场景: ${d.scenario}\n    诊断: ${d.diagnosis}\n    建议: ${d.action}`
            ).join('\n');

            return `Campaign ${i + 1} (ID: ${c.id})
名称: ${c.campaignName.substring(0, 50)}${c.campaignName.length > 50 ? '...' : ''}
诊断详情:
${diagText}`;
        }).join('\n\n---\n\n');

        const prompt = `你是Meta广告优化专家。请为以下每个Campaign生成归因诊断总结和Action总结。

${campaignsData}

要求：
1. 为每个Campaign分别生成归因诊断和Action总结
2. **归因诊断**：用"疑似："开头，简洁总结主要问题和原因，不超过50字
   - 格式示例：疑似：开头流失 (素材前3秒不抓人)\n疑似：受众/竞价问题 (买贵了)
   - 每个问题单独一行，使用 \n 换行分隔
3. **Action总结**：提炼关键执行步骤，使用编号列表，不超过80字
   - 格式示例：1. 查：后台 3s播放率\n2. 动：若 <20%，保留受众，仅重做视频前3秒
4. 严格按JSON格式输出

输出格式（必须严格遵守）：
\`\`\`json
{
  "campaign_id_1": {
    "attribution": "疑似：问题1 (原因1)、问题2 (原因2)",
    "action": "1. 查：xxx\\n2. 动：xxx"
  },
  "campaign_id_2": {
    "attribution": "疑似：...",
    "action": "1. 查：...\\n2. 动：..."
  }
}
\`\`\`

请直接输出JSON，不要有任何其他文字。`;

        try {
            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();

            return this.parseCampaignSummaries(text, campaigns);
        } catch (error) {
            console.error('Gemini API error in summarizeCampaignDiagnostics:', error);
            // 降级：返回空 Map
            return new Map();
        }
    }

    /**
     * 解析 Campaign 总结响应
     */
    private parseCampaignSummaries(
        text: string,
        campaigns: Array<{ id: string; diagnostics: DiagnosticDetail[] }>
    ): Map<string, { attribution: string; action: string }> {
        try {
            // 清理响应文本
            let cleanText = text.trim();
            cleanText = cleanText.replace(/```json\s*/gi, '');
            cleanText = cleanText.replace(/```\s*/g, '');
            cleanText = cleanText.trim();

            const parsed = JSON.parse(cleanText);
            const summaries = new Map<string, { attribution: string; action: string }>();

            // 将解析结果转换为 Map
            Object.entries(parsed).forEach(([id, value]: [string, any]) => {
                if (value && typeof value === 'object') {
                    summaries.set(id, {
                        attribution: value.attribution || '-',
                        action: value.action || '-'
                    });
                }
            });

            return summaries;
        } catch (error) {
            console.error('Failed to parse campaign summaries:', error);
            console.log('Raw response:', text);

            // 降级：使用简单文本拼接
            return this.generateFallbackCampaignSummaries(campaigns);
        }
    }

    /**
     * 生成降级的 Campaign 总结
     */
    private generateFallbackCampaignSummaries(
        campaigns: Array<{ id: string; diagnostics: DiagnosticDetail[] }>
    ): Map<string, { attribution: string; action: string }> {
        const summaries = new Map<string, { attribution: string; action: string }>();

        campaigns.forEach(c => {
            if (c.diagnostics.length === 0) {
                summaries.set(c.id, { attribution: '-', action: '-' });
                return;
            }

            // 归因诊断拼接
            const attribution = c.diagnostics
                .map(d => {
                    const scenarioName = d.scenario || '';
                    const diagnosisPart = d.diagnosis?.split('：')[1] || d.diagnosis || '';
                    return scenarioName && diagnosisPart
                        ? `疑似：${scenarioName} (${diagnosisPart.substring(0, 20)}...)`
                        : '';
                })
                .filter(Boolean)
                .join('、') || '-';

            // Action 拼接
            const action = c.diagnostics
                .map(d => {
                    if (!d.action) return '';
                    const lines = d.action.split('\n').filter(l => l.trim());
                    return lines.slice(0, 3).join('\n');
                })
                .filter(Boolean)
                .join('\n---\n') || '-';

            summaries.set(c.id, { attribution, action });
        });

        return summaries;
    }
}

/**
 * 创建 Gemini Service 实例
 */
export function createGeminiService(apiKey: string): GeminiService {
    return new GeminiService(apiKey);
}

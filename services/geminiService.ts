// Gemini API Service
// 用于调用 Google Gemini API 生成 AI 智能诊断报告

import { GoogleGenerativeAI } from '@google/generative-ai';
import { DataSummary, DiagnosticDetail } from '../utils/aiSummaryUtils';

/**
 * AI 总结结果
 */
export interface AISummaryResult {
    conclusion: string;      // 今日诊断结论
    mainProblems: string[];  // 主要问题列表
    suggestions: string;     // 建议
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
            ? summary.diagnosticDetails.slice(0, 8).map((d, i) => `
${i + 1}. Campaign: ${d.campaignName.substring(0, 40)}${d.campaignName.length > 40 ? '...' : ''}
   - 优先级: ${d.priority || '无'}
   - 场景: ${d.scenario}
   - 诊断: ${d.diagnosis}
   - 建议: ${d.action.substring(0, 50)}${d.action.length > 50 ? '...' : ''}
`).join('\n')
            : '暂无详细诊断数据';

        return `你是Meta广告优化专家。请根据以下数据生成一份简洁的调优概览报告。

## 📊 数据概况

- Campaign总数: ${summary.totalCampaigns}
- 总花费: $${summary.totalSpend.toFixed(2)}
- P0优先级（紧急）: ${summary.p0Count} 条
- P1优先级（高优先级）: ${summary.p1Count} 条

## 🔍 问题分类统计

${problemsText}

问题详情示例：
${examplesText}

## 🎯 高频 Action 建议

${actionsText}

## 📋 详细诊断数据

${diagDetailsText}

---

请生成以下内容（严格按照JSON格式输出）：

\`\`\`json
{
  "conclusion": "今日诊断结论（1-2句话，必须包含：Campaign数量、花费总额）",
  "mainProblems": [
    "2.1-问题类型1 (占比%)： 简短描述，不超过25字",
    "2.2-问题类型2 (占比%)： 简短描述，不超过25字"
  ],
  "suggestions": "建议（1-2句话，聚焦P0级别的关键操作，不超过50字）"
}
\`\`\`

要求：
1. **conclusion** 必须包含准确的数字：${summary.totalCampaigns}条Campaign、$${summary.totalSpend.toFixed(2)}总花费
2. **mainProblems** 列出2-3个最严重的问题，按占比排序
3. **suggestions** 提炼最紧急的操作建议，优先P0级别
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
                mainProblems: Array.isArray(parsed.mainProblems) ? parsed.mainProblems : [],
                suggestions: parsed.suggestions || '请查看下方详细列表进行优化。'
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
        const mainProblems: string[] = [];

        if (summary.problemCategories.length > 0) {
            summary.problemCategories.slice(0, 2).forEach((p, i) => {
                mainProblems.push(`2.${i + 1}-${p.category} (${p.percentage.toFixed(0)}%)： ${p.examples[0] || '需要关注'}`);
            });
        }

        let suggestions = '请查看下方详细列表进行优化。';
        if (summary.p0Count > 0) {
            suggestions = `重点关注 ${summary.p0Count} 个 P0 级别 Campaign，优先执行预算调整。`;
        }

        return {
            conclusion: this.generateFallbackConclusion(summary),
            mainProblems,
            suggestions
        };
    }
}

/**
 * 创建 Gemini Service 实例
 */
export function createGeminiService(apiKey: string): GeminiService {
    return new GeminiService(apiKey);
}

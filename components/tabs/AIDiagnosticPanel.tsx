// AI 智能诊断面板组件
// 使用 Gemini API 生成智能调优概览

import React, { useState, forwardRef, useImperativeHandle, useMemo } from 'react';
import { RefreshCw, AlertCircle, ChevronDown, ChevronRight } from 'lucide-react';
import { createGeminiService, AISummaryResult } from '../../services/geminiService';
import { generateDataSummary, DiagnosticDetail, DataSummary, aggregateAndDiagnoseAds, AggregatedAdResult } from '../../utils/aiSummaryUtils';
import { ActionItemsResult } from '../../utils/actionItemsUtils';
import { useConfig } from '../../contexts/ConfigContext';

interface AIDiagnosticPanelProps {
    result: ActionItemsResult;
    diagnosticsMap: Map<string, DiagnosticDetail[]>;
    adDiagnosticsMap?: Map<string, DiagnosticDetail[]>;  // 🆕 新增 Ad 诊断数据
}

// 暴露给父组件的方法
export interface AIDiagnosticPanelRef {
    generate: () => void;
}

export const AIDiagnosticPanel = forwardRef<AIDiagnosticPanelRef, AIDiagnosticPanelProps>((
    { result, diagnosticsMap, adDiagnosticsMap },  // 🆕 添加 adDiagnosticsMap
    ref
) => {
    // 从 Google Sheet 获取配置
    const { config } = useConfig();

    const [aiSummary, setAiSummary] = useState<AISummaryResult | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // 展开/收起状态
    const [isCampaignSummaryExpanded, setIsCampaignSummaryExpanded] = useState(true);

    // 从 Google Sheet 配置中读取 API Key（不使用硬编码备用）
    const apiKey = config?.system.geminiApiKey || '';

    // 详细调试日志
    console.log('🔍 [AIDiagnosticPanel] ========== Config Debug ==========');
    console.log('🔍 [AIDiagnosticPanel] Config object exists:', !!config);
    console.log('🔍 [AIDiagnosticPanel] Full config:', config);
    console.log('🔍 [AIDiagnosticPanel] System config:', config?.system);
    console.log('🔍 [AIDiagnosticPanel] Gemini API Key:', apiKey ? `${apiKey.substring(0, 15)}... (length: ${apiKey.length})` : '(empty or undefined)');
    console.log('🔍 [AIDiagnosticPanel] Config loaded at:', config?.loadedAt);
    console.log('🔍 [AIDiagnosticPanel] =====================================');

    // 生成 AI 诊断
    const generateDiagnosis = async () => {
        // 检查 API Key 是否配置
        if (!apiKey) {
            setError('⚠️ 未配置 Gemini API Key\n\n请按以下步骤配置：\n1. 访问 https://aistudio.google.com/app/apikey 创建新的 API Key\n2. 打开 Google Sheet 配置表\n3. 在 config 工作表中找到 gemini_api_key 行\n4. 将新的 API Key 粘贴到 config_value 列\n5. 刷新页面重试');
            return;
        }

        setIsGenerating(true);
        setError(null);

        try {
            // 生成数据摘要（传入 Ad 诊断数据）
            const dataSummary = generateDataSummary(result, diagnosticsMap, adDiagnosticsMap);

            // 调用 Gemini API
            const geminiService = createGeminiService(apiKey);
            const summary = await geminiService.generateOptimizationSummary(dataSummary);

            setAiSummary(summary);
        } catch (err: any) {
            console.error('AI Diagnosis error:', err);
            console.error('Error details:', {
                message: err.message,
                stack: err.stack,
                name: err.name,
                cause: err.cause
            });

            // 处理常见错误
            if (err.message?.includes('API key was reported as leaked')) {
                setError('⚠️ API Key 已泄露被禁用\n\n解决步骤：\n1. 访问 https://aistudio.google.com/app/apikey 创建新的 API Key\n2. 在 Google Sheet 配置表\n3. 在 config 工作表中更新 gemini_api_key 的值\n4. 刷新页面重试\n\n⚠️ 重要：不要将 API Key 硬编码在代码中！');
            } else if (err.message?.includes('API_KEY_INVALID') || err.message?.includes('401') || err.message?.includes('403')) {
                setError('⚠️ API Key 无效\n\n可能原因：\n1. API Key 已过期或被禁用\n2. API Key 格式错误\n3. API Key 权限不足\n\n解决步骤：\n1. 访问 https://aistudio.google.com/app/apikey 检查或创建新 Key\n2. 在 Google Sheet 的 config 工作表中更新 gemini_api_key\n3. 刷新页面重试');
            } else if (err.message?.includes('QUOTA_EXCEEDED') || err.message?.includes('429')) {
                setError('⚠️ API 配额已用完\n\n请稍后重试，或访问 https://aistudio.google.com 查看配额使用情况');
            } else if (err.message?.includes('Failed to fetch') || err.message?.includes('NetworkError')) {
                setError('⚠️ 网络连接失败\n\n可能原因：\n1. 需要科学上网访问 Google API\n2. API Key 无效\n3. 网络不稳定\n\n请检查网络连接后重试');
            } else if (err.message?.includes('CORS')) {
                setError('⚠️ 跨域请求失败\n\n这通常是浏览器安全策略导致的，请检查 API 配置');
            } else {
                setError(`生成失败: ${err.message || '未知错误'}\n\n请查看浏览器控制台获取详细错误信息`);
            }
        } finally {
            setIsGenerating(false);
        }
    };

    // 暴露给父组件的方法
    useImperativeHandle(ref, () => ({
        generate: generateDiagnosis
    }));

    // 计算基础统计（用于快速展示）
    const totalCampaigns = result.campaigns.length;
    const totalSpend = result.campaigns.reduce((sum, c) => sum + c.spend, 0);
    const p0Count = result.campaigns.filter(c => c.priority === 'P0').length;
    const p1Count = result.campaigns.filter(c => c.priority === 'P1').length;

    return (
        <div>
            {/* 重新生成按钮 - 右对齐 */}
            {aiSummary && (
                <div className="flex justify-end mb-4">
                    <button
                        onClick={generateDiagnosis}
                        disabled={isGenerating}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all ${isGenerating
                            ? 'bg-indigo-300 text-indigo-800 cursor-not-allowed'
                            : 'bg-indigo-500 text-white hover:bg-indigo-600 shadow-md hover:shadow-lg'
                            }`}
                    >
                        {isGenerating ? (
                            <>
                                <RefreshCw className="w-4 h-4 animate-spin" />
                                生成中...
                            </>
                        ) : (
                            <>
                                <RefreshCw className="w-4 h-4" />
                                重新生成
                            </>
                        )}
                    </button>
                </div>
            )}


            {/* 错误提示 */}
            {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700 text-sm">
                    <AlertCircle className="w-4 h-4" />
                    {error}
                </div>
            )}

            {/* AI 诊断结果 */}
            {aiSummary ? (
                <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                    {/* 1. 今日诊断结论 */}
                    <div>
                        <h4 className="font-bold text-slate-900 mb-2 text-base">今日诊断结论：</h4>
                        <p className="text-slate-700 pl-4 leading-relaxed">{aiSummary.conclusion}</p>
                    </div>

                    {/* 2. Campaign 问题 */}
                    <div>
                        <h4 className="font-bold text-slate-900 mb-2 text-base">2-Campaign问题</h4>
                        <div className="pl-4 space-y-3">
                            {/* 2.1 P0 */}
                            <div>
                                <p className="text-slate-700 leading-relaxed mb-1">
                                    <span className="font-semibold">2.1-直接关停的Campaign：</span>
                                    {aiSummary.campaignProblems.p0.description}
                                </p>
                                {aiSummary.campaignProblems.p0.campaigns.length > 0 && (
                                    <div className="pl-4 space-y-0.5">
                                        {aiSummary.campaignProblems.p0.campaigns.map((campaign, idx) => (
                                            <p key={idx} className="text-slate-600 text-sm">{campaign}</p>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* 2.2 P1 */}
                            <div>
                                <p className="text-slate-700 leading-relaxed mb-1">
                                    <span className="font-semibold">2.2-立刻优化/降预算的Campaign：</span>
                                    {aiSummary.campaignProblems.p1.description}
                                </p>
                                {aiSummary.campaignProblems.p1.campaigns.length > 0 && (
                                    <div className="pl-4 space-y-0.5">
                                        {aiSummary.campaignProblems.p1.campaigns.map((campaign, idx) => (
                                            <p key={idx} className="text-slate-600 text-sm">{campaign}</p>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* 2.3 P2 */}
                            <div>
                                <p className="text-slate-700 leading-relaxed mb-1">
                                    <span className="font-semibold">2.3-优化/观察的Campaign：</span>
                                    {aiSummary.campaignProblems.p2.description}
                                </p>
                                {aiSummary.campaignProblems.p2.campaigns.length > 0 && (
                                    <div className="pl-4 space-y-0.5">
                                        {aiSummary.campaignProblems.p2.campaigns.map((campaign, idx) => (
                                            <p key={idx} className="text-slate-600 text-sm">{campaign}</p>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>


                </div>
            ) : !isGenerating ? (
                /* 未生成时的提示 */
                <div className="text-center py-6">
                    <div className="text-4xl mb-3">✨</div>
                    <p className="text-slate-600 text-sm">
                        {apiKey
                            ? '点击上方按钮，AI 将自动分析并生成调优建议'
                            : '请先设置 Gemini API Key，然后生成智能诊断'
                        }
                    </p>
                    {/* 快速统计 */}
                    <div className="mt-4 flex justify-center gap-6 text-sm">
                        <div>
                            <span className="text-slate-500">待分析 Campaign:</span>
                            <span className="ml-1 font-bold text-slate-900">{totalCampaigns}</span>
                        </div>
                        <div>
                            <span className="text-slate-500">总花费:</span>
                            <span className="ml-1 font-bold text-slate-900">${totalSpend.toFixed(2)}</span>
                        </div>
                        {p0Count > 0 && (
                            <div>
                                <span className="text-red-500">🔴 P0:</span>
                                <span className="ml-1 font-bold text-red-600">{p0Count}</span>
                            </div>
                        )}
                        {p1Count > 0 && (
                            <div>
                                <span className="text-amber-500">🟡 P1:</span>
                                <span className="ml-1 font-bold text-amber-600">{p1Count}</span>
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                /* 生成中的骨架屏 */
                <div className="space-y-4 animate-pulse">
                    <div>
                        <div className="h-5 w-32 bg-amber-200 rounded mb-2"></div>
                        <div className="h-4 w-full bg-amber-100 rounded ml-4"></div>
                    </div>
                    <div>
                        <div className="h-5 w-24 bg-amber-200 rounded mb-2"></div>
                        <div className="h-4 w-3/4 bg-amber-100 rounded ml-4 mb-1"></div>
                        <div className="h-4 w-2/3 bg-amber-100 rounded ml-4"></div>
                    </div>
                    <div>
                        <div className="h-5 w-20 bg-amber-200 rounded mb-2"></div>
                        <div className="h-4 w-5/6 bg-amber-100 rounded ml-4"></div>
                    </div>
                </div>
            )}
        </div>
    );
});

// 🆕 新增：Ad 层级 AI 总结卡片组件
export const AIAdSummaryCard: React.FC<{
    result: ActionItemsResult;
    adDiagnosticsMap?: Map<string, DiagnosticDetail[]>;
}> = ({ result, adDiagnosticsMap }) => {
    // 展开/收起状态
    const [isAdSummaryExpanded, setIsAdSummaryExpanded] = useState(true);

    // Ad 摘要筛选状态
    type AdFilterType = 'ALL' | 'SCALING' | 'STOP' | 'KEEP' | 'WATCH';
    const [adFilter, setAdFilter] = useState<AdFilterType>('ALL');

    // 计算聚合后的 Ad 数据
    const aggregatedAds = useMemo(() => {
        if (!result.ads || result.ads.length === 0) return [];
        return aggregateAndDiagnoseAds(result.ads);
    }, [result.ads]);

    // 筛选 Ad
    const filteredAds = useMemo(() => {
        return aggregatedAds.filter(ad => {
            if (adFilter === 'ALL') return true;
            if (adFilter === 'SCALING') return ad.decisionCategory === '扩量投放';
            if (adFilter === 'STOP') return ad.decisionCategory === '缩量或者关停';
            if (adFilter === 'KEEP') return ad.decisionCategory === '保持投放和观察';
            if (adFilter === 'WATCH') return ad.decisionCategory === '观察，积累消耗';
            return true;
        });
    }, [aggregatedAds, adFilter]);

    if (!result.ads || result.ads.length === 0) return null;

    return (
        <div className="bg-white">
            <div
                className="px-6 py-4 border-b border-indigo-100 bg-indigo-50/30 flex items-center justify-between cursor-pointer hover:bg-indigo-50/50 transition-colors"
                onClick={() => setIsAdSummaryExpanded(!isAdSummaryExpanded)}
            >
                <div className="flex items-center gap-4">
                    <h4 className="text-base font-black text-slate-900 flex items-center gap-2">
                        <span>🎨</span>
                        <span>Ad 层级 AI 总结</span>
                    </h4>

                    {/* 筛选器 - 阻止冒泡以免触发折叠 */}
                    <div className="flex bg-white rounded-lg p-1 border border-slate-200" onClick={(e) => e.stopPropagation()}>
                        {[
                            { id: 'ALL', label: '全部' },
                            { id: 'SCALING', label: '扩量' },
                            { id: 'STOP', label: '关停' },
                            { id: 'KEEP', label: '观察' },
                            { id: 'WATCH', label: '积累' }
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setAdFilter(tab.id as AdFilterType)}
                                className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${adFilter === tab.id
                                    ? 'bg-indigo-100 text-indigo-700 shadow-sm'
                                    : 'text-slate-500 hover:bg-slate-50'
                                    }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <button className="text-slate-600 hover:text-slate-900 transition-colors">
                        {isAdSummaryExpanded ?
                            <ChevronDown className="w-5 h-5" /> :
                            <ChevronRight className="w-5 h-5" />
                        }
                    </button>
                </div>
            </div>

            {isAdSummaryExpanded && (
                <div className="overflow-x-auto max-h-[500px]">
                    <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-50 sticky top-0 z-10">
                            <tr>
                                <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-50">Ad Name</th>
                                <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-50">KPI (实际/Benchmark)</th>
                                <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-50">Spend</th>
                                <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-50">AI 建议</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-200">
                            {filteredAds.length > 0 ? (
                                filteredAds.map((ad, idx) => (
                                    <tr key={idx} className="hover:bg-slate-50">
                                        <td className="px-3 py-2 text-sm font-medium text-slate-900 max-w-[200px] truncate" title={ad.adName}>
                                            {ad.adName}
                                        </td>
                                        <td className="px-3 py-2 text-sm text-slate-700">
                                            <div className="flex flex-col">
                                                <span className={
                                                    ad.kpiType === 'ROI'
                                                        ? (ad.kpiValue >= ad.kpiBenchmark ? 'text-green-600 font-bold' : 'text-red-600')
                                                        : (ad.kpiValue <= ad.kpiBenchmark ? 'text-green-600 font-bold' : 'text-red-600')
                                                }>
                                                    {ad.kpiType}: {ad.kpiType === 'CPM' ? '$' : ''}{ad.kpiValue.toFixed(2)}{ad.kpiType === 'ROI' ? 'x' : ''}
                                                </span>
                                                <span className="text-xs text-slate-400">
                                                    Bench: {ad.kpiBenchmark.toFixed(2)}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-3 py-2 text-sm text-slate-700">
                                            ${ad.spend.toFixed(2)}
                                        </td>
                                        <td className="px-3 py-2 text-sm">
                                            <div className="flex flex-col gap-1">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium w-fit ${ad.decisionCategory === '扩量投放' ? 'bg-green-100 text-green-800' :
                                                    ad.decisionCategory === '缩量或者关停' ? 'bg-red-100 text-red-800' :
                                                        ad.decisionCategory === '保持投放和观察' ? 'bg-blue-100 text-blue-800' :
                                                            'bg-gray-100 text-gray-800'
                                                    }`}>
                                                    {ad.decisionCategory}
                                                </span>
                                                <span className="text-xs text-slate-500 truncate max-w-[200px]" title={ad.suggestion}>
                                                    {ad.suggestion}
                                                </span>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={4} className="px-3 py-8 text-center text-sm text-slate-500">
                                        无匹配数据
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};


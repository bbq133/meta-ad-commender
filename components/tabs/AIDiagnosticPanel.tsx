// AI 智能诊断面板组件
// 使用 Gemini API 生成智能调优概览

import React, { useState, forwardRef, useImperativeHandle } from 'react';
import { RefreshCw, AlertCircle } from 'lucide-react';
import { createGeminiService, AISummaryResult } from '../../services/geminiService';
import { generateDataSummary, DiagnosticDetail, DataSummary } from '../../utils/aiSummaryUtils';
import { ActionItemsResult } from '../../utils/actionItemsUtils';

interface AIDiagnosticPanelProps {
    result: ActionItemsResult;
    diagnosticsMap: Map<string, DiagnosticDetail[]>;
}

// 暴露给父组件的方法
export interface AIDiagnosticPanelRef {
    generate: () => void;
}

// 硬编码的 Gemini API Key
const GEMINI_API_KEY = 'AIzaSyAKEyJjt4N65u4UYy9izR9NcQ85aYEN6tM';

export const AIDiagnosticPanel = forwardRef<AIDiagnosticPanelRef, AIDiagnosticPanelProps>((
    { result, diagnosticsMap },
    ref
) => {
    const [aiSummary, setAiSummary] = useState<AISummaryResult | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // 使用硬编码的 API Key
    const apiKey = GEMINI_API_KEY;

    // 生成 AI 诊断
    const generateDiagnosis = async () => {
        if (!apiKey) {
            setError('未配置 Gemini API Key，请在 Google Sheet 中配置');
            return;
        }

        setIsGenerating(true);
        setError(null);

        try {
            // 生成数据摘要
            const dataSummary = generateDataSummary(result, diagnosticsMap);

            // 调用 Gemini API
            const geminiService = createGeminiService(apiKey);
            const summary = await geminiService.generateOptimizationSummary(dataSummary);

            setAiSummary(summary);
        } catch (err: any) {
            console.error('AI Diagnosis error:', err);

            // 处理常见错误
            if (err.message?.includes('API_KEY_INVALID') || err.message?.includes('401')) {
                setError('API Key 无效，请检查 Google Sheet 配置');
            } else if (err.message?.includes('QUOTA_EXCEEDED') || err.message?.includes('429')) {
                setError('API 配额已用完，请稍后重试');
            } else if (err.message?.includes('network') || err.message?.includes('fetch')) {
                setError('网络连接失败，请检查网络后重试');
            } else {
                setError('生成失败，请稍后重试');
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
        <div className="bg-gradient-to-br from-amber-50 to-yellow-50 rounded-xl p-6 border-2 border-amber-200 shadow-lg">
            {/* 头部 */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <span className="text-3xl">🤖</span>
                    <h3 className="text-xl font-black text-slate-900">AI 智能诊断</h3>
                    {apiKey && (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                            已连接
                        </span>
                    )}
                </div>

                {/* 重新生成按钮 - 只在有结果时显示 */}
                {aiSummary && (
                    <button
                        onClick={generateDiagnosis}
                        disabled={isGenerating}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all ${isGenerating
                            ? 'bg-amber-300 text-amber-800 cursor-not-allowed'
                            : 'bg-amber-500 text-white hover:bg-amber-600 shadow-md hover:shadow-lg'
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
                )}
            </div>


            {/* 错误提示 */}
            {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700 text-sm">
                    <AlertCircle className="w-4 h-4" />
                    {error}
                </div>
            )}

            {/* AI 诊断结果 */}
            {aiSummary ? (
                <div className="space-y-4">
                    {/* 1. 今日诊断结论 */}
                    <div>
                        <h4 className="font-bold text-slate-900 mb-2 text-base">1-今日诊断结论：</h4>
                        <p className="text-slate-700 pl-4 leading-relaxed">{aiSummary.conclusion}</p>
                    </div>

                    {/* 2. 主要问题 */}
                    {aiSummary.mainProblems.length > 0 && (
                        <div>
                            <h4 className="font-bold text-slate-900 mb-2 text-base">2-主要问题：</h4>
                            <div className="pl-4 space-y-1">
                                {aiSummary.mainProblems.map((problem, index) => (
                                    <p key={index} className="text-slate-700 leading-relaxed">{problem}</p>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* 3. 建议 */}
                    <div>
                        <h4 className="font-bold text-slate-900 mb-2 text-base">3-建议：</h4>
                        <p className="text-slate-700 pl-4 leading-relaxed">{aiSummary.suggestions}</p>
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

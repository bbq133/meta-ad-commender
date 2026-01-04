// 调优指导相关的辅助函数和组件
import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Lightbulb, AlertCircle, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { getTriggeredConditions, getPriorityLevel, CampaignMetrics } from '../../utils/optimizationRules';
import { DiagnosticDetail } from '../../utils/campaignDiagnostics';
import { DiagnosticFlowPanel } from '../diagnostics/DiagnosticFlowPanel';

// 切换展开状态
export const toggleGuidance = (expandedSet: Set<string>, setExpanded: (s: Set<string>) => void, id: string) => {
    const next = new Set(expandedSet);
    if (next.has(id)) {
        next.delete(id);
    } else {
        next.add(id);
    }
    setExpanded(next);
};

// 获取优先级图标
export const getPriorityIcon = (guidance: string) => {
    if (guidance.includes('立即') || guidance.includes('暂停') || guidance.includes('三重')) {
        return <AlertCircle className="w-4 h-4 text-red-600" />;
    }
    if (guidance.includes('⚠️') || guidance.includes('严重') || guidance.includes('失控')) {
        return <AlertTriangle className="w-4 h-4 text-orange-600" />;
    }
    if (guidance.includes('✅') || guidance.includes('正常')) {
        return <CheckCircle className="w-4 h-4 text-green-600" />;
    }
    return <Info className="w-4 h-4 text-blue-600" />;
};

// 获取优先级标签
export const getPriorityBadge = (guidance: string) => {
    const priority = getPriorityLevel(guidance);

    const badges = {
        P0: (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-bold">
                P0 紧急
            </span>
        ),
        P1: (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-bold">
                P1 重要
            </span>
        ),
        P2: (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-bold">
                P2 建议
            </span>
        ),
        OK: (
            <span className="text-green-600 text-xs">✓ 正常</span>
        )
    };

    return badges[priority];
};

// 调优指导详情面板
export const GuidanceDetailPanel: React.FC<{
    guidance: string;
    metrics: any;
    avgMetrics: any;
    kpiType: 'ROI' | 'CPC' | 'CPM';
    intermediateMetrics?: any;
    intermediateAvgMetrics?: any;
    lastMetrics?: any;
    diagnosticDetails?: DiagnosticDetail[];  // 修改：支持多个诊断详情
}> = ({ guidance, metrics, avgMetrics, kpiType, intermediateMetrics, intermediateAvgMetrics, lastMetrics, diagnosticDetails }) => {
    const [showDiagnosticFlow, setShowDiagnosticFlow] = useState(false);
    const [activeScenarioIndex, setActiveScenarioIndex] = useState(0);
    const conditions = getTriggeredConditions(metrics as CampaignMetrics, avgMetrics as CampaignMetrics, kpiType);

    // 定义要显示的关键指标（根据KPI类型，按转化漏斗顺序）
    const keyMetrics = kpiType === 'ROI'
        ? ['ctr', 'click_to_pv_rate', 'atc_rate', 'checkout_rate', 'purchase_rate', 'cvr', 'cpc', 'cpm', 'cpa', 'cpatc', 'aov', 'frequency'] // ROI类型显示完整漏斗
        : kpiType === 'CPC'
            ? ['ctr', 'cpm', 'clicks', 'impressions', 'cpc', 'frequency']
            : ['cpm', 'reach', 'impressions', 'frequency'];

    const metricLabels: Record<string, string> = {
        cvr: 'CVR',
        aov: 'AOV',
        cpa: 'CPA',
        cpatc: 'CPATC',
        atc_rate: 'ATC Rate',
        ctr: 'CTR',
        cpc: 'CPC',
        cpm: 'CPM',
        clicks: 'Clicks',
        impressions: 'Impress',
        reach: 'Reach',
        frequency: 'Freq',
        // 新增中间转化指标
        click_to_pv_rate: 'Click-to-PV',
        checkout_rate: 'Checkout',
        purchase_rate: 'Purchase',
    };

    // 格式化数值
    const formatValue = (val: number | undefined, metricName: string): string => {
        if (val === undefined || val === null) return 'N/A';

        // 百分比指标（注意：这些指标已经是百分比格式，如2.5表示2.5%）
        if (metricName === 'cvr' || metricName === 'ctr' || metricName === 'atc_rate') {
            return `${val.toFixed(2)}%`;
        }
        // 新增的转化率指标（小数格式，需要乘100）
        else if (metricName === 'click_to_pv_rate' || metricName === 'checkout_rate' || metricName === 'purchase_rate') {
            return `${(val * 100).toFixed(2)}%`;
        }
        // 货币指标
        else if (metricName === 'cpc' || metricName === 'cpm' || metricName === 'cpa' || metricName === 'cpatc' || metricName === 'aov') {
            return `$${val.toFixed(2)}`;
        }
        // 频次
        else if (metricName === 'frequency') {
            return val.toFixed(1);
        }
        // 数量指标
        else if (metricName === 'clicks' || metricName === 'impressions' || metricName === 'reach') {
            return val.toLocaleString();
        }
        else {
            return val.toFixed(2);
        }
    };

    // 计算vs Avg百分比
    const calcVsAvg = (actual: number | undefined, avg: number | undefined, metricName: string): { percent: number; text: string; color: string } => {
        if (actual === undefined || avg === undefined || avg === 0) {
            return { percent: 0, text: 'N/A', color: 'text-slate-400' };
        }
        const percent = ((actual - avg) / avg) * 100;
        const arrow = percent >= 0 ? '↑' : '↓';

        // 成本指标：上升=红色，下降=绿色
        // 收益指标：上升=绿色，下降=红色
        const isCostMetric = ['cpa', 'cpatc', 'cpc', 'cpm'].includes(metricName);
        const color = isCostMetric
            ? (percent >= 0 ? 'text-red-600' : 'text-green-600')
            : (percent >= 0 ? 'text-green-600' : 'text-red-600');

        return { percent, text: `${arrow}${Math.abs(percent).toFixed(1)}%`, color };
    };

    // 计算vs Last百分比
    const calcVsLast = (actual: number | undefined, last: number | undefined, metricName: string): { percent: number; text: string; color: string } => {
        if (actual === undefined || last === undefined || last === 0) {
            return { percent: 0, text: '0%', color: 'text-slate-400' };
        }
        const percent = ((actual - last) / last) * 100;
        const arrow = percent >= 0 ? '↑' : '↓';

        // 成本指标：上升=红色，下降=绿色
        // 收益指标：上升=绿色，下降=红色
        const isCostMetric = ['cpa', 'cpatc', 'cpc', 'cpm'].includes(metricName);
        const color = isCostMetric
            ? (percent >= 0 ? 'text-red-600' : 'text-green-600')
            : (percent >= 0 ? 'text-green-600' : 'text-red-600');

        return { percent, text: `${arrow}${Math.abs(percent).toFixed(1)}%`, color };
    };

    return (
        <div className="space-y-3">
            {/* 第1-3行：中间指标区域 */}
            {intermediateMetrics && intermediateAvgMetrics && (
                <div className="space-y-2">
                    {/* 标题 */}
                    <div className="text-sm font-medium text-slate-700">中间指标</div>

                    {/* 指标表格 */}
                    <div className="overflow-x-auto">
                        <div className="inline-block min-w-full">
                            {/* 指标名称行 */}
                            <div
                                className="grid gap-1 bg-slate-800 text-white py-2 px-2 rounded-t text-xs font-medium text-center"
                                style={{ gridTemplateColumns: `repeat(${keyMetrics.length}, minmax(0, 1fr))` }}
                            >
                                {keyMetrics.map(metric => (
                                    <div key={metric}>{metricLabels[metric]}</div>
                                ))}
                            </div>

                            {/* 数值行 */}
                            <div
                                className="grid gap-1 bg-slate-50 py-2 px-2 rounded-b border border-slate-200 border-t-0"
                                style={{ gridTemplateColumns: `repeat(${keyMetrics.length}, minmax(0, 1fr))` }}
                            >
                                {keyMetrics.map((metric, index) => {
                                    const actualValue = intermediateMetrics[metric];
                                    const avgValue = intermediateAvgMetrics[metric];
                                    const lastValue = lastMetrics?.[metric];

                                    const vsAvg = calcVsAvg(actualValue, avgValue, metric);
                                    const vsLast = calcVsLast(actualValue, lastValue, metric);

                                    const isFirstColumn = index === 0;

                                    return (
                                        <div key={metric} className="text-center space-y-0.5">
                                            {/* 实际值 */}
                                            <div className="text-sm font-bold text-slate-900">
                                                {formatValue(actualValue, metric)}
                                            </div>
                                            {/* vs Avg */}
                                            <div className={`text-xs ${vsAvg.color}`}>
                                                {isFirstColumn && <span className="text-slate-500">vs Avg: </span>}
                                                {vsAvg.text}
                                            </div>
                                            {/* vs Last */}
                                            <div className={`text-xs ${vsLast.color}`}>
                                                {isFirstColumn && <span className="text-slate-500">vs Last: </span>}
                                                {vsLast.text}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* 第4行：不合格指标 */}
            <div className="mb-3">
                <div className="text-sm font-medium text-slate-700 mb-2">不合格指标</div>
                <div className="text-sm leading-relaxed space-x-2 flex flex-wrap items-center gap-y-1">
                    {/* 优先级 */}
                    <span className="inline-flex items-center gap-1">
                        {getPriorityBadge(guidance)}
                    </span>

                    {/* 触发条件 */}
                    {conditions.length > 0 && (
                        <>
                            <span className="text-slate-300">|</span>
                            <span className="font-medium text-slate-600">📊</span>
                            <div className="inline-flex flex-wrap gap-1">
                                {conditions.map((cond, idx) => (
                                    <React.Fragment key={idx}>
                                        <span className="px-1.5 py-0.5 bg-slate-200 text-slate-700 rounded text-xs">
                                            {cond}
                                        </span>
                                        {idx < conditions.length - 1 && <span className="text-slate-400">|</span>}
                                    </React.Fragment>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* 第5行：调优建议 */}
            <div>
                <div className="text-sm font-medium text-slate-700 mb-2">调优建议</div>
                <div className="text-sm leading-relaxed">
                    <span className="font-medium text-slate-900 whitespace-pre-line">{guidance}</span>
                </div>
            </div>

            {/* 诊断详情区域（仅Campaign层级且有diagnosticDetails时显示） */}
            {diagnosticDetails && diagnosticDetails.length > 0 && (
                <div className="mt-4 border-t border-slate-200 pt-4">
                    <button
                        onClick={() => setShowDiagnosticFlow(!showDiagnosticFlow)}
                        className="flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
                    >
                        {showDiagnosticFlow ? (
                            <ChevronDown className="w-4 h-4" />
                        ) : (
                            <ChevronRight className="w-4 h-4" />
                        )}
                        <span>查看诊断详情</span>
                        <span className="text-xs text-slate-500">
                            （{diagnosticDetails.length}个场景）
                        </span>
                    </button>

                    {showDiagnosticFlow && (
                        <div className="mt-3">
                            {/* Tab导航栏 - 仅在多场景时显示 */}
                            {diagnosticDetails.length > 1 && (
                                <div className="flex gap-1 mb-3 border-b border-slate-200">
                                    {diagnosticDetails.map((detail, index) => (
                                        <button
                                            key={index}
                                            onClick={() => setActiveScenarioIndex(index)}
                                            className={`px-3 py-2 text-sm font-medium transition-all border-b-2 ${activeScenarioIndex === index
                                                ? 'border-blue-600 text-blue-600 bg-blue-50'
                                                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                                                }`}
                                        >
                                            场景{index + 1}: {detail.scenario}
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* 当前激活场景的诊断流程 */}
                            <div className="border border-slate-200 rounded-lg p-3">
                                {diagnosticDetails.length === 1 && (
                                    <div className="text-sm font-semibold text-slate-700 mb-3">
                                        {diagnosticDetails[0].scenario}
                                    </div>
                                )}
                                <DiagnosticFlowPanel detail={diagnosticDetails[activeScenarioIndex]} />
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

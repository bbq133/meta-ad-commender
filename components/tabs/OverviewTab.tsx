import React, { useMemo } from 'react';
import { TrendingUp, TrendingDown, Minus, DollarSign, Target, Clock, Activity, Settings } from 'lucide-react';
import { RawAdRecord, AggregatedMetrics, AdConfiguration, CampaignLayer, LayerConfiguration } from '../../types';
import { calculateMetrics, classifyCampaign, formatCurrency, formatPercent, formatNumber, getDelta, calculateTotalBudget } from '../../utils/dataUtils';

interface OverviewTabProps {
    data: RawAdRecord[];
    comparisonData: RawAdRecord[];
    configs: AdConfiguration[];
    startDate: string;
    endDate: string;
    layerConfig: LayerConfiguration;
    onConfigureLayersClick: () => void;
}

const MetricCard: React.FC<{
    title: string;
    value: string;
    delta?: number;
    target?: string;
    status?: 'good' | 'warning' | 'bad';
    icon: React.ReactNode;
}> = ({ title, value, delta, target, status, icon }) => {
    const getDeltaColor = () => {
        if (delta === undefined) return 'text-slate-400';
        if (Math.abs(delta) < 0.001) return 'text-slate-400';
        return delta > 0 ? 'text-emerald-500' : 'text-red-500';
    };

    const getStatusColor = () => {
        if (!status) return 'bg-slate-100';
        if (status === 'good') return 'bg-emerald-100';
        if (status === 'warning') return 'bg-amber-100';
        return 'bg-red-100';
    };

    return (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
            <div className="flex items-start justify-between mb-4">
                <div className={`p-3 rounded-xl ${getStatusColor()}`}>
                    {icon}
                </div>
                {delta !== undefined && (
                    <div className={`flex items-center gap-1 ${getDeltaColor()}`}>
                        {Math.abs(delta) < 0.001 ? (
                            <Minus className="w-4 h-4" />
                        ) : delta > 0 ? (
                            <TrendingUp className="w-4 h-4" />
                        ) : (
                            <TrendingDown className="w-4 h-4" />
                        )}
                        <span className="text-sm font-bold">
                            {Math.abs(delta * 100).toFixed(1)}%
                        </span>
                    </div>
                )}
            </div>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                {title}
            </div>
            <div className="text-3xl font-black text-slate-900 mb-1">
                {value}
            </div>
            {target && (
                <div className="text-sm text-slate-600">
                    Target: {target}
                </div>
            )}
        </div>
    );
};

export const OverviewTab: React.FC<OverviewTabProps> = ({ data, comparisonData, configs, startDate, endDate, layerConfig, onConfigureLayersClick }) => {
    const overallMetrics = useMemo(() => calculateMetrics(data), [data]);
    const prevMetrics = useMemo(() => calculateMetrics(comparisonData), [comparisonData]);

    // 使用智能预算计算
    const { targetGMV, totalBudget, targetAcos, targetRoi, budgetBreakdown, activeConfigsCount } = useMemo(() => {
        // 计算智能预算（根据投放周期和选择日期的重叠）
        const { totalBudget: smartBudget, breakdown } = calculateTotalBudget(configs, startDate, endDate);

        let weightedRoiSum = 0;
        let weightedBudgetSum = 0;

        // 只计算有重叠的业务线的加权ROI
        breakdown.forEach(item => {
            if (item.allocatedBudget > 0) {
                const config = configs.find(c => c.name === item.configName);
                if (config && config.targetType === 'ROI') {
                    weightedRoiSum += item.allocatedBudget * config.targetValue;
                    weightedBudgetSum += item.allocatedBudget;
                }
            }
        });

        const gmv = weightedRoiSum; // Target GMV = 加权ROI总和
        const targetLine = weightedRoiSum > 0 ? (weightedBudgetSum / weightedRoiSum) * 100 : 0;
        const roi = weightedBudgetSum > 0 ? weightedRoiSum / weightedBudgetSum : 0;
        const activeCount = breakdown.filter(b => b.allocatedBudget > 0).length;

        return {
            targetGMV: gmv,
            totalBudget: smartBudget,
            targetAcos: targetLine,
            targetRoi: roi,
            budgetBreakdown: breakdown,
            activeConfigsCount: activeCount
        };
    }, [configs, startDate, endDate]);

    const gmvAchievementRate = targetGMV > 0 ? (overallMetrics.purchase_value / targetGMV) * 100 : 0;
    const acosDeviation = overallMetrics.acos - targetAcos;
    const spendPacing = totalBudget > 0 ? overallMetrics.spend / totalBudget : 0;

    const getGMVStatus = (): 'good' | 'warning' | 'bad' => {
        if (gmvAchievementRate >= 100) return 'good';
        if (gmvAchievementRate >= 80) return 'warning';
        return 'bad';
    };

    const getACOSStatus = (): 'good' | 'warning' | 'bad' => {
        if (acosDeviation <= 0) return 'good';
        if (acosDeviation <= 5) return 'warning';
        return 'bad';
    };

    const layerAnalysis = useMemo(() => {
        const layers = {
            [CampaignLayer.AWARENESS]: { current: [] as RawAdRecord[], prev: [] as RawAdRecord[] },
            [CampaignLayer.TRAFFIC]: { current: [] as RawAdRecord[], prev: [] as RawAdRecord[] },
            [CampaignLayer.CONVERSION]: { current: [] as RawAdRecord[], prev: [] as RawAdRecord[] }
        };

        data.forEach(r => layers[classifyCampaign(r, layerConfig)].current.push(r));
        comparisonData.forEach(r => layers[classifyCampaign(r, layerConfig)].prev.push(r));

        return Object.entries(layers).map(([layer, sets]) => ({
            layer,
            metrics: calculateMetrics(sets.current),
            prevMetrics: calculateMetrics(sets.prev)
        }));
    }, [data, comparisonData, layerConfig]);

    return (
        <div className="space-y-6">
            {/* Business Outcome */}
            <div>
                <h2 className="text-2xl font-black text-slate-900 mb-4">Business Outcome</h2>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <MetricCard
                        title="GMV Achievement"
                        value={formatCurrency(overallMetrics.purchase_value)}
                        delta={getDelta(overallMetrics.purchase_value, prevMetrics.purchase_value)}
                        target={`Target: ${formatCurrency(targetGMV)} (${gmvAchievementRate >= 100 ? '达成' : '未达成'} ${gmvAchievementRate.toFixed(1)}%)`}
                        status={getGMVStatus()}
                        icon={<DollarSign className="w-6 h-6 text-emerald-600" />}
                    />
                    <MetricCard
                        title="ACOS"
                        value={formatPercent(overallMetrics.acos / 100)}
                        delta={getDelta(overallMetrics.acos, prevMetrics.acos)}
                        target={acosDeviation > 0
                            ? `${targetAcos.toFixed(1)}% (超出 +${acosDeviation.toFixed(1)}%)`
                            : `${targetAcos.toFixed(1)}% (优于 ${Math.abs(acosDeviation).toFixed(1)}%)`}
                        status={getACOSStatus()}
                        icon={<Target className="w-6 h-6 text-blue-600" />}
                    />
                    <MetricCard
                        title="Spend Pacing"
                        value={formatCurrency(overallMetrics.spend)}
                        delta={getDelta(overallMetrics.spend, prevMetrics.spend)}
                        target={spendPacing > 1
                            ? `Target: ${formatCurrency(totalBudget)} (超支 ${((spendPacing - 1) * 100).toFixed(1)}%)`
                            : `Target: ${formatCurrency(totalBudget)} (结余 ${((1 - spendPacing) * 100).toFixed(1)}%)`}
                        status={spendPacing > 1.2 ? 'bad' : spendPacing > 1 ? 'warning' : 'good'}
                        icon={<Clock className="w-6 h-6 text-purple-600" />}
                    />
                    <MetricCard
                        title="ROI Efficiency"
                        value={`${overallMetrics.roi.toFixed(2)}x`}
                        delta={getDelta(overallMetrics.roi, prevMetrics.roi)}
                        target={`Target: ${targetRoi.toFixed(2)}x`}
                        status={overallMetrics.roi >= targetRoi ? 'good' : overallMetrics.roi >= targetRoi * 0.8 ? 'warning' : 'bad'}
                        icon={<TrendingUp className="w-6 h-6 text-amber-600" />}
                    />
                </div>
            </div>

            {/* Advertising Layers */}
            <div>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-2xl font-black text-slate-900">Advertising Layers</h2>
                    <button
                        onClick={onConfigureLayersClick}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm font-medium text-slate-700 transition-colors"
                    >
                        <Settings className="w-4 h-4" />
                        Configure Layers
                    </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {layerAnalysis.map(({ layer, metrics, prevMetrics }) => {
                        // 根据层级渲染不同的指标
                        const renderMetrics = () => {
                            if (layer === CampaignLayer.AWARENESS) {
                                return (
                                    <>
                                        <div>
                                            <div className="text-xs text-slate-600 mb-1">Impressions</div>
                                            <div className="text-xl font-bold text-slate-900">
                                                {formatNumber(metrics.impressions)}
                                            </div>
                                        </div>
                                        <div>
                                            <div className="text-xs text-slate-600 mb-1">CPM</div>
                                            <div className="flex items-center gap-2">
                                                <div className="text-xl font-bold text-slate-900">
                                                    {formatCurrency(metrics.cpm)}
                                                </div>
                                                {prevMetrics.cpm > 0 && (
                                                    <div className={`text-sm font-bold ${getDelta(metrics.cpm, prevMetrics.cpm) > 0
                                                        ? 'text-red-500'
                                                        : 'text-emerald-500'
                                                        }`}>
                                                        {getDelta(metrics.cpm, prevMetrics.cpm) > 0 ? '+' : ''}
                                                        {(getDelta(metrics.cpm, prevMetrics.cpm) * 100).toFixed(1)}%
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div>
                                            <div className="text-xs text-slate-600 mb-1">Spend</div>
                                            <div className="text-lg font-bold text-slate-900">
                                                {formatCurrency(metrics.spend)}
                                            </div>
                                        </div>
                                    </>
                                );
                            } else if (layer === CampaignLayer.TRAFFIC) {
                                return (
                                    <>
                                        <div>
                                            <div className="text-xs text-slate-600 mb-1">CTR</div>
                                            <div className="flex items-center gap-2">
                                                <div className="text-xl font-bold text-slate-900">
                                                    {formatPercent(metrics.ctr)}
                                                </div>
                                                {prevMetrics.ctr > 0 && (
                                                    <div className={`text-sm font-bold ${getDelta(metrics.ctr, prevMetrics.ctr) > 0
                                                        ? 'text-emerald-500'
                                                        : 'text-red-500'
                                                        }`}>
                                                        {getDelta(metrics.ctr, prevMetrics.ctr) > 0 ? '+' : ''}
                                                        {(getDelta(metrics.ctr, prevMetrics.ctr) * 100).toFixed(1)}%
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div>
                                            <div className="text-xs text-slate-600 mb-1">CPC</div>
                                            <div className="flex items-center gap-2">
                                                <div className="text-xl font-bold text-slate-900">
                                                    {formatCurrency(metrics.cpc)}
                                                </div>
                                                {prevMetrics.cpc > 0 && (
                                                    <div className={`text-sm font-bold ${getDelta(metrics.cpc, prevMetrics.cpc) > 0
                                                        ? 'text-red-500'
                                                        : 'text-emerald-500'
                                                        }`}>
                                                        {getDelta(metrics.cpc, prevMetrics.cpc) > 0 ? '+' : ''}
                                                        {(getDelta(metrics.cpc, prevMetrics.cpc) * 100).toFixed(1)}%
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div>
                                            <div className="text-xs text-slate-600 mb-1">Clicks</div>
                                            <div className="text-lg font-bold text-slate-900">
                                                {formatNumber(metrics.link_clicks)}
                                            </div>
                                        </div>
                                    </>
                                );
                            } else {
                                // CONVERSION layer
                                return (
                                    <>
                                        <div>
                                            <div className="text-xs text-slate-600 mb-1">ROI</div>
                                            <div className="flex items-center gap-2">
                                                <div className="text-xl font-bold text-slate-900">
                                                    {metrics.roi.toFixed(2)}x
                                                </div>
                                                {prevMetrics.roi > 0 && (
                                                    <div className={`text-sm font-bold ${getDelta(metrics.roi, prevMetrics.roi) > 0
                                                        ? 'text-emerald-500'
                                                        : 'text-red-500'
                                                        }`}>
                                                        {getDelta(metrics.roi, prevMetrics.roi) > 0 ? '+' : ''}
                                                        {(getDelta(metrics.roi, prevMetrics.roi) * 100).toFixed(1)}%
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div>
                                            <div className="text-xs text-slate-600 mb-1">Revenue</div>
                                            <div className="text-lg font-bold text-slate-900">
                                                {formatCurrency(metrics.purchase_value)}
                                            </div>
                                        </div>
                                        <div>
                                            <div className="text-xs text-slate-600 mb-1">Spend</div>
                                            <div className="text-lg font-bold text-slate-900">
                                                {formatCurrency(metrics.spend)}
                                            </div>
                                        </div>
                                    </>
                                );
                            }
                        };

                        return (
                            <div key={layer} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                                <div className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">
                                    {layer}
                                </div>
                                <div className="space-y-3">
                                    {renderMetrics()}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

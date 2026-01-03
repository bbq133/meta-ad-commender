import React, { useMemo } from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Cell, Label } from 'recharts';
import { RawAdRecord, AdConfiguration } from '../../types';
import { QuadrantThresholds, QuadrantType, classifyQuadrant, getQuadrantInfo } from '../../utils/quadrantUtils';
import { formatCurrency } from '../../utils/dataUtils';

interface QuadrantChartProps {
    data: RawAdRecord[];
    config: AdConfiguration;
    thresholds: QuadrantThresholds;
    onThresholdsChange: (newThresholds: QuadrantThresholds) => void;
    onQuadrantFilter: (quadrant: QuadrantType | 'all') => void;
    selectedQuadrant: QuadrantType | 'all';
    onCampaignClick?: (campaignName: string) => void;
}

export const QuadrantChart: React.FC<QuadrantChartProps> = ({
    data,
    config,
    thresholds,
    onThresholdsChange,
    onQuadrantFilter,
    selectedQuadrant,
    onCampaignClick
}) => {
    // Process campaign data for scatter plot
    const chartData = useMemo(() => {
        const campaignMap = new Map<string, RawAdRecord[]>();
        data.forEach(record => {
            const key = record.campaign_name;
            if (!campaignMap.has(key)) campaignMap.set(key, []);
            campaignMap.get(key)!.push(record);
        });

        return Array.from(campaignMap.entries()).map(([name, records]) => {
            const spend = records.reduce((sum, r) => sum + r.spend, 0);
            const revenue = records.reduce((sum, r) => sum + r.purchase_value, 0);
            const clicks = records.reduce((sum, r) => sum + r.link_clicks, 0);
            const impressions = records.reduce((sum, r) => sum + r.impressions, 0);

            let kpiValue = 0;
            if (config.targetType === 'ROI') kpiValue = spend > 0 ? revenue / spend : 0;
            else if (config.targetType === 'CPC') kpiValue = clicks > 0 ? spend / clicks : 0;
            else if (config.targetType === 'CPM') kpiValue = impressions > 0 ? (spend / impressions) * 1000 : 0;

            const quadrant = classifyQuadrant(spend, kpiValue, thresholds, config.targetType);

            return {
                name,
                spend,
                kpiValue,
                quadrant
            };
        });
    }, [data, config, thresholds]);

    const getQuadrantColor = (type: QuadrantType) => {
        switch (type) {
            case 'excellent': return '#10b981'; // Green
            case 'potential': return '#3b82f6'; // Blue
            case 'watch': return '#f59e0b';     // Yellow
            case 'problem': return '#ef4444';    // Red
            default: return '#94a3b8';
        }
    };

    const quadrantSummary = useMemo(() => {
        const counts = {
            excellent: 0,
            potential: 0,
            watch: 0,
            problem: 0
        };
        chartData.forEach(item => {
            counts[item.quadrant]++;
        });
        return counts;
    }, [chartData]);

    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            const item = payload[0].payload;
            const info = getQuadrantInfo(item.quadrant);
            return (
                <div className="bg-white p-4 border border-slate-200 shadow-xl rounded-xl">
                    <p className="font-black text-slate-900 mb-2">{item.name}</p>
                    <div className="space-y-1 text-sm">
                        <p className="text-slate-600">Spend: <span className="font-bold text-slate-900">{formatCurrency(item.spend)}</span></p>
                        <p className="text-slate-600">{config.targetType}: <span className="font-bold text-slate-900">{item.kpiValue.toFixed(2)}{config.targetType === 'ROI' ? 'x' : ''}</span></p>
                        <div className={`mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold border ${info.color}`}>
                            <span>{info.icon}</span>
                            <span>{info.label}</span>
                        </div>
                    </div>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="flex flex-col lg:flex-row gap-3">
            {/* Left: Chart Area - 2/3 width */}
            <div className="flex-[2] bg-white rounded-lg p-3 border border-slate-200 shadow-sm flex flex-col">
                <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-black text-slate-900">Campaign Quadrant View</h3>
                    <div className="flex items-center gap-2 text-[8px] font-bold uppercase tracking-wide text-slate-500">
                        <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500"></span> Excellent</div>
                        <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500"></span> Potential</div>
                        <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-500"></span> Watch</div>
                        <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500"></span> Problem</div>
                    </div>
                </div>

                {/* Chart Container - Fill remaining space */}
                <div className="flex-1 w-full min-h-0">
                    <ResponsiveContainer width="100%" height="100%">
                        <ScatterChart margin={{ top: 30, right: 80, bottom: 20, left: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                            <XAxis
                                type="number"
                                dataKey="spend"
                                name="Spend"
                                unit="$"
                                stroke="#64748b"
                                fontSize={11}
                                tickFormatter={(v) => `$${v}`}
                            />
                            <YAxis
                                type="number"
                                dataKey="kpiValue"
                                name={config.targetType}
                                stroke="#64748b"
                                fontSize={11}
                                domain={[
                                    0,
                                    (dataMax: number) => {
                                        // Add 20% padding to the max value for better visualization
                                        const maxValue = Math.max(dataMax, thresholds.kpiThreshold);
                                        return Math.ceil(maxValue * 1.2 * 10) / 10; // Round up to 1 decimal
                                    }
                                ]}
                                tickFormatter={(v) => `${v}${config.targetType === 'ROI' ? 'x' : ''}`}
                            />
                            <ZAxis type="number" dataKey="spend" range={[50, 300]} />
                            <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />

                            {/* Threshold Lines */}
                            <ReferenceLine
                                x={thresholds.spendThreshold}
                                stroke="#475569"
                                strokeWidth={2}
                                strokeDasharray="5 5"
                            >
                                <Label
                                    value="Avg Spend"
                                    position="top"
                                    fill="#1e293b"
                                    fontSize={12}
                                    fontWeight="bold"
                                    style={{
                                        background: 'white',
                                        padding: '4px 8px',
                                        borderRadius: '4px',
                                        border: '1px solid #cbd5e1'
                                    }}
                                />
                            </ReferenceLine>
                            <ReferenceLine
                                y={thresholds.kpiThreshold}
                                stroke="#475569"
                                strokeWidth={2}
                                strokeDasharray="5 5"
                            >
                                <Label
                                    value={`Target ${config.targetType}`}
                                    position="right"
                                    fill="#1e293b"
                                    fontSize={12}
                                    fontWeight="bold"
                                    style={{
                                        background: 'white',
                                        padding: '4px 8px',
                                        borderRadius: '4px',
                                        border: '1px solid #cbd5e1'
                                    }}
                                />
                            </ReferenceLine>

                            <Scatter
                                data={chartData}
                                onClick={(data: any) => {
                                    if (data && data.name && onCampaignClick) {
                                        onCampaignClick(data.name);
                                    }
                                }}
                                style={{ cursor: 'pointer' }}
                            >
                                {chartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={getQuadrantColor(entry.quadrant)} stroke="#fff" strokeWidth={2} />
                                ))}
                            </Scatter>
                        </ScatterChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Right: Controls - 1/3 width, Stacked Vertically */}
            <div className="flex-1 flex flex-col gap-3">
                {/* Adjust Thresholds */}
                <div className="bg-white rounded-lg p-3 border border-slate-200 shadow-sm">
                    <h4 className="text-[10px] font-black text-slate-900 mb-2 uppercase tracking-widest">Adjust Thresholds</h4>
                    <div className="space-y-3">
                        {/* Spend Threshold */}
                        <div>
                            <div className="flex items-center justify-between mb-1">
                                <label className="text-[8px] font-black text-slate-500 uppercase">Spend ($)</label>
                                <input
                                    type="number"
                                    value={Math.round(thresholds.spendThreshold)}
                                    onChange={(e) => onThresholdsChange({ ...thresholds, spendThreshold: Number(e.target.value) })}
                                    className="w-16 px-1 py-0.5 text-[10px] bg-slate-50 border border-slate-200 rounded font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                />
                            </div>
                            <input
                                type="range"
                                min="0"
                                max={Math.max(...chartData.map(d => d.spend)) * 1.2}
                                step="10"
                                value={thresholds.spendThreshold}
                                onChange={(e) => onThresholdsChange({ ...thresholds, spendThreshold: Number(e.target.value) })}
                                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer slider-thumb"
                            />
                            <div className="flex justify-between text-[8px] text-slate-400 mt-0.5">
                                <span>$0</span>
                                <span>${Math.round(Math.max(...chartData.map(d => d.spend)) * 1.2).toLocaleString()}</span>
                            </div>
                        </div>

                        {/* KPI Threshold */}
                        <div>
                            <div className="flex items-center justify-between mb-1">
                                <label className="text-[8px] font-black text-slate-500 uppercase">{config.targetType}</label>
                                <input
                                    type="number"
                                    step={config.targetType === 'ROI' ? '0.1' : '0.01'}
                                    value={thresholds.kpiThreshold.toFixed(2)}
                                    onChange={(e) => onThresholdsChange({ ...thresholds, kpiThreshold: Number(e.target.value) })}
                                    className="w-16 px-1 py-0.5 text-[10px] bg-slate-50 border border-slate-200 rounded font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                />
                            </div>
                            <input
                                type="range"
                                min="0"
                                max={(() => {
                                    const maxKpi = Math.max(...chartData.map(d => d.kpiValue), 0);
                                    const calculatedMax = config.targetType === 'ROI'
                                        ? maxKpi * 1.5
                                        : maxKpi * 2;
                                    // Ensure minimum max value
                                    return Math.max(calculatedMax, config.targetType === 'ROI' ? 10 : 1);
                                })()}
                                step={config.targetType === 'ROI' ? '0.1' : '0.01'}
                                value={thresholds.kpiThreshold}
                                onChange={(e) => onThresholdsChange({ ...thresholds, kpiThreshold: Number(e.target.value) })}
                                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer slider-thumb"
                            />
                            <div className="flex justify-between text-[8px] text-slate-400 mt-0.5">
                                <span>0</span>
                                <span>{(() => {
                                    const maxKpi = Math.max(...chartData.map(d => d.kpiValue), 0);
                                    const calculatedMax = config.targetType === 'ROI'
                                        ? maxKpi * 1.5
                                        : maxKpi * 2;
                                    return Math.max(calculatedMax, config.targetType === 'ROI' ? 10 : 1).toFixed(2);
                                })()}</span>
                            </div>
                        </div>

                        {/* Reset Button */}
                        <button
                            onClick={() => onThresholdsChange({
                                spendThreshold: chartData.reduce((sum, item) => sum + item.spend, 0) / (chartData.length || 1),
                                kpiThreshold: config.targetValue
                            })}
                            className="w-full py-1 text-[9px] font-black text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded transition-colors border border-indigo-100"
                        >
                            🔄 Reset to Default
                        </button>
                    </div>
                </div>

                {/* Quadrant Filters */}
                <div className="bg-white rounded-lg p-3 border border-slate-200 shadow-sm">
                    <h4 className="text-[10px] font-black text-slate-900 mb-2 uppercase tracking-widest">Filter by Quadrant</h4>
                    <div className="space-y-1.5">
                        {/* All Button - Full Width on Top */}
                        <button
                            onClick={() => onQuadrantFilter('all')}
                            className={`w-full flex items-center justify-between px-2 py-1.5 rounded border transition-all ${selectedQuadrant === 'all'
                                ? 'border-indigo-600 bg-indigo-50 shadow-sm'
                                : 'border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-white'
                                }`}
                        >
                            <div className="flex items-center gap-1.5">
                                <span className="text-base">📋</span>
                                <span className={`text-[10px] font-black uppercase ${selectedQuadrant === 'all' ? 'text-indigo-600' : 'text-slate-700'}`}>
                                    All
                                </span>
                            </div>
                            <span className={`text-xs font-black ${selectedQuadrant === 'all' ? 'text-indigo-700' : 'text-slate-900'}`}>
                                {chartData.length}
                            </span>
                        </button>

                        {/* 2x2 Grid for Quadrants */}
                        <div className="grid grid-cols-2 gap-1.5">
                            {(['excellent', 'potential', 'watch', 'problem'] as const).map((q) => {
                                const info = getQuadrantInfo(q);
                                const count = quadrantSummary[q];
                                const isActive = selectedQuadrant === q;

                                return (
                                    <button
                                        key={q}
                                        onClick={() => onQuadrantFilter(q)}
                                        className={`flex flex-col items-center justify-center p-1.5 rounded border transition-all ${isActive
                                            ? 'border-indigo-600 bg-indigo-50 scale-[1.02] shadow-sm'
                                            : 'border-slate-100 bg-slate-50 hover:border-slate-200 hover:bg-white'
                                            }`}
                                    >
                                        <span className="text-base mb-0.5">{info.icon}</span>
                                        <span className={`text-[8px] font-black uppercase text-center leading-tight ${isActive ? 'text-indigo-600' : 'text-slate-500'}`}>
                                            {info.label}
                                        </span>
                                        <span className={`text-[11px] font-black mt-0.5 ${isActive ? 'text-indigo-700' : 'text-slate-900'}`}>
                                            {count}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

import React, { useState, useMemo, useImperativeHandle, forwardRef } from 'react';
import { Download, Trash2, Info, ChevronDown, ChevronRight, Lightbulb, AlertCircle, AlertTriangle, CheckCircle } from 'lucide-react';
import { RawAdRecord, AdConfiguration } from '../../types';
import { QuadrantThresholds } from '../../utils/quadrantUtils';
import {
    generateActionItems,
    exportActionItemsToCSV,
    ActionItemsResult,
    generateNewAudienceActionItems,
    exportNewAudienceActionItemsToCSV,
    NewAudienceActionItemsResult
} from '../../utils/actionItemsUtils';
import { formatCurrency } from '../../utils/dataUtils';
import { LevelToggle } from '../filters/LevelToggle';
import { SearchInput } from '../filters/SearchInput';
import { MultiSelect } from '../filters/MultiSelect';
import { getOptimizationGuidance, getTriggeredConditions, getPriorityLevel, CampaignMetrics } from '../../utils/optimizationRules';
import { toggleGuidance, getPriorityIcon, getPriorityBadge, GuidanceDetailPanel } from './GuidanceHelpers';
// 新增：导入诊断引擎和Benchmark计算器
import { diagnoseCampaign, diagnoseCampaignWithContext, DiagnosticResult, CampaignContext, convertToDetailedDiagnostic, diagnoseAllScenarios } from '../../utils/campaignDiagnostics';
import { calculateBenchmarks, CampaignBenchmarks } from '../../utils/benchmarkCalculator';

interface ActionItemsTabProps {
    data: RawAdRecord[];
    configs: AdConfiguration[];
    dateRange: { start: string; end: string };
    businessLineThresholds: Map<string, QuadrantThresholds>;
    comparisonData?: RawAdRecord[];
}

export interface ActionItemsTabRef {
    generate: () => void;
    export: () => void;
    hasResult: boolean;
    isLoading: boolean;
}

// KPI 格式化
const formatKPI = (value: number, kpiType: 'ROI' | 'CPC' | 'CPM'): string => {
    if (kpiType === 'ROI') return `${value.toFixed(2)}x`;
    return formatCurrency(value);
};

// KPI Badge with Target 组件
const KPIBadgeWithTarget: React.FC<{
    kpiType: 'ROI' | 'CPC' | 'CPM';
    targetValue: number;
}> = ({ kpiType, targetValue }) => {
    return (
        <div className="flex flex-col gap-0.5 items-center">
            <KPIBadge kpiType={kpiType} />
            <div className="text-sm text-slate-900">
                {formatKPI(targetValue, kpiType)}
            </div>
        </div>
    );
};

// Spend 详细信息单元格
const SpendDetailCell: React.FC<{
    spend: number;
    avgSpend: number;
    lastSpend?: number;
}> = ({ spend, avgSpend, lastSpend }) => {
    const vsAvgPercentage = avgSpend > 0
        ? ((spend - avgSpend) / avgSpend) * 100
        : 0;
    const vsLastPercentage = lastSpend && lastSpend > 0
        ? ((spend - lastSpend) / lastSpend) * 100
        : null;

    const vsAvgArrow = vsAvgPercentage < 0 ? '↓' : '↑';
    const vsLastArrow = vsLastPercentage !== null && vsLastPercentage < 0 ? '↓' : '↑';

    // Color based on arrow direction
    const vsAvgColor = vsAvgPercentage < 0 ? 'text-red-600' : 'text-green-600';
    const vsLastColor = vsLastPercentage !== null && vsLastPercentage < 0 ? 'text-red-600' : 'text-green-600';

    return (
        <div className="flex flex-col gap-0.5">
            <div className="text-sm font-bold text-slate-900">
                {formatCurrency(spend)}
            </div>
            <div className={`text-xs whitespace-nowrap ${vsAvgColor}`}>
                vs Avg: {vsAvgArrow} {Math.abs(vsAvgPercentage).toFixed(1)}%
            </div>
            <div className={`text-xs whitespace-nowrap ${vsLastPercentage !== null ? vsLastColor : 'text-slate-600'}`}>
                vs Last: {vsLastPercentage !== null
                    ? `${vsLastArrow} ${Math.abs(vsLastPercentage).toFixed(1)}%`
                    : 'N/A'
                }
            </div>
        </div>
    );
};

// KPI 值单元格 - Business Line 版本（与 Spend 列格式一致，无标签）
const KPIValueCell: React.FC<{
    actualValue: number;
    avgValue: number;
    lastValue?: number;
    kpiType: 'ROI' | 'CPC' | 'CPM';
}> = ({ actualValue, avgValue, lastValue, kpiType }) => {
    // Calculate vs Avg percentage
    const vsAvgPercentage = avgValue > 0
        ? ((actualValue - avgValue) / avgValue) * 100
        : 0;


    // Calculate vs Last percentage
    const vsLastPercentage = lastValue && lastValue > 0
        ? ((actualValue - lastValue) / lastValue) * 100
        : null;

    const vsAvgArrow = vsAvgPercentage < 0 ? '↓' : '↑';
    const vsLastArrow = vsLastPercentage !== null && vsLastPercentage < 0 ? '↓' : '↑';

    // Color based on KPI type and direction
    // For CPC/CPM (cost metrics): increase=red, decrease=green
    // For ROI (revenue metric): increase=green, decrease=red
    const isCostKPI = kpiType === 'CPC' || kpiType === 'CPM';
    const vsAvgColor = isCostKPI
        ? (vsAvgPercentage < 0 ? 'text-green-600' : 'text-red-600')
        : (vsAvgPercentage < 0 ? 'text-red-600' : 'text-green-600');
    const vsLastColor = isCostKPI
        ? (vsLastPercentage !== null && vsLastPercentage < 0 ? 'text-green-600' : 'text-red-600')
        : (vsLastPercentage !== null && vsLastPercentage < 0 ? 'text-red-600' : 'text-green-600');

    return (
        <div className="flex flex-col gap-0.5">
            {/* 实际值 */}
            <div className="text-sm font-bold text-slate-900">
                {formatKPI(actualValue, kpiType)}
            </div>

            {/* 业务线平均值 + vs Avg % */}
            <div className="text-xs whitespace-nowrap text-slate-600">
                {avgValue > 0 ? (
                    <>
                        <span className="text-slate-500">Avg:</span>{' '}
                        <span className="font-medium">{formatKPI(avgValue, kpiType)}</span>
                        {' '}
                        <span className={vsAvgColor}>
                            ({vsAvgArrow}{Math.abs(vsAvgPercentage).toFixed(1)}%)
                        </span>
                    </>
                ) : (
                    <span className="text-slate-400">Avg: N/A</span>
                )}
            </div>

            {/* 上周期值 + vs Last % */}
            <div className="text-xs whitespace-nowrap text-slate-600">
                {lastValue !== undefined && lastValue !== null ? (
                    <>
                        <span className="text-slate-500">Last:</span>{' '}
                        <span className="font-medium">{formatKPI(lastValue, kpiType)}</span>
                        {vsLastPercentage !== null && (
                            <>
                                {' '}
                                <span className={vsLastColor}>
                                    ({vsLastArrow}{Math.abs(vsLastPercentage).toFixed(1)}%)
                                </span>
                            </>
                        )}
                    </>
                ) : (
                    <span className="text-slate-400">Last: N/A</span>
                )}
            </div>
        </div>
    );
};

// KPI 值单元格 - New Audience 版本（与 Spend 列格式一致，无标签）
const KPIAvgCell: React.FC<{
    actualValue: number;
    avgValue: number;
    lastValue?: number;
    kpiType: 'ROI' | 'CPC' | 'CPM';
}> = ({ actualValue, avgValue, lastValue, kpiType }) => {
    // Calculate vs Avg percentage
    const vsAvgPercentage = avgValue > 0
        ? ((actualValue - avgValue) / avgValue) * 100
        : 0;

    // Calculate vs Last percentage
    const vsLastPercentage = lastValue && lastValue > 0
        ? ((actualValue - lastValue) / lastValue) * 100
        : null;

    const vsAvgArrow = vsAvgPercentage < 0 ? '↓' : '↑';
    const vsLastArrow = vsLastPercentage !== null && vsLastPercentage < 0 ? '↓' : '↑';

    // Color based on KPI type and direction
    // For CPC/CPM (cost metrics): increase=red, decrease=green
    // For ROI (revenue metric): increase=green, decrease=red
    const isCostKPI = kpiType === 'CPC' || kpiType === 'CPM';
    const vsAvgColor = isCostKPI
        ? (vsAvgPercentage < 0 ? 'text-green-600' : 'text-red-600')
        : (vsAvgPercentage < 0 ? 'text-red-600' : 'text-green-600');
    const vsLastColor = isCostKPI
        ? (vsLastPercentage !== null && vsLastPercentage < 0 ? 'text-green-600' : 'text-red-600')
        : (vsLastPercentage !== null && vsLastPercentage < 0 ? 'text-red-600' : 'text-green-600');

    return (
        <div className="flex flex-col gap-0.5">
            {/* 实际值 */}
            <div className="text-sm font-bold text-slate-900">
                {formatKPI(actualValue, kpiType)}
            </div>

            {/* 业务线平均值 + vs Avg % */}
            <div className="text-xs whitespace-nowrap text-slate-600">
                {avgValue > 0 ? (
                    <>
                        <span className="text-slate-500">Avg:</span>{' '}
                        <span className="font-medium">{formatKPI(avgValue, kpiType)}</span>
                        {' '}
                        <span className={vsAvgColor}>
                            ({vsAvgArrow}{Math.abs(vsAvgPercentage).toFixed(1)}%)
                        </span>
                    </>
                ) : (
                    <span className="text-slate-400">Avg: N/A</span>
                )}
            </div>

            {/* 上周期值 + vs Last % */}
            <div className="text-xs whitespace-nowrap text-slate-600">
                {lastValue !== undefined && lastValue !== null ? (
                    <>
                        <span className="text-slate-500">Last:</span>{' '}
                        <span className="font-medium">{formatKPI(lastValue, kpiType)}</span>
                        {vsLastPercentage !== null && (
                            <>
                                {' '}
                                <span className={vsLastColor}>
                                    ({vsLastArrow}{Math.abs(vsLastPercentage).toFixed(1)}%)
                                </span>
                            </>
                        )}
                    </>
                ) : (
                    <span className="text-slate-400">Last: N/A</span>
                )}
            </div>
        </div>
    );
};

// vs Avg 单元格
const VsAvgCell: React.FC<{
    vsAvgPercentage: number;
    kpiType: 'ROI' | 'CPC' | 'CPM';
}> = ({ vsAvgPercentage, kpiType }) => {
    const arrow = vsAvgPercentage < 0 ? '⬇️' : '⬆️';
    const sign = vsAvgPercentage > 0 ? '+' : '';

    return (
        <span className="text-sm font-bold text-red-600">
        </span>
    );
};

// 排序图标组件
const SortIcon: React.FC<{ active: boolean; direction: 'asc' | 'desc' }> = ({ active, direction }) => {
    if (!active) {
        return <span className="text-slate-400 text-xs ml-1">⇅</span>;
    }
    return direction === 'asc' ?
        <span className="text-indigo-600 text-xs ml-1">▲</span> :
        <span className="text-indigo-600 text-xs ml-1">▼</span>;
};

// KPI 类型标签
const KPIBadge: React.FC<{ kpiType: 'ROI' | 'CPC' | 'CPM' }> = ({ kpiType }) => {
    const colors = {
        ROI: 'bg-blue-100 text-blue-700',
        CPC: 'bg-green-100 text-green-700',
        CPM: 'bg-orange-100 text-orange-700'
    };

    return (
        <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${colors[kpiType]}`}>
            {kpiType}
        </span>
    );
};

export const ActionItemsTab = forwardRef<ActionItemsTabRef, ActionItemsTabProps>(({
    data,
    configs,
    dateRange,
    businessLineThresholds,
    comparisonData
}, ref) => {
    const [activeSubTab, setActiveSubTab] = useState<'businessLine' | 'newAudience'>('businessLine');
    const [blResult, setBlResult] = useState<ActionItemsResult | null>(null);
    const [naResult, setNaResult] = useState<NewAudienceActionItemsResult | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [blRemovedIds, setBlRemovedIds] = useState<Set<string>>(new Set());
    const [naRemovedIds, setNaRemovedIds] = useState<Set<string>>(new Set());

    // Filter states for Business Line sub-tab
    const [blFilterLevel, setBlFilterLevel] = useState<'All' | 'Campaign' | 'AdSet' | 'Ad'>('All');
    const [blSearchText, setBlSearchText] = useState('');
    const [blBusinessLineFilter, setBlBusinessLineFilter] = useState<string>('all'); // 'all' or businessLineId

    // Filter states for New Audience sub-tab
    const [naFilterLevel, setNaFilterLevel] = useState<'All' | 'AdSet' | 'Ad'>('All');
    const [naKPI, setNaKPI] = useState<'ROI' | 'CPC' | 'CPM'>('ROI');
    const [naSearchText, setNaSearchText] = useState('');
    const [naBusinessLineFilter, setNaBusinessLineFilter] = useState<string>('all'); // 'all' or businessLineId

    // 调优指导展开状态
    const [blExpandedGuidance, setBlExpandedGuidance] = useState<Set<string>>(new Set());

    // 排序状态 - Business Line
    const [campaignSort, setCampaignSort] = useState<{ field: 'spend' | 'kpi'; direction: 'asc' | 'desc' }>({
        field: 'spend',
        direction: 'desc'
    });
    const [adSetSort, setAdSetSort] = useState<{ field: 'spend' | 'kpi'; direction: 'asc' | 'desc' }>({
        field: 'spend',
        direction: 'desc'
    });
    const [adSort, setAdSort] = useState<{ field: 'spend' | 'kpi'; direction: 'asc' | 'desc' }>({
        field: 'spend',
        direction: 'desc'
    });

    // 过滤已删除的项目 - Business Line
    const filteredBlResult = useMemo(() => {
        if (!blResult) return null;

        let campaigns = blResult.campaigns.filter(c => !blRemovedIds.has(c.id));
        let adSets = blResult.adSets.filter(a => !blRemovedIds.has(a.id));
        let ads = blResult.ads.filter(a => !blRemovedIds.has(a.id));

        // Filter by business line
        if (blBusinessLineFilter !== 'all') {
            campaigns = campaigns.filter(c => c.businessLineId === blBusinessLineFilter);
            adSets = adSets.filter(a => a.businessLineId === blBusinessLineFilter);
            ads = ads.filter(a => a.businessLineId === blBusinessLineFilter);
        }

        // Filter by search text - search by campaign name and show related items
        if (blSearchText) {
            const lowerSearch = blSearchText.toLowerCase();

            // Filter campaigns by name
            const matchingCampaigns = campaigns.filter(c => c.campaignName.toLowerCase().includes(lowerSearch));
            const matchingCampaignNames = new Set(matchingCampaigns.map(c => c.campaignName));

            // Filter adSets and ads that belong to matching campaigns
            campaigns = matchingCampaigns;
            adSets = adSets.filter(a => matchingCampaignNames.has(a.campaignName));
            ads = ads.filter(a => matchingCampaignNames.has(a.campaignName));
        }

        // Apply level filter only when a specific level is selected
        if (blFilterLevel === 'Campaign') {
            return { campaigns, adSets: [], ads: [] };
        } else if (blFilterLevel === 'AdSet') {
            return { campaigns: [], adSets, ads: [] };
        } else if (blFilterLevel === 'Ad') {
            return { campaigns: [], adSets: [], ads };
        } else {
            // Default: show all levels
            return { campaigns, adSets, ads };
        }
    }, [blResult, blRemovedIds, blFilterLevel, blSearchText, blBusinessLineFilter]);

    // 过滤已删除的项目 - New Audience
    const filteredNaResult = useMemo(() => {
        if (!naResult) return null;

        let adSets = naResult.adSets.filter(a => !naRemovedIds.has(a.id));
        let ads = naResult.ads.filter(a => !naRemovedIds.has(a.id));

        // Filter by KPI type
        adSets = adSets.filter(a => a.kpiType === naKPI);
        ads = ads.filter(a => a.kpiType === naKPI);

        // Filter by business line
        if (naBusinessLineFilter !== 'all') {
            adSets = adSets.filter(a => a.businessLineId === naBusinessLineFilter);
            ads = ads.filter(a => a.businessLineId === naBusinessLineFilter);
        }

        // Filter by search text - search by adset name and show related items
        if (naSearchText) {
            const lowerSearch = naSearchText.toLowerCase();

            // Filter adSets by name
            const matchingAdSets = adSets.filter(a => a.adSetName.toLowerCase().includes(lowerSearch));
            const matchingAdSetNames = new Set(matchingAdSets.map(a => a.adSetName));

            // Filter ads that belong to matching adSets
            adSets = matchingAdSets;
            ads = ads.filter(a => matchingAdSetNames.has(a.adSetName));
        }

        // Apply level filter only when a specific level is selected
        if (naFilterLevel === 'AdSet') {
            return { adSets, ads: [] };
        } else if (naFilterLevel === 'Ad') {
            return { adSets: [], ads };
        } else {
            // Default: show all levels
            return { adSets, ads };
        }
    }, [naResult, naRemovedIds, naFilterLevel, naKPI, naSearchText, naBusinessLineFilter]);

    // 计算Campaign的Benchmark基准值（用于新的诊断引擎）
    const campaignBenchmarks = useMemo(() => {
        if (!filteredBlResult || filteredBlResult.campaigns.length === 0) {
            return null;
        }

        // 将Campaign数据转换为calculateBenchmarks需要的格式
        const campaignsWithMetrics = filteredBlResult.campaigns.map(c => ({
            metrics: {
                spend: c.spend,
                impressions: c.metrics?.impressions || 0,
                link_clicks: c.metrics?.clicks || 0,
                purchases: c.metrics?.purchases || 0,
                purchase_value: c.metrics?.purchase_value || 0,
                adds_to_cart: c.metrics?.adds_to_cart || 0,
                checkouts_initiated: c.metrics?.checkouts_initiated || 0,
                roi: c.metrics?.roi || 0,
                cpa: c.metrics?.cpa || 0,
                cpc: c.metrics?.cpc || 0,
                ctr: c.metrics?.ctr || 0,
                cpm: c.metrics?.cpm || 0,
                cpatc: c.metrics?.cpatc || 0,
                atc_rate: c.metrics?.atc_rate || 0,
                acos: c.metrics?.acos || 0,
                cvr: c.metrics?.cvr || 0,
                aov: c.metrics?.aov || 0,
                // 新增的中间转化指标
                click_to_pv_rate: c.metrics?.click_to_pv_rate || 0,
                checkout_rate: c.metrics?.checkout_rate || 0,
                purchase_rate: c.metrics?.purchase_rate || 0,
                frequency: c.metrics?.frequency || 0,
            }
        }));

        return calculateBenchmarks(campaignsWithMetrics);
    }, [filteredBlResult]);

    // 排序处理函数
    const handleCampaignSort = (field: 'spend' | 'kpi') => {
        setCampaignSort(prev => ({
            field,
            direction: prev.field === field && prev.direction === 'desc' ? 'asc' : 'desc'
        }));
    };

    const handleAdSetSort = (field: 'spend' | 'kpi') => {
        setAdSetSort(prev => ({
            field,
            direction: prev.field === field && prev.direction === 'desc' ? 'asc' : 'desc'
        }));
    };

    const handleAdSort = (field: 'spend' | 'kpi') => {
        setAdSort(prev => ({
            field,
            direction: prev.field === field && prev.direction === 'desc' ? 'asc' : 'desc'
        }));
    };

    // 排序后的数据
    const sortedCampaigns = useMemo(() => {
        if (!filteredBlResult) return [];
        const items = [...filteredBlResult.campaigns];
        return items.sort((a, b) => {
            const aValue = campaignSort.field === 'spend' ? a.spend : a.actualValue;
            const bValue = campaignSort.field === 'spend' ? b.spend : b.actualValue;
            return campaignSort.direction === 'asc' ? aValue - bValue : bValue - aValue;
        });
    }, [filteredBlResult, campaignSort]);

    const sortedAdSets = useMemo(() => {
        if (!filteredBlResult) return [];
        const items = [...filteredBlResult.adSets];
        return items.sort((a, b) => {
            const aValue = adSetSort.field === 'spend' ? a.spend : a.actualValue;
            const bValue = adSetSort.field === 'spend' ? b.spend : b.actualValue;
            return adSetSort.direction === 'asc' ? aValue - bValue : bValue - aValue;
        });
    }, [filteredBlResult, adSetSort]);

    const sortedAds = useMemo(() => {
        if (!filteredBlResult) return [];
        const items = [...filteredBlResult.ads];
        return items.sort((a, b) => {
            const aValue = adSort.field === 'spend' ? a.spend : a.actualValue;
            const bValue = adSort.field === 'spend' ? b.spend : b.actualValue;
            return adSort.direction === 'asc' ? aValue - bValue : bValue - aValue;
        });
    }, [filteredBlResult, adSort]);

    // 生成 Action Items
    const handleGenerate = () => {
        setIsLoading(true);
        setTimeout(() => {
            const blActionResult = generateActionItems(data, configs, businessLineThresholds, comparisonData);
            const naActionResult = generateNewAudienceActionItems(data, configs, businessLineThresholds, dateRange.end, comparisonData);
            setBlResult(blActionResult);
            setNaResult(naActionResult);
            setBlRemovedIds(new Set());
            setNaRemovedIds(new Set());
            setIsLoading(false);
        }, 500);
    };

    // 导出 CSV
    const handleExport = () => {
        if (activeSubTab === 'businessLine' && filteredBlResult) {
            const csv = exportActionItemsToCSV(filteredBlResult);
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `Action_Items_BusinessLine_${dateRange.start}_${dateRange.end}.csv`;
            link.click();
            URL.revokeObjectURL(url);
        } else if (activeSubTab === 'newAudience' && filteredNaResult) {
            const csv = exportNewAudienceActionItemsToCSV(filteredNaResult);
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `Action_Items_NewAudience_${dateRange.start}_${dateRange.end}.csv`;
            link.click();
            URL.revokeObjectURL(url);
        }
    };

    // 删除项目
    const handleBlRemove = (id: string) => {
        setBlRemovedIds(prev => new Set([...prev, id]));
    };

    const handleNaRemove = (id: string) => {
        setNaRemovedIds(prev => new Set([...prev, id]));
    };

    // 暴露方法给父组件
    useImperativeHandle(ref, () => ({
        generate: handleGenerate,
        export: handleExport,
        hasResult: !!(filteredBlResult || filteredNaResult),
        isLoading
    }));

    const hasAnyResult = !!(blResult || naResult);

    return (
        <div className="space-y-6">
            {/* 未生成时的提示 */}
            {!hasAnyResult && !isLoading && (
                <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
                    <div className="text-6xl mb-4">📊</div>
                    <h3 className="text-xl font-bold text-slate-900 mb-2">
                        点击右上角「生成 Action」开始分析
                    </h3>
                    <p className="text-slate-600">
                        系统将自动识别需要优化的 Campaign、人群和素材
                    </p>
                </div>
            )}

            {/* 加载中 */}
            {isLoading && (
                <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
                    <div className="text-6xl mb-4 animate-pulse">⚡</div>
                    <h3 className="text-xl font-bold text-slate-900 mb-2">
                        正在分析数据...
                    </h3>
                </div>
            )}

            {/* 分析结果 */}
            {hasAnyResult && !isLoading && (
                <>
                    {/* 顶部标题和导出按钮 */}
                    <div className="flex justify-between items-center">
                        <h2 className="text-2xl font-black text-slate-900">分析结果</h2>
                        <button
                            onClick={handleExport}
                            className="flex items-center gap-2 px-6 py-2.5 bg-white text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-50 transition-all border border-slate-200 shadow-sm"
                        >
                            <Download className="w-4 h-4" />
                            导出表格
                        </button>
                    </div>

                    {/* 二级 Tab 导航 */}
                    <div className="flex gap-2">
                        <button
                            onClick={() => setActiveSubTab('businessLine')}
                            className={`px-6 py-2 rounded-lg font-bold text-sm transition-all ${activeSubTab === 'businessLine'
                                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200'
                                : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
                                }`}
                        >
                            Business Line
                        </button>
                        <button
                            onClick={() => setActiveSubTab('newAudience')}
                            className={`px-6 py-2 rounded-lg font-bold text-sm transition-all ${activeSubTab === 'newAudience'
                                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200'
                                : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
                                }`}
                        >
                            New Audience
                        </button>
                    </div>

                    {/* Business Line 内容 */}
                    {activeSubTab === 'businessLine' && filteredBlResult && (
                        <>
                            {/* 概览卡片 */}
                            <div className="grid grid-cols-3 gap-4">
                                <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
                                    <div className="text-xs text-slate-500 mb-1 uppercase font-bold tracking-wider">需调整 Campaign</div>
                                    <div className="text-3xl font-black text-slate-900">{filteredBlResult.campaigns.length}</div>
                                </div>
                                <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
                                    <div className="text-xs text-slate-500 mb-1 uppercase font-bold tracking-wider">需调整人群</div>
                                    <div className="text-3xl font-black text-slate-900">{filteredBlResult.adSets.length}</div>
                                </div>
                                <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
                                    <div className="text-xs text-slate-500 mb-1 uppercase font-bold tracking-wider">需调整素材</div>
                                    <div className="text-3xl font-black text-slate-900">{filteredBlResult.ads.length}</div>
                                </div>
                            </div>

                            {/* 统计说明 */}
                            <div className="bg-blue-50 rounded-xl p-4 border border-blue-100 flex items-start gap-3">
                                <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                                <div className="text-sm text-blue-800">
                                    <div className="font-bold mb-1">统计说明：</div>
                                    <ul className="space-y-0.5 text-blue-700">
                                        <li>• 需调整 Campaign：位于「观察区」或「问题区」的 Campaign（基于 Business Line 中调整的阈值）</li>
                                        <li>• 需调整人群：上述 Campaign 中，KPI 值低于业务线平均值的 Ad Set</li>
                                        <li>• 需调整素材：上述 Campaign 中，KPI 值低于业务线平均值的 Ad</li>
                                        <li>• 优先级判定（仅 ROI 类型）：
                                            <ul className="ml-4 mt-0.5 space-y-0.5">
                                                <li>- 🔴 P0：ROI \u003c Benchmark × 80%（低于基准 20% 以上）</li>
                                                <li>- 🟡 P1：Benchmark × 80% ≤ ROI \u003c Benchmark（低于基准 0-20%）</li>
                                            </ul>
                                        </li>
                                        <li>• 数据范围：{dateRange.start} - {dateRange.end}</li>
                                    </ul>
                                </div>
                            </div>

                            {/* Filter Controls */}
                            <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
                                <div className="flex items-center gap-3 flex-wrap">
                                    {/* Business Line Filter */}
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-bold text-slate-700">业务线:</span>
                                        <select
                                            value={blBusinessLineFilter}
                                            onChange={(e) => setBlBusinessLineFilter(e.target.value)}
                                            className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                                        >
                                            <option value="all">全部</option>
                                            {configs.map(config => (
                                                <option key={config.id} value={config.id}>
                                                    {config.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <LevelToggle
                                        levels={['All', 'Campaign', 'AdSet', 'Ad']}
                                        selected={blFilterLevel}
                                        onChange={(level) => setBlFilterLevel(level as 'All' | 'Campaign' | 'AdSet' | 'Ad')}
                                    />
                                    <SearchInput
                                        value={blSearchText}
                                        onChange={setBlSearchText}
                                        placeholder={`Search ${blFilterLevel} names...`}
                                    />
                                </div>
                            </div>

                            {/* Campaign 列表 */}
                            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                                <div className="px-5 py-4 border-b border-slate-200 bg-slate-50">
                                    <h3 className="text-lg font-black text-slate-900">
                                        📋 需要调整的 Campaign ({filteredBlResult.campaigns.length})
                                    </h3>
                                </div>
                                {filteredBlResult.campaigns.length > 0 ? (
                                    <div className="overflow-x-auto">
                                        <table className="w-full">
                                            <thead className="bg-slate-50 border-b border-slate-200">
                                                <tr>
                                                    <th className="px-4 py-3 text-left text-xs font-black text-slate-700 uppercase">Campaign Name</th>
                                                    <th className="px-4 py-3 text-left text-xs font-black text-slate-700 uppercase">业务线</th>
                                                    <th
                                                        className="px-4 py-3 text-left text-xs font-black text-slate-700 uppercase cursor-pointer hover:bg-slate-100 transition-colors select-none"
                                                        onClick={() => handleCampaignSort('spend')}
                                                    >
                                                        <div className="flex items-center gap-1">
                                                            Spend
                                                            <SortIcon
                                                                active={campaignSort.field === 'spend'}
                                                                direction={campaignSort.direction}
                                                            />
                                                        </div>
                                                    </th>
                                                    <th className="px-4 py-3 text-left text-xs font-black text-slate-700 uppercase">KPI</th>
                                                    <th
                                                        className="px-4 py-3 text-left text-xs font-black text-slate-700 uppercase cursor-pointer hover:bg-slate-100 transition-colors select-none"
                                                        onClick={() => handleCampaignSort('kpi')}
                                                    >
                                                        <div className="flex items-center gap-1">
                                                            KPI 值
                                                            <SortIcon
                                                                active={campaignSort.field === 'kpi'}
                                                                direction={campaignSort.direction}
                                                            />
                                                        </div>
                                                    </th>
                                                    <th className="px-4 py-3 text-center text-xs font-black text-slate-700 uppercase w-20">优先级</th>
                                                    <th className="px-4 py-3 text-left text-xs font-black text-slate-700 uppercase w-24">调优指导</th>
                                                    <th className="px-4 py-3 text-left text-xs font-black text-slate-700 uppercase">操作</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {sortedCampaigns.map(campaign => {
                                                    const isExpanded = blExpandedGuidance.has(campaign.id);

                                                    const metrics: CampaignMetrics = {
                                                        spend: campaign.spend,
                                                        roi: campaign.kpiType === 'ROI' ? campaign.actualValue : undefined,
                                                        cpc: campaign.kpiType === 'CPC' ? campaign.actualValue : undefined,
                                                        cpm: campaign.kpiType === 'CPM' ? campaign.actualValue : undefined,
                                                        cvr: campaign.metrics?.cvr,
                                                        aov: campaign.metrics?.aov,
                                                        cpa: campaign.metrics?.cpa,
                                                        cpatc: campaign.metrics?.cpatc,
                                                        atc_rate: campaign.metrics?.atc_rate,
                                                        ctr: campaign.metrics?.ctr,
                                                        clicks: campaign.metrics?.clicks,
                                                        impressions: campaign.metrics?.impressions,
                                                        reach: campaign.metrics?.reach,
                                                        frequency: campaign.metrics?.frequency,
                                                    };

                                                    const avgMetrics: CampaignMetrics = {
                                                        spend: campaign.avgSpend,
                                                        roi: campaign.kpiType === 'ROI' ? campaign.avgValue : undefined,
                                                        cpc: campaign.kpiType === 'CPC' ? campaign.avgValue : undefined,
                                                        cpm: campaign.kpiType === 'CPM' ? campaign.avgValue : undefined,
                                                        cvr: campaign.avgMetrics?.cvr,
                                                        aov: campaign.avgMetrics?.aov,
                                                        cpa: campaign.avgMetrics?.cpa,
                                                        cpatc: campaign.avgMetrics?.cpatc,
                                                        atc_rate: campaign.avgMetrics?.atc_rate,
                                                        ctr: campaign.avgMetrics?.ctr,
                                                        clicks: campaign.avgMetrics?.clicks,
                                                        impressions: campaign.avgMetrics?.impressions,
                                                        reach: campaign.avgMetrics?.reach,
                                                        frequency: campaign.avgMetrics?.frequency,
                                                    };


                                                    // 使用新的诊断引擎（仅针对ROI类型的Campaign）
                                                    let guidance: string;
                                                    let diagnosticResult: DiagnosticResult | null = null;
                                                    let context: CampaignContext | undefined;

                                                    if (campaign.kpiType === 'ROI' && campaignBenchmarks) {
                                                        // 计算上下文数据（用于场景5和6）

                                                        // 1. 计算AdSet数量
                                                        const adsetCount = new Set(
                                                            data
                                                                .filter(r => r.campaign_name === campaign.campaignName)
                                                                .map(r => r.adset_name)
                                                        ).size;

                                                        // 2. 计算运行天数
                                                        const start = new Date(dateRange.start);
                                                        const end = new Date(dateRange.end);
                                                        const diffTime = Math.abs(end.getTime() - start.getTime());
                                                        const activeDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // 包含起始日

                                                        // 3. 计算日预算和Campaign总预算
                                                        const config = configs.find(c => c.id === campaign.businessLineId);
                                                        const totalBudget = config?.budget || 0;
                                                        const dailyBudget = totalBudget / activeDays / filteredBlResult.campaigns.length;
                                                        const campaignBudget = dailyBudget * activeDays;

                                                        // 4. 构建上下文对象
                                                        context = {
                                                            adsetCount,
                                                            activeDays,
                                                            dailyBudget,
                                                            campaignBudget
                                                        };

                                                        // 5. 使用扩展的诊断函数（包含场景5和6）
                                                        diagnosticResult = diagnoseCampaignWithContext(
                                                            {
                                                                ...metrics,
                                                                // 确保包含所有新增的中间指标
                                                                click_to_pv_rate: campaign.metrics?.click_to_pv_rate || 0,
                                                                checkout_rate: campaign.metrics?.checkout_rate || 0,
                                                                purchase_rate: campaign.metrics?.purchase_rate || 0,
                                                                frequency: campaign.metrics?.frequency || 0,
                                                            } as any,
                                                            campaignBenchmarks,
                                                            context  // 传入上下文数据
                                                        );

                                                        // 获取所有匹配的诊断场景（支持多场景显示）
                                                        const allDiagnosticResults = campaign.kpiType === 'ROI' && campaignBenchmarks && context
                                                            ? diagnoseAllScenarios(
                                                                {
                                                                    ...metrics,
                                                                    click_to_pv_rate: campaign.metrics?.click_to_pv_rate || 0,
                                                                    checkout_rate: campaign.metrics?.checkout_rate || 0,
                                                                    purchase_rate: campaign.metrics?.purchase_rate || 0,
                                                                    frequency: campaign.metrics?.frequency || 0,
                                                                } as any,
                                                                campaignBenchmarks,
                                                                context
                                                            )
                                                            : [];

                                                        if (allDiagnosticResults.length > 0) {
                                                            // 格式化所有诊断结果为guidance字符串，每个场景一行
                                                            guidance = allDiagnosticResults.map(result => {
                                                                const priorityEmoji = result.priority === 1 ? '🔴' : result.priority === 2 ? '🟡' : '🟢';
                                                                return `${priorityEmoji} ${result.scenario} - ${result.diagnosis}: ${result.action}`;
                                                            }).join('\n');
                                                        } else if (diagnosticResult) {
                                                            // 兼容旧逻辑：如果没有多场景结果但有单场景结果
                                                            const priorityEmoji = diagnosticResult.priority === 1 ? '🔴' : diagnosticResult.priority === 2 ? '🟡' : '🟢';
                                                            guidance = `${priorityEmoji} ${diagnosticResult.scenario} - ${diagnosticResult.diagnosis}\n${diagnosticResult.action}`;
                                                        } else {
                                                            guidance = '✅ 表现正常';
                                                        }
                                                    } else {
                                                        // 对于非ROI类型或没有benchmarks的情况，使用旧的规则引擎
                                                        guidance = getOptimizationGuidance('Campaign', campaign.kpiType, metrics, avgMetrics);
                                                    }

                                                    // 获取所有匹配的诊断场景详情（用于详细面板显示）
                                                    const diagnosticDetails = campaign.kpiType === 'ROI' && campaignBenchmarks && context
                                                        ? diagnoseAllScenarios(
                                                            {
                                                                ...metrics,
                                                                click_to_pv_rate: campaign.metrics?.click_to_pv_rate || 0,
                                                                checkout_rate: campaign.metrics?.checkout_rate || 0,
                                                                purchase_rate: campaign.metrics?.purchase_rate || 0,
                                                                frequency: campaign.metrics?.frequency || 0,
                                                            } as any,
                                                            campaignBenchmarks,
                                                            context
                                                        ).map(result => convertToDetailedDiagnostic(
                                                            result,
                                                            {
                                                                ...metrics,
                                                                click_to_pv_rate: campaign.metrics?.click_to_pv_rate || 0,
                                                                checkout_rate: campaign.metrics?.checkout_rate || 0,
                                                                purchase_rate: campaign.metrics?.purchase_rate || 0,
                                                                frequency: campaign.metrics?.frequency || 0,
                                                            } as any,
                                                            campaignBenchmarks,
                                                            context
                                                        ))
                                                        : undefined;

                                                    return (
                                                        <React.Fragment key={campaign.id}>
                                                            <tr className="border-b hover:bg-slate-50 transition-all">
                                                                <td className="px-4 py-3 font-medium text-slate-900">{campaign.campaignName}</td>
                                                                <td className="px-4 py-3 text-slate-600">{campaign.businessLine}</td>
                                                                <td className="px-4 py-3">
                                                                    <SpendDetailCell
                                                                        spend={campaign.spend}
                                                                        avgSpend={campaign.avgSpend}
                                                                        lastSpend={campaign.lastSpend}
                                                                    />
                                                                </td>
                                                                <td className="px-4 py-3">
                                                                    <KPIBadgeWithTarget
                                                                        kpiType={campaign.kpiType}
                                                                        targetValue={campaign.targetValue}
                                                                    />
                                                                </td>
                                                                <td className="px-4 py-3">
                                                                    <KPIValueCell
                                                                        actualValue={campaign.actualValue}
                                                                        avgValue={campaign.avgValue}
                                                                        lastValue={campaign.lastValue}
                                                                        kpiType={campaign.kpiType}
                                                                    />
                                                                </td>

                                                                <td className="px-4 py-3 text-center">
                                                                    {campaign.priority === 'P0' && (
                                                                        <span className="text-red-600 font-bold text-sm">🔴 P0</span>
                                                                    )}
                                                                    {campaign.priority === 'P1' && (
                                                                        <span className="text-amber-600 font-bold text-sm">🟡 P1</span>
                                                                    )}
                                                                    {!campaign.priority && (
                                                                        <span className="text-gray-400 text-sm">-</span>
                                                                    )}
                                                                </td>

                                                                <td className="px-4 py-3">
                                                                    <button
                                                                        onClick={() => toggleGuidance(blExpandedGuidance, setBlExpandedGuidance, campaign.id)}
                                                                        className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-slate-100 transition-colors"
                                                                    >
                                                                        {getPriorityIcon(guidance)}
                                                                        {isExpanded ? (
                                                                            <ChevronDown className="w-4 h-4 text-slate-500" />
                                                                        ) : (
                                                                            <ChevronRight className="w-4 h-4 text-slate-500" />
                                                                        )}
                                                                    </button>
                                                                </td>

                                                                <td className="px-4 py-3">
                                                                    <button
                                                                        onClick={() => handleBlRemove(campaign.id)}
                                                                        className="p-2 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-lg transition-all"
                                                                    >
                                                                        <Trash2 className="w-4 h-4" />
                                                                    </button>
                                                                </td>
                                                            </tr>

                                                            {isExpanded && (
                                                                <tr className="bg-slate-50 border-b border-slate-200">
                                                                    <td colSpan={8} className="px-4 py-4">
                                                                        <div className="space-y-3 w-full">
                                                                            <GuidanceDetailPanel
                                                                                guidance={guidance}
                                                                                metrics={metrics}
                                                                                avgMetrics={avgMetrics}
                                                                                kpiType={campaign.kpiType}
                                                                                intermediateMetrics={campaign.metrics}
                                                                                intermediateAvgMetrics={campaign.avgMetrics}
                                                                                lastMetrics={campaign.lastMetrics}
                                                                                diagnosticDetails={diagnosticDetails}
                                                                            />
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                            )}
                                                        </React.Fragment>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <div className="p-8 text-center text-slate-500">暂无需要调整的 Campaign</div>
                                )}
                            </div>

                            {/* AdSet 列表 */}
                            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                                <div className="px-5 py-4 border-b border-slate-200 bg-slate-50">
                                    <h3 className="text-lg font-black text-slate-900">
                                        👥 需要调整的人群 ({filteredBlResult.adSets.length})
                                    </h3>
                                </div>
                                {filteredBlResult.adSets.length > 0 ? (
                                    <div className="overflow-x-auto">
                                        <table className="w-full">
                                            <thead className="bg-slate-50 border-b border-slate-200">
                                                <tr>
                                                    <th className="px-4 py-3 text-left text-xs font-black text-slate-700 uppercase">AdSet Name</th>
                                                    <th className="px-4 py-3 text-left text-xs font-black text-slate-700 uppercase">Campaign</th>
                                                    <th className="px-4 py-3 text-left text-xs font-black text-slate-700 uppercase">业务线</th>
                                                    <th
                                                        className="px-4 py-3 text-left text-xs font-black text-slate-700 uppercase cursor-pointer hover:bg-slate-100 transition-colors select-none"
                                                        onClick={() => handleAdSetSort('spend')}
                                                    >
                                                        <div className="flex items-center gap-1">
                                                            Spend
                                                            <SortIcon
                                                                active={adSetSort.field === 'spend'}
                                                                direction={adSetSort.direction}
                                                            />
                                                        </div>
                                                    </th>
                                                    <th className="px-4 py-3 text-left text-xs font-black text-slate-700 uppercase">KPI</th>
                                                    <th
                                                        className="px-4 py-3 text-left text-xs font-black text-slate-700 uppercase cursor-pointer hover:bg-slate-100 transition-colors select-none"
                                                        onClick={() => handleAdSetSort('kpi')}
                                                    >
                                                        <div className="flex items-center gap-1">
                                                            KPI 值
                                                            <SortIcon
                                                                active={adSetSort.field === 'kpi'}
                                                                direction={adSetSort.direction}
                                                            />
                                                        </div>
                                                    </th>
                                                    <th className="px-4 py-3 text-left text-xs font-black text-slate-700 uppercase w-24">调优指导</th>
                                                    <th className="px-4 py-3 text-left text-xs font-black text-slate-700 uppercase">操作</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {sortedAdSets.map(adSet => {
                                                    const isExpanded = blExpandedGuidance.has(adSet.id);

                                                    const metrics: CampaignMetrics = {
                                                        spend: adSet.spend,
                                                        roi: adSet.kpiType === 'ROI' ? adSet.actualValue : undefined,
                                                        cpc: adSet.kpiType === 'CPC' ? adSet.actualValue : undefined,
                                                        cpm: adSet.kpiType === 'CPM' ? adSet.actualValue : undefined,
                                                        cvr: adSet.metrics?.cvr,
                                                        aov: adSet.metrics?.aov,
                                                        cpa: adSet.metrics?.cpa,
                                                        cpatc: adSet.metrics?.cpatc,
                                                        atc_rate: adSet.metrics?.atc_rate,
                                                        ctr: adSet.metrics?.ctr,
                                                        clicks: adSet.metrics?.clicks,
                                                        impressions: adSet.metrics?.impressions,
                                                        reach: adSet.metrics?.reach,
                                                        frequency: adSet.metrics?.frequency,
                                                    };

                                                    const avgMetrics: CampaignMetrics = {
                                                        spend: adSet.avgSpend,
                                                        roi: adSet.kpiType === 'ROI' ? adSet.avgValue : undefined,
                                                        cpc: adSet.kpiType === 'CPC' ? adSet.avgValue : undefined,
                                                        cpm: adSet.kpiType === 'CPM' ? adSet.avgValue : undefined,
                                                        cvr: adSet.avgMetrics?.cvr,
                                                        aov: adSet.avgMetrics?.aov,
                                                        cpa: adSet.avgMetrics?.cpa,
                                                        cpatc: adSet.avgMetrics?.cpatc,
                                                        atc_rate: adSet.avgMetrics?.atc_rate,
                                                        ctr: adSet.avgMetrics?.ctr,
                                                        clicks: adSet.avgMetrics?.clicks,
                                                        impressions: adSet.avgMetrics?.impressions,
                                                        reach: adSet.avgMetrics?.reach,
                                                        frequency: adSet.avgMetrics?.frequency,
                                                    };

                                                    const guidance = getOptimizationGuidance('AdSet', adSet.kpiType, metrics, avgMetrics);

                                                    return (
                                                        <React.Fragment key={adSet.id}>
                                                            <tr className="border-b hover:bg-slate-50 transition-all">
                                                                <td className="px-4 py-3 font-medium text-slate-900">{adSet.adSetName}</td>
                                                                <td className="px-4 py-3 text-slate-600">{adSet.campaignName}</td>
                                                                <td className="px-4 py-3 text-slate-600">{adSet.businessLine}</td>
                                                                <td className="px-4 py-3">
                                                                    <SpendDetailCell
                                                                        spend={adSet.spend}
                                                                        avgSpend={adSet.avgSpend}
                                                                        lastSpend={adSet.lastSpend}
                                                                    />
                                                                </td>
                                                                <td className="px-4 py-3">
                                                                    <KPIBadgeWithTarget
                                                                        kpiType={adSet.kpiType}
                                                                        targetValue={adSet.targetValue}
                                                                    />
                                                                </td>
                                                                <td className="px-4 py-3">
                                                                    <KPIValueCell
                                                                        actualValue={adSet.actualValue}
                                                                        avgValue={adSet.avgValue}
                                                                        lastValue={adSet.lastValue}
                                                                        kpiType={adSet.kpiType}
                                                                    />
                                                                </td>

                                                                <td className="px-4 py-3">
                                                                    <button
                                                                        onClick={() => toggleGuidance(blExpandedGuidance, setBlExpandedGuidance, adSet.id)}
                                                                        className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-slate-100 transition-colors"
                                                                    >
                                                                        {getPriorityIcon(guidance)}
                                                                        {isExpanded ? (
                                                                            <ChevronDown className="w-4 h-4 text-slate-500" />
                                                                        ) : (
                                                                            <ChevronRight className="w-4 h-4 text-slate-500" />
                                                                        )}
                                                                    </button>
                                                                </td>

                                                                <td className="px-4 py-3">
                                                                    <button
                                                                        onClick={() => handleBlRemove(adSet.id)}
                                                                        className="p-2 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-lg transition-all"
                                                                    >
                                                                        <Trash2 className="w-4 h-4" />
                                                                    </button>
                                                                </td>
                                                            </tr>

                                                            {isExpanded && (
                                                                <tr className="bg-slate-50 border-b border-slate-200">
                                                                    <td colSpan={8} className="px-4 py-4">
                                                                        <div className="space-y-3 w-full">
                                                                            <GuidanceDetailPanel
                                                                                guidance={guidance}
                                                                                metrics={metrics}
                                                                                avgMetrics={avgMetrics}
                                                                                kpiType={adSet.kpiType}
                                                                                intermediateMetrics={adSet.metrics}
                                                                                intermediateAvgMetrics={adSet.avgMetrics}
                                                                                lastMetrics={adSet.lastMetrics}
                                                                            />
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                            )}
                                                        </React.Fragment>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <div className="p-8 text-center text-slate-500">暂无需要调整的人群</div>
                                )}
                            </div>

                            {/* Ad 列表 */}
                            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                                <div className="px-5 py-4 border-b border-slate-200 bg-slate-50">
                                    <h3 className="text-lg font-black text-slate-900">
                                        🎨 需要调整的素材 ({filteredBlResult.ads.length})
                                    </h3>
                                </div>
                                {filteredBlResult.ads.length > 0 ? (
                                    <div className="overflow-x-auto">
                                        <table className="w-full">
                                            <thead className="bg-slate-50 border-b border-slate-200">
                                                <tr>
                                                    <th className="px-4 py-3 text-left text-xs font-black text-slate-700 uppercase">Ad Name</th>
                                                    <th className="px-4 py-3 text-left text-xs font-black text-slate-700 uppercase">AdSet</th>
                                                    <th className="px-4 py-3 text-left text-xs font-black text-slate-700 uppercase">Campaign</th>
                                                    <th className="px-4 py-3 text-left text-xs font-black text-slate-700 uppercase">业务线</th>
                                                    <th
                                                        className="px-4 py-3 text-left text-xs font-black text-slate-700 uppercase cursor-pointer hover:bg-slate-100 transition-colors select-none"
                                                        onClick={() => handleAdSort('spend')}
                                                    >
                                                        <div className="flex items-center gap-1">
                                                            Spend
                                                            <SortIcon
                                                                active={adSort.field === 'spend'}
                                                                direction={adSort.direction}
                                                            />
                                                        </div>
                                                    </th>
                                                    <th className="px-4 py-3 text-left text-xs font-black text-slate-700 uppercase">KPI</th>
                                                    <th
                                                        className="px-4 py-3 text-left text-xs font-black text-slate-700 uppercase cursor-pointer hover:bg-slate-100 transition-colors select-none"
                                                        onClick={() => handleAdSort('kpi')}
                                                    >
                                                        <div className="flex items-center gap-1">
                                                            KPI 值
                                                            <SortIcon
                                                                active={adSort.field === 'kpi'}
                                                                direction={adSort.direction}
                                                            />
                                                        </div>
                                                    </th>
                                                    <th className="px-4 py-3 text-left text-xs font-black text-slate-700 uppercase w-24">调优指导</th>
                                                    <th className="px-4 py-3 text-left text-xs font-black text-slate-700 uppercase">操作</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {sortedAds.map((ad, adIndex) => {
                                                    const isExpanded = blExpandedGuidance.has(ad.id);

                                                    const metrics: CampaignMetrics = {
                                                        spend: ad.spend,
                                                        roi: ad.kpiType === 'ROI' ? ad.actualValue : undefined,
                                                        cpc: ad.kpiType === 'CPC' ? ad.actualValue : undefined,
                                                        cpm: ad.kpiType === 'CPM' ? ad.actualValue : undefined,
                                                        cvr: ad.metrics?.cvr,
                                                        aov: ad.metrics?.aov,
                                                        cpa: ad.metrics?.cpa,
                                                        cpatc: ad.metrics?.cpatc,
                                                        atc_rate: ad.metrics?.atc_rate,
                                                        ctr: ad.metrics?.ctr,
                                                        clicks: ad.metrics?.clicks,
                                                        impressions: ad.metrics?.impressions,
                                                        reach: ad.metrics?.reach,
                                                        frequency: ad.metrics?.frequency,
                                                    };

                                                    const avgMetrics: CampaignMetrics = {
                                                        spend: ad.avgSpend,
                                                        roi: ad.kpiType === 'ROI' ? ad.avgValue : undefined,
                                                        cpc: ad.kpiType === 'CPC' ? ad.avgValue : undefined,
                                                        cpm: ad.kpiType === 'CPM' ? ad.avgValue : undefined,
                                                        cvr: ad.avgMetrics?.cvr,
                                                        aov: ad.avgMetrics?.aov,
                                                        cpa: ad.avgMetrics?.cpa,
                                                        cpatc: ad.avgMetrics?.cpatc,
                                                        atc_rate: ad.avgMetrics?.atc_rate,
                                                        ctr: ad.avgMetrics?.ctr,
                                                        clicks: ad.avgMetrics?.clicks,
                                                        impressions: ad.avgMetrics?.impressions,
                                                        reach: ad.avgMetrics?.reach,
                                                        frequency: ad.avgMetrics?.frequency,
                                                    };

                                                    const guidance = getOptimizationGuidance('Ad', ad.kpiType, metrics, avgMetrics);

                                                    return (
                                                        <React.Fragment key={`${ad.campaignName}-${ad.adSetName}-${ad.adName}-${adIndex}`}>
                                                            <tr className="border-b hover:bg-slate-50 transition-all">
                                                                <td className="px-4 py-3 font-medium text-slate-900">{ad.adName}</td>
                                                                <td className="px-4 py-3 text-slate-600">{ad.adSetName}</td>
                                                                <td className="px-4 py-3 text-slate-600">{ad.campaignName}</td>
                                                                <td className="px-4 py-3 text-slate-600">{ad.businessLine}</td>
                                                                <td className="px-4 py-3">
                                                                    <SpendDetailCell
                                                                        spend={ad.spend}
                                                                        avgSpend={ad.avgSpend}
                                                                        lastSpend={ad.lastSpend}
                                                                    />
                                                                </td>
                                                                <td className="px-4 py-3">
                                                                    <KPIBadgeWithTarget
                                                                        kpiType={ad.kpiType}
                                                                        targetValue={ad.targetValue}
                                                                    />
                                                                </td>
                                                                <td className="px-4 py-3">
                                                                    <KPIValueCell
                                                                        actualValue={ad.actualValue}
                                                                        avgValue={ad.avgValue}
                                                                        lastValue={ad.lastValue}
                                                                        kpiType={ad.kpiType}
                                                                    />
                                                                </td>

                                                                <td className="px-4 py-3">
                                                                    <button
                                                                        onClick={() => toggleGuidance(blExpandedGuidance, setBlExpandedGuidance, ad.id)}
                                                                        className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-slate-100 transition-colors"
                                                                    >
                                                                        {getPriorityIcon(guidance)}
                                                                        {isExpanded ? (
                                                                            <ChevronDown className="w-4 h-4 text-slate-500" />
                                                                        ) : (
                                                                            <ChevronRight className="w-4 h-4 text-slate-500" />
                                                                        )}
                                                                    </button>
                                                                </td>

                                                                <td className="px-4 py-3">
                                                                    <button
                                                                        onClick={() => handleBlRemove(ad.id)}
                                                                        className="p-2 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-lg transition-all"
                                                                    >
                                                                        <Trash2 className="w-4 h-4" />
                                                                    </button>
                                                                </td>
                                                            </tr>

                                                            {isExpanded && (
                                                                <tr className="bg-slate-50 border-b border-slate-200">
                                                                    <td colSpan={9} className="px-4 py-4">
                                                                        <div className="space-y-3 w-full">
                                                                            <GuidanceDetailPanel
                                                                                guidance={guidance}
                                                                                metrics={metrics}
                                                                                avgMetrics={avgMetrics}
                                                                                kpiType={ad.kpiType}
                                                                                intermediateMetrics={ad.metrics}
                                                                                intermediateAvgMetrics={ad.avgMetrics}
                                                                                lastMetrics={ad.lastMetrics}
                                                                            />
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                            )}
                                                        </React.Fragment>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <div className="p-8 text-center text-slate-500">暂无需要调整的素材</div>
                                )}
                            </div>

                            {/* 无数据情况 */}
                            {filteredBlResult.campaigns.length === 0 &&
                                filteredBlResult.adSets.length === 0 &&
                                filteredBlResult.ads.length === 0 && (
                                    <div className="bg-green-50 rounded-2xl p-12 text-center border border-green-100">
                                        <div className="text-6xl mb-4">✅</div>
                                        <h3 className="text-xl font-bold text-green-900 mb-2">
                                            太棒了！没有需要调整的项目
                                        </h3>
                                        <p className="text-green-700">
                                            所有 Campaign 表现良好
                                        </p>
                                    </div>
                                )}
                        </>
                    )}

                    {/* New Audience 内容 */}
                    {activeSubTab === 'newAudience' && filteredNaResult && (
                        <>
                            {/* 概览卡片 */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
                                    <div className="text-xs text-slate-500 mb-1 uppercase font-bold tracking-wider">需调整人群</div>
                                    <div className="text-3xl font-black text-slate-900">{filteredNaResult.adSets.length}</div>
                                </div>
                                <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
                                    <div className="text-xs text-slate-500 mb-1 uppercase font-bold tracking-wider">需调整素材</div>
                                    <div className="text-3xl font-black text-slate-900">{filteredNaResult.ads.length}</div>
                                </div>
                            </div>

                            {/* 统计说明 */}
                            <div className="bg-blue-50 rounded-xl p-4 border border-blue-100 flex items-start gap-3">
                                <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                                <div className="text-sm text-blue-800">
                                    <div className="font-bold mb-1">统计说明：</div>
                                    <ul className="space-y-0.5 text-blue-700">
                                        <li>• 需调整人群：投放时长 &lt; 7 天，且 KPI 值低于业务线平均值的 Ad Set</li>
                                        <li>• 需调整素材：所属 Ad Set 投放时长 &lt; 7 天，且 KPI 值低于业务线平均值的 Ad</li>
                                        <li>• 投放时长计算：基于 Ad 级别的连续投放天数</li>
                                        <li>• 数据范围：{dateRange.start} - {dateRange.end}</li>
                                    </ul>
                                </div>
                            </div>


                            {/* Filter Controls */}
                            <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
                                <div className="flex items-center gap-3 flex-wrap">
                                    {/* Business Line Filter */}
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-bold text-slate-700">业务线:</span>
                                        <select
                                            value={naBusinessLineFilter}
                                            onChange={(e) => setNaBusinessLineFilter(e.target.value)}
                                            className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                                        >
                                            <option value="all">全部</option>
                                            {configs.map(config => (
                                                <option key={config.id} value={config.id}>
                                                    {config.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <span className="text-sm font-bold text-slate-700">KPI：</span>
                                    <LevelToggle
                                        levels={['ROI', 'CPC', 'CPM']}
                                        selected={naKPI}
                                        onChange={(kpi) => setNaKPI(kpi as 'ROI' | 'CPC' | 'CPM')}
                                    />
                                    <span className="text-sm font-bold text-slate-700 ml-3">Filter：</span>
                                    <LevelToggle
                                        levels={['All', 'AdSet', 'Ad']}
                                        selected={naFilterLevel}
                                        onChange={(level) => setNaFilterLevel(level as 'All' | 'AdSet' | 'Ad')}
                                    />
                                    <SearchInput
                                        value={naSearchText}
                                        onChange={setNaSearchText}
                                        placeholder={`Search ${naFilterLevel} names...`}
                                    />
                                </div>
                            </div>

                            {/* AdSet 列表 */}
                            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                                <div className="px-5 py-4 border-b border-slate-200 bg-slate-50">
                                    <h3 className="text-lg font-black text-slate-900">
                                        👥 需要调整的人群 ({filteredNaResult.adSets.length})
                                    </h3>
                                </div>
                                {filteredNaResult.adSets.length > 0 ? (
                                    <div className="overflow-x-auto">
                                        <table className="w-full">
                                            <thead className="bg-slate-50 border-b border-slate-200">
                                                <tr>
                                                    <th className="px-4 py-3 text-left text-xs font-black text-slate-700 uppercase">AdSet Name</th>
                                                    <th className="px-4 py-3 text-left text-xs font-black text-slate-700 uppercase">Campaign</th>
                                                    <th className="px-4 py-3 text-left text-xs font-black text-slate-700 uppercase">业务线</th>
                                                    <th className="px-4 py-3 text-left text-xs font-black text-slate-700 uppercase">Spend</th>
                                                    <th className="px-4 py-3 text-left text-xs font-black text-slate-700 uppercase">投放时长</th>
                                                    <th className="px-4 py-3 text-left text-xs font-black text-slate-700 uppercase">KPI</th>
                                                    <th className="px-4 py-3 text-left text-xs font-black text-slate-700 uppercase">KPI 值</th>
                                                    <th className="px-4 py-3 text-left text-xs font-black text-slate-700 uppercase">操作</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {filteredNaResult.adSets.map(adSet => (
                                                    <tr key={adSet.id} className="border-b hover:bg-slate-50 transition-all">
                                                        <td className="px-4 py-3 font-medium text-slate-900">{adSet.adSetName}</td>
                                                        <td className="px-4 py-3 text-slate-600">{adSet.campaignName}</td>
                                                        <td className="px-4 py-3 text-slate-600">{adSet.businessLine}</td>
                                                        <td className="px-4 py-3">
                                                            <SpendDetailCell
                                                                spend={adSet.spend}
                                                                avgSpend={adSet.avgSpend}
                                                                lastSpend={adSet.lastSpend}
                                                            />
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs font-bold whitespace-nowrap">
                                                                {adSet.durationDays} 天
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <KPIBadgeWithTarget
                                                                kpiType={adSet.kpiType}
                                                                targetValue={adSet.targetValue}
                                                            />
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <KPIAvgCell
                                                                actualValue={adSet.actualValue}
                                                                avgValue={adSet.avgValue}
                                                                lastValue={adSet.lastValue}
                                                                kpiType={adSet.kpiType}
                                                            />
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <button
                                                                onClick={() => handleNaRemove(adSet.id)}
                                                                className="p-2 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-lg transition-all"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <div className="p-8 text-center text-slate-500">暂无需要调整的人群</div>
                                )}
                            </div>

                            {/* Ad 列表 */}
                            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                                <div className="px-5 py-4 border-b border-slate-200 bg-slate-50">
                                    <h3 className="text-lg font-black text-slate-900">
                                        🎨 需要调整的素材 ({filteredNaResult.ads.length})
                                    </h3>
                                </div>
                                {filteredNaResult.ads.length > 0 ? (
                                    <div className="overflow-x-auto">
                                        <table className="w-full">
                                            <thead className="bg-slate-50 border-b border-slate-200">
                                                <tr>
                                                    <th className="px-4 py-3 text-left text-xs font-black text-slate-700 uppercase">Ad Name</th>
                                                    <th className="px-4 py-3 text-left text-xs font-black text-slate-700 uppercase">AdSet</th>
                                                    <th className="px-4 py-3 text-left text-xs font-black text-slate-700 uppercase">Campaign</th>
                                                    <th className="px-4 py-3 text-left text-xs font-black text-slate-700 uppercase">业务线</th>
                                                    <th className="px-4 py-3 text-left text-xs font-black text-slate-700 uppercase">Spend</th>
                                                    <th className="px-4 py-3 text-left text-xs font-black text-slate-700 uppercase">投放时长</th>
                                                    <th className="px-4 py-3 text-left text-xs font-black text-slate-700 uppercase">KPI</th>
                                                    <th className="px-4 py-3 text-left text-xs font-black text-slate-700 uppercase">KPI 值</th>
                                                    <th className="px-4 py-3 text-left text-xs font-black text-slate-700 uppercase">操作</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {filteredNaResult.ads.map(ad => (
                                                    <tr key={ad.id} className="border-b hover:bg-slate-50 transition-all">
                                                        <td className="px-4 py-3 font-medium text-slate-900">{ad.adName}</td>
                                                        <td className="px-4 py-3 text-slate-600">{ad.adSetName}</td>
                                                        <td className="px-4 py-3 text-slate-600">{ad.campaignName}</td>
                                                        <td className="px-4 py-3 text-slate-600">{ad.businessLine}</td>
                                                        <td className="px-4 py-3">
                                                            <SpendDetailCell
                                                                spend={ad.spend}
                                                                avgSpend={ad.avgSpend}
                                                                lastSpend={ad.lastSpend}
                                                            />
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs font-bold whitespace-nowrap">
                                                                {ad.durationDays} 天
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <KPIBadgeWithTarget
                                                                kpiType={ad.kpiType}
                                                                targetValue={ad.targetValue}
                                                            />
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <KPIAvgCell
                                                                actualValue={ad.actualValue}
                                                                avgValue={ad.avgValue}
                                                                lastValue={ad.lastValue}
                                                                kpiType={ad.kpiType}
                                                            />
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <button
                                                                onClick={() => handleNaRemove(ad.id)}
                                                                className="p-2 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-lg transition-all"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <div className="p-8 text-center text-slate-500">暂无需要调整的素材</div>
                                )}
                            </div>

                            {/* 无数据情况 */}
                            {filteredNaResult.adSets.length === 0 &&
                                filteredNaResult.ads.length === 0 && (
                                    <div className="bg-green-50 rounded-2xl p-12 text-center border border-green-100">
                                        <div className="text-6xl mb-4">✅</div>
                                        <h3 className="text-xl font-bold text-green-900 mb-2">
                                            太棒了！没有需要调整的项目
                                        </h3>
                                        <p className="text-green-700">
                                            所有新受众表现良好
                                        </p>
                                    </div>
                                )}
                        </>
                    )}
                </>
            )}
        </div>
    );
});

ActionItemsTab.displayName = 'ActionItemsTab';

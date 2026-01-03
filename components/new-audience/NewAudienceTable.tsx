import React, { useState, useMemo } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { NewAudienceAdSet, NewAudienceAd } from '../../utils/newAudienceUtils';
import { KPIType, ColumnConfig, getNewAudienceColumns } from '../../utils/newAudienceColumnConfig';
import { RawAdRecord } from '../../types';
import { calculateBenchmark, calculateVsAvg } from '../../utils/benchmarkUtils';
import { getDelta } from '../../utils/dataUtils';

interface NewAudienceTableProps {
    adSets: NewAudienceAdSet[];
    comparisonData: RawAdRecord[];
    kpiType: KPIType;
    onCampaignClick: (campaignName: string) => void;
    onTodoToggle: (item: any) => void;
    markedTodos: Set<string>;
    durationRange?: [number, number];
    filterLevel?: 'AdSet' | 'Ad';
    searchText?: string;
}

export const NewAudienceTable: React.FC<NewAudienceTableProps> = ({
    adSets,
    comparisonData,
    kpiType,
    onCampaignClick,
    onTodoToggle,
    markedTodos,
    durationRange = [1, 7],
    filterLevel = 'AdSet',
    searchText = ''
}) => {
    const [expandedAdSets, setExpandedAdSets] = useState<Set<string>>(new Set());
    const columns = useMemo(() => {
        const cols = getNewAudienceColumns(kpiType);
        console.log('NewAudienceTable - KPI:', kpiType, 'Columns count:', cols.length);
        return cols;
    }, [kpiType]);

    // Calculate benchmark from all ad sets
    const benchmark = useMemo(() => {
        const allRecords = adSets.flatMap(adSet => adSet.records);
        return calculateBenchmark(allRecords, 'AdSet');
    }, [adSets]);

    const toggleAdSet = (adSetId: string) => {
        setExpandedAdSets(prev => {
            const next = new Set(prev);
            if (next.has(adSetId)) {
                next.delete(adSetId);
            } else {
                next.add(adSetId);
            }
            return next;
        });
    };

    const calculateMetrics = (records: RawAdRecord[]) => {
        const spend = records.reduce((sum, r) => sum + r.spend, 0);
        const revenue = records.reduce((sum, r) => sum + r.purchase_value, 0);
        const clicks = records.reduce((sum, r) => sum + r.link_clicks, 0);
        const impressions = records.reduce((sum, r) => sum + r.impressions, 0);
        const purchases = records.reduce((sum, r) => sum + r.purchases, 0);
        const adds_to_cart = records.reduce((sum, r) => sum + r.adds_to_cart, 0);
        const reach = records.reduce((sum, r) => sum + (r.reach || 0), 0);

        return {
            spend,
            roi: spend > 0 ? revenue / spend : 0,
            cvr: clicks > 0 ? purchases / clicks : 0,
            aov: purchases > 0 ? revenue / purchases : 0,
            cpa: purchases > 0 ? spend / purchases : 0,
            cpatc: adds_to_cart > 0 ? spend / adds_to_cart : 0,
            atc_rate: clicks > 0 ? adds_to_cart / clicks : 0,
            ctr: impressions > 0 ? clicks / impressions : 0,
            cpc: clicks > 0 ? spend / clicks : 0,
            cpm: impressions > 0 ? (spend / impressions) * 1000 : 0,
            reach,
            impressions,
            frequency: reach > 0 ? impressions / reach : 0,
            clicks
        };
    };

    const getDaysColor = (days: number) => {
        if (days <= 2) return 'text-red-600';
        if (days <= 4) return 'text-orange-600';
        return 'text-blue-600';
    };

    // Apply filters
    const filteredData = useMemo(() => {
        let filtered = adSets;

        // Filter by duration range
        const [minDays, maxDays] = durationRange;
        filtered = filtered.filter(adSet =>
            adSet.durationDays >= minDays && adSet.durationDays <= maxDays
        );

        // Filter by search text
        if (searchText) {
            const lowerSearch = searchText.toLowerCase();
            if (filterLevel === 'AdSet') {
                filtered = filtered.filter(adSet =>
                    adSet.name.toLowerCase().includes(lowerSearch)
                );
            } else { // Ad level
                filtered = filtered.map(adSet => ({
                    ...adSet,
                    ads: adSet.ads.filter(ad => ad.name.toLowerCase().includes(lowerSearch))
                })).filter(adSet => adSet.ads.length > 0);
            }
        }

        return filtered;
    }, [adSets, durationRange, filterLevel, searchText]);

    return (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-black text-slate-700 uppercase tracking-wider">
                                Ad Set Name
                            </th>
                            {columns.map(col => (
                                <th key={col.key} className="px-4 py-3 text-left text-xs font-black text-slate-700 uppercase tracking-wider">
                                    {col.label}
                                </th>
                            ))}
                            <th className="px-4 py-3 text-left text-xs font-black text-slate-700 uppercase tracking-wider">
                                Days
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-black text-slate-700 uppercase tracking-wider">
                                Campaign
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-black text-slate-700 uppercase tracking-wider">
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {filterLevel === 'AdSet' ? (
                            // AdSet Level View
                            filteredData.map(adSet => {
                                const isExpanded = expandedAdSets.has(adSet.id);
                                const metrics = calculateMetrics(adSet.records);
                                const prevMetrics = calculateMetrics(
                                    comparisonData.filter(r => r.adset_name === adSet.name)
                                );

                                return (
                                    <React.Fragment key={adSet.id}>
                                        {/* Ad Set Row */}
                                        <tr className="border-b hover:bg-slate-50 transition-all">
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => toggleAdSet(adSet.id)}
                                                        className="p-1 hover:bg-slate-200 rounded"
                                                    >
                                                        {isExpanded ? (
                                                            <ChevronDown className="w-4 h-4" />
                                                        ) : (
                                                            <ChevronRight className="w-4 h-4" />
                                                        )}
                                                    </button>
                                                    <span className="font-bold truncate max-w-[250px]" title={adSet.name}>
                                                        {adSet.name}
                                                    </span>
                                                    <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-black uppercase">
                                                        AdSet
                                                    </span>
                                                </div>
                                            </td>
                                            {columns.map(col => {
                                                const actualValue = metrics[col.key as keyof typeof metrics];
                                                const vsAvg = calculateVsAvg(actualValue, benchmark[col.key as keyof typeof benchmark] || 0);
                                                const delta = getDelta(actualValue, prevMetrics[col.key as keyof typeof prevMetrics] || 0);
                                                const isVsAvgPositive = col.higherIsBetter ? vsAvg > 0 : vsAvg < 0;
                                                const isSpendColumn = col.key === 'spend';

                                                return (
                                                    <td key={col.key} className="px-4 py-2 whitespace-nowrap">
                                                        <div className="flex flex-col items-start gap-0.5">
                                                            <div className="text-base font-bold text-slate-900">
                                                                {col.format(actualValue)}
                                                            </div>

                                                            {isSpendColumn ? (
                                                                <>
                                                                    <div className="flex items-center gap-1">
                                                                        <span className="text-[9px] text-slate-500 font-medium">vs Avg:</span>
                                                                        <span className="text-[11px] font-black text-blue-600">
                                                                            {vsAvg > 0 ? '↑' : '↓'} {Math.abs(vsAvg).toFixed(1)}%
                                                                        </span>
                                                                    </div>
                                                                    <div className="flex items-center gap-1">
                                                                        <span className="text-[9px] text-slate-500 font-medium">vs Last:</span>
                                                                        <span className={`text-[11px] font-normal ${delta > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                                            {delta > 0 ? '↑' : '↓'} {Math.abs(delta * 100).toFixed(1)}%
                                                                        </span>
                                                                    </div>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <div className={`text-[11px] font-black ${isVsAvgPositive ? 'text-green-600' : 'text-red-600'}`}>
                                                                        {vsAvg > 0 ? '+' : ''}{vsAvg.toFixed(1)}%
                                                                    </div>
                                                                    <div className={`text-[11px] font-normal ${delta > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                                        {delta > 0 ? '+' : ''}{(delta * 100).toFixed(1)}%
                                                                    </div>
                                                                </>
                                                            )}
                                                        </div>
                                                    </td>
                                                );
                                            })}
                                            <td className="px-4 py-3">
                                                <span className={`font-bold ${getDaysColor(adSet.durationDays)}`}>
                                                    {adSet.durationDays}d
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <button
                                                    onClick={() => onCampaignClick(adSet.campaignName)}
                                                    className="text-indigo-600 hover:text-indigo-800 hover:underline font-medium text-sm"
                                                >
                                                    {adSet.campaignName}
                                                </button>
                                            </td>
                                            <td className="px-4 py-3">
                                                <button
                                                    onClick={() => onTodoToggle({ id: `adset-${adSet.id}`, name: adSet.name, level: 'adset' })}
                                                    className={`p-2 rounded-lg transition-colors ${markedTodos.has(`adset-${adSet.id}`)
                                                        ? 'bg-indigo-100 text-indigo-600'
                                                        : 'hover:bg-slate-100 text-slate-400'
                                                        }`}
                                                >
                                                    {markedTodos.has(`adset-${adSet.id}`) ? '☑' : '☐'}
                                                </button>
                                            </td>
                                        </tr>

                                        {/* Expanded Ads */}
                                        {isExpanded && adSet.ads.map(ad => {
                                            const adMetrics = calculateMetrics(ad.records);
                                            const adPrevMetrics = calculateMetrics(
                                                comparisonData.filter(r => r.ad_name === ad.name)
                                            );

                                            return (
                                                <tr key={ad.id} className="border-b bg-slate-50/20 hover:bg-slate-50">
                                                    <td className="px-4 py-3">
                                                        <div className="flex items-center gap-2" style={{ paddingLeft: '3rem' }}>
                                                            <span className="text-slate-400">└─</span>
                                                            <span className="font-medium truncate max-w-[200px]" title={ad.name}>
                                                                {ad.name}
                                                            </span>
                                                            <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-black uppercase">
                                                                Ad
                                                            </span>
                                                        </div>
                                                    </td>
                                                    {columns.map(col => {
                                                        const actualValue = adMetrics[col.key as keyof typeof adMetrics];
                                                        const vsAvg = calculateVsAvg(actualValue, benchmark[col.key as keyof typeof benchmark] || 0);
                                                        const delta = getDelta(actualValue, adPrevMetrics[col.key as keyof typeof adPrevMetrics] || 0);
                                                        const isVsAvgPositive = col.higherIsBetter ? vsAvg > 0 : vsAvg < 0;
                                                        const isSpendColumn = col.key === 'spend';

                                                        return (
                                                            <td key={col.key} className="px-4 py-2 whitespace-nowrap">
                                                                <div className="flex flex-col items-start gap-0.5">
                                                                    <div className="text-base font-bold text-slate-900">
                                                                        {col.format(actualValue)}
                                                                    </div>

                                                                    {isSpendColumn ? (
                                                                        <>
                                                                            <div className="flex items-center gap-1">
                                                                                <span className="text-[9px] text-slate-500 font-medium">vs Avg:</span>
                                                                                <span className="text-[11px] font-black text-blue-600">
                                                                                    {vsAvg > 0 ? '↑' : '↓'} {Math.abs(vsAvg).toFixed(1)}%
                                                                                </span>
                                                                            </div>
                                                                            <div className="flex items-center gap-1">
                                                                                <span className="text-[9px] text-slate-500 font-medium">vs Last:</span>
                                                                                <span className={`text-[11px] font-normal ${delta > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                                                    {delta > 0 ? '↑' : '↓'} {Math.abs(delta * 100).toFixed(1)}%
                                                                                </span>
                                                                            </div>
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            <div className={`text-[11px] font-black ${isVsAvgPositive ? 'text-green-600' : 'text-red-600'}`}>
                                                                                {vsAvg > 0 ? '+' : ''}{vsAvg.toFixed(1)}%
                                                                            </div>
                                                                            <div className={`text-[11px] font-normal ${delta > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                                                {delta > 0 ? '+' : ''}{(delta * 100).toFixed(1)}%
                                                                            </div>
                                                                        </>
                                                                    )}
                                                                </div>
                                                            </td>
                                                        );
                                                    })}
                                                    <td className="px-4 py-3">
                                                        <span className={`font-bold ${getDaysColor(ad.durationDays)}`}>
                                                            {ad.durationDays}d
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <span className="text-slate-400 text-sm">
                                                            {adSet.campaignName}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <button
                                                            onClick={() => onTodoToggle({ id: `ad-${ad.id}`, name: ad.name, level: 'ad' })}
                                                            className={`p-2 rounded-lg transition-colors ${markedTodos.has(`ad-${ad.id}`)
                                                                ? 'bg-indigo-100 text-indigo-600'
                                                                : 'hover:bg-slate-100 text-slate-400'
                                                                }`}
                                                        >
                                                            {markedTodos.has(`ad-${ad.id}`) ? '☑' : '☐'}
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </React.Fragment>
                                );
                            })
                        ) : (
                            // Ad Level View - Flat list of all Ads
                            filteredData.flatMap(adSet =>
                                adSet.ads.map(ad => {
                                    const adMetrics = calculateMetrics(ad.records);
                                    const adPrevMetrics = calculateMetrics(
                                        comparisonData.filter(r => r.ad_name === ad.name)
                                    );

                                    return (
                                        <tr key={ad.id} className="border-b hover:bg-slate-50">
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-medium truncate max-w-[250px]" title={ad.name}>
                                                        {ad.name}
                                                    </span>
                                                    <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-black uppercase">
                                                        Ad
                                                    </span>
                                                </div>
                                            </td>
                                            {columns.map(col => {
                                                const actualValue = adMetrics[col.key as keyof typeof adMetrics];
                                                const vsAvg = calculateVsAvg(actualValue, benchmark[col.key as keyof typeof benchmark] || 0);
                                                const delta = getDelta(actualValue, adPrevMetrics[col.key as keyof typeof adPrevMetrics] || 0);
                                                const isVsAvgPositive = col.higherIsBetter ? vsAvg > 0 : vsAvg < 0;
                                                const isSpendColumn = col.key === 'spend';

                                                return (
                                                    <td key={col.key} className="px-4 py-2 whitespace-nowrap">
                                                        <div className="flex flex-col items-start gap-0.5">
                                                            <div className="text-base font-bold text-slate-900">
                                                                {col.format(actualValue)}
                                                            </div>

                                                            {isSpendColumn ? (
                                                                <>
                                                                    <div className="flex items-center gap-1">
                                                                        <span className="text-[9px] text-slate-500 font-medium">vs Avg:</span>
                                                                        <span className="text-[11px] font-black text-blue-600">
                                                                            {vsAvg > 0 ? '↑' : '↓'} {Math.abs(vsAvg).toFixed(1)}%
                                                                        </span>
                                                                    </div>
                                                                    <div className="flex items-center gap-1">
                                                                        <span className="text-[9px] text-slate-500 font-medium">vs Last:</span>
                                                                        <span className={`text-[11px] font-normal ${delta > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                                            {delta > 0 ? '↑' : '↓'} {Math.abs(delta * 100).toFixed(1)}%
                                                                        </span>
                                                                    </div>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <div className={`text-[11px] font-black ${isVsAvgPositive ? 'text-green-600' : 'text-red-600'}`}>
                                                                        {vsAvg > 0 ? '+' : ''}{vsAvg.toFixed(1)}%
                                                                    </div>
                                                                    <div className={`text-[11px] font-normal ${delta > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                                        {delta > 0 ? '+' : ''}{(delta * 100).toFixed(1)}%
                                                                    </div>
                                                                </>
                                                            )}
                                                        </div>
                                                    </td>
                                                );
                                            })}
                                            <td className="px-4 py-3">
                                                <span className={`font-bold ${getDaysColor(ad.durationDays)}`}>
                                                    {ad.durationDays}d
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <button
                                                    onClick={() => onCampaignClick(adSet.campaignName)}
                                                    className="text-indigo-600 hover:text-indigo-800 hover:underline font-medium text-sm"
                                                >
                                                    {adSet.campaignName}
                                                </button>
                                            </td>
                                            <td className="px-4 py-3">
                                                <button
                                                    onClick={() => onTodoToggle({ id: `ad-${ad.id}`, name: ad.name, level: 'ad' })}
                                                    className={`p-2 rounded-lg transition-colors ${markedTodos.has(`ad-${ad.id}`)
                                                        ? 'bg-indigo-100 text-indigo-600'
                                                        : 'hover:bg-slate-100 text-slate-400'
                                                        }`}
                                                >
                                                    {markedTodos.has(`ad-${ad.id}`) ? '☑' : '☐'}
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            )
                        )}
                    </tbody>
                </table>
            </div>

            {/* Empty State */}
            {filteredData.length === 0 && (
                <div className="text-center py-12">
                    <div className="text-6xl mb-4">📊</div>
                    <h3 className="text-xl font-bold text-slate-900 mb-2">
                        No New Audience Found
                    </h3>
                    <p className="text-slate-600">
                        {searchText ? `No ${filterLevel.toLowerCase()}s found matching "${searchText}".` : '所有 Ad Set 都已运行超过 7 天'}
                    </p>
                </div>
            )}
        </div>
    );
};

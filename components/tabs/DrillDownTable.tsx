import React, { useState, useMemo } from 'react';
import { RawAdRecord, AdConfiguration, TodoItem } from '../../types';
import { calculateBenchmark, calculateVsAvg, BenchmarkMetrics } from '../../utils/benchmarkUtils';
import { getColumnsForKPI, ColumnConfig } from '../../utils/columnConfig';
import { QuadrantType, QuadrantThresholds, classifyQuadrant } from '../../utils/quadrantUtils';
import { getDelta } from '../../utils/dataUtils';
import { BenchmarkRow } from './BenchmarkRow';
import { QuadrantBadge } from './QuadrantBadge';
import { TodoMarkButton } from './TodoMarkButton';
import { ChevronDown, ChevronRight, Copy, Check } from 'lucide-react';
import {
    calculateROI,
    calculateCVR,
    calculateAOV,
    calculateCPA,
    calculateCPATC,
    calculateATCRate,
    calculateCTR,
    calculateCPC,
    calculateCPM,
    calculateFrequency
} from '../../utils/benchmarkUtils';

interface DrillDownTableProps {
    data: RawAdRecord[];
    comparisonData: RawAdRecord[];
    config: AdConfiguration;
    thresholds: QuadrantThresholds | null;
    selectedQuadrant: QuadrantType | 'all';
    onTodoToggle: (item: TodoItem) => void;
    markedTodos: Set<string>;
    filterLevel?: 'Campaign' | 'AdSet' | 'Ad';
    searchText?: string;
}

interface CampaignMetrics {
    spend: number;
    roi: number;
    cvr: number;
    aov: number;
    cpa: number;
    cpatc: number;
    atc_rate: number;
    ctr: number;
    cpc: number;
    cpm: number;
    reach: number;
    impressions: number;
    frequency: number;
    clicks: number;
}

export const DrillDownTable: React.FC<DrillDownTableProps> = ({
    data,
    comparisonData,
    config,
    thresholds,
    selectedQuadrant,
    onTodoToggle,
    markedTodos,
    filterLevel = 'Campaign',
    searchText = ''
}) => {
    const [expandedCampaigns, setExpandedCampaigns] = useState<Set<string>>(new Set());
    const [expandedAdSets, setExpandedAdSets] = useState<Set<string>>(new Set());

    const columns = getColumnsForKPI(config.targetType);

    // Benchmarks for each level
    const campaignBenchmark = useMemo(() => calculateBenchmark(data, 'Campaign'), [data]);
    const adSetBenchmark = useMemo(() => calculateBenchmark(data, 'AdSet'), [data]);
    const adBenchmark = useMemo(() => calculateBenchmark(data, 'Ad'), [data]);

    // Data Processing: Campaign -> AdSet -> Ad
    const groupedData = useMemo(() => {
        const campaignMap = new Map<string, RawAdRecord[]>();
        data.forEach(r => {
            const key = r.campaign_name;
            if (!campaignMap.has(key)) campaignMap.set(key, []);
            campaignMap.get(key)!.push(r);
        });

        return Array.from(campaignMap.entries()).map(([campName, campRecords]) => {
            const campMetrics = aggregateMetrics(campRecords);

            // Calculate quadrant for campaign
            let quadrant: QuadrantType = 'watch';
            if (thresholds) {
                const kpiValue = config.targetType === 'ROI' ? campMetrics.roi :
                    config.targetType === 'CPC' ? campMetrics.cpc : campMetrics.cpm;
                quadrant = classifyQuadrant(campMetrics.spend, kpiValue, thresholds, config.targetType);
            }

            // Group AdSets within Campaign
            const adSetMap = new Map<string, RawAdRecord[]>();
            campRecords.forEach(r => {
                const key = r.adset_name;
                if (!adSetMap.has(key)) adSetMap.set(key, []);
                adSetMap.get(key)!.push(r);
            });

            const adSets = Array.from(adSetMap.entries()).map(([adSetName, adSetRecords]) => {
                const adSetMetrics = aggregateMetrics(adSetRecords);

                // Group Ads within AdSet
                const adMap = new Map<string, RawAdRecord[]>();
                adSetRecords.forEach(r => {
                    const key = r.ad_name;
                    if (!adMap.has(key)) adMap.set(key, []);
                    adMap.get(key)!.push(r);
                });

                const ads = Array.from(adMap.entries()).map(([adName, adRecords]) => ({
                    name: adName,
                    metrics: aggregateMetrics(adRecords),
                    prevMetrics: aggregateMetrics(comparisonData.filter(r => r.ad_name === adName))
                }));

                return {
                    name: adSetName,
                    metrics: adSetMetrics,
                    prevMetrics: aggregateMetrics(comparisonData.filter(r => r.adset_name === adSetName)),
                    ads
                };
            });

            return {
                name: campName,
                metrics: campMetrics,
                prevMetrics: aggregateMetrics(comparisonData.filter(r => r.campaign_name === campName)),
                quadrant,
                adSets
            };
        }).filter(c => selectedQuadrant === 'all' || c.quadrant === selectedQuadrant);
    }, [data, comparisonData, config, thresholds, selectedQuadrant]);

    // Apply search filter based on level
    const filteredData = useMemo(() => {
        if (!searchText) return groupedData;

        const lowerSearch = searchText.toLowerCase();

        if (filterLevel === 'Campaign') {
            return groupedData.filter(c => c.name.toLowerCase().includes(lowerSearch));
        } else if (filterLevel === 'AdSet') {
            return groupedData.map(c => ({
                ...c,
                adSets: c.adSets.filter(a => a.name.toLowerCase().includes(lowerSearch))
            })).filter(c => c.adSets.length > 0);
        } else { // Ad level
            return groupedData.map(c => ({
                ...c,
                adSets: c.adSets.map(a => ({
                    ...a,
                    ads: a.ads.filter(ad => ad.name.toLowerCase().includes(lowerSearch))
                })).filter(a => a.ads.length > 0)
            })).filter(c => c.adSets.length > 0);
        }
    }, [groupedData, searchText, filterLevel]);

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                    <thead>
                        <tr className="bg-slate-900 text-white">
                            <th className="px-4 py-3 text-left font-bold min-w-[300px]">Entity Name</th>
                            {columns.map(col => (
                                <th key={col.key} className="px-4 py-3 text-left font-bold whitespace-nowrap">
                                    {col.label}
                                </th>
                            ))}
                            <th className="px-4 py-3 text-left font-bold">Quadrant</th>
                            <th className="px-4 py-3 text-center font-bold">Todo</th>
                        </tr>
                    </thead>
                    <tbody>
                        {/* Benchmark Row */}
                        {filterLevel === 'Campaign' && (
                            <BenchmarkRow
                                benchmark={campaignBenchmark}
                                columns={columns}
                                level="Campaign"
                            />
                        )}
                        {filterLevel === 'AdSet' && (
                            <BenchmarkRow
                                benchmark={adSetBenchmark}
                                columns={columns}
                                level="AdSet"
                            />
                        )}
                        {filterLevel === 'Ad' && (
                            <BenchmarkRow
                                benchmark={adBenchmark}
                                columns={columns}
                                level="Ad"
                            />
                        )}

                        {/* Campaign Level View */}
                        {filterLevel === 'Campaign' && filteredData.map(campaign => (
                            <React.Fragment key={campaign.name}>
                                <DataRowGroup
                                    name={campaign.name}
                                    level="Campaign"
                                    metrics={campaign.metrics}
                                    prevMetrics={campaign.prevMetrics}
                                    benchmark={campaignBenchmark}
                                    columns={columns}
                                    isExpanded={expandedCampaigns.has(campaign.name)}
                                    onToggle={() => toggleSet(expandedCampaigns, setExpandedCampaigns, campaign.name)}
                                    quadrant={campaign.quadrant}
                                    isMarked={markedTodos.has(`campaign-${campaign.name}`)}
                                    onTodoToggle={() => onTodoToggle(createTodo(config, 'Campaign', campaign.name, campaign.metrics, campaign.prevMetrics, campaign.quadrant))}
                                />

                                {expandedCampaigns.has(campaign.name) && (
                                    <>
                                        <BenchmarkRow
                                            benchmark={adSetBenchmark}
                                            columns={columns}
                                            level="AdSet"
                                            parentName={campaign.name}
                                            indent
                                        />

                                        {campaign.adSets.map(adSet => (
                                            <React.Fragment key={adSet.name}>
                                                <DataRowGroup
                                                    name={adSet.name}
                                                    level="AdSet"
                                                    indent
                                                    metrics={adSet.metrics}
                                                    prevMetrics={adSet.prevMetrics}
                                                    benchmark={adSetBenchmark}
                                                    columns={columns}
                                                    isExpanded={expandedAdSets.has(adSet.name)}
                                                    onToggle={() => toggleSet(expandedAdSets, setExpandedAdSets, adSet.name)}
                                                    isMarked={markedTodos.has(`adset-${adSet.name}`)}
                                                    onTodoToggle={() => onTodoToggle(createTodo(config, 'AdSet', adSet.name, adSet.metrics, adSet.prevMetrics))}
                                                />

                                                {expandedAdSets.has(adSet.name) && (
                                                    <>
                                                        <BenchmarkRow
                                                            benchmark={adBenchmark}
                                                            columns={columns}
                                                            level="Ad"
                                                            parentName={adSet.name}
                                                            indentMore
                                                        />
                                                        {adSet.ads.map(ad => (
                                                            <DataRowGroup
                                                                key={ad.name}
                                                                name={ad.name}
                                                                level="Ad"
                                                                indentMore
                                                                metrics={ad.metrics}
                                                                prevMetrics={ad.prevMetrics}
                                                                benchmark={adBenchmark}
                                                                columns={columns}
                                                                isMarked={markedTodos.has(`ad-${ad.name}`)}
                                                                onTodoToggle={() => onTodoToggle(createTodo(config, 'Ad', ad.name, ad.metrics, ad.prevMetrics))}
                                                            />
                                                        ))}
                                                    </>
                                                )}
                                            </React.Fragment>
                                        ))}
                                    </>
                                )}
                            </React.Fragment>
                        ))}

                        {/* AdSet Level View - Flat list of all AdSets */}
                        {filterLevel === 'AdSet' && filteredData.flatMap(campaign =>
                            campaign.adSets.map(adSet => (
                                <DataRowGroup
                                    key={`${campaign.name}-${adSet.name}`}
                                    name={adSet.name}
                                    level="AdSet"
                                    metrics={adSet.metrics}
                                    prevMetrics={adSet.prevMetrics}
                                    benchmark={adSetBenchmark}
                                    columns={columns}
                                    isMarked={markedTodos.has(`adset-${adSet.name}`)}
                                    onTodoToggle={() => onTodoToggle(createTodo(config, 'AdSet', adSet.name, adSet.metrics, adSet.prevMetrics))}
                                />
                            ))
                        )}

                        {/* Ad Level View - Flat list of all Ads */}
                        {filterLevel === 'Ad' && filteredData.flatMap(campaign =>
                            campaign.adSets.flatMap(adSet =>
                                adSet.ads.map(ad => (
                                    <DataRowGroup
                                        key={`${campaign.name}-${adSet.name}-${ad.name}`}
                                        name={ad.name}
                                        level="Ad"
                                        metrics={ad.metrics}
                                        prevMetrics={ad.prevMetrics}
                                        benchmark={adBenchmark}
                                        columns={columns}
                                        isMarked={markedTodos.has(`ad-${ad.name}`)}
                                        onTodoToggle={() => onTodoToggle(createTodo(config, 'Ad', ad.name, ad.metrics, ad.prevMetrics))}
                                    />
                                ))
                            )
                        )}

                        {filteredData.length === 0 && (
                            <tr>
                                <td colSpan={columns.length + 3} className="px-4 py-12 text-center text-slate-500">
                                    {searchText ? `No ${filterLevel.toLowerCase()}s found matching "${searchText}".` : `No ${filterLevel.toLowerCase()}s found for the selected quadrant.`}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

// --- Helper Components & Functions ---

interface DataRowGroupProps {
    name: string;
    level: 'Campaign' | 'AdSet' | 'Ad';
    indent?: boolean;
    indentMore?: boolean;
    metrics: any;
    prevMetrics: any;
    benchmark: BenchmarkMetrics;
    columns: ColumnConfig[];
    isExpanded?: boolean;
    onToggle?: () => void;
    quadrant?: QuadrantType;
    isMarked: boolean;
    onTodoToggle: () => void;
}

// Entity Name Cell with Copy Functionality
const EntityNameCell: React.FC<{
    name: string;
    level: 'Campaign' | 'AdSet' | 'Ad';
    indent?: boolean;
    indentMore?: boolean;
    isExpanded?: boolean;
    onToggle?: () => void;
}> = ({ name, level, indent, indentMore, isExpanded, onToggle }) => {
    const [copied, setCopied] = React.useState(false);
    const [showTooltip, setShowTooltip] = React.useState(false);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(name);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    return (
        <div className="flex items-center gap-2" style={{ paddingLeft: indentMore ? '3rem' : indent ? '1.5rem' : '0' }}>
            {onToggle ? (
                <button onClick={onToggle} className="p-1 hover:bg-slate-200 rounded flex-shrink-0">
                    {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </button>
            ) : <div className="w-6 flex-shrink-0" />}
            <div
                className="relative"
                onMouseEnter={() => setShowTooltip(true)}
                onMouseLeave={() => setShowTooltip(false)}
            >
                <span
                    className={`truncate max-w-[250px] inline-block ${level === 'Campaign' ? 'font-bold' : 'font-medium'}`}
                >
                    {name}
                </span>
                {showTooltip && (
                    <div className="absolute left-0 top-full mt-1 z-50 bg-slate-900 text-white text-xs px-2 py-1 rounded shadow-lg whitespace-nowrap max-w-md">
                        {name}
                    </div>
                )}
            </div>
            <button
                onClick={handleCopy}
                className="p-1 hover:bg-slate-200 rounded transition-all flex-shrink-0 group relative"
                title="Copy full name"
            >
                {copied ? (
                    <Check className="w-3.5 h-3.5 text-green-600" />
                ) : (
                    <Copy className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600" />
                )}
            </button>
            <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-black uppercase flex-shrink-0">{level}</span>
        </div>
    );
};

const DataRowGroup: React.FC<DataRowGroupProps> = ({
    name, level, indent, indentMore, metrics, prevMetrics, benchmark, columns, isExpanded, onToggle, quadrant, isMarked, onTodoToggle
}) => {
    const rowId = level === 'Campaign' ? `campaign-${name}` : level === 'AdSet' ? `adset-${name}` : `ad-${name}`;

    return (
        <tr
            id={rowId}
            className={`border-b hover:bg-slate-50 transition-all ${indent ? 'bg-slate-50/20' : ''} ${indentMore ? 'bg-slate-50/40' : ''}`}
        >
            {/* Name Column */}
            <td className="px-4 py-3">
                <EntityNameCell
                    name={name}
                    level={level}
                    indent={indent}
                    indentMore={indentMore}
                    isExpanded={isExpanded}
                    onToggle={onToggle}
                />
            </td>

            {/* Metric Columns - Stacked Layout */}
            {columns.map(col => {
                const actualValue = metrics[col.key as keyof CampaignMetrics];
                const vsAvg = calculateVsAvg(actualValue, benchmark[col.key as keyof BenchmarkMetrics] || 0);
                const delta = getDelta(actualValue, prevMetrics[col.key as keyof typeof prevMetrics] || 0);
                const isVsAvgPositive = col.higherIsBetter ? vsAvg > 0 : vsAvg < 0;
                const isSpendColumn = col.key === 'spend';

                return (
                    <td key={col.key} className="px-4 py-2 whitespace-nowrap">
                        <div className="flex flex-col items-start gap-0.5">
                            {/* Actual Value */}
                            <div className="text-base font-bold text-slate-900">
                                {col.format(actualValue)}
                            </div>

                            {isSpendColumn ? (
                                // Spend column: with labels
                                <>
                                    {/* vs Avg with label */}
                                    <div className="flex items-center gap-1">
                                        <span className="text-[9px] text-slate-500 font-medium">vs Avg:</span>
                                        <span className={`text-[11px] font-black ${vsAvg > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                            {vsAvg > 0 ? '↑' : '↓'} {Math.abs(vsAvg).toFixed(1)}%
                                        </span>
                                    </div>
                                    {/* Delta with label */}
                                    <div className="flex items-center gap-1">
                                        <span className="text-[9px] text-slate-500 font-medium">vs Last:</span>
                                        <span className={`text-[11px] font-normal ${delta > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                            {delta > 0 ? '↑' : '↓'} {Math.abs(delta * 100).toFixed(1)}%
                                        </span>
                                    </div>
                                </>
                            ) : (
                                // Other columns: no labels (original format)
                                <>
                                    {/* vs Avg */}
                                    <div className={`text-[11px] font-black ${isVsAvgPositive ? 'text-green-600' : 'text-red-600'}`}>
                                        {vsAvg > 0 ? '+' : ''}{vsAvg.toFixed(1)}%
                                    </div>
                                    {/* Delta */}
                                    <div className={`text-[11px] font-normal ${delta > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                        {delta > 0 ? '+' : ''}{(delta * 100).toFixed(1)}%
                                    </div>
                                </>
                            )}
                        </div>
                    </td>
                );
            })}

            {/* Quadrant Column */}
            <td className="px-4 py-3">
                {quadrant && <QuadrantBadge quadrant={quadrant} />}
            </td>

            {/* Todo Column */}
            <td className="px-4 py-3 text-center">
                <TodoMarkButton isMarked={isMarked} onToggle={onTodoToggle} />
            </td>
        </tr>
    );
};

const aggregateMetrics = (records: RawAdRecord[]): CampaignMetrics => {
    const totalSpend = records.reduce((sum, r) => sum + r.spend, 0);
    const totalImpressions = records.reduce((sum, r) => sum + r.impressions, 0);
    const totalClicks = records.reduce((sum, r) => sum + r.link_clicks, 0);
    const totalPurchases = records.reduce((sum, r) => sum + r.purchases, 0);
    const totalRevenue = records.reduce((sum, r) => sum + r.purchase_value, 0);
    const totalATC = records.reduce((sum, r) => sum + r.adds_to_cart, 0);
    const totalReach = records.reduce((sum, r) => sum + (r.reach || 0), 0);

    return {
        spend: totalSpend,
        roi: totalSpend > 0 ? totalRevenue / totalSpend : 0,
        cvr: totalClicks > 0 ? totalPurchases / totalClicks : 0,
        aov: totalPurchases > 0 ? totalRevenue / totalPurchases : 0,
        cpa: totalPurchases > 0 ? totalSpend / totalPurchases : 0,
        cpatc: totalATC > 0 ? totalSpend / totalATC : 0,
        atc_rate: totalClicks > 0 ? totalATC / totalClicks : 0,
        ctr: totalImpressions > 0 ? totalClicks / totalImpressions : 0,
        cpc: totalClicks > 0 ? totalSpend / totalClicks : 0,
        cpm: totalImpressions > 0 ? (totalSpend / totalImpressions) * 1000 : 0,
        reach: totalReach,
        impressions: totalImpressions,
        frequency: totalReach > 0 ? totalImpressions / totalReach : 0,
        clicks: totalClicks
    };
};

const toggleSet = (set: Set<string>, setter: (s: Set<string>) => void, val: string) => {
    const next = new Set(set);
    if (next.has(val)) next.delete(val);
    else next.add(val);
    setter(next);
};

const createTodo = (config: AdConfiguration, level: 'Campaign' | 'AdSet' | 'Ad', name: string, metrics: CampaignMetrics, prevMetrics: any, quadrant?: string): TodoItem => {
    const kpiVal = config.targetType === 'ROI' ? metrics.roi : config.targetType === 'CPC' ? metrics.cpc : metrics.cpm;
    return {
        id: `${level.toLowerCase()}-${name}`,
        projectId: config.id,
        projectName: config.name,
        level,
        itemId: name,
        itemName: name,
        quadrant,
        metrics: {
            spend: metrics.spend,
            kpi: kpiVal,
            delta: getDelta(metrics.spend, prevMetrics.spend)
        },
        markedAt: new Date().toISOString(),
        status: 'pending'
    };
};

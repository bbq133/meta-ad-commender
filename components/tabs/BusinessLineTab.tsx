import React, { useState, useMemo } from 'react';
import { RawAdRecord, AdConfiguration, TodoItem } from '../../types';
import { matchesConfig } from '../../utils/dataUtils';
import { ChevronDown, TrendingUp, DollarSign, Target } from 'lucide-react';
import { calculateBenchmark } from '../../utils/benchmarkUtils';
import { calculateDefaultThresholds, QuadrantThresholds, QuadrantType } from '../../utils/quadrantUtils';
import { DrillDownTable } from './DrillDownTable';
import { QuadrantChart } from './QuadrantChart';
import { LevelToggle } from '../filters/LevelToggle';
import { SearchInput } from '../filters/SearchInput';

interface BusinessLineTabProps {
    data: RawAdRecord[];
    comparisonData: RawAdRecord[];
    configs: AdConfiguration[];
    todos: TodoItem[];
    onTodoToggle: (item: TodoItem) => void;
    onThresholdsChange?: (businessLineId: string, thresholds: QuadrantThresholds) => void;
    userAdjustedThresholds?: Map<string, QuadrantThresholds>;
}

export const BusinessLineTab: React.FC<BusinessLineTabProps> = ({
    data,
    comparisonData,
    configs,
    todos,
    onTodoToggle,
    onThresholdsChange,
    userAdjustedThresholds
}) => {
    const [selectedProjectId, setSelectedProjectId] = useState<string>(configs[0]?.id || '');
    const [selectedQuadrant, setSelectedQuadrant] = useState<QuadrantType | 'all'>('all');
    const [thresholds, setThresholds] = useState<QuadrantThresholds | null>(null);
    const [filterLevel, setFilterLevel] = useState<'Campaign' | 'AdSet' | 'Ad'>('Campaign');
    const [searchText, setSearchText] = useState('');

    // Get selected project configuration
    const selectedProject = useMemo(() => {
        return configs.find(c => c.id === selectedProjectId);
    }, [configs, selectedProjectId]);

    // Filter data for selected project
    const projectData = useMemo(() => {
        if (!selectedProject) return [];
        return data.filter(record => matchesConfig(record, selectedProject));
    }, [data, selectedProject]);

    const projectComparisonData = useMemo(() => {
        if (!selectedProject) return [];
        return comparisonData.filter(record => matchesConfig(record, selectedProject));
    }, [comparisonData, selectedProject]);

    // Calculate default thresholds when project changes
    // Use user-adjusted thresholds if available, otherwise calculate defaults
    useMemo(() => {
        if (selectedProject && projectData.length > 0) {
            // Check if user has adjusted thresholds for this project
            const userThresholds = userAdjustedThresholds?.get(selectedProject.id);
            if (userThresholds) {
                // Use user-adjusted thresholds
                setThresholds(userThresholds);
            } else {
                // Calculate and use default thresholds
                const defaultThresholds = calculateDefaultThresholds(projectData, selectedProject);
                setThresholds(defaultThresholds);
            }
        }
    }, [selectedProject, projectData, userAdjustedThresholds]);

    // Calculate project overview metrics
    const projectOverview = useMemo(() => {
        // Group by campaign to get unique campaigns
        const campaignMap = new Map<string, RawAdRecord[]>();
        projectData.forEach(record => {
            const key = record.campaign_name;
            if (!campaignMap.has(key)) campaignMap.set(key, []);
            campaignMap.get(key)!.push(record);
        });

        // Calculate totals from all records
        const totalSpend = projectData.reduce((sum, r) => sum + r.spend, 0);
        const totalRevenue = projectData.reduce((sum, r) => sum + r.purchase_value, 0);

        // Group by adset to get unique adsets
        const adSetMap = new Map<string, boolean>();
        projectData.forEach(r => adSetMap.set(r.adset_name, true));

        // Group by ad to get unique ads
        const adMap = new Map<string, boolean>();
        projectData.forEach(r => adMap.set(r.ad_name, true));

        return {
            campaignCount: campaignMap.size,
            adSetCount: adSetMap.size,
            adCount: adMap.size,
            totalSpend,
            totalRevenue,
            avgROI: totalSpend > 0 ? totalRevenue / totalSpend : 0
        };
    }, [projectData]);

    // Handle campaign click from quadrant chart
    const handleCampaignClick = (campaignName: string) => {
        const element = document.getElementById(`campaign-${campaignName}`);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            element.classList.add('highlight-row');
            setTimeout(() => {
                element.classList.remove('highlight-row');
            }, 3000);
        }
    };

    if (configs.length === 0) {
        return (
            <div className="bg-white rounded-2xl p-12 text-center">
                <div className="text-6xl mb-4">📊</div>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">
                    No Business Lines Configured
                </h2>
                <p className="text-slate-600">
                    Please configure at least one business line to view detailed analysis.
                </p>
            </div>
        );
    }

    if (!selectedProject) {
        return null;
    }

    return (
        <div className="space-y-6">
            {/* Project Selector */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                <label className="block text-sm font-bold text-slate-700 mb-2 uppercase">
                    Select Business Line
                </label>
                <div className="relative">
                    <select
                        value={selectedProjectId}
                        onChange={(e) => setSelectedProjectId(e.target.value)}
                        className="w-full px-4 py-3 bg-white border-2 border-slate-300 rounded-xl text-lg font-bold text-slate-900 appearance-none cursor-pointer hover:border-indigo-400 transition-colors"
                    >
                        {configs.map(config => (
                            <option key={config.id} value={config.id}>
                                {config.name} ({config.level} Level - {config.targetType} Target: {config.targetValue}{config.targetType === 'ROI' ? 'x' : ''})
                            </option>
                        ))}
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-600 pointer-events-none" />
                </div>
            </div>

            {/* Project Overview */}
            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-6 border-2 border-indigo-200">
                <h3 className="text-xl font-black text-slate-900 mb-4 flex items-center gap-2">
                    <TrendingUp className="w-6 h-6 text-indigo-600" />
                    {selectedProject.name} Overview
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {/* Target KPI */}
                    <div className="bg-white rounded-xl p-4">
                        <div className="text-xs text-slate-600 mb-2 uppercase font-bold">{selectedProject.targetType}</div>
                        <div className="space-y-1">
                            <div className="flex items-baseline gap-2">
                                <span className="text-[10px] text-slate-500 font-bold">Target:</span>
                                <span className="text-sm font-bold text-indigo-600">
                                    {selectedProject.targetValue}{selectedProject.targetType === 'ROI' ? 'x' : ''}
                                </span>
                            </div>
                            <div className="flex items-baseline gap-2">
                                <span className="text-[10px] text-slate-500 font-bold">Actual:</span>
                                <span className={`text-sm font-bold ${projectOverview.avgROI >= selectedProject.targetValue
                                    ? 'text-green-600'
                                    : 'text-red-600'
                                    }`}>
                                    {projectOverview.avgROI.toFixed(2)}{selectedProject.targetType === 'ROI' ? 'x' : ''}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Budget */}
                    <div className="bg-white rounded-xl p-4">
                        <div className="text-xs text-slate-600 mb-2 uppercase font-bold">Budget</div>
                        <div className="space-y-1">
                            <div className="flex items-baseline gap-2">
                                <span className="text-[10px] text-slate-500 font-bold">Target:</span>
                                <span className="text-sm font-bold text-indigo-600">
                                    ${selectedProject.budget.toLocaleString()}
                                </span>
                            </div>
                            <div className="flex items-baseline gap-2">
                                <span className="text-[10px] text-slate-500 font-bold">Actual:</span>
                                <span className={`text-sm font-bold ${projectOverview.totalSpend <= selectedProject.budget
                                    ? 'text-green-600'
                                    : 'text-red-600'
                                    }`}>
                                    ${projectOverview.totalSpend.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Revenue */}
                    <div className="bg-white rounded-xl p-4">
                        <div className="text-xs text-slate-600 mb-2 uppercase font-bold">Revenue</div>
                        <div className="space-y-1">
                            <div className="flex items-baseline gap-2">
                                <span className="text-[10px] text-slate-500 font-bold">Target:</span>
                                <span className="text-sm font-bold text-indigo-600">
                                    ${(selectedProject.budget * selectedProject.targetValue).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                </span>
                            </div>
                            <div className="flex items-baseline gap-2">
                                <span className="text-[10px] text-slate-500 font-bold">Actual:</span>
                                <span className={`text-sm font-bold ${projectOverview.totalRevenue >= (selectedProject.budget * selectedProject.targetValue)
                                    ? 'text-green-600'
                                    : 'text-red-600'
                                    }`}>
                                    ${projectOverview.totalRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Campaigns (no target) */}
                    <div className="bg-white rounded-xl p-4 flex flex-col items-center justify-center">
                        <div className="text-xs text-slate-600 mb-1 uppercase font-bold">Campaigns</div>
                        <div className="text-lg font-bold text-slate-900">
                            {projectOverview.campaignCount}
                        </div>
                    </div>
                </div>
            </div>

            {/* Quadrant Analysis */}
            {thresholds && (
                <QuadrantChart
                    data={projectData}
                    config={selectedProject}
                    thresholds={thresholds}
                    onThresholdsChange={(newThresholds) => {
                        setThresholds(newThresholds);
                        if (onThresholdsChange && selectedProject) {
                            onThresholdsChange(selectedProject.id, newThresholds);
                        }
                    }}
                    onQuadrantFilter={setSelectedQuadrant}
                    selectedQuadrant={selectedQuadrant}
                    onCampaignClick={handleCampaignClick}
                />
            )}


            {/* Drill-Down Table */}
            {/* Filter Controls */}
            <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
                <div className="flex items-center gap-3 flex-wrap">
                    <LevelToggle
                        levels={['Campaign', 'AdSet', 'Ad']}
                        selected={filterLevel}
                        onChange={(level) => setFilterLevel(level as 'Campaign' | 'AdSet' | 'Ad')}
                    />
                    <SearchInput
                        value={searchText}
                        onChange={setSearchText}
                        placeholder={`Search ${filterLevel} names...`}
                    />
                </div>
            </div>

            {/* Data Table */}
            <DrillDownTable
                data={projectData}
                comparisonData={projectComparisonData}
                config={selectedProject}
                thresholds={thresholds}
                selectedQuadrant={selectedQuadrant}
                onTodoToggle={onTodoToggle}
                markedTodos={new Set(todos.map(t => t.id))}
                filterLevel={filterLevel}
                searchText={searchText}
            />
        </div>
    );
};

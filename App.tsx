import React, { useState, useMemo, useRef } from 'react';
import { FileUpload } from './components/FileUpload';
import { OverviewTab } from './components/tabs/OverviewTab';
import { BusinessLineTab } from './components/tabs/BusinessLineTab';
import { NewAudienceTab } from './components/tabs/NewAudienceTab';
import { ActionItemsTab, ActionItemsTabRef } from './components/tabs/ActionItemsTab';
import { ConfigModal } from './components/ConfigModal';
import { DateRangePicker } from './components/DateRangePicker';
import { LayerConfigModal } from './components/LayerConfigModal';
import { RawAdRecord, AdConfiguration, TodoItem, LayerConfiguration, DEFAULT_LAYER_CONFIG } from './types';
import { calculateDefaultThresholds, QuadrantThresholds } from './utils/quadrantUtils';
import { matchesConfig } from './utils/dataUtils';
import { BarChart3, Upload, Settings, Zap, Download } from 'lucide-react';

function App() {
    const [data, setData] = useState<RawAdRecord[]>([]);
    const [activeTab, setActiveTab] = useState<'overview' | 'business' | 'execution' | 'quadrant' | 'todo' | 'newaudience'>('overview');
    const [configs, setConfigs] = useState<AdConfiguration[]>([
        {
            id: '1',
            name: 'AO',
            level: 'Campaign',
            budget: 5000,
            targetType: 'ROI',
            targetValue: 4.5,
            rules: [{ field: 'campaign_name', operator: 'contains', value: '-AO-' }],
            campaignPeriod: {
                startDate: '2025-12-01',
                endDate: '2025-12-31'
            }
        },
        {
            id: '2',
            name: 'AI',
            level: 'Campaign',
            budget: 3000,
            targetType: 'ROI',
            targetValue: 5.0,
            rules: [{ field: 'campaign_name', operator: 'contains', value: '-AI-' }],
            campaignPeriod: {
                startDate: '2025-12-15',
                endDate: '2026-01-15'
            }
        }
    ]);
    const [selectedConfigIds, setSelectedConfigIds] = useState<string[]>([]);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [compareMode, setCompareMode] = useState(true);
    const [todoList, setTodoList] = useState<TodoItem[]>([]);
    const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
    const [layerConfig, setLayerConfig] = useState<LayerConfiguration>(DEFAULT_LAYER_CONFIG);
    const actionItemsRef = useRef<ActionItemsTabRef>(null);
    const [isLayerConfigModalOpen, setIsLayerConfigModalOpen] = useState(false);

    // Store user-adjusted thresholds for each business line
    const [userAdjustedThresholds, setUserAdjustedThresholds] = useState<Map<string, QuadrantThresholds>>(new Map());

    // Todo toggle handler
    const handleTodoToggle = (item: TodoItem) => {
        setTodoList(prev => {
            const exists = prev.find(t => t.id === item.id);
            if (exists) {
                // Remove from todo list
                return prev.filter(t => t.id !== item.id);
            } else {
                // Add to todo list
                return [...prev, item];
            }
        });
    };

    // 初始化日期范围
    useMemo(() => {
        if (data.length > 0 && !startDate) {
            const dates = data.map(r => r.date).sort();
            const latestDate = dates[dates.length - 1];
            const earliestDate = dates[Math.max(0, dates.length - 4)];
            setEndDate(latestDate);
            setStartDate(earliestDate);
        }
    }, [data, startDate]);

    // 过滤数据（仅日期筛选，不应用配置筛选）
    const { filteredData, comparisonData } = useMemo(() => {
        if (!startDate || !endDate) return { filteredData: data, comparisonData: [] };

        const getLocalMidnight = (dateStr: string) => {
            return new Date(dateStr + 'T00:00:00').getTime();
        };

        const startMs = getLocalMidnight(startDate);
        const endMs = getLocalMidnight(endDate);

        const main = data.filter(r => {
            const datePart = r.date.includes(' ') ? r.date.split(' ')[0] : r.date;
            const d = getLocalMidnight(datePart);
            return d >= startMs && d <= endMs;
        });

        if (compareMode) {
            const oneDay = 24 * 60 * 60 * 1000;
            const durationMs = endMs - startMs;
            const compEndMs = startMs - oneDay;
            const compStartMs = compEndMs - durationMs;

            const comp = data.filter(r => {
                const datePart = r.date.includes(' ') ? r.date.split(' ')[0] : r.date;
                const d = getLocalMidnight(datePart);
                return d >= compStartMs && d <= compEndMs;
            });

            return { filteredData: main, comparisonData: comp };
        }

        return { filteredData: main, comparisonData: [] };
    }, [data, startDate, endDate, compareMode]);

    // Calculate business line thresholds for Action Items
    // Merge default thresholds with user-adjusted thresholds
    const businessLineThresholds = useMemo(() => {
        const thresholdsMap = new Map<string, QuadrantThresholds>();

        configs.forEach(config => {
            const businessLineData = filteredData.filter(r => matchesConfig(r, config));
            if (businessLineData.length > 0) {
                // Check if user has adjusted thresholds for this business line
                const userThresholds = userAdjustedThresholds.get(config.id);
                if (userThresholds) {
                    // Use user-adjusted thresholds
                    thresholdsMap.set(config.id, userThresholds);
                } else {
                    // Use default calculated thresholds
                    const thresholds = calculateDefaultThresholds(businessLineData, config);
                    thresholdsMap.set(config.id, thresholds);
                }
            }
        });

        return thresholdsMap;
    }, [filteredData, configs, userAdjustedThresholds]);

    // Handler for when user adjusts thresholds in BusinessLineTab
    const handleThresholdsChange = (businessLineId: string, newThresholds: QuadrantThresholds) => {
        setUserAdjustedThresholds(prev => {
            const newMap = new Map(prev);
            newMap.set(businessLineId, newThresholds);
            return newMap;
        });
    };

    const handleDataLoaded = (newData: RawAdRecord[]) => {
        setData(newData);
    };

    const handleReupload = () => {
        if (confirm('确定要清除当前分析数据并重新上传新表格吗？')) {
            setData([]);
            setStartDate('');
            setEndDate('');
            setSelectedConfigIds([]);
            setTodoList([]);
        }
    };

    const setQuickDateRange = (days: number) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // 结束日期是昨天
        const end = new Date(today);
        end.setDate(end.getDate() - 1);

        // 开始日期是从结束日期往前推 days-1 天
        const start = new Date(end);
        start.setDate(start.getDate() - days + 1);

        const formatDate = (date: Date) => {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        };

        setStartDate(formatDate(start));
        setEndDate(formatDate(end));
    };

    if (data.length === 0) {
        return <FileUpload onDataLoaded={handleDataLoaded} configs={configs} onConfigsChange={setConfigs} layerConfig={layerConfig} onLayerConfigChange={setLayerConfig} />;
    }

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header */}
            <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
                <div className="max-w-[1600px] mx-auto px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-indigo-600 rounded-xl">
                                <BarChart3 className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h1 className="text-xl font-black text-slate-900">Ads Commander</h1>
                                <p className="text-xs text-slate-600">Meta 广告分析系统</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            {/* Date Range Picker */}
                            <DateRangePicker
                                startDate={startDate}
                                endDate={endDate}
                                onStartDateChange={setStartDate}
                                onEndDateChange={setEndDate}
                            />

                            {/* Compare Mode */}
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={compareMode}
                                    onChange={(e) => setCompareMode(e.target.checked)}
                                    className="rounded"
                                />
                                <span className="text-sm text-slate-700">对比模式</span>
                            </label>

                            {/* Business Lines Config */}
                            <button
                                onClick={() => setIsConfigModalOpen(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm font-medium text-slate-700 transition-colors"
                            >
                                <Settings className="w-4 h-4" />
                                Business Lines
                            </button>

                            {/* Reupload */}
                            <button
                                onClick={handleReupload}
                                className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm font-medium text-slate-700 transition-colors"
                            >
                                <Upload className="w-4 h-4" />
                                重新上传
                            </button>
                        </div>
                    </div>

                    {/* Tabs and Action Buttons */}
                    <div className="flex justify-between items-center gap-2 mt-4">
                        {/* Tabs on the left */}
                        <div className="flex gap-2">
                            {[
                                { id: 'overview', label: 'Business Outcome' },
                                { id: 'execution', label: 'Business Line' },
                                { id: 'newaudience', label: 'New Audience' },
                                { id: 'todo', label: 'Action Items' }
                            ].map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id as any)}
                                    className={`px-6 py-2 rounded-lg font-bold text-sm transition-all ${activeTab === tab.id
                                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200'
                                        : 'bg-white text-slate-600 hover:bg-slate-50'
                                        }`}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        {/* Action Items Buttons on the right */}
                        <div className="flex gap-2">
                            <button
                                onClick={() => {
                                    setActiveTab('todo');
                                    // Wait for tab to render before triggering generation
                                    setTimeout(() => {
                                        actionItemsRef.current?.generate();
                                    }, 100);
                                }}
                                disabled={actionItemsRef.current?.isLoading}
                                className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-lg font-bold text-sm hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 disabled:opacity-50"
                            >
                                <Zap className="w-4 h-4" />
                                {actionItemsRef.current?.isLoading ? '分析中...' : '生成 Action'}
                            </button>
                        </div>
                    </div>


                </div>
            </header>

            {/* Config Modal */}
            <ConfigModal
                isOpen={isConfigModalOpen}
                onClose={() => setIsConfigModalOpen(false)}
                configs={configs}
                onSave={(newConfigs) => {
                    setConfigs(newConfigs);
                    setSelectedConfigIds([]);
                }}
            />

            {/* Layer Config Modal */}
            <LayerConfigModal
                isOpen={isLayerConfigModalOpen}
                onClose={() => setIsLayerConfigModalOpen(false)}
                config={layerConfig}
                onSave={(newConfig) => {
                    setLayerConfig(newConfig);
                    setIsLayerConfigModalOpen(false);
                }}
            />

            {/* Main Content */}
            <main className="max-w-[1600px] mx-auto px-6 py-8">
                {activeTab === 'overview' && (
                    <OverviewTab
                        data={filteredData}
                        comparisonData={comparisonData}
                        configs={configs}
                        startDate={startDate}
                        endDate={endDate}
                        layerConfig={layerConfig}
                        onConfigureLayersClick={() => setIsLayerConfigModalOpen(true)}
                    />
                )}
                {activeTab === 'execution' && (
                    <BusinessLineTab
                        data={filteredData}
                        comparisonData={comparisonData}
                        configs={configs}
                        todos={todoList}
                        onTodoToggle={handleTodoToggle}
                        onThresholdsChange={handleThresholdsChange}
                        userAdjustedThresholds={userAdjustedThresholds}
                    />
                )}
                {activeTab === 'newaudience' && (
                    <NewAudienceTab
                        data={filteredData}
                        comparisonData={comparisonData}
                        endDate={endDate}
                        configs={configs}
                        onCampaignClick={(campaignName) => {
                            setActiveTab('execution');
                            // Scroll to campaign will be handled by BusinessLineTab
                        }}
                        onTodoToggle={handleTodoToggle}
                        markedTodos={new Set(todoList.map(t => t.id))}
                    />
                )}
                {activeTab === 'todo' && (
                    <ActionItemsTab
                        ref={actionItemsRef}
                        data={filteredData}
                        configs={configs}
                        dateRange={{ start: startDate, end: endDate }}
                        businessLineThresholds={businessLineThresholds}
                        comparisonData={comparisonData}
                    />
                )}
            </main>

            {/* Footer */}
            <footer className="bg-white border-t border-slate-200 mt-12">
                <div className="max-w-[1600px] mx-auto px-6 py-4">
                    <div className="flex items-center justify-between text-sm text-slate-600">
                        <div>
                            共 {filteredData.length} 条记录
                            {compareMode && comparisonData.length > 0 && (
                                <span className="ml-2">
                                    (对比期: {comparisonData.length} 条)
                                </span>
                            )}
                        </div>
                        <div>
                            Ads Commander v1.0 - Phase 1
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}

export default App;

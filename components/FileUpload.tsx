import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { Upload, FileSpreadsheet, AlertCircle, Loader2, ArrowRight, ArrowLeft, Plus, Trash2, Settings, CheckCircle, RotateCcw } from 'lucide-react';
import { RawAdRecord, AdConfiguration, FilterRule, LayerConfiguration, DEFAULT_LAYER_CONFIG, LayerFilterRule } from '../types';
import { LayerConfigModal } from './LayerConfigModal';

interface FileUploadProps {
    onDataLoaded: (data: RawAdRecord[]) => void;
    configs: AdConfiguration[];
    onConfigsChange: (configs: AdConfiguration[]) => void;
    layerConfig: LayerConfiguration;
    onLayerConfigChange: (config: LayerConfiguration) => void;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onDataLoaded, configs, onConfigsChange, layerConfig, onLayerConfigChange }) => {
    const [step, setStep] = useState<1 | 2 | 3>(1);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string>('');
    const [localConfigs, setLocalConfigs] = useState<AdConfiguration[]>(configs);
    const [showLayerModal, setShowLayerModal] = useState(false);

    // 同步 props 的变化到 local state
    useEffect(() => {
        console.log('📋 FileUpload received configs:', configs);
        setLocalConfigs(configs);
    }, [configs]);

    const processRawData = (results: any[]): RawAdRecord[] => {
        try {
            const mappedData: RawAdRecord[] = results
                .filter(row => row['Day'] || row['campaign_name'])
                .map(row => ({
                    date: String(row['Day'] || row['date'] || ''),
                    campaign_name: String(row['Campaign name'] || row['campaign_name'] || 'Unknown'),
                    adset_name: String(row['Ad set name'] || row['adset_name'] || 'Unknown'),
                    ad_name: String(row['Ad name'] || row['ad_name'] || 'Unknown'),
                    spend: parseFloat(row['Amount spent (USD)'] || row['spend'] || 0),
                    impressions: parseInt(row['Impressions'] || row['impressions'] || 0),
                    link_clicks: parseInt(row['Link clicks'] || row['link_clicks'] || 0),
                    purchases: parseInt(row['Purchases'] || row['purchases'] || 0),
                    purchase_value: parseFloat(row['Purchases conversion value'] || row['purchase_value'] || 0),
                    adds_to_cart: parseInt(row['Adds to cart'] || row['adds_to_cart'] || 0),
                    checkouts_initiated: parseInt(row['Checkouts initiated'] || row['checkouts_initiated'] || 0),
                    // 新增字段映射
                    landing_page_views: parseInt(row['Website landing page views'] || row['landing_page_views'] || 0),
                    frequency: parseFloat(row['Frequency'] || row['frequency'] || 0),
                    reach: parseInt(row['Reach'] || row['reach'] || 0),
                }));

            if (mappedData.length === 0) {
                throw new Error('未找到有效数据，请检查文件格式');
            }

            return mappedData;
        } catch (err) {
            throw new Error(`数据处理失败: ${err instanceof Error ? err.message : '未知错误'}`);
        }
    };

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setIsLoading(true);
        setError('');

        try {
            const fileExtension = file.name.split('.').pop()?.toLowerCase();

            if (fileExtension === 'csv') {
                Papa.parse(file, {
                    header: true,
                    skipEmptyLines: true,
                    complete: (results) => {
                        try {
                            const data = processRawData(results.data);
                            onDataLoaded(data);
                            setIsLoading(false);
                        } catch (err) {
                            setError(err instanceof Error ? err.message : '解析失败');
                            setIsLoading(false);
                        }
                    },
                    error: (err) => {
                        setError(`CSV解析错误: ${err.message}`);
                        setIsLoading(false);
                    }
                });
            } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
                const reader = new FileReader();
                reader.onload = (e) => {
                    try {
                        const data = new Uint8Array(e.target?.result as ArrayBuffer);
                        const workbook = XLSX.read(data, { type: 'array' });
                        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                        const jsonData = XLSX.utils.sheet_to_json(firstSheet);

                        const processedData = processRawData(jsonData);
                        onDataLoaded(processedData);
                        setIsLoading(false);
                    } catch (err) {
                        setError(err instanceof Error ? err.message : 'Excel解析失败');
                        setIsLoading(false);
                    }
                };
                reader.onerror = () => {
                    setError('文件读取失败');
                    setIsLoading(false);
                };
                reader.readAsArrayBuffer(file);
            } else {
                setError('不支持的文件格式，请上传 CSV 或 XLSX 文件');
                setIsLoading(false);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : '上传失败');
            setIsLoading(false);
        }

        event.target.value = '';
    };

    // Config management functions
    const addConfig = () => {
        const newConfig: AdConfiguration = {
            id: Date.now().toString(),
            name: 'New Business Line',
            level: 'Campaign',
            budget: 1000,
            targetType: 'ROI',
            targetValue: 3.0,
            rules: []
        };
        setLocalConfigs([...localConfigs, newConfig]);
    };

    const deleteConfig = (id: string) => {
        setLocalConfigs(localConfigs.filter(c => c.id !== id));
    };

    const updateConfig = (id: string, updates: Partial<AdConfiguration>) => {
        setLocalConfigs(localConfigs.map(c => c.id === id ? { ...c, ...updates } : c));
    };

    const addRule = (configId: string) => {
        const newRule: FilterRule = {
            field: 'campaign_name',
            operator: 'contains',
            value: ''
        };
        setLocalConfigs(localConfigs.map(c =>
            c.id === configId ? { ...c, rules: [...c.rules, newRule] } : c
        ));
    };

    const updateRule = (configId: string, ruleIndex: number, updates: Partial<FilterRule>) => {
        setLocalConfigs(localConfigs.map(c => {
            if (c.id === configId) {
                const newRules = [...c.rules];
                newRules[ruleIndex] = { ...newRules[ruleIndex], ...updates };
                return { ...c, rules: newRules };
            }
            return c;
        }));
    };

    const deleteRule = (configId: string, ruleIndex: number) => {
        setLocalConfigs(localConfigs.map(c =>
            c.id === configId ? { ...c, rules: c.rules.filter((_, i) => i !== ruleIndex) } : c
        ));
    };

    const handleNextStep = () => {
        onConfigsChange(localConfigs);
        setStep(2);
    };

    const handleLayerConfigSave = (config: LayerConfiguration) => {
        onLayerConfigChange(config);
        setShowLayerModal(false);
        setStep(3);
    };

    const totalBudget = localConfigs.reduce((sum, c) => sum + c.budget, 0);

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-6">
            <div className="max-w-5xl w-full">
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-black text-slate-900 mb-3 tracking-tight">
                        Meta 广告 Action 分析系统
                    </h1>
                    <p className="text-slate-600 text-lg">
                        Ads Commander - 专业级广告投放分析平台
                    </p>
                </div>

                {/* Step Indicator */}
                <div className="flex items-center justify-center mb-8">
                    <div className="flex items-center gap-4">
                        <div className={`flex items-center gap-2 ${step === 1 ? 'text-indigo-600' : 'text-green-600'}`}>
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${step === 1 ? 'bg-indigo-600 text-white' : 'bg-green-600 text-white'}`}>
                                {step === 1 ? '1' : <CheckCircle className="w-6 h-6" />}
                            </div>
                            <span className="font-bold">Configure Business Lines</span>
                        </div>
                        <ArrowRight className="w-6 h-6 text-slate-400" />
                        <div className={`flex items-center gap-2 ${step === 2 ? 'text-indigo-600' : step > 2 ? 'text-green-600' : 'text-slate-400'}`}>
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${step === 2 ? 'bg-indigo-600 text-white' : step > 2 ? 'bg-green-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
                                {step > 2 ? <CheckCircle className="w-6 h-6" /> : '2'}
                            </div>
                            <span className="font-bold">Configure Layers</span>
                        </div>
                        <ArrowRight className="w-6 h-6 text-slate-400" />
                        <div className={`flex items-center gap-2 ${step === 3 ? 'text-indigo-600' : 'text-slate-400'}`}>
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${step === 3 ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
                                3
                            </div>
                            <span className="font-bold">Upload Data</span>
                        </div>
                    </div>
                </div>

                {/* Step 1: Configure Business Lines */}
                {step === 1 && (
                    <div className="bg-white rounded-[2rem] shadow-xl p-10">
                        <div className="text-center mb-8">
                            <div className="inline-flex items-center justify-center w-20 h-20 bg-indigo-100 rounded-full mb-4">
                                <Settings className="w-10 h-10 text-indigo-600" />
                            </div>
                            <h2 className="text-2xl font-bold text-slate-900 mb-2">
                                Configure Business Lines
                            </h2>
                            <p className="text-slate-600">
                                Set up your business line configurations before uploading data
                            </p>
                        </div>

                        <div className="max-h-[500px] overflow-y-auto mb-6">
                            <div className="space-y-6">
                                {localConfigs.map((config) => (
                                    <div key={config.id} className="bg-slate-50 rounded-2xl p-6 border-2 border-slate-200">
                                        <div className="flex items-start justify-between mb-4">
                                            <input
                                                type="text"
                                                value={config.name}
                                                onChange={(e) => updateConfig(config.id, { name: e.target.value })}
                                                className="text-xl font-bold text-slate-900 bg-transparent border-none outline-none flex-1"
                                                placeholder="Strategy Name"
                                            />
                                            <button
                                                onClick={() => deleteConfig(config.id)}
                                                className="p-2 hover:bg-red-100 rounded-lg transition-colors"
                                            >
                                                <Trash2 className="w-5 h-5 text-red-600" />
                                            </button>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4 mb-4">
                                            <div>
                                                <label className="block text-xs font-bold text-slate-600 mb-2 uppercase">
                                                    Analysis Level
                                                </label>
                                                <select
                                                    value={config.level}
                                                    onChange={(e) => updateConfig(config.id, { level: e.target.value as any })}
                                                    className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm"
                                                >
                                                    <option value="Campaign">Campaign</option>
                                                    <option value="AdSet">AdSet</option>
                                                    <option value="Ad">Ad</option>
                                                </select>
                                            </div>

                                            <div>
                                                <label className="block text-xs font-bold text-slate-600 mb-2 uppercase">
                                                    Budget Allocation
                                                </label>
                                                <input
                                                    type="number"
                                                    value={config.budget}
                                                    onChange={(e) => updateConfig(config.id, { budget: parseFloat(e.target.value) || 0 })}
                                                    className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm"
                                                    placeholder="5000"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-xs font-bold text-slate-600 mb-2 uppercase">
                                                    KPI Type
                                                </label>
                                                <select
                                                    value={config.targetType}
                                                    onChange={(e) => updateConfig(config.id, { targetType: e.target.value as any })}
                                                    className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm"
                                                >
                                                    <option value="ROI">ROI</option>
                                                    <option value="CPC">CPC</option>
                                                    <option value="CPM">CPM</option>
                                                </select>
                                            </div>

                                            <div>
                                                <label className="block text-xs font-bold text-slate-600 mb-2 uppercase">
                                                    Target Value
                                                </label>
                                                <input
                                                    type="number"
                                                    step="0.1"
                                                    value={config.targetValue}
                                                    onChange={(e) => updateConfig(config.id, { targetValue: parseFloat(e.target.value) || 0 })}
                                                    className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm"
                                                    placeholder="4.5"
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <div className="flex items-center justify-between mb-3">
                                                <label className="text-xs font-bold text-slate-600 uppercase">
                                                    Filtering Rules (AND Logic)
                                                </label>
                                                <button
                                                    onClick={() => addRule(config.id)}
                                                    className="flex items-center gap-1 px-3 py-1 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 rounded-lg text-xs font-bold transition-colors"
                                                >
                                                    <Plus className="w-3 h-3" />
                                                    Add Rule
                                                </button>
                                            </div>

                                            <div className="space-y-2">
                                                {config.rules.map((rule, index) => (
                                                    <div key={index} className="flex items-center gap-2">
                                                        <select
                                                            value={rule.field}
                                                            onChange={(e) => updateRule(config.id, index, { field: e.target.value as any })}
                                                            className="px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm"
                                                        >
                                                            <option value="campaign_name">Campaign Name</option>
                                                            <option value="adset_name">Ad Set Name</option>
                                                            <option value="ad_name">Ad Name</option>
                                                        </select>

                                                        <select
                                                            value={rule.operator}
                                                            onChange={(e) => updateRule(config.id, index, { operator: e.target.value as any })}
                                                            className="px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm"
                                                        >
                                                            <option value="contains">Contains</option>
                                                            <option value="not_contains">Exclude</option>
                                                            <option value="equals">Equals</option>
                                                        </select>

                                                        <input
                                                            type="text"
                                                            value={rule.value}
                                                            onChange={(e) => updateRule(config.id, index, { value: e.target.value })}
                                                            className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm"
                                                            placeholder="Enter value..."
                                                        />

                                                        <button
                                                            onClick={() => deleteRule(config.id, index)}
                                                            className="p-2 hover:bg-red-100 rounded-lg transition-colors"
                                                        >
                                                            <Trash2 className="w-4 h-4 text-red-600" />
                                                        </button>
                                                    </div>
                                                ))}
                                                {config.rules.length === 0 && (
                                                    <p className="text-sm text-slate-500 italic text-center py-2">
                                                        No filtering rules. Click "Add Rule" to add filters.
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <button
                                onClick={addConfig}
                                className="w-full mt-6 py-4 border-2 border-dashed border-slate-300 rounded-2xl text-slate-600 hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all font-bold flex items-center justify-center gap-2"
                            >
                                <Plus className="w-5 h-5" />
                                Add Business Line
                            </button>
                        </div>

                        <div className="flex items-center justify-between pt-6 border-t border-slate-200">
                            <div className="text-sm">
                                <span className="text-slate-600">Total Budget: </span>
                                <span className="font-black text-slate-900 text-lg">
                                    ${totalBudget.toLocaleString()}
                                </span>
                            </div>
                            <button
                                onClick={handleNextStep}
                                disabled={localConfigs.length === 0}
                                className="flex items-center gap-2 px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Next: Configure Layers
                                <ArrowRight className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 2: Configure Advertising Layers */}
                {step === 2 && (
                    <div className="bg-white rounded-[2rem] shadow-xl p-10">
                        <div className="text-center mb-8">
                            <div className="inline-flex items-center justify-center w-20 h-20 bg-indigo-100 rounded-full mb-4">
                                <Settings className="w-10 h-10 text-indigo-600" />
                            </div>
                            <h2 className="text-2xl font-bold text-slate-900 mb-2">
                                Configure Advertising Layers
                            </h2>
                            <p className="text-slate-600">
                                Define how campaigns are classified into Awareness, Traffic, and Conversion layers
                            </p>
                        </div>

                        <div className="max-h-[500px] overflow-y-auto mb-6">
                            <div className="space-y-4">
                                {/* Awareness Layer */}
                                <div className="border-2 rounded-xl p-6 bg-blue-50 border-blue-200">
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-2xl">🎯</span>
                                                <h3 className="text-lg font-bold text-slate-900">Awareness Layer（认知层）</h3>
                                            </div>
                                            <p className="text-sm text-slate-600">目标：提升品牌认知度，扩大曝光</p>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <div className="text-sm font-medium text-slate-700">筛选规则</div>
                                            <button
                                                onClick={() => {
                                                    const newRule: LayerFilterRule = { field: 'campaign_name', operator: 'contains', value: '' };
                                                    onLayerConfigChange({
                                                        ...layerConfig,
                                                        awareness: { ...layerConfig.awareness, rules: [...layerConfig.awareness.rules, newRule] }
                                                    });
                                                }}
                                                className="flex items-center gap-1 px-3 py-1 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 rounded-lg text-xs font-bold transition-colors"
                                            >
                                                <Plus className="w-3 h-3" />
                                                添加规则
                                            </button>
                                        </div>

                                        <div className="space-y-2">
                                            {layerConfig.awareness.rules.map((rule, index) => (
                                                <div key={index} className="flex items-center gap-2">
                                                    <select
                                                        value={rule.field}
                                                        onChange={(e) => {
                                                            const newRules = [...layerConfig.awareness.rules];
                                                            newRules[index] = { ...rule, field: e.target.value as any };
                                                            onLayerConfigChange({
                                                                ...layerConfig,
                                                                awareness: { ...layerConfig.awareness, rules: newRules }
                                                            });
                                                        }}
                                                        className="px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm"
                                                    >
                                                        <option value="campaign_name">Campaign Name</option>
                                                        <option value="adset_name">Ad Set Name</option>
                                                        <option value="ad_name">Ad Name</option>
                                                    </select>

                                                    <select
                                                        value={rule.operator}
                                                        onChange={(e) => {
                                                            const newRules = [...layerConfig.awareness.rules];
                                                            newRules[index] = { ...rule, operator: e.target.value as any };
                                                            onLayerConfigChange({
                                                                ...layerConfig,
                                                                awareness: { ...layerConfig.awareness, rules: newRules }
                                                            });
                                                        }}
                                                        className="px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm"
                                                    >
                                                        <option value="contains">Contains</option>
                                                        <option value="not_contains">Exclude</option>
                                                        <option value="equals">Equals</option>
                                                    </select>

                                                    <input
                                                        type="text"
                                                        value={rule.value}
                                                        onChange={(e) => {
                                                            const newRules = [...layerConfig.awareness.rules];
                                                            newRules[index] = { ...rule, value: e.target.value };
                                                            onLayerConfigChange({
                                                                ...layerConfig,
                                                                awareness: { ...layerConfig.awareness, rules: newRules }
                                                            });
                                                        }}
                                                        className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm"
                                                        placeholder="输入值..."
                                                    />

                                                    <button
                                                        onClick={() => {
                                                            const newRules = layerConfig.awareness.rules.filter((_, i) => i !== index);
                                                            onLayerConfigChange({
                                                                ...layerConfig,
                                                                awareness: { ...layerConfig.awareness, rules: newRules }
                                                            });
                                                        }}
                                                        className="p-2 hover:bg-red-100 rounded-lg transition-colors"
                                                    >
                                                        <Trash2 className="w-4 h-4 text-red-600" />
                                                    </button>
                                                </div>
                                            ))}
                                            {layerConfig.awareness.rules.length === 0 && (
                                                <p className="text-sm text-slate-500 italic text-center py-2">
                                                    暂无规则。点击"添加规则"来添加筛选条件。
                                                </p>
                                            )}
                                        </div>

                                        {layerConfig.awareness.rules.length > 1 && (
                                            <div className="mt-3 flex items-center gap-3 p-3 bg-white/50 rounded-lg border border-slate-200">
                                                <span className="text-sm font-medium text-slate-700">规则逻辑:</span>
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => onLayerConfigChange({
                                                            ...layerConfig,
                                                            awareness: { ...layerConfig.awareness, logic: 'AND' }
                                                        })}
                                                        className={`px-3 py-1 rounded text-sm font-medium transition-colors ${layerConfig.awareness.logic === 'AND'
                                                            ? 'bg-indigo-600 text-white'
                                                            : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-300'
                                                            }`}
                                                    >
                                                        AND
                                                    </button>
                                                    <button
                                                        onClick={() => onLayerConfigChange({
                                                            ...layerConfig,
                                                            awareness: { ...layerConfig.awareness, logic: 'OR' }
                                                        })}
                                                        className={`px-3 py-1 rounded text-sm font-medium transition-colors ${layerConfig.awareness.logic === 'OR'
                                                            ? 'bg-indigo-600 text-white'
                                                            : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-300'
                                                            }`}
                                                    >
                                                        OR
                                                    </button>
                                                </div>
                                                <span className="text-xs text-slate-500">
                                                    {layerConfig.awareness.logic === 'AND' ? '所有规则都必须满足' : '满足任一规则即可'}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Traffic Layer */}
                                <div className="border-2 rounded-xl p-6 bg-green-50 border-green-200">
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-2xl">🚀</span>
                                                <h3 className="text-lg font-bold text-slate-900">Traffic Layer（流量层）</h3>
                                            </div>
                                            <p className="text-sm text-slate-600">目标：吸引用户点击，引导流量到网站</p>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <div className="text-sm font-medium text-slate-700">筛选规则</div>
                                            <button
                                                onClick={() => {
                                                    const newRule: LayerFilterRule = { field: 'campaign_name', operator: 'contains', value: '' };
                                                    onLayerConfigChange({
                                                        ...layerConfig,
                                                        traffic: { ...layerConfig.traffic, rules: [...layerConfig.traffic.rules, newRule] }
                                                    });
                                                }}
                                                className="flex items-center gap-1 px-3 py-1 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 rounded-lg text-xs font-bold transition-colors"
                                            >
                                                <Plus className="w-3 h-3" />
                                                添加规则
                                            </button>
                                        </div>

                                        <div className="space-y-2">
                                            {layerConfig.traffic.rules.map((rule, index) => (
                                                <div key={index} className="flex items-center gap-2">
                                                    <select
                                                        value={rule.field}
                                                        onChange={(e) => {
                                                            const newRules = [...layerConfig.traffic.rules];
                                                            newRules[index] = { ...rule, field: e.target.value as any };
                                                            onLayerConfigChange({
                                                                ...layerConfig,
                                                                traffic: { ...layerConfig.traffic, rules: newRules }
                                                            });
                                                        }}
                                                        className="px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm"
                                                    >
                                                        <option value="campaign_name">Campaign Name</option>
                                                        <option value="adset_name">Ad Set Name</option>
                                                        <option value="ad_name">Ad Name</option>
                                                    </select>

                                                    <select
                                                        value={rule.operator}
                                                        onChange={(e) => {
                                                            const newRules = [...layerConfig.traffic.rules];
                                                            newRules[index] = { ...rule, operator: e.target.value as any };
                                                            onLayerConfigChange({
                                                                ...layerConfig,
                                                                traffic: { ...layerConfig.traffic, rules: newRules }
                                                            });
                                                        }}
                                                        className="px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm"
                                                    >
                                                        <option value="contains">Contains</option>
                                                        <option value="not_contains">Exclude</option>
                                                        <option value="equals">Equals</option>
                                                    </select>

                                                    <input
                                                        type="text"
                                                        value={rule.value}
                                                        onChange={(e) => {
                                                            const newRules = [...layerConfig.traffic.rules];
                                                            newRules[index] = { ...rule, value: e.target.value };
                                                            onLayerConfigChange({
                                                                ...layerConfig,
                                                                traffic: { ...layerConfig.traffic, rules: newRules }
                                                            });
                                                        }}
                                                        className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm"
                                                        placeholder="输入值..."
                                                    />

                                                    <button
                                                        onClick={() => {
                                                            const newRules = layerConfig.traffic.rules.filter((_, i) => i !== index);
                                                            onLayerConfigChange({
                                                                ...layerConfig,
                                                                traffic: { ...layerConfig.traffic, rules: newRules }
                                                            });
                                                        }}
                                                        className="p-2 hover:bg-red-100 rounded-lg transition-colors"
                                                    >
                                                        <Trash2 className="w-4 h-4 text-red-600" />
                                                    </button>
                                                </div>
                                            ))}
                                            {layerConfig.traffic.rules.length === 0 && (
                                                <p className="text-sm text-slate-500 italic text-center py-2">
                                                    暂无规则。点击"添加规则"来添加筛选条件。
                                                </p>
                                            )}
                                        </div>

                                        {layerConfig.traffic.rules.length > 1 && (
                                            <div className="mt-3 flex items-center gap-3 p-3 bg-white/50 rounded-lg border border-slate-200">
                                                <span className="text-sm font-medium text-slate-700">规则逻辑:</span>
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => onLayerConfigChange({
                                                            ...layerConfig,
                                                            traffic: { ...layerConfig.traffic, logic: 'AND' }
                                                        })}
                                                        className={`px-3 py-1 rounded text-sm font-medium transition-colors ${layerConfig.traffic.logic === 'AND'
                                                            ? 'bg-indigo-600 text-white'
                                                            : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-300'
                                                            }`}
                                                    >
                                                        AND
                                                    </button>
                                                    <button
                                                        onClick={() => onLayerConfigChange({
                                                            ...layerConfig,
                                                            traffic: { ...layerConfig.traffic, logic: 'OR' }
                                                        })}
                                                        className={`px-3 py-1 rounded text-sm font-medium transition-colors ${layerConfig.traffic.logic === 'OR'
                                                            ? 'bg-indigo-600 text-white'
                                                            : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-300'
                                                            }`}
                                                    >
                                                        OR
                                                    </button>
                                                </div>
                                                <span className="text-xs text-slate-500">
                                                    {layerConfig.traffic.logic === 'AND' ? '所有规则都必须满足' : '满足任一规则即可'}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Conversion Layer */}
                                <div className="border-2 rounded-xl p-6 bg-purple-50 border-purple-200">
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-2xl">💰</span>
                                                <h3 className="text-lg font-bold text-slate-900">Conversion Layer（转化层）</h3>
                                            </div>
                                            <p className="text-sm text-slate-600">目标：促进用户购买，提升转化率</p>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <div className="text-sm font-medium text-slate-700">筛选规则</div>
                                            <button
                                                onClick={() => {
                                                    const newRule: LayerFilterRule = { field: 'campaign_name', operator: 'contains', value: '' };
                                                    onLayerConfigChange({
                                                        ...layerConfig,
                                                        conversion: { ...layerConfig.conversion, rules: [...layerConfig.conversion.rules, newRule] }
                                                    });
                                                }}
                                                className="flex items-center gap-1 px-3 py-1 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 rounded-lg text-xs font-bold transition-colors"
                                            >
                                                <Plus className="w-3 h-3" />
                                                添加规则
                                            </button>
                                        </div>

                                        <div className="space-y-2">
                                            {layerConfig.conversion.rules.map((rule, index) => (
                                                <div key={index} className="flex items-center gap-2">
                                                    <select
                                                        value={rule.field}
                                                        onChange={(e) => {
                                                            const newRules = [...layerConfig.conversion.rules];
                                                            newRules[index] = { ...rule, field: e.target.value as any };
                                                            onLayerConfigChange({
                                                                ...layerConfig,
                                                                conversion: { ...layerConfig.conversion, rules: newRules }
                                                            });
                                                        }}
                                                        className="px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm"
                                                    >
                                                        <option value="campaign_name">Campaign Name</option>
                                                        <option value="adset_name">Ad Set Name</option>
                                                        <option value="ad_name">Ad Name</option>
                                                    </select>

                                                    <select
                                                        value={rule.operator}
                                                        onChange={(e) => {
                                                            const newRules = [...layerConfig.conversion.rules];
                                                            newRules[index] = { ...rule, operator: e.target.value as any };
                                                            onLayerConfigChange({
                                                                ...layerConfig,
                                                                conversion: { ...layerConfig.conversion, rules: newRules }
                                                            });
                                                        }}
                                                        className="px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm"
                                                    >
                                                        <option value="contains">Contains</option>
                                                        <option value="not_contains">Exclude</option>
                                                        <option value="equals">Equals</option>
                                                    </select>

                                                    <input
                                                        type="text"
                                                        value={rule.value}
                                                        onChange={(e) => {
                                                            const newRules = [...layerConfig.conversion.rules];
                                                            newRules[index] = { ...rule, value: e.target.value };
                                                            onLayerConfigChange({
                                                                ...layerConfig,
                                                                conversion: { ...layerConfig.conversion, rules: newRules }
                                                            });
                                                        }}
                                                        className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm"
                                                        placeholder="输入值..."
                                                    />

                                                    <button
                                                        onClick={() => {
                                                            const newRules = layerConfig.conversion.rules.filter((_, i) => i !== index);
                                                            onLayerConfigChange({
                                                                ...layerConfig,
                                                                conversion: { ...layerConfig.conversion, rules: newRules }
                                                            });
                                                        }}
                                                        className="p-2 hover:bg-red-100 rounded-lg transition-colors"
                                                    >
                                                        <Trash2 className="w-4 h-4 text-red-600" />
                                                    </button>
                                                </div>
                                            ))}
                                            {layerConfig.conversion.rules.length === 0 && (
                                                <p className="text-sm text-slate-500 italic text-center py-2">
                                                    暂无规则。点击"添加规则"来添加筛选条件。
                                                </p>
                                            )}
                                        </div>

                                        {layerConfig.conversion.rules.length > 1 && (
                                            <div className="mt-3 flex items-center gap-3 p-3 bg-white/50 rounded-lg border border-slate-200">
                                                <span className="text-sm font-medium text-slate-700">规则逻辑:</span>
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => onLayerConfigChange({
                                                            ...layerConfig,
                                                            conversion: { ...layerConfig.conversion, logic: 'AND' }
                                                        })}
                                                        className={`px-3 py-1 rounded text-sm font-medium transition-colors ${layerConfig.conversion.logic === 'AND'
                                                            ? 'bg-indigo-600 text-white'
                                                            : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-300'
                                                            }`}
                                                    >
                                                        AND
                                                    </button>
                                                    <button
                                                        onClick={() => onLayerConfigChange({
                                                            ...layerConfig,
                                                            conversion: { ...layerConfig.conversion, logic: 'OR' }
                                                        })}
                                                        className={`px-3 py-1 rounded text-sm font-medium transition-colors ${layerConfig.conversion.logic === 'OR'
                                                            ? 'bg-indigo-600 text-white'
                                                            : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-300'
                                                            }`}
                                                    >
                                                        OR
                                                    </button>
                                                </div>
                                                <span className="text-xs text-slate-500">
                                                    {layerConfig.conversion.logic === 'AND' ? '所有规则都必须满足' : '满足任一规则即可'}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Info Box */}
                                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                    <div className="flex items-start gap-2">
                                        <span className="text-blue-600 text-lg">ℹ️</span>
                                        <div className="text-sm text-blue-900">
                                            <strong>提示：</strong>如果广告系列不匹配任何规则，将默认归类为 <strong>Conversion Layer</strong>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center justify-between pt-6 border-t border-slate-200">
                            <button
                                onClick={() => setStep(1)}
                                className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-300 rounded-xl font-bold text-slate-700 hover:bg-slate-50 transition-colors"
                            >
                                <ArrowLeft className="w-5 h-5" />
                                Previous
                            </button>
                            <button
                                onClick={() => onLayerConfigChange({ ...layerConfig })}
                                className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors flex items-center gap-2"
                            >
                                <RotateCcw className="w-4 h-4" />
                                恢复默认规则
                            </button>
                            <button
                                onClick={() => setStep(3)}
                                className="flex items-center gap-2 px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200"
                            >
                                Next: Upload Data
                                <ArrowRight className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 3: Upload Data */}
                {step === 3 && (
                    <div className="bg-white rounded-[2rem] shadow-xl p-10">
                        <div className="text-center mb-8">
                            <div className="inline-flex items-center justify-center w-20 h-20 bg-indigo-100 rounded-full mb-4">
                                <FileSpreadsheet className="w-10 h-10 text-indigo-600" />
                            </div>
                            <h2 className="text-2xl font-bold text-slate-900 mb-2">
                                Upload Ad Data
                            </h2>
                            <p className="text-slate-600">
                                Upload CSV or XLSX file exported from Meta Ads Manager
                            </p>
                        </div>

                        {error && (
                            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
                                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-red-900">Upload Failed</p>
                                    <p className="text-sm text-red-700 mt-1">{error}</p>
                                </div>
                            </div>
                        )}

                        <div className="mb-8">
                            <label className="block">
                                <input
                                    type="file"
                                    accept=".csv,.xlsx,.xls"
                                    onChange={handleFileUpload}
                                    disabled={isLoading}
                                    className="hidden"
                                />
                                <div className={`
                                    border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer
                                    transition-all duration-200
                                    ${isLoading
                                        ? 'border-slate-300 bg-slate-50 cursor-not-allowed'
                                        : 'border-indigo-300 bg-indigo-50 hover:bg-indigo-100 hover:border-indigo-400'
                                    }
                                `}>
                                    {isLoading ? (
                                        <div className="flex flex-col items-center gap-3">
                                            <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
                                            <p className="text-lg font-semibold text-slate-900">
                                                Syncing ad data...
                                            </p>
                                            <p className="text-sm text-slate-600">
                                                Please wait, parsing file
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center gap-3">
                                            <Upload className="w-12 h-12 text-indigo-600" />
                                            <p className="text-lg font-semibold text-slate-900">
                                                Click or drag file here
                                            </p>
                                            <p className="text-sm text-slate-600">
                                                Supports .csv, .xlsx, .xls formats
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </label>
                        </div>

                        <div className="bg-slate-50 rounded-xl p-6 mb-6">
                            <h3 className="text-sm font-bold text-slate-900 mb-3 uppercase tracking-wider">
                                Required Fields
                            </h3>
                            <div className="grid grid-cols-2 gap-3 text-sm">
                                <div className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 bg-indigo-600 rounded-full"></div>
                                    <span className="text-slate-700">Day (Date)</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 bg-indigo-600 rounded-full"></div>
                                    <span className="text-slate-700">Campaign name</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 bg-indigo-600 rounded-full"></div>
                                    <span className="text-slate-700">Amount spent</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 bg-indigo-600 rounded-full"></div>
                                    <span className="text-slate-700">Purchase value (GMV)</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 bg-indigo-600 rounded-full"></div>
                                    <span className="text-slate-700">Impressions</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 bg-indigo-600 rounded-full"></div>
                                    <span className="text-slate-700">Link clicks</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center justify-between pt-6 border-t border-slate-200">
                            <button
                                onClick={() => setStep(1)}
                                className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-300 rounded-xl font-bold text-slate-700 hover:bg-slate-50 transition-colors"
                            >
                                <ArrowLeft className="w-5 h-5" />
                                Previous
                            </button>
                            <p className="text-sm text-slate-500">
                                Data will be processed locally, not uploaded to server
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

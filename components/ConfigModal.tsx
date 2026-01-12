import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Settings } from 'lucide-react';
import { AdConfiguration, FilterRule } from '../types';

interface ConfigModalProps {
    isOpen: boolean;
    onClose: () => void;
    configs: AdConfiguration[];
    onSave: (configs: AdConfiguration[]) => void;
}

export const ConfigModal: React.FC<ConfigModalProps> = ({ isOpen, onClose, configs, onSave }) => {
    const [localConfigs, setLocalConfigs] = useState<AdConfiguration[]>(configs);

    // 同步 props 的变化到 local state
    useEffect(() => {
        console.log('📋 ConfigModal received configs:', configs);
        console.log('📋 ConfigModal isOpen:', isOpen);
        setLocalConfigs(configs);
    }, [configs, isOpen]); // 当 configs 或 isOpen 变化时更新

    if (!isOpen) return null;

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

    const handleSave = () => {
        onSave(localConfigs);
        onClose();
    };

    const totalBudget = localConfigs.reduce((sum, c) => sum + c.budget, 0);

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="px-8 py-6 border-b border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-100 rounded-xl">
                            <Settings className="w-6 h-6 text-indigo-600" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-slate-900">Ads Commander</h2>
                            <p className="text-sm text-slate-600">业务线配置管理</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
                    >
                        <X className="w-6 h-6 text-slate-600" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-8">
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
                                    {/* Level */}
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

                                    {/* Budget */}
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

                                    {/* Target Type */}
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

                                    {/* Target Value */}
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

                                {/* Campaign Period */}
                                <div className="grid grid-cols-2 gap-4 mb-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-600 mb-2 uppercase">
                                            Campaign Start Date
                                        </label>
                                        <input
                                            type="date"
                                            value={config.campaignPeriod?.startDate || ''}
                                            onChange={(e) => updateConfig(config.id, {
                                                campaignPeriod: { ...config.campaignPeriod, startDate: e.target.value, endDate: config.campaignPeriod?.endDate || '' }
                                            })}
                                            className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-600 mb-2 uppercase">
                                            Campaign End Date
                                        </label>
                                        <input
                                            type="date"
                                            value={config.campaignPeriod?.endDate || ''}
                                            onChange={(e) => updateConfig(config.id, {
                                                campaignPeriod: { startDate: config.campaignPeriod?.startDate || '', endDate: e.target.value }
                                            })}
                                            className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm"
                                        />
                                    </div>
                                </div>

                                {/* Filtering Rules */}
                                <div>
                                    <div className="flex items-center justify-between mb-3">
                                        <label className="text-xs font-bold text-slate-600 uppercase">
                                            Filtering Rules
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

                                    {/* Logic Toggle - only show when there are multiple rules */}
                                    {config.rules.length > 1 && (
                                        <div className="mt-3 flex items-center gap-3 p-3 bg-white rounded-lg border border-slate-200">
                                            <span className="text-sm font-medium text-slate-700">规则逻辑:</span>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => updateConfig(config.id, { rulesLogic: 'AND' })}
                                                    className={`px-3 py-1 rounded text-sm font-medium transition-colors ${(config.rulesLogic || 'AND') === 'AND'
                                                        ? 'bg-indigo-600 text-white'
                                                        : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-300'
                                                        }`}
                                                >
                                                    AND
                                                </button>
                                                <button
                                                    onClick={() => updateConfig(config.id, { rulesLogic: 'OR' })}
                                                    className={`px-3 py-1 rounded text-sm font-medium transition-colors ${config.rulesLogic === 'OR'
                                                        ? 'bg-indigo-600 text-white'
                                                        : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-300'
                                                        }`}
                                                >
                                                    OR
                                                </button>
                                            </div>
                                            <span className="text-xs text-slate-500">
                                                {(config.rulesLogic || 'AND') === 'AND'
                                                    ? '所有规则都必须满足'
                                                    : '满足任一规则即可'}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    <button
                        onClick={addConfig}
                        className="w-full mt-6 py-4 border-2 border-dashed border-slate-300 rounded-2xl text-slate-600 hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all font-bold flex items-center justify-center gap-2"
                    >
                        <Plus className="w-5 h-5" />
                        Expand Business Domain
                    </button>
                </div>

                {/* Footer */}
                <div className="px-8 py-6 border-t border-slate-200 flex items-center justify-between bg-slate-50">
                    <div className="text-sm">
                        <span className="text-slate-600">Total Configured Budget: </span>
                        <span className="font-black text-slate-900 text-lg">
                            ${totalBudget.toLocaleString()}
                        </span>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="px-6 py-3 bg-white border border-slate-300 rounded-xl font-bold text-slate-700 hover:bg-slate-50 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200"
                        >
                            Synchronize Commander
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

import React, { useState } from 'react';
import { X, Plus, Trash2, RotateCcw } from 'lucide-react';
import { LayerConfiguration, LayerFilterRule, CampaignLayer, DEFAULT_LAYER_CONFIG } from '../types';

interface LayerConfigModalProps {
    isOpen: boolean;
    onClose: () => void;
    config: LayerConfiguration;
    onSave: (config: LayerConfiguration) => void;
    isOnboarding?: boolean;
}

export const LayerConfigModal: React.FC<LayerConfigModalProps> = ({
    isOpen,
    onClose,
    config,
    onSave,
    isOnboarding = false
}) => {
    const [localConfig, setLocalConfig] = useState<LayerConfiguration>(config);

    if (!isOpen) return null;

    const layerInfo = {
        awareness: {
            icon: '🎯',
            title: 'Awareness Layer（认知层）',
            description: '目标：提升品牌认知度，扩大曝光',
            color: 'bg-blue-50 border-blue-200'
        },
        traffic: {
            icon: '🚀',
            title: 'Traffic Layer（流量层）',
            description: '目标：吸引用户点击，引导流量到网站',
            color: 'bg-green-50 border-green-200'
        },
        conversion: {
            icon: '💰',
            title: 'Conversion Layer（转化层）',
            description: '目标：促进用户购买，提升转化率',
            color: 'bg-purple-50 border-purple-200'
        }
    };

    const addRule = (layer: keyof LayerConfiguration) => {
        const newRule: LayerFilterRule = {
            field: 'campaign_name',
            operator: 'contains',
            value: ''
        };
        setLocalConfig({
            ...localConfig,
            [layer]: {
                ...localConfig[layer],
                rules: [...localConfig[layer].rules, newRule]
            }
        });
    };

    const updateRule = (layer: keyof LayerConfiguration, index: number, updates: Partial<LayerFilterRule>) => {
        setLocalConfig({
            ...localConfig,
            [layer]: {
                ...localConfig[layer],
                rules: localConfig[layer].rules.map((rule, i) => i === index ? { ...rule, ...updates } : rule)
            }
        });
    };

    const deleteRule = (layer: keyof LayerConfiguration, index: number) => {
        setLocalConfig({
            ...localConfig,
            [layer]: {
                ...localConfig[layer],
                rules: localConfig[layer].rules.filter((_, i) => i !== index)
            }
        });
    };

    const updateLogic = (layer: keyof LayerConfiguration, logic: 'AND' | 'OR') => {
        setLocalConfig({
            ...localConfig,
            [layer]: {
                ...localConfig[layer],
                logic
            }
        });
    };

    const handleResetToDefault = () => {
        if (confirm('确定要恢复默认规则吗？这将清除所有自定义设置。')) {
            setLocalConfig(DEFAULT_LAYER_CONFIG);
        }
    };

    const handleSave = () => {
        onSave(localConfig);
    };

    const renderLayerCard = (layer: keyof LayerConfiguration, layerEnum: CampaignLayer) => {
        const info = layerInfo[layer];

        return (
            <div key={layer} className={`border-2 rounded-xl p-6 ${info.color}`}>
                <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-2xl">{info.icon}</span>
                            <h3 className="text-lg font-bold text-slate-900">{info.title}</h3>
                        </div>
                        <p className="text-sm text-slate-600">{info.description}</p>
                    </div>
                </div>

                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <div className="text-sm font-medium text-slate-700">
                            筛选规则
                        </div>
                        <button
                            onClick={() => addRule(layer)}
                            className="flex items-center gap-1 px-3 py-1 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 rounded-lg text-xs font-bold transition-colors"
                        >
                            <Plus className="w-3 h-3" />
                            添加规则
                        </button>
                    </div>

                    <div className="space-y-2">
                        {localConfig[layer].rules.map((rule, index) => (
                            <div key={index} className="flex items-center gap-2">
                                <select
                                    value={rule.field}
                                    onChange={(e) => updateRule(layer, index, { field: e.target.value as any })}
                                    className="px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm"
                                >
                                    <option value="campaign_name">Campaign Name</option>
                                    <option value="adset_name">Ad Set Name</option>
                                    <option value="ad_name">Ad Name</option>
                                </select>

                                <select
                                    value={rule.operator}
                                    onChange={(e) => updateRule(layer, index, { operator: e.target.value as any })}
                                    className="px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm"
                                >
                                    <option value="contains">Contains</option>
                                    <option value="not_contains">Exclude</option>
                                    <option value="equals">Equals</option>
                                </select>

                                <input
                                    type="text"
                                    value={rule.value}
                                    onChange={(e) => updateRule(layer, index, { value: e.target.value })}
                                    className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm"
                                    placeholder="输入值..."
                                />

                                <button
                                    onClick={() => deleteRule(layer, index)}
                                    className="p-2 hover:bg-red-100 rounded-lg transition-colors"
                                >
                                    <Trash2 className="w-4 h-4 text-red-600" />
                                </button>
                            </div>
                        ))}
                        {localConfig[layer].rules.length === 0 && (
                            <p className="text-sm text-slate-500 italic text-center py-2">
                                暂无规则。点击"添加规则"来添加筛选条件。
                            </p>
                        )}
                    </div>

                    {/* Logic Toggle */}
                    {localConfig[layer].rules.length > 1 && (
                        <div className="mt-3 flex items-center gap-3 p-3 bg-white/50 rounded-lg border border-slate-200">
                            <span className="text-sm font-medium text-slate-700">规则逻辑:</span>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => updateLogic(layer, 'AND')}
                                    className={`px-3 py-1 rounded text-sm font-medium transition-colors ${localConfig[layer].logic === 'AND'
                                        ? 'bg-indigo-600 text-white'
                                        : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-300'
                                        }`}
                                >
                                    AND
                                </button>
                                <button
                                    onClick={() => updateLogic(layer, 'OR')}
                                    className={`px-3 py-1 rounded text-sm font-medium transition-colors ${localConfig[layer].logic === 'OR'
                                        ? 'bg-indigo-600 text-white'
                                        : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-300'
                                        }`}
                                >
                                    OR
                                </button>
                            </div>
                            <span className="text-xs text-slate-500">
                                {localConfig[layer].logic === 'AND'
                                    ? '所有规则都必须满足'
                                    : '满足任一规则即可'}
                            </span>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-200">
                    <div>
                        <h2 className="text-2xl font-black text-slate-900">
                            {isOnboarding ? 'Configure Advertising Layers' : 'Advertising Layers 配置'}
                        </h2>
                        <p className="text-sm text-slate-600 mt-1">
                            定义广告系列的层级分类规则
                        </p>
                    </div>
                    {!isOnboarding && (
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                            <X className="w-6 h-6 text-slate-600" />
                        </button>
                    )}
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    <div className="space-y-4">
                        {renderLayerCard('awareness', CampaignLayer.AWARENESS)}
                        {renderLayerCard('traffic', CampaignLayer.TRAFFIC)}
                        {renderLayerCard('conversion', CampaignLayer.CONVERSION)}
                    </div>

                    <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="flex items-start gap-2">
                            <span className="text-blue-600 text-lg">ℹ️</span>
                            <div className="text-sm text-blue-900">
                                <strong>提示：</strong>如果广告系列不匹配任何规则，将默认归类为 <strong>Conversion Layer</strong>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between p-6 border-t border-slate-200 bg-slate-50">
                    <button
                        onClick={handleResetToDefault}
                        className="flex items-center gap-2 px-4 py-2 text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
                    >
                        <RotateCcw className="w-4 h-4" />
                        恢复默认规则
                    </button>
                    <div className="flex items-center gap-3">
                        {!isOnboarding && (
                            <button
                                onClick={onClose}
                                className="px-6 py-2 text-slate-700 hover:bg-slate-200 rounded-lg font-medium transition-colors"
                            >
                                取消
                            </button>
                        )}
                        <button
                            onClick={handleSave}
                            className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
                        >
                            {isOnboarding ? '下一步：上传数据' : '保存'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

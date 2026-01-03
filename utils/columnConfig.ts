import { formatCurrency, formatPercent, formatNumber } from './dataUtils';

export interface ColumnConfig {
    key: string;
    label: string;
    format: (value: number) => string;
    higherIsBetter: boolean;
}

export const getColumnsForKPI = (targetType: 'ROI' | 'CPC' | 'CPM'): ColumnConfig[] => {
    if (targetType === 'ROI') {
        return [
            { key: 'spend', label: 'Spend', format: formatCurrency, higherIsBetter: false },
            { key: 'roi', label: 'ROI', format: (v) => `${v.toFixed(2)}x`, higherIsBetter: true },
            { key: 'cvr', label: 'CVR', format: formatPercent, higherIsBetter: true },
            { key: 'aov', label: 'AOV', format: formatCurrency, higherIsBetter: true },
            { key: 'cpa', label: 'CPA', format: formatCurrency, higherIsBetter: false },
            { key: 'cpatc', label: 'CPATC', format: formatCurrency, higherIsBetter: false },
            { key: 'atc_rate', label: 'ATC Rate', format: formatPercent, higherIsBetter: true },
            { key: 'ctr', label: 'CTR', format: formatPercent, higherIsBetter: true },
            { key: 'cpc', label: 'CPC', format: formatCurrency, higherIsBetter: false }
        ];
    }

    if (targetType === 'CPC') {
        return [
            { key: 'spend', label: 'Spend', format: formatCurrency, higherIsBetter: false },
            { key: 'cpc', label: 'CPC', format: formatCurrency, higherIsBetter: false },
            { key: 'cpm', label: 'CPM', format: formatCurrency, higherIsBetter: false },
            { key: 'ctr', label: 'CTR', format: formatPercent, higherIsBetter: true },
            { key: 'clicks', label: 'Clicks', format: formatNumber, higherIsBetter: true },
            { key: 'impressions', label: 'Impr.', format: formatNumber, higherIsBetter: true }
        ];
    }

    // CPM
    return [
        { key: 'spend', label: 'Spend', format: formatCurrency, higherIsBetter: false },
        { key: 'cpm', label: 'CPM', format: formatCurrency, higherIsBetter: false },
        { key: 'reach', label: 'Reach', format: formatNumber, higherIsBetter: true },
        { key: 'impressions', label: 'Impr.', format: formatNumber, higherIsBetter: true },
        { key: 'frequency', label: 'Freq.', format: (v) => v.toFixed(2), higherIsBetter: false },
        { key: 'clicks', label: 'Clicks', format: formatNumber, higherIsBetter: true },
        { key: 'cpc', label: 'CPC', format: formatCurrency, higherIsBetter: false }
    ];
};

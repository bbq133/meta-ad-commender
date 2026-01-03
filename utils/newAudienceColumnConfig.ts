import { formatCurrency, formatPercent, formatNumber } from './dataUtils';

export type KPIType = 'ROI' | 'CPC' | 'CPM';

export interface ColumnConfig {
    key: string;
    label: string;
    format: (value: number) => string;
    higherIsBetter?: boolean;
}

/**
 * Get column configurations based on KPI type
 */
export const getNewAudienceColumns = (kpiType: KPIType): ColumnConfig[] => {
    const baseColumns: ColumnConfig[] = [
        { key: 'spend', label: 'Spend', format: formatCurrency, higherIsBetter: false }
    ];

    if (kpiType === 'ROI') {
        return [
            ...baseColumns,
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

    if (kpiType === 'CPC') {
        return [
            ...baseColumns,
            { key: 'cpc', label: 'CPC', format: formatCurrency, higherIsBetter: false },
            { key: 'cpm', label: 'CPM', format: formatCurrency, higherIsBetter: false },
            { key: 'ctr', label: 'CTR', format: formatPercent, higherIsBetter: true },
            { key: 'clicks', label: 'Clicks', format: formatNumber, higherIsBetter: true },
            { key: 'impressions', label: 'Impressions', format: formatNumber, higherIsBetter: true }
        ];
    }

    // CPM
    return [
        ...baseColumns,
        { key: 'cpm', label: 'CPM', format: formatCurrency, higherIsBetter: false },
        { key: 'reach', label: 'Reach', format: formatNumber, higherIsBetter: true },
        { key: 'impressions', label: 'Impressions', format: formatNumber, higherIsBetter: true },
        { key: 'frequency', label: 'Frequency', format: (v) => v.toFixed(2), higherIsBetter: false },
        { key: 'clicks', label: 'Clicks', format: formatNumber, higherIsBetter: true },
        { key: 'cpc', label: 'CPC', format: formatCurrency, higherIsBetter: false }
    ];
};

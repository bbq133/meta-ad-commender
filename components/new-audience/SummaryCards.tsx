import React from 'react';
import { NewAudienceAdSet } from '../../utils/newAudienceUtils';
import { KPIType } from '../../utils/newAudienceColumnConfig';
import { formatCurrency, formatNumber } from '../../utils/dataUtils';

interface SummaryCardsProps {
    adSets: NewAudienceAdSet[];
    kpiType: KPIType;
}

export const SummaryCards: React.FC<SummaryCardsProps> = ({ adSets, kpiType }) => {
    console.log('SummaryCards render - kpiType:', kpiType, 'adSets count:', adSets?.length);

    // Safety check
    if (!adSets || adSets.length === 0) {
        return (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
                        <div className="text-xs text-slate-500 mb-1 uppercase font-bold tracking-wider">-</div>
                        <div className="text-2xl font-black text-slate-900">0</div>
                    </div>
                ))}
            </div>
        );
    }

    // Calculate aggregate metrics
    const totalAdSets = adSets.length;
    const totalAds = adSets.reduce((sum, adSet) => sum + adSet.ads.length, 0);

    // Flatten records for easier calculation
    const allRecords = adSets.flatMap(adSet => adSet.records);

    const totalSpend = allRecords.reduce((sum, r) => sum + r.spend, 0);
    const totalRevenue = allRecords.reduce((sum, r) => sum + r.purchase_value, 0);
    const totalClicks = allRecords.reduce((sum, r) => sum + r.link_clicks, 0);
    const totalImpressions = allRecords.reduce((sum, r) => sum + r.impressions, 0);

    // Dynamic KPI Calculation
    let dynamicMetricLabel = '';
    let dynamicMetricValue = '';

    if (kpiType === 'ROI') {
        dynamicMetricLabel = 'Avg ROI';
        const roi = totalSpend > 0 ? totalRevenue / totalSpend : 0;
        dynamicMetricValue = `${roi.toFixed(2)}x`;
    } else if (kpiType === 'CPC') {
        dynamicMetricLabel = 'Avg CPC';
        const cpc = totalClicks > 0 ? totalSpend / totalClicks : 0;
        dynamicMetricValue = formatCurrency(cpc);
    } else if (kpiType === 'CPM') {
        dynamicMetricLabel = 'Avg CPM';
        const cpm = totalImpressions > 0 ? (totalSpend / totalImpressions) * 1000 : 0;
        dynamicMetricValue = formatCurrency(cpm);
    }

    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {/* New Ad Sets */}
            <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
                <div className="text-xs text-slate-500 mb-1 uppercase font-bold tracking-wider">New Ad Sets</div>
                <div className="text-2xl font-black text-slate-900">{formatNumber(totalAdSets)}</div>
            </div>

            {/* Active Ads */}
            <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
                <div className="text-xs text-slate-500 mb-1 uppercase font-bold tracking-wider">Active Ads</div>
                <div className="text-2xl font-black text-slate-900">{formatNumber(totalAds)}</div>
            </div>

            {/* Total Spend */}
            <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
                <div className="text-xs text-slate-500 mb-1 uppercase font-bold tracking-wider">Total Spend</div>
                <div className="text-2xl font-black text-slate-900">{formatCurrency(totalSpend)}</div>
            </div>

            {/* Dynamic Metric */}
            <div className="bg-indigo-50 rounded-xl p-4 border border-indigo-100 shadow-sm">
                <div className="text-xs text-indigo-600 mb-1 uppercase font-bold tracking-wider">{dynamicMetricLabel}</div>
                <div className="text-2xl font-black text-indigo-900">{dynamicMetricValue}</div>
            </div>
        </div>
    );
};

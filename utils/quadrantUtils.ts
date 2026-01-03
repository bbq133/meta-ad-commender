import { RawAdRecord, AdConfiguration } from '../types';

export type QuadrantType = 'excellent' | 'potential' | 'watch' | 'problem';

export interface QuadrantThresholds {
    spendThreshold: number;
    kpiThreshold: number;
}

export const calculateDefaultThresholds = (
    data: RawAdRecord[],
    config: AdConfiguration
): QuadrantThresholds => {
    // Group by campaign to get unique campaigns
    const campaignMap = new Map<string, RawAdRecord[]>();
    data.forEach(record => {
        const key = record.campaign_name;
        if (!campaignMap.has(key)) campaignMap.set(key, []);
        campaignMap.get(key)!.push(record);
    });

    // Calculate total spend for each campaign
    const campaignSpends = Array.from(campaignMap.values()).map(records =>
        records.reduce((sum, r) => sum + r.spend, 0)
    );

    // Calculate average spend across campaigns
    const avgSpend = campaignSpends.length > 0
        ? campaignSpends.reduce((sum, spend) => sum + spend, 0) / campaignSpends.length
        : 0;

    // Use target value as KPI threshold
    const kpiThreshold = config.targetValue;

    return {
        spendThreshold: avgSpend,
        kpiThreshold
    };
};

export const classifyQuadrant = (
    spend: number,
    kpi: number,
    thresholds: QuadrantThresholds,
    targetType: 'ROI' | 'CPC' | 'CPM'
): QuadrantType => {
    const { spendThreshold, kpiThreshold } = thresholds;

    // For ROI: higher is better
    if (targetType === 'ROI') {
        if (spend < spendThreshold && kpi >= kpiThreshold) return 'excellent';
        if (spend >= spendThreshold && kpi >= kpiThreshold) return 'potential';
        if (spend < spendThreshold && kpi < kpiThreshold) return 'watch';
        return 'problem';
    }

    // For CPC/CPM: lower is better (quadrants flipped)
    if (spend < spendThreshold && kpi <= kpiThreshold) return 'excellent';
    if (spend >= spendThreshold && kpi <= kpiThreshold) return 'potential';
    if (spend < spendThreshold && kpi > kpiThreshold) return 'watch';
    return 'problem';
};

export const getQuadrantInfo = (quadrant: QuadrantType) => {
    const quadrantMap = {
        excellent: {
            label: '优秀区',
            icon: '⭐',
            color: 'bg-green-100 text-green-700 border-green-300',
            description: '低花费 + 高效果'
        },
        potential: {
            label: '潜力区',
            icon: '🎯',
            color: 'bg-blue-100 text-blue-700 border-blue-300',
            description: '高花费 + 高效果'
        },
        watch: {
            label: '观察区',
            icon: '⚠️',
            color: 'bg-yellow-100 text-yellow-700 border-yellow-300',
            description: '低花费 + 低效果'
        },
        problem: {
            label: '问题区',
            icon: '❌',
            color: 'bg-red-100 text-red-700 border-red-300',
            description: '高花费 + 低效果'
        }
    };

    return quadrantMap[quadrant];
};

import { RawAdRecord } from '../types';

export interface NewAudienceAdSet {
    id: string;
    name: string;
    campaignName: string;
    campaignId: string;
    firstSpendDate: Date;
    durationDays: number;
    records: RawAdRecord[];
    ads: NewAudienceAd[];
}

export interface NewAudienceAd {
    id: string;
    name: string;
    durationDays: number;
    records: RawAdRecord[];
}

/**
 * Filter ad sets with continuous spend < 7 days using First Spend Date method
 * Only includes ad sets from business lines matching the specified KPI type
 * @param data - Raw ad records within the selected date range
 * @param endDate - End date of the selected range
 * @param configs - Business line configurations
 * @param kpiType - KPI type to filter by (ROI, CPC, or CPM)
 * @returns Array of new audience ad sets
 */
export const filterNewAudience = (
    data: RawAdRecord[],
    endDate: Date | string,
    configs: any[], // AdConfiguration[]
    kpiType: 'ROI' | 'CPC' | 'CPM'
): NewAudienceAdSet[] => {
    // Convert endDate to Date object if it's a string
    const endDateObj = typeof endDate === 'string' ? new Date(endDate) : endDate;

    // Filter configs by KPI type
    const matchingConfigs = configs.filter(config => config.targetType === kpiType);
    console.log(`Filtering for KPI: ${kpiType}, Found ${matchingConfigs.length} matching configs`);

    // Helper function to check if a record matches any of the configs
    const matchesAnyConfig = (record: RawAdRecord): boolean => {
        return matchingConfigs.some(config => {
            // Check if record matches the config's rules
            if (!config.rules || config.rules.length === 0) return false;

            const rulesLogic = config.rulesLogic || 'AND';
            const ruleResults = config.rules.map((rule: any) => {
                const recordValue = record[rule.field as keyof RawAdRecord];
                if (typeof recordValue === 'string') {
                    if (rule.operator === 'contains') return recordValue.includes(rule.value);
                    if (rule.operator === 'equals') return recordValue === rule.value;
                    if (rule.operator === 'startsWith') return recordValue.startsWith(rule.value);
                }
                return false;
            });

            return rulesLogic === 'AND'
                ? ruleResults.every(r => r)
                : ruleResults.some(r => r);
        });
    };

    // Group by Ad Set
    const adSetMap = new Map<string, RawAdRecord[]>();

    data.forEach(record => {
        // Only include records that match the KPI type configs
        if (matchesAnyConfig(record)) {
            if (!adSetMap.has(record.adset_name)) {
                adSetMap.set(record.adset_name, []);
            }
            adSetMap.get(record.adset_name)!.push(record);
        }
    });

    console.log(`After config filtering: ${adSetMap.size} ad sets`);

    const newAdSets: NewAudienceAdSet[] = [];

    // Process each Ad Set
    adSetMap.forEach((records, adSetName) => {
        // Sort records by date ascending
        const sortedRecords = [...records].sort((a, b) =>
            new Date(a.date).getTime() - new Date(b.date).getTime()
        );

        let firstSpendDate: Date | null = null;
        let campaignName = '';

        // Find the earliest date with spend > 0
        for (const record of sortedRecords) {
            if (record.spend > 0) {
                if (!firstSpendDate) {
                    firstSpendDate = new Date(record.date);
                    campaignName = record.campaign_name;
                }
            }
        }

        if (firstSpendDate) {
            // Calculate duration: (EndDate - FirstSpendDate) + 1
            const diffTime = endDateObj.getTime() - firstSpendDate.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

            // Only include if duration < 7 days
            if (diffDays < 7) {
                // Group ads within this adset
                const adMap = new Map<string, RawAdRecord[]>();
                records.forEach(r => {
                    if (!adMap.has(r.ad_name)) adMap.set(r.ad_name, []);
                    adMap.get(r.ad_name)!.push(r);
                });

                const ads: NewAudienceAd[] = [];
                adMap.forEach((adRecords, adName) => {
                    const sortedAdRecords = [...adRecords].sort((a, b) =>
                        new Date(a.date).getTime() - new Date(b.date).getTime()
                    );

                    let adFirstSpend: Date | null = null;
                    for (const r of sortedAdRecords) {
                        if (r.spend > 0) {
                            adFirstSpend = new Date(r.date);
                            break;
                        }
                    }

                    let adDuration = 0;
                    if (adFirstSpend) {
                        const adDiff = endDateObj.getTime() - adFirstSpend.getTime();
                        adDuration = Math.ceil(adDiff / (1000 * 60 * 60 * 24)) + 1;
                    }

                    ads.push({
                        id: `ad-${adName}`,
                        name: adName,
                        durationDays: adDuration,
                        records: adRecords
                    });
                });

                newAdSets.push({
                    id: `adset-${adSetName}`,
                    name: adSetName,
                    campaignName,
                    campaignId: `campaign-${campaignName}`,
                    firstSpendDate,
                    durationDays: diffDays,
                    records,
                    ads
                });
            }
        }
    });

    console.log(`After < 7 days filtering: ${newAdSets.length} new ad sets`);

    // Sort by duration (newest first)
    return newAdSets.sort((a, b) => a.durationDays - b.durationDays);
};

import { AggregatedMetrics } from '../types';

// Campaign Benchmark 基准值接口
export interface CampaignBenchmarks {
    avgCpa: number;
    avgCpatc: number;
    avgCpc: number;
    avgCvr: number;
    avgCtr: number;
    avgCpm: number;
    avgAtcRate: number;
    avgCheckoutRate: number;
    avgPurchaseRate: number;
    avgClickToPvRate: number;
    avgRoi: number;
    avgAov: number;
    avgFrequency: number;
}

/**
 * 计算所有Campaign的基准值（平均值）
 * @param campaigns - Campaign数组，每个包含metrics
 * @returns 基准值对象
 */
export const calculateBenchmarks = (
    campaigns: Array<{ metrics: AggregatedMetrics }>
): CampaignBenchmarks => {
    const count = campaigns.length;

    // 如果没有Campaign，返回全0
    if (count === 0) {
        return {
            avgCpa: 0,
            avgCpatc: 0,
            avgCpc: 0,
            avgCvr: 0,
            avgCtr: 0,
            avgCpm: 0,
            avgAtcRate: 0,
            avgCheckoutRate: 0,
            avgPurchaseRate: 0,
            avgClickToPvRate: 0,
            avgRoi: 0,
            avgAov: 0,
            avgFrequency: 0,
        };
    }

    // 计算各指标的总和
    const sums = campaigns.reduce((acc, campaign) => {
        const m = campaign.metrics;
        return {
            cpa: acc.cpa + (m.cpa || 0),
            cpatc: acc.cpatc + (m.cpatc || 0),
            cpc: acc.cpc + (m.cpc || 0),
            cvr: acc.cvr + (m.cvr || 0),
            ctr: acc.ctr + (m.ctr || 0),
            cpm: acc.cpm + (m.cpm || 0),
            atcRate: acc.atcRate + (m.atc_rate || 0),
            checkoutRate: acc.checkoutRate + (m.checkout_rate || 0),
            purchaseRate: acc.purchaseRate + (m.purchase_rate || 0),
            clickToPvRate: acc.clickToPvRate + (m.click_to_pv_rate || 0),
            roi: acc.roi + (m.roi || 0),
            aov: acc.aov + (m.aov || 0),
            frequency: acc.frequency + (m.frequency || 0),
        };
    }, {
        cpa: 0,
        cpatc: 0,
        cpc: 0,
        cvr: 0,
        ctr: 0,
        cpm: 0,
        atcRate: 0,
        checkoutRate: 0,
        purchaseRate: 0,
        clickToPvRate: 0,
        roi: 0,
        aov: 0,
        frequency: 0,
    });

    // 计算平均值
    return {
        avgCpa: sums.cpa / count,
        avgCpatc: sums.cpatc / count,
        avgCpc: sums.cpc / count,
        avgCvr: sums.cvr / count,
        avgCtr: sums.ctr / count,
        avgCpm: sums.cpm / count,
        avgAtcRate: sums.atcRate / count,
        avgCheckoutRate: sums.checkoutRate / count,
        avgPurchaseRate: sums.purchaseRate / count,
        avgClickToPvRate: sums.clickToPvRate / count,
        avgRoi: sums.roi / count,
        avgAov: sums.aov / count,
        avgFrequency: sums.frequency / count,
    };
};

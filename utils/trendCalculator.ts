/**
 * 趋势计算工具 - 计算 L3D 和 L7D ROI
 */

import { RawAdRecord } from '../types';

/**
 * 根据日期范围过滤并计算 ROI
 * @param data - 原始广告数据
 * @param startDate - 开始日期 (YYYY-MM-DD)
 * @param endDate - 结束日期 (YYYY-MM-DD)
 * @param campaignName - Campaign 名称（用于过滤）
 * @returns 计算的 ROI 值
 */
export const calculateROIByDateRange = (
    data: RawAdRecord[],
    startDate: string,
    endDate: string,
    campaignName: string
): number => {
    // 过滤指定日期范围和 Campaign 的数据
    const filteredData = data.filter(record => {
        const recordDate = record.date;
        if (!recordDate) return false;

        // 转换日期格式进行比较
        const recordDateStr = typeof recordDate === 'string'
            ? recordDate.split(' ')[0] // 处理 "YYYY-MM-DD HH:mm:ss" 格式
            : String(recordDate);

        const isInDateRange = recordDateStr >= startDate && recordDateStr <= endDate;
        const isSameCampaign = record.campaign_name === campaignName;

        return isInDateRange && isSameCampaign;
    });

    if (filteredData.length === 0) return 0;

    // 聚合数据计算 ROI
    const totals = filteredData.reduce((acc, record) => {
        const spend = record.spend || 0;
        const value = record.purchase_value || 0;

        return {
            spend: acc.spend + spend,
            value: acc.value + value
        };
    }, { spend: 0, value: 0 });

    // ROI = Value / Spend
    return totals.spend > 0 ? totals.value / totals.spend : 0;
};

/**
 * 计算日期字符串的偏移
 * @param dateStr - 日期字符串 (YYYY-MM-DD)
 * @param days - 偏移天数（负数为往前推）
 * @returns 新的日期字符串
 */
export const offsetDate = (dateStr: string, days: number): string => {
    const date = new Date(dateStr);
    date.setDate(date.getDate() + days);
    return date.toISOString().split('T')[0];
};

/**
 * 计算 L3D 和 L7D ROI
 * @param data - 原始广告数据
 * @param endDate - 日期范围的结束日期
 * @param campaignName - Campaign 名称
 * @returns { l3dROI, l7dROI }
 */
export const calculateL3DL7DROI = (
    data: RawAdRecord[],
    endDate: string,
    campaignName: string
): { l3dROI: number; l7dROI: number } => {
    // L3D: 从结束日期往前推 3 天（包含结束日期）
    const l3dStartDate = offsetDate(endDate, -2); // -2 因为包含结束日期共 3 天
    const l3dROI = calculateROIByDateRange(data, l3dStartDate, endDate, campaignName);

    // L7D: 从结束日期往前推 7 天（包含结束日期）
    const l7dStartDate = offsetDate(endDate, -6); // -6 因为包含结束日期共 7 天
    const l7dROI = calculateROIByDateRange(data, l7dStartDate, endDate, campaignName);

    return { l3dROI, l7dROI };
};

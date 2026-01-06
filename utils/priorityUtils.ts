// Priority type definition
export type Priority = 'P0' | 'P1' | null;

/**
 * Calculate benchmark ROI for a business line
 * Benchmark = Total Revenue / Total Spend (weighted average)
 */
export function calculateBenchmarkROI(
    campaigns: Array<{ revenue: number; spend: number }>
): number {
    const totalRevenue = campaigns.reduce((sum, c) => sum + (c.revenue || 0), 0);
    const totalSpend = campaigns.reduce((sum, c) => sum + (c.spend || 0), 0);

    if (totalSpend === 0) return 0;
    return totalRevenue / totalSpend;
}

/**
 * Calculate priority for a campaign based on ROI vs Benchmark
 * P0: ROI < Benchmark * 0.8 (低于基准 20% 以上)
 * P1: Benchmark * 0.8 <= ROI < Benchmark (低于基准 0-20%)
 * null: ROI >= Benchmark or non-ROI type
 */
export function calculatePriority(
    actualROI: number,
    benchmarkROI: number,
    kpiType: string
): Priority {
    // Only calculate priority for ROI type campaigns
    if (kpiType !== 'ROI') return null;

    // If benchmark is 0 or invalid, cannot calculate priority
    if (!benchmarkROI || benchmarkROI <= 0) return null;

    // Calculate the threshold for P0 (80% of benchmark)
    const p0Threshold = benchmarkROI * 0.8;

    if (actualROI < p0Threshold) {
        return 'P0';  // 紧急：低于基准 20% 以上
    } else if (actualROI < benchmarkROI) {
        return 'P1';  // 高优先级：低于基准 0-20%
    } else {
        return null;  // 正常或优秀表现
    }
}

/**
 * Get priority display text and styling
 */
export function getPriorityDisplay(priority: Priority): {
    text: string;
    className: string;
    emoji: string;
} {
    switch (priority) {
        case 'P0':
            return {
                text: 'P0',
                className: 'text-red-600 font-bold text-sm',
                emoji: '🔴'
            };
        case 'P1':
            return {
                text: 'P1',
                className: 'text-amber-600 font-bold text-sm',
                emoji: '🟡'
            };
        default:
            return {
                text: '-',
                className: 'text-gray-400 text-sm',
                emoji: ''
            };
    }
}

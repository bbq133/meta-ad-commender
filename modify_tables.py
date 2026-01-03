#!/usr/bin/env python3
"""
脚本用于改造Ad表格的tbody
"""

import sys

file_path = '/Users/mac/AI code/antigravity/meta-广告action分析系统-参考版/components/tabs/ActionItemsTab.tsx'

# 读取文件
with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# ========== Ad 表格改造 ==========
print("正在查找Ad表格...")
ad_start = None
ad_end = None

for i, line in enumerate(lines):
    if '<tbody>' in line and 750 < i < 900:  # Ad表格在后面
        # 检查后续是否有 filteredBlResult.ads
        if i + 1 < len(lines) and 'filteredBlResult.ads.map' in lines[i + 1]:
            ad_start = i
    if ad_start is not None and '</tbody>' in line and i < ad_start + 50:
        ad_end = i
        break

if ad_start is None or ad_end is None:
    print(f"❌ 未找到Ad tbody (start={ad_start}, end={ad_end})")
    sys.exit(1)

print(f"✅ 找到Ad tbody: 行 {ad_start+1} 到 {ad_end+1}")

# Ad tbody的新代码
ad_tbody_lines = [
    '                                            <tbody>\n',
    '                                                {filteredBlResult.ads.map(ad => {\n',
    '                                                    const isExpanded = blExpandedGuidance.has(ad.id);\n',
    '                                                    \n',
    '                                                    const metrics: CampaignMetrics = {\n',
    '                                                        spend: ad.spend,\n',
    '                                                        roi: ad.kpiType === \'ROI\' ? ad.actualValue : undefined,\n',
    '                                                        cpc: ad.kpiType === \'CPC\' ? ad.actualValue : undefined,\n',
    '                                                        cpm: ad.kpiType === \'CPM\' ? ad.actualValue : undefined,\n',
    '                                                    };\n',
    '                                                    \n',
    '                                                    const avgMetrics: CampaignMetrics = {\n',
    '                                                        spend: ad.avgSpend,\n',
    '                                                        roi: ad.kpiType === \'ROI\' ? ad.avgValue : undefined,\n',
    '                                                        cpc: ad.kpiType === \'CPC\' ? ad.avgValue : undefined,\n',
    '                                                        cpm: ad.kpiType === \'CPM\' ? ad.avgValue : undefined,\n',
    '                                                    };\n',
    '                                                    \n',
    '                                                    const guidance = getOptimizationGuidance(\'Ad\', ad.kpiType, metrics, avgMetrics);\n',
    '                                                    \n',
    '                                                    return (\n',
    '                                                        <React.Fragment key={ad.id}>\n',
    '                                                            <tr className="border-b hover:bg-slate-50 transition-all">\n',
    '                                                                <td className="px-4 py-3 font-medium text-slate-900">{ad.adName}</td>\n',
    '                                                                <td className="px-4 py-3 text-slate-600">{ad.adSetName}</td>\n',
    '                                                                <td className="px-4 py-3 text-slate-600">{ad.campaignName}</td>\n',
    '                                                                <td className="px-4 py-3 text-slate-600">{ad.businessLine}</td>\n',
    '                                                                <td className="px-4 py-3">\n',
    '                                                                    <SpendDetailCell\n',
    '                                                                        spend={ad.spend}\n',
    '                                                                        avgSpend={ad.avgSpend}\n',
    '                                                                        lastSpend={ad.lastSpend}\n',
    '                                                                    />\n',
    '                                                                </td>\n',
    '                                                                <td className="px-4 py-3">\n',
    '                                                                    <KPIBadgeWithTarget\n',
    '                                                                        kpiType={ad.kpiType}\n',
    '                                                                        targetValue={ad.targetValue}\n',
    '                                                                    />\n',
    '                                                                </td>\n',
    '                                                                <td className="px-4 py-3">\n',
    '                                                                    <KPIValueCell\n',
    '                                                                        actualValue={ad.actualValue}\n',
    '                                                                        avgValue={ad.avgValue}\n',
    '                                                                        lastValue={ad.lastValue}\n',
    '                                                                        kpiType={ad.kpiType}\n',
    '                                                                    />\n',
    '                                                                </td>\n',
    '                                                                \n',
    '                                                                <td className="px-4 py-3">\n',
    '                                                                    <button\n',
    '                                                                        onClick={() => toggleGuidance(blExpandedGuidance, setBlExpandedGuidance, ad.id)}\n',
    '                                                                        className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-slate-100 transition-colors"\n',
    '                                                                    >\n',
    '                                                                        {getPriorityIcon(guidance)}\n',
    '                                                                        {isExpanded ? (\n',
    '                                                                            <ChevronDown className="w-4 h-4 text-slate-500" />\n',
    '                                                                        ) : (\n',
    '                                                                            <ChevronRight className="w-4 h-4 text-slate-500" />\n',
    '                                                                        )}\n',
    '                                                                    </button>\n',
    '                                                                </td>\n',
    '                                                                \n',
    '                                                                <td className="px-4 py-3">\n',
    '                                                                    <button\n',
    '                                                                        onClick={() => handleBlRemove(ad.id)}\n',
    '                                                                        className="p-2 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-lg transition-all"\n',
    '                                                                    >\n',
    '                                                                        <Trash2 className="w-4 h-4" />\n',
    '                                                                    </button>\n',
    '                                                                </td>\n',
    '                                                            </tr>\n',
    '                                                            \n',
    '                                                            {isExpanded && (\n',
    '                                                                <tr className="bg-slate-50 border-b border-slate-200">\n',
    '                                                                    <td colSpan={9} className="px-4 py-4">\n',
    '                                                                        <div className="ml-8 space-y-3 max-w-4xl">\n',
    '                                                                            <GuidanceDetailPanel\n',
    '                                                                                guidance={guidance}\n',
    '                                                                                metrics={metrics}\n',
    '                                                                                avgMetrics={avgMetrics}\n',
    '                                                                                kpiType={ad.kpiType}\n',
    '                                                                            />\n',
    '                                                                        </div>\n',
    '                                                                    </td>\n',
    '                                                                </tr>\n',
    '                                                            )}\n',
    '                                                        </React.Fragment>\n',
    '                                                    );\n',
    '                                                })}\n',
    '                                            </tbody>\n',
]

# 替换Ad
new_lines = lines[:ad_start] + ad_tbody_lines + lines[ad_end+1:]

# 写回文件
with open(file_path, 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print(f"✅ Ad表格tbody改造成功！")
print("✅ 所有三个表格改造完成！")

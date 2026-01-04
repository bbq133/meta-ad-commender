#!/usr/bin/env python3
"""
重新组织调优建议区域的布局
"""

import re

file_path = "/Users/mac/AI code/Meta ad action调优系统/components/tabs/GuidanceHelpers.tsx"

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 找到并替换整个第4行区域
old_section = r'''            {/\* 第4行：调优建议详情（紧凑单行） \*/}
            <div className="text-sm font-medium text-slate-700 mb-2">调优建议</div>
            <div className="text-sm leading-relaxed space-x-2 flex flex-wrap items-center gap-y-1">
                {/\* 优先级 \*/}
                <span className="inline-flex items-center gap-1">
                    <span className="font-medium text-slate-600">🎯</span>
                    {getPriorityBadge\(guidance\)}
                </span>

                {/\* 分隔符 \*/}
                <span className="text-slate-300">\|</span>

                {/\* 触发条件 \*/}
                {conditions\.length > 0 && \(
                    <>
                        <span className="font-medium text-slate-600">📊</span>
                        <div className="inline-flex flex-wrap gap-1">
                            {conditions\.map\(\(cond, idx\) => \(
                                <React\.Fragment key={idx}>
                                    <span className="px-1\.5 py-0\.5 bg-slate-200 text-slate-700 rounded text-xs">
                                        {cond}
                                    </span>
                                    {idx < conditions\.length - 1 && <span className="text-slate-400">\|</span>}
                                </React\.Fragment>
                            \)\)}
                        </div>
                        <span className="text-slate-300">\|</span>
                    </>
                \)}


                {/\* 建议动作 - 每个场景换行显示 \*/}
                <span className="inline-flex items-start gap-1">
                    <span className="font-medium text-slate-600">📋</span>
                    <span className="font-medium text-slate-900 whitespace-pre-line">{guidance}</span>
                </span>
            </div>'''

new_section = '''            {/* 第4行：不合格指标 */}
            <div className="mb-3">
                <div className="text-sm font-medium text-slate-700 mb-2">不合格指标</div>
                <div className="text-sm leading-relaxed space-x-2 flex flex-wrap items-center gap-y-1">
                    {/* 优先级 */}
                    <span className="inline-flex items-center gap-1">
                        {getPriorityBadge(guidance)}
                    </span>

                    {/* 触发条件 */}
                    {conditions.length > 0 && (
                        <>
                            <span className="text-slate-300">|</span>
                            <span className="font-medium text-slate-600">📊</span>
                            <div className="inline-flex flex-wrap gap-1">
                                {conditions.map((cond, idx) => (
                                    <React.Fragment key={idx}>
                                        <span className="px-1.5 py-0.5 bg-slate-200 text-slate-700 rounded text-xs">
                                            {cond}
                                        </span>
                                        {idx < conditions.length - 1 && <span className="text-slate-400">|</span>}
                                    </React.Fragment>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* 第5行：调优建议 */}
            <div>
                <div className="text-sm font-medium text-slate-700 mb-2">调优建议</div>
                <div className="text-sm leading-relaxed">
                    <span className="font-medium text-slate-900 whitespace-pre-line">{guidance}</span>
                </div>
            </div>'''

content = re.sub(old_section, new_section, content, flags=re.DOTALL)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("✅ Successfully reorganized guidance section")
print("   - Section 1: 不合格指标 (priority + conditions)")
print("   - Section 2: 调优建议 (detailed guidance)")

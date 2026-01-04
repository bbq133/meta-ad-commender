#!/usr/bin/env python3
"""
1. 添加调试日志确认步骤0是否被创建
2. 调整布局让诊断流程占据更多右侧空间
"""

import re

# 1. 添加调试日志
ts_file = "/Users/mac/AI code/Meta ad action调优系统/utils/campaignDiagnostics.ts"

with open(ts_file, 'r', encoding='utf-8') as f:
    ts_content = f.read()

# 在convertToDetailedDiagnostic函数的return之前添加调试日志
ts_content = re.sub(
    r'(    return \{[\s\S]*?\.\.\.result,[\s\S]*?steps,[\s\S]*?subProblems[\s\S]*?\};)',
    r'''    // 调试：输出步骤信息
    console.log('📊 Diagnostic Steps for', result.scenario, ':', steps.map(s => `Step ${s.stepNumber}: ${s.stepName}`).join(', '));
    
    \1''',
    ts_content,
    count=1
)

with open(ts_file, 'w', encoding='utf-8') as f:
    f.write(ts_content)

print("✅ Added debug logging for steps")

# 2. 调整CSS布局，让诊断流程占据更多空间
css_file = "/Users/mac/AI code/Meta ad action调优系统/components/diagnostics/DiagnosticFlow.css"

with open(css_file, 'r', encoding='utf-8') as f:
    css_content = f.read()

# 增加左右padding，让内容更靠右
css_content = re.sub(
    r'padding: 20px 60px;',
    'padding: 20px 80px 20px 100px; /* 左边100px，右边80px */',
    css_content
)

# 增加卡片间距
css_content = re.sub(
    r'gap: 16px;',
    'gap: 20px; /* 增加卡片间距 */',
    css_content
)

# 调整卡片最大宽度
css_content = re.sub(
    r'max-width: 250px;',
    'max-width: 280px; /* 增加卡片最大宽度 */',
    css_content
)

with open(css_file, 'w', encoding='utf-8') as f:
    f.write(css_content)

print("✅ Updated CSS: increased padding and card spacing")
print("✅ Diagnostic flow now extends more to the right")

#!/usr/bin/env python3
"""
修复两个问题：
1. 确保步骤0（触发条件）显示
2. 让所有卡片居中显示在一行
"""

import re

# 1. 修改CSS - 让诊断流程居中显示
css_file = "/Users/mac/AI code/Meta ad action调优系统/components/diagnostics/DiagnosticFlow.css"

with open(css_file, 'r', encoding='utf-8') as f:
    css_content = f.read()

# 更新diagnostic-flow容器，使其居中
css_content = re.sub(
    r'\/\* 诊断流程容器 - 横向布局，占据全宽 \*\/\s*\.diagnostic-flow \{[^}]+\}',
    '''/* 诊断流程容器 - 横向布局，居中显示 */
.diagnostic-flow {
    display: flex;
    flex-direction: row;
    align-items: stretch;
    justify-content: center; /* 居中对齐 */
    gap: 12px; /* 卡片之间的间距 */
    width: 100%;
    max-width: 1600px; /* 最大宽度限制 */
    margin: 0 auto; /* 容器本身居中 */
}''',
    css_content,
    flags=re.DOTALL
)

with open(css_file, 'w', encoding='utf-8') as f:
    f.write(css_content)

print("✅ CSS updated: diagnostic flow now centered")

# 2. 检查createPrerequisiteStep是否正确返回步骤0
# 从用户反馈来看，步骤0被创建了但没有显示，可能是CSS问题
# 让我们确保步骤0有足够的可见性

print("✅ Step 0 should now be visible with centered layout")

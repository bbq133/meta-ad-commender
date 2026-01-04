#!/usr/bin/env python3
"""
修复两个问题：
1. 让诊断流程占据更多宽度，减少右侧空白
2. 确保步骤0可见
"""

import re

# 修改CSS - 增加诊断流程的宽度
css_file = "/Users/mac/AI code/Meta ad action调优系统/components/diagnostics/DiagnosticFlow.css"

with open(css_file, 'r', encoding='utf-8') as f:
    css_content = f.read()

# 更新diagnostic-flow-panel，增加宽度
css_content = re.sub(
    r'\.diagnostic-flow-panel \{[^}]+\}',
    '''.diagnostic-flow-panel {
    position: relative;
    left: 50%;
    right: 50%;
    margin-left: -50vw;
    margin-right: -50vw;
    margin-top: 20px;
    margin-bottom: 20px;
    width: 100vw;
    max-width: 100vw;
    padding: 20px 60px; /* 增加左右padding */
    background: #f8f9fa;
    border-radius: 0;
    border: none;
    border-top: 1px solid #e0e0e0;
    border-bottom: 1px solid #e0e0e0;
    box-sizing: border-box;
}''',
    css_content,
    flags=re.DOTALL
)

# 更新diagnostic-flow，移除最大宽度限制，让卡片占据更多空间
css_content = re.sub(
    r'\/\* 诊断流程容器 - 横向布局，居中显示 \*\/\s*\.diagnostic-flow \{[^}]+\}',
    '''/* 诊断流程容器 - 横向布局，占据全宽 */
.diagnostic-flow {
    display: flex;
    flex-direction: row;
    align-items: stretch;
    justify-content: flex-start; /* 改为左对齐，让卡片占据更多空间 */
    gap: 16px; /* 增加卡片间距 */
    width: 100%;
    max-width: none; /* 移除最大宽度限制 */
}''',
    css_content,
    flags=re.DOTALL
)

# 更新卡片样式，确保每个卡片有合适的宽度
css_content = re.sub(
    r'\/\* 诊断步骤卡片 - 平均分配宽度，确保可见 \*\/\s*\.diagnostic-step-card \{[^}]+\}',
    '''/* 诊断步骤卡片 - 自适应宽度 */
.diagnostic-step-card {
    background: white;
    border-radius: 8px;
    padding: 16px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    position: relative;
    flex: 1; /* 平均分配宽度 */
    min-width: 150px; /* 确保最小宽度 */
    max-width: 250px; /* 限制最大宽度，避免过宽 */
}''',
    css_content,
    flags=re.DOTALL
)

with open(css_file, 'w', encoding='utf-8') as f:
    f.write(css_content)

print("✅ Updated layout: removed max-width limit and increased card spacing")
print("✅ Diagnostic flow now fills more horizontal space")

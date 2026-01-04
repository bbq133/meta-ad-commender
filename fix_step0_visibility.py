#!/usr/bin/env python3
"""
修复触发条件显示问题：
1. 确保步骤0可见
2. 调整布局使触发条件与场景名称对齐
"""

import re

# 修改DiagnosticFlow.css
css_file = "/Users/mac/AI code/Meta ad action调优系统/components/diagnostics/DiagnosticFlow.css"

with open(css_file, 'r', encoding='utf-8') as f:
    css_content = f.read()

# 确保诊断步骤卡片有合适的最小宽度，避免被挤压
css_content = re.sub(
    r'\/\* 诊断步骤卡片 - 平均分配宽度 \*\/\s*\.diagnostic-step-card \{[^}]+\}',
    '''/* 诊断步骤卡片 - 平均分配宽度，确保可见 */
.diagnostic-step-card {
    background: white;
    border-radius: 8px;
    padding: 16px 12px; /* 减少左右padding以容纳更多内容 */
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    position: relative;
    flex: 1; /* 平均分配宽度 */
    min-width: 140px; /* 确保最小宽度，避免内容被挤压 */
    max-width: none; /* 移除最大宽度限制 */
}''',
    css_content,
    flags=re.DOTALL
)

# 调整步骤头部样式，使其更紧凑
css_content = re.sub(
    r'\/\* 步骤头部 - 紧凑样式 \*\/\s*\.step-header \{[^}]+\}',
    '''/* 步骤头部 - 紧凑样式 */
.step-header {
    display: flex;
    flex-direction: column;
    gap: 4px;
    margin-bottom: 8px;
    padding-bottom: 6px;
    border-bottom: 2px solid #e0e0e0;
    min-height: 60px; /* 确保所有步骤头部高度一致，实现对齐 */
}''',
    css_content,
    flags=re.DOTALL
)

# 调整步骤名称样式
css_content = re.sub(
    r'\.step-name \{[^}]+\}',
    '''.step-name {
    font-size: 13px;
    font-weight: 600;
    color: #333;
    line-height: 1.3;
    min-height: 36px; /* 确保名称区域高度一致 */
    display: flex;
    align-items: center;
}''',
    css_content,
    flags=re.DOTALL,
    count=1
)

with open(css_file, 'w', encoding='utf-8') as f:
    f.write(css_content)

print("Successfully fixed step 0 visibility and alignment")

#!/usr/bin/env python3
"""
使用方案A：绝对定位让诊断流程面板占据全屏宽度
"""

import re

file_path = "/Users/mac/AI code/Meta ad action调优系统/components/diagnostics/DiagnosticFlow.css"

# Read the file
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Update diagnostic-flow-panel to full viewport width
content = re.sub(
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
    padding: 20px 40px; /* 左右增加padding避免贴边 */
    background: #f8f9fa;
    border-radius: 0; /* 全宽时移除圆角 */
    border: none;
    border-top: 1px solid #e0e0e0;
    border-bottom: 1px solid #e0e0e0;
    box-sizing: border-box;
}''',
    content,
    flags=re.DOTALL
)

# Update diagnostic-flow to remove scroll and let cards distribute evenly
content = re.sub(
    r'\/\* 诊断流程容器 - 横向布局，自动适应宽度 \*\/\s*\.diagnostic-flow \{[^}]+\}',
    '''/* 诊断流程容器 - 横向布局，占据全宽 */
.diagnostic-flow {
    display: flex;
    flex-direction: row;
    align-items: stretch;
    gap: 12px; /* 卡片之间的间距 */
    width: 100%;
    max-width: 1600px; /* 最大宽度限制，避免超宽屏幕上卡片过宽 */
    margin: 0 auto; /* 居中显示 */
}''',
    content,
    flags=re.DOTALL
)

# Update diagnostic-step-card to distribute evenly
content = re.sub(
    r'\/\* 诊断步骤卡片 - 增加最小宽度 \*\/\s*\.diagnostic-step-card \{[^}]+\}',
    '''/* 诊断步骤卡片 - 平均分配宽度 */
.diagnostic-step-card {
    background: white;
    border-radius: 8px;
    padding: 16px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    position: relative;
    flex: 1; /* 平均分配宽度 */
    min-width: 0; /* 允许flex收缩 */
}''',
    content,
    flags=re.DOTALL
)

# Remove step-connector width since we now have gap
content = re.sub(
    r'\.step-connector \{[^}]+\}',
    '''/* 步骤连接线已由gap替代，保留用于响应式 */
.step-connector {
    display: none; /* 使用gap代替连接线 */
}''',
    content,
    flags=re.DOTALL,
    count=1
)

# Write back
with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Successfully applied full-width layout to diagnostic flow panel")

#!/usr/bin/env python3
"""
调整诊断流程布局，让卡片向右扩展填满空间
"""

import re

css_file = "/Users/mac/AI code/Meta ad action调优系统/components/diagnostics/DiagnosticFlow.css"

with open(css_file, 'r', encoding='utf-8') as f:
    css_content = f.read()

# 1. 减少右侧padding，只保留15px
css_content = re.sub(
    r'padding: 20px 80px 20px 100px;[^;]*',
    'padding: 20px 15px 20px 20px;',
    css_content
)

# 2. 移除卡片的最大宽度限制，让卡片自由扩展
css_content = re.sub(
    r'max-width: 280px;[^;]*',
    'max-width: none;',
    css_content
)

# 3. 增加卡片的最小宽度
css_content = re.sub(
    r'min-width: 150px;',
    'min-width: 120px;',
    css_content
)

with open(css_file, 'w', encoding='utf-8') as f:
    f.write(css_content)

print("✅ Updated CSS:")
print("   - Right padding: 15px")
print("   - Left padding: 20px")
print("   - Removed max-width limit on cards")
print("   - Cards will now fill available space")

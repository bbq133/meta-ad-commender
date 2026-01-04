#!/usr/bin/env python3
"""
修复DiagnosticStepCard的步骤类型映射
"""

import re

file_path = "/Users/mac/AI code/Meta ad action调优系统/components/diagnostics/DiagnosticStepCard.tsx"

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 替换getStepClass函数
old_function = r'''    // 根据步骤类型确定样式类
    const getStepClass = \(\) => \{
        if \(stepNumber === 0\) return 'step-prerequisite';
        if \(stepNumber === 1\) return 'step-scenario';
        if \(stepNumber === 2\) return 'step-drilldown';
        if \(stepNumber === 3\) return 'step-judgment';
        if \(stepNumber === 4\) return 'step-attribution';
        if \(stepNumber === 5\) return 'step-action';
        return '';
    \};'''

new_function = '''    // 根据步骤类型确定样式类（6步结构）
    const getStepClass = () => {
        if (stepNumber === 0) return 'step-prerequisite';  // 触发条件
        if (stepNumber === 1) return 'step-scenario';      // 核心异常场景
        if (stepNumber === 2) return 'step-drilldown';     // 下钻检查指标
        if (stepNumber === 3) return 'step-formula';       // 公式
        if (stepNumber === 4) return 'step-judgment';      // 判定条件
        if (stepNumber === 5) return 'step-attribution';   // 归因诊断
        if (stepNumber === 6) return 'step-action';        // Action建议
        return '';
    };'''

content = re.sub(old_function, new_function, content, flags=re.DOTALL)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("✅ Updated DiagnosticStepCard step class mapping for 6-step structure")

#!/usr/bin/env python3
"""
Fix step ordering in DiagnosticFlowPanel.tsx
1. Add sorting to ensure steps display in correct order
2. Update actionStep lookup from stepNumber 5 to 6
"""

import re

file_path = "/Users/mac/AI code/Meta ad action调优系统/components/diagnostics/DiagnosticFlowPanel.tsx"

# Read the file
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Fix 1: Add sorting in renderNormalFlow
old_normal_flow = r'''    // 渲染普通步骤流程
    const renderNormalFlow = \(\) => \{
        return \(
            <div className="diagnostic-flow">
                \{steps\.map\(\(step, index\) => \(
                    <DiagnosticStepCard
                        key=\{`step-\$\{step\.stepNumber\}-\$\{index\}`\}
                        step=\{step\}
                        isLast=\{index === steps\.length - 1\}
                    />
                \)\)\}
            </div>
        \);
    \};'''

new_normal_flow = '''    // 渲染普通步骤流程
    const renderNormalFlow = () => {
        // 确保步骤按stepNumber排序
        const sortedSteps = [...steps].sort((a, b) => a.stepNumber - b.stepNumber);
        
        return (
            <div className="diagnostic-flow">
                {sortedSteps.map((step, index) => (
                    <DiagnosticStepCard
                        key={`step-${step.stepNumber}-${index}`}
                        step={step}
                        isLast={index === sortedSteps.length - 1}
                    />
                ))}
            </div>
        );
    };'''

content = re.sub(old_normal_flow, new_normal_flow, content, flags=re.DOTALL)

# Fix 2: Update actionStep lookup from 5 to 6
content = re.sub(
    r'const actionStep = steps\.find\(s => s\.stepNumber === 5\);',
    'const actionStep = steps.find(s => s.stepNumber === 6);',
    content
)

# Write back
with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Successfully fixed step ordering in DiagnosticFlowPanel.tsx")

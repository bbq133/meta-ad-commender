#!/usr/bin/env python3
"""
Script to add step 3 (Formula) to createCPCDrillDownSteps and createCPATCDrillDownSteps
and renumber subsequent steps
"""

import re

file_path = "/Users/mac/AI code/Meta ad action调优系统/utils/campaignDiagnostics.ts"

# Read the file
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# For CPC: Split metric and formula, add step 3, renumber 3→4, 4→5
# Find the CPC function and modify it
cpc_old = r'''            content: \{
                metric: 'CPC',
                formula: 'Spend / Link Clicks',
                calculation: `\$\$\{.*?\}`
            \}
        \},
        \{
            stepNumber: 3,
            stepName: '判定条件','''

cpc_new = '''            content: {
                metric: 'CPC'
            }
        },
        {
            stepNumber: 3,
            stepName: '公式',
            icon: '📐',
            content: {
                formula: 'CPC = Spend / Link Clicks',
                calculation: `$${(metrics.spend || 0).toFixed(2)} / ${metrics.link_clicks || 0} = $${(metrics.cpc || 0).toFixed(2)}`
            }
        },
        {
            stepNumber: 4,
            stepName: '判定条件','''

content = re.sub(cpc_old, cpc_new, content, flags=re.DOTALL)

# Renumber step 4 to 5 in CPC function (归因诊断)
content = re.sub(
    r'(function createCPCDrillDownSteps.*?stepNumber: 4,\s+stepName: .归因诊断.)',
    lambda m: m.group(0).replace('stepNumber: 4,', 'stepNumber: 5,'),
    content,
    flags=re.DOTALL,
    count=1
)

# For CPATC: Split metric and formula, add step 3, renumber 3→4, 4→5
cpatc_old = r'''            content: \{
                metric: 'CPATC',
                formula: 'Spend / Add to Carts',
                calculation: `\$\$\{.*?\}`
            \}
        \},
        \{
            stepNumber: 3,
            stepName: '判定条件','''

cpatc_new = '''            content: {
                metric: 'CPATC'
            }
        },
        {
            stepNumber: 3,
            stepName: '公式',
            icon: '📐',
            content: {
                formula: 'CPATC = Spend / Add to Carts',
                calculation: `$${(metrics.spend || 0).toFixed(2)} / ${metrics.adds_to_cart || 0} = $${(metrics.cpatc || 0).toFixed(2)}`
            }
        },
        {
            stepNumber: 4,
            stepName: '判定条件','''

content = re.sub(cpatc_old, cpatc_new, content, flags=re.DOTALL)

# Renumber step 4 to 5 in CPATC function (归因诊断)
content = re.sub(
    r'(function createCPATCDrillDownSteps.*?stepNumber: 4,\s+stepName: .归因诊断.)',
    lambda m: m.group(0).replace('stepNumber: 4,', 'stepNumber: 5,'),
    content,
    flags=re.DOTALL,
    count=1
)

# Update condition text to match documentation
content = re.sub(r"condition: 'CPC > Benchmark × 1\.5'", "condition: 'CPC > Benchmark 50%'", content)
content = re.sub(r"condition: 'CPATC > Benchmark × 1\.5'", "condition: 'CPATC > Benchmark 50%'", content)

# Write back
with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Successfully added step 3 (Formula) and renumbered steps in CPC and CPATC functions")

#!/usr/bin/env python3
"""
Script to update createCPCDrillDownSteps and createCPATCDrillDownSteps functions
to add step 6 (Action建议)
"""

import re

file_path = "/Users/mac/AI code/Meta ad action调优系统/utils/campaignDiagnostics.ts"

# Read the file
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Pattern for createCPCDrillDownSteps function - add step 6
cpc_pattern = r'(function createCPCDrillDownSteps\([^)]+\): DiagnosticStep\[\] \{[\s\S]*?stepName: .归因诊断.[\s\S]*?\}[\s\n]+\}[\s\n]+)\];[\s\n]+\}'

# Replacement for CPC function
cpc_replacement = r'''\1,
        {
            stepNumber: 6,
            stepName: 'Action建议',
            icon: '💡',
            content: {
                actions: [
                    '1. 优化素材',
                    '2. 优化受众'
                ]
            }
        }
    ];
}'''

# Apply CPC replacement
content = re.sub(cpc_pattern, cpc_replacement, content, count=1)

# Pattern for createCPATCDrillDownSteps function - add step 6
cpatc_pattern = r'(function createCPATCDrillDownSteps\([^)]+\): DiagnosticStep\[\] \{[\s\S]*?stepName: .归因诊断.[\s\S]*?\}[\s\n]+\}[\s\n]+)\];[\s\n]+\}'

# Replacement for CPATC function
cpatc_replacement = r'''\1,
        {
            stepNumber: 6,
            stepName: 'Action建议',
            icon: '💡',
            content: {
                actions: [
                    '1. 优化素材KSP',
                    '2. 并非素材吸引力不够，而是产品不匹配，导致用户点击后不感兴趣'
                ]
            }
        }
    ];
}'''

# Apply CPATC replacement
content = re.sub(cpatc_pattern, cpatc_replacement, content, count=1)

# Write back
with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Successfully updated createCPCDrillDownSteps and createCPATCDrillDownSteps functions")

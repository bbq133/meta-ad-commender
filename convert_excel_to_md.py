import pandas as pd
import sys

# 读取 Excel 文件
file_path = 'Meta 转化广告调优逻辑- campaign层级.xlsx'

try:
    # 读取所有工作表
    excel_file = pd.ExcelFile(file_path)
    
    print(f"# Meta 转化广告调优逻辑 - Campaign 层级\n")
    
    for sheet_name in excel_file.sheet_names:
        print(f"\n## {sheet_name}\n")
        
        # 读取工作表
        df = pd.read_excel(file_path, sheet_name=sheet_name)
        
        # 转换为 Markdown 表格
        print(df.to_markdown(index=False))
        print("\n")
        
except Exception as e:
    print(f"Error: {e}")
    sys.exit(1)

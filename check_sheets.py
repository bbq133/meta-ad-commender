import pandas as pd

try:
    # 读取所有sheets
    xls = pd.ExcelFile('/Users/mac/AI code/Meta ad action调优系统/广告正式数据.xlsx')
    print("Sheet names:", xls.sheet_names)
    
    for sheet_name in xls.sheet_names:
        print(f"\nAnalyzing sheet: {sheet_name}")
        df = pd.read_excel(xls, sheet_name=sheet_name)
        print("Columns:", df.columns.tolist())
        
        # 模糊匹配
        lpv_cols = [c for c in df.columns if 'landing' in str(c).lower() and 'view' in str(c).lower()]
        if lpv_cols:
            print(f"  👉 Found LPV related columns: {lpv_cols}")
        else:
            print("  ❌ No LPV columns found")

except Exception as e:
    print(f"Error: {e}")

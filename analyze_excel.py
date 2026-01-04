import pandas as pd
import sys

# 设置显示选项
pd.set_option('display.max_columns', None)
pd.set_option('display.max_rows', None)
pd.set_option('display.width', 1000)

try:
    file_path = '/Users/mac/AI code/Meta ad action调优系统/CV-Report-Nico_12.xlsx'
    print(f"Reading file: {file_path}")
    
    # 读取Excel文件
    df = pd.read_excel(file_path)
    
    # 打印列名
    print("Columns:", df.columns.tolist())
    
    # 查找可能的列名
    click_col = next((c for c in df.columns if 'link clicks' in str(c).lower() or 'link_clicks' in str(c).lower()), None)
    lpv_col = next((c for c in df.columns if 'landing page views' in str(c).lower() or 'landing_page_views' in str(c).lower()), None)
    
    print(f"\nFound Link Clicks column: {click_col}")
    print(f"Found Landing Page Views column: {lpv_col}")

    if click_col and lpv_col:
        # 将列转换为数值类型
        df[click_col] = pd.to_numeric(df[click_col], errors='coerce').fillna(0)
        df[lpv_col] = pd.to_numeric(df[lpv_col], errors='coerce').fillna(0)
        
        # 筛选出Landing Page Views > Link Clicks的数据
        anomalies = df[(df[lpv_col] > df[click_col]) & (df[click_col] > 0)].copy()
        
        if not anomalies.empty:
            print(f"\n⚠️ Found {len(anomalies)} rows where Landing Page Views > Link Clicks:")
            # 计算比率
            anomalies['Ratio'] = (anomalies[lpv_col] / anomalies[click_col]) * 100
            
            # 显示关键列
            display_cols = ['Campaign name', click_col, lpv_col, 'Ratio']
            if 'Ad name' in df.columns:
                display_cols.insert(1, 'Ad name')
            elif 'Ad set name' in df.columns:
                display_cols.insert(1, 'Ad set name')
                
            print(anomalies[display_cols].head(10))
        else:
            print("\n✅ No rows found where Landing Page Views > Link Clicks")
            
        print("\nTop 5 rows data:")
        print(df[[click_col, lpv_col]].head())
    else:
        print("❌ Could not find required columns")

except Exception as e:
    print(f"Error reading file: {e}")

# Action Items - KPI 字段显示优化需求

## 需求概述
优化 Action Items 标签页中 Business Line 和 New Audience 子标签的 KPI 值显示格式，使其与 Spend 字段的显示逻辑保持一致。

---

## 当前状态分析

### Spend 字段当前显示格式
```
¥1,234.56        (主值 - 加粗)
vs Avg: ↑ 15.3%  (对比平均值)
vs Last: ↓ 5.2%  (对比上期)
```

**特点**：
- 主值加粗显示
- 包含两行对比信息（vs Avg 和 vs Last）
- 使用箭头指示增减方向
- 显示百分比变化

### KPI 字段当前显示格式

**Business Line (KPIValueCell)**：
```
Target: 3.5      (小字 - Target 值)
Gap: +25.3% ⬇️   (红色加粗 - Gap 值)
```

**New Audience (KPIAvgCell)**：
```
Avg: 2.8         (小字 - Avg 值)
Gap: -15.2% ⬆️   (红色加粗 - Gap 值)
```

---

## 需求说明

### 修改目标
将 KPI 字段的显示格式调整为与 Spend 字段一致的布局结构，**保留箭头和百分比**，但**不显示**标签文字（vs Avg / vs Target）。

### Business Line 子标签 - KPI 字段新格式

**数据来源**：
- `actualValue` - 实际 KPI 值（主值）
- `avgValue` - Avg 值
- `targetValue` - Target 值

**显示格式**：
```
3.5              (主值 - actualValue - 加粗显示)
↑ 25.0%          (vs Avg - 箭头 + 百分比)
↓ 16.7%          (vs Target - 箭头 + 百分比)
```

**百分比计算**：
- vs Avg: `(actualValue - avgValue) / avgValue * 100`
- vs Target: `(actualValue - targetValue) / targetValue * 100`

### New Audience 子标签 - KPI 字段新格式

**数据来源**：
- `actualValue` - 实际 KPI 值（主值）
- `avgValue` - Avg 值

**显示格式**：
```
2.3              (主值 - actualValue - 加粗显示)
↓ 17.9%          (vs Avg - 箭头 + 百分比)
```

**百分比计算**：
- vs Avg: `(actualValue - avgValue) / avgValue * 100`

---

## 详细规格

### 样式要求
1. **主值（actualValue / spend）**：
   - 字体大小：`text-sm`
   - 字重：`font-bold`
   - 颜色：`text-slate-900`
   - 格式化：使用 `formatKPI()` 或 `formatCurrency()` 函数

2. **对比百分比行**：
   - 字体大小：`text-xs`
   - 基础颜色：`text-slate-600`
   - **颜色规则**：
     - **上升（↑）**：绿色 - `text-green-600`
     - **下降（↓）**：红色 - `text-red-600`
   - 格式：`箭头 + 百分比`（例如：`↑ 15.3%`）
   - **不显示**标签（如 "vs Avg:", "vs Target:" 等）
   - 箭头方向：根据百分比正负决定（正数↑，负数↓）
   - 百分比：保留1位小数，显示绝对值

3. **布局**：
   - 使用 `flex flex-col gap-0.5`
   - 垂直排列，间距 0.5
   - 保持 `whitespace-nowrap`

### 组件修改

#### 1. Business Line - KPIValueCell 组件

**修改前**：
```tsx
const KPIValueCell: React.FC<{
    targetValue: number;
    gapPercentage: number;
    kpiType: 'ROI' | 'CPC' | 'CPM';
}> = ({ targetValue, gapPercentage, kpiType }) => {
    const arrow = kpiType === 'ROI' ? '⬇️' : '⬆️';
    const sign = gapPercentage > 0 ? '+' : '';

    return (
        <div className="flex flex-col gap-0.5">
            <div className="text-xs text-slate-500">
                Target: {formatKPI(targetValue, kpiType)}
            </div>
            <div className="text-sm font-bold text-red-600 flex items-center gap-1">
                Gap: {sign}{gapPercentage.toFixed(1)}% {arrow}
            </div>
        </div>
    );
};
```

**修改后**：
```tsx
const KPIValueCell: React.FC<{
    actualValue: number;
    avgValue: number;
    targetValue: number;
    kpiType: 'ROI' | 'CPC' | 'CPM';
}> = ({ actualValue, avgValue, targetValue, kpiType }) => {
    // Calculate vs Avg percentage
    const vsAvgPercentage = avgValue > 0
        ? ((actualValue - avgValue) / avgValue) * 100
        : 0;
    
    // Calculate vs Target percentage
    const vsTargetPercentage = targetValue > 0
        ? ((actualValue - targetValue) / targetValue) * 100
        : 0;
    
    const vsAvgArrow = vsAvgPercentage < 0 ? '↓' : '↑';
    const vsTargetArrow = vsTargetPercentage < 0 ? '↓' : '↑';
    
    // Color based on arrow direction
    const vsAvgColor = vsAvgPercentage < 0 ? 'text-red-600' : 'text-green-600';
    const vsTargetColor = vsTargetPercentage < 0 ? 'text-red-600' : 'text-green-600';

    return (
        <div className="flex flex-col gap-0.5">
            <div className="text-sm font-bold text-slate-900">
                {formatKPI(actualValue, kpiType)}
            </div>
            <div className={`text-xs whitespace-nowrap ${vsAvgColor}`}>
                {vsAvgArrow} {Math.abs(vsAvgPercentage).toFixed(1)}%
            </div>
            <div className={`text-xs whitespace-nowrap ${vsTargetColor}`}>
                {vsTargetArrow} {Math.abs(vsTargetPercentage).toFixed(1)}%
            </div>
        </div>
    );
};
```

#### 2. New Audience - KPIAvgCell 组件

**修改前**：
```tsx
const KPIAvgCell: React.FC<{
    avgValue: number;
    vsAvgPercentage: number;
    kpiType: 'ROI' | 'CPC' | 'CPM';
}> = ({ avgValue, vsAvgPercentage, kpiType }) => {
    const arrow = kpiType === 'ROI' ? '⬇️' : '⬆️';
    const sign = vsAvgPercentage > 0 ? '+' : '';

    return (
        <div className="flex flex-col gap-0.5">
            <div className="text-xs text-slate-500">
                Avg: {formatKPI(avgValue, kpiType)}
            </div>
            <div className="text-sm font-bold text-red-600 flex items-center gap-1">
                Gap: {sign}{vsAvgPercentage.toFixed(1)}% {arrow}
            </div>
        </div>
    );
};
```

**修改后**：
```tsx
const KPIAvgCell: React.FC<{
    actualValue: number;
    avgValue: number;
    kpiType: 'ROI' | 'CPC' | 'CPM';
}> = ({ actualValue, avgValue, kpiType }) => {
    // Calculate vs Avg percentage
    const vsAvgPercentage = avgValue > 0
        ? ((actualValue - avgValue) / avgValue) * 100
        : 0;
    
    const vsAvgArrow = vsAvgPercentage < 0 ? '↓' : '↑';
    
    // Color based on arrow direction
    const vsAvgColor = vsAvgPercentage < 0 ? 'text-red-600' : 'text-green-600';

    return (
        <div className="flex flex-col gap-0.5">
            <div className="text-sm font-bold text-slate-900">
                {formatKPI(actualValue, kpiType)}
            </div>
            <div className={`text-xs whitespace-nowrap ${vsAvgColor}`}>
                {vsAvgArrow} {Math.abs(vsAvgPercentage).toFixed(1)}%
            </div>
        </div>
    );
};
```

#### 3. SpendDetailCell 组件（同时应用颜色）

**修改前**：
```tsx
const SpendDetailCell: React.FC<{
    spend: number;
    avgSpend: number;
    lastSpend?: number;
}> = ({ spend, avgSpend, lastSpend }) => {
    const vsAvgPercentage = avgSpend > 0
        ? ((spend - avgSpend) / avgSpend) * 100
        : 0;
    const vsLastPercentage = lastSpend && lastSpend > 0
        ? ((spend - lastSpend) / lastSpend) * 100
        : null;

    const vsAvgArrow = vsAvgPercentage < 0 ? '↓' : '↑';
    const vsLastArrow = vsLastPercentage !== null && vsLastPercentage < 0 ? '↓' : '↑';

    return (
        <div className="flex flex-col gap-0.5">
            <div className="text-sm font-bold text-slate-900">
                {formatCurrency(spend)}
            </div>
            <div className="text-xs text-slate-600 whitespace-nowrap">
                vs Avg: {vsAvgArrow} {Math.abs(vsAvgPercentage).toFixed(1)}%
            </div>
            <div className="text-xs text-slate-600 whitespace-nowrap">
                vs Last: {vsLastPercentage !== null
                    ? `${vsLastArrow} ${Math.abs(vsLastPercentage).toFixed(1)}%`
                    : 'N/A'
                }
            </div>
        </div>
    );
};
```

**修改后**：
```tsx
const SpendDetailCell: React.FC<{
    spend: number;
    avgSpend: number;
    lastSpend?: number;
}> = ({ spend, avgSpend, lastSpend }) => {
    const vsAvgPercentage = avgSpend > 0
        ? ((spend - avgSpend) / avgSpend) * 100
        : 0;
    const vsLastPercentage = lastSpend && lastSpend > 0
        ? ((spend - lastSpend) / lastSpend) * 100
        : null;

    const vsAvgArrow = vsAvgPercentage < 0 ? '↓' : '↑';
    const vsLastArrow = vsLastPercentage !== null && vsLastPercentage < 0 ? '↓' : '↑';
    
    // Color based on arrow direction
    const vsAvgColor = vsAvgPercentage < 0 ? 'text-red-600' : 'text-green-600';
    const vsLastColor = vsLastPercentage !== null && vsLastPercentage < 0 ? 'text-red-600' : 'text-green-600';

    return (
        <div className="flex flex-col gap-0.5">
            <div className="text-sm font-bold text-slate-900">
                {formatCurrency(spend)}
            </div>
            <div className={`text-xs whitespace-nowrap ${vsAvgColor}`}>
                vs Avg: {vsAvgArrow} {Math.abs(vsAvgPercentage).toFixed(1)}%
            </div>
            <div className={`text-xs whitespace-nowrap ${vsLastPercentage !== null ? vsLastColor : 'text-slate-600'}`}>
                vs Last: {vsLastPercentage !== null
                    ? `${vsLastArrow} ${Math.abs(vsLastPercentage).toFixed(1)}%`
                    : 'N/A'
                }
            </div>
        </div>
    );
};
```

---

## 影响范围

### 需要修改的文件
1. `/components/tabs/ActionItemsTab.tsx`
   - `SpendDetailCell` 组件（添加颜色逻辑）
   - `KPIValueCell` 组件（Business Line - 修改显示逻辑并添加颜色）
   - `KPIAvgCell` 组件（New Audience - 修改显示逻辑并添加颜色）
   - 所有调用这些组件的地方，需要传入 `actualValue` 参数

### 调用位置
- Business Line - Campaign 表格
- Business Line - AdSet 表格
- Business Line - Ad 表格
- New Audience - AdSet 表格
- New Audience - Ad 表格

---

## 确认要点

✅ **请确认以下要点**：

1. ✓ KPI 主值（actualValue）加粗显示在第一行
2. ✓ Business Line：第二行显示 vs Avg 百分比（带箭头），第三行显示 vs Target 百分比（带箭头）
3. ✓ New Audience：第二行显示 vs Avg 百分比（带箭头）
4. ✓ 不显示任何标签文字（如 "vs Avg:", "vs Target:" 等）
5. ✓ 保留箭头（↑/↓）和百分比数值
6. ✓ **颜色标识**：上升（↑）用绿色，下降（↓）用红色
7. ✓ Spend 字段也应用相同的颜色规则
8. ✓ 样式与 Spend 字段保持一致

---

## 示例对比

### Business Line 表格示例

| Campaign | Spend | KPI (ROI) |
|----------|-------|-----------|
| Campaign A | **¥1,234.56**<br><span style="color:green">vs Avg: ↑ 15.3%</span><br><span style="color:red">vs Last: ↓ 5.2%</span> | **3.5**<br><span style="color:green">↑ 25.0%</span><br><span style="color:red">↓ 16.7%</span> |

**说明**：
- Spend 列：显示主值 + vs Avg 标签（绿色上升）+ vs Last 标签（红色下降）
- KPI 列：显示主值 + 百分比（绿色上升，无标签）+ 百分比（红色下降，无标签）

### New Audience 表格示例

| AdSet | Spend | KPI (CPC) |
|-------|-------|-----------|
| AdSet B | **¥567.89**<br><span style="color:green">vs Avg: ↑ 8.1%</span><br><span style="color:green">vs Last: ↑ 3.4%</span> | **¥2.3**<br><span style="color:red">↓ 17.9%</span> |

**说明**：
- Spend 列：显示主值 + vs Avg 标签（绿色上升）+ vs Last 标签（绿色上升）
- KPI 列：显示主值 + 百分比（红色下降，无标签）

---

**颜色规则总结**：
- ✅ 上升（↑）= 绿色（`text-green-600`）
- ❌ 下降（↓）= 红色（`text-red-600`）
- 适用于所有百分比显示（Spend 和 KPI）

---

**请确认此需求是否符合您的预期？**

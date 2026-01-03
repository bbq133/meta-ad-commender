# Advertising Layers 板块功能说明

## 一、板块概述

**Advertising Layers（广告层级分析）** 是一个深度诊断工具，用于分析特定 Business Line（业务线/子项目）的广告投放表现。它结合了可视化象限分析和多层级下钻表格，帮助用户快速识别问题、发现机会，并进行精细化管理。

---

## 二、核心功能模块

### 1. Business Line 选择器

**功能描述：**
- 用户可以从下拉菜单中选择一个已配置的 Business Line（如 AO、AI 等）
- 每个 Business Line 有自己的筛选规则、目标 KPI 类型（ROI/CPC/CPM）、目标值和预算

**显示信息：**
- Business Line 名称
- 层级（Campaign/AdSet/Ad Level）
- 目标 KPI 类型和目标值（如 ROI: 4.5x）

---

### 2. 项目概览卡片

**功能描述：**
- 展示选中 Business Line 的关键汇总信息

**显示指标：**
- **Target KPI**：目标 KPI 类型和目标值（如 ROI: 4.5x）
- **Budget**：该 Business Line 的总预算
- **Total Spend**：实际花费总额
- **Campaigns**：包含的 Campaign 数量

**设计特点：**
- 渐变背景（紫蓝色调）
- 4 个白色卡片网格布局
- 清晰的数据层次（标签 + 数值）

---

### 3. 象限分析图表（Quadrant Analysis）

#### 3.1 散点图可视化

**功能描述：**
- 使用 Recharts 绘制的交互式散点图
- X 轴：Campaign 的平均花费（Spend）
- Y 轴：目标 KPI 值（ROI/CPC/CPM）
- 每个点代表一个 Campaign，点的大小根据花费动态调整

**交互功能：**
- **悬停提示**：鼠标悬停在点上时，显示 Campaign 名称、花费、KPI 值和象限分类
- **点击定位**：点击散点图中的任意点，页面自动滚动到下方表格中对应的 Campaign 行，并高亮显示该行（3秒后淡出）
- **阈值线**：
  - 垂直虚线：平均花费阈值
  - 水平虚线：目标 KPI 阈值
  - 两条线将图表分为 4 个象限

**颜色编码：**
- 🟢 绿色：Excellent（优秀区）
- 🔵 蓝色：Potential（潜力区）
- 🟡 黄色：Watch（观察区）
- 🔴 红色：Problem（问题区）

#### 3.2 阈值调整控制

**功能描述：**
- 用户可以手动调整两个阈值：
  1. **Spend Threshold（花费阈值）**：输入框，单位为美元
  2. **KPI Threshold（KPI 阈值）**：输入框，根据 KPI 类型调整步长

**默认值计算：**
- Spend Threshold：所有 Campaign 的平均花费
- KPI Threshold：Business Line 配置中的目标值（targetValue）

**重置功能：**
- "Reset to Default" 按钮：一键恢复默认阈值

**实时更新：**
- 调整阈值后，散点图和下钻表格中的象限分类会实时更新

#### 3.3 象限过滤器

**功能描述：**
- 5 个过滤按钮：All（全部）、Excellent、Potential、Watch、Problem
- 点击按钮后，下钻表格只显示该象限的 Campaign

**显示信息：**
- 每个按钮显示：
  - 象限图标（emoji）
  - 象限名称
  - 该象限的 Campaign 数量

**视觉反馈：**
- 选中状态：蓝色边框 + 蓝色背景
- 未选中状态：灰色边框 + 灰色背景

#### 3.4 象限分类逻辑

**ROI 类型（越高越好）：**
- **Excellent**：Spend ≥ 阈值 且 ROI ≥ 阈值
- **Potential**：Spend < 阈值 且 ROI ≥ 阈值
- **Watch**：Spend ≥ 阈值 且 ROI < 阈值
- **Problem**：Spend < 阈值 且 ROI < 阈值

**CPC/CPM 类型（越低越好）：**
- **Excellent**：Spend ≥ 阈值 且 CPC/CPM ≤ 阈值
- **Potential**：Spend < 阈值 且 CPC/CPM ≤ 阈值
- **Watch**：Spend ≥ 阈值 且 CPC/CPM > 阈值
- **Problem**：Spend < 阈值 且 CPC/CPM > 阈值

---

### 4. 多层级下钻表格（Drill-Down Table）

#### 4.1 表格结构

**三级层次：**
1. **Campaign 层级**（第一层）
2. **AdSet 层级**（第二层，展开 Campaign 后显示）
3. **Ad 层级**（第三层，展开 AdSet 后显示）

**表头列：**
- **Entity Name**：实体名称（Campaign/AdSet/Ad）
- **动态指标列**：根据 KPI 类型自动调整
  - ROI 类型：Spend, ROI, CVR, AOV, CPA, CPATC, ATC Rate, CTR, CPC
  - CPC 类型：Spend, CPC, CPM, CTR, Clicks, Impressions
  - CPM 类型：Spend, CPM, Reach, Impressions, Frequency, Clicks, CPC
- **Quadrant**：象限分类徽章（仅 Campaign 层级显示）
- **Todo**：待办标记按钮

#### 4.2 Benchmark 行（基准行）

**功能描述：**
- 每个层级的第一行显示该层级的平均值（Benchmark）
- 作为对比基准，帮助用户快速判断单个实体的表现

**显示特点：**
- 灰色渐变背景（from-slate-50 to-slate-100）
- 📊 图标 + "Benchmark (Avg)" 标签
- 粗体字体
- 固定在表格顶部（sticky）

**计算逻辑：**
- Campaign Benchmark：所有 Campaign 的平均值
- AdSet Benchmark：所有 AdSet 的平均值
- Ad Benchmark：所有 Ad 的平均值

**注意事项：**
- 展开 Campaign 时，会显示 AdSet Benchmark
- 展开 AdSet 时，会显示 Ad Benchmark
- 每个层级有独立的 Benchmark

#### 4.3 单行整合显示

**每个实体（Campaign/AdSet/Ad）显示为一行，包含三层信息：**

**行结构：**
- 左侧：
  - 展开/收起按钮（▶/▼）
  - 实体名称（粗体）
  - 层级标签（Campaign/AdSet/Ad）
- 中间：每个指标列显示三层数据
  - **主值**：实际数据（大号字体，粗体）
  - **vs Avg**：与平均值对比（小号字体，带颜色）
  - **Δ**：变化率（小号字体，带颜色）
- 右侧：
  - 象限徽章（仅 Campaign）
  - Todo 标记按钮

**指标单元格布局（垂直堆叠）：**
```
┌─────────────┐
│   $800      │  ← 实际值（16px，粗体，黑色）
│   +78%      │  ← vs Avg（11px，粗体，绿色/红色）
│   +12%      │  ← Delta（11px，常规，绿色/红色）
└─────────────┘
```

**颜色编码：**
- **vs Avg**：
  - 🟢 绿色：表现优于平均（考虑 higherIsBetter 属性）
  - 🔴 红色：表现劣于平均
- **Delta**：
  - 🟢 绿色：增长
  - 🔴 红色：下降

**优势：**
- 信息密度更高，一屏显示更多实体
- 减少滚动，提升浏览效率
- 三层信息垂直对齐，易于对比
- 保持清晰的视觉层次

#### 4.4 层级缩进

**视觉层次：**
- **Campaign**：无缩进
- **AdSet**：左侧缩进 1.5rem
- **Ad**：左侧缩进 3rem

**背景色区分：**
- Campaign：白色背景
- AdSet：浅灰色背景（bg-slate-50/20）
- Ad：更深的灰色背景（bg-slate-50/40）

#### 4.5 展开/收起功能

**交互逻辑：**
- 点击 Campaign 行的 ▶ 按钮 → 展开显示该 Campaign 下的所有 AdSet
- 点击 AdSet 行的 ▶ 按钮 → 展开显示该 AdSet 下的所有 Ad
- 点击 ▼ 按钮 → 收起子层级

**状态管理：**
- 使用两个独立的 Set 管理展开状态：
  - `expandedCampaigns`：已展开的 Campaign 列表
  - `expandedAdSets`：已展开的 AdSet 列表

**嵌套显示：**
- 展开 Campaign 后，先显示 AdSet Benchmark，再显示所有 AdSet
- 展开 AdSet 后，先显示 Ad Benchmark，再显示所有 Ad

#### 4.6 动态列配置

**根据 KPI 类型显示不同的列：**

**ROI 类型（9 列）：**
1. Spend（花费）
2. ROI（投资回报率）
3. CVR（转化率）
4. AOV（平均订单价值）
5. CPA（单次转化成本）
6. CPATC（单次加购成本）
7. ATC Rate（加购率）
8. CTR（点击率）
9. CPC（单次点击成本）

**CPC 类型（6 列）：**
1. Spend（花费）
2. CPC（单次点击成本）
3. CPM（千次展示成本）
4. CTR（点击率）
5. Clicks（点击数）
6. Impressions（展示数）

**CPM 类型（7 列）：**
1. Spend（花费）
2. CPM（千次展示成本）
3. Reach（触达人数）
4. Impressions（展示数）
5. Frequency（频次）
6. Clicks（点击数）
7. CPC（单次点击成本）

**列配置属性：**
- `key`：指标键名
- `label`：显示标签
- `format`：格式化函数（货币/百分比/数字）
- `higherIsBetter`：是否越高越好（用于颜色编码）

#### 4.7 Todo 标记功能

**功能描述：**
- 用户可以在任意层级（Campaign/AdSet/Ad）标记实体到 Todo List
- 标记后的实体会在全局 Todo List 中显示

**交互方式：**
- 点击 ☐ 图标 → 标记到 Todo
- 点击 ☑ 图标 → 取消标记

**视觉反馈：**
- 未标记：灰色 ☐ + 灰色背景
- 已标记：蓝色 ☑ + 蓝色背景

**Todo 数据结构：**
```typescript
{
  id: "campaign-Brand",           // 唯一标识
  projectId: "1",                  // Business Line ID
  projectName: "AO",               // Business Line 名称
  level: "Campaign",               // 层级
  itemId: "Brand",                 // 实体 ID
  itemName: "Brand",               // 实体名称
  quadrant: "excellent",           // 象限分类
  metrics: {
    spend: 800,                    // 花费
    kpi: 5.2,                      // KPI 值
    delta: 0.12                    // 变化率
  },
  markedAt: "2025-12-28T08:00:00Z", // 标记时间
  status: "pending"                // 状态
}
```

#### 4.8 象限过滤

**功能描述：**
- 点击象限过滤按钮后，表格只显示该象限的 Campaign
- 过滤不影响 AdSet 和 Ad 的显示（展开后仍显示所有子项）

**过滤选项：**
- **All**：显示所有 Campaign
- **Excellent**：只显示优秀区的 Campaign
- **Potential**：只显示潜力区的 Campaign
- **Watch**：只显示观察区的 Campaign
- **Problem**：只显示问题区的 Campaign

**空状态处理：**
- 如果选中的象限没有 Campaign，显示：
  - "No campaigns found for the selected quadrant."

---

## 三、数据处理逻辑

### 1. 数据分组

**Campaign 分组：**
- 按 `campaign_name` 分组所有原始记录
- 聚合每个 Campaign 的所有指标

**AdSet 分组：**
- 在每个 Campaign 内，按 `adset_name` 分组
- 聚合每个 AdSet 的所有指标

**Ad 分组：**
- 在每个 AdSet 内，按 `ad_name` 分组
- 聚合每个 Ad 的所有指标

### 2. 指标聚合

**聚合函数（aggregateMetrics）：**
- 对一组记录求和：spend, impressions, clicks, purchases, revenue, ATC, reach
- 计算衍生指标：
  - ROI = revenue / spend
  - CVR = purchases / clicks
  - AOV = revenue / purchases
  - CPA = spend / purchases
  - CPATC = spend / ATC
  - ATC Rate = ATC / clicks
  - CTR = clicks / impressions
  - CPC = spend / clicks
  - CPM = (spend / impressions) × 1000
  - Frequency = impressions / reach

### 3. Benchmark 计算

**计算方法：**
- 筛选出指定层级的所有记录（通过 `level` 字段）
- 对每个指标分别计算平均值
- 返回包含所有指标平均值的对象

**注意事项：**
- 如果该层级没有数据，返回全 0 的 Benchmark
- Benchmark 是基于原始记录计算的，不是基于聚合后的实体

### 4. vs Avg 计算

**计算公式：**
```
vs Avg = ((当前值 - 平均值) / 平均值) × 100%
```

**颜色判断：**
- 如果 `higherIsBetter = true`（如 ROI、CVR）：
  - vs Avg > 0 → 绿色（好）
  - vs Avg < 0 → 红色（差）
- 如果 `higherIsBetter = false`（如 CPA、CPC）：
  - vs Avg < 0 → 绿色（好）
  - vs Avg > 0 → 红色（差）

### 5. Delta 计算

**计算公式：**
```
Delta = ((当前值 - 上期值) / 上期值) × 100%
```

**颜色判断：**
- Delta > 0 → 绿色（增长）
- Delta < 0 → 红色（下降）

**对比数据来源：**
- 从 `comparisonData` 中筛选出同名实体的记录
- 聚合计算上期的指标值

---

## 四、技术实现

### 1. 核心组件

**BusinessLineTab.tsx**
- 主容器组件
- 管理 Business Line 选择、阈值状态、象限过滤状态
- 集成 QuadrantChart 和 DrillDownTable

**QuadrantChart.tsx**
- 散点图可视化
- 阈值调整控制
- 象限过滤器

**DrillDownTable.tsx**
- 多层级表格
- 数据分组和聚合
- 展开/收起逻辑

**辅助组件：**
- `BenchmarkRow.tsx`：Benchmark 行
- `QuadrantBadge.tsx`：象限徽章
- `TodoMarkButton.tsx`：Todo 标记按钮
- `DataRowGroup`：三行数据组（内部组件）

### 2. 工具函数

**benchmarkUtils.ts**
- `calculateROI/CVR/AOV/...`：单个记录的指标计算
- `calculateBenchmark`：计算指定层级的平均值
- `calculateVsAvg`：计算与平均值的百分比差异

**columnConfig.ts**
- `getColumnsForKPI`：根据 KPI 类型返回列配置数组

**quadrantUtils.ts**
- `calculateDefaultThresholds`：计算默认阈值
- `classifyQuadrant`：象限分类
- `getQuadrantInfo`：获取象限显示信息（标签、图标、颜色）

**dataUtils.ts**
- `formatCurrency`：货币格式化
- `formatPercent`：百分比格式化
- `formatNumber`：数字格式化
- `getDelta`：计算变化率

### 3. 状态管理

**本地状态（BusinessLineTab）：**
- `selectedProjectId`：选中的 Business Line ID
- `selectedQuadrant`：选中的象限过滤器
- `thresholds`：当前阈值（spend 和 kpi）

**本地状态（DrillDownTable）：**
- `expandedCampaigns`：已展开的 Campaign Set
- `expandedAdSets`：已展开的 AdSet Set

**全局状态（App.tsx）：**
- `todoList`：全局 Todo 列表
- `handleTodoToggle`：Todo 切换处理函数

### 4. 数据流

```
App.tsx
  ├─ filteredData (根据日期范围过滤)
  ├─ comparisonData (对比期数据)
  ├─ configs (Business Line 配置)
  └─ todoList (全局 Todo)
      ↓
BusinessLineTab
  ├─ projectData (根据 Business Line 过滤)
  ├─ projectComparisonData (对比期数据)
  ├─ thresholds (阈值)
  └─ selectedQuadrant (象限过滤)
      ↓
QuadrantChart + DrillDownTable
  ├─ 分组聚合
  ├─ 计算 Benchmark
  ├─ 象限分类
  └─ 渲染 UI
```

---

## 五、使用场景

### 场景 1：快速诊断问题 Campaign
1. 选择 Business Line
2. 查看象限图，识别红色（Problem）区域的 Campaign
3. 点击 "Problem" 过滤按钮
4. 在表格中查看这些 Campaign 的详细指标
5. 对比 vs Avg 和 Δ，判断问题原因
6. 标记到 Todo List，后续优化

### 场景 2：发现潜力 Campaign
1. 查看象限图，识别蓝色（Potential）区域的 Campaign
2. 这些 Campaign 的 KPI 表现好，但花费较低
3. 点击 "Potential" 过滤按钮
4. 在表格中查看详细数据
5. 考虑增加预算，扩大投放

### 场景 3：深度分析 AdSet/Ad
1. 找到表现异常的 Campaign
2. 点击展开按钮，查看其下的 AdSet
3. 对比 AdSet Benchmark，找到表现差的 AdSet
4. 继续展开 AdSet，查看具体的 Ad
5. 对比 Ad Benchmark，找到问题 Ad
6. 标记到 Todo List，进行优化或暂停

### 场景 4：调整阈值进行敏感性分析
1. 使用默认阈值查看分类结果
2. 手动调整 Spend Threshold，观察象限变化
3. 手动调整 KPI Threshold，观察象限变化
4. 找到最合适的阈值设置
5. 基于新的分类结果制定优化策略

---

## 六、设计亮点

### 1. 智能颜色编码
- 根据 `higherIsBetter` 属性自动判断好坏
- ROI、CVR 等：高于平均 = 绿色
- CPA、CPC 等：低于平均 = 绿色

### 2. 动态列配置
- 根据 KPI 类型自动显示相关指标
- 避免信息过载，只显示最相关的数据

### 3. 三行数据结构
- 一次性展示：实际值、相对位置、趋势
- 信息密度高，但结构清晰

### 4. 嵌套 Benchmark
- 每个层级有独立的 Benchmark
- 确保对比的公平性和准确性

### 5. 实时交互
- 阈值调整、象限过滤、展开/收起都是实时响应
- 无需刷新页面，用户体验流畅

### 6. 视觉层次
- 通过缩进、背景色、字体粗细区分层级
- 清晰的视觉引导，易于理解

---

## 七、未来优化方向

1. **虚拟滚动**：当数据量很大时，使用虚拟滚动提升性能
2. **导出功能**：支持导出表格数据为 Excel/CSV
3. **自定义列**：允许用户自定义显示哪些列
4. **批量操作**：支持批量标记 Todo、批量暂停等
5. **趋势图**：在表格中嵌入小型趋势图（Sparkline）
6. **智能建议**：基于数据自动生成优化建议
7. **拖拽阈值线**：在图表上直接拖拽阈值线调整
8. **保存视图**：保存当前的阈值和过滤设置

---

## 八、总结

Advertising Layers 板块是一个功能强大的诊断工具，它通过可视化和多层级表格的结合，帮助用户：
- **快速识别**：通过象限图快速识别问题和机会
- **深度分析**：通过多层级下钻深入分析根因
- **精准对比**：通过 Benchmark 和 vs Avg 精准对比表现
- **趋势追踪**：通过 Delta 追踪变化趋势
- **灵活调整**：通过阈值调整进行敏感性分析
- **高效管理**：通过 Todo 标记进行任务管理

这个板块将执行诊断能力提升到了新的高度，是整个分析系统的核心功能之一。

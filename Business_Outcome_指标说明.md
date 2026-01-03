# Business Outcome 指标计算公式说明

## 数据来源与处理流程

### 一、原始数据来源

**数据源：** Meta Ads Manager 导出的 CSV/XLSX 报表

**原始数据字段（RawAdRecord）：**

| 字段名 | Meta 报表字段名 | 数据类型 | 说明 |
|--------|----------------|----------|------|
| `date` | Day | string | 日期 |
| `campaign_name` | Campaign name | string | 广告系列名称 |
| `adset_name` | Ad set name | string | 广告组名称 |
| `ad_name` | Ad name | string | 广告名称 |
| `spend` | Amount spent (USD) | number | 消耗金额（美元） |
| `impressions` | Impressions | number | 展示次数 |
| `link_clicks` | Link clicks | number | 链接点击次数 |
| `purchases` | Purchases | number | 购买次数 |
| `purchase_value` | Purchases conversion value | number | 购买转化价值（GMV） |
| `adds_to_cart` | Adds to cart | number | 加购次数 |
| `checkouts_initiated` | Checkouts initiated | number | 发起结账次数 |

---

### 二、数据处理流程

```
1. 文件上传
   ↓
2. 字段映射（FileUpload.tsx）
   - 自动识别 Meta 报表字段
   - 映射到系统内部字段结构
   ↓
3. 日期筛选（App.tsx）
   - 根据用户选择的日期范围过滤数据
   - 如果开启对比模式，同时计算对比期数据
   ↓
4. 数据聚合（dataUtils.ts - calculateMetrics）
   - 对筛选后的数据进行求和聚合
   - 计算衍生指标（ROI、ACOS、CPA等）
   ↓
5. 业务线配置应用（OverviewTab.tsx）
   - 读取业务线配置（configs）
   - 计算目标值（Target GMV、Target ACOS等）
   ↓
6. 指标展示
   - 显示当期指标
   - 显示环比变化
   - 显示状态判断
```

---

### 三、数据聚合逻辑（calculateMetrics 函数）

**输入：** `RawAdRecord[]` - 原始广告记录数组

**处理步骤：**

#### 步骤 1：基础指标求和
```typescript
// 遍历所有记录，累加基础指标
totals = {
  spend: Σ(record.spend),                    // 总消耗
  impressions: Σ(record.impressions),        // 总展示
  link_clicks: Σ(record.link_clicks),        // 总点击
  purchases: Σ(record.purchases),            // 总购买
  purchase_value: Σ(record.purchase_value),  // 总GMV
  adds_to_cart: Σ(record.adds_to_cart),      // 总加购
  checkouts_initiated: Σ(record.checkouts_initiated) // 总结账
}
```

#### 步骤 2：计算衍生指标
```typescript
// 基于求和结果计算衍生指标
derived_metrics = {
  roi: purchase_value / spend,                    // ROI = GMV / 消耗
  cpa: spend / purchases,                         // CPA = 消耗 / 购买次数
  cpc: spend / link_clicks,                       // CPC = 消耗 / 点击次数
  ctr: link_clicks / impressions,                 // CTR = 点击 / 展示
  cpm: (spend / impressions) × 1000,              // CPM = (消耗 / 展示) × 1000
  cpatc: spend / adds_to_cart,                    // CPATC = 消耗 / 加购次数
  atc_rate: adds_to_cart / link_clicks,           // 加购率 = 加购 / 点击
  acos: (spend / purchase_value) × 100,           // ACOS = (消耗 / GMV) × 100%
  cvr: purchases / link_clicks,                   // CVR = 购买 / 点击
  aov: purchase_value / purchases                 // AOV = GMV / 购买次数
}
```

**输出：** `AggregatedMetrics` - 包含基础指标和衍生指标的聚合对象

---

### 四、业务线配置（AdConfiguration）

**配置来源：** 用户在上传流程第一步配置的业务线

**配置字段：**

| 字段名 | 类型 | 说明 | 用途 |
|--------|------|------|------|
| `id` | string | 唯一标识 | - |
| `name` | string | 业务线名称 | 如 "Retargeting Scope" |
| `level` | enum | 分析层级 | Campaign / AdSet / Ad |
| `budget` | number | 预算分配 | 用于计算 Target GMV 和 Spend Pacing |
| `targetType` | enum | KPI 类型 | ROI / CPC / CPM |
| `targetValue` | number | 目标值 | 如 ROI 目标为 4.5 |
| `rules` | FilterRule[] | 筛选规则 | 用于匹配特定广告系列 |

**配置对目标值的影响：**

```typescript
// 1. Target GMV（目标GMV）
targetGMV = Σ(config.budget × config.targetValue)  // 仅计算 targetType === 'ROI' 的配置
// 即：所有 ROI 类型业务线的 (预算 × ROI目标值) 之和

// 2. Total Budget（总预算）
totalBudget = Σ(config.budget)  // 所有业务线预算之和

// 3. Weighted ROI Sum（加权ROI总和）
weightedRoiSum = Σ(config.budget × config.targetValue)  
// 仅计算 targetType === 'ROI' 的配置

// 4. Target ACOS（目标销售费率）
targetAcos = (totalBudget / weightedRoiSum) × 100

// 5. Target ROI（目标ROI）
targetRoi = weightedRoiSum / totalBudget
```

**示例计算：**
```
假设有3个业务线配置：
1. Retargeting Scope: budget=5000, targetType=ROI, targetValue=4.5
2. Top Funnel AW: budget=3000, targetType=CPM, targetValue=8.5
3. Main Conversion: budget=12000, targetType=ROI, targetValue=2.8

计算：
totalBudget = 5000 + 3000 + 12000 = 20000
weightedRoiSum = (5000 × 4.5) + (12000 × 2.8) = 22500 + 33600 = 56100
  // 注意：Top Funnel AW 的 targetType 是 CPM，不参与计算
targetGMV = 56100  // 与 weightedRoiSum 相同
targetAcos = (20000 / 56100) × 100 = 35.65%
targetRoi = 56100 / 20000 = 2.805
```

---

## 一、核心指标（Business Outcome 区域）

### 1. Revenue / GMV Achievement（收入/GMV达成率）

**显示值：**
- 主值：`purchase_value`（购买转化价值总和）
- 目标：`GMV Achievement Rate` 和 `Target GMV`

**计算公式：**
```
purchase_value = Σ(所有记录的 purchase_value)
targetGMV = Σ(config.budget × config.targetValue)  // 仅 targetType='ROI' 的配置
gmvAchievementRate = (purchase_value / targetGMV) × 100%
```

**环比变化：**
```
delta = (当期 purchase_value - 上期 purchase_value) / 上期 purchase_value
```

**状态判断：**
- ✅ Good (绿色)：gmvAchievementRate >= 100%
- ⚠️ Warning (黄色)：80% <= gmvAchievementRate < 100%
- ❌ Bad (红色)：gmvAchievementRate < 80%

---

### 2. ACOS（销售费率 - Advertising Cost of Sales）

**显示值：**
- 主值：`acos`（百分比形式）
- 目标：`Target ACOS` 和偏差值

**计算公式：**
```
spend = Σ(所有记录的 spend)
purchase_value = Σ(所有记录的 purchase_value)
acos = (spend / purchase_value) × 100%

// 目标 ACOS 计算
targetAcos = (totalBudget / weightedRoiSum) × 100
其中：
  weightedRoiSum = Σ(配置的 budget × targetValue)  // 仅计算 targetType='ROI' 的配置
  totalBudget = Σ(所有业务线配置的 budget)

// ACOS 偏差
acosDeviation = acos - targetAcos
```

**环比变化：**
```
delta = (当期 acos - 上期 acos) / 上期 acos
```

**状态判断：**
- ✅ Good (绿色)：acosDeviation <= 0（实际 ACOS 低于或等于目标）
- ⚠️ Warning (黄色)：0 < acosDeviation <= 5（偏差在5%以内）
- ❌ Bad (红色)：acosDeviation > 5（偏差超过5%）

---

### 3. Spend Pacing（消耗进度）

**显示值：**
- 主值：`spendPacing`（百分比形式）
- 目标：总预算

**计算公式：**
```
spend = Σ(所有记录的 spend)
totalBudget = Σ(所有业务线配置的 budget)
spendPacing = spend / totalBudget
```

**说明：**
- 无环比变化显示
- 无状态判断
- 用于监控预算消耗进度

---

## 二、账户健康指标（Account Health 区域）

### 4. ROI Efficiency（ROI 效率）

**显示值：**
- 主值：`roi`（倍数形式，如 2.14x）

**计算公式：**
```
spend = Σ(所有记录的 spend)
purchase_value = Σ(所有记录的 purchase_value)
roi = purchase_value / spend

// 目标 ROI
targetRoi = weightedRoiSum / totalBudget
其中：
  weightedRoiSum = Σ(配置的 budget × targetValue)  // 仅计算 targetType='ROI' 的配置
  totalBudget = Σ(所有业务线配置的 budget)
```

**环比变化：**
```
delta = (当期 roi - 上期 roi) / 上期 roi
```

**状态判断：**
- ✅ Good (绿色)：roi >= targetRoi
- ⚠️ Warning (黄色)：roi < targetRoi

---

### 5. CPA Analysis（单次转化成本）

**显示值：**
- 主值：`cpa`（美元形式）

**计算公式：**
```
spend = Σ(所有记录的 spend)
purchases = Σ(所有记录的 purchases)
cpa = spend / purchases
```

**环比变化：**
```
delta = (当期 cpa - 上期 cpa) / 上期 cpa
```

**说明：**
- 无状态判断
- CPA 越低越好（但环比变化为负数时显示为绿色上升箭头）

---

### 6. Traffic Cost (CPM)（千次展示成本）

**显示值：**
- 主值：`cpm`（美元形式）

**计算公式：**
```
spend = Σ(所有记录的 spend)
impressions = Σ(所有记录的 impressions)
cpm = (spend / impressions) × 1000
```

**环比变化：**
```
delta = (当期 cpm - 上期 cpm) / 上期 cpm
```

**说明：**
- 无状态判断
- 用于监控流量获取成本

---

## 三、广告层级分析（Advertising Layers 区域）

### 7. 按广告层级分类

**层级分类规则：**
```
AWARENESS (认知层)：
  - 广告系列名称包含 "-AW-" 或 "AWARENESS"

TRAFFIC (考虑层)：
  - 广告系列名称包含 "-TR-" 或 "TRAFFIC"

CONVERSION (转化层)：
  - 广告系列名称包含 "-CV-" 或 "CONVERSION"
  - 默认分类（不匹配以上规则时）
```

**各层级显示指标：**

### AWARENESS (认知层)
显示指标：
1. **Impressions（展示次数）**
   ```
   impressions = Σ(该层级所有记录的 impressions)
   ```

2. **CPM（千次展示成本）**
   ```
   spend = Σ(该层级所有记录的 spend)
   impressions = Σ(该层级所有记录的 impressions)
   cpm = (spend / impressions) × 1000
   ```
   环比变化：`delta = (当期 cpm - 上期 cpm) / 上期 cpm`

3. **Spend（消耗）**
   ```
   spend = Σ(该层级所有记录的 spend)
   ```

### TRAFFIC (考虑层)
显示指标：
1. **CTR（点击率）**
   ```
   link_clicks = Σ(该层级所有记录的 link_clicks)
   impressions = Σ(该层级所有记录的 impressions)
   ctr = (link_clicks / impressions) × 100%
   ```
   环比变化：`delta = (当期 ctr - 上期 ctr) / 上期 ctr`

2. **CPC（单次点击成本）**
   ```
   spend = Σ(该层级所有记录的 spend)
   link_clicks = Σ(该层级所有记录的 link_clicks)
   cpc = spend / link_clicks
   ```
   环比变化：`delta = (当期 cpc - 上期 cpc) / 上期 cpc`

3. **Clicks（点击次数）**
   ```
   clicks = Σ(该层级所有记录的 link_clicks)
   ```

### CONVERSION (转化层)
显示指标：
1. **ROI（投资回报率）**
   ```
   purchase_value = Σ(该层级所有记录的 purchase_value)
   spend = Σ(该层级所有记录的 spend)
   roi = purchase_value / spend
   ```
   环比变化：`delta = (当期 roi - 上期 roi) / 上期 roi`

2. **Revenue（收入/GMV）**
   ```
   revenue = Σ(该层级所有记录的 purchase_value)
   ```

3. **Spend（消耗）**
   ```
   spend = Σ(该层级所有记录的 spend)
   ```

---

## 四、其他衍生指标（在 dataUtils 中定义但未在 Business Outcome 显示）

### CPC（单次点击成本）
```
cpc = spend / link_clicks
```

### CTR（点击率）
```
ctr = link_clicks / impressions
```

### CPATC（单次加购成本）
```
cpatc = spend / adds_to_cart
```

### ATC Rate（加购率）
```
atc_rate = adds_to_cart / link_clicks
```

### CVR（转化率）
```
cvr = purchases / link_clicks
```

### AOV（客单价）
```
aov = purchase_value / purchases
```

---

## 五、重要说明

### 1. 数据聚合范围
- 所有指标都基于选定日期范围内的数据进行计算
- 如果开启"对比模式"，会计算对比期的相同指标用于环比分析

### 2. 对比期计算规则
```
对比期结束日期 = 开始日期 - 1天
对比期开始日期 = 对比期结束日期 - (结束日期 - 开始日期)

示例：
  当前期：2025-12-21 到 2025-12-26（6天）
  对比期：2025-12-14 到 2025-12-20（6天）
```

### 3. 环比变化显示规则
- 变化率 < 0.1%：显示为 "-"（无明显变化）
- 变化率 > 0：显示绿色上升箭头 ↗
- 变化率 < 0：显示红色下降箭头 ↘

### 4. 除零保护
所有除法运算都有除零保护，当分母为 0 时返回 0

---

## 六、业务线配置对指标的影响

业务线配置（configs）影响以下目标值的计算：

1. **Target GMV** = Σ(所有业务线的 budget)
2. **Target ACOS** = (totalBudget / weightedRoiSum) × 100
3. **Target ROI** = weightedRoiSum / totalBudget

其中 `weightedRoiSum` 只计算 `targetType='ROI'` 的业务线配置。

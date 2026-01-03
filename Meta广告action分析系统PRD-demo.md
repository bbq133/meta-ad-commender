# Meta广告Action分析系统 PRD

## 一、产品概述

### 1.1 产品定位
Meta广告Action分析系统（Ads Commander）是一款面向数字营销团队的专业级广告投放分析平台，通过数据可视化、智能诊断和AI辅助决策，帮助广告主实现ROI最大化和精细化运营。

### 1.2 核心价值
- **全链路转化追踪**：从曝光到成交的完整漏斗分析
- **智能诊断引擎**：自动识别表现异常的广告单元
- **策略决策支持**：基于四象限模型的投放策略建议
- **AI辅助优化**：集成Gemini AI提供深度洞察

### 1.3 目标用户
- 电商广告投放团队
- 数字营销优化师
- 广告代理商运营人员
- 品牌营销负责人

---

## 二、系统架构

### 2.1 技术栈
- **前端框架**：React + TypeScript
- **UI组件**：Lucide Icons
- **图表库**：Recharts
- **数据解析**：XLSX.js + PapaParse
- **AI集成**：Google Gemini API
- **构建工具**：Vite

### 2.2 数据流架构
```
原始数据上传 → 字段映射 → 数据聚合 → 指标计算 → 多维分析 → 可视化呈现
```

---

## 三、数据模型与字段定义

### 3.1 原始数据模型（RawAdRecord）

#### 字段来源：Meta Ads Manager导出报表

| 字段名 | 数据类型 | Meta原始字段名 | 说明 | 必填 |
|--------|---------|---------------|------|------|
| `date` | string | Day | 投放日期，格式：YYYY-MM-DD | ✅ |
| `campaign_name` | string | Campaign name | 广告系列名称 | ✅ |
| `adset_name` | string | Ad set name | 广告组名称 | ✅ |
| `ad_name` | string | Ad name | 广告创意名称 | ✅ |
| `spend` | number | Amount spent (USD) | 广告消耗金额（美元） | ✅ |
| `impressions` | number | Impressions | 广告展示次数 | ✅ |
| `link_clicks` | number | Link clicks | 链接点击次数 | ✅ |
| `purchases` | number | Purchases | 购买转化次数 | ✅ |
| `purchase_value` | number | Purchases conversion value | 购买转化金额（GMV） | ✅ |
| `adds_to_cart` | number | Adds to cart | 加购次数 | ✅ |
| `checkouts_initiated` | number | Checkouts initiated | 发起结算次数 | ✅ |

#### 字段映射规则
系统支持双字段名映射，兼容Meta原生导出和自定义格式：
```typescript
// 映射逻辑示例
date: row['Day'] || row['date']
campaign_name: row['Campaign name'] || row['campaign_name']
spend: parseFloat(row['Amount spent (USD)'] || row['spend'] || 0)
```

---

### 3.2 聚合指标模型（AggregatedMetrics）

#### 基础指标（直接聚合）

| 指标名 | 计算逻辑 | 说明 |
|--------|---------|------|
| `spend` | SUM(spend) | 总消耗 |
| `impressions` | SUM(impressions) | 总展示 |
| `link_clicks` | SUM(link_clicks) | 总点击 |
| `purchases` | SUM(purchases) | 总购买 |
| `purchase_value` | SUM(purchase_value) | 总GMV |
| `adds_to_cart` | SUM(adds_to_cart) | 总加购 |
| `checkouts_initiated` | SUM(checkouts_initiated) | 总结算 |

#### 衍生指标（计算公式）

| 指标名 | 计算公式 | 业务含义 | 优化方向 |
|--------|---------|---------|---------|
| **ROI** | `purchase_value / spend` | 投资回报率 | ↑ 越高越好 |
| **CPA** | `spend / purchases` | 单次购买成本 | ↓ 越低越好 |
| **CPC** | `spend / link_clicks` | 单次点击成本 | ↓ 越低越好 |
| **CTR** | `link_clicks / impressions` | 点击率 | ↑ 越高越好 |
| **CPM** | `(spend / impressions) * 1000` | 千次展示成本 | ↓ 越低越好 |
| **CPATC** | `spend / adds_to_cart` | 单次加购成本 | ↓ 越低越好 |
| **ATC Rate** | `adds_to_cart / link_clicks` | 加购转化率 | ↑ 越高越好 |
| **ACOS** | `spend / purchase_value` | 广告销售成本比 | ↓ 越低越好 |
| **CVR** | `purchases / link_clicks` | 购买转化率 | ↑ 越低越好 |
| **AOV** | `purchase_value / purchases` | 客单价 | ↑ 越高越好 |

#### 计算逻辑代码实现
```typescript
export const calculateMetrics = (records: RawAdRecord[]): AggregatedMetrics => {
  const totals = records.reduce((acc, curr) => ({
    spend: acc.spend + (curr.spend || 0),
    impressions: acc.impressions + (curr.impressions || 0),
    link_clicks: acc.link_clicks + (curr.link_clicks || 0),
    purchases: acc.purchases + (curr.purchases || 0),
    purchase_value: acc.purchase_value + (curr.purchase_value || 0),
    adds_to_cart: acc.adds_to_cart + (curr.adds_to_cart || 0),
    checkouts_initiated: acc.checkouts_initiated + (curr.checkouts_initiated || 0),
  }), { /* 初始值 */ });

  return {
    ...totals,
    roi: spend > 0 ? purchase_value / spend : 0,
    cpa: purchases > 0 ? spend / purchases : 0,
    cpc: link_clicks > 0 ? spend / link_clicks : 0,
    ctr: impressions > 0 ? link_clicks / impressions : 0,
    cpm: impressions > 0 ? (spend / impressions) * 1000 : 0,
    cpatc: adds_to_cart > 0 ? spend / adds_to_cart : 0,
    atc_rate: link_clicks > 0 ? adds_to_cart / link_clicks : 0,
    acos: purchase_value > 0 ? spend / purchase_value : 0,
    cvr: link_clicks > 0 ? purchases / link_clicks : 0,
    aov: purchases > 0 ? purchase_value / purchases : 0,
  };
};
```

---

### 3.3 业务配置模型（AdConfiguration）

| 字段名 | 类型 | 说明 | 示例 |
|--------|------|------|------|
| `id` | string | 配置唯一标识 | "1" |
| `name` | string | 业务线名称 | "Retargeting Scope" |
| `level` | enum | 分析层级 | Campaign / AdSet / Ad |
| `budget` | number | 预算分配 | 5000 |
| `targetType` | enum | 目标类型 | ROI / CPC / CPM |
| `targetValue` | number | 目标值 | 4.5 |
| `rules` | FilterRule[] | 筛选规则数组 | 见下表 |

#### 筛选规则（FilterRule）

| 字段名 | 类型 | 可选值 | 说明 |
|--------|------|--------|------|
| `field` | enum | campaign_name / adset_name / ad_name | 筛选字段 |
| `operator` | enum | contains / not_contains / equals | 操作符 |
| `value` | string | 任意文本 | 匹配值 |

#### 规则匹配逻辑
```typescript
export const matchesConfig = (record: RawAdRecord, config: AdConfiguration): boolean => {
  if (config.rules.length === 0) return true; // 无规则则全部匹配
  
  // 所有规则必须同时满足（AND逻辑）
  return config.rules.every(rule => {
    const fieldValue = String(record[rule.field] || '').toLowerCase();
    const targetValue = rule.value.toLowerCase();

    switch (rule.operator) {
      case 'contains': return fieldValue.includes(targetValue);
      case 'not_contains': return !fieldValue.includes(targetValue);
      case 'equals': return fieldValue === targetValue;
      default: return true;
    }
  });
};
```

---

### 3.4 广告层级分类（CampaignLayer）

基于命名规范自动识别广告漏斗层级：

| 层级 | 识别关键词 | 业务目标 | 核心指标 |
|------|-----------|---------|---------|
| **Awareness** | -AW-, AWARENESS | 品牌曝光 | Impressions, CPM |
| **Traffic** | -TR-, TRAFFIC | 流量获取 | Link Clicks, CPC |
| **Conversion** | -CV-, -N2-, CONVERSION | 转化成交 | Purchases, ROI |

```typescript
export const classifyCampaign = (name: string): CampaignLayer => {
  const upperName = name.toUpperCase();
  if (upperName.includes('-AW-') || upperName.includes('AWARENESS')) 
    return CampaignLayer.AWARENESS;
  if (upperName.includes('-TR-') || upperName.includes('TRAFFIC')) 
    return CampaignLayer.TRAFFIC;
  if (upperName.includes('-CV-') || upperName.includes('-N2-') || upperName.includes('CONVERSION')) 
    return CampaignLayer.CONVERSION;
  return CampaignLayer.CONVERSION; // 默认归为转化层
};
```

---

## 四、核心功能模块

### 4.1 数据上传模块（FileUpload）

#### 功能描述
支持用户上传Meta Ads Manager导出的CSV或XLSX格式报表，系统自动解析并映射字段。

#### 支持格式
- `.csv` - 使用PapaParse解析
- `.xlsx` / `.xls` - 使用XLSX.js解析

#### 字段映射标准
系统自动识别以下字段名（不区分大小写）：

| 标准字段 | 可识别的原始字段名 |
|---------|------------------|
| date | Day, date |
| campaign_name | Campaign name, campaign_name |
| adset_name | Ad set name, adset_name |
| ad_name | Ad name, ad_name |
| spend | Amount spent (USD), spend |
| impressions | Impressions, impressions |
| link_clicks | Link clicks, link_clicks |
| purchases | Purchases, purchases |
| purchase_value | Purchases conversion value, purchase_value |
| adds_to_cart | Adds to cart, adds_to_cart |
| checkouts_initiated | Checkouts initiated, checkouts_initiated |

#### 数据验证规则
- 必须包含至少一条有效记录（含Day或campaign_name字段）
- 数值字段自动转换为数字类型（parseFloat/parseInt）
- 缺失字段自动填充默认值（0或'Unknown'）

#### 用户交互流程
1. 用户点击"选择 CSV 或 XLSX"按钮
2. 系统显示加载动画"正在同步广告数据..."
3. 解析完成后自动跳转到数据分析界面
4. 错误时显示具体错误信息

---

### 4.2 全局筛选与日期对比

#### 日期筛选器
- **字段**：`startDate`, `endDate`
- **格式**：YYYY-MM-DD
- **默认值**：最近4天（最新日期 - 3天 至 最新日期）
- **对比模式**：自动计算同等时长的前一周期数据

#### 日期对比逻辑
```typescript
// 当前周期：2024-01-10 至 2024-01-15（6天）
// 对比周期：2024-01-03 至 2024-01-09（6天）

const durationMs = endMs - startMs;
const compEndMs = startMs - oneDay; // 前一天
const compStartMs = compEndMs - durationMs; // 同等时长
```

#### 业务线筛选器
- 支持多选业务线配置
- 点击配置名称切换选中状态
- "Reset"按钮清空所有筛选
- **筛选作用范围**：
  - ✅ **业务详情（BusinessLineTab）**
  - ✅ **执行诊断（ExecutionTab）**
  - ✅ **投放策略（QuadrantTab）**
  - ✅ **待办清单（TodoTab）**
  - ❌ **生意大盘（OverviewTab）** - 不受筛选影响，始终显示全量数据
- 筛选逻辑：满足任一配置规则即纳入分析（OR逻辑）

#### 重新上传功能
- 顶部导航栏"重新上传"按钮
- 点击后弹窗确认："确定要清除当前分析数据并重新上传新表格吗？"
- 确认后清空数据，返回上传界面

---

### 4.3 生意大盘（OverviewTab）

> **📌 数据范围说明**  
> 生意大盘模块**不受业务线筛选器影响**，始终展示全量数据。这是为了确保管理层能够看到账户的整体健康状况和全局KPI表现。其他四个模块（业务详情、执行诊断、投放策略、待办清单）会根据业务线筛选器动态过滤数据。

#### 4.3.1 Business Outcome（业务结果）

##### Revenue（总成交额）/ GMV Achievement（GMV达成率）
- **数据来源**：`SUM(purchase_value)` - 总成交额
- **环比趋势**：`(当前GMV - 对比期GMV) / 对比期GMV`
- **Target（目标值）**：所有预算总和
  ```typescript
  // 计算所有配置的预算总和作为GMV目标
  const targetGMV = configs.reduce((sum, config) => sum + config.budget, 0);
  ```
- **达成率计算**：`(总成交额 / Target) * 100%`
  ```typescript
  const gmvAchievementRate = (totalRevenue / targetGMV) * 100;
  ```
- **进度条展示**：当前GMV占目标的百分比
- **颜色规则**：
  - 达成率 >= 100%：绿色（超额完成）
  - 达成率 >= 80%：黄色（接近目标）
  - 达成率 < 80%：红色（需要关注）

##### ACOS（销售费率）
- **计算公式**：`(总Spend / GMV) * 100%`
  ```typescript
  const acos = (totalSpend / totalGMV) * 100; // 返回百分比值
  ```
- **Target Line（目标线）**：基于ROI目标的加权计算
  ```typescript
  // 计算Target Line：总预算 / 汇总单个筛选项（ROI与预算的加权）
  let weightedRoiSum = 0;
  let totalBudget = 0;
  
  configs.forEach(config => {
    if (config.targetType === 'ROI') {
      weightedRoiSum += config.budget * config.targetValue;
      totalBudget += config.budget;
    }
  });
  
  // Target Line = (总预算 / 加权GMV目标) * 100%
  const targetLine = (totalBudget / weightedRoiSum) * 100;
  ```
- **达成率**：`(总成交额 / 所有预算总和) * 100%`
  ```typescript
  const acosAchievementRate = (totalRevenue / totalBudget) * 100;
  ```
- **溢出比例（Deviation）**：`实际ACOS - Target Line`
  ```typescript
  const acosDeviation = acos - targetLine;
  ```
- **颜色规则**：
  - 溢出比例 > 0：红色警告（ACOS高于目标，成本过高）
  - 溢出比例 ≤ 0：绿色健康（ACOS低于目标，成本控制良好）
- **展示格式**：
  - 实际ACOS：25.5%
  - Target Line：20.0%
  - Deviation：+5.5%（红色）或 -3.2%（绿色）

##### Progress Metrics（进度指标）
- **Spend Pacing**：`实际消耗 / 总预算`
  ```typescript
  const spendPacing = totalSpend / totalBudget;
  ```
- **Time Progress**：基于投放周期配置计算
  ```typescript
  // 使用配置中心设置的投放周期
  // 如未设置，则使用全局日期筛选器的日期范围
  const campaignStartDate = config.campaignPeriod?.startDate || startDate;
  const campaignEndDate = config.campaignPeriod?.endDate || endDate;
  
  const timeProgress = (Date.now() - new Date(campaignStartDate).getTime()) / 
                       (new Date(campaignEndDate).getTime() - new Date(campaignStartDate).getTime());
  ```
- **Cycle Progress**：`Spend Pacing - Time Progress`
  - > 5%：红色（消耗过快，预算可能提前耗尽）
  - < -5%：黄色（消耗过慢，可能无法完成目标）
  - -5% ~ 5%：绿色（进度健康，消耗与时间匹配）

##### Strategy Decision Support（策略决策支持）
智能文案生成逻辑：
```typescript
if (cycleProgress > 0.05) {
  return "警告：当前消耗过快。建议收紧非核心出价，优先保障高ROI层级流量。";
} else if (cycleProgress < -0.05) {
  return "提示：当前消耗略慢。可尝试放宽核心受众受限，或追加 5-10% 爆款素材预算。";
} else {
  return "系统：当前进度稳健，维持现有策略，重点关注素材生命周期衰减。";
}
```

#### 4.3.2 Account Health（账户健康度）

##### ROI Efficiency
- **数据来源**：`purchase_value / spend`
- **健康标准**：`ROI >= (1 / targetAcos)`
- **状态显示**：
  - 达标：绿色脉冲点 + "Performance Target Met"
  - 未达标：黄色点 + "Below Optimized Goal"

##### CPA Analysis
- **计算公式**：`spend / purchases`
- **环比趋势**：inverse=true（下降为好）

##### Traffic Cost (CPM)
- **计算公式**：`(spend / impressions) * 1000`
- **业务含义**：Network Competitive Score（网络竞争强度）

##### 智能建议（Action）
```typescript
const getAccountHealthAction = () => {
  const targetRoi = 1 / metrics.targetAcos;
  
  if (roi < targetRoi && cpaDelta > 0.1) {
    return "Action: CPA 显著上涨且 ROI 低于预期。建议立即对高成本受众进行排除或关停。";
  }
  
  if (roi >= targetRoi && roiDelta > 0.05) {
    return "Action: 账户效率稳步提升。建议对表现最优的 20% 系列追加 10-15% 预算。";
  }
  
  return "Action: 核心指标表现平稳，维持现有出价策略，重点关注素材生命周期衰减。";
};
```

#### 4.3.3 Advertising Layers（广告层级分析）

##### 层级划分
| 层级 | 图标 | 颜色 | 核心KPI |
|------|------|------|---------|
| Awareness | Eye | 蓝色 | Impressions, CPM |
| Traffic | MousePointer2 | 靛蓝 | Link Clicks, CPC |
| Conversion | ShoppingBag | 绿色 | Revenue, ROI |

##### 数据聚合逻辑
```typescript
const layerAnalysis = useMemo(() => {
  const layers = {
    [CampaignLayer.AWARENESS]: { current: [], prev: [] },
    [CampaignLayer.TRAFFIC]: { current: [], prev: [] },
    [CampaignLayer.CONVERSION]: { current: [], prev: [] }
  };
  
  data.forEach(r => layers[classifyCampaign(r.campaign_name)].current.push(r));
  comparisonData.forEach(r => layers[classifyCampaign(r.campaign_name)].prev.push(r));
  
  return Object.entries(layers).map(([layer, sets]) => ({
    layer,
    metrics: calculateMetrics(sets.current),
    prevMetrics: calculateMetrics(sets.prev)
  }));
}, [data, comparisonData]);
```

##### 智能建议
```typescript
const getLayerAction = () => {
  const conversionLayer = layerAnalysis.find(l => l.layer === CampaignLayer.CONVERSION);
  
  if (conversionLayer && conversionLayer.metrics.roi < (1/targetAcos) * 0.8) {
    return "Action: 漏斗底层转化率偏低。建议优化 Landing Page 加载速度或增加中层流量引导。";
  }
  
  const trafficLayer = layerAnalysis.find(l => l.layer === CampaignLayer.TRAFFIC);
  if (trafficLayer && getDelta(trafficLayer.metrics.cpc, trafficLayer.prevMetrics.cpc) > 0.15) {
    return "Action: 流量成本 (CPC) 大幅波动。请检查各层级素材曝光频次，避免素材疲劳。";
  }
  
  return "Action: 各层级漏斗衔接顺畅，建议继续维持全链路投放配比。";
};
```

---

### 4.4 业务详情（BusinessLineTab）

#### 4.4.1 KPI选择器
支持切换分析维度：
- **ROI Efficiency**（roi）：投资回报率
- **CPC Cost**（cpc）：点击成本
- **Global CPM**（cpm）：千次展示成本

> **📌 变更说明**  
> GMV指标已从业务详情移除，统一在生意大盘（OverviewTab）中查看。

#### 4.4.2 四象限策略分析（Quadrant Analysis）

> **📌 功能融合说明**  
> 本模块融合了原执行诊断（ExecutionTab）功能，基于子项目（Ads Commander配置）进行多维度分析和Benchmark对比。

##### 四象限模型
基于子项目数据的Spend（X轴）和选定KPI（Y轴）划分四个象限：

**数据范围**：
- 仅分析当前选中的子项目（Ads Commander配置）数据
- 如未选择子项目，则分析全量数据

**阈值计算逻辑**：
- **X轴（Spend）默认值**：子项目所有Campaign的平均Spend
  ```typescript
  const avgSpend = campaigns.reduce((sum, c) => sum + c.spend, 0) / campaigns.length;
  ```
- **Y轴（KPI）默认值**：子项目目标KPI值（config.targetValue）
  ```typescript
  const targetKPI = selectedConfig?.targetValue || benchmarkKPI;
  ```

**当选择ROI时：**
| 象限 | 定义 | 策略 | 颜色 |
|------|------|------|------|
| **Q1 - Stars** | 高消耗 + 高ROI | Scale Budget (加速扩量) | 绿色 |
| **Q2 - Potential** | 低消耗 + 高ROI | Increase Volume (提价拓量) | 靛蓝 |
| **Q3 - Fixers** | 高消耗 + 低ROI | Funnel Optimization (优化转化) | 黄色 |
| **Q4 - Wasters** | 低消耗 + 低ROI | Pause & Re-evaluate (关停并重审) | 红色 |

**当选择CPC/CPM时：**
| 象限 | 定义 | 策略 | 颜色 |
|------|------|------|------|
| **Q1 - Efficient** | 高消耗 + 低成本 | 维持并扩量 | 绿色 |
| **Q2 - Potential** | 低消耗 + 低成本 | 加大投入测试 | 靛蓝 |
| **Q3 - Expensive** | 高消耗 + 高成本 | 优化出价策略 | 黄色 |
| **Q4 - Inefficient** | 低消耗 + 高成本 | 考虑暂停 | 红色 |

##### 阈值控制器

**Volume (Spend X)**
- 类型：滑动条
- 范围：0 - 子项目最大Spend * 1.2
- 步长：动态计算（范围的1%）
- **默认值**：子项目平均Spend
- 说明：调整消耗阈值，划分高低消耗
- 实时显示：当前阈值金额（如 $250.00）

**Efficiency (Y轴)**
- **ROI模式**：
  - 范围：0 - 子项目最大ROI * 1.2
  - 步长：0.1
  - **默认值**：子项目目标ROI（config.targetValue）
  - 说明：ROI越高越好
- **CPC/CPM模式**：
  - 范围：0 - 子项目最大成本 * 1.2
  - 步长：动态计算
  - **默认值**：子项目平均成本
  - 说明：成本越低越好（Y轴反向逻辑）

##### 散点图配置
- **数据粒度**：Campaign（系列级别）
- **数据来源**：当前选中子项目的所有Campaign
- **X轴**：Spend（消耗）
- **Y轴**：选定的KPI指标（ROI / CPC / CPM）
- **Z轴**：purchase_value（控制气泡大小，范围60-300）
- **参考线**：
  - 垂直线：X = xThreshold（灰色虚线，标注"平均Spend"）
  - 水平线：Y = yThreshold（灰色虚线，标注"目标KPI"）
- **交互功能**：
  - 点击气泡定位到详情表格对应Campaign
  - 选中项高亮显示（蓝色描边 + 不透明度100%）
  - 悬停显示详细数据（Campaign名称、Spend、KPI、象限）
  - 双击气泡自动展开该Campaign的AdSet列表

##### 象限筛选器
在散点图下方显示4个象限的筛选按钮：

```
[全部] [Q1 - Stars] [Q2 - Potential] [Q3 - Fixers] [Q4 - Wasters]
```

**功能说明**：
- 点击象限按钮，底部详情表格仅显示该象限的Campaign
- 支持多选（按住Ctrl/Cmd）
- 显示每个象限的项目数量（如"Q1 - Stars (5)"）
- 选中状态：按钮高亮 + 对应象限颜色背景

##### 象限统计卡片
在筛选器下方显示4个象限的统计卡片（仅当选择单个象限时展开）：

每个卡片包含：
- 象限名称 + 图标 + 颜色标识
- 项目数量（大号字体）
- 总消耗金额（Sum of Spend）
- 平均KPI值（Average KPI）
- **与子项目Benchmark对比**：
  - 平均Spend对比：+15% ↑ / -10% ↓
  - 平均KPI对比：+20% ↑ / -5% ↓
- 快速操作：
  - "查看列表"按钮：跳转到详情表格
  - "全部标记"按钮：将该象限所有项目添加到Todo

#### 4.4.3 Campaign Detailed Breakdown（层级钻取表格）

> **📌 功能增强说明**  
> 表格新增Benchmark对比、变化率显示和Todo标记功能，支持三级钻取分析。

##### 表格结构
```
Campaign（系列）- 可标记Todo
  ├─ AdSet（广告组）- 可标记Todo + 显示Benchmark
  │   ├─ Ad（广告创意）- 可标记Todo + 显示Benchmark
  │   ├─ Ad
  │   └─ ...
  ├─ AdSet
  └─ ...
```

##### 象限筛选联动
- 当选择象限筛选器时，表格仅显示对应象限的Campaign
- 表格顶部显示当前筛选状态（如"显示：Q1 - Stars (5个Campaign)"）
- 支持清除筛选，恢复显示全部Campaign

##### Campaign层级（一级）

**展示字段**：
| 字段 | 说明 | 格式 | 显示逻辑 |
|------|------|------|---------|
| 象限标识 | 所属象限 | 彩色圆点 + Q1/Q2/Q3/Q4 | 根据四象限位置自动标识 |
| Campaign Name | 系列名称 | 文本 | 可点击展开AdSet |
| Spend | 消耗 | $1,234.56 | 基础数据 |
| Spend Δ | 消耗变化率 | +15.2% ↑ | 对比期环比，绿色↑/红色↓ |
| 选定KPI | 当前KPI值 | 3.45x / $1.23 | 根据KPI选择器动态显示 |
| KPI Δ | KPI变化率 | +20.1% ↑ | 对比期环比 |
| Revenue | 成交额 | $12,345.67 | 基础数据 |
| 操作 | 标记/展开 | 按钮组 | 见下文 |

**操作按钮**：
- **展开按钮**（▶）：展开/收起AdSet列表
- **标记按钮**（⭐）：添加到Todo List
  - 未标记：灰色星标
  - 已标记：金色星标 + 提示"已添加到待办"
  - 点击后自动生成Todo项：
    ```
    来源：业务详情 - [子项目名称]
    名称：[Campaign Name]
    建议：[象限] - [策略建议]
    ```

##### AdSet层级（二级）

**展示字段**：
| 字段 | 说明 | 格式 | 显示逻辑 |
|------|------|------|---------|
| AdSet Name | 广告组名称 | 文本（缩进显示） | 可点击展开Ad |
| Spend | 消耗 | $234.56 | 基础数据 |
| Spend Δ | 消耗变化率 | +10.5% ↑ | 对比期环比 |
| **Spend vs Benchmark** | 与子项目平均对比 | +25% ↑ / -15% ↓ | 高于平均显示绿色，低于显示灰色 |
| 选定KPI | 当前KPI值 | 3.2x / $1.45 | 根据KPI选择器动态显示 |
| KPI Δ | KPI变化率 | +18.3% ↑ | 对比期环比 |
| **KPI vs Benchmark** | 与子项目平均对比 | +12% ↑ / -8% ↓ | 高于平均显示绿色，低于显示灰色 |
| Revenue | 成交额 | $2,345.67 | 基础数据 |
| 操作 | 标记/展开 | 按钮组 | 同Campaign层级 |

**Benchmark计算逻辑**：
```typescript
// 子项目所有AdSet的平均值
const benchmarkSpend = allAdSets.reduce((sum, a) => sum + a.spend, 0) / allAdSets.length;
const benchmarkKPI = allAdSets.reduce((sum, a) => sum + a.kpi, 0) / allAdSets.length;

// 对比百分比
const spendVsBenchmark = ((adset.spend - benchmarkSpend) / benchmarkSpend) * 100;
const kpiVsBenchmark = ((adset.kpi - benchmarkKPI) / benchmarkKPI) * 100;
```

**Benchmark显示规则**：
- **Spend vs Benchmark**：
  - > +10%：深绿色 + "↑↑"（显著高于平均）
  - +0% ~ +10%：浅绿色 + "↑"（略高于平均）
  - -10% ~ 0%：浅灰色 + "↓"（略低于平均）
  - < -10%：深灰色 + "↓↓"（显著低于平均）
- **KPI vs Benchmark**（ROI模式，越高越好）：
  - > +10%：深绿色 + "↑↑"
  - +0% ~ +10%：浅绿色 + "↑"
  - -10% ~ 0%：浅黄色 + "↓"
  - < -10%：深红色 + "↓↓"
- **KPI vs Benchmark**（CPC/CPM模式，越低越好）：
  - < -10%：深绿色 + "↓↓"（成本显著低于平均）
  - -10% ~ 0%：浅绿色 + "↓"
  - 0% ~ +10%：浅黄色 + "↑"
  - > +10%：深红色 + "↑↑"（成本显著高于平均）

##### Ad层级（三级）

**展示字段**：
| 字段 | 说明 | 格式 | 显示逻辑 |
|------|------|------|---------|
| Ad Name | 广告创意名称 | 文本（双缩进显示） | 最底层，不可展开 |
| Spend | 消耗 | $45.67 | 基础数据 |
| Spend Δ | 消耗变化率 | +8.2% ↑ | 对比期环比 |
| **Spend vs Benchmark** | 与子项目平均对比 | +30% ↑ / -20% ↓ | 同AdSet层级逻辑 |
| 选定KPI | 当前KPI值 | 3.8x / $1.12 | 根据KPI选择器动态显示 |
| KPI Δ | KPI变化率 | +25.6% ↑ | 对比期环比 |
| **KPI vs Benchmark** | 与子项目平均对比 | +18% ↑ / -5% ↓ | 同AdSet层级逻辑 |
| Revenue | 成交额 | $456.78 | 基础数据 |
| 操作 | 标记 | 按钮 | 仅标记按钮，无展开 |

**Benchmark计算逻辑**：
```typescript
// 子项目所有Ad的平均值
const benchmarkSpend = allAds.reduce((sum, a) => sum + a.spend, 0) / allAds.length;
const benchmarkKPI = allAds.reduce((sum, a) => sum + a.kpi, 0) / allAds.length;
```

##### 表格交互功能

**排序功能**：
- 点击列标题进行排序（升序/降序）
- 支持排序的列：Spend、Spend Δ、KPI、KPI Δ、Revenue
- 排序状态图标：▲（升序）/ ▼（降序）
- 默认排序：按Spend降序

**批量操作**：
- 表格顶部显示批量操作栏（当选中项 > 0时显示）
- 复选框：支持多选Campaign/AdSet/Ad
- 批量标记：将所有选中项添加到Todo List
- 批量导出：导出选中项数据为CSV

**分页逻辑**：
- 每页显示10个Campaign
- 点击"Previous" / "Next"切换页码
- 展开状态在翻页后保留
- 页码跳转：输入页码直接跳转

**搜索功能**：
- 表格顶部搜索框
- 支持按Campaign/AdSet/Ad名称模糊搜索
- 实时过滤，高亮匹配文本
- 搜索时自动展开包含匹配项的Campaign/AdSet

##### 空状态设计

**无数据时**：
- 显示空状态图标
- 提示文案："当前子项目暂无数据，请选择其他子项目或调整日期范围"

**筛选后无结果时**：
- 显示空状态图标
- 提示文案："当前象限暂无Campaign，请调整象限筛选或阈值设置"

---

### 4.5 执行诊断（ExecutionTab）

#### 4.5.1 视图切换
| 视图 | 分析维度 | 业务场景 |
|------|---------|---------|
| By Audience | adset_name | 受众表现诊断 |
| New Audience | adset_name | 新受众冷启动分析 |
| By Creative | ad_name | 素材效果透视 |

#### 4.5.2 数据处理逻辑

##### 环比Delta计算
```typescript
const getDelta = (curr: number, prev: number) => {
  if (prev <= 0) return 0;
  return (curr - prev) / prev;
};

// 为每个维度计算以下Delta
spendDelta: getDelta(currMetrics.spend, prevMetrics.spend)
roiDelta: getDelta(currMetrics.roi, prevMetrics.roi)
cpaDelta: getDelta(currMetrics.cpa, prevMetrics.cpa)
cpatcDelta: getDelta(currMetrics.cpatc, prevMetrics.cpatc)
atcRateDelta: getDelta(currMetrics.atc_rate, prevMetrics.atc_rate)
ctrDelta: getDelta(currMetrics.ctr, prevMetrics.ctr)
cpcDelta: getDelta(currMetrics.cpc, prevMetrics.cpc)
```

##### 新受众识别逻辑
```typescript
// 连续消耗天数 < 7天 判定为"新受众"
const sortedDates = [...new Set(currRecords.map(r => r.date))].sort();
const spendDays = new Set(currRecords.filter(r => r.spend > 0).map(r => r.date));

let maxConsecutive = 0;
let currentConsecutive = 0;

sortedDates.forEach(date => {
  if (spendDays.has(date)) {
    currentConsecutive++;
    maxConsecutive = Math.max(maxConsecutive, currentConsecutive);
  } else {
    currentConsecutive = 0;
  }
});

const isNew = maxConsecutive < 7;
```

#### 4.5.3 分组规则

##### By Audience视图

**表现优异（Top Performers）**
- **筛选条件**：
  - `ROI >= targetRoi * 1.2` 或
  - `ROI >= targetRoi && roiDelta > 0.1`
- **建议**：
  - roiDelta > 0：Scale (加速扩量)
  - 其他：Maintain (持续观察)

**表现较差（Underperformers）**
- **筛选条件**：
  - `ROI < targetRoi * 0.8` 或
  - `roiDelta < -0.2`
- **建议**：
  - roiDelta < -0.3：Critical Fix
  - 其他：Optimize Strategy

##### New Audience视图

**新受众诊断**
- **筛选条件**：`isNew === true`（连续消耗 < 7天）
- **建议**：
  - ROI > targetRoi：加预算 (Add Budget)
  - 其他：冷启动观察 (Warmup)

##### By Creative视图

**可扩量的素材（High Potential）**
- **筛选条件**：
  - `ROI > targetRoi * 1.3` 或
  - `ROI > targetRoi && roiDelta > 0.15`
- **建议**：
  - roiDelta > 0.1：Hot Item: Scale!
  - 其他：Stable Asset

**需优化的素材（Needs Optimization）**
- **筛选条件**：
  - `spend >= medianSpend` 且
  - (`ROI < targetRoi * 0.8` 或 `roiDelta < -0.2`)
- **建议**：Fix Funnel: AI Analysis

**常规素材（General Assets）**
- **筛选条件**：不属于以上两类
- **建议**：Monitoring

#### 4.5.4 全链路指标开关
点击"显示全链路指标"按钮，表格额外显示：
- **CPATC**：单次加购成本
- **ATC Rate**：加购转化率
- **CTR**：点击率
- **CPC**：单次点击成本

#### 4.5.5 待办清单集成
- 每行右侧显示"+"按钮
- 点击后将该项添加到Todo Tab
- 已添加项显示"✓"图标，按钮变为蓝色

#### 4.5.6 AI分析入口
- 每行最右侧显示"✨"按钮
- 点击后打开AIDrawer，传入该行完整数据
- 表现较差组的按钮为红色高亮

---

### 4.6 投放策略（QuadrantTab）

#### 4.6.1 四象限模型

基于Spend（X轴）和ROI（Y轴）划分四个象限：

| 象限 | 定义 | 策略 | 颜色 |
|------|------|------|------|
| **Q1 - Stars** | 高消耗 + 高ROI | Scale Budget (加速扩量) | 绿色 |
| **Q2 - Potential** | 低消耗 + 高ROI | Increase Volume (提价拓量) | 靛蓝 |
| **Q3 - Fixers** | 高消耗 + 低ROI | Funnel Optimization (优化转化) | 黄色 |
| **Q4 - Wasters** | 低消耗 + 低ROI | Pause & Re-evaluate (关停并重审) | 红色 |

#### 4.6.2 阈值控制器

**Volume (Spend X)**
- 类型：滑动条
- 范围：0 - 1000
- 步长：50
- 默认值：250

**Efficiency (ROI Y)**
- 类型：滑动条
- 范围：0 - 10
- 步长：0.1
- 默认值：benchmarks.targetRoi

#### 4.6.3 散点图配置
- **数据粒度**：adset_name
- **X轴**：Spend
- **Y轴**：ROI
- **Z轴**：purchase_value（控制气泡大小，范围60-300）
- **参考线**：
  - 垂直线：X = xThreshold（灰色虚线）
  - 水平线：Y = yThreshold（灰色虚线）

#### 4.6.4 象限卡片
每个象限显示一个卡片，包含：
- 标题 + 图标
- 项目数量（大号字体）
- 项目列表（最多显示，滚动查看）
  - 项目名称（截断显示）
  - ROI值
  - "+"按钮（添加到待办）

---

### 4.7 待办清单（TodoTab）

#### 4.7.1 数据模型（TodoItem）

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | string | 唯一标识（随机生成） |
| `source` | enum | 来源：Execution / Quadrant |
| `name` | string | 维度名称（adset_name或ad_name） |
| `recommendation` | string | 建议文案 |
| `timestamp` | number | 添加时间戳 |
| `completed` | boolean | 是否已完成 |

#### 4.7.2 功能列表

**添加任务**
- 从ExecutionTab或QuadrantTab点击"+"按钮
- 自动去重：相同name + source + recommendation不重复添加

**完成任务**
- 点击圆形勾选框切换完成状态
- 已完成任务显示在底部，带删除线样式

**删除任务**
- 单个删除：点击垃圾桶图标
- 批量删除：点击"清空已完成"按钮

**复制清单**
- 点击"复制清单"按钮
- 格式：`[TODO/DONE] Source - Name: Recommendation`
- 复制到剪贴板后弹窗提示

#### 4.7.3 空状态设计
无任务时显示：
- 空状态图标（ClipboardList）
- 提示文案："在 '执行诊断' 或 '投放策略' 中点击 '+' 图标，将具体的优化建议汇总到此处统一执行。"

---

### 4.8 AI诊断引擎（AIDrawer）

#### 4.8.1 触发条件
- 在ExecutionTab点击任意行的"✨"按钮
- 传入该行的完整聚合指标数据

#### 4.8.2 AI调用流程

**输入数据**
```typescript
{
  name: string,          // 维度名称
  spend: number,         // 消耗
  roi: number,           // ROI
  ctr: number,           // 点击率
  atc_rate: number,      // 加购率
  purchases: number,     // 购买次数
  cpa: number            // 获客成本
}
```

**Prompt模板**
```
Analyze the performance of this advertisement unit:
Name: ${record.name}
Spend: ${formatCurrency(record.spend)}
ROI: ${record.roi.toFixed(2)}x
CTR: ${formatPercent(record.ctr)}
Add to Cart Rate: ${formatPercent(record.atc_rate)}
Purchases: ${record.purchases}
CPA: ${formatCurrency(record.cpa)}

Provide a concise diagnosis and a specific strategy action recommendation.
```

**API配置**
- 模型：`gemini-3-flash-preview`
- 输出格式：JSON
- Schema定义：
  ```typescript
  {
    type: Type.OBJECT,
    properties: {
      insight: { type: Type.STRING, description: 'Diagnosis of the current performance' },
      action: { type: Type.STRING, description: 'Specific recommendation for next steps' }
    },
    required: ['insight', 'action']
  }
  ```

#### 4.8.3 UI展示
- **Target Objective**：分析目标（自动生成）
- **Key Insight**：AI诊断结果（insight字段）
- **Strategy Action**：AI建议（action字段）
- **Performance Recap**：关键指标回顾（4宫格）

#### 4.8.4 错误处理
- API调用失败时显示：
  - Insight: "An error occurred while analyzing the data with AI."
  - Action: "Please check your connectivity or try again later."

---

## 五、配置中心（Configuration Center）

### 5.1 业务线配置管理

#### 配置项字段
| 字段 | 说明 | 示例 |
|------|------|------|
| Strategy Name | 业务线名称 | Retargeting Scope |
| Level | 分析层级 | Campaign / AdSet / Ad |
| KPI Definition | 目标类型 + 目标值 | ROI Target: 4.5 |
| Budget Allocation | 预算分配 | $5,000 |
| Campaign Period | 投放周期设置 | 2024-01-01 至 2024-01-31 |
| Filtering Rules | 筛选规则列表 | 见下文 |

#### 投放周期设置
- **开始日期**：投放周期的起始日期（YYYY-MM-DD格式）
- **结束日期**：投放周期的结束日期（YYYY-MM-DD格式）
- **作用范围**：影响生意大盘中所有KPI的计算逻辑，包括：
  - GMV Achievement的目标值和达成率
  - ACOS的Target Line和溢出比例
  - Progress Metrics中的Time Progress计算
- **默认值**：如未设置，使用全局日期筛选器的日期范围

#### 筛选规则配置
每个配置可添加多条规则（AND逻辑）：
- **字段选择**：Campaign Name / Ad Set Name / Ad Name
- **操作符**：Contains / Exclude / Equals
- **匹配值**：文本输入

#### 默认配置
系统预置3个配置：
```typescript
[
  {
    name: 'Retargeting Scope',
    level: 'AdSet',
    budget: 5000,
    targetType: 'ROI',
    targetValue: 4.5,
    rules: [{ field: 'campaign_name', operator: 'contains', value: 'Retargeting' }]
  },
  {
    name: 'Top Funnel AW',
    level: 'Campaign',
    budget: 3000,
    targetType: 'CPM',
    targetValue: 8.5,
    rules: [{ field: 'campaign_name', operator: 'contains', value: 'AW' }]
  },
  {
    name: 'Main Conversion',
    level: 'Campaign',
    budget: 12000,
    targetType: 'ROI',
    targetValue: 2.8,
    rules: [{ field: 'campaign_name', operator: 'contains', value: 'CV' }]
  }
]
```

### 5.2 配置操作
- **新增配置**：点击"Expand Business Domain"按钮
- **编辑配置**：直接修改输入框内容
- **删除配置**：点击垃圾桶图标
- **添加规则**：点击"Add Rule"按钮
- **删除规则**：点击规则右侧的垃圾桶图标

### 5.3 配置生效
- 点击"Synchronize Commander"按钮保存
- **配置生效范围**：
  - ✅ 业务详情（BusinessLineTab）
  - ✅ 执行诊断（ExecutionTab）
  - ✅ 投放策略（QuadrantTab）
  - ✅ 待办清单（TodoTab）
  - ❌ 生意大盘（OverviewTab）- 始终使用全量数据
- 底部显示"Total Configured Budget"汇总

---

## 六、数据流与状态管理

### 6.1 全局状态
```typescript
const [data, setData] = useState<RawAdRecord[]>([]);              // 原始数据
const [configs, setConfigs] = useState<AdConfiguration[]>([]);    // 业务线配置
const [selectedConfigIds, setSelectedConfigIds] = useState<string[]>([]); // 选中的配置ID
const [startDate, setStartDate] = useState('');                   // 开始日期
const [endDate, setEndDate] = useState('');                       // 结束日期
const [compareMode, setCompareMode] = useState(true);             // 对比模式开关
const [todoList, setTodoList] = useState<TodoItem[]>([]);         // 待办清单
```

### 6.2 计算流程

#### 6.2.1 生意大盘（OverviewTab）数据流
```
原始数据(data) 
  → 日期筛选(startDate, endDate) 
  → ❌ 跳过配置筛选（始终使用全量数据）
  → overviewData
  → 聚合计算(calculateMetrics) 
  → OverviewTab展示
```

#### 6.2.2 其他模块数据流
```
原始数据(data) 
  → 日期筛选(startDate, endDate) 
  → ✅ 配置筛选(selectedConfigIds, configs) 
  → filteredData
  → 聚合计算(calculateMetrics) 
  → BusinessLineTab / ExecutionTab / QuadrantTab / TodoTab 展示
```

#### 6.2.3 筛选逻辑实现
```typescript
// OverviewTab: 不应用配置筛选
const overviewData = useMemo(() => {
  return data.filter(r => {
    const datePart = r.date.includes(' ') ? r.date.split(' ')[0] : r.date;
    const d = new Date(datePart + 'T00:00:00').getTime();
    return d >= startMs && d <= endMs; // 仅日期筛选
  });
}, [data, startDate, endDate]);

// 其他Tab: 应用配置筛选
const filteredData = useMemo(() => {
  return data.filter(r => {
    // 1. 日期筛选
    const datePart = r.date.includes(' ') ? r.date.split(' ')[0] : r.date;
    const d = new Date(datePart + 'T00:00:00').getTime();
    const dateMatch = d >= startMs && d <= endMs;
    if (!dateMatch) return false;
    
    // 2. 配置筛选
    if (selectedConfigIds.length === 0) return true; // 无筛选时显示全部
    const activeConfigs = configs.filter(c => selectedConfigIds.includes(c.id));
    return activeConfigs.some(config => matchesConfig(r, config)); // OR逻辑
  });
}, [data, startDate, endDate, selectedConfigIds, configs]);
```

### 6.3 对比数据计算
```typescript
const { filteredData, comparisonData } = useMemo(() => {
  // 1. 计算当前周期数据
  const main = filterByDateAndConfigs(data, startMs, endMs);
  
  // 2. 计算对比周期数据
  if (compareMode) {
    const durationMs = endMs - startMs;
    const compEndMs = startMs - oneDay;
    const compStartMs = compEndMs - durationMs;
    const comp = filterByDateAndConfigs(data, compStartMs, compEndMs);
    return { filteredData: main, comparisonData: comp };
  }
  
  return { filteredData: main, comparisonData: [] };
}, [data, startDate, endDate, compareMode, selectedConfigIds, configs]);
```

---

## 七、UI/UX设计规范

### 7.1 设计系统

#### 颜色规范
| 用途 | 颜色值 | 说明 |
|------|--------|------|
| 主色调 | `#4f46e5` (indigo-600) | 按钮、高亮 |
| 成功 | `#10b981` (emerald-500) | 正向趋势 |
| 警告 | `#f59e0b` (amber-500) | 中性提示 |
| 危险 | `#ef4444` (red-500) | 负向趋势 |
| 背景 | `#F1F5F9` (slate-100) | 页面底色 |

#### 字体规范
- **标题**：font-black (900), uppercase, tracking-tight
- **正文**：font-bold (700) / font-medium (500)
- **数值**：font-black, 大号字体
- **标签**：text-[10px], uppercase, tracking-widest

#### 圆角规范
- 卡片：rounded-[2rem] / rounded-[2.5rem]
- 按钮：rounded-xl (12px)
- 输入框：rounded-lg (8px)
- 标签：rounded-full

### 7.2 交互反馈

#### 趋势指示器（TrendChip）
```typescript
// Delta < 0.1%：中性（灰色，横线图标）
// Delta > 0：上升（绿色/红色，上升箭头）
// Delta < 0：下降（红色/绿色，下降箭头）
// inverse=true时颜色反转（如CPA下降为好）
```

#### 加载状态
- 文件上传：全屏遮罩 + 旋转图标 + "正在同步广告数据..."
- AI分析：抽屉内旋转图标 + "Aggregating funnel data..."

#### 空状态
- 无数据时显示大号图标 + 提示文案
- 颜色：opacity-20, text-slate-300

---

## 八、技术实现细节

### 8.1 性能优化

#### useMemo缓存
所有重计算逻辑使用useMemo缓存：
```typescript
const { filteredData, comparisonData } = useMemo(() => {
  // 复杂计算逻辑
}, [data, startDate, endDate, compareMode, selectedConfigIds, configs]);
```

#### 分页加载
BusinessLineTab表格采用分页（每页10条），避免大数据量渲染卡顿。

#### 虚拟滚动
待办清单和象限卡片使用`overflow-y-auto`实现滚动，限制DOM节点数量。

### 8.2 数据格式化工具

```typescript
// 货币格式化
export const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('en-US', { 
    style: 'currency', 
    currency: 'USD' 
  }).format(val);
};

// 百分比格式化
export const formatPercent = (val: number) => {
  return (val * 100).toFixed(2) + '%';
};
```

### 8.3 日期处理
```typescript
// 使用本地午夜时间避免时区问题
const getLocalMidnight = (dateStr: string) => {
  return new Date(dateStr + 'T00:00:00').getTime();
};

// 日期标签格式化
const formatDateToLabel = (dateStr: string) => {
  return dateStr.replace(/-/g, '/'); // 2024-01-10 → 2024/01/10
};
```

---

## 九、部署与环境配置

### 9.1 环境变量
创建`.env.local`文件：
```bash
API_KEY=your_gemini_api_key_here
```

### 9.2 安装依赖
```bash
npm install
```

### 9.3 本地运行
```bash
npm run dev
```

### 9.4 生产构建
```bash
npm run build
```

---

## 十、未来迭代规划

### 10.1 短期优化（1-2个月）
- [ ] 支持更多数据源（Google Ads, TikTok Ads）
- [ ] 自定义指标计算公式
- [ ] 导出分析报告（PDF/Excel）
- [ ] 历史数据对比（多周期对比）

### 10.2 中期规划（3-6个月）
- [ ] 自动化预警系统（邮件/Slack通知）
- [ ] 预算自动分配算法
- [ ] A/B测试分析模块
- [ ] 用户权限管理

### 10.3 长期愿景（6-12个月）
- [ ] 多账户聚合分析
- [ ] 预测性分析（机器学习）
- [ ] 移动端适配
- [ ] API开放平台

---

## 十一、附录

### 11.1 常见问题

**Q1: 为什么我的数据上传后显示为空？**
A: 请确保CSV/XLSX文件包含必需字段（Day, Campaign name, Spend等），且至少有一行有效数据。

**Q2: 环比数据为什么显示为0？**
A: 需要开启"Compare"开关，且对比周期内有数据。

**Q3: AI分析功能无法使用？**
A: 请检查`.env.local`文件中的`API_KEY`是否正确配置。

### 11.2 术语表

| 术语 | 英文 | 解释 |
|------|------|------|
| GMV | Gross Merchandise Volume | 成交总额 |
| ROI | Return on Investment | 投资回报率 |
| ACOS | Advertising Cost of Sales | 广告销售成本比 |
| CPA | Cost Per Acquisition | 单次获客成本 |
| CPC | Cost Per Click | 单次点击成本 |
| CPM | Cost Per Mille | 千次展示成本 |
| CTR | Click-Through Rate | 点击率 |
| CVR | Conversion Rate | 转化率 |
| AOV | Average Order Value | 客单价 |
| ATC | Add To Cart | 加购 |
| CPATC | Cost Per Add To Cart | 单次加购成本 |

---

**文档版本**：v1.0  
**最后更新**：2024-01-10  
**维护者**：Product Team

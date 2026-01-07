# 🎯 Ads Commander - Meta 广告调优系统

<div align="center">

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![React](https://img.shields.io/badge/React-19.2.3-61dafb.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8.2-3178c6.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

**专业级 Meta 广告投放分析与优化平台**

[功能特性](#-功能特性) • [快速开始](#-快速开始) • [使用指南](#-使用指南) • [技术架构](#-技术架构) • [数据模型](#-数据模型)

</div>

---

## 📖 项目简介

**Ads Commander** 是一款面向数字营销团队的专业级广告投放分析平台，通过数据可视化、智能诊断和 AI 辅助决策，帮助广告主实现 ROI 最大化和精细化运营。

### 核心价值

- 🎯 **全链路转化追踪** - 从曝光到成交的完整漏斗分析
- 🔍 **智能诊断引擎** - 自动识别表现异常的广告单元
- 📊 **四象限策略模型** - 基于数据的投放策略建议
- 🤖 **AI 辅助优化** - 集成 Gemini AI 提供深度洞察

### 目标用户

- 电商广告投放团队
- 数字营销优化师
- 广告代理商运营人员
- 品牌营销负责人

---

## ✨ 功能特性

### 1️⃣ 生意大盘（Business Outcome）

全局视角监控账户整体健康状况：

- **业务结果指标**
  - GMV Achievement - 成交额达成率
  - ACOS - 广告销售成本比
  - Spend Pacing - 预算消耗进度
  - ROI Efficiency - 投资回报效率

- **广告层级分析**（Advertising Layers）
  - **Awareness** - 品牌曝光层（Impressions, CPM, Spend）
  - **Traffic** - 流量获取层（Clicks, CPC, CTR）
  - **Conversion** - 转化成交层（Revenue, ROI, Spend）
  - 所有指标支持环比对比，实时显示变化趋势

### 2️⃣ 业务详情（Business Line）

多维度业务线分析与优化：

- **四象限策略分析**
  - 基于 Spend（消耗）和 KPI（ROI/CPC/CPM）的二维分类
  - 智能推荐：Stars（扩量）、Potential（提价）、Fixers（优化）、Wasters（关停）
  - 可调节阈值，自定义象限划分

- **三级钻取表格**
  - Campaign → AdSet → Ad 层级展开
  - Benchmark 对比（与子项目平均值对比）
  - 环比趋势分析（与上一周期对比）
  - 一键标记待办事项

- **象限筛选联动**
  - 点击象限快速过滤数据
  - 散点图与表格实时联动
  - 支持批量操作和导出

### 3️⃣ 新受众分析（New Audience）

专注于新受众冷启动分析：

- 自动识别连续消耗 < 7 天的新受众
- 评估新受众表现（优秀/观察/警告）
- 提供针对性的预算调整建议
- 支持快速标记和跟踪

### 4️⃣ 行动清单（Action Items）

AI 驱动的智能优化建议：

- **自动生成优化建议**
  - 基于四象限模型的策略推荐
  - 结合历史趋势的智能诊断
  - 优先级排序（Critical/High/Medium/Low）

- **Gemini AI 深度分析**
  - 一键生成详细优化方案
  - 多维度数据洞察
  - 可执行的行动步骤

- **待办事项管理**
  - 从各模块快速标记
  - 集中管理和跟踪
  - 支持导出和分享

### 5️⃣ 业务线配置（Business Lines）

灵活的业务线管理：

- **多业务线支持**
  - 自定义业务线名称和预算
  - 设置目标 KPI（ROI/CPC/CPM）
  - 配置投放周期

- **智能筛选规则**
  - 基于 Campaign/AdSet/Ad 名称的规则匹配
  - 支持 contains/not_contains/equals 操作符
  - AND 逻辑组合多条规则

- **层级分析配置**
  - 自定义 Awareness/Traffic/Conversion 识别关键词
  - 灵活适配不同命名规范

---

## 🚀 快速开始

### 环境要求

- **Node.js** >= 18.0.0
- **npm** >= 9.0.0

### 安装步骤

1. **克隆项目**
   ```bash
   git clone <repository-url>
   cd "Meta ad action调优系统"
   ```

2. **安装依赖**
   ```bash
   npm install
   ```

3. **配置环境变量**（可选）
   
   如需使用 AI 功能，创建 `.env.local` 文件：
   ```bash
   VITE_GEMINI_API_KEY=your_gemini_api_key_here
   ```

4. **启动开发服务器**
   ```bash
   npm run dev
   ```

5. **访问应用**
   
   打开浏览器访问：`http://localhost:3000/meta-ad-commender/`

### 构建生产版本

```bash
npm run build
npm run preview
```

---

## 📘 使用指南

### 第一步：上传数据

1. 从 Meta Ads Manager 导出广告报表（CSV 或 XLSX 格式）
2. 点击"选择 CSV 或 XLSX"按钮上传文件
3. 系统自动解析并映射字段

**支持的字段**：
- Day（日期）
- Campaign name（系列名称）
- Ad set name（广告组名称）
- Ad name（广告名称）
- Amount spent (USD)（消耗）
- Impressions（展示）
- Link clicks（点击）
- Purchases（购买）
- Purchases conversion value（GMV）
- Adds to cart（加购）
- Checkouts initiated（结算）

### 第二步：配置业务线

1. 点击顶部"Business Lines"按钮
2. 添加或编辑业务线配置：
   - 设置业务线名称（如"AO"、"AI"）
   - 配置预算和目标 KPI
   - 设置筛选规则（如 campaign_name contains "-AO"）
   - 定义投放周期
3. 保存配置

### 第三步：分析数据

1. **选择日期范围**
   - 使用顶部日期选择器
   - 勾选"compare"启用环比对比

2. **查看生意大盘**
   - 监控整体 GMV、ACOS、ROI
   - 分析各层级表现（Awareness/Traffic/Conversion）
   - 所有指标显示环比变化百分比

3. **深入业务详情**
   - 切换到"Business Line"标签
   - 选择业务线和 KPI 维度
   - 使用四象限分析识别优化机会
   - 钻取到 Campaign/AdSet/Ad 查看详情

4. **关注新受众**
   - 切换到"New Audience"标签
   - 查看新受众表现
   - 及时调整预算策略

5. **生成行动清单**
   - 点击"生成 Action"按钮
   - 查看 AI 生成的优化建议
   - 标记重要事项到待办

### 第四步：执行优化

根据系统建议执行优化操作：

- **Stars（明星）** → 加速扩量，提高预算
- **Potential（潜力）** → 提价拓量，增加曝光
- **Fixers（修复）** → 优化转化，改进素材
- **Wasters（浪费）** → 关停并重审，停止投放

---

## 🏗️ 技术架构

### 技术栈

| 类别 | 技术 | 版本 |
|------|------|------|
| **前端框架** | React | 19.2.3 |
| **类型系统** | TypeScript | 5.8.2 |
| **构建工具** | Vite | 6.2.0 |
| **图表库** | Recharts | 3.6.0 |
| **图标库** | Lucide React | 0.562.0 |
| **数据解析** | XLSX.js | 0.18.5 |
| **CSV 解析** | PapaParse | 5.4.1 |
| **AI 集成** | Google Gemini | 1.34.0 |

### 项目结构

```
Meta ad action调优系统/
├── components/              # React 组件
│   ├── tabs/               # 标签页组件
│   │   ├── OverviewTab.tsx        # 生意大盘
│   │   ├── BusinessLineTab.tsx    # 业务详情
│   │   ├── NewAudienceTab.tsx     # 新受众分析
│   │   ├── ActionItemsTab.tsx     # 行动清单
│   │   ├── DrillDownTable.tsx     # 钻取表格
│   │   ├── QuadrantChart.tsx      # 四象限图
│   │   └── ...
│   ├── filters/            # 筛选器组件
│   ├── diagnostics/        # 诊断组件
│   ├── ConfigModal.tsx     # 配置弹窗
│   ├── DateRangePicker.tsx # 日期选择器
│   ├── FileUpload.tsx      # 文件上传
│   └── LayerConfigModal.tsx # 层级配置
├── utils/                  # 工具函数
│   ├── dataUtils.ts        # 数据处理
│   ├── quadrantUtils.ts    # 四象限逻辑
│   ├── ruleEngine.ts       # 规则引擎
│   └── ...
├── types.ts                # TypeScript 类型定义
├── App.tsx                 # 主应用组件
├── index.tsx               # 应用入口
├── index.css               # 全局样式
├── vite.config.ts          # Vite 配置
└── package.json            # 项目配置
```

### 数据流架构

```
原始数据上传 → 字段映射 → 数据聚合 → 指标计算 → 多维分析 → 可视化呈现
     ↓            ↓          ↓          ↓          ↓          ↓
  CSV/XLSX    自动识别    按层级/     ROI/CPA/   四象限/    图表/表格
   文件       Meta字段    业务线聚合   CTR等计算   趋势分析    展示
```

---

## 📊 数据模型

### 核心指标计算公式

| 指标 | 公式 | 说明 |
|------|------|------|
| **ROI** | `GMV / Spend` | 投资回报率（越高越好）|
| **ACOS** | `Spend / GMV × 100%` | 广告销售成本比（越低越好）|
| **CPA** | `Spend / Purchases` | 单次购买成本（越低越好）|
| **CPC** | `Spend / Link Clicks` | 单次点击成本（越低越好）|
| **CTR** | `Link Clicks / Impressions × 100%` | 点击率（越高越好）|
| **CPM** | `Spend / Impressions × 1000` | 千次展示成本（越低越好）|
| **CVR** | `Purchases / Link Clicks × 100%` | 购买转化率（越高越好）|
| **AOV** | `GMV / Purchases` | 客单价（越高越好）|
| **ATC Rate** | `Adds to Cart / Link Clicks × 100%` | 加购转化率（越高越好）|

### 四象限分类逻辑

**ROI 模式**（Y 轴越高越好）：

| 象限 | 定义 | 策略 |
|------|------|------|
| **Q1 - Stars** | 高消耗 + 高 ROI | 🚀 Scale Budget（加速扩量）|
| **Q2 - Potential** | 低消耗 + 高 ROI | 📈 Increase Volume（提价拓量）|
| **Q3 - Fixers** | 高消耗 + 低 ROI | 🔧 Optimize Funnel（优化转化）|
| **Q4 - Wasters** | 低消耗 + 低 ROI | ⛔ Pause & Re-evaluate（关停重审）|

**CPC/CPM 模式**（Y 轴越低越好）：

| 象限 | 定义 | 策略 |
|------|------|------|
| **Q1 - Efficient** | 高消耗 + 低成本 | ✅ 维持并扩量 |
| **Q2 - Potential** | 低消耗 + 低成本 | 🧪 加大投入测试 |
| **Q3 - Expensive** | 高消耗 + 高成本 | 💰 优化出价策略 |
| **Q4 - Inefficient** | 低消耗 + 高成本 | ⚠️ 考虑暂停 |

### 广告层级分类

基于命名规范自动识别：

| 层级 | 识别关键词 | 核心指标 | 业务目标 |
|------|-----------|---------|---------|
| **Awareness** | -AW-, AWARENESS | Impressions, CPM, Spend | 品牌曝光 |
| **Traffic** | -TR-, TRAFFIC | Clicks, CPC, CTR | 流量获取 |
| **Conversion** | -CV-, -N2-, CONVERSION | Revenue, ROI, Spend | 转化成交 |

---

## 🔧 配置说明

### 业务线配置示例

```typescript
{
  id: '1',
  name: 'AO',                    // 业务线名称
  level: 'Campaign',             // 分析层级
  budget: 5000,                  // 预算（美元）
  targetType: 'ROI',             // 目标类型
  targetValue: 4.5,              // 目标值
  rules: [                       // 筛选规则
    { 
      field: 'campaign_name', 
      operator: 'contains', 
      value: '-AO' 
    }
  ],
  campaignPeriod: {              // 投放周期
    startDate: '2025-12-01',
    endDate: '2025-12-31'
  }
}
```

### 层级配置示例

```typescript
{
  awareness: {
    keywords: ['AW', 'AWARENESS'],
    caseSensitive: false
  },
  traffic: {
    keywords: ['TR', 'TRAFFIC'],
    caseSensitive: false
  },
  conversion: {
    keywords: ['CV', 'N2', 'CONVERSION'],
    caseSensitive: false
  }
}
```

---

## 📝 常见问题

### Q: 支持哪些数据格式？
A: 支持 CSV 和 XLSX 格式，推荐直接从 Meta Ads Manager 导出。

### Q: 如何设置对比周期？
A: 勾选顶部的"compare"选项，系统会自动计算同等时长的前一周期数据。

### Q: 四象限阈值如何确定？
A: 系统默认使用子项目平均值作为阈值，您也可以手动调节滑动条自定义阈值。

### Q: 新受众如何定义？
A: 连续消耗天数 < 7 天的受众被识别为新受众。

### Q: AI 功能需要配置吗？
A: 需要在 `.env.local` 中配置 `VITE_GEMINI_API_KEY`，获取 API Key 请访问 [Google AI Studio](https://ai.google.dev/)。

### Q: 数据会上传到服务器吗？
A: 不会。所有数据处理都在本地浏览器中完成，确保数据安全。

### Q: Advertising Layers 中哪些指标显示对比百分比？
A: 所有指标都显示对比百分比，包括：
- **Awareness 层**：Impressions, CPM, Spend
- **Traffic 层**：CTR, CPC, Clicks
- **Conversion 层**：ROI, Revenue, Spend

---

## 🛣️ 开发路线图

- [x] Phase 1: 核心功能实现
  - [x] 数据上传与解析
  - [x] 生意大盘
  - [x] 业务详情与四象限分析
  - [x] 新受众分析
  - [x] AI 行动清单
  - [x] Advertising Layers 全指标对比

- [ ] Phase 2: 功能增强（规划中）
  - [ ] 历史数据对比（多周期）
  - [ ] 自定义报表导出
  - [ ] 邮件通知与预警
  - [ ] 多账户管理

- [ ] Phase 3: 高级功能（规划中）
  - [ ] 预测模型（ROI 预测）
  - [ ] 自动化规则引擎
  - [ ] 协作与权限管理
  - [ ] API 集成

---

## 📄 许可证

MIT License

---

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

---

## 📧 联系方式

如有问题或建议，请通过以下方式联系：

- 提交 GitHub Issue
- 发送邮件至：support@adscommander.com

---

<div align="center">

**Built with ❤️ by Digital Marketing Team**

⭐ 如果这个项目对你有帮助，请给我们一个 Star！

</div>

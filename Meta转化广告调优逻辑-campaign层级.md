# Meta 转化广告调优逻辑 - Campaign 层级

## 广告调优决策流程表

| 第0步<br/>前提条件 | 第1步<br/>核心异常场景 | 第2步<br/>下钻检查指标 | 第3步<br/>判定条件 | 第4步<br/>归因诊断 | 第5步<br/>Action建议 |
|---|---|---|---|---|---|
| **Spend ≥ 1 × Avg CPA** | **1. CPA异常高** | CPC | > Benchmark 50% | 流量成本过高 | - |
| | | CVR | < Benchmark 50% | 转化能力不足 | - |
| | | CPC & CVR | CPC高 且 CVR低 | Double Kill（哪哪都不行） | 建议直接关停。流量贵且承接差，通常意味着选品失败或素材严重老化 |
| **Spend ≥ 1 × Avg CPA** | **2. CVR异常低** | Click-to-PV Rate | < Benchmark 50% | 加载速度 / 误触 | 可能是：<br/>1. 落地页加载过慢，请优先优化移动端 LCP<br/>2. 投放版位问题，排查广告版位 |
| | | ATC Rate | < Benchmark 50% | 吸引力不足 / 不匹配 | 页面吸引力不足<br/>1. 检查首屏信息传递、价格竞争力<br/>2. 排查素材承诺与落地页内容是否货不对板 |
| | | Checkout Rate | < Benchmark 50% | 运费 / 信任感 | 购物车流失严重<br/>1. 检查运费是否过高劝退<br/>2. 是否存在隐形费用、绑定费用<br/>3. 页面缺乏信任背书 |
| | | Purchase Rate | < Benchmark 50% | 技术故障 / 支付通道 | 支付成功率异常<br/>1. 可能存在支付通道技术故障，需测试下单检查路径 |
| **Impressions ≥ 1000** | **3. CPC异常高** | CTR | < Benchmark 50% | 素材 / 受众问题 | 素材缺乏吸引力（前3秒完播率低）或受众疲劳<br/>1. 优化素材<br/>2. 优化受众 |
| | | CPM | CTR正常 但 CPM高 | 市场竞价 / 人群贵 | 素材表现正常，但市场竞争过热<br/>1. 放宽定向或避开竞价高峰 |
| **Spend ≥ 1 × Avg CPATC** | **4. CPATC异常高** | ATC Rate | < Benchmark 50% | 素材与页面不符 | 素材与LP信息有偏差、不一致，用户被素材吸引点击，但发现落地页不是想要的，导致加购成本极高<br/>1. 优化素材&LP |
| **Campaign = Active**<br/>**且 Adset ≥ 3** | **5. Spent异常：预算太少** | / | < 1 × Avg CPA<br/>(平均每个组消耗太小) | 预算过度分散 | 预算被严重稀释：Campaign预算只有 $100 但开了 10 个组，平均每组 $10 无法支撑转化<br/>1. 关停表现差的组，集中预算<br/>2. 增加总预算 |
| **Active > 24h**<br/>(新广告消耗慢是正常的) | **6. Spent异常：花费不出去** | / | < 80%<br/>(给了钱却花不出去) | 竞价/受众过窄 | Delivery Issue<br/>1. 出价过低：若使用 Cost Cap，建议提价<br/>2. 受众过窄/耗尽：检查 Frequency 是否过高，建议放宽定向<br/>3. 质量太差：检查质量分，被系统降权 |

---

## 关键指标说明

### 前提条件（第0步）
- **Spend ≥ 1 × Avg CPA**：花费至少达到平均单次转化成本，确保有足够数据支撑分析
- **Impressions ≥ 1000**：曝光量至少1000次，确保素材有足够展示
- **Campaign = Active 且 Adset ≥ 3**：广告系列活跃且包含3个以上广告组
- **Active > 24h**：广告运行超过24小时（新广告学习期除外）

### 核心异常场景（第1步）
1. **CPA异常高**：单次转化成本过高
2. **CVR异常低**：转化率过低
3. **CPC异常高**：单次点击成本过高
4. **CPATC异常高**：加购成本过高
5. **Spent异常：预算太少**：预算分配不合理
6. **Spent异常：花费不出去**：投放受限

### 判定标准（第3步）
- **Benchmark 50%**：低于基准值的50%视为异常
- **> Benchmark 50%**：高于基准值的50%视为异常

### 常见缩写
- **CPA**：Cost Per Action（单次转化成本）
- **CVR**：Conversion Rate（转化率）
- **CPC**：Cost Per Click（单次点击成本）
- **CTR**：Click-Through Rate（点击率）
- **CPM**：Cost Per Mille（千次曝光成本）
- **CPATC**：Cost Per Add To Cart（加购成本）
- **ATC**：Add To Cart（加入购物车）
- **LP**：Landing Page（落地页）
- **LCP**：Largest Contentful Paint（最大内容绘制时间）
- **PV**：Page View（页面浏览）

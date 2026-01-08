

## 一、诊断流程总览

本调优逻辑基于ROI表现，采用7步诊断法，从前提条件到Action建议，层层下钻定位问题根源。


## 二、异常场景诊断清单

Benchmark为当前业务线的campaign某一指标的均值
注意若指标为两数相除，则一定要计算分子总和/分母总和，再做均值计算。

### **场景1：CPA异常高**
**触发条件**：Spend ≥ 1 * Avg CPA

#### 1.1 CPC（流量成本）过高
- **检查指标**：CPC = Spend / Link Clicks
- **判定条件**：> Benchmark 10%
- **归因诊断**：流量成本过高
- **Action建议**：请排查CPC是否异常排查素材或竞价贵

#### 1.2 CVR（转化能力）不足
- **检查指标**：CVR = Purchases / Link Clicks
- **判定条件**：< Benchmark 10%
- **归因诊断**：转化能力不足
- **Action建议**：请排查CVR是否异常，排查漏斗流失点

#### 1.3 CPC高且CVR低（Double Kill）
- **检查指标**：CPC = Spend / Link Clicks。    
- **检查指标**：CVR = Purchases / Link Clicks   < Benchmark 10%
- **判定条件1**：CPC  > Benchmark 10%
- **判定条件2**：CVR< Benchmark 10%
- **归因诊断**：流量贵且转化差
- **Action建议**：请排查AOV是否异常，若AOV正常则转人工判断是否关停

---

### **场景2：AOV异常低**
**触发条件**：Spend ≥ 1 * Avg CPA

- **检查指标**：AOV = Purchase_Value / Purchases
- **判定条件**：< Benchmark 40%
- **归因诊断**：人群消费力低 / 素材误导

**Action建议：**
1. **素材问题**：检查是否在用低价配件（如线材）做素材，建议改推高客单价的主机/Bundle；在落地页加Bundle的Variant，引导用户提高单价
2. **受众问题**：当前人群消费力弱，建议调整为Max conv. value的Performance Goal或排除低收入人群/配件人群
3. **落地页问题**：
   - 在落地页/购物车页增加"Frequently Bought Together"组合购插件，或设置阶梯折扣（买2件9折）
   - 检查免邮门槛，将免邮门槛设定在AOV的1.2倍（如AOV=$40则免邮线设$49），并在购物车顶部加进度条提示"再买$9免邮"

---

### **场景3：CVR异常低**
**触发条件**：Spend ≥ 1 * Avg CPA

#### 3.1 Click-to-PV Rate低
- **检查指标**：Landing Page Views / Link Clicks
- **判定条件**：< Benchmark 10%
- **归因诊断**：加载速度 / 误触
- **Action建议**：
  - 优化移动端LCP，压缩图片（TinyPNG），检查插件数量或服务器地区
  - 排查广告版位，重点关注是否过多投放到AN版位

#### 3.2 ATC Rate低
- **检查指标**：Adds to Cart / Landing Page Views
- **判定条件**：< Benchmark 10%
- **归因诊断**：吸引力不足 / 不匹配
- **Action建议**：
  - **页面吸引力不足**：排查素材与落地页是否货不对板；检查首屏信息传递；检查价格竞争力；将Reviews挪到首屏；增加Trust Badge；检查移动端"加购按钮"是否悬浮（Sticky ATC）
  - **流量不准**：查Breakdown（Age），若某年龄段花费>10%预算且0转化则排除；检查Audience Network是否消耗过大；排除点击高但加购低的国家/州
  - **缩小受众**：IG加must also match；LAL改用Purchase（Value-based）做种子；排除"Flash Sale Seekers" (如果你的品很贵)

#### 3.3 Checkout Rate低
- **检查指标**：Initiated Checkouts / Adds to Cart
- **判定条件**：< Benchmark 10%
- **归因诊断**：运费 / 信任感
- **Action建议**：购物车流失严重，检查运费是否过高；检查是否强制注册（建议开启Guest Checkout）；检查隐形费用；排查背书/价格问题

#### 3.4 Purchase Rate低
- **检查指标**：Purchases / Initiated Checkouts
- **判定条件**：< Benchmark 10%
- **归因诊断**：技术故障 / 支付通道
- **Action建议**：测试下单检查支付路径（PayPal/信用卡等）

---

### **场景4：CPC异常高**
**触发条件**：Impressions ≥ 1000

#### 4.1 CTR低
- **检查指标**：CTR = Link Clicks / Impressions
- **判定条件**：< Benchmark 10%
- **归因诊断**：素材 / 受众问题
- **Action建议**：
  - **素材疲劳**：静态图改轮播（多角度展示）；视频改静态图拼贴（截取4个瞬间）；视频改GIF（3秒微动图循环）
  - **素材缺乏吸引力**：
    - 视频：剪掉前3秒，换成倒放画面、强烈对比图或满屏大字幕提问；调整视频首帧
    - 单图：加Text Overlay（如"50% OFF"）；裁剪构图放大细节；换高饱和度背景色
    - 轮播：换首图, 把“效果最炸裂的图”或“痛点最痛的图”挪到第一张。；在第一张图右侧加箭头引导滑动暗示用户“后面还有内容”，诱导滑动。
  - 优化受众，更换新人群

#### 4.2 CPM高
- **检查指标1**：CPM = (Spend / Impressions) * 1000
- **检查指标2**：CTR = Link Clicks / Impressions
- **判定条件1**：CPM > Benchmark 10%
- **判定条件2**：CTR > Benchmark 10%
- **归因诊断**：市场竞价 / 人群贵
- **Action建议**：
  - **素材表现正常，但市场竞争过热（竞品上新/大促等）**：
    1-放宽定向
    a. 通投： 直接移除所有 Interest 标签，仅保留 Age/Gender/Geo，让算法自动寻人 (Broad Targeting)。
    b 智能扩量： 勾选 "Advantage+ Audience" 选项。
    c. LAL 进阶： 如果在跑 LAL 1%，尝试新建组跑 LAL 5% 或 10%。
    d. 国家合并： 如果分开跑 UK/DE/FR，尝试合并为一个 "Tier 1 Europe" 大组。
    2-避开竞价高峰

---

### **场景5：Spent异常 - 预算太少**
**触发条件**：Campaign = Active且Adset ≥ 3

- **检查指标**：Campaign_Budget / Active_Ad_Set_Count
- **判定条件**：< 1 * Avg CPA（平均每个组消耗太小）
- **归因诊断**：预算过度分散
- **Action建议**：
  - **预算被严重稀释**：
    1-关停表现差的组，集中预算；
    2-增加总预算
    3-缩小受众

---

### **场景6：Spent异常 - 花费不出去**
**触发条件**：Active > 24h（新广告消耗慢正常）

- **检查指标**：Spend / Daily_Budget
- **判定条件**：< 80%（给了钱却花不出去）
- **归因诊断**：竞价/受众过窄
- **Action建议**：
  - **出价过低**：Cost Cap建议提价，或改用Highest Volume（Lowest Cost）并取消Cost Cap限制
  - **受众过窄/耗尽**：检查Frequency是否过高，建议放宽定向
  - **质量太差**：检查质量分是否被系统降权

---

## 三、趋势逻辑与决策(步骤5、6)

**ROI趋势判断标准：**
- **回暖**：L3D_ROI > L7D_ROI * 110%
  - 情况1：且L3D_ROI < benchmark → 执行优化Action
  - 情况2：且L3D_ROI > benchmark → 拦截优化Action，保留1-2天观察
- **恶化**：L3D_ROI < L7D_ROI * 90% → 执行优化Action
- **平稳**：L7D_ROI * 90% < L3D_ROI < L7D_ROI * 110% → 执行优化Action

**决策原则**：即使ROI低于Benchmark，若趋势显示回暖（情况2），则步骤7的action建议则显示虽然 ROI 低于 Benchmark，但近期趋势显示回暖，暂不执行关停/调整，保留关停1-2天。

---


# 《开店模拟器》PRD v1.0（工程化玩法策划稿）
> 目标：把“好玩点子”落成 **可实现、可配置、可迭代** 的微信小游戏版本。  
> 形态：微信小游戏（Cocos 2D），竖屏，文字事件驱动模拟经营。  
> 时间口径：**1回合=1月**；**1年=12月**（游戏口径，不追求现实精确）。  
> 注：历史字段名中含 `week/weekly` 的仍保留，文中如出现“周”相关表述，均按“月口径”理解。  

---

## 0. 文档使用说明
- 本 PRD 面向：程序、策划、数值、美术、QA。
- “必须写死的规则”写在 **【硬规则】** 标签下，避免实现/策划口径漂移。
- 所有可调参项收敛到 `config/*.json`（或 ScriptableObject/CSV），避免散落在代码里。

---

## 1. 产品概述

### 1.1 一句话卖点
用中产的一点积蓄开店，在房租/员工/平台抽成/舆论/政策与荒诞世界事件里挣扎求生；每月一次选择，越玩越上头。

### 1.2 核心体验三要素
1) **真实残酷**：现金流、租金、抽成、缺人、临检、疾病等持续压力  
2) **现实讽刺**：加盟坑、培训割韭菜、流量绑架、评分体系、资本话术  
3) **荒诞出戏**：外星人、玄学风水、离谱顾客、奇怪世界事件（但依然能结算）

### 1.3 单局目标与节奏
- 新手期：前 12 月（快速入坑）
- 后续：无限回合
- 长线追求：资产、成就、存活月数、传承代数（后续版本）

---

## 2. 【硬规则】回合推进与结算顺序（必须一致）
> 这是“数值稳定性”的关键，任何人改顺序都需要重新评审。

每回合（每月）固定顺序：

1. **回合开始**：读取存档（玩家、所有店铺、员工、flags、世界事件状态）
2. **生成事件候选并抽取**：每次交互抽取 **1 个交互事件**
3. **玩家选择与检定**：应用选项效果 `effects`（即时写入存档）
4. **经营结算**：计算每家店堂食/外卖收入与成本，得到 `shop_monthly_profit`
5. **玩家结算**：汇总所有店利润，扣生活费/家庭费/贷款月还款，更新 `player.cash`
6. **状态结算**：更新 `stress/health/energy`（含自然恢复）
7. **时间推进**：`current_week += 1`（字段名保留，语义为“月”）；每 12 月 `age += 1`；世界事件持续时间递减
8. **死亡/破产判定**：破产、压力、疾病、年龄等

> 【硬规则】世界事件为“额外系统”，不占用每月 1 个交互事件名额；可影响经营结算的倍率/成本/概率。

---

## 3. 核心界面与页面结构（竖屏、单手可玩）

### 3.1 页面列表（MVP）
1) **Home/月事件页（主循环页）** ✅  
2) **店铺页（经营面板）** ✅  
3) **门面选择/调研页（开局+扩张复用）** ✅  
4) **招聘页（员工列表+招人）** ✅  
5) **成就页（含分享）** ✅  
6) **结算页（死亡/通关总结）** ✅  
7) **设置/帮助** ✅（含“数值口径说明”“广告说明”“隐私”）

### 3.2 主循环页（Home）
**顶部信息条**
- 月数、季节（可选）、当前激活的世界事件图标（最多显示 3 个，溢出进详情）

**核心面板（极简）**
- `cash`（现金）
- 本月净现金流（派生）
- `stress`（压力）
- `health`（健康）
- `age`（年龄）
- `reputation`（声望）

**事件卡区域**
- 标题 + 正文
- 3~4 个选项按钮（按钮上可显示成功率/代价提示）
- 选项有“隐藏/显示”逻辑（不可见不渲染）

**底部快捷入口**
- 店铺、招聘、情报（flags/世界事件）、成就/排行榜（后续可合并）

### 3.3 结算弹层（每月结束）
- 本月店铺利润汇总
- 单店明细（可折叠）
- 成本拆解：租金/人工/原料/平台抽成/推广/其他
- 压力/健康变化原因（简短文案：缺钱焦虑/缺人焦虑/差评焦虑等）
- 广告入口（可选）：结算加倍 / 减压 / 预知下月

---

## 4. 数值系统（存档值 vs 派生值）

### 4.1 玩家核心存档值（MVP 必须）
- `cash`：整数（元）
- `stress`：0~100
- `health`：0~100
- `age`：整数（岁）
- `reputation`：0~100
- `current_week`：整数（从 1 开始，字段名保留，语义为“月”）
- `living_expense`：每月生活费（整数）

（可选）  
- `energy`：精力（决定同月可做几件事；MVP 可不做，统一 1 事件/月）

### 4.2 店铺存档值（单店 MVP）
- `shop_id`
- `shop_type`
- `operation_mode`：original / franchise
- `brand_id`（加盟才有）
- 经营关键：`shop_rating`、`daily_customers`、`avg_ticket`、`open_days_per_week`
- 成本：`monthly_rent`、`monthly_labor_cost`、`monthly_utility_cost`、`monthly_marketing_cost`、`monthly_brand_fee`、`monthly_other_cost`
- 外卖（V1 可选做“简化版”）：`monthly_orders`、`delivery_avg_ticket`、`commission_rate`、`monthly_promo_budget`

### 4.3 派生值（不落库）
- `player_monthly_profit_total`：所有店铺月利润汇总（不含生活费/贷款）
- `monthly_net_cashflow`：店铺利润汇总 - 生活/家庭 - 贷款还款
- `total_asset`：现金 + 店铺估值 - 负债（估值可先简化）

### 4.4 经营结算公式（月口径）
常量：
- `MONTHS_PER_YEAR = 12`

收入：
- `dine_in_weekly_revenue = daily_customers * avg_ticket * open_days_per_week * season_modifier * holiday_modifier`
- `delivery_revenue = weekly_orders * delivery_avg_ticket`
- `shop_weekly_revenue = dine_in_weekly_revenue + delivery_revenue`

成本：
- `shop_weekly_fixed_cost = (monthly_rent + monthly_labor_cost + monthly_utility_cost + monthly_marketing_cost + monthly_brand_fee + monthly_other_cost)/4`
- `shop_weekly_cogs = shop_weekly_revenue * (1 - gross_margin)`
- `delivery_commission = delivery_revenue * commission_rate`
- `shop_weekly_delivery_cost = delivery_commission + weekly_promo_budget + platform_fixed_monthly_fee/4`
- `brand_royalty = operation_mode==franchise ? shop_weekly_revenue * royalty_rate : 0`
- `shop_weekly_cost = fixed + cogs + delivery_cost + brand_royalty`

利润：
- `shop_weekly_profit = shop_weekly_revenue - shop_weekly_cost`
- `player_weekly_profit_total = sum(shop_weekly_profit)`

玩家现金更新：
- `cash = cash + player_weekly_profit_total - living_expense - loan_weekly_payment_total`

---

## 5. 系统模块拆解（程序实现清单）

### 5.1 模块列表（MVP）
1) **GameState（存档）**：玩家/店铺/员工/flags/世界事件状态
2) **TurnEngine（回合引擎）**：按固定顺序推进一月
3) **EventSystem（交互事件）**：抽取事件、加载选项、判定可见、检定、应用效果
4) **EconomySystem（经营结算）**：收入成本利润
5) **StatusSystem（压力/健康）**：自然恢复与阈值死亡
6) **WorldEventSystem（世界事件）**：触发、持续、叠加、影响经营
7) **AdSystem（奖励广告）**：各广告入口配置、冷却、次数上限、奖励发放
8) **AchievementSystem（成就）**：条件解释器、奖励解释器
9) **UIFlow（界面状态机）**：月事件页→结果→结算→下一月/死亡
10) **Analytics（埋点）**：留存、广告、事件、失败原因

---

## 6. 事件系统（数据驱动，内容可持续生产）

### 6.1 数据结构（建议）
- `events.csv`：事件定义（title/description/conditions/pools/occurrence/weight_rules/tags...）
- `choices.csv`：事件选项（可见性/检定/结果效果 effects）
- 解析字段：
  - `*_json`：JSON 字符串（CSV 需双引号转义）

### 6.2 事件抽取逻辑（伪代码）
```text
bag = getBagByStage(current_week)
candidates = events where pools_json contains bag and stage range matches
candidates = filter by conditions_json (week/cash/stress/reputation/shop_type/flags...)
candidates = filter by occurrence_json (cooldown/max_total/once_only...)
weight = base pool weight * apply(weight_rules_json) * runtime_modifiers
pick one by weighted random
load choices by event_id
render visible choices by visibility_json
```

### 6.3 选项判定与效果应用
- `resolution_json.type = "prob"`：按 success_rate 判定成功/失败
- `outcomes_json.effects[]`：统一解释器执行（即时写入存档）

**建议支持的 effect.scope（MVP）**
- `stat`：对玩家/店铺核心数值 add/mul（如 cash/stress/reputation）
- `flag`：添加/移除/计数（可带 duration_turns）
- `bag_weight`：临时修正某个 bag 抽取权重（持续 X 月）
- `event_weight`：按 tags/条件修正事件权重（持续 X 月）

---

## 7. 世界事件系统（宏观持续影响）

### 7.1 触发与持续
- 每月结算开始时，对“未激活”的世界事件逐个做概率检定
- 持续月数：`duration_min~duration_max` 随机；`-1` 表示永久

### 7.2 叠加规则（必须写死）
- 倍率字段：相乘
- add 字段：相加
- 概率字段：独立检定
- 最终 clamp：客流倍率 [0, 3]；avg_ticket 最小 1

### 7.3 作用范围 scope
- global / regional / category / location（MVP 可先实现 global + category）

---

## 8. 广告系统（奖励式，玩家自愿）

### 8.1 广告入口分类（MVP 必做）
1) **信息类广告**（最自然、不破坏经济）
   - 门面/加盟/应聘者隐藏属性全揭示
   - 预知下月事件标题/标签

2) **续命类广告**
   - 死亡后复活（每局 1 次）：回到“上月结算前”或给保底现金（可配负面代价：声望-10、压力+10）

3) **结算类广告**
   - 本月净现金流加倍（只加倍正收益部分；亏损不加倍）

### 8.2 广告配置（建议放 config）
- 每入口：`max_per_run`、`cooldown_turns`、`reward_value`、`eligibility_conditions`
- 防刷：复活、加倍均设 **每局次数上限**；并在结算时展示“已使用/剩余次数”。

---

## 9. 成就系统（长线目标 + 分享节点）

### 9.1 解锁时机（必须写死）
- 每月结算完成后、死亡判定前检查成就

### 9.2 条件与奖励解释器
- 条件：比较表达式 `>=NUM` / `>NUM` / `=NUM` 等
- 奖励：cash/title/unlock/stress/ad_skip + 少量永久被动（低强度）

### 9.3 分享节点
- 获得成就
- 现金/市值新高
- 存活里程碑（10月、50月、100月…）
- 死亡结算（“你死于：房东、差评、外星人…”）

---

## 10. 状态机（UIFlow + GameFlow）

### 10.1 UIFlow（页面状态）
- Home(事件展示)  
  → ChoiceSelect(选择)  
  → Resolution(成功/失败文案)  
  → WeeklySettlement(结算弹层)  
  → (AdOptional)  
  → NextWeek / GameOver

### 10.2 GameOver Flow
- GameOverSummary（死亡原因、存活月数、现金峰值、成就）
- 可选：看广告复活（若未使用）
- 重新开局：可选保留少量“传承点数”（V2+）

---

## 11. 配置与数据文件清单（工程目录建议）

### 11.1 配置（JSON/ScriptableObject）
- `config/constants.json`：MONTHS_PER_YEAR、初始资金、压力死亡月数等
- `config/ad_rules.json`：广告入口规则、次数上限、奖励强度、冷却
- `config/bags.json`：事件袋子 stage 映射与权重
- `config/death_rules.json`：疾病/年龄概率、压力阈值等

### 11.2 数据表（CSV）
- `data/shop_types.csv`
- `data/brands.csv`（V1 可选）
- `data/locations.csv`
- `data/positions.csv`（V1 可选简化）
- `data/events.csv`（新表头 v1）
- `data/choices.csv`（新表头 v1）
- `data/world_events.csv`
- `data/achievements.csv`

---

## 12. 埋点与指标（上线必须）
### 12.1 核心指标
- D1/D3/D7 留存
- 平均单次时长、每日进入次数
- 事件完成率（每月是否做出选择）
- 破产率/压力死亡率/疾病死亡率（按月数分桶）
- 广告：展示次数、完成率、入口分布、每 DAU 广告次数

### 12.2 埋点事件建议
- `turn_start/turn_end`
- `event_shown`（event_id/tags/stage）
- `choice_click`（choice_uid/success/fail）
- `weekly_profit`（区间桶，不直传具体金额也可）
- `ad_offer_shown/ad_watched/ad_reward_granted`
- `death`（reason/week/cash/stress/health）

---

## 13. MVP 范围（建议）
### 13.1 必做
- 单店完整月循环
- 门面选择 + 调研（含广告揭示）
- 招聘（至少 2 岗位：核心岗/杂工）
- 事件池：≥ 80 条（覆盖前 30 月不明显重复）
- 世界事件：≥ 8 条（含 2 条荒诞）
- 成就：≥ 20 条（含隐藏成就）
- 广告：信息揭示 / 复活 / 结算加倍

### 13.2 延后
- 多店、店长托管（V2）
- 外卖深度、平台博弈（V2）
- 自建品牌、反向加盟（V3）
- 继承/传承（V4）

---

## 14. 交付物与验收清单
### 14.1 程序验收
- 同一存档重复运行 1000 次模拟（固定随机种子）结果可复现
- 结算顺序不被 UI/广告打断破坏
- CSV/JSON 解析错误有清晰日志（定位到 event_id/choice_uid/字段名）

### 14.2 策划验收
- 新手期 12 月能在“不过度看广告”的情况下有 70% 以上概率存活
- 每月事件文本密度足够：平均每 2~3 月出现一次强记忆点事件
- 广告入口“看与不看”都合理，不看不至于卡死

### 14.3 QA 验收
- 断网、广告失败、重进恢复一致
- 兼容微信小游戏常见机型（低端机 UI 不溢出）
- 存档兼容：数据表新增字段不导致旧档崩溃（缺省值策略）

---

## 15. 附：建议的“事件袋子 bag”规划（MVP）
- `early_daily`：新手日常（1~12月）
- `early_trap`：新手坑（房东、培训、加盟条款）
- `ops_staff`：员工相关
- `ops_supply`：供应链/设备
- `public_opinion`：差评/网红/媒体
- `regulation`：临检/证照
- `absurd`：荒诞彩蛋（低权重，稳定投放）
- `opportunity`：机会事件（短期 buff/扩张伏笔）

---

> 版本号：v1.0  
> 最后更新：2026-01-10（Asia/Taipei）  

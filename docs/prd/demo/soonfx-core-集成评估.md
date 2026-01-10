# SoonFx Core（@soonfx/engine）集成评估（面向本项目）

目标：评估本仓库（微信小游戏 / Cocos Creator 3.8.8 / TypeScript）是否适合结合 `soonfx-engine/core`，以及推荐的集成切入点与风险。

## 1. 本项目现状（当前架构与扩展点）

### 1.1 技术栈与形态

- 项目类型：微信小游戏
- 引擎：Cocos Creator `3.8.8`
- 语言：TypeScript（`strict: true`）

### 1.2 核心系统（现有代码）

- `cocos/assets/scripts/core/DataManager.ts`：加载并管理 CSV 数据（事件/选择/店铺类型/地点/成就/世界事件）
- `cocos/assets/scripts/core/EventManager.ts`：抽事件、做成功率检定、解析并应用效果字符串（如 `cash+1000|stress-10`）
- `cocos/assets/scripts/core/TurnManager.ts`：按固定顺序做“周回合结算”（事件→经营→玩家→状态→时间→死亡判定）
- `cocos/assets/scripts/core/SaveManager.ts`：存档/读档（`sys.localStorage`，JSON 序列化）

### 1.3 主要扩展点（痛点）

- 公式复杂度上升：例如收益/成本/成长曲线、债务与利息、多条件触发等，容易走向硬编码与分支膨胀
- 策划调数依赖程序：复杂公式/关系难以纯靠 CSV 字段表达
- 事件效果表达有限：目前更偏“字段增减”，复杂运算与组合表达能力弱

## 2. SoonFx Core 是什么（定位与提供能力）

### 2.1 定位

- 仓库：`https://github.com/soonfx-engine/core`
- npm 包：`@soonfx/engine`
- License：Apache-2.0
- 关键词：数值引擎、表达式求值、与可视化编辑器（SoonFx Editor）配套的“逻辑数据化 → JSON 导出 → 运行时执行”

### 2.2 能力概览（与本项目可能相关的部分）

- 表达式求值：支持将自然表达式转 RPN 并计算（非 `eval`）
  - 例如：`fx.evaluateExpression('(2 + 3) * 4')`
- 数学工具：向量/几何/数值处理等（如距离、插值、保留小数等）
- 更重的体系能力：围绕 Editor 的数据结构与运行时（如 Folder/Body/Layer/Message/CallCenter 等）

## 3. 结论：能结合，但不建议“整体替换架构”

### 3.1 推荐结论

- ✅ 适合：作为“数值公式/数据驱动逻辑层”的增强组件，引入到你现有 `TurnManager/EventManager/DataManager` 的计算环节
- ❌ 不建议：把你现有的 Cocos 侧管理器与事件总线整体替换成 SoonFx 的体系（成本高、改动面大、收益不一定对等）

### 3.2 原因（匹配度）

- 你的项目核心循环（周回合结算、存档口径）已稳定，SoonFx 的强项在“把复杂公式从代码里剥离出来”
- SoonFx 内置的“Editor 运行时体系”偏通用/偏重，直接搬进来会引入额外概念与耦合

## 4. 推荐集成方式（从低成本到高成本）

### 4.1 轻量（低成本 / 低风险）

目标：只用 SoonFx 的表达式引擎与数学工具，保持现有数据结构与流程不变。

- 使用场景：
  - 店铺收益/成本公式从硬编码改为表达式
  - 利息/增长曲线等用表达式统一表达
- 变化范围：
  - 在计算点调用 `fx.evaluateExpression(...)`
  - 不改变 `SaveManager` 结构，不引入 Editor 工作流

### 4.2 中等（中等成本 / 中等收益）

目标：把“事件效果/经营结算/成长曲线”升级为“公式字段”，用统一的公式系统计算。

- 核心工作：
  - 设计“变量上下文”映射（把 `cash/debt/stress/shops/...` 提供给公式）
  - 将 CSV 中部分字段从“数值”改为“表达式字符串”（或新增表达式列）
  - 在结算与事件应用处，统一通过公式计算并落地到 state（存档值）

### 4.3 重度（高成本 / 高收益但高风险）

目标：引入 SoonFx Editor 工作流，让策划可视化编辑并导出 JSON，运行时加载并执行。

- 额外工作：
  - JSON 资源加载与版本管理
  - 变量/状态映射、存档兼容
  - 与现有 CSV 表方案如何共存（或迁移）

## 5. 风险与注意事项（必须提前验证）

- 全局副作用：`@soonfx/engine` 入口会把 `fx`/`seer` 挂到 `globalThis`（可能带来全局命名冲突与不可控副作用）
- 稳定性：路线图显示仍在重构阶段（2.0.x），内部模块与类型可能持续调整
- 构建链路：微信小游戏 + Creator 的打包/ESM/CJS/Tree-shaking 需要实机验证（尤其是包体与兼容性）

## 6. 建议的 PoC（最小验证路径）

目的：快速回答“能不能在 Creator/微信构建链路里正常工作”。

1. 在 `cocos/` 工程引入 `@soonfx/engine`（npm）
2. 写一个最小脚本运行：
   - `fx.evaluateExpression('(2+3)*4')` 应得到 `20`
   - 选取一个结算点（例如店铺收益）用表达式计算并展示结果
3. 用 Cocos Creator 打开 `cocos/`，确保 TS 编译无报错，再构建微信小游戏验证运行

---

备注：如果决定做 PoC，建议优先走“轻量”路径，先确认构建与运行稳定，再考虑把事件/结算逐步迁移到“公式字段”。


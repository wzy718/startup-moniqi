# 小店模拟器 (Shop Simulator)

一款文字模拟经营微信小游戏，使用 Cocos Creator 3.8.8 开发。

## 项目结构

```
cocos/
├── assets/                     # 游戏资源目录
│   ├── scripts/               # TypeScript 脚本
│   │   ├── core/              # 核心系统
│   │   │   ├── GameConstants.ts    # 游戏常量定义
│   │   │   ├── GameManager.ts      # 游戏主管理器
│   │   │   ├── DataManager.ts      # 数据管理器
│   │   │   ├── SaveManager.ts      # 存档管理器
│   │   │   ├── EventManager.ts     # 事件管理器
│   │   │   └── TurnManager.ts      # 回合管理器
│   │   ├── data/              # 数据模型
│   │   │   ├── PlayerModel.ts      # 玩家数据模型
│   │   │   └── ShopModel.ts        # 店铺数据模型
│   │   ├── ui/                # UI 组件
│   │   │   ├── UIManager.ts        # UI 管理器
│   │   │   └── BasePanel.ts        # 面板基类
│   │   ├── utils/             # 工具类
│   │   │   ├── CSVParser.ts        # CSV 解析器
│   │   │   └── Utils.ts            # 通用工具
│   │   └── Main.ts            # 游戏入口脚本
│   ├── resources/             # 动态加载资源
│   │   └── data/              # 数据表（CSV格式）
│   │       ├── events.csv          # 事件数据
│   │       ├── choices.csv         # 选择数据
│   │       ├── shop_types.csv      # 店铺类型
│   │       ├── locations.csv       # 地点数据
│   │       ├── achievements.csv    # 成就数据
│   │       └── world_events.csv    # 世界事件
│   ├── scenes/                # 场景文件
│   ├── prefabs/               # 预制体
│   │   └── ui/                # UI 预制体
│   ├── textures/              # 图片资源
│   └── fonts/                 # 字体资源
├── settings/                  # 项目设置
├── package.json               # 项目配置
├── tsconfig.json              # TypeScript 配置
└── README.md                  # 本文件
```

## 核心系统说明

### GameManager（游戏管理器）
- 管理游戏整体流程和状态
- 单例模式，全局访问

### DataManager（数据管理器）
- 负责加载和管理所有 CSV 数据表
- 提供数据查询和筛选接口

### SaveManager（存档管理器）
- 处理游戏存档的保存、加载
- 支持自动存档和手动存档

### EventManager（事件管理器）
- 管理游戏事件的抽取和触发
- 同时作为全局事件总线使用

### TurnManager（回合管理器）
- 执行回合制逻辑
- 按固定顺序结算：事件→经营→玩家→状态→时间→死亡判定

## 回合结算顺序

1. **回合开始**：读取存档值
2. **生成事件候选**：从事件表筛选并抽取
3. **玩家选择与检定**：根据选择的成功率进行判定
4. **经营结算**：计算每家店的收入、成本、利润
5. **玩家结算**：汇总利润，扣除生活费、债务利息
6. **状态结算**：更新压力、健康、精力等
7. **时间推进**：`current_week += 1`
8. **死亡/破产判定**

## 数值系统

- **时间单位**：1回合 = 1周
- **金额单位**：元，使用整数存储
- **概率/倍率**：使用 0~1 的小数
- **月成本折算**：`WEEKS_PER_MONTH = 4`

详细数值说明请参考 `docs/数值/数值类型.md`

## 开发指南

### 如何开始

1. 使用 Cocos Creator 3.8.8 打开 `cocos` 目录
2. 创建主场景并添加 `Main` 脚本
3. 运行游戏

### 添加新事件

1. 在 `assets/resources/data/events.csv` 添加事件记录
2. 在 `assets/resources/data/choices.csv` 添加对应选择

### 添加新店铺类型

1. 在 `assets/resources/data/shop_types.csv` 添加店铺类型

## 构建目标

- 微信小游戏

## 注意事项

- 所有代码注释使用中文
- 遵循 `docs/数值/数值类型.md` 中的数值定义
- CSV 文件使用 UTF-8 编码



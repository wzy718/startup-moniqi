/**
 * 游戏常量定义
 * 包含所有游戏中使用的常量值
 */

/** 时间相关常量 */
export const WEEKS_PER_MONTH = 4;  // 每月周数（游戏口径）
export const WEEKS_PER_YEAR = 48;  // 每年周数（游戏口径，12个月×4周）

/** 玩家初始值 */
export const INITIAL_CASH = 100000;       // 初始现金（元）
export const INITIAL_AGE = 25;            // 初始年龄
export const INITIAL_STRESS = 0;          // 初始压力值
export const INITIAL_HEALTH = 100;        // 初始健康值
export const INITIAL_ENERGY = 100;        // 初始精力值
export const INITIAL_REPUTATION = 50;     // 初始声誉值

/** 数值上下限 */
export const MAX_STRESS = 100;            // 压力值上限
export const MAX_HEALTH = 100;            // 健康值上限
export const MAX_ENERGY = 100;            // 精力值上限
export const MAX_REPUTATION = 100;        // 声誉值上限
export const MIN_REPUTATION = 0;          // 声誉值下限

/** 游戏结束条件 */
export const BANKRUPTCY_THRESHOLD = 0;              // 破产阈值
export const STRESS_DEATH_WEEKS = 4;                // 压力满值持续周数导致死亡
export const MAX_AGE = 80;                          // 最大年龄

/** 每周固定支出 */
export const WEEKLY_LIVING_COST = 500;              // 每周生活费（元）

/** 利息相关 */
export const DEBT_INTEREST_RATE = 0.005;            // 债务周利率（0.5%）

/** 事件相关 */
export const EVENTS_PER_TURN = 1;                   // 每回合事件数

/** 游戏状态枚举 */
export enum GameState {
    INIT = 'init',              // 初始化中
    MENU = 'menu',              // 主菜单
    CHARACTER_SELECT = 'character_select',  // 选择角色
    SHOP_SELECT = 'shop_select',            // 选择店铺
    LOCATION_SELECT = 'location_select',    // 选择门面
    PLAYING = 'playing',        // 游戏中
    EVENT = 'event',            // 处理事件
    SETTLEMENT = 'settlement',  // 结算中
    GAME_OVER = 'game_over',    // 游戏结束
    PAUSED = 'paused'           // 暂停
}

/** 游戏结束原因枚举 */
export enum GameOverReason {
    BANKRUPTCY = 'bankruptcy',          // 破产
    STRESS_DEATH = 'stress_death',      // 压力过大
    AGE_DEATH = 'age_death',            // 年龄过大
    DISEASE_DEATH = 'disease_death',    // 疾病死亡
    INHERITANCE = 'inheritance'         // 继承（传给下一代）
}

/** 性格类型枚举 */
export enum PersonalityType {
    CONSERVATIVE = 'conservative',  // 保守型
    AGGRESSIVE = 'aggressive',      // 激进型
    BALANCED = 'balanced',          // 平衡型
    CREATIVE = 'creative'           // 创意型
}

/** 店铺类型枚举 */
export enum ShopType {
    RESTAURANT = 'restaurant',      // 餐饮店
    RETAIL = 'retail',              // 零售店
    SERVICE = 'service',            // 服务店
    ENTERTAINMENT = 'entertainment' // 娱乐店
}

/** 事件类型枚举 */
export enum EventType {
    RANDOM = 'random',              // 随机事件
    STORY = 'story',                // 剧情事件
    WORLD = 'world',                // 世界事件
    SHOP = 'shop',                  // 店铺事件
    PERSONAL = 'personal'           // 个人事件
}












import { _decorator, Component, director } from 'cc';
import { GameManager } from './GameManager';
import { SaveManager } from './SaveManager';
import { EventManager, GameEventType } from './EventManager';
import { 
    GameState, 
    GameOverReason, 
    WEEKS_PER_MONTH, 
    WEEKLY_LIVING_COST, 
    DEBT_INTEREST_RATE,
    MAX_STRESS,
    STRESS_DEATH_WEEKS,
    MAX_AGE,
    BANKRUPTCY_THRESHOLD
} from './GameConstants';

const { ccclass, property } = _decorator;

/**
 * 回合结算结果接口
 */
export interface TurnSettlementResult {
    /** 本周收入 */
    weeklyRevenue: number;
    /** 本周成本 */
    weeklyCost: number;
    /** 本周利润 */
    weeklyProfit: number;
    /** 生活费 */
    livingCost: number;
    /** 债务利息 */
    debtInterest: number;
    /** 净现金流 */
    netCashFlow: number;
    /** 压力变化 */
    stressChange: number;
    /** 健康变化 */
    healthChange: number;
    /** 结算后现金 */
    finalCash: number;
}

/**
 * 回合管理器
 * 负责游戏回合的推进和结算
 * 按照固定顺序执行：事件→经营→玩家→状态→时间→死亡判定
 * 使用单例模式
 */
@ccclass('TurnManager')
export class TurnManager extends Component {
    /** 单例实例 */
    private static _instance: TurnManager | null = null;

    /** 压力满值持续的周数 */
    private _stressFullWeeks: number = 0;

    /** 上一回合的结算结果 */
    private _lastSettlement: TurnSettlementResult | null = null;

    /** 获取单例实例 */
    public static get instance(): TurnManager {
        return this._instance!;
    }

    /** 获取上一回合的结算结果 */
    public get lastSettlement(): TurnSettlementResult | null {
        return this._lastSettlement;
    }

    onLoad() {
        if (TurnManager._instance !== null && TurnManager._instance !== this) {
            this.destroy();
            return;
        }
        TurnManager._instance = this;
        director.addPersistRootNode(this.node);
    }

    /**
     * 执行一个完整回合
     * 按照固定顺序执行各个阶段
     */
    public async executeTurn(): Promise<void> {
        const gameManager = GameManager.instance;
        const saveManager = SaveManager.instance;
        const eventManager = EventManager.instance;

        if (!saveManager.playerData) {
            console.error('[TurnManager] 玩家数据未初始化');
            return;
        }

        console.log(`[TurnManager] ========== 第 ${saveManager.playerData.currentWeek} 周开始 ==========`);

        // 发送回合开始事件
        eventManager.emit(GameEventType.TURN_START, { week: saveManager.playerData.currentWeek });

        // 1. 回合开始：读取存档值（已经加载）
        console.log('[TurnManager] 阶段1: 回合开始');

        // 2. 检查世界事件
        console.log('[TurnManager] 阶段2: 检查世界事件');
        eventManager.checkWorldEvents();

        // 3. 生成事件候选并抽取
        console.log('[TurnManager] 阶段3: 抽取事件');
        const event = eventManager.drawEvent();
        
        if (event) {
            // 切换到事件处理状态，等待玩家选择
            gameManager.changeState(GameState.EVENT);
            console.log(`[TurnManager] 等待玩家处理事件: ${event.name}`);
            
            // 事件处理在UI中完成，这里不阻塞
            // 当玩家完成选择后，UI会调用 continueAfterEvent()
            return;
        }

        // 如果没有事件，直接进入结算
        await this.continueAfterEvent();
    }

    /**
     * 事件处理完成后继续回合
     * 由UI在玩家完成选择后调用
     */
    public async continueAfterEvent(): Promise<void> {
        const gameManager = GameManager.instance;
        const saveManager = SaveManager.instance;
        const eventManager = EventManager.instance;

        if (!saveManager.playerData) {
            console.error('[TurnManager] 玩家数据未初始化');
            return;
        }

        // 4. 经营结算
        console.log('[TurnManager] 阶段4: 经营结算');
        const businessResult = this.calculateBusinessSettlement();

        // 5. 玩家结算
        console.log('[TurnManager] 阶段5: 玩家结算');
        const playerResult = this.calculatePlayerSettlement(businessResult);

        // 6. 状态结算
        console.log('[TurnManager] 阶段6: 状态结算');
        this.updatePlayerStatus();

        // 保存结算结果
        this._lastSettlement = playerResult;

        // 7. 时间推进
        console.log('[TurnManager] 阶段7: 时间推进');
        this.advanceTime();

        // 8. 死亡/破产判定
        console.log('[TurnManager] 阶段8: 死亡/破产判定');
        const gameOverReason = this.checkGameOver();

        if (gameOverReason) {
            console.log(`[TurnManager] 游戏结束: ${gameOverReason}`);
            gameManager.gameOver(gameOverReason);
            return;
        }

        // 自动保存
        saveManager.autoSave();

        // 发送回合结束事件
        eventManager.emit(GameEventType.TURN_END, { 
            week: saveManager.playerData.currentWeek,
            settlement: this._lastSettlement
        });

        // 回到游戏状态
        gameManager.changeState(GameState.PLAYING);

        console.log(`[TurnManager] ========== 第 ${saveManager.playerData.currentWeek - 1} 周结束 ==========`);
    }

    /**
     * 计算经营结算
     * 汇总所有店铺的收入和成本
     */
    private calculateBusinessSettlement(): { revenue: number; cost: number; profit: number } {
        const saveManager = SaveManager.instance;
        const playerData = saveManager.playerData!;

        let totalRevenue = 0;
        let totalCost = 0;

        // 遍历所有店铺计算收益
        for (const shop of playerData.shops) {
            if (shop.isOpen) {
                totalRevenue += shop.weeklyRevenue;
                totalCost += shop.weeklyCost;
            }
        }

        const profit = totalRevenue - totalCost;

        console.log(`[TurnManager] 经营结算 - 收入: ${totalRevenue}, 成本: ${totalCost}, 利润: ${profit}`);

        return { revenue: totalRevenue, cost: totalCost, profit };
    }

    /**
     * 计算玩家结算
     * 汇总利润，扣除生活费、债务利息等
     */
    private calculatePlayerSettlement(businessResult: { revenue: number; cost: number; profit: number }): TurnSettlementResult {
        const saveManager = SaveManager.instance;
        const playerData = saveManager.playerData!;

        // 计算债务利息
        const debtInterest = Math.floor(playerData.debt * DEBT_INTEREST_RATE);
        
        // 计算生活费
        const livingCost = WEEKLY_LIVING_COST;

        // 计算净现金流
        const netCashFlow = businessResult.profit - livingCost - debtInterest;

        // 更新现金
        saveManager.updateCash(netCashFlow);

        // 如果有债务，增加利息
        if (playerData.debt > 0) {
            playerData.debt += debtInterest;
        }

        const result: TurnSettlementResult = {
            weeklyRevenue: businessResult.revenue,
            weeklyCost: businessResult.cost,
            weeklyProfit: businessResult.profit,
            livingCost: livingCost,
            debtInterest: debtInterest,
            netCashFlow: netCashFlow,
            stressChange: 0,  // 在状态结算中更新
            healthChange: 0,  // 在状态结算中更新
            finalCash: playerData.cash
        };

        console.log(`[TurnManager] 玩家结算 - 净现金流: ${netCashFlow}, 最终现金: ${playerData.cash}`);

        return result;
    }

    /**
     * 更新玩家状态
     * 根据当前情况更新压力、健康、精力等
     */
    private updatePlayerStatus(): void {
        const saveManager = SaveManager.instance;
        const playerData = saveManager.playerData!;

        // 基础压力恢复（每周减少一点压力）
        let stressChange = -2;

        // 如果没有收入来源，增加压力
        if (playerData.shops.length === 0 || playerData.shops.every(s => !s.isOpen)) {
            stressChange += 5;
        }

        // 如果现金紧张，增加压力
        if (playerData.cash < 10000) {
            stressChange += 3;
        }

        // 如果有债务，增加压力
        if (playerData.debt > 0) {
            stressChange += Math.min(5, Math.floor(playerData.debt / 10000));
        }

        // 应用压力变化
        playerData.stress = Math.max(0, Math.min(MAX_STRESS, playerData.stress + stressChange));

        // 检查压力是否持续满值
        if (playerData.stress >= MAX_STRESS) {
            this._stressFullWeeks++;
        } else {
            this._stressFullWeeks = 0;
        }

        // 基础健康恢复
        let healthChange = 1;

        // 高压力损害健康
        if (playerData.stress > 70) {
            healthChange -= 2;
        }

        // 应用健康变化
        playerData.health = Math.max(0, Math.min(100, playerData.health + healthChange));

        // 更新结算结果中的状态变化
        if (this._lastSettlement) {
            this._lastSettlement.stressChange = stressChange;
            this._lastSettlement.healthChange = healthChange;
        }

        // 精力每周恢复
        playerData.energy = Math.min(100, playerData.energy + 20);

        console.log(`[TurnManager] 状态更新 - 压力: ${playerData.stress}(${stressChange >= 0 ? '+' : ''}${stressChange}), 健康: ${playerData.health}(${healthChange >= 0 ? '+' : ''}${healthChange})`);
    }

    /**
     * 时间推进
     */
    private advanceTime(): void {
        const saveManager = SaveManager.instance;
        const playerData = saveManager.playerData!;

        playerData.currentWeek++;
        playerData.totalWeeks++;

        // 每52周增加一岁
        if (playerData.currentWeek % 52 === 0) {
            playerData.age++;
            console.log(`[TurnManager] 年龄增长: ${playerData.age} 岁`);
        }

        console.log(`[TurnManager] 时间推进 - 当前第 ${playerData.currentWeek} 周`);
    }

    /**
     * 检查游戏结束条件
     * @returns 游戏结束原因，如果没有结束返回 null
     */
    private checkGameOver(): GameOverReason | null {
        const saveManager = SaveManager.instance;
        const playerData = saveManager.playerData!;

        // 1. 破产判定
        if (playerData.cash <= BANKRUPTCY_THRESHOLD && playerData.debt > 0) {
            return GameOverReason.BANKRUPTCY;
        }

        // 2. 压力过大判定（连续4周压力满值）
        if (this._stressFullWeeks >= STRESS_DEATH_WEEKS) {
            return GameOverReason.STRESS_DEATH;
        }

        // 3. 年龄过大判定
        if (playerData.age >= MAX_AGE) {
            // 检查是否有继承人
            // TODO: 实现继承机制
            return GameOverReason.AGE_DEATH;
        }

        // 4. 健康归零判定
        if (playerData.health <= 0) {
            return GameOverReason.DISEASE_DEATH;
        }

        return null;
    }

    /**
     * 获取当前周数
     */
    public getCurrentWeek(): number {
        const saveManager = SaveManager.instance;
        return saveManager.playerData?.currentWeek || 0;
    }

    /**
     * 获取当前月份（游戏口径）
     */
    public getCurrentMonth(): number {
        return Math.ceil(this.getCurrentWeek() / WEEKS_PER_MONTH);
    }

    /**
     * 获取当前年份
     */
    public getCurrentYear(): number {
        return Math.floor(this.getCurrentWeek() / 52) + 1;
    }

    /**
     * 重置压力计数
     */
    public resetStressCounter(): void {
        this._stressFullWeeks = 0;
    }

    onDestroy() {
        if (TurnManager._instance === this) {
            TurnManager._instance = null;
        }
    }
}



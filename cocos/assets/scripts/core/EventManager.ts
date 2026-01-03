import { _decorator, Component, director, EventTarget } from 'cc';
import { DataManager, EventData, ChoiceData } from './DataManager';
import { SaveManager } from './SaveManager';
import { WEEKS_PER_YEAR } from './GameConstants';

const { ccclass, property } = _decorator;

/**
 * 事件结果接口
 */
export interface EventResult {
    eventId: string;
    choiceId: string;
    success: boolean;
    effects: string;
    message: string;
}

/**
 * 游戏内事件类型
 */
export enum GameEventType {
    /** 状态变化事件 */
    STATE_CHANGED = 'state_changed',
    /** 现金变化事件 */
    CASH_CHANGED = 'cash_changed',
    /** 压力变化事件 */
    STRESS_CHANGED = 'stress_changed',
    /** 健康变化事件 */
    HEALTH_CHANGED = 'health_changed',
    /** 事件触发 */
    EVENT_TRIGGERED = 'event_triggered',
    /** 事件完成 */
    EVENT_COMPLETED = 'event_completed',
    /** 回合开始 */
    TURN_START = 'turn_start',
    /** 回合结束 */
    TURN_END = 'turn_end',
    /** 成就解锁 */
    ACHIEVEMENT_UNLOCKED = 'achievement_unlocked',
    /** 游戏结束 */
    GAME_OVER = 'game_over',
    /** UI更新 */
    UI_UPDATE = 'ui_update'
}

/**
 * 事件管理器
 * 负责游戏事件的抽取、触发和处理
 * 同时作为全局事件总线使用
 * 使用单例模式
 */
@ccclass('EventManager')
export class EventManager extends Component {
    /** 单例实例 */
    private static _instance: EventManager | null = null;

    /** 全局事件目标（事件总线） */
    private _eventTarget: EventTarget = new EventTarget();

    /** 当前活跃的事件 */
    private _currentEvent: EventData | null = null;

    /** 当前可用的选择 */
    private _currentChoices: ChoiceData[] = [];

    /** 活跃的世界事件列表 */
    private _activeWorldEvents: string[] = [];

    /** 获取单例实例 */
    public static get instance(): EventManager {
        return this._instance!;
    }

    /** 获取当前事件 */
    public get currentEvent(): EventData | null {
        return this._currentEvent;
    }

    /** 获取当前选择列表 */
    public get currentChoices(): ChoiceData[] {
        return this._currentChoices;
    }

    /** 获取事件目标（用于监听和触发事件） */
    public get eventTarget(): EventTarget {
        return this._eventTarget;
    }

    onLoad() {
        if (EventManager._instance !== null && EventManager._instance !== this) {
            this.destroy();
            return;
        }
        EventManager._instance = this;
        director.addPersistRootNode(this.node);
    }

    /**
     * 发送全局事件
     * @param eventType 事件类型
     * @param data 事件数据
     */
    public emit(eventType: GameEventType | string, data?: any): void {
        this._eventTarget.emit(eventType, data);
    }

    /**
     * 监听全局事件
     * @param eventType 事件类型
     * @param callback 回调函数
     * @param target 目标对象
     */
    public on(eventType: GameEventType | string, callback: (...args: any[]) => void, target?: any): void {
        this._eventTarget.on(eventType, callback, target);
    }

    /**
     * 取消监听全局事件
     * @param eventType 事件类型
     * @param callback 回调函数
     * @param target 目标对象
     */
    public off(eventType: GameEventType | string, callback?: (...args: any[]) => void, target?: any): void {
        this._eventTarget.off(eventType, callback, target);
    }

    /**
     * 监听一次全局事件
     * @param eventType 事件类型
     * @param callback 回调函数
     * @param target 目标对象
     */
    public once(eventType: GameEventType | string, callback: (...args: any[]) => void, target?: any): void {
        this._eventTarget.once(eventType, callback, target);
    }

    /**
     * 抽取本回合的事件
     * 根据当前游戏状态和已发生的事件来筛选和抽取
     */
    public drawEvent(): EventData | null {
        const dataManager = DataManager.instance;
        const saveManager = SaveManager.instance;
        
        if (!dataManager || !saveManager || !saveManager.playerData) {
            console.warn('[EventManager] 无法抽取事件：管理器未初始化');
            return null;
        }

        const playerData = saveManager.playerData;

        // 筛选可用事件
        const availableEvents = dataManager.filterEvents((event) => {
            // 排除已完成的一次性事件
            if (playerData.completedEvents.indexOf(event.id) !== -1) {
                return false;
            }

            // 检查条件（这里可以添加更复杂的条件检查逻辑）
            if (event.conditions && !this.checkConditions(event.conditions)) {
                return false;
            }

            return true;
        });

        if (availableEvents.length === 0) {
            console.warn('[EventManager] 没有可用的事件');
            return null;
        }

        // 根据权重随机抽取事件
        const selectedEvent = dataManager.weightedRandomEvent(availableEvents);
        
        if (selectedEvent) {
            this._currentEvent = selectedEvent;
            this._currentChoices = dataManager.getChoicesByEventId(selectedEvent.id);
            
            console.log(`[EventManager] 抽取事件: ${selectedEvent.name}`);
            
            // 发送事件触发通知
            this.emit(GameEventType.EVENT_TRIGGERED, selectedEvent);
        }

        return selectedEvent;
    }

    /**
     * 检查事件条件是否满足
     * @param conditions 条件字符串（JSON格式）
     */
    private checkConditions(conditions: string): boolean {
        if (!conditions || conditions === '') {
            return true;
        }

        try {
            const saveManager = SaveManager.instance;
            const playerData = saveManager.playerData;
            
            if (!playerData) return false;

            // 解析条件字符串
            // 格式示例: "cash>10000|stress<50|shops>=1"
            const conditionList = conditions.split('|');
            
            for (const condition of conditionList) {
                const match = condition.match(/(\w+)([><=!]+)(\d+)/);
                if (!match) continue;

                const [, field, operator, valueStr] = match;
                const value = parseFloat(valueStr);
                const playerValue = this.getPlayerFieldValue(playerData, field);

                if (playerValue === null) continue;

                switch (operator) {
                    case '>':
                        if (!(playerValue > value)) return false;
                        break;
                    case '>=':
                        if (!(playerValue >= value)) return false;
                        break;
                    case '<':
                        if (!(playerValue < value)) return false;
                        break;
                    case '<=':
                        if (!(playerValue <= value)) return false;
                        break;
                    case '==':
                    case '=':
                        if (!(playerValue === value)) return false;
                        break;
                    case '!=':
                        if (!(playerValue !== value)) return false;
                        break;
                }
            }

            return true;
        } catch (error) {
            console.error('[EventManager] 条件检查失败:', error);
            return true; // 解析失败时默认通过
        }
    }

    /**
     * 获取玩家字段值
     * @param playerData 玩家数据
     * @param field 字段名
     */
    private getPlayerFieldValue(playerData: any, field: string): number | null {
        switch (field) {
            case 'cash':
                return playerData.cash;
            case 'debt':
                return playerData.debt;
            case 'stress':
                return playerData.stress;
            case 'health':
                return playerData.health;
            case 'energy':
                return playerData.energy;
            case 'reputation':
                return playerData.reputation;
            case 'age':
                return playerData.age;
            case 'week':
            case 'currentWeek':
                return playerData.currentWeek;
            case 'shops':
                return playerData.shops.length;
            default:
                return null;
        }
    }

    /**
     * 执行选择
     * @param choiceId 选择ID
     * @returns 事件结果
     */
    public executeChoice(choiceId: string): EventResult | null {
        const choice = this._currentChoices.find(c => c.id === choiceId);
        
        if (!choice) {
            console.error(`[EventManager] 找不到选择: ${choiceId}`);
            return null;
        }

        // 进行成功率检定
        const success = Math.random() < choice.successRate;
        
        // 获取效果字符串
        const effects = success ? choice.successEffects : choice.failEffects;
        
        // 应用效果
        this.applyEffects(effects);

        // 更新统计数据
        const saveManager = SaveManager.instance;
        if (saveManager && saveManager.playerData) {
            if (success) {
                saveManager.playerData.statistics.successfulChoices++;
            } else {
                saveManager.playerData.statistics.failedChoices++;
            }
        }

        // 标记事件完成
        if (this._currentEvent) {
            saveManager.addCompletedEvent(this._currentEvent.id);
        }

        const result: EventResult = {
            eventId: this._currentEvent?.id || '',
            choiceId: choiceId,
            success: success,
            effects: effects,
            message: success ? '选择成功！' : '选择失败...'
        };

        console.log(`[EventManager] 执行选择: ${choice.text}, 结果: ${success ? '成功' : '失败'}`);

        // 发送事件完成通知
        this.emit(GameEventType.EVENT_COMPLETED, result);

        // 清空当前事件
        this._currentEvent = null;
        this._currentChoices = [];

        return result;
    }

    /**
     * 应用效果
     * @param effects 效果字符串（格式: "cash+1000|stress-10|health+5"）
     */
    private applyEffects(effects: string): void {
        if (!effects || effects === '') return;

        const saveManager = SaveManager.instance;
        if (!saveManager || !saveManager.playerData) return;

        const effectList = effects.split('|');
        
        for (const effect of effectList) {
            // 1) 时间推进（一次交互可能推进多周）
            // 格式：advance_weeks+3
            const advanceMatch = effect.match(/^advance_weeks\+(\d+)$/);
            if (advanceMatch) {
                const weeks = Math.max(0, parseInt(advanceMatch[1], 10));
                saveManager.playerData.pendingAdvanceWeeks = Math.max(saveManager.playerData.pendingAdvanceWeeks || 0, weeks);
                continue;
            }

            // 2) 等额本息贷款
            // 格式：loan+50000@0.12@48  => 本金 50000，年化 12%，期限 48 周（游戏口径：1年 = 48周）
            const loanMatch = effect.match(/^loan\+(\d+)(?:@(\d*\.?\d+))?(?:@(\d+))?$/);
            if (loanMatch) {
                const principal = Math.max(0, parseInt(loanMatch[1], 10));
                const annualRate = loanMatch[2] !== undefined ? Math.max(0, parseFloat(loanMatch[2])) : 0.12;
                const termWeeks = loanMatch[3] !== undefined ? Math.max(1, parseInt(loanMatch[3], 10)) : WEEKS_PER_YEAR;
                saveManager.addLoan(principal, annualRate, termWeeks);
                continue;
            }

            const match = effect.match(/(\w+)([+-])(\d+)/);
            if (!match) continue;

            const [, field, operator, valueStr] = match;
            const value = parseFloat(valueStr);
            const change = operator === '+' ? value : -value;

            switch (field) {
                case 'cash':
                    saveManager.updateCash(change);
                    this.emit(GameEventType.CASH_CHANGED, { change, newValue: saveManager.playerData.cash });
                    break;
                case 'stress':
                    saveManager.playerData.stress = Math.max(0, Math.min(100, saveManager.playerData.stress + change));
                    this.emit(GameEventType.STRESS_CHANGED, { change, newValue: saveManager.playerData.stress });
                    break;
                case 'health':
                    saveManager.playerData.health = Math.max(0, Math.min(100, saveManager.playerData.health + change));
                    this.emit(GameEventType.HEALTH_CHANGED, { change, newValue: saveManager.playerData.health });
                    break;
                case 'energy':
                    saveManager.playerData.energy = Math.max(0, Math.min(100, saveManager.playerData.energy + change));
                    break;
                case 'reputation':
                    saveManager.playerData.reputation = Math.max(0, Math.min(100, saveManager.playerData.reputation + change));
                    break;
                case 'debt':
                    // 统一口径：debt 由 loans[] 派生同步；事件层不允许直接改 debt，避免出现“双轨负债”。
                    // 如需新增负债，请用 loan+本金@年化@期限；如需影响现金，请用 cash+/-。
                    console.warn(`[EventManager] 已忽略效果字段 debt（${change}），请改用 loan+/cash+ 组合表达`);
                    break;
            }
        }

        // 通知UI更新
        this.emit(GameEventType.UI_UPDATE);
    }

    /**
     * 抽取世界事件
     * 在每个回合开始时检查是否触发世界事件
     */
    public checkWorldEvents(): void {
        const dataManager = DataManager.instance;
        if (!dataManager) return;

        dataManager.worldEvents.forEach((worldEvent) => {
            // 已经激活的事件跳过
            if (this._activeWorldEvents.indexOf(worldEvent.id) !== -1) {
                return;
            }

            // 根据概率判断是否触发
            if (Math.random() < worldEvent.probability) {
                this._activeWorldEvents.push(worldEvent.id);
                console.log(`[EventManager] 世界事件触发: ${worldEvent.name}`);
                
                // 应用世界事件效果
                this.applyEffects(worldEvent.effects);
            }
        });
    }

    /**
     * 更新世界事件（减少持续时间）
     */
    public updateWorldEvents(): void {
        // TODO: 实现世界事件的持续时间管理
    }

    /**
     * 清空当前事件
     */
    public clearCurrentEvent(): void {
        this._currentEvent = null;
        this._currentChoices = [];
    }

    onDestroy() {
        if (EventManager._instance === this) {
            EventManager._instance = null;
        }
    }
}













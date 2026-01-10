import { _decorator, Component, sys, director } from 'cc';
import { GameOverReason, PersonalityType, INITIAL_CASH, INITIAL_AGE, INITIAL_STRESS, INITIAL_HEALTH, INITIAL_ENERGY, INITIAL_REPUTATION } from './GameConstants';
import { FinanceUtils, LoanSaveData } from '../utils/FinanceUtils';

const { ccclass, property } = _decorator;

/**
 * 店铺存档数据接口
 */
export interface ShopSaveData {
    id: string;
    typeId: string;
    locationId: string;
    name: string;
    level: number;
    rating: number;
    employees: string[];
    weeklyRevenue: number;
    weeklyCost: number;
    isOpen: boolean;
}

/**
 * 玩家存档数据接口
 */
export interface PlayerSaveData {
    cash: number;
    debt: number;
    /** 等额本息贷款列表（存档值） */
    loans: LoanSaveData[];
    age: number;
    stress: number;
    health: number;
    energy: number;
    reputation: number;
    personality: PersonalityType;
    currentWeek: number;
    totalWeeks: number;
    /** 本次交互/本周触发的“需要结算的周数”（0 表示默认 1 周） */
    pendingAdvanceWeeks: number;
    shops: ShopSaveData[];
    completedEvents: string[];
    unlockedAchievements: string[];
    statistics: GameStatistics;
}

/**
 * 游戏统计数据接口
 */
export interface GameStatistics {
    totalRevenue: number;
    totalCost: number;
    totalProfit: number;
    maxCash: number;
    maxShops: number;
    totalEventsHandled: number;
    successfulChoices: number;
    failedChoices: number;
}

/**
 * 完整存档数据接口
 */
export interface SaveData {
    version: string;
    timestamp: number;
    player: PlayerSaveData;
    gameOverReason?: GameOverReason;
}

/** 存档版本号 */
const SAVE_VERSION = '1.0.0';

/** 存档键名 */
const SAVE_KEY = 'shop_simulator_save';

/** 自动存档键名 */
const AUTO_SAVE_KEY = 'shop_simulator_auto_save';

/**
 * 存档管理器
 * 负责游戏存档的保存、加载和管理
 * 使用单例模式
 */
@ccclass('SaveManager')
export class SaveManager extends Component {
    /** 单例实例 */
    private static _instance: SaveManager | null = null;

    /** 当前存档数据 */
    private _currentSave: SaveData | null = null;

    /** 获取单例实例 */
    public static get instance(): SaveManager {
        return this._instance!;
    }

    /** 获取当前存档 */
    public get currentSave(): SaveData | null {
        return this._currentSave;
    }

    /** 获取玩家数据 */
    public get playerData(): PlayerSaveData | null {
        return this._currentSave?.player || null;
    }

    onLoad() {
        if (SaveManager._instance !== null && SaveManager._instance !== this) {
            this.destroy();
            return;
        }
        SaveManager._instance = this;
        director.addPersistRootNode(this.node);
    }

    /**
     * 初始化存档管理器
     */
    public async initialize(): Promise<void> {
        console.log('[SaveManager] 初始化存档管理器');
        // 检查是否有自动存档
        this.checkAutoSave();
    }

    /**
     * 检查是否有存档
     */
    public hasSave(): boolean {
        return sys.localStorage.getItem(SAVE_KEY) !== null;
    }

    /**
     * 检查是否有自动存档
     */
    public hasAutoSave(): boolean {
        return sys.localStorage.getItem(AUTO_SAVE_KEY) !== null;
    }

    /**
     * 检查自动存档
     */
    private checkAutoSave(): void {
        if (this.hasAutoSave()) {
            console.log('[SaveManager] 检测到自动存档');
        }
    }

    /**
     * 创建新存档
     */
    public createNewSave(): void {
        console.log('[SaveManager] 创建新存档');

        const defaultStatistics: GameStatistics = {
            totalRevenue: 0,
            totalCost: 0,
            totalProfit: 0,
            maxCash: INITIAL_CASH,
            maxShops: 0,
            totalEventsHandled: 0,
            successfulChoices: 0,
            failedChoices: 0
        };

        const defaultPlayer: PlayerSaveData = {
            cash: INITIAL_CASH,
            debt: 0,
            loans: [],
            age: INITIAL_AGE,
            stress: INITIAL_STRESS,
            health: INITIAL_HEALTH,
            energy: INITIAL_ENERGY,
            reputation: INITIAL_REPUTATION,
            personality: PersonalityType.BALANCED,
            currentWeek: 1,
            totalWeeks: 0,
            pendingAdvanceWeeks: 0,
            shops: [],
            completedEvents: [],
            unlockedAchievements: [],
            statistics: defaultStatistics
        };

        this._currentSave = {
            version: SAVE_VERSION,
            timestamp: Date.now(),
            player: defaultPlayer
        };
    }

    /**
     * 保存游戏
     */
    public save(): boolean {
        if (!this._currentSave) {
            console.error('[SaveManager] 没有当前存档，无法保存');
            return false;
        }

        try {
            this._currentSave.timestamp = Date.now();
            const saveString = JSON.stringify(this._currentSave);
            sys.localStorage.setItem(SAVE_KEY, saveString);
            console.log('[SaveManager] 存档保存成功');
            return true;
        } catch (error) {
            console.error('[SaveManager] 存档保存失败:', error);
            return false;
        }
    }

    /**
     * 自动保存
     */
    public autoSave(): boolean {
        if (!this._currentSave) {
            console.error('[SaveManager] 没有当前存档，无法自动保存');
            return false;
        }

        try {
            this._currentSave.timestamp = Date.now();
            const saveString = JSON.stringify(this._currentSave);
            sys.localStorage.setItem(AUTO_SAVE_KEY, saveString);
            console.log('[SaveManager] 自动存档保存成功');
            return true;
        } catch (error) {
            console.error('[SaveManager] 自动存档保存失败:', error);
            return false;
        }
    }

    /**
     * 加载存档
     */
    public loadSave(): boolean {
        try {
            const saveString = sys.localStorage.getItem(SAVE_KEY);
            if (!saveString) {
                console.warn('[SaveManager] 没有找到存档');
                return false;
            }

            const saveData = JSON.parse(saveString) as SaveData;
            
            // 版本兼容性检查
            if (this.checkVersionCompatibility(saveData.version)) {
                this.ensureSaveDefaults(saveData);
                this._currentSave = saveData;
                console.log('[SaveManager] 存档加载成功');
                return true;
            } else {
                console.warn('[SaveManager] 存档版本不兼容');
                return false;
            }
        } catch (error) {
            console.error('[SaveManager] 存档加载失败:', error);
            return false;
        }
    }

    /**
     * 加载自动存档
     */
    public loadAutoSave(): boolean {
        try {
            const saveString = sys.localStorage.getItem(AUTO_SAVE_KEY);
            if (!saveString) {
                console.warn('[SaveManager] 没有找到自动存档');
                return false;
            }

            const saveData = JSON.parse(saveString) as SaveData;
            
            if (this.checkVersionCompatibility(saveData.version)) {
                this.ensureSaveDefaults(saveData);
                this._currentSave = saveData;
                console.log('[SaveManager] 自动存档加载成功');
                return true;
            } else {
                console.warn('[SaveManager] 自动存档版本不兼容');
                return false;
            }
        } catch (error) {
            console.error('[SaveManager] 自动存档加载失败:', error);
            return false;
        }
    }

    /**
     * 检查版本兼容性
     * @param version 存档版本
     */
    private checkVersionCompatibility(version: string): boolean {
        // 简单的版本检查，后续可以添加更复杂的迁移逻辑
        const [major] = version.split('.');
        const [currentMajor] = SAVE_VERSION.split('.');
        return major === currentMajor;
    }

    /**
     * 确保存档字段齐全（兼容旧存档）
     */
    private ensureSaveDefaults(saveData: SaveData): void {
        const player = saveData.player as any;
        if (!player.loans) player.loans = [];
        if (player.pendingAdvanceWeeks === undefined) player.pendingAdvanceWeeks = 0;
        // 统一口径：debt 仅用于展示/条件判断的派生缓存，真实来源是 loans[].remainingPrincipal
        player.debt = FinanceUtils.sumRemainingPrincipal(player.loans);
    }

    /**
     * 删除存档
     */
    public deleteSave(): void {
        sys.localStorage.removeItem(SAVE_KEY);
        console.log('[SaveManager] 存档已删除');
    }

    /**
     * 删除自动存档
     */
    public deleteAutoSave(): void {
        sys.localStorage.removeItem(AUTO_SAVE_KEY);
        console.log('[SaveManager] 自动存档已删除');
    }

    /**
     * 清除所有存档
     */
    public clearAllSaves(): void {
        this.deleteSave();
        this.deleteAutoSave();
        this._currentSave = null;
        console.log('[SaveManager] 所有存档已清除');
    }

    /**
     * 保存游戏结束数据
     * @param reason 游戏结束原因
     */
    public saveGameOverData(reason: GameOverReason): void {
        if (!this._currentSave) {
            return;
        }

        this._currentSave.gameOverReason = reason;
        this.save();
    }

    /**
     * 更新玩家现金
     * @param amount 变化金额（正数增加，负数减少）
     */
    public updateCash(amount: number): void {
        if (!this._currentSave) return;

        this._currentSave.player.cash += amount;
        
        // 更新最高现金记录
        if (this._currentSave.player.cash > this._currentSave.player.statistics.maxCash) {
            this._currentSave.player.statistics.maxCash = this._currentSave.player.cash;
        }

        // 更新统计数据
        if (amount > 0) {
            this._currentSave.player.statistics.totalRevenue += amount;
        } else {
            this._currentSave.player.statistics.totalCost += Math.abs(amount);
        }
    }

    /**
     * 同步 debt 展示口径（由 loans[] 计算）
     * 注意：debt 不应被业务逻辑当作“单一真相来源”，真实负债来源是 loans[]。
     */
    public syncDebtFromLoans(): void {
        if (!this._currentSave) return;
        this._currentSave.player.debt = FinanceUtils.sumRemainingPrincipal(this._currentSave.player.loans);
    }

    /**
     * 新增一笔等额本息贷款（事件侧使用）
     * 注意：贷款发放属于融资，不计入营业收入统计；这里只更新现金/债务与 loans 列表。
     */
    public addLoan(principal: number, annualRate: number, termWeeks: number): string | null {
        if (!this._currentSave) return null;

        const principalInt = Math.max(0, Math.floor(principal));
        if (principalInt <= 0) return null;

        const loan = FinanceUtils.createLoan(principalInt, annualRate, termWeeks, this._currentSave.player.currentWeek);

        this._currentSave.player.loans.push(loan as LoanSaveData);
        this._currentSave.player.cash += principalInt;
        this.syncDebtFromLoans();

        return loan.id;
    }

    /**
     * 更新玩家属性
     * @param property 属性名
     * @param value 新值
     */
    public updatePlayerProperty(property: keyof PlayerSaveData, value: any): void {
        if (!this._currentSave) return;
        (this._currentSave.player as any)[property] = value;
    }

    /**
     * 添加已完成事件
     * @param eventId 事件ID
     */
    public addCompletedEvent(eventId: string): void {
        if (!this._currentSave) return;

        if (this._currentSave.player.completedEvents.indexOf(eventId) === -1) {
            this._currentSave.player.completedEvents.push(eventId);
            this._currentSave.player.statistics.totalEventsHandled++;
        }
    }

    /**
     * 解锁成就
     * @param achievementId 成就ID
     */
    public unlockAchievement(achievementId: string): boolean {
        if (!this._currentSave) return false;

        if (this._currentSave.player.unlockedAchievements.indexOf(achievementId) === -1) {
            this._currentSave.player.unlockedAchievements.push(achievementId);
            console.log(`[SaveManager] 解锁成就: ${achievementId}`);
            return true;
        }
        return false;
    }

    /**
     * 获取游戏统计数据
     */
    public getStatistics(): GameStatistics | null {
        return this._currentSave?.player.statistics || null;
    }

    onDestroy() {
        if (SaveManager._instance === this) {
            SaveManager._instance = null;
        }
    }
}














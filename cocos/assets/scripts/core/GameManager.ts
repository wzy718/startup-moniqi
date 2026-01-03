import { _decorator, Component, director } from 'cc';
import { GameState, GameOverReason } from './GameConstants';
import { DataManager } from './DataManager';
import { SaveManager } from './SaveManager';
import { TurnManager } from './TurnManager';
import { EventManager } from './EventManager';

const { ccclass, property } = _decorator;

/**
 * 游戏主管理器
 * 负责管理游戏的整体流程和状态
 * 使用单例模式，全局访问
 */
@ccclass('GameManager')
export class GameManager extends Component {
    /** 单例实例 */
    private static _instance: GameManager | null = null;

    /** 当前游戏状态 */
    private _currentState: GameState = GameState.INIT;

    /** 游戏是否已初始化 */
    private _isInitialized: boolean = false;

    /** 获取单例实例 */
    public static get instance(): GameManager {
        return this._instance!;
    }

    /** 获取当前游戏状态 */
    public get currentState(): GameState {
        return this._currentState;
    }

    /** 获取数据管理器 */
    public get dataManager(): DataManager {
        return DataManager.instance;
    }

    /** 获取存档管理器 */
    public get saveManager(): SaveManager {
        return SaveManager.instance;
    }

    /** 获取回合管理器 */
    public get turnManager(): TurnManager {
        return TurnManager.instance;
    }

    /** 获取事件管理器 */
    public get eventManager(): EventManager {
        return EventManager.instance;
    }

    onLoad() {
        // 确保只有一个实例
        if (GameManager._instance !== null && GameManager._instance !== this) {
            this.destroy();
            return;
        }
        GameManager._instance = this;

        // 防止场景切换时销毁
        director.addPersistRootNode(this.node);
    }

    /**
     * 初始化游戏
     * 加载所有必要的数据和资源
     */
    public async initialize(): Promise<void> {
        if (this._isInitialized) {
            console.log('[GameManager] 游戏已初始化，跳过');
            return;
        }

        console.log('[GameManager] 开始初始化游戏...');

        try {
            // 初始化数据管理器（加载CSV数据）
            await this.dataManager.initialize();
            console.log('[GameManager] 数据管理器初始化完成');

            // 初始化存档管理器
            await this.saveManager.initialize();
            console.log('[GameManager] 存档管理器初始化完成');

            this._isInitialized = true;
            this._currentState = GameState.MENU;
            console.log('[GameManager] 游戏初始化完成');
        } catch (error) {
            console.error('[GameManager] 初始化失败:', error);
            throw error;
        }
    }

    /**
     * 开始新游戏
     */
    public startNewGame(): void {
        console.log('[GameManager] 开始新游戏');
        
        // 创建新存档
        this.saveManager.createNewSave();
        
        // 切换到角色选择状态
        this.changeState(GameState.CHARACTER_SELECT);
    }

    /**
     * 继续游戏（从存档）
     */
    public continueGame(): void {
        console.log('[GameManager] 继续游戏');
        
        if (!this.saveManager.hasSave()) {
            console.warn('[GameManager] 没有存档，无法继续游戏');
            return;
        }

        // 加载存档
        this.saveManager.loadSave();
        
        // 切换到游戏状态
        this.changeState(GameState.PLAYING);
    }

    /**
     * 切换游戏状态
     * @param newState 新状态
     */
    public changeState(newState: GameState): void {
        const oldState = this._currentState;
        this._currentState = newState;
        
        console.log(`[GameManager] 状态切换: ${oldState} -> ${newState}`);
        
        // 触发状态变化事件
        this.onStateChanged(oldState, newState);
    }

    /**
     * 状态变化回调
     * @param oldState 旧状态
     * @param newState 新状态
     */
    private onStateChanged(oldState: GameState, newState: GameState): void {
        // TODO: 触发全局事件，通知UI更新
        switch (newState) {
            case GameState.MENU:
                // 加载主菜单场景
                break;
            case GameState.CHARACTER_SELECT:
                // 加载角色选择场景
                break;
            case GameState.PLAYING:
                // 加载游戏主场景
                break;
            case GameState.GAME_OVER:
                // 显示游戏结束UI
                break;
        }
    }

    /**
     * 游戏结束
     * @param reason 结束原因
     */
    public gameOver(reason: GameOverReason): void {
        console.log(`[GameManager] 游戏结束，原因: ${reason}`);
        
        // 保存最终存档（用于统计）
        this.saveManager.saveGameOverData(reason);
        
        // 切换到游戏结束状态
        this.changeState(GameState.GAME_OVER);
    }

    /**
     * 暂停游戏
     */
    public pauseGame(): void {
        if (this._currentState === GameState.PLAYING) {
            this.changeState(GameState.PAUSED);
        }
    }

    /**
     * 恢复游戏
     */
    public resumeGame(): void {
        if (this._currentState === GameState.PAUSED) {
            this.changeState(GameState.PLAYING);
        }
    }

    /**
     * 返回主菜单
     */
    public returnToMenu(): void {
        // 保存当前进度
        if (this._currentState === GameState.PLAYING || this._currentState === GameState.PAUSED) {
            this.saveManager.autoSave();
        }
        
        this.changeState(GameState.MENU);
    }

    onDestroy() {
        if (GameManager._instance === this) {
            GameManager._instance = null;
        }
    }
}











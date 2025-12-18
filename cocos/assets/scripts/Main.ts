import { _decorator, Component, Node, director } from 'cc';
import { GameManager } from './core/GameManager';
import { DataManager } from './core/DataManager';
import { SaveManager } from './core/SaveManager';
import { EventManager } from './core/EventManager';
import { TurnManager } from './core/TurnManager';

const { ccclass, property } = _decorator;

/**
 * 游戏入口脚本
 * 负责初始化所有核心系统
 */
@ccclass('Main')
export class Main extends Component {
    @property(Node)
    gameManagerNode: Node | null = null;

    @property(Node)
    dataManagerNode: Node | null = null;

    @property(Node)
    saveManagerNode: Node | null = null;

    @property(Node)
    eventManagerNode: Node | null = null;

    @property(Node)
    turnManagerNode: Node | null = null;

    async onLoad() {
        console.log('[Main] 游戏启动...');

        // 确保各管理器节点存在并添加组件
        this.initializeManagers();
    }

    async start() {
        try {
            // 初始化游戏
            await GameManager.instance.initialize();
            
            console.log('[Main] 游戏初始化完成，进入主菜单');
            
            // TODO: 加载主菜单场景或显示主菜单UI
            
        } catch (error) {
            console.error('[Main] 游戏初始化失败:', error);
        }
    }

    /**
     * 初始化所有管理器
     */
    private initializeManagers(): void {
        // 如果没有指定节点，创建新节点
        if (!this.gameManagerNode) {
            this.gameManagerNode = new Node('GameManager');
            this.gameManagerNode.parent = this.node;
        }
        if (!this.gameManagerNode.getComponent(GameManager)) {
            this.gameManagerNode.addComponent(GameManager);
        }

        if (!this.dataManagerNode) {
            this.dataManagerNode = new Node('DataManager');
            this.dataManagerNode.parent = this.node;
        }
        if (!this.dataManagerNode.getComponent(DataManager)) {
            this.dataManagerNode.addComponent(DataManager);
        }

        if (!this.saveManagerNode) {
            this.saveManagerNode = new Node('SaveManager');
            this.saveManagerNode.parent = this.node;
        }
        if (!this.saveManagerNode.getComponent(SaveManager)) {
            this.saveManagerNode.addComponent(SaveManager);
        }

        if (!this.eventManagerNode) {
            this.eventManagerNode = new Node('EventManager');
            this.eventManagerNode.parent = this.node;
        }
        if (!this.eventManagerNode.getComponent(EventManager)) {
            this.eventManagerNode.addComponent(EventManager);
        }

        if (!this.turnManagerNode) {
            this.turnManagerNode = new Node('TurnManager');
            this.turnManagerNode.parent = this.node;
        }
        if (!this.turnManagerNode.getComponent(TurnManager)) {
            this.turnManagerNode.addComponent(TurnManager);
        }

        console.log('[Main] 所有管理器已初始化');
    }
}



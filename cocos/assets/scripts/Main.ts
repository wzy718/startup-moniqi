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

        // 隐藏所有面板
        this.hideAllPanels();

        // 确保各管理器节点存在并添加组件
        this.initializeManagers();
    }

    async start() {
        try {
            // 初始化游戏
            await GameManager.instance.initialize();
            
            console.log('[Main] 游戏初始化完成，进入主菜单');
            
            // 显示主界面
            const mainPanel = director.getScene()?.getChildByPath('Canvas/UIRoot/MainPanel');
            if (mainPanel) {
                mainPanel.active = true;
            }
            
        } catch (error) {
            console.error('[Main] 游戏初始化失败:', error);
        }
    }

    /**
     * 隐藏 UIRoot 下的所有面板（除了 MainPanel）
     */
    private hideAllPanels(): void {
        const uiRoot = director.getScene()?.getChildByPath('Canvas/UIRoot');
        if (uiRoot) {
            uiRoot.children.forEach(child => {
                // MainPanel 保持显示，其他面板隐藏
                if (child.name !== 'MainPanel') {
                    child.active = false;
                } else {
                    child.active = true; // 确保 MainPanel 是激活的
                }
            });
        }
    }

    /**
     * 初始化所有管理器
     */
    private initializeManagers(): void {
        const scene = director.getScene();
        
        // 如果没有指定节点，创建新节点并作为场景根节点
        if (!this.gameManagerNode) {
            this.gameManagerNode = new Node('GameManager');
            if (scene) scene.addChild(this.gameManagerNode);
        } else {
            this.gameManagerNode.parent = scene;
        }
        if (!this.gameManagerNode.getComponent(GameManager)) {
            this.gameManagerNode.addComponent(GameManager);
        }

        if (!this.dataManagerNode) {
            this.dataManagerNode = new Node('DataManager');
            if (scene) scene.addChild(this.dataManagerNode);
        } else {
            this.dataManagerNode.parent = scene;
        }
        if (!this.dataManagerNode.getComponent(DataManager)) {
            this.dataManagerNode.addComponent(DataManager);
        }

        if (!this.saveManagerNode) {
            this.saveManagerNode = new Node('SaveManager');
            if (scene) scene.addChild(this.saveManagerNode);
        } else {
            this.saveManagerNode.parent = scene;
        }
        if (!this.saveManagerNode.getComponent(SaveManager)) {
            this.saveManagerNode.addComponent(SaveManager);
        }

        if (!this.eventManagerNode) {
            this.eventManagerNode = new Node('EventManager');
            if (scene) scene.addChild(this.eventManagerNode);
        } else {
            this.eventManagerNode.parent = scene;
        }
        if (!this.eventManagerNode.getComponent(EventManager)) {
            this.eventManagerNode.addComponent(EventManager);
        }

        if (!this.turnManagerNode) {
            this.turnManagerNode = new Node('TurnManager');
            if (scene) scene.addChild(this.turnManagerNode);
        } else {
            this.turnManagerNode.parent = scene;
        }
        if (!this.turnManagerNode.getComponent(TurnManager)) {
            this.turnManagerNode.addComponent(TurnManager);
        }

        console.log('[Main] 所有管理器已初始化');
    }
}










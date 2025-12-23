import { _decorator, Component, Node, Prefab, instantiate, director } from 'cc';

const { ccclass, property } = _decorator;

/**
 * UI层级枚举
 */
export enum UILayer {
    BACKGROUND = 0,     // 背景层
    MAIN = 100,         // 主界面层
    POPUP = 200,        // 弹窗层
    TOAST = 300,        // 提示层
    LOADING = 400,      // 加载层
    TOP = 500           // 顶层
}

/**
 * UI面板信息接口
 */
interface UIPanelInfo {
    node: Node;
    layer: UILayer;
}

/**
 * UI管理器
 * 负责管理所有UI面板的显示、隐藏和层级
 * 使用单例模式
 */
@ccclass('UIManager')
export class UIManager extends Component {
    /** 单例实例 */
    private static _instance: UIManager | null = null;

    @property(Node)
    backgroundLayer: Node | null = null;

    @property(Node)
    mainLayer: Node | null = null;

    @property(Node)
    popupLayer: Node | null = null;

    @property(Node)
    toastLayer: Node | null = null;

    @property(Node)
    loadingLayer: Node | null = null;

    @property(Node)
    topLayer: Node | null = null;

    /** 已打开的面板 */
    private _openedPanels: Map<string, UIPanelInfo> = new Map();

    /** 预加载的预制体 */
    private _prefabCache: Map<string, Prefab> = new Map();

    /** 获取单例实例 */
    public static get instance(): UIManager {
        return this._instance!;
    }

    onLoad() {
        if (UIManager._instance !== null && UIManager._instance !== this) {
            this.destroy();
            return;
        }
        UIManager._instance = this;
        director.addPersistRootNode(this.node);
    }

    /**
     * 获取指定层级的节点
     * @param layer UI层级
     */
    private getLayerNode(layer: UILayer): Node | null {
        switch (layer) {
            case UILayer.BACKGROUND:
                return this.backgroundLayer;
            case UILayer.MAIN:
                return this.mainLayer;
            case UILayer.POPUP:
                return this.popupLayer;
            case UILayer.TOAST:
                return this.toastLayer;
            case UILayer.LOADING:
                return this.loadingLayer;
            case UILayer.TOP:
                return this.topLayer;
            default:
                return this.mainLayer;
        }
    }

    /**
     * 显示面板
     * @param panelName 面板名称
     * @param prefab 预制体
     * @param layer 层级
     * @param data 传递给面板的数据
     */
    public showPanel(panelName: string, prefab: Prefab, layer: UILayer = UILayer.MAIN, data?: any): Node | null {
        // 如果已经打开，先关闭
        if (this._openedPanels.has(panelName)) {
            this.hidePanel(panelName);
        }

        const layerNode = this.getLayerNode(layer);
        if (!layerNode) {
            console.error(`[UIManager] 找不到层级节点: ${layer}`);
            return null;
        }

        // 实例化面板
        const panelNode = instantiate(prefab);
        layerNode.addChild(panelNode);

        // 记录面板信息
        this._openedPanels.set(panelName, { node: panelNode, layer });

        // 如果面板有初始化方法，调用它
        const panelComponent = panelNode.getComponent(panelName);
        if (panelComponent && typeof (panelComponent as any).init === 'function') {
            (panelComponent as any).init(data);
        }

        console.log(`[UIManager] 显示面板: ${panelName}`);
        return panelNode;
    }

    /**
     * 隐藏面板
     * @param panelName 面板名称
     */
    public hidePanel(panelName: string): void {
        const panelInfo = this._openedPanels.get(panelName);
        if (!panelInfo) {
            console.warn(`[UIManager] 面板未打开: ${panelName}`);
            return;
        }

        // 如果面板有关闭回调，调用它
        const panelComponent = panelInfo.node.getComponent(panelName);
        if (panelComponent && typeof (panelComponent as any).onClose === 'function') {
            (panelComponent as any).onClose();
        }

        // 销毁节点
        panelInfo.node.destroy();
        this._openedPanels.delete(panelName);

        console.log(`[UIManager] 隐藏面板: ${panelName}`);
    }

    /**
     * 隐藏所有面板
     * @param layer 指定层级（可选）
     */
    public hideAllPanels(layer?: UILayer): void {
        this._openedPanels.forEach((info, name) => {
            if (layer === undefined || info.layer === layer) {
                this.hidePanel(name);
            }
        });
    }

    /**
     * 检查面板是否已打开
     * @param panelName 面板名称
     */
    public isPanelOpen(panelName: string): boolean {
        return this._openedPanels.has(panelName);
    }

    /**
     * 获取已打开的面板节点
     * @param panelName 面板名称
     */
    public getPanel(panelName: string): Node | null {
        return this._openedPanels.get(panelName)?.node || null;
    }

    /**
     * 显示加载界面
     * @param message 加载提示信息
     */
    public showLoading(message: string = '加载中...'): void {
        // TODO: 实现加载界面
        console.log(`[UIManager] 显示加载: ${message}`);
    }

    /**
     * 隐藏加载界面
     */
    public hideLoading(): void {
        // TODO: 实现隐藏加载界面
        console.log('[UIManager] 隐藏加载');
    }

    /**
     * 显示提示消息
     * @param message 提示内容
     * @param duration 显示时长（秒）
     */
    public showToast(message: string, duration: number = 2): void {
        // TODO: 实现Toast提示
        console.log(`[UIManager] Toast: ${message}`);
    }

    /**
     * 显示确认对话框
     * @param title 标题
     * @param content 内容
     * @param onConfirm 确认回调
     * @param onCancel 取消回调
     */
    public showConfirm(
        title: string, 
        content: string, 
        onConfirm?: () => void, 
        onCancel?: () => void
    ): void {
        // TODO: 实现确认对话框
        console.log(`[UIManager] 确认框: ${title} - ${content}`);
    }

    /**
     * 缓存预制体
     * @param name 预制体名称
     * @param prefab 预制体
     */
    public cachePrefab(name: string, prefab: Prefab): void {
        this._prefabCache.set(name, prefab);
    }

    /**
     * 获取缓存的预制体
     * @param name 预制体名称
     */
    public getCachedPrefab(name: string): Prefab | undefined {
        return this._prefabCache.get(name);
    }

    onDestroy() {
        if (UIManager._instance === this) {
            UIManager._instance = null;
        }
    }
}










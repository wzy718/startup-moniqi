import { _decorator, Component, Node } from 'cc';

const { ccclass, property } = _decorator;

/**
 * 面板基类
 * 所有UI面板应该继承此类
 */
@ccclass('BasePanel')
export class BasePanel extends Component {
    /** 面板是否已初始化 */
    protected _isInitialized: boolean = false;

    /** 传入的数据 */
    protected _data: any = null;

    /**
     * 初始化面板
     * 由 UIManager 在显示面板时调用
     * @param data 传入的数据
     */
    public init(data?: any): void {
        this._data = data;
        this._isInitialized = true;
        this.onInit(data);
    }

    /**
     * 初始化回调
     * 子类重写此方法进行初始化
     * @param data 传入的数据
     */
    protected onInit(data?: any): void {
        // 子类实现
    }

    /**
     * 面板关闭回调
     * 由 UIManager 在隐藏面板时调用
     */
    public onClose(): void {
        // 子类可重写
    }

    /**
     * 刷新面板
     * @param data 新数据
     */
    public refresh(data?: any): void {
        if (data !== undefined) {
            this._data = data;
        }
        this.onRefresh();
    }

    /**
     * 刷新回调
     * 子类重写此方法进行刷新
     */
    protected onRefresh(): void {
        // 子类实现
    }

    /**
     * 关闭当前面板
     */
    protected closeSelf(): void {
        // 获取组件名作为面板名
        const panelName = this.constructor.name;
        
        // 通过 UIManager 关闭
        const { UIManager } = require('./UIManager');
        UIManager.instance?.hidePanel(panelName);
    }

    /**
     * 播放打开动画
     * 子类可重写实现自定义动画
     */
    protected playOpenAnimation(): void {
        // 默认无动画
    }

    /**
     * 播放关闭动画
     * 子类可重写实现自定义动画
     * @returns 动画完成的 Promise
     */
    protected playCloseAnimation(): Promise<void> {
        return Promise.resolve();
    }

    /**
     * 安全获取子节点
     * @param path 节点路径
     */
    protected getChildByPath(path: string): Node | null {
        const parts = path.split('/');
        let current: Node | null = this.node;

        for (const part of parts) {
            if (!current) return null;
            current = current.getChildByName(part);
        }

        return current;
    }
}



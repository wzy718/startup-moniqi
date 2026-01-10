import { _decorator, Component, resources, TextAsset, director } from 'cc';
import { CSVParser } from '../utils/CSVParser';

const { ccclass, property } = _decorator;

/**
 * 事件数据接口
 */
export interface EventData {
    id: string;
    name: string;
    description: string;
    type: string;
    conditions: string;
    weight: number;
    choices: string[];
}

/**
 * 选择数据接口
 */
export interface ChoiceData {
    id: string;
    eventId: string;
    text: string;
    successRate: number;
    successEffects: string;
    failEffects: string;
    requirements: string;
}

/**
 * 店铺类型数据接口
 */
export interface ShopTypeData {
    id: string;
    name: string;
    category: string;
    baseRevenue: number;
    baseCost: number;
    description: string;
}

/**
 * 地点数据接口
 */
export interface LocationData {
    id: string;
    name: string;
    rent: number;
    footTraffic: number;
    competition: number;
    description: string;
}

/**
 * 成就数据接口
 */
export interface AchievementData {
    id: string;
    name: string;
    description: string;
    condition: string;
    reward: string;
    rewardType: string;
}

/**
 * 世界事件数据接口
 */
export interface WorldEventData {
    id: string;
    name: string;
    description: string;
    effects: string;
    duration: number;
    probability: number;
}

/**
 * 数据管理器
 * 负责加载和管理所有游戏数据（CSV文件）
 * 使用单例模式
 */
@ccclass('DataManager')
export class DataManager extends Component {
    /** 单例实例 */
    private static _instance: DataManager | null = null;

    /** 事件数据 */
    private _events: Map<string, EventData> = new Map();

    /** 选择数据 */
    private _choices: Map<string, ChoiceData> = new Map();

    /** 店铺类型数据 */
    private _shopTypes: Map<string, ShopTypeData> = new Map();

    /** 地点数据 */
    private _locations: Map<string, LocationData> = new Map();

    /** 成就数据 */
    private _achievements: Map<string, AchievementData> = new Map();

    /** 世界事件数据 */
    private _worldEvents: Map<string, WorldEventData> = new Map();

    /** 数据是否已加载 */
    private _isLoaded: boolean = false;

    /** 获取单例实例 */
    public static get instance(): DataManager {
        return this._instance!;
    }

    /** 获取所有事件数据 */
    public get events(): Map<string, EventData> {
        return this._events;
    }

    /** 获取所有选择数据 */
    public get choices(): Map<string, ChoiceData> {
        return this._choices;
    }

    /** 获取所有店铺类型数据 */
    public get shopTypes(): Map<string, ShopTypeData> {
        return this._shopTypes;
    }

    /** 获取所有地点数据 */
    public get locations(): Map<string, LocationData> {
        return this._locations;
    }

    /** 获取所有成就数据 */
    public get achievements(): Map<string, AchievementData> {
        return this._achievements;
    }

    /** 获取所有世界事件数据 */
    public get worldEvents(): Map<string, WorldEventData> {
        return this._worldEvents;
    }

    onLoad() {
        if (DataManager._instance !== null && DataManager._instance !== this) {
            this.destroy();
            return;
        }
        DataManager._instance = this;
        director.addPersistRootNode(this.node);
    }

    /**
     * 初始化数据管理器
     * 加载所有CSV数据文件
     */
    public async initialize(): Promise<void> {
        if (this._isLoaded) {
            console.log('[DataManager] 数据已加载，跳过');
            return;
        }

        console.log('[DataManager] 开始加载数据...');

        try {
            // 并行加载所有数据文件
            await Promise.all([
                this.loadEvents(),
                this.loadChoices(),
                this.loadShopTypes(),
                this.loadLocations(),
                this.loadAchievements(),
                this.loadWorldEvents()
            ]);

            this._isLoaded = true;
            console.log('[DataManager] 所有数据加载完成');
        } catch (error) {
            console.error('[DataManager] 数据加载失败:', error);
            throw error;
        }
    }

    /**
     * 加载事件数据
     */
    private async loadEvents(): Promise<void> {
        try {
            const data = await this.loadCSV('data/events');
            data.forEach((row: any) => {
                const event: EventData = {
                    id: row.id || '',
                    name: row.name || '',
                    description: row.description || '',
                    type: row.type || 'random',
                    conditions: row.conditions || '',
                    weight: parseFloat(row.weight) || 1,
                    choices: row.choices ? row.choices.split('|') : []
                };
                this._events.set(event.id, event);
            });
            console.log(`[DataManager] 加载了 ${this._events.size} 个事件`);
        } catch (error) {
            console.warn('[DataManager] 事件数据加载失败，使用空数据:', error);
        }
    }

    /**
     * 加载选择数据
     */
    private async loadChoices(): Promise<void> {
        try {
            const data = await this.loadCSV('data/choices');
            data.forEach((row: any) => {
                const choice: ChoiceData = {
                    id: row.id || '',
                    eventId: row.event_id || '',
                    text: row.text || '',
                    successRate: parseFloat(row.success_rate) || 1,
                    successEffects: row.success_effects || '',
                    failEffects: row.fail_effects || '',
                    requirements: row.requirements || ''
                };
                this._choices.set(choice.id, choice);
            });
            console.log(`[DataManager] 加载了 ${this._choices.size} 个选择`);
        } catch (error) {
            console.warn('[DataManager] 选择数据加载失败，使用空数据:', error);
        }
    }

    /**
     * 加载店铺类型数据
     */
    private async loadShopTypes(): Promise<void> {
        try {
            const data = await this.loadCSV('data/shop_types');
            data.forEach((row: any) => {
                const shopType: ShopTypeData = {
                    id: row.id || '',
                    name: row.name || '',
                    category: row.category || '',
                    baseRevenue: parseFloat(row.base_revenue) || 0,
                    baseCost: parseFloat(row.base_cost) || 0,
                    description: row.description || ''
                };
                this._shopTypes.set(shopType.id, shopType);
            });
            console.log(`[DataManager] 加载了 ${this._shopTypes.size} 个店铺类型`);
        } catch (error) {
            console.warn('[DataManager] 店铺类型数据加载失败，使用空数据:', error);
        }
    }

    /**
     * 加载地点数据
     */
    private async loadLocations(): Promise<void> {
        try {
            const data = await this.loadCSV('data/locations');
            data.forEach((row: any) => {
                const location: LocationData = {
                    id: row.id || '',
                    name: row.name || '',
                    rent: parseFloat(row.rent) || 0,
                    footTraffic: parseFloat(row.foot_traffic) || 0,
                    competition: parseFloat(row.competition) || 0,
                    description: row.description || ''
                };
                this._locations.set(location.id, location);
            });
            console.log(`[DataManager] 加载了 ${this._locations.size} 个地点`);
        } catch (error) {
            console.warn('[DataManager] 地点数据加载失败，使用空数据:', error);
        }
    }

    /**
     * 加载成就数据
     */
    private async loadAchievements(): Promise<void> {
        try {
            const data = await this.loadCSV('data/achievements');
            data.forEach((row: any) => {
                const achievement: AchievementData = {
                    id: row.id || '',
                    name: row.name || '',
                    description: row.description || '',
                    condition: row.condition || '',
                    reward: row.reward || '',
                    rewardType: row.reward_type || ''
                };
                this._achievements.set(achievement.id, achievement);
            });
            console.log(`[DataManager] 加载了 ${this._achievements.size} 个成就`);
        } catch (error) {
            console.warn('[DataManager] 成就数据加载失败，使用空数据:', error);
        }
    }

    /**
     * 加载世界事件数据
     */
    private async loadWorldEvents(): Promise<void> {
        try {
            const data = await this.loadCSV('data/world_events');
            data.forEach((row: any) => {
                const worldEvent: WorldEventData = {
                    id: row.id || '',
                    name: row.name || '',
                    description: row.description || '',
                    effects: row.effects || '',
                    duration: parseInt(row.duration) || 1,
                    probability: parseFloat(row.probability) || 0.01
                };
                this._worldEvents.set(worldEvent.id, worldEvent);
            });
            console.log(`[DataManager] 加载了 ${this._worldEvents.size} 个世界事件`);
        } catch (error) {
            console.warn('[DataManager] 世界事件数据加载失败，使用空数据:', error);
        }
    }

    /**
     * 加载CSV文件
     * @param path 资源路径（不含扩展名）
     */
    private loadCSV(path: string): Promise<any[]> {
        return new Promise((resolve, reject) => {
            resources.load(path, TextAsset, (err, textAsset) => {
                if (err) {
                    reject(err);
                    return;
                }
                const data = CSVParser.parse(textAsset.text);
                resolve(data);
            });
        });
    }

    /**
     * 根据ID获取事件
     * @param id 事件ID
     */
    public getEvent(id: string): EventData | undefined {
        return this._events.get(id);
    }

    /**
     * 根据事件ID获取所有选择
     * @param eventId 事件ID
     */
    public getChoicesByEventId(eventId: string): ChoiceData[] {
        const result: ChoiceData[] = [];
        this._choices.forEach((choice) => {
            if (choice.eventId === eventId) {
                result.push(choice);
            }
        });
        return result;
    }

    /**
     * 根据条件筛选事件
     * @param filter 筛选函数
     */
    public filterEvents(filter: (event: EventData) => boolean): EventData[] {
        const result: EventData[] = [];
        this._events.forEach((event) => {
            if (filter(event)) {
                result.push(event);
            }
        });
        return result;
    }

    /**
     * 根据权重随机选择事件
     * @param events 事件列表
     */
    public weightedRandomEvent(events: EventData[]): EventData | null {
        if (events.length === 0) return null;

        const totalWeight = events.reduce((sum, e) => sum + e.weight, 0);
        let random = Math.random() * totalWeight;

        for (const event of events) {
            random -= event.weight;
            if (random <= 0) {
                return event;
            }
        }

        return events[events.length - 1];
    }

    onDestroy() {
        if (DataManager._instance === this) {
            DataManager._instance = null;
        }
    }
}














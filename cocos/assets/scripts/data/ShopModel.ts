import { ShopType, WEEKS_PER_MONTH } from '../core/GameConstants';

/**
 * 员工数据接口
 */
export interface EmployeeData {
    id: string;
    name: string;
    position: string;
    salary: number;
    skill: number;      // 技能值（0-100）
    loyalty: number;    // 忠诚度（0-100）
    hiredWeek: number;  // 入职周数
}

/**
 * 店铺模型类
 * 封装单个店铺的数据和计算逻辑
 */
export class ShopModel {
    /** 店铺ID */
    public id: string = '';

    /** 店铺类型ID */
    public typeId: string = '';

    /** 店铺位置ID */
    public locationId: string = '';

    /** 店铺名称 */
    public name: string = '';

    /** 店铺等级 */
    private _level: number = 1;

    /** 店铺评分（0-5） */
    private _rating: number = 3.0;

    /** 员工列表 */
    private _employees: EmployeeData[] = [];

    /** 是否营业中 */
    private _isOpen: boolean = false;

    /** 是否加盟店 */
    public isFranchise: boolean = false;

    /** 加盟品牌ID（如果是加盟店） */
    public franchiseBrandId: string = '';

    // ========== 基础数值（从配置加载） ==========

    /** 基础日收入 */
    public baseRevenue: number = 0;

    /** 基础日客流 */
    public baseCustomers: number = 0;

    /** 人均消费 */
    public avgSpending: number = 0;

    /** 月租金 */
    public monthlyRent: number = 0;

    /** 毛利率（0-1） */
    public grossMargin: number = 0.3;

    /** 外卖抽成比例（0-1） */
    public deliveryCommission: number = 0.2;

    /** 外卖订单占比（0-1） */
    public deliveryRatio: number = 0;

    // ========== Getters ==========

    public get level(): number { return this._level; }
    public get rating(): number { return this._rating; }
    public get employees(): EmployeeData[] { return this._employees; }
    public get isOpen(): boolean { return this._isOpen; }

    // ========== 派生值计算 ==========

    /** 
     * 每周收入
     * 公式: (基础日收入 * 等级加成 * 评分加成) * 7天
     */
    public get weeklyRevenue(): number {
        if (!this._isOpen) return 0;

        const levelMultiplier = 1 + (this._level - 1) * 0.1;  // 每级+10%
        const ratingMultiplier = 0.6 + this._rating * 0.08;   // 评分加成

        // 计算堂食收入
        const dineInRevenue = this.baseRevenue * (1 - this.deliveryRatio);
        
        // 计算外卖收入（扣除抽成）
        const deliveryRevenue = this.baseRevenue * this.deliveryRatio * (1 - this.deliveryCommission);

        const dailyRevenue = (dineInRevenue + deliveryRevenue) * levelMultiplier * ratingMultiplier;
        
        return Math.floor(dailyRevenue * 7);
    }

    /**
     * 每周成本
     * 包括：周租金 + 员工工资 + 原材料成本 + 水电杂费
     */
    public get weeklyCost(): number {
        if (!this._isOpen) return 0;

        // 周租金 = 月租金 / 4
        const weeklyRent = Math.floor(this.monthlyRent / WEEKS_PER_MONTH);

        // 员工周工资
        const weeklyWages = this.calculateWeeklyWages();

        // 原材料成本 = 收入 * (1 - 毛利率) * 材料占比
        const materialCost = Math.floor(this.weeklyRevenue * (1 - this.grossMargin) * 0.6);

        // 水电杂费 = 收入 * 5%
        const utilities = Math.floor(this.weeklyRevenue * 0.05);

        return weeklyRent + weeklyWages + materialCost + utilities;
    }

    /**
     * 每周利润
     */
    public get weeklyProfit(): number {
        return this.weeklyRevenue - this.weeklyCost;
    }

    /**
     * 每周客流
     */
    public get weeklyCustomers(): number {
        if (!this._isOpen) return 0;

        const levelMultiplier = 1 + (this._level - 1) * 0.05;
        const ratingMultiplier = 0.5 + this._rating * 0.1;

        return Math.floor(this.baseCustomers * 7 * levelMultiplier * ratingMultiplier);
    }

    /**
     * 员工数量
     */
    public get employeeCount(): number {
        return this._employees.length;
    }

    /**
     * 平均员工技能
     */
    public get avgEmployeeSkill(): number {
        if (this._employees.length === 0) return 0;
        const total = this._employees.reduce((sum, e) => sum + e.skill, 0);
        return total / this._employees.length;
    }

    // ========== Setters ==========

    public set level(value: number) {
        this._level = Math.max(1, Math.floor(value));
    }

    public set rating(value: number) {
        this._rating = Math.max(0, Math.min(5, value));
    }

    public set isOpen(value: boolean) {
        this._isOpen = value;
    }

    // ========== 方法 ==========

    /**
     * 计算每周员工工资
     */
    private calculateWeeklyWages(): number {
        // 员工月薪 / 4 = 周薪
        return this._employees.reduce((sum, e) => sum + Math.floor(e.salary / WEEKS_PER_MONTH), 0);
    }

    /**
     * 雇佣员工
     * @param employee 员工数据
     */
    public hireEmployee(employee: EmployeeData): void {
        this._employees.push(employee);
    }

    /**
     * 解雇员工
     * @param employeeId 员工ID
     */
    public fireEmployee(employeeId: string): EmployeeData | null {
        const index = this._employees.findIndex(e => e.id === employeeId);
        if (index !== -1) {
            return this._employees.splice(index, 1)[0];
        }
        return null;
    }

    /**
     * 获取员工
     * @param employeeId 员工ID
     */
    public getEmployee(employeeId: string): EmployeeData | undefined {
        return this._employees.find(e => e.id === employeeId);
    }

    /**
     * 开业
     */
    public open(): void {
        this._isOpen = true;
    }

    /**
     * 停业
     */
    public close(): void {
        this._isOpen = false;
    }

    /**
     * 升级店铺
     * @returns 升级费用
     */
    public upgrade(): number {
        const upgradeCost = this.getUpgradeCost();
        this._level++;
        return upgradeCost;
    }

    /**
     * 获取升级费用
     */
    public getUpgradeCost(): number {
        // 升级费用 = 基础费用 * 等级^1.5
        const baseCost = 50000;
        return Math.floor(baseCost * Math.pow(this._level, 1.5));
    }

    /**
     * 更新评分
     * @param change 变化值
     */
    public updateRating(change: number): void {
        this.rating = this._rating + change;
    }

    /**
     * 从配置数据初始化
     * @param shopTypeData 店铺类型配置
     * @param locationData 位置配置
     */
    public initFromConfig(shopTypeData: any, locationData: any): void {
        this.typeId = shopTypeData.id;
        this.locationId = locationData.id;
        this.baseRevenue = shopTypeData.baseRevenue || 1000;
        this.baseCustomers = shopTypeData.baseCustomers || 50;
        this.avgSpending = shopTypeData.avgSpending || 30;
        this.grossMargin = shopTypeData.grossMargin || 0.3;
        this.monthlyRent = locationData.rent || 10000;
    }

    /**
     * 从存档数据加载
     * @param data 存档数据
     */
    public loadFromSave(data: any): void {
        this.id = data.id || '';
        this.typeId = data.typeId || '';
        this.locationId = data.locationId || '';
        this.name = data.name || '';
        this._level = data.level || 1;
        this._rating = data.rating || 3.0;
        this._employees = data.employees || [];
        this._isOpen = data.isOpen || false;
        this.isFranchise = data.isFranchise || false;
        this.franchiseBrandId = data.franchiseBrandId || '';
        this.baseRevenue = data.baseRevenue || 0;
        this.monthlyRent = data.monthlyRent || 0;
        this.grossMargin = data.grossMargin || 0.3;
        this.deliveryCommission = data.deliveryCommission || 0.2;
        this.deliveryRatio = data.deliveryRatio || 0;
    }

    /**
     * 导出为存档数据
     */
    public toSaveData(): any {
        return {
            id: this.id,
            typeId: this.typeId,
            locationId: this.locationId,
            name: this.name,
            level: this._level,
            rating: this._rating,
            employees: this._employees,
            isOpen: this._isOpen,
            isFranchise: this.isFranchise,
            franchiseBrandId: this.franchiseBrandId,
            baseRevenue: this.baseRevenue,
            monthlyRent: this.monthlyRent,
            grossMargin: this.grossMargin,
            deliveryCommission: this.deliveryCommission,
            deliveryRatio: this.deliveryRatio
        };
    }

    /**
     * 获取格式化的周收入显示
     */
    public getFormattedWeeklyRevenue(): string {
        return this.weeklyRevenue.toLocaleString('zh-CN') + ' 元/周';
    }

    /**
     * 获取格式化的周成本显示
     */
    public getFormattedWeeklyCost(): string {
        return this.weeklyCost.toLocaleString('zh-CN') + ' 元/周';
    }

    /**
     * 获取格式化的周利润显示
     */
    public getFormattedWeeklyProfit(): string {
        const profit = this.weeklyProfit;
        const prefix = profit >= 0 ? '+' : '';
        return prefix + profit.toLocaleString('zh-CN') + ' 元/周';
    }

    /**
     * 获取格式化的评分显示
     */
    public getFormattedRating(): string {
        return this._rating.toFixed(1) + ' ★';
    }
}










import { 
    PersonalityType, 
    INITIAL_CASH, 
    INITIAL_AGE, 
    INITIAL_STRESS, 
    INITIAL_HEALTH, 
    INITIAL_ENERGY, 
    INITIAL_REPUTATION,
    MAX_STRESS,
    MAX_HEALTH,
    MAX_ENERGY,
    MAX_REPUTATION,
    MIN_REPUTATION
} from '../core/GameConstants';

/**
 * 玩家模型类
 * 用于封装玩家数据的操作和验证
 */
export class PlayerModel {
    /** 现金（元） */
    private _cash: number = INITIAL_CASH;

    /** 债务（元） */
    private _debt: number = 0;

    /** 年龄 */
    private _age: number = INITIAL_AGE;

    /** 压力值（0-100） */
    private _stress: number = INITIAL_STRESS;

    /** 健康值（0-100） */
    private _health: number = INITIAL_HEALTH;

    /** 精力值（0-100） */
    private _energy: number = INITIAL_ENERGY;

    /** 声誉值（0-100） */
    private _reputation: number = INITIAL_REPUTATION;

    /** 性格类型 */
    private _personality: PersonalityType = PersonalityType.BALANCED;

    /** 当前周数 */
    private _currentWeek: number = 1;

    // ========== Getters ==========

    public get cash(): number { return this._cash; }
    public get debt(): number { return this._debt; }
    public get age(): number { return this._age; }
    public get stress(): number { return this._stress; }
    public get health(): number { return this._health; }
    public get energy(): number { return this._energy; }
    public get reputation(): number { return this._reputation; }
    public get personality(): PersonalityType { return this._personality; }
    public get currentWeek(): number { return this._currentWeek; }

    // ========== 派生值 Getters ==========

    /** 净资产 = 现金 - 债务 */
    public get netWorth(): number {
        return this._cash - this._debt;
    }

    /** 是否破产 */
    public get isBankrupt(): boolean {
        return this._cash <= 0 && this._debt > 0;
    }

    /** 是否高压力 */
    public get isHighStress(): boolean {
        return this._stress >= 70;
    }

    /** 是否满压力 */
    public get isMaxStress(): boolean {
        return this._stress >= MAX_STRESS;
    }

    /** 是否低健康 */
    public get isLowHealth(): boolean {
        return this._health <= 30;
    }

    // ========== Setters（带验证） ==========

    public set cash(value: number) {
        this._cash = Math.floor(value);  // 取整
    }

    public set debt(value: number) {
        this._debt = Math.max(0, Math.floor(value));  // 非负取整
    }

    public set age(value: number) {
        this._age = Math.max(0, Math.floor(value));  // 非负取整
    }

    public set stress(value: number) {
        this._stress = Math.max(0, Math.min(MAX_STRESS, value));  // 限制在0-100
    }

    public set health(value: number) {
        this._health = Math.max(0, Math.min(MAX_HEALTH, value));  // 限制在0-100
    }

    public set energy(value: number) {
        this._energy = Math.max(0, Math.min(MAX_ENERGY, value));  // 限制在0-100
    }

    public set reputation(value: number) {
        this._reputation = Math.max(MIN_REPUTATION, Math.min(MAX_REPUTATION, value));  // 限制在0-100
    }

    public set personality(value: PersonalityType) {
        this._personality = value;
    }

    public set currentWeek(value: number) {
        this._currentWeek = Math.max(1, Math.floor(value));
    }

    // ========== 方法 ==========

    /**
     * 增加现金
     * @param amount 金额
     */
    public addCash(amount: number): void {
        this.cash = this._cash + amount;
    }

    /**
     * 减少现金
     * @param amount 金额
     * @returns 是否成功（如果现金不足可能导致债务）
     */
    public spendCash(amount: number): boolean {
        if (amount <= this._cash) {
            this.cash = this._cash - amount;
            return true;
        } else {
            // 现金不足，增加债务
            const shortage = amount - this._cash;
            this.cash = 0;
            this.debt = this._debt + shortage;
            return false;
        }
    }

    /**
     * 偿还债务
     * @param amount 偿还金额
     */
    public repayDebt(amount: number): void {
        const repayAmount = Math.min(amount, this._debt);
        this.debt = this._debt - repayAmount;
        this.cash = this._cash - repayAmount;
    }

    /**
     * 增加压力
     * @param amount 压力值
     */
    public addStress(amount: number): void {
        this.stress = this._stress + amount;
    }

    /**
     * 减少压力
     * @param amount 压力值
     */
    public reduceStress(amount: number): void {
        this.stress = this._stress - amount;
    }

    /**
     * 恢复健康
     * @param amount 健康值
     */
    public heal(amount: number): void {
        this.health = this._health + amount;
    }

    /**
     * 损失健康
     * @param amount 健康值
     */
    public damage(amount: number): void {
        this.health = this._health - amount;
    }

    /**
     * 消耗精力
     * @param amount 精力值
     * @returns 是否成功（精力是否足够）
     */
    public consumeEnergy(amount: number): boolean {
        if (this._energy >= amount) {
            this.energy = this._energy - amount;
            return true;
        }
        return false;
    }

    /**
     * 恢复精力
     * @param amount 精力值
     */
    public restoreEnergy(amount: number): void {
        this.energy = this._energy + amount;
    }

    /**
     * 增加声誉
     * @param amount 声誉值
     */
    public addReputation(amount: number): void {
        this.reputation = this._reputation + amount;
    }

    /**
     * 减少声誉
     * @param amount 声誉值
     */
    public reduceReputation(amount: number): void {
        this.reputation = this._reputation - amount;
    }

    /**
     * 增加年龄
     * @param years 年数
     */
    public ageUp(years: number = 1): void {
        this.age = this._age + years;
    }

    /**
     * 推进周数
     * @param weeks 周数
     */
    public advanceWeek(weeks: number = 1): void {
        this.currentWeek = this._currentWeek + weeks;
    }

    /**
     * 重置为初始状态
     */
    public reset(): void {
        this._cash = INITIAL_CASH;
        this._debt = 0;
        this._age = INITIAL_AGE;
        this._stress = INITIAL_STRESS;
        this._health = INITIAL_HEALTH;
        this._energy = INITIAL_ENERGY;
        this._reputation = INITIAL_REPUTATION;
        this._personality = PersonalityType.BALANCED;
        this._currentWeek = 1;
    }

    /**
     * 从存档数据加载
     * @param data 存档数据
     */
    public loadFromSave(data: any): void {
        this.cash = data.cash ?? INITIAL_CASH;
        this.debt = data.debt ?? 0;
        this.age = data.age ?? INITIAL_AGE;
        this.stress = data.stress ?? INITIAL_STRESS;
        this.health = data.health ?? INITIAL_HEALTH;
        this.energy = data.energy ?? INITIAL_ENERGY;
        this.reputation = data.reputation ?? INITIAL_REPUTATION;
        this.personality = data.personality ?? PersonalityType.BALANCED;
        this.currentWeek = data.currentWeek ?? 1;
    }

    /**
     * 导出为存档数据
     */
    public toSaveData(): any {
        return {
            cash: this._cash,
            debt: this._debt,
            age: this._age,
            stress: this._stress,
            health: this._health,
            energy: this._energy,
            reputation: this._reputation,
            personality: this._personality,
            currentWeek: this._currentWeek
        };
    }

    /**
     * 获取格式化的现金显示（带千分位）
     */
    public getFormattedCash(): string {
        return this._cash.toLocaleString('zh-CN') + ' 元';
    }

    /**
     * 获取格式化的债务显示
     */
    public getFormattedDebt(): string {
        return this._debt.toLocaleString('zh-CN') + ' 元';
    }

    /**
     * 获取格式化的净资产显示
     */
    public getFormattedNetWorth(): string {
        const nw = this.netWorth;
        const prefix = nw >= 0 ? '' : '-';
        return prefix + Math.abs(nw).toLocaleString('zh-CN') + ' 元';
    }
}



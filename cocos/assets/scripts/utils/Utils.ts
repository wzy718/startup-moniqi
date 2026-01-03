import { WEEKS_PER_YEAR, WEEKS_PER_MONTH } from '../core/GameConstants';

/**
 * 通用工具类
 * 包含各种实用工具函数
 */
export class Utils {
    /**
     * 生成唯一ID
     * @param prefix 前缀
     * @returns 唯一ID字符串
     */
    public static generateId(prefix: string = ''): string {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substring(2, 8);
        return prefix ? `${prefix}_${timestamp}${random}` : `${timestamp}${random}`;
    }

    /**
     * 格式化数字为带千分位的字符串
     * @param num 数字
     * @param decimals 小数位数
     * @returns 格式化后的字符串
     */
    public static formatNumber(num: number, decimals: number = 0): string {
        return num.toLocaleString('zh-CN', {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
        });
    }

    /**
     * 格式化金额
     * @param amount 金额
     * @param showSign 是否显示正负号
     * @returns 格式化后的字符串
     */
    public static formatCurrency(amount: number, showSign: boolean = false): string {
        const formatted = this.formatNumber(Math.abs(amount));
        const sign = showSign ? (amount >= 0 ? '+' : '-') : (amount < 0 ? '-' : '');
        return `${sign}${formatted} 元`;
    }

    /**
     * 格式化百分比
     * @param value 小数值（0-1）
     * @param decimals 小数位数
     * @returns 格式化后的字符串
     */
    public static formatPercent(value: number, decimals: number = 1): string {
        return (value * 100).toFixed(decimals) + '%';
    }

    /**
     * 格式化周数为可读字符串
     * @param weeks 周数
     * @returns "第X年第X月第X周"格式（游戏口径：1年 = 48周，1月 = 4周）
     */
    public static formatWeeks(weeks: number): string {
        const year = Math.floor((weeks - 1) / WEEKS_PER_YEAR) + 1;
        const weekInYear = ((weeks - 1) % WEEKS_PER_YEAR) + 1;
        const month = Math.ceil(weekInYear / WEEKS_PER_MONTH);
        const weekInMonth = ((weekInYear - 1) % WEEKS_PER_MONTH) + 1;

        return `第${year}年第${month}月第${weekInMonth}周`;
    }

    /**
     * 格式化时间戳为可读字符串
     * @param timestamp 时间戳（毫秒）
     * @returns 格式化后的日期时间字符串
     */
    public static formatTimestamp(timestamp: number): string {
        const date = new Date(timestamp);
        return date.toLocaleString('zh-CN');
    }

    /**
     * 深拷贝对象
     * @param obj 要拷贝的对象
     * @returns 拷贝后的新对象
     */
    public static deepClone<T>(obj: T): T {
        if (obj === null || typeof obj !== 'object') {
            return obj;
        }

        if (Array.isArray(obj)) {
            return obj.map(item => this.deepClone(item)) as any;
        }

        const cloned: any = {};
        for (const key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
                cloned[key] = this.deepClone((obj as any)[key]);
            }
        }
        return cloned;
    }

    /**
     * 随机整数（包含边界）
     * @param min 最小值
     * @param max 最大值
     * @returns 随机整数
     */
    public static randomInt(min: number, max: number): number {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    /**
     * 随机浮点数
     * @param min 最小值
     * @param max 最大值
     * @returns 随机浮点数
     */
    public static randomFloat(min: number, max: number): number {
        return Math.random() * (max - min) + min;
    }

    /**
     * 从数组中随机选择一个元素
     * @param array 数组
     * @returns 随机元素
     */
    public static randomPick<T>(array: T[]): T | undefined {
        if (array.length === 0) return undefined;
        return array[this.randomInt(0, array.length - 1)];
    }

    /**
     * 从数组中按权重随机选择
     * @param items 元素数组
     * @param weights 权重数组
     * @returns 随机选中的元素
     */
    public static weightedRandom<T>(items: T[], weights: number[]): T | undefined {
        if (items.length === 0 || items.length !== weights.length) return undefined;

        const totalWeight = weights.reduce((sum, w) => sum + w, 0);
        let random = Math.random() * totalWeight;

        for (let i = 0; i < items.length; i++) {
            random -= weights[i];
            if (random <= 0) {
                return items[i];
            }
        }

        return items[items.length - 1];
    }

    /**
     * 洗牌算法（Fisher-Yates）
     * @param array 要打乱的数组
     * @returns 打乱后的新数组
     */
    public static shuffle<T>(array: T[]): T[] {
        const result = [...array];
        for (let i = result.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [result[i], result[j]] = [result[j], result[i]];
        }
        return result;
    }

    /**
     * 限制数值在范围内
     * @param value 数值
     * @param min 最小值
     * @param max 最大值
     * @returns 限制后的数值
     */
    public static clamp(value: number, min: number, max: number): number {
        return Math.max(min, Math.min(max, value));
    }

    /**
     * 线性插值
     * @param start 起始值
     * @param end 结束值
     * @param t 插值参数（0-1）
     * @returns 插值结果
     */
    public static lerp(start: number, end: number, t: number): number {
        return start + (end - start) * this.clamp(t, 0, 1);
    }

    /**
     * 检查对象是否为空
     * @param obj 对象
     * @returns 是否为空
     */
    public static isEmpty(obj: any): boolean {
        if (obj === null || obj === undefined) return true;
        if (typeof obj === 'string') return obj.trim() === '';
        if (Array.isArray(obj)) return obj.length === 0;
        if (typeof obj === 'object') return Object.keys(obj).length === 0;
        return false;
    }

    /**
     * 等待指定毫秒数
     * @param ms 毫秒数
     * @returns Promise
     */
    public static wait(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * 防抖函数
     * @param func 要防抖的函数
     * @param wait 等待时间（毫秒）
     * @returns 防抖后的函数
     */
    public static debounce<T extends (...args: any[]) => any>(
        func: T, 
        wait: number
    ): (...args: Parameters<T>) => void {
        let timeout: ReturnType<typeof setTimeout> | null = null;
        
        return function(this: any, ...args: Parameters<T>) {
            if (timeout) {
                clearTimeout(timeout);
            }
            timeout = setTimeout(() => {
                func.apply(this, args);
            }, wait);
        };
    }

    /**
     * 节流函数
     * @param func 要节流的函数
     * @param limit 时间限制（毫秒）
     * @returns 节流后的函数
     */
    public static throttle<T extends (...args: any[]) => any>(
        func: T, 
        limit: number
    ): (...args: Parameters<T>) => void {
        let lastRun = 0;
        
        return function(this: any, ...args: Parameters<T>) {
            const now = Date.now();
            if (now - lastRun >= limit) {
                lastRun = now;
                func.apply(this, args);
            }
        };
    }

    /**
     * 生成中文名字
     * @returns 随机中文名字
     */
    public static generateChineseName(): string {
        const surnames = ['王', '李', '张', '刘', '陈', '杨', '赵', '黄', '周', '吴', '徐', '孙', '胡', '朱', '高'];
        const names = ['伟', '芳', '娜', '秀英', '敏', '静', '丽', '强', '磊', '军', '洋', '勇', '艳', '杰', '娟', 
                       '涛', '明', '超', '秀兰', '霞', '平', '刚', '桂英', '华', '梅', '鑫', '婷', '浩', '宇', '飞'];
        
        const surname = this.randomPick(surnames) || '张';
        const name = this.randomPick(names) || '三';
        
        // 50%概率双名
        if (Math.random() > 0.5) {
            const name2 = this.randomPick(names) || '';
            return surname + name + name2;
        }
        
        return surname + name;
    }

    /**
     * 生成店铺名称
     * @param type 店铺类型
     * @returns 随机店铺名称
     */
    public static generateShopName(type: string = ''): string {
        const prefixes = ['金', '银', '福', '旺', '鑫', '盛', '和', '兴', '祥', '瑞', '顺', '达', '美', '好', '乐'];
        const suffixes = ['记', '轩', '阁', '堂', '坊', '园', '居', '斋', '楼', '庄'];
        
        const prefix = this.randomPick(prefixes) || '金';
        const suffix = this.randomPick(suffixes) || '记';
        
        return prefix + type + suffix;
    }
}















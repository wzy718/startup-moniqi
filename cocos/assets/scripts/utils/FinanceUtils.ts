import { WEEKS_PER_YEAR } from '../core/GameConstants';
import { Utils } from './Utils';

/**
 * 贷款存档数据接口
 * 等额本息：每周固定还款额（最后一周可能因为取整产生微调）
 */
export interface LoanSaveData {
    /** 贷款ID */
    id: string;
    /** 贷款本金（元） */
    principal: number;
    /** 剩余本金（元） */
    remainingPrincipal: number;
    /** 年化利率（0~1） */
    annualRate: number;
    /** 期限（周） */
    termWeeks: number;
    /** 剩余期数（周） */
    remainingWeeks: number;
    /** 每周应还款（元，整数） */
    weeklyPayment: number;
    /** 发放周数（用于展示/回溯） */
    startWeek: number;
}

export interface LoanWeeklyPaymentResult {
    loanId: string;
    /** 本周利息（元） */
    interest: number;
    /** 本周本金（元） */
    principal: number;
    /** 本周实际扣款（元） */
    payment: number;
    /** 还款后剩余本金（元） */
    remainingPrincipalAfter: number;
    /** 还款后剩余期数（周） */
    remainingWeeksAfter: number;
    /** 是否已结清 */
    isSettled: boolean;
}

/**
 * 金融/负债工具
 */
export class FinanceUtils {
    /**
     * 计算贷款列表的总剩余本金（用于同步 player.debt 的展示口径）
     */
    public static sumRemainingPrincipal(loans: LoanSaveData[] | null | undefined): number {
        if (!loans || loans.length === 0) return 0;
        return loans.reduce((sum, loan) => sum + Math.max(0, Math.floor(loan.remainingPrincipal)), 0);
    }

    /**
     * 计算等额本息每周还款额（整数）
     * 说明：
     * - 金额统一按“元整数”存储
     * - 这里用向上取整，保证不会因为舍入导致最后一期还不完
     */
    public static calculateEqualPaymentWeekly(principal: number, annualRate: number, termWeeks: number): number {
        const principalInt = Math.max(0, Math.floor(principal));
        const n = Math.max(1, Math.floor(termWeeks));
        const annual = Math.max(0, annualRate);
        const r = annual / WEEKS_PER_YEAR;

        if (principalInt === 0) return 0;
        if (r <= 0) return Math.ceil(principalInt / n);

        const pow = Math.pow(1 + r, n);
        const payment = principalInt * r * pow / (pow - 1);
        return Math.max(1, Math.ceil(payment));
    }

    /**
     * 创建一笔贷款
     */
    public static createLoan(principal: number, annualRate: number, termWeeks: number, startWeek: number): LoanSaveData {
        const principalInt = Math.max(0, Math.floor(principal));
        const weeks = Math.max(1, Math.floor(termWeeks));
        const annual = Math.max(0, annualRate);
        const weeklyPayment = this.calculateEqualPaymentWeekly(principalInt, annual, weeks);

        return {
            id: Utils.generateId('loan'),
            principal: principalInt,
            remainingPrincipal: principalInt,
            annualRate: annual,
            termWeeks: weeks,
            remainingWeeks: weeks,
            weeklyPayment,
            startWeek: Math.max(1, Math.floor(startWeek))
        };
    }

    /**
     * 计算并应用一笔贷款在本周的还款（会修改 loan 对象）
     * 注意：这里只做“应还金额拆分为利息+本金”的计算，不做现金是否足够的校验。
     */
    public static applyWeeklyPayment(loan: LoanSaveData): LoanWeeklyPaymentResult {
        if (loan.remainingPrincipal <= 0) {
            return {
                loanId: loan.id,
                interest: 0,
                principal: 0,
                payment: 0,
                remainingPrincipalAfter: loan.remainingPrincipal,
                remainingWeeksAfter: loan.remainingWeeks,
                isSettled: true
            };
        }

        const r = loan.annualRate / WEEKS_PER_YEAR;
        const interest = r <= 0 ? 0 : Math.floor(loan.remainingPrincipal * r);
        const scheduledPayment = Math.max(0, Math.floor(loan.weeklyPayment));

        const maxNeed = loan.remainingPrincipal + interest;
        const payment = Math.min(scheduledPayment, maxNeed);
        const principal = Math.max(0, payment - interest);

        loan.remainingPrincipal = Math.max(0, loan.remainingPrincipal - principal);
        loan.remainingWeeks = Math.max(0, loan.remainingWeeks - 1);

        return {
            loanId: loan.id,
            interest,
            principal,
            payment,
            remainingPrincipalAfter: loan.remainingPrincipal,
            remainingWeeksAfter: loan.remainingWeeks,
            isSettled: loan.remainingPrincipal <= 0
        };
    }
}

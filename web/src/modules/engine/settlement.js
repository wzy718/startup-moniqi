import { DAYS_PER_MONTH, MONTHS_PER_YEAR, STRESS_DEATH_MONTHS } from "./constants.js";
import { clamp } from "../utils/parse.js";
import { applyEffects } from "./effects.js";
import { getWorldModifiersForShop, tickWorldEvents } from "./world.js";
import { estimateTotalAsset, evaluateAchievements } from "./achievements.js";
import { syncStateAfterEffects } from "./sync.js";

export function advanceWeek({ state, data, event, choice, choiceOutcome, rng }) {
  const turnMonth = state.currentWeek;

  const before = snapshotPlayer(state);
  const applied = applyEffects(state, getOutcomeEffects(choice, choiceOutcome), {
    outcome: choiceOutcome.outcome,
  });
  syncStateAfterEffects(state);

  // followup：仅在 fail outcome 时入队（legacy 口径）
  if (applied.followupEventId) {
    state.pendingEventQueue = state.pendingEventQueue || [];
    state.pendingEventQueue.push(applied.followupEventId);
  }

  // 经营结算：逐店计算
  const shopResult = settleShops(state, data, rng);
  state.player.cash = Math.round(state.player.cash + shopResult.shopProfitTotal);

  // 玩家结算：生活费与贷款
  const livingExpense = Math.round(state.player.livingExpense || 0);
  state.player.cash = Math.round(state.player.cash - livingExpense);
  const loanPaymentTotal = settleLoans(state);

  // 状态结算：自然恢复（含 MBTI 修正）
  settleStatus(state, data);

  // 时间推进
  state.currentWeek += 1;
  state.player.stats.weeksSurvived += 1;
  if (state.currentWeek > 1 && (state.currentWeek - 1) % MONTHS_PER_YEAR === 0) {
    state.player.age += 1;
  }

  // 世界事件持续递减
  tickWorldEvents(state);

  // 成就检查（在死亡/破产判定前）
  const derived = {
    player_weekly_profit_total: shopResult.shopProfitTotal,
    total_asset: estimateTotalAsset(state),
  };
  const unlocked = evaluateAchievements(state, data, derived);

  // 破产/死亡判定
  if (state.player.cash <= 0) {
    state.gameOver = true;
    state.gameOverReason = "破产：现金归零";
    state.player.stats.wasBankruptOnce = true;
  }
  if (state.player.stress >= 100 && state.player.stressMaxMonths >= STRESS_DEATH_MONTHS) {
    state.gameOver = true;
    state.gameOverReason = "崩溃：压力满值过久";
  }

  const after = snapshotPlayer(state);

  const weeklyNetCashflow = Math.round(after.cash - before.cash);
  const summary = {
    week: turnMonth,
    eventId: event.id,
    eventTitle: event.title,
    choiceCode: choice.code,
    outcome: choiceOutcome.outcome,
    successRate: choiceOutcome.successRate,
    roll: choiceOutcome.roll,
    cashBefore: before.cash,
    cashAfter: after.cash,
    weeklyNetCashflow,
    shopProfitTotal: shopResult.shopProfitTotal,
    livingExpense,
    loanPaymentTotal,
    applied,
    shopBreakdown: shopResult.shopBreakdown,
    unlockedAchievements: unlocked,
  };

  state.lastTurn = summary;
  state.eventHistory[event.id] = {
    count: (state.eventHistory[event.id]?.count ?? 0) + 1,
    lastWeek: turnMonth,
  };
  state.timeline.push({
    week: turnMonth,
    title: `${event.title}（选 ${choice.code} · ${choiceOutcome.outcome === "success" ? "成功" : "失败"}）`,
    net: weeklyNetCashflow,
  });

  return summary;
}

function getOutcomeEffects(choice, choiceOutcome) {
  const outcome = choiceOutcome.outcome;
  if (outcome === "success") return choice.outcomes?.success?.effects ?? [];
  return choice.outcomes?.fail?.effects ?? [];
}

function settleShops(state, data, rng) {
  const mods = getWorldModifiersForShop(state, data);
  let shopProfitTotal = 0;
  const shopBreakdown = [];

  (state.shops || []).forEach((shop) => {
    const type = data.shopTypes.get(shop.typeId);
    const loc = data.locations.get(shop.locationId);

    const revenuePotentialFactor = mapRevenuePotential(type?.revenue_potential);
    const trafficBase = 140;
    const ratingFactor = clamp(0.6 + (Number(shop.rating || 3) - 3) * 0.15, 0.6, 1.4);
    const trafficBonus = 1 + (state.player.mods?.traffic_bonus || 0);

    const dailyCustomersBase =
      trafficBase * (loc?.traffic_multiplier ?? 1) * revenuePotentialFactor * ratingFactor * trafficBonus;

    const dineRatio = 0.6;
    const delRatio = 0.4;
    const trafficMult = dineRatio * mods.dineInTrafficMult + delRatio * mods.deliveryTrafficMult;

    const dailyCustomers = Math.max(0, Math.round(dailyCustomersBase * trafficMult));
    const weeklyCustomers = Math.round(dailyCustomers * DAYS_PER_MONTH);

    const avgTicket = rollAvgTicket(type, rng) * mods.avgTicketMult;
    const revenue = Math.round(weeklyCustomers * avgTicket);

    const grossMargin = clamp(type?.gross_margin ?? 0.6, 0, 1);
    const cogs = Math.round(revenue * (1 - grossMargin) * mods.cogsCostMult);

    const weeklyRent = Math.round(estimateWeeklyRent(shop, type, loc));
    const weeklyOpsCost = Math.round((type?.daily_cost_base ?? 0) * DAYS_PER_MONTH);
    const weeklyLabor = Math.round((shop.staffCount || type?.ideal_staff || 2) * 1100 * mods.laborCostMult);

    const forcedClosed = rng.next() < mods.forcedCloseChance;
    const effectiveRevenue = forcedClosed ? 0 : revenue;
    const effectiveCogs = forcedClosed ? 0 : cogs;

    const profit = Math.round(
      effectiveRevenue - effectiveCogs - weeklyRent - weeklyOpsCost - weeklyLabor - mods.weeklyFixedCostAdd,
    );

    shop.lastWeekProfit = profit;
    shop.lastWeekRevenue = effectiveRevenue;
    shopProfitTotal += profit;
    shopBreakdown.push({
      shopId: shop.id,
      shopName: shop.name,
      revenue: effectiveRevenue,
      profit,
      forcedClosed,
    });
  });

  updateProfitStreak(state, shopProfitTotal);
  updateHealthStreak(state);

  return { shopProfitTotal, shopBreakdown };
}

function estimateWeeklyRent(shop, type, loc) {
  const area = shop.area || type?.ideal_area || 30;
  const rentPerSqmMonthly = 200;
  const monthlyRent = Math.round(area * rentPerSqmMonthly * (loc?.rent_multiplier ?? 1));
  return Math.floor(monthlyRent);
}

function rollAvgTicket(type, rng) {
  const min = Math.max(1, type?.avg_ticket_min ?? 10);
  const max = Math.max(min, type?.avg_ticket_max ?? min);
  const base = rng.nextInt(min, max);
  return base;
}

function mapRevenuePotential(v) {
  const s = String(v || "medium").trim();
  if (s === "high") return 1.15;
  if (s === "medium_high") return 1.08;
  if (s === "medium") return 1.0;
  if (s === "low_medium") return 0.92;
  if (s === "low") return 0.85;
  return 1.0;
}

function settleLoans(state) {
  const loans = Array.isArray(state.player.loans) ? state.player.loans : [];
  let paid = 0;

  state.player.loans = loans.filter((loan) => {
    const remaining = Math.max(0, Math.round(loan.remaining_principal ?? 0));
    if (remaining <= 0) return false;

    const annualRate = Number(loan.annual_rate ?? 0);
    const weeklyRate = annualRate / MONTHS_PER_YEAR;
    const interest = Math.floor(remaining * weeklyRate);
    const weeklyPayment = Math.max(0, Math.round(loan.weekly_payment ?? 0));

    const payment = Math.min(weeklyPayment, remaining + interest);
    const principalPaid = Math.max(0, payment - interest);

    loan.remaining_principal = Math.max(0, remaining - principalPaid);

    state.player.cash = Math.round(state.player.cash - payment);
    paid += payment;
    return loan.remaining_principal > 0;
  });

  return paid;
}

function settleStatus(state, data) {
  const mbti = data.mbti.get(state.player.mbti);
  const stressRecoveryMul = Number(mbti?.stress_recovery ?? 1);

  const stressRecover = Math.round(2 * (Number.isFinite(stressRecoveryMul) ? stressRecoveryMul : 1));
  state.player.stress = clamp(Math.round(state.player.stress - stressRecover), 0, 100);
  state.player.health = clamp(Math.round(state.player.health + 1), 0, 100);
  state.player.energy = clamp(Math.round(state.player.energy + 6), 0, 100);

  if (state.player.stress >= 100) state.player.stressMaxMonths += 1;
  else state.player.stressMaxMonths = 0;
}

function updateProfitStreak(state, shopProfitTotal) {
  if (shopProfitTotal > 0) state.player.stats.profitStreak += 1;
  else state.player.stats.profitStreak = 0;
}

function updateHealthStreak(state) {
  if (state.player.health >= 100) state.player.stats.healthStreak += 1;
  else state.player.stats.healthStreak = 0;
}

function snapshotPlayer(state) {
  return {
    cash: Math.round(state.player.cash),
    stress: Math.round(state.player.stress),
    health: Math.round(state.player.health),
    reputation: Math.round(state.player.reputation),
    age: Math.round(state.player.age),
  };
}

import { clamp } from "../utils/parse.js";

export function estimateTotalAsset(state) {
  const cash = Math.round(state.player.cash || 0);
  const shopValue = (state.shops || []).reduce((a, s) => a + estimateShopValue(s), 0);
  const debt = (state.player.loans || []).reduce((a, l) => a + Math.round(l.remaining_principal || 0), 0);
  return Math.round(cash + shopValue - debt);
}

export function evaluateAchievements(state, data, derived) {
  const unlocked = [];
  const unlockedMap = state.player.achievementsUnlocked || {};
  state.player.achievementsUnlocked = unlockedMap;

  data.achievements.forEach((ach) => {
    if (unlockedMap[ach.id]) return;
    if (!isAchievementMet(ach, state, derived)) return;

    unlockedMap[ach.id] = true;
    const rewardMsg = applyAchievementReward(state, ach);
    unlocked.push({ id: ach.id, name: ach.name, icon: ach.icon, rewardMsg });
  });

  return unlocked;
}

function isAchievementMet(ach, state, derived) {
  const value = readConditionValue(ach.condition_type, state, derived);
  const cond = parseConditionValue(ach.condition_value);

  if (cond.kind === "compare") return compare(value, cond.op, cond.num);
  if (cond.kind === "number") return Number(value) >= cond.num;
  if (cond.kind === "bool") return Boolean(value) === cond.bool;

  return String(value) === cond.token;
}

function readConditionValue(type, state, derived) {
  const t = String(type || "").trim();
  if (t === "cash") return state.player.cash;
  if (t === "total_asset") return derived.total_asset ?? estimateTotalAsset(state);
  if (t === "player_weekly_profit_total") return derived.player_weekly_profit_total ?? 0;
  if (t === "profit_streak") return state.player.stats.profitStreak ?? 0;
  if (t === "shop_count") return (state.shops || []).length;
  if (t === "weeks_survived") return state.player.stats.weeksSurvived ?? 0;
  if (t === "inheritance_count") return state.player.stats.inheritanceCount ?? 0;
  if (t === "bankruptcy_recovery") return false;
  if (t === "max_stress_survived") return state.player.stress ?? 0;
  if (t === "health_streak") return state.player.stats.healthStreak ?? 0;
  if (t === "reputation") return state.player.reputation ?? 0;
  if (t === "shop_rating") return Math.max(...(state.shops || []).map((s) => Number(s.rating || 0)), 0);
  if (t === "crisis_handled") return state.player.stats.crisisHandled ?? 0;
  if (t === "total_staff_hired") return state.player.stats.totalStaffHired ?? 0;
  if (t === "staff_tenure") return 0;
  if (t === "shop_types_tried") return 0;
  if (t === "alien_survived") return false;
  if (t === "ads_watched") return state.player.stats.adsWatched ?? 0;
  return 0;
}

function parseConditionValue(s) {
  const raw = String(s || "").trim();

  const m = raw.match(/^(>=|<=|>|<|=)\\s*(-?\\d+(?:\\.\\d+)?)$/);
  if (m) return { kind: "compare", op: m[1], num: Number(m[2]) };

  if (raw === "true" || raw === "false") return { kind: "bool", bool: raw === "true" };

  const n = Number(raw);
  if (Number.isFinite(n)) return { kind: "number", num: n };

  return { kind: "token", token: raw };
}

function compare(a, op, b) {
  const x = Number(a);
  if (!Number.isFinite(x)) return false;
  if (op === ">") return x > b;
  if (op === ">=") return x >= b;
  if (op === "<") return x < b;
  if (op === "<=") return x <= b;
  if (op === "=") return x === b;
  return false;
}

function applyAchievementReward(state, ach) {
  const type = String(ach.reward_type || "").trim();
  const value = String(ach.reward_value || "").trim();

  if (type === "cash") {
    const n = Number.parseInt(value, 10);
    if (Number.isFinite(n)) state.player.cash = Math.round(state.player.cash + n);
    return `现金 ${n >= 0 ? "+" : ""}${n}`;
  }

  if (type === "stress") {
    const n = Number.parseInt(value, 10);
    if (Number.isFinite(n)) state.player.stress = clamp(Math.round(state.player.stress + n), 0, 100);
    return `压力 ${n >= 0 ? "+" : ""}${n}`;
  }

  if (type === "title") {
    if (value) state.player.title = value;
    return `称号：${value}`;
  }

  if (type === "unlock") {
    state.unlocked = state.unlocked || {};
    state.unlocked[value] = true;
    return `解锁：${value}`;
  }

  if (type === "ad_skip") {
    state.player.welfare = state.player.welfare || { skipTickets: 0 };
    const n = Number.parseInt(value, 10);
    if (Number.isFinite(n)) state.player.welfare.skipTickets = (state.player.welfare.skipTickets || 0) + n;
    return `跳过券 +${n}`;
  }

  if (type === "hire_bonus" || type === "traffic_bonus" || type === "loyalty_bonus" || type === "hire_cost") {
    const delta = parsePercent(value);
    if (delta === null) return `${type} ${value}`;
    state.player.mods[type] = (state.player.mods[type] || 0) + delta;
    return `${type} ${delta >= 0 ? "+" : ""}${Math.round(delta * 100)}%`;
  }

  return `${type} ${value}`.trim();
}

function parsePercent(s) {
  const raw = String(s || "").trim();
  const m = raw.match(/^([+-])?(\\d+(?:\\.\\d+)?)%$/);
  if (!m) return null;
  const sign = m[1] === "-" ? -1 : 1;
  const n = Number(m[2]);
  if (!Number.isFinite(n)) return null;
  return (sign * n) / 100;
}

function estimateShopValue(shop) {
  const p = Math.round(shop.lastWeekProfit || 0);
  // 简化估值：近周利润 × 20（后续可替换为更严谨的估值模型）
  return Math.max(0, p * 20);
}


import { matchConditions } from "./conditions.js";
import { getSeasonId } from "./time.js";

export function pickWeeklyEvent(state, data, rng) {
  const followup = shiftQueuedEvent(state);
  if (followup) {
    const ev = data.events.find((e) => e.id === followup);
    if (ev) return ev;
  }

  const ctx = buildContext(state);
  const candidates = data.events
    .map((ev) => ({ ev, weight: computeWeight(ev, ctx, state) }))
    .filter(({ ev, weight }) => weight > 0 && matchConditions(ev.conditions, ctx) && isAllowed(ev, state));

  if (candidates.length === 0) {
    return getFallbackEvent();
  }

  return weightedPick(candidates, rng).ev;
}

export function getVisibleChoices(eventId, state, data) {
  const list = data.choicesByEventId.get(eventId) ?? [];
  const ctx = buildContext(state);
  const visible = list.filter((c) => matchChoiceVisibility(c.visibility, ctx));
  return visible.length ? visible : [getFallbackChoice(eventId)];
}

export function resolveChoiceOutcome(choice, state, rng) {
  const base = clamp01(choice?.resolution?.success_rate ?? 1);
  const bonusKey = String(choice?.resolution?.mbti_bonus || "").trim();
  const hasBonus = bonusKey && String(state.player.mbti || "").includes(bonusKey);
  const rate = clamp01(base + (hasBonus ? 0.1 : 0));

  const roll = rng.next();
  const isSuccess = roll < rate;
  return { outcome: isSuccess ? "success" : "fail", successRate: rate, roll };
}

export function getFallbackEvent() {
  return buildFallbackEvent();
}

export function getFallbackChoice(eventId) {
  return buildFallbackChoice(eventId);
}

function buildContext(state) {
  const season = getSeasonId(state.currentWeek);
  const shopTypeIds = (state.shops || []).map((s) => s.typeId);
  const operationModes = (state.shops || []).map((s) => s.operationMode || "normal");

  return {
    week: state.currentWeek,
    cash: state.player.cash,
    stress: state.player.stress,
    reputation: state.player.reputation,
    season,
    shopTypeIds,
    operationModes,
    flags: state.flags || {},
  };
}

function isAllowed(event, state) {
  const h = state.eventHistory?.[event.id];
  if (!h) return true;

  if (event.occurrence?.once_only && h.count > 0) return false;
  if (event.occurrence?.max_total >= 0 && h.count >= event.occurrence.max_total) return false;

  const cd = event.occurrence?.cooldown_turns ?? 0;
  if (cd > 0 && h.lastWeek && state.currentWeek - h.lastWeek <= cd) return false;

  return true;
}

function computeWeight(event, ctx, state) {
  let w = Number(event.baseWeight || 1);
  if (!Number.isFinite(w) || w <= 0) return 0;

  const adv = String(event?.meta?.mbti_advantage || "").trim();
  if (adv && String(state.player.mbti || "").includes(adv)) w *= 1.2;

  (event.weightRules || []).forEach((rule) => {
    if (!rule || typeof rule !== "object") return;
    const when = rule.when && typeof rule.when === "object" ? rule.when : null;
    if (!when) return;
    if (!matchConditions({ ...ctxToConditions(ctx), ...when }, ctx)) return;
    const op = String(rule.op || "").trim();
    const v = Number(rule.value);
    if (!Number.isFinite(v)) return;
    if (op === "mul") w *= v;
    if (op === "add") w += v;
  });

  return w;
}

function ctxToConditions(ctx) {
  return {
    week: [ctx.week, ctx.week],
    cash: [ctx.cash, ctx.cash],
    stress: [ctx.stress, ctx.stress],
    reputation: [ctx.reputation, ctx.reputation],
    shop_type_in: ctx.shopTypeIds,
    operation_mode_in: ctx.operationModes,
    season_in: [ctx.season],
    required_flags_all: [],
    required_flags_any: [],
    excluded_flags_any: [],
  };
}

function weightedPick(candidates, rng) {
  const total = candidates.reduce((a, x) => a + x.weight, 0);
  let r = rng.next() * total;
  for (const x of candidates) {
    r -= x.weight;
    if (r <= 0) return x;
  }
  return candidates[candidates.length - 1];
}

function buildFallbackEvent() {
  return {
    schema: "builtin",
    id: "SYS_NOTHING",
    category: "system",
    title: "本月无事发生",
    description: "市场平稳的一个月。你要选择更稳，还是更拼？",
    tags: [],
    baseWeight: 1,
    conditions: {
      week: [1, 999999],
      cash: [-999999999, 999999999],
      reputation: [-100, 100],
      stress: [0, 100],
      shop_type_in: ["ALL"],
      operation_mode_in: ["ALL"],
      season_in: ["ALL"],
      required_flags_all: [],
      required_flags_any: [],
      excluded_flags_any: [],
    },
    occurrence: { cooldown_turns: 0, max_total: -1, once_only: false },
    weightRules: [],
    meta: { notes: "兜底事件：避免因表条件过严导致无法推进" },
  };
}

function buildFallbackChoice(eventId) {
  return {
    schema: "builtin",
    uid: `${eventId}_SKIP`,
    eventId,
    code: "A",
    text: "稳住：休息一下（压力-3，健康+1）",
    visibility: { required_flags_all: [], required_flags_any: [], excluded_flags_any: [] },
    resolution: { type: "prob", success_rate: 1 },
    outcomes: {
      success: {
        text: "你给自己留了一点喘息空间。",
        effects: [
          { scope: "stat", target: "stress", op: "add", value: -3 },
          { scope: "stat", target: "health", op: "add", value: 1 },
        ],
      },
      fail: { text: "", effects: [] },
    },
    meta: { notes: "兜底选项" },
  };
}

function matchChoiceVisibility(vis, ctx) {
  if (!vis) return true;
  const flags = ctx.flags || {};
  const all = Array.isArray(vis.required_flags_all) ? vis.required_flags_all : [];
  const any = Array.isArray(vis.required_flags_any) ? vis.required_flags_any : [];
  const ex = Array.isArray(vis.excluded_flags_any) ? vis.excluded_flags_any : [];
  if (all.some((f) => !flags[f])) return false;
  if (any.length && !any.some((f) => flags[f])) return false;
  if (ex.some((f) => flags[f])) return false;
  return true;
}

function shiftQueuedEvent(state) {
  const q = state.pendingEventQueue || [];
  const id = q.shift();
  state.pendingEventQueue = q;
  return id;
}

function clamp01(v) {
  return Math.max(0, Math.min(1, v));
}

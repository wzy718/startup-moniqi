import { clamp } from "../utils/parse.js";

export function maybeTriggerWorldEvents(state, data, rng) {
  const activated = [];

  data.worldEvents.forEach((def) => {
    if (isWorldEventActive(state, def.id)) return;
    if (!matchTriggerCondition(def.trigger_condition, state)) return;
    if (rng.next() >= def.probability) return;

    const remainingWeeks = rollDuration(def, rng);
    state.world.activeEvents.push({
      id: def.id,
      name: def.name,
      remainingWeeks,
    });

    if (def.one_time_cost_add) {
      state.player.cash = Math.round(state.player.cash - def.one_time_cost_add);
    }
    if (def.rating_delta && state.shops?.length) {
      state.shops[0].rating = clamp(round1(state.shops[0].rating + def.rating_delta), 1, 5);
    }
    def.world_flags_add?.forEach((f) => {
      state.flags[f] = true;
    });

    activated.push(def);
  });

  return activated;
}

export function tickWorldEvents(state) {
  state.world.activeEvents = (state.world.activeEvents || []).filter((ev) => {
    if (ev.remainingWeeks === -1) return true;
    ev.remainingWeeks -= 1;
    return ev.remainingWeeks > 0;
  });
}

export function getWorldModifiersForShop(state, data) {
  const active = state.world.activeEvents || [];
  const defsById = new Map(data.worldEvents.map((x) => [x.id, x]));

  const mods = {
    dineInTrafficMult: 1,
    deliveryTrafficMult: 1,
    avgTicketMult: 1,
    laborCostMult: 1,
    cogsCostMult: 1,
    weeklyFixedCostAdd: 0,
    forcedCloseChance: 0,
    shopDamageChance: 0,
  };

  active.forEach((a) => {
    const def = defsById.get(a.id);
    if (!def) return;

    mods.dineInTrafficMult *= def.dine_in_traffic_mult ?? 1;
    mods.deliveryTrafficMult *= def.delivery_traffic_mult ?? 1;
    mods.avgTicketMult *= def.avg_ticket_mult ?? 1;
    mods.laborCostMult *= def.labor_cost_mult ?? 1;
    mods.cogsCostMult *= def.cogs_cost_mult ?? 1;
    mods.weeklyFixedCostAdd += def.weekly_fixed_cost_add ?? 0;

    mods.forcedCloseChance = orChance(mods.forcedCloseChance, def.forced_close_chance ?? 0);
    mods.shopDamageChance = orChance(mods.shopDamageChance, def.shop_damage_chance ?? 0);
  });

  mods.dineInTrafficMult = clamp(mods.dineInTrafficMult, 0, 3);
  mods.deliveryTrafficMult = clamp(mods.deliveryTrafficMult, 0, 3);
  mods.avgTicketMult = clamp(mods.avgTicketMult, 0, 3);
  mods.laborCostMult = clamp(mods.laborCostMult, 0, 3);
  mods.cogsCostMult = clamp(mods.cogsCostMult, 0, 3);
  mods.forcedCloseChance = clamp(mods.forcedCloseChance, 0, 1);
  mods.shopDamageChance = clamp(mods.shopDamageChance, 0, 1);

  return mods;
}

function orChance(a, b) {
  return 1 - (1 - clamp(a, 0, 1)) * (1 - clamp(b, 0, 1));
}

function isWorldEventActive(state, eventId) {
  return (state.world.activeEvents || []).some((x) => x.id === eventId);
}

function rollDuration(def, rng) {
  const min = def.duration_min ?? 0;
  const max = def.duration_max ?? 0;
  if (min === -1 && max === -1) return -1;
  return rng.nextInt(Math.max(1, min), Math.max(1, max));
}

function matchTriggerCondition(expr, state) {
  const s = (expr || "none").trim();
  if (!s || s === "none") return true;

  const mWeek = s.match(/^week\\s*(>=|<=|>|<)\\s*(\\d+)$/i);
  if (mWeek) {
    const op = mWeek[1];
    const n = Number.parseInt(mWeek[2], 10);
    return compare(state.currentWeek, op, n);
  }

  const mCash = s.match(/^cash\\s*(>=|<=|>|<)\\s*(\\d+)$/i);
  if (mCash) {
    const op = mCash[1];
    const n = Number.parseInt(mCash[2], 10);
    return compare(state.player.cash, op, n);
  }

  const mRating = s.match(/^rating\\s*(>=|<=|>|<)\\s*(\\d+(?:\\.\\d+)?)$/i);
  if (mRating) {
    const op = mRating[1];
    const n = Number.parseFloat(mRating[2]);
    const rating = state.shops?.length ? Number(state.shops[0].rating || 0) : 0;
    return compare(rating, op, n);
  }

  const mLoc = s.match(/^location\\s*=\\s*([A-Za-z0-9_-]+)$/i);
  if (mLoc) {
    const locId = mLoc[1];
    return (state.shops || []).some((sp) => sp.locationId === locId);
  }

  return true;
}

function compare(a, op, b) {
  if (op === ">") return a > b;
  if (op === ">=") return a >= b;
  if (op === "<") return a < b;
  if (op === "<=") return a <= b;
  return false;
}

function round1(n) {
  return Math.round(n * 10) / 10;
}


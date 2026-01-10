import { clamp } from "../utils/parse.js";

export function applyEffects(state, effects, { outcome }) {
  const applied = {
    cashDelta: 0,
    stressDelta: 0,
    healthDelta: 0,
    reputationDelta: 0,
    energyDelta: 0,
    moraleDelta: 0,
    ratingDelta: 0,
    flagsAdded: [],
    flagsRemoved: [],
    followupEventId: "",
  };

  effects.forEach((eff) => {
    if (!eff || typeof eff !== "object") return;
    const scope = String(eff.scope || "").trim();
    const op = String(eff.op || "").trim();

    if (scope === "stat") {
      const target = String(eff.target || "").trim();
      const value = Number(eff.value || 0);
      if (op === "add") applyPlayerStatAdd(state, target, value, applied);
      if (op === "mul") applyPlayerStatMul(state, target, value, applied);
      return;
    }

    if (scope === "shop_stat") {
      if (op !== "add" && op !== "mul") return;
      const target = eff.target && typeof eff.target === "object" ? eff.target : null;
      if (!target) return;
      applyShopStat(state, target, op, Number(eff.value || 0), applied);
      return;
    }

    if (scope === "flag") {
      const flag = String(eff.target || "").trim();
      if (!flag) return;
      if (op === "add") {
        state.flags[flag] = true;
        applied.flagsAdded.push(flag);
      } else if (op === "remove") {
        delete state.flags[flag];
        applied.flagsRemoved.push(flag);
      }
      return;
    }

    if (scope === "system") {
      // legacy：把 followup_event_id 放在 fail outcome 的 effects 里
      if (outcome !== "fail") return;
      const target = eff.target && typeof eff.target === "object" ? eff.target : null;
      if (!target) return;
      if (target.key === "followup_event_id" && op === "set") {
        const id = String(eff.value || "").trim();
        if (id) applied.followupEventId = id;
      }
    }
  });

  return applied;
}

function applyPlayerStatAdd(state, target, value, applied) {
  if (!Number.isFinite(value) || !value) return;

  if (target === "cash") {
    state.player.cash = Math.round(state.player.cash + value);
    applied.cashDelta += Math.round(value);
    return;
  }

  if (target === "stress") {
    state.player.stress = clamp(Math.round(state.player.stress + value), 0, 100);
    applied.stressDelta += Math.round(value);
    return;
  }

  if (target === "health") {
    state.player.health = clamp(Math.round(state.player.health + value), 0, 100);
    applied.healthDelta += Math.round(value);
    return;
  }

  if (target === "energy") {
    state.player.energy = clamp(Math.round(state.player.energy + value), 0, 100);
    applied.energyDelta += Math.round(value);
    return;
  }

  if (target === "reputation") {
    state.player.reputation = clamp(Math.round(state.player.reputation + value), 0, 100);
    applied.reputationDelta += Math.round(value);
    return;
  }

  if (target === "morale") {
    state.player.morale = clamp(Math.round((state.player.morale ?? 50) + value), 0, 100);
    applied.moraleDelta += Math.round(value);
  }
}

function applyPlayerStatMul(state, target, value) {
  if (!Number.isFinite(value) || value === 1) return;

  if (target === "cash") {
    state.player.cash = Math.round(state.player.cash * value);
    return;
  }

  if (target === "stress") {
    state.player.stress = clamp(Math.round(state.player.stress * value), 0, 100);
    return;
  }

  if (target === "health") {
    state.player.health = clamp(Math.round(state.player.health * value), 0, 100);
    return;
  }

  if (target === "energy") {
    state.player.energy = clamp(Math.round(state.player.energy * value), 0, 100);
    return;
  }

  if (target === "reputation") {
    state.player.reputation = clamp(Math.round(state.player.reputation * value), 0, 100);
  }
}

function applyShopStat(state, target, op, value, applied) {
  if (!Number.isFinite(value) || (op === "add" && !value) || (op === "mul" && value === 1)) return;

  const shop = resolveShopRef(state, target.shop);
  if (!shop) return;

  if (target.stat === "rating") {
    const before = Number(shop.rating || 0);
    const next =
      op === "add" ? clamp(round1(before + value), 1, 5) : clamp(round1(before * value), 1, 5);
    shop.rating = next;
    applied.ratingDelta += round1(next - before);
  }
}

function resolveShopRef(state, ref) {
  if (!state.shops || state.shops.length === 0) return null;
  if (!ref || ref === "main") return state.shops[0];
  return state.shops.find((s) => s.id === ref) || state.shops[0];
}

function round1(n) {
  return Math.round(n * 10) / 10;
}


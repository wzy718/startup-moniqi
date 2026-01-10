import {
  GAME_STATE_VERSION,
  INITIAL_AGE,
  INITIAL_CASH,
  INITIAL_ENERGY,
  INITIAL_HEALTH,
  INITIAL_LIVING_EXPENSE,
  INITIAL_REPUTATION,
  INITIAL_STRESS,
} from "./constants.js";
import { clamp } from "../utils/parse.js";
import { seedFromNow } from "./rng.js";

export const SAVE_KEY = "kd_sim_save_v1";

export function createNewGame({ playerName, mbtiId, shopTypeId, locationId }, data) {
  const seed = seedFromNow();
  const mbti = data.mbti.get(mbtiId);

  const player = {
    name: playerName || "阿店老板",
    title: "稳健经营者",
    mbti: mbtiId || "INTJ",
    cash: Math.round(INITIAL_CASH + (mbti?.delta_cash ?? 0)),
    stress: clamp(Math.round(INITIAL_STRESS + (mbti?.delta_stress ?? 0)), 0, 100),
    health: clamp(Math.round(INITIAL_HEALTH + (mbti?.delta_health ?? 0)), 0, 100),
    energy: clamp(Math.round(INITIAL_ENERGY + (mbti?.delta_energy ?? 0)), 0, 100),
    reputation: clamp(
      Math.round(INITIAL_REPUTATION + (mbti?.delta_reputation ?? 0)),
      0,
      100,
    ),
    age: INITIAL_AGE,
    livingExpense: INITIAL_LIVING_EXPENSE,
    relationshipStatus: "single",
    hasChildren: false,
    childrenCount: 0,
    loans: [],
    mods: {
      traffic_bonus: 0,
      hire_bonus: 0,
      loyalty_bonus: 0,
      hire_cost: 0,
    },
    stats: {
      weeksSurvived: 0,
      profitStreak: 0,
      healthStreak: 0,
      crisisHandled: 0,
      totalStaffHired: 0,
      inheritanceCount: 0,
      adsWatched: 0,
      wasBankruptOnce: false,
    },
    stressMaxWeeks: 0,
    achievementsUnlocked: {},
  };

  const shops = [createInitialShop({ shopTypeId, locationId }, data)];

  return {
    version: GAME_STATE_VERSION,
    rngSeed: seed,
    currentWeek: 1,
    currentEvent: null,
    player,
    shops,
    flags: { single: true },
    world: { activeEvents: [] },
    timeline: [],
    pendingEventQueue: [],
    eventHistory: {},
    lastTurn: null,
    gameOver: false,
    gameOverReason: "",
  };
}

function createInitialShop({ shopTypeId, locationId }, data) {
  const type = data.shopTypes.get(shopTypeId) ?? Array.from(data.shopTypes.values())[0];
  const loc = data.locations.get(locationId) ?? Array.from(data.locations.values())[0];

  const id = "s1";
  const name = `${type?.name || "店铺"} · ${loc?.name || "未知位置"}`;

  return {
    id,
    name,
    typeId: type?.id || "milk_tea",
    locationId: loc?.id || "street",
    operationMode: "normal",
    area: type?.ideal_area ?? 30,
    staffCount: type?.ideal_staff ?? 2,
    rating: 4.2,
    lastWeekProfit: 0,
    lastWeekRevenue: 0,
  };
}

export function loadSavedGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    if (parsed.version !== GAME_STATE_VERSION) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveGame(state) {
  localStorage.setItem(SAVE_KEY, JSON.stringify(state));
}

export function resetSave() {
  localStorage.removeItem(SAVE_KEY);
}

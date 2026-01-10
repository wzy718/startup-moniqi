import {
  asBool,
  asFloat,
  asInt,
  asJson,
  clamp,
  splitTokens,
  toFloatOrNull,
} from "../utils/parse.js";

export function normalizeTables(tables) {
  const eventsTable = tables["events_new_schema_sample.csv"] || tables["events.csv"];
  const choicesTable = tables["choices_new_schema_sample.csv"] || tables["choices.csv"];

  const events = normalizeEvents(eventsTable.records);
  const choicesByEventId = groupChoicesByEventId(normalizeChoices(choicesTable.records));

  return {
    source: { tables },
    events,
    choicesByEventId,
    worldEvents: normalizeWorldEvents(tables["world_events.csv"]?.records ?? []),
    locations: normalizeLocations(tables["locations.csv"]?.records ?? []),
    achievements: normalizeAchievements(tables["achievements.csv"]?.records ?? []),
    shopTypes: normalizeShopTypes(tables["shop_types.csv"]?.records ?? []),
    mbti: normalizeMbti(tables["mbti.csv"]?.records ?? []),
    brands: normalizeBrands(tables["brands.csv"]?.records ?? []),
    positions: normalizePositions(tables["positions.csv"]?.records ?? []),
  };
}

function normalizeEvents(rows) {
  if (!rows.length) return [];
  const isNewSchema = Object.prototype.hasOwnProperty.call(rows[0], "conditions_json");
  return isNewSchema ? normalizeEventsNew(rows) : normalizeEventsLegacy(rows);
}

function normalizeEventsLegacy(rows) {
  return rows
    .filter((r) => r.event_id)
    .map((r) => {
      const weekMin = asInt(r.week_min, 1);
      const weekMax = asInt(r.week_max, 999999);
      const cashMin = asInt(r.cash_min, -999999999);
      const cashMax = asInt(r.cash_max, 999999999);
      const stressMin = asInt(r.stress_min, 0);
      const stressMax = asInt(r.stress_max, 100);

      return {
        schema: "legacy_v1",
        id: r.event_id,
        category: r.category || "",
        title: r.title || r.event_id,
        description: r.desc || "",
        tags: [],
        baseWeight: asFloat(r.weight, 1),
        conditions: {
          week: [weekMin, weekMax],
          cash: [cashMin, cashMax],
          reputation: [-100, 100],
          stress: [stressMin, stressMax],
          shop_type_in: r.shop_type ? [r.shop_type] : ["ALL"],
          operation_mode_in: r.operation_mode ? [r.operation_mode] : ["ALL"],
          season_in: r.season ? [r.season] : ["ALL"],
          required_flags_all: splitTokens(r.required_flags),
          required_flags_any: [],
          excluded_flags_any: splitTokens(r.excluded_flags),
        },
        occurrence: {
          cooldown_turns: 0,
          max_total: -1,
          once_only: false,
        },
        weightRules: [],
        meta: {
          notes: r.notes || "",
          mbti_advantage: (r.mbti_advantage || "").trim(),
        },
      };
    });
}

function normalizeEventsNew(rows) {
  return rows
    .filter((r) => r.event_id)
    .map((r) => {
      const tags = asJson(r.tags_json, []);
      const pools = asJson(r.pools_json, []);
      const conditions = asJson(r.conditions_json, {});
      const occurrence = asJson(r.occurrence_json, {});
      const weightRules = asJson(r.weight_rules_json, []);
      const scene = asJson(r.scene_json, []);
      const meta = asJson(r.meta_json, {});

      const baseWeight = calcBaseWeightFromPools(pools);

      return {
        schema: "json_v1",
        id: r.event_id,
        category: "",
        title: r.title || r.event_id,
        description: r.description || "",
        tags: Array.isArray(tags) ? tags : [],
        baseWeight,
        conditions: {
          week: toRangeOrDefault(conditions.week, [1, 999999]),
          cash: toRangeOrDefault(conditions.cash, [-999999999, 999999999]),
          reputation: toRangeOrDefault(conditions.reputation, [-100, 100]),
          stress: toRangeOrDefault(conditions.stress, [0, 100]),
          shop_type_in: normalizeInList(conditions.shop_type_in),
          operation_mode_in: normalizeInList(conditions.operation_mode_in),
          season_in: normalizeInList(conditions.season_in),
          required_flags_all: Array.isArray(conditions.required_flags_all)
            ? conditions.required_flags_all
            : [],
          required_flags_any: Array.isArray(conditions.required_flags_any)
            ? conditions.required_flags_any
            : [],
          excluded_flags_any: Array.isArray(conditions.excluded_flags_any)
            ? conditions.excluded_flags_any
            : [],
        },
        occurrence: {
          cooldown_turns: asInt(occurrence.cooldown_turns, 0),
          max_total: asInt(occurrence.max_total, -1),
          once_only: asBool(occurrence.once_only, false),
        },
        weightRules: Array.isArray(weightRules) ? weightRules : [],
        meta: {
          is_absurd_menu: asBool(r.is_absurd_menu, false),
          scene: Array.isArray(scene) ? scene : [],
          ...meta,
        },
      };
    });
}

function calcBaseWeightFromPools(pools) {
  if (!Array.isArray(pools) || pools.length === 0) return 1;
  const w = pools
    .map((p) => asFloat(p?.weight, 0))
    .filter((x) => Number.isFinite(x));
  return Math.max(0.001, w.length ? Math.max(...w) : 1);
}

function normalizeChoices(rows) {
  if (!rows.length) return [];
  const isNewSchema = Object.prototype.hasOwnProperty.call(rows[0], "outcomes_json");
  return isNewSchema ? normalizeChoicesNew(rows) : normalizeChoicesLegacy(rows);
}

function normalizeChoicesLegacy(rows) {
  return rows
    .filter((r) => r.event_id && r.choice_id)
    .map((r) => {
      let mbtiBonus = (r.mbti_bonus || "").trim();
      let successRateCell = (r.success_rate || "").trim();
      const parsedRate = toFloatOrNull(successRateCell);
      if (parsedRate === null && successRateCell && isMbtiLetter(successRateCell) && !mbtiBonus) {
        // 兼容：把字母误填到了 success_rate 列（例如把 N 写到了 success_rate）
        mbtiBonus = successRateCell.toUpperCase();
        successRateCell = "";
      }
      const successRate = clamp(toFloatOrNull(successRateCell) ?? 1, 0, 1);

      const statDeltas = {
        cash: asInt(r.delta_cash, 0),
        stress: asInt(r.delta_stress, 0),
        health: asInt(r.delta_health, 0),
        reputation: asInt(r.delta_reputation, 0),
        morale: asInt(r.delta_morale, 0),
        rating: asFloat(r.delta_rating, 0),
      };

      return {
        schema: "legacy_v1",
        uid: `${r.event_id}_${r.choice_id}`,
        eventId: r.event_id,
        code: r.choice_id,
        text: r.choice_text || r.choice_id,
        visibility: {
          required_flags_all: [],
          required_flags_any: [],
          excluded_flags_any: [],
        },
        resolution: { type: "prob", success_rate: successRate, mbti_bonus: mbtiBonus },
        outcomes: {
          success: {
            text: "",
            effects: legacyDeltasToEffects(statDeltas, {
              addsFlags: splitTokens(r.adds_flags),
              removesFlags: splitTokens(r.removes_flags),
              followupEventId: (r.followup_event_id || "").trim(),
            }),
          },
          fail: {
            text: "",
            effects: legacyDeltasToEffects(statDeltas, {
              addsFlags: splitTokens(r.adds_flags),
              removesFlags: splitTokens(r.removes_flags),
              followupEventId: (r.followup_event_id || "").trim(),
              failOnlyNegative: true,
            }),
          },
        },
        meta: { notes: r.notes || "" },
      };
    });
}

function isMbtiLetter(s) {
  const x = String(s || "").trim().toUpperCase();
  return x === "E" || x === "I" || x === "S" || x === "N" || x === "T" || x === "F" || x === "J" || x === "P";
}

function legacyDeltasToEffects(
  deltas,
  { addsFlags = [], removesFlags = [], followupEventId = "", failOnlyNegative = false },
) {
  const effects = [];

  Object.entries(deltas).forEach(([key, rawValue]) => {
    if (!rawValue) return;
    const value = failOnlyNegative ? Math.min(0, rawValue) : rawValue;
    if (!value) return;

    if (key === "rating") {
      effects.push({
        scope: "shop_stat",
        target: { shop: "main", stat: "rating" },
        op: "add",
        value,
      });
      return;
    }

    effects.push({ scope: "stat", target: key, op: "add", value });
  });

  addsFlags.forEach((flag) => effects.push({ scope: "flag", target: flag, op: "add", value: 1 }));
  removesFlags.forEach((flag) =>
    effects.push({ scope: "flag", target: flag, op: "remove", value: 1 }),
  );

  if (followupEventId) {
    effects.push({
      scope: "system",
      target: { key: "followup_event_id" },
      op: "set",
      value: followupEventId,
    });
  }

  return effects;
}

function normalizeChoicesNew(rows) {
  return rows
    .filter((r) => r.choice_uid && r.event_id && r.choice_code)
    .map((r) => {
      const visibility = asJson(r.visibility_json, {});
      const resolution = asJson(r.resolution_json, {});
      const outcomes = asJson(r.outcomes_json, {});
      const tags = asJson(r.tags_json, []);
      const meta = asJson(r.meta_json, {});

      const type = (resolution.type || "prob").trim();
      const successRate = clamp(asFloat(resolution.success_rate, 1), 0, 1);

      return {
        schema: "json_v1",
        uid: r.choice_uid,
        eventId: r.event_id,
        code: r.choice_code,
        text: r.choice_text || r.choice_code,
        visibility: {
          required_flags_all: Array.isArray(visibility.required_flags_all)
            ? visibility.required_flags_all
            : [],
          required_flags_any: Array.isArray(visibility.required_flags_any)
            ? visibility.required_flags_any
            : [],
          excluded_flags_any: Array.isArray(visibility.excluded_flags_any)
            ? visibility.excluded_flags_any
            : [],
        },
        resolution: { type, success_rate: successRate },
        outcomes: {
          success: normalizeOutcome(outcomes.success),
          fail: normalizeOutcome(outcomes.fail),
        },
        tags: Array.isArray(tags) ? tags : [],
        meta: { ...meta },
      };
    });
}

function normalizeOutcome(outcome) {
  const obj = outcome && typeof outcome === "object" ? outcome : {};
  const effects = Array.isArray(obj.effects) ? obj.effects : [];
  return {
    text: typeof obj.text === "string" ? obj.text : "",
    effects,
  };
}

function groupChoicesByEventId(choices) {
  const map = new Map();
  choices.forEach((c) => {
    const list = map.get(c.eventId) ?? [];
    list.push(c);
    map.set(c.eventId, list);
  });
  map.forEach((list) => list.sort((a, b) => a.code.localeCompare(b.code)));
  return map;
}

function normalizeWorldEvents(rows) {
  return rows
    .filter((r) => r.event_id)
    .map((r) => ({
      id: r.event_id,
      name: r.name || r.event_id,
      probability: clamp(asFloat(r.probability, 0), 0, 1),
      scope: (r.scope || "global").trim(),
      duration_min: asInt(r.duration_min, 0),
      duration_max: asInt(r.duration_max, 0),
      dine_in_traffic_mult: clamp(asFloat(r.dine_in_traffic_mult, 1), 0, 3),
      delivery_traffic_mult: clamp(asFloat(r.delivery_traffic_mult, 1), 0, 3),
      avg_ticket_mult: clamp(asFloat(r.avg_ticket_mult, 1), 0, 3),
      labor_cost_mult: clamp(asFloat(r.labor_cost_mult, 1), 0, 3),
      cogs_cost_mult: clamp(asFloat(r.cogs_cost_mult, 1), 0, 3),
      weekly_fixed_cost_add: asInt(r.weekly_fixed_cost_add, 0),
      one_time_cost_add: asInt(r.one_time_cost_add, 0),
      forced_close_chance: clamp(asFloat(r.forced_close_chance, 0), 0, 1),
      shop_damage_chance: clamp(asFloat(r.shop_damage_chance, 0), 0, 1),
      rating_delta: asFloat(r.rating_delta, 0),
      competition_index_delta: asInt(r.competition_index_delta, 0),
      category_trust_delta: asInt(r.category_trust_delta, 0),
      world_flags_add: splitTokens(r.world_flags_add),
      recovery_weeks: asInt(r.recovery_weeks, 0),
      trigger_condition: (r.trigger_condition || "none").trim(),
      description: r.description || "",
    }));
}

function normalizeLocations(rows) {
  const map = new Map();
  rows
    .filter((r) => r.location_id)
    .forEach((r) => {
      map.set(r.location_id, {
        id: r.location_id,
        name: r.name || r.location_id,
        rent_multiplier: asFloat(r.rent_multiplier, 1),
        traffic_multiplier: asFloat(r.traffic_multiplier, 1),
        competition_base: asInt(r.competition_base, 50),
        stability: r.stability || "medium",
        weekday_modifier: asFloat(r.weekday_modifier, 1),
        weekend_modifier: asFloat(r.weekend_modifier, 1),
        holiday_modifier: asFloat(r.holiday_modifier, 1),
        weather_sensitive: asBool(r.weather_sensitive, false),
        operating_hours: r.operating_hours || "",
        suitable_types: splitTokens(r.suitable_types),
        core_spot_chance: clamp(asFloat(r.core_spot_chance, 0), 0, 1),
        poor_spot_chance: clamp(asFloat(r.poor_spot_chance, 0), 0, 1),
        core_rent_mult: asFloat(r.core_rent_mult, 1),
        core_traffic_mult: asFloat(r.core_traffic_mult, 1),
        poor_rent_mult: asFloat(r.poor_rent_mult, 1),
        poor_traffic_mult: asFloat(r.poor_traffic_mult, 1),
        description: r.description || "",
      });
    });
  return map;
}

function normalizeShopTypes(rows) {
  const map = new Map();
  rows
    .filter((r) => r.type_id)
    .forEach((r) => {
      map.set(r.type_id, {
        id: r.type_id,
        name: r.name || r.type_id,
        startup_cost_min: asInt(r.startup_cost_min, 0),
        startup_cost_max: asInt(r.startup_cost_max, 0),
        daily_cost_base: asInt(r.daily_cost_base, 0),
        revenue_potential: (r.revenue_potential || "medium").trim(),
        difficulty: (r.difficulty || "medium").trim(),
        gross_margin: clamp(asFloat(r.gross_margin, 0.6), 0, 1),
        avg_ticket_min: asInt(r.avg_ticket_min, 10),
        avg_ticket_max: asInt(r.avg_ticket_max, 20),
        min_staff: asInt(r.min_staff, 1),
        ideal_staff: asInt(r.ideal_staff, 2),
        min_area: asInt(r.min_area, 10),
        ideal_area: asInt(r.ideal_area, 30),
        season_effect: (r.season_effect || "none").trim(),
        description: r.description || "",
      });
    });
  return map;
}

function normalizeAchievements(rows) {
  return rows
    .filter((r) => r.achievement_id)
    .map((r) => ({
      id: r.achievement_id,
      name: r.name || r.achievement_id,
      description: r.description || "",
      condition_type: (r.condition_type || "").trim(),
      condition_value: (r.condition_value || "").trim(),
      reward_type: (r.reward_type || "").trim(),
      reward_value: (r.reward_value || "").trim(),
      hidden: asBool(r.hidden, false),
      tier: (r.tier || "").trim(),
      icon: (r.icon || "").trim(),
    }));
}

function normalizeMbti(rows) {
  const map = new Map();
  rows
    .filter((r) => r.mbti)
    .forEach((r) => {
      map.set(r.mbti, {
        id: r.mbti,
        name: r.name || r.mbti,
        group: r.group || "",
        delta_cash: asInt(r.delta_cash, 0),
        delta_stress: asInt(r.delta_stress, 0),
        delta_health: asInt(r.delta_health, 0),
        delta_energy: asInt(r.delta_energy, 0),
        delta_reputation: asInt(r.delta_reputation, 0),
        social_success: asFloat(r.social_success, 1),
        hire_speed: asInt(r.hire_speed, 0),
        stress_recovery: asFloat(r.stress_recovery, 1),
        analysis_accuracy: asFloat(r.analysis_accuracy, 1),
        cost_control: asFloat(r.cost_control, 1),
        opportunity_discovery: asFloat(r.opportunity_discovery, 1),
        financial_decision: asFloat(r.financial_decision, 1),
        staff_loyalty: asFloat(r.staff_loyalty, 1),
        customer_satisfaction: asFloat(r.customer_satisfaction, 1),
        plan_efficiency: asFloat(r.plan_efficiency, 1),
        emergency_response: asFloat(r.emergency_response, 1),
        special_effect: (r.special_effect || "").trim(),
        description: r.description || "",
      });
    });
  return map;
}

function normalizeBrands(rows) {
  const map = new Map();
  rows
    .filter((r) => r.brand_id)
    .forEach((r) => {
      map.set(r.brand_id, {
        id: r.brand_id,
        name: r.name || r.brand_id,
        brand_type: (r.brand_type || "").trim(),
        franchise_fee: asInt(r.franchise_fee, 0),
        royalty_rate: asFloat(r.royalty_rate, 0),
        monthly_fee: asInt(r.monthly_fee, 0),
        territory_protection: (r.territory_protection || "").trim(),
        menu_freedom: (r.menu_freedom || "").trim(),
        support_level: (r.support_level || "").trim(),
        description: r.description || "",
      });
    });
  return map;
}

function normalizePositions(rows) {
  const map = new Map();
  rows
    .filter((r) => r.position_id)
    .forEach((r) => {
      map.set(r.position_id, {
        id: r.position_id,
        name: r.name || r.position_id,
        salary_min: asInt(r.salary_min, 0),
        salary_max: asInt(r.salary_max, 0),
        impact_quality: asFloat(r.impact_quality, 0),
        impact_service: asFloat(r.impact_service, 0),
        impact_hygiene: asFloat(r.impact_hygiene, 0),
        impact_efficiency: asFloat(r.impact_efficiency, 0),
        can_manage: asBool(r.can_manage, false),
        required_for: splitTokens(r.required_for),
        optional_for: splitTokens(r.optional_for),
        description: r.description || "",
      });
    });
  return map;
}

function normalizeInList(value) {
  if (!value) return ["ALL"];
  if (Array.isArray(value)) return value.length ? value : ["ALL"];
  if (typeof value === "string") return value.trim() ? [value.trim()] : ["ALL"];
  return ["ALL"];
}

function toRangeOrDefault(value, def) {
  if (!value) return def;
  if (Array.isArray(value) && value.length === 2) return value;
  return def;
}

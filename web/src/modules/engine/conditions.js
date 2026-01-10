// 条件解释器（对齐 docs/数值/字段字典.md 的 conditions_json 口径）

export function matchConditions(conditions, ctx) {
  if (!conditions) return true;

  if (!inRange(ctx.week, conditions.week)) return false;
  if (!inRange(ctx.cash, conditions.cash)) return false;
  if (!inRange(ctx.stress, conditions.stress)) return false;
  if (!inRange(ctx.reputation, conditions.reputation)) return false;

  if (!matchInList(conditions.shop_type_in, ctx.shopTypeIds)) return false;
  if (!matchInList(conditions.operation_mode_in, ctx.operationModes)) return false;
  if (!matchInList(conditions.season_in, [ctx.season])) return false;

  if (!hasAllFlags(ctx.flags, conditions.required_flags_all)) return false;
  if (!hasAnyFlags(ctx.flags, conditions.required_flags_any)) return false;
  if (hasExcludedFlags(ctx.flags, conditions.excluded_flags_any)) return false;

  return true;
}

function inRange(value, range) {
  if (!range || !Array.isArray(range) || range.length !== 2) return true;
  const [min, max] = range;
  return value >= min && value <= max;
}

function matchInList(list, values) {
  if (!list || !Array.isArray(list) || list.length === 0) return true;
  if (list.includes("ALL")) return true;
  return values.some((v) => list.includes(v));
}

function hasAllFlags(flagsMap, required) {
  if (!required || required.length === 0) return true;
  return required.every((f) => Boolean(flagsMap[f]));
}

function hasAnyFlags(flagsMap, requiredAny) {
  if (!requiredAny || requiredAny.length === 0) return true;
  return requiredAny.some((f) => Boolean(flagsMap[f]));
}

function hasExcludedFlags(flagsMap, excludedAny) {
  if (!excludedAny || excludedAny.length === 0) return false;
  return excludedAny.some((f) => Boolean(flagsMap[f]));
}

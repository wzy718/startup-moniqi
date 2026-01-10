export function asInt(value, fallback) {
  if (value === null || value === undefined || value === "") return fallback;
  const n = Number.parseInt(String(value), 10);
  return Number.isFinite(n) ? n : fallback;
}

export function asFloat(value, fallback) {
  if (value === null || value === undefined || value === "") return fallback;
  const n = Number.parseFloat(String(value));
  return Number.isFinite(n) ? n : fallback;
}

export function toFloatOrNull(value) {
  if (value === null || value === undefined || value === "") return null;
  const n = Number.parseFloat(String(value));
  return Number.isFinite(n) ? n : null;
}

export function asBool(value, fallback) {
  if (value === null || value === undefined || value === "") return fallback;
  if (typeof value === "boolean") return value;
  const s = String(value).trim().toLowerCase();
  if (s === "true" || s === "1") return true;
  if (s === "false" || s === "0") return false;
  return fallback;
}

export function splitTokens(value) {
  if (!value) return [];
  return String(value)
    .split("|")
    .map((x) => x.trim())
    .filter(Boolean);
}

export function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

export function asJson(value, fallback) {
  if (value === null || value === undefined) return fallback;
  const s = String(value).trim();
  if (!s) return fallback;
  try {
    return JSON.parse(s);
  } catch {
    return fallback;
  }
}


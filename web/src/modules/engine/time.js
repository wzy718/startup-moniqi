import { WEEKS_PER_YEAR } from "./constants.js";

export function getSeasonId(week) {
  const weekInYear = ((Math.max(1, week) - 1) % WEEKS_PER_YEAR) + 1;
  if (weekInYear <= 12) return "spring";
  if (weekInYear <= 24) return "summer";
  if (weekInYear <= 36) return "autumn";
  return "winter";
}

export function getSeasonLabel(seasonId) {
  if (seasonId === "spring") return { name: "春", icon: "🌱" };
  if (seasonId === "summer") return { name: "夏", icon: "☀️" };
  if (seasonId === "autumn") return { name: "秋", icon: "🍂" };
  return { name: "冬", icon: "❄️" };
}


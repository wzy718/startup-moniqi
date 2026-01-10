import { MONTHS_PER_YEAR } from "./constants.js";

export function getSeasonId(month) {
  const monthInYear = ((Math.max(1, month) - 1) % MONTHS_PER_YEAR) + 1;
  if (monthInYear <= 3) return "spring";
  if (monthInYear <= 6) return "summer";
  if (monthInYear <= 9) return "autumn";
  return "winter";
}

export function getSeasonLabel(seasonId) {
  if (seasonId === "spring") return { name: "春", icon: "🌱" };
  if (seasonId === "summer") return { name: "夏", icon: "☀️" };
  if (seasonId === "autumn") return { name: "秋", icon: "🍂" };
  return { name: "冬", icon: "❄️" };
}

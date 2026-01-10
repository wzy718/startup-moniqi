import { clamp } from "../utils/parse.js";

export function fmtMoney(n) {
  const x = Math.abs(Math.round(Number(n) || 0));
  const sign = Number(n) < 0 ? "-" : "";
  return sign + "¥ " + x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

export function fmtSignedMoney(n) {
  const v = Math.round(Number(n) || 0);
  if (v === 0) return "± " + fmtMoney(0).replace("¥ ", "¥ ");
  const sign = v > 0 ? "+ " : "- ";
  return sign + fmtMoney(Math.abs(v)).replace("¥ ", "¥ ");
}

export function fmtSignedInt(n) {
  const v = Math.round(Number(n) || 0);
  if (v === 0) return "±0";
  return (v > 0 ? "+" : "-") + Math.abs(v);
}

export function fmtPct01(n) {
  const v = clamp(Number(n) || 0, 0, 1);
  return `${Math.round(v * 100)}%`;
}


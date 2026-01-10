import { parseCsv } from "./csv.js";
import { normalizeTables } from "./normalize.js";

export function getDefaultDataBaseUrl() {
  return "../docs/数值";
}

export async function loadGameData({ baseUrl }) {
  const safeBaseUrl = (baseUrl || getDefaultDataBaseUrl()).replace(/\/+$/g, "");

  const tables = await loadTables({
    baseUrl: safeBaseUrl,
    filenames: [
      "events_new_schema_sample.csv",
      "choices_new_schema_sample.csv",
      "world_events.csv",
      "locations.csv",
      "achievements.csv",
      "shop_types.csv",
      "mbti.csv",
      "brands.csv",
      "positions.csv",
    ],
  });

  return normalizeTables(tables);
}

async function loadTables({ baseUrl, filenames }) {
  const entries = await Promise.all(
    filenames.map(async (filename) => {
      const url = `${baseUrl}/${filename}`;
      const text = await fetchText(url);
      const table = parseCsv(text);
      return [filename, table];
    }),
  );

  return Object.fromEntries(entries);
}

async function fetchText(url) {
  const res = await fetch(encodeURI(url), { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`读取失败：${url}（HTTP ${res.status}）`);
  }
  return await res.text();
}

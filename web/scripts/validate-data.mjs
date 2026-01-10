import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { parseCsv } from "../src/modules/data/csv.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");
const dataDir = path.join(repoRoot, "docs", "数值");

const files = [
  "events_new_schema_sample.csv",
  "choices_new_schema_sample.csv",
  "world_events.csv",
  "locations.csv",
  "achievements.csv",
  "shop_types.csv",
  "mbti.csv",
];

const errors = [];
const warnings = [];

const tables = {};
for (const filename of files) {
  const fullPath = path.join(dataDir, filename);
  const text = await fs.readFile(fullPath, "utf8");
  tables[filename] = parseCsv(text);
}

const events = tables["events_new_schema_sample.csv"].records;
const choices = tables["choices_new_schema_sample.csv"].records;
const worldEvents = tables["world_events.csv"].records;
const achievements = tables["achievements.csv"].records;
const locations = tables["locations.csv"].records;
const shopTypes = tables["shop_types.csv"].records;
const mbti = tables["mbti.csv"].records;

const eventIdSet = ensureUnique(events, "event_id", "events_new_schema_sample.csv");
ensureUnique(worldEvents, "event_id", "world_events.csv");
ensureUnique(achievements, "achievement_id", "achievements.csv");
ensureUnique(locations, "location_id", "locations.csv");
ensureUnique(shopTypes, "type_id", "shop_types.csv");
ensureUnique(mbti, "mbti", "mbti.csv");

validateChoices(choices, eventIdSet, "choices_new_schema_sample.csv");
validateWorldEvents(worldEvents);
validateAchievements(achievements);

printResult();
process.exit(errors.length ? 1 : 0);

function ensureUnique(rows, key, fileLabel) {
  const set = new Set();
  rows.forEach((r, index) => {
    const id = String(r[key] || "").trim();
    if (!id) {
      errors.push(`${fileLabel} 第 ${index + 2} 行：缺少 ${key}`);
      return;
    }
    if (set.has(id)) {
      errors.push(`${fileLabel}：重复主键 ${key}=${id}`);
      return;
    }
    set.add(id);
  });
  return set;
}

function validateChoices(rows, eventIds, fileLabel) {
  rows.forEach((r, index) => {
    const eventId = String(r.event_id || "").trim();
    const choiceId = String(r.choice_id || r.choice_code || "").trim();
    if (!eventId) {
      errors.push(`${fileLabel} 第 ${index + 2} 行：缺少 event_id`);
      return;
    }
    if (!choiceId) {
      errors.push(`${fileLabel} 第 ${index + 2} 行：缺少 choice_id/choice_code`);
      return;
    }
    if (!eventIds.has(eventId)) {
      errors.push(`${fileLabel} 第 ${index + 2} 行：event_id=${eventId} 在 events_new_schema_sample.csv 中不存在`);
    }

    const rateRaw = String(r.success_rate || "").trim();
    if (rateRaw) {
      const rate = Number(rateRaw);
      if (!Number.isFinite(rate)) {
        const mbtiBonus = String(r.mbti_bonus || "").trim();
        if (isMbtiLetter(rateRaw) && !mbtiBonus) {
          warnings.push(
            `${fileLabel} 第 ${index + 2} 行：success_rate=${rateRaw} 疑似写错列（建议移到 mbti_bonus）`,
          );
        } else {
          errors.push(`${fileLabel} 第 ${index + 2} 行：success_rate=${rateRaw} 不是数字`);
        }
        return;
      }
      if (rate < 0 || rate > 1) {
        errors.push(`${fileLabel} 第 ${index + 2} 行：success_rate=${rateRaw} 不在 0~1`);
      }
    }

    const follow = String(r.followup_event_id || "").trim();
    if (follow && !eventIds.has(follow)) {
      warnings.push(
        `${fileLabel} 第 ${index + 2} 行：followup_event_id=${follow} 未在 events_new_schema_sample.csv 中找到（可能是占位）`,
      );
    }
  });
}

function isMbtiLetter(s) {
  const x = String(s || "").trim().toUpperCase();
  return x === "E" || x === "I" || x === "S" || x === "N" || x === "T" || x === "F" || x === "J" || x === "P";
}

function validateWorldEvents(rows) {
  rows.forEach((r, index) => {
    const pRaw = String(r.probability || "").trim();
    const p = Number(pRaw);
    if (!Number.isFinite(p) || p < 0 || p > 1) {
      errors.push(`world_events.csv 第 ${index + 2} 行：probability=${pRaw} 不在 0~1`);
    }
  });
}

function validateAchievements(rows) {
  rows.forEach((r, index) => {
    const type = String(r.condition_type || "").trim();
    const reward = String(r.reward_type || "").trim();
    if (!type) errors.push(`achievements.csv 第 ${index + 2} 行：缺少 condition_type`);
    if (!reward) errors.push(`achievements.csv 第 ${index + 2} 行：缺少 reward_type`);
  });
}

function printResult() {
  const ok = errors.length === 0;
  console.log(ok ? "数据校验通过" : "数据校验失败");
  console.log(`- events: ${events.length}`);
  console.log(`- choices: ${choices.length}`);
  console.log(`- world_events: ${worldEvents.length}`);
  console.log(`- achievements: ${achievements.length}`);
  console.log("");

  if (warnings.length) {
    console.log("Warnings:");
    warnings.forEach((w) => console.log(`- ${w}`));
    console.log("");
  }

  if (errors.length) {
    console.log("Errors:");
    errors.forEach((err) => console.log(`- ${err}`));
  }
}

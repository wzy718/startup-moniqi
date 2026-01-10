// CSV 解析器（无依赖，兼容 Excel 导出的双引号转义）
// 约定：首行表头；空行跳过；值保留为字符串，由 schema 层负责转型。

export function parseCsv(text) {
  const cleanText = stripBom(text).replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < cleanText.length; i += 1) {
    const ch = cleanText[i];

    if (ch === '"') {
      const next = cleanText[i + 1];
      if (inQuotes && next === '"') {
        cell += '"';
        i += 1;
        continue;
      }
      inQuotes = !inQuotes;
      continue;
    }

    if (ch === "," && !inQuotes) {
      row.push(cell);
      cell = "";
      continue;
    }

    if (ch === "\n" && !inQuotes) {
      row.push(cell);
      cell = "";
      if (!isAllEmpty(row)) rows.push(row);
      row = [];
      continue;
    }

    cell += ch;
  }

  row.push(cell);
  if (!isAllEmpty(row)) rows.push(row);

  if (rows.length === 0) {
    return { headers: [], records: [] };
  }

  const headers = rows[0].map((h) => h.trim());
  const records = rows
    .slice(1)
    .filter((r) => !isAllEmpty(r))
    .map((r) => rowToRecord(headers, r));

  return { headers, records };
}

function rowToRecord(headers, row) {
  const rec = {};
  for (let i = 0; i < headers.length; i += 1) {
    const key = headers[i] ?? "";
    if (!key) continue;
    rec[key] = (row[i] ?? "").trim();
  }
  return rec;
}

function isAllEmpty(row) {
  return row.every((x) => (x ?? "").trim() === "");
}

function stripBom(text) {
  if (!text) return "";
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}


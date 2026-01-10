import { estimateTotalAsset } from "../engine/achievements.js";
import { getSeasonId, getSeasonLabel } from "../engine/time.js";
import { escapeHtml } from "./html.js";
import { fmtMoney, fmtPct01, fmtSignedMoney } from "./format.js";

export function renderNewGame({ data }) {
  const mbtiOptions = Array.from(data.mbti.values())
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((m) => `<option value="${escapeHtml(m.id)}">${escapeHtml(m.id)} · ${escapeHtml(m.name)}</option>`)
    .join("");

  const shopTypeOptions = Array.from(data.shopTypes.values())
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((t) => `<option value="${escapeHtml(t.id)}">${escapeHtml(t.name)}</option>`)
    .join("");

  const locationOptions = Array.from(data.locations.values())
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((l) => `<option value="${escapeHtml(l.id)}">${escapeHtml(l.name)}</option>`)
    .join("");

  return `
    <div class="top">
      <div class="left">
        <div class="avatar"></div>
        <div class="title">
          <b>开店模拟器</b>
          <span>Web 可玩版（表驱动）</span>
        </div>
      </div>
      <div style="display:flex; gap:8px">
        <div class="icon" data-act="editDataSource">⚙️</div>
      </div>
    </div>

    <div class="card sec">
      <div class="head"><h2>开始新游戏</h2><div class="hint">仅需 30 秒</div></div>
      <div class="pad" style="display:flex; flex-direction:column; gap:10px">
        <label>玩家昵称</label>
        <input id="newPlayerName" placeholder="例如：阿店老板" value="阿店老板" />

        <label>MBTI（可影响部分事件权重/检定）</label>
        <select id="newMbti">${mbtiOptions}</select>

        <label>开局店铺类型</label>
        <select id="newShopType">${shopTypeOptions}</select>

        <label>开局位置</label>
        <select id="newLocation">${locationOptions}</select>

        <button class="btn" data-act="startNewGame" type="button">开始经营</button>
        <div style="color:var(--muted); font-size:12px; line-height:1.55">
          后续扩展内容只需要继续补充 <span class="mono">docs/数值/*.csv</span>（事件/选项/世界事件/成就/店铺类型/位置…）。
        </div>
      </div>
    </div>
  `;
}

export function renderHome({ state, data }) {
  const season = getSeasonLabel(getSeasonId(state.currentWeek));
  const lastNet = state.lastTurn?.weeklyNetCashflow ?? 0;
  const netClass = lastNet >= 0 ? "good" : "bad";
  const totalAsset = estimateTotalAsset(state);

  const worldCard = renderWorldMini({ state, data });

  const quickNav = [
    { id: "shops", e: "🏪", n: "店铺", t: "评分/利润" },
    { id: "world", e: "🌍", n: "世界", t: "持续影响" },
    { id: "achievements", e: "🏆", n: "成就", t: "解锁奖励" },
    { id: "settings", e: "⚙️", n: "设置", t: "存档/路径" },
  ];

  return `
    <div class="top">
      <div class="left">
        <div class="avatar"></div>
        <div class="title">
          <b>${escapeHtml(state.player.name)}</b>
          <span>称号：${escapeHtml(state.player.title)}</span>
        </div>
      </div>
      <div class="pill" data-act="openTimeline"><b>第 ${state.currentWeek} 周</b><span style="color:var(--muted)">· ${season.icon} ${season.name}</span></div>
      <div style="display:flex; gap:8px">
        <div class="icon" data-act="openHelp">❓</div>
        <div class="icon" data-act="manualSave">💾</div>
        <div class="icon" data-act="nav" data-to="settings">⚙️</div>
      </div>
    </div>

    <div class="card sec">
      <div class="hero">
        <div style="display:flex; align-items:flex-end; justify-content:space-between; gap:10px">
          <div>
            <div style="font-size:12px; color:var(--muted)">现金</div>
            <div class="cash mono">${fmtMoney(state.player.cash)}</div>
            <div class="subline">总资产：${fmtMoney(totalAsset)} · 年龄 ${state.player.age} · 声望 ${state.player.reputation}/100</div>
          </div>
          <div class="pill" data-act="openPlayer">玩家详情</div>
        </div>

        <div class="chips">
          <div class="chip" data-act="openNet">
            <span style="opacity:.9">上周净现金流</span>
            <b class="${netClass} mono">${fmtSignedMoney(lastNet)}</b>
          </div>
          <div class="chip" data-act="openStatus">
            <span style="opacity:.9">压力</span>
            <b class="warn mono">${state.player.stress}/100</b>
          </div>
          <div class="chip" data-act="openStatus">
            <span style="opacity:.9">健康</span>
            <b class="${state.player.health <= 35 ? "bad" : state.player.health <= 60 ? "warn" : "good"} mono">${state.player.health}/100</b>
          </div>
        </div>
      </div>
    </div>

    ${worldCard}

    <div class="card sec">
      <div class="head"><h2>快捷入口</h2><div class="hint">表驱动内容</div></div>
      <div class="grid">
        ${quickNav
          .map(
            (x) => `
            <div class="nav" data-act="nav" data-to="${escapeHtml(x.id)}">
              <div class="e">${x.e}</div>
              <div class="n">${escapeHtml(x.n)}</div>
              <div class="t">${escapeHtml(x.t)}</div>
            </div>
          `,
          )
          .join("")}
      </div>
    </div>

    <div class="card sec">
      <div class="head"><h2>店铺快览</h2><div class="hint">${state.shops.length} 家</div></div>
      <div class="pad" style="display:flex; flex-direction:column; gap:10px">
        ${(state.shops || [])
          .slice(0, 3)
          .map((sp) => {
            const p = sp.lastWeekProfit ?? 0;
            return `
              <div class="row" data-act="openShop" data-id="${escapeHtml(sp.id)}">
                <div style="min-width:0">
                  <b style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis">${escapeHtml(sp.name)}</b>
                  <span>★ ${Number(sp.rating || 0).toFixed(1)} · 上周利润</span>
                </div>
                <div class="mono ${p >= 0 ? "good" : "bad"}" style="font-weight:950">${fmtSignedMoney(p)}</div>
              </div>
            `;
          })
          .join("")}
      </div>
    </div>
  `;
}

export function pageShell({ state, title, subtitle, body }) {
  const season = getSeasonLabel(getSeasonId(state.currentWeek));
  const back = `<div class="icon" data-act="back">←</div>`;
  const right = `<div class="pill" data-act="openTimeline"><b>第 ${state.currentWeek} 周</b><span style="color:var(--muted)">· ${season.icon} ${season.name}</span></div>`;
  return `
    <div class="top">
      <div class="left">
        ${back}
        <div class="title">
          <b>${escapeHtml(title)}</b>
          <span>${escapeHtml(subtitle || "")}</span>
        </div>
      </div>
      ${right}
      <div style="display:flex; gap:8px">
        <div class="icon" data-act="home">🏠</div>
      </div>
    </div>
    ${body}
  `;
}

export function renderEvent({ state, data, event, choices }) {
  const season = getSeasonLabel(getSeasonId(state.currentWeek));
  const body = `
    <div class="card sec">
      <div class="head"><h2>第 ${state.currentWeek} 周事件</h2><div class="hint">${season.icon} ${season.name}</div></div>
      <div class="pad" style="color:rgba(232,238,252,.92); font-size:13px; line-height:1.55">
        <b style="font-weight:950; font-size:16px">${escapeHtml(event.title)}</b>
        <div style="margin-top:8px; color:var(--muted)">${escapeHtml(event.description)}</div>
      </div>
      <div class="pad" style="display:flex; flex-direction:column; gap:10px">
        ${choices
          .map((ch) => {
            const rate = Number(ch.resolution?.success_rate ?? 1);
            const preview = summarizeEffects(ch);
            return `
              <div class="row choice" data-act="choose" data-choice="${escapeHtml(ch.code)}">
                <div style="min-width:0">
                  <b>${escapeHtml(ch.code)}. ${escapeHtml(ch.text)}</b>
                  <span>成功率：${fmtPct01(rate)}</span>
                  ${preview.length ? `<div class="fx">${preview.join("")}</div>` : ""}
                </div>
                <div class="mono" style="font-weight:950">→</div>
              </div>
            `;
          })
          .join("")}
      </div>
    </div>
    <div class="card sec">
      <div class="head"><h2>提示</h2><div class="hint">表驱动可扩展</div></div>
      <div class="pad" style="color:var(--muted); font-size:12px; line-height:1.55">
        事件来自 <span class="mono">docs/数值/events_new_schema_sample.csv</span>，选项来自 <span class="mono">docs/数值/choices_new_schema_sample.csv</span>。你可以继续往表里加行来增加丰富度。
      </div>
    </div>
  `;
  return pageShell({ state, title: "本周事件", subtitle: "选择一项推进 1 周", body });
}

export function renderShops({ state, data }) {
  const body = `
    <div class="card sec">
      <div class="head"><h2>你的店铺</h2><div class="hint">${state.shops.length} 家</div></div>
      <div class="pad" style="display:flex; flex-direction:column; gap:10px">
        ${(state.shops || [])
          .map((sp) => {
            const typeName = data.shopTypes.get(sp.typeId)?.name || sp.typeId;
            const locName = data.locations.get(sp.locationId)?.name || sp.locationId;
            return `
              <div class="row" data-act="openShop" data-id="${escapeHtml(sp.id)}">
                <div style="min-width:0">
                  <b style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis">${escapeHtml(sp.name)}</b>
                  <span>${escapeHtml(typeName)} · ${escapeHtml(locName)} · ★ ${Number(sp.rating || 0).toFixed(1)}</span>
                </div>
                <div class="mono ${sp.lastWeekProfit >= 0 ? "good" : "bad"}" style="font-weight:950">${fmtSignedMoney(sp.lastWeekProfit || 0)}</div>
              </div>
            `;
          })
          .join("")}
      </div>
    </div>
  `;
  return pageShell({ state, title: "店铺", subtitle: "经营表现与基础信息", body });
}

export function renderAchievements({ state, data }) {
  const unlocked = state.player.achievementsUnlocked || {};
  const body = `
    <div class="card sec">
      <div class="head"><h2>成就</h2><div class="hint">达成即自动领取</div></div>
      <div class="pad" style="display:flex; flex-direction:column; gap:10px">
        ${data.achievements
          .filter((a) => !a.hidden || unlocked[a.id])
          .map((a) => {
            const ok = Boolean(unlocked[a.id]);
            return `
              <div class="row">
                <div style="min-width:0">
                  <b>${escapeHtml((a.icon ? a.icon + " " : "") + a.name)}</b>
                  <span>${escapeHtml(a.description)} · 条件：${escapeHtml(a.condition_type)} ${escapeHtml(a.condition_value)}</span>
                </div>
                <div class="mono" style="font-weight:950">${ok ? "已解锁" : "未解锁"}</div>
              </div>
            `;
          })
          .join("")}
      </div>
    </div>
  `;
  return pageShell({ state, title: "成就", subtitle: "长期目标与奖励", body });
}

export function renderWorld({ state, data }) {
  const defsById = new Map(data.worldEvents.map((x) => [x.id, x]));
  const active = state.world.activeEvents || [];
  const body = `
    <div class="card sec">
      <div class="head"><h2>当前世界事件</h2><div class="hint">${active.length ? "持续中" : "无"}</div></div>
      <div class="pad" style="display:flex; flex-direction:column; gap:10px">
        ${
          active.length
            ? active
                .map((a) => {
                  const def = defsById.get(a.id);
                  const left = a.remainingWeeks === -1 ? "永久" : `剩余 ${a.remainingWeeks} 周`;
                  return `
                    <div class="row">
                      <div style="min-width:0">
                        <b>🌍 ${escapeHtml(def?.name || a.name)}</b>
                        <span>${escapeHtml(def?.description || "")}</span>
                      </div>
                      <div class="mono" style="font-weight:950">${escapeHtml(left)}</div>
                    </div>
                  `;
                })
                .join("")
            : `<div class="row"><span>本周暂无持续世界事件</span><b class="mono">—</b></div>`
        }
      </div>
    </div>

    <div class="card sec">
      <div class="head"><h2>世界事件库</h2><div class="hint">来自 world_events.csv</div></div>
      <div class="pad" style="display:flex; flex-direction:column; gap:10px">
        ${data.worldEvents
          .map((x) => {
            const dur =
              x.duration_min === -1 && x.duration_max === -1 ? "永久" : `${x.duration_min}~${x.duration_max} 周`;
            return `
              <div class="row">
                <div style="min-width:0">
                  <b>${escapeHtml(x.name)}</b>
                  <span>概率 ${fmtPct01(x.probability)} · 持续 ${escapeHtml(dur)} · 条件 ${escapeHtml(x.trigger_condition || "none")}</span>
                </div>
                <div class="mono">${escapeHtml(x.id)}</div>
              </div>
            `;
          })
          .join("")}
      </div>
    </div>
  `;
  return pageShell({ state, title: "世界事件", subtitle: "跨多周影响系统", body });
}

export function renderSettings({ state, dataBaseUrl }) {
  const body = `
    <div class="card sec">
      <div class="head"><h2>存档</h2><div class="hint">本地 localStorage</div></div>
      <div class="pad" style="display:flex; flex-direction:column; gap:10px">
        <div class="row"><div><b>当前周</b><span>用于校验存档是否正常</span></div><div class="mono">${state.currentWeek}</div></div>
        <button class="btn secondary" data-act="resetGame" type="button">重新开局（清空存档）</button>
      </div>
    </div>

    <div class="card sec">
      <div class="head"><h2>数据源</h2><div class="hint">读取 docs/数值</div></div>
      <div class="pad" style="display:flex; flex-direction:column; gap:10px">
        <div class="row"><div><b>路径</b><span class="mono">${escapeHtml(dataBaseUrl)}</span></div><div class="mono">—</div></div>
        <button class="btn secondary" data-act="editDataSource" type="button">修改路径并重载</button>
      </div>
    </div>
  `;
  return pageShell({ state, title: "设置", subtitle: "存档与数据源", body });
}

export function renderGameOver({ state }) {
  const body = `
    <div class="card sec" style="border-color:rgba(255,95,106,.35); background:linear-gradient(180deg, rgba(255,95,106,.16), rgba(18,26,43,.35));">
      <div class="head"><h2>游戏结束</h2><div class="hint">本局到此为止</div></div>
      <div class="pad" style="display:flex; flex-direction:column; gap:10px">
        <div class="row"><div><b>原因</b><span>${escapeHtml(state.gameOverReason || "—")}</span></div><div class="mono bad">GAME OVER</div></div>
        <div class="row"><div><b>坚持</b><span>存活周数</span></div><div class="mono">${state.player.stats.weeksSurvived}</div></div>
        <button class="btn" data-act="resetGame" type="button">重新开始</button>
        <button class="btn secondary" data-act="home" type="button">回到主界面</button>
      </div>
    </div>
  `;
  return pageShell({ state, title: "结局", subtitle: "你可以再来一局", body });
}

export function renderTimelineRows({ state }) {
  const items = (state.timeline || []).slice(-10).reverse();
  if (!items.length) return `<div class="row"><span>暂无记录</span><b class="mono">—</b></div>`;
  return items
    .map((it) => {
      const t = fmtSignedMoney(it.net);
      return `<div class="row"><div><b>第 ${it.week} 周</b><span>${escapeHtml(it.title)}</span></div><div class="mono ${it.net >= 0 ? "good" : "bad"}" style="font-weight:950">${t}</div></div>`;
    })
    .join("");
}

export function renderPlayerSheet({ state }) {
  return `
    <div class="row"><span>玩家</span><b>${escapeHtml(state.player.name)}</b></div>
    <div class="row"><span>称号</span><b>${escapeHtml(state.player.title)}</b></div>
    <div class="row"><span>MBTI</span><b class="mono">${escapeHtml(state.player.mbti)}</b></div>
    <div class="row"><span>年龄</span><b class="mono">${state.player.age}</b></div>
    <div class="row"><span>现金</span><b class="mono">${fmtMoney(state.player.cash)}</b></div>
  `;
}

export function renderNetSheet({ state }) {
  const last = state.lastTurn;
  if (!last) return `<div class="row"><span>暂无上周结算</span><b class="mono">—</b></div>`;
  return `
    <div class="row"><span>店铺利润汇总</span><b class="mono">${fmtMoney(last.shopProfitTotal)}</b></div>
    <div class="row"><span>生活费</span><b class="mono bad">- ${fmtMoney(last.livingExpense).replace("¥ ", "¥ ")}</b></div>
    <div class="row"><span>贷款还款</span><b class="mono bad">- ${fmtMoney(last.loanPaymentTotal).replace("¥ ", "¥ ")}</b></div>
    <div class="row"><span>事件现金</span><b class="mono">${fmtSignedMoney(last.applied.cashDelta)}</b></div>
    <div class="row"><span><b>合计（上周净现金流）</b></span><b class="mono ${last.weeklyNetCashflow >= 0 ? "good" : "bad"}">${fmtSignedMoney(last.weeklyNetCashflow)}</b></div>
  `;
}

export function renderStatusSheet({ state }) {
  return `
    <div class="row"><span>压力</span><b class="mono warn">${state.player.stress}/100</b></div>
    <div class="row"><span>健康</span><b class="mono ${state.player.health <= 35 ? "bad" : state.player.health <= 60 ? "warn" : "good"}">${state.player.health}/100</b></div>
    <div class="row"><span>声望</span><b class="mono">${state.player.reputation}/100</b></div>
    <div class="row"><span>精力</span><b class="mono">${state.player.energy}/100</b></div>
    <div style="color:var(--muted); font-size:12px; line-height:1.5">
      提醒：更细的压力死亡/疾病/精力行动点等，可后续按 <span class="mono">docs/数值/数值类型.md</span> 扩展。
    </div>
  `;
}

function renderWorldMini({ state, data }) {
  const active = state.world.activeEvents || [];
  if (!active.length) return "";

  const defsById = new Map(data.worldEvents.map((x) => [x.id, x]));

  return `
    <div class="card sec" data-act="nav" data-to="world">
      <div class="head">
        <h2>世界事件</h2>
        <div class="hint">持续中</div>
      </div>
      <div class="pad" style="display:flex; flex-direction:column; gap:10px">
        ${active
          .slice(0, 2)
          .map((a) => {
            const def = defsById.get(a.id);
            const left = a.remainingWeeks === -1 ? "永久" : `剩余 ${a.remainingWeeks} 周`;
            return `
              <div class="row">
                <div style="min-width:0">
                  <b>🌍 ${escapeHtml(def?.name || a.name)}</b>
                  <span>${escapeHtml(def?.description || "")}</span>
                </div>
                <div class="mono">${escapeHtml(left)}</div>
              </div>
            `;
          })
          .join("")}
      </div>
    </div>
  `;
}

function summarizeEffects(choice) {
  const effects = choice?.outcomes?.success?.effects ?? [];
  const map = {
    cash: 0,
    stress: 0,
    health: 0,
    reputation: 0,
    morale: 0,
    rating: 0,
  };

  effects.forEach((e) => {
    if (!e || typeof e !== "object") return;
    if (e.scope === "stat" && e.op === "add" && typeof e.target === "string") {
      if (Object.prototype.hasOwnProperty.call(map, e.target)) map[e.target] += Number(e.value || 0);
      return;
    }
    if (e.scope === "shop_stat" && e.op === "add" && e.target?.stat === "rating") {
      map.rating += Number(e.value || 0);
    }
  });

  const chips = [];
  if (map.cash) chips.push(chipMoney("现金", map.cash));
  if (map.stress) chips.push(chipInt("压力", map.stress, map.stress <= 0 ? "g" : "w"));
  if (map.health) chips.push(chipInt("健康", map.health, map.health >= 0 ? "g" : "w"));
  if (map.reputation) chips.push(chipInt("声望", map.reputation, map.reputation >= 0 ? "g" : "b"));
  if (map.rating) chips.push(chipFloat("评分", map.rating, map.rating >= 0 ? "g" : "b"));
  if (map.morale) chips.push(chipInt("士气", map.morale, map.morale >= 0 ? "g" : "b"));
  return chips;
}

function chipMoney(name, delta) {
  const cls = delta >= 0 ? "g" : "b";
  const txt = `${delta >= 0 ? "+" : "-"}${name} ${fmtMoney(Math.abs(delta)).replace("¥ ", "¥ ")}`;
  return `<i class="${cls}">${escapeHtml(txt)}</i>`;
}

function chipInt(name, delta, cls) {
  const d = Math.round(delta);
  const sign = d >= 0 ? "+" : "-";
  const txt = `${sign}${name} ${Math.abs(d)}`;
  return `<i class="${cls}">${escapeHtml(txt)}</i>`;
}

function chipFloat(name, delta, cls) {
  const d = Math.round(delta * 10) / 10;
  const sign = d >= 0 ? "+" : "-";
  const txt = `${sign}${name} ${Math.abs(d).toFixed(1)}`;
  return `<i class="${cls}">${escapeHtml(txt)}</i>`;
}

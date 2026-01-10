import { getDefaultDataBaseUrl, loadGameData } from "./data/loadGameData.js";
import { advanceWeek } from "./engine/settlement.js";
import { createRng } from "./engine/rng.js";
import { createNewGame, loadSavedGame, resetSave, saveGame } from "./engine/state.js";
import { getFallbackEvent, getVisibleChoices, pickWeeklyEvent, resolveChoiceOutcome } from "./engine/events.js";
import { maybeTriggerWorldEvents } from "./engine/world.js";
import { createRouter } from "./router.js";
import { escapeAttr, escapeHtml } from "./ui/html.js";
import { fmtMoney, fmtPct01, fmtSignedMoney } from "./ui/format.js";
import {
  renderAchievements,
  renderEvent,
  renderGameOver,
  renderHome,
  renderNetSheet,
  renderNewGame,
  renderPlayerSheet,
  renderSettings,
  renderShops,
  renderStatusSheet,
  renderTimelineRows,
  renderWorld,
} from "./ui/pages.js";
import { createSheet } from "./ui/sheet.js";
import { createToast } from "./ui/toast.js";

const STORAGE_KEYS = {
  dataBaseUrl: "kd_sim_data_base_url",
};

export function createApp() {
  const router = createRouter();
  const toast = createToast(document.getElementById("toast"));
  const sheet = createSheet({
    maskEl: document.getElementById("sheetMask"),
    titleEl: document.getElementById("sheetTitle"),
    bodyEl: document.getElementById("sheetBody"),
    closeBtnEl: document.getElementById("sheetClose"),
  });

  let rootEl = null;
  let footerEl = null;
  let btnTimelineEl = null;
  let btnStartWeekEl = null;

  let dataBaseUrl = "";
  let gameData = null;
  let gameState = null;
  let bootError = null;

  return {
    mount(el) {
      rootEl = el;
      footerEl = document.getElementById("footer");
      btnTimelineEl = document.getElementById("btnTimeline");
      btnStartWeekEl = document.getElementById("btnStartWeek");

      sheet.bindGlobalEsc();
      window.addEventListener("kd_router_change", render);
      bindActions();

      renderLoading("正在初始化数据…");
      void boot();
    },
  };

  async function boot() {
    dataBaseUrl = getDataBaseUrl();
    bootError = null;
    gameData = null;

    try {
      gameData = await loadGameData({ baseUrl: dataBaseUrl });
      gameState = hydrateState(loadSavedGame());

      toast.show("数值表加载完成");
      goInitialView();
      render();
    } catch (e) {
      bootError = e;
      render();
    }
  }

  function goInitialView() {
    if (!gameState) {
      router.setView("new_game");
      return;
    }
    if (gameState.gameOver) {
      router.setView("gameover");
      return;
    }
    if (gameState.currentEvent && gameState.currentEvent.week === gameState.currentWeek) {
      router.setView("event");
      return;
    }
    router.setView("home");
  }

  function render() {
    if (!rootEl) return;

    if (bootError) {
      hideFooter();
      rootEl.innerHTML = renderBootError(bootError);
      return;
    }

    if (!gameData) {
      hideFooter();
      renderLoading("正在加载数值表…");
      return;
    }

    if (!gameState) {
      hideFooter();
      rootEl.innerHTML = renderNewGame({ data: gameData });
      return;
    }

    if (gameState.gameOver) {
      hideFooter();
      rootEl.innerHTML = renderGameOver({ state: gameState });
      return;
    }

    const view = router.view;
    if (view === "home") {
      showFooter();
      rootEl.innerHTML = renderHome({ state: gameState, data: gameData });
      return;
    }

    hideFooter();

    if (view === "event") {
      const ev = getCurrentEvent();
      if (!ev) {
        router.setView("home");
        return;
      }
      const choices = getVisibleChoices(ev.id, gameState, gameData);
      rootEl.innerHTML = renderEvent({ state: gameState, data: gameData, event: ev, choices });
      return;
    }

    if (view === "shops") {
      rootEl.innerHTML = renderShops({ state: gameState, data: gameData });
      return;
    }

    if (view === "world") {
      rootEl.innerHTML = renderWorld({ state: gameState, data: gameData });
      return;
    }

    if (view === "achievements") {
      rootEl.innerHTML = renderAchievements({ state: gameState, data: gameData });
      return;
    }

    if (view === "settings") {
      rootEl.innerHTML = renderSettings({ state: gameState, dataBaseUrl });
      return;
    }

    router.setView("home");
  }

  function hideFooter() {
    if (footerEl) footerEl.style.display = "none";
  }

  function showFooter() {
    if (footerEl) footerEl.style.display = "flex";
  }

  function renderLoading(title) {
    rootEl.innerHTML = `
      <div class="card sec">
        <div class="head"><h2>${escapeHtml(title || "加载中")}</h2><div class="hint">请稍等…</div></div>
        <div class="pad" style="color:var(--muted); font-size:12px; line-height:1.55">
          若你是通过文件直接打开（file://），浏览器通常会拦截 fetch 读取 CSV。建议在仓库根目录运行：<br/>
          <span class="mono">python3 -m http.server 5173</span>，然后打开：<span class="mono">http://localhost:5173/web/</span>
        </div>
      </div>
    `;
  }

  function renderBootError(error) {
    const msg = (error && error.message) || String(error);
    return `
      <div class="card sec" style="border-color:rgba(255,95,106,.35); background:linear-gradient(180deg, rgba(255,95,106,.16), rgba(18,26,43,.35));">
        <div class="head"><h2>数据加载失败</h2><div class="hint">请检查本地服务与路径</div></div>
        <div class="pad" style="display:flex; flex-direction:column; gap:10px">
          <div class="row"><div><b>错误</b><span class="mono">${escapeHtml(msg)}</span></div><div class="mono bad">FAIL</div></div>
          <button class="btn secondary" data-act="editDataSource" type="button">设置数据源路径</button>
          <div style="color:var(--muted); font-size:12px; line-height:1.55">
            推荐：在仓库根目录运行 <span class="mono">python3 -m http.server 5173</span>，打开 <span class="mono">http://localhost:5173/web/</span>。
          </div>
        </div>
      </div>
    `;
  }

  function bindActions() {
    btnTimelineEl?.addEventListener("click", openTimeline);
    btnStartWeekEl?.addEventListener("click", startWeek);

    document.addEventListener("click", (e) => {
      const el = e.target.closest("[data-act]");
      if (!el) return;
      const act = el.getAttribute("data-act");

      if (act === "home" || act === "back") {
        router.setView("home");
        return;
      }

      if (act === "nav") {
        const to = el.getAttribute("data-to");
        router.setView(String(to || "home"));
        return;
      }

      if (act === "openTimeline") {
        openTimeline();
        return;
      }

      if (act === "openPlayer") {
        if (!gameState) return;
        sheet.open("玩家详情", renderPlayerSheet({ state: gameState }));
        return;
      }

      if (act === "openNet") {
        if (!gameState) return;
        sheet.open("本周净现金流构成", renderNetSheet({ state: gameState }));
        return;
      }

      if (act === "openStatus") {
        if (!gameState) return;
        sheet.open("状态详情", renderStatusSheet({ state: gameState }));
        return;
      }

      if (act === "openHelp") {
        openHelp();
        return;
      }

      if (act === "manualSave") {
        if (!gameState) return;
        saveGame(gameState);
        toast.show("已保存");
        return;
      }

      if (act === "editDataSource") {
        openDataSourceSheet();
        return;
      }

      if (act === "saveDataSource") {
        saveDataSourceFromSheet();
        return;
      }

      if (act === "closeSheet") {
        sheet.close();
        return;
      }

      if (act === "startNewGame") {
        startNewGameFromForm();
        return;
      }

      if (act === "resetGame") {
        resetGame();
        return;
      }

      if (act === "choose") {
        chooseOption(el.getAttribute("data-choice"));
        return;
      }

      if (act === "openShop") {
        openShopSheet(el.getAttribute("data-id"));
      }
    });
  }

  function openHelp() {
    sheet.open(
      "帮助",
      `
        <div class="row"><div><b>如何开始</b><span>点击底部“开始本周”，进入事件选择</span></div><div class="mono">▶</div></div>
        <div class="row"><div><b>表驱动</b><span>事件/选项/世界事件/成就来自 docs/数值</span></div><div class="mono">CSV</div></div>
        <div style="color:var(--muted); font-size:12px; line-height:1.55">
          数值口径见：<span class="mono">docs/数值/数值类型.md</span>；表字段见：<span class="mono">docs/数值/字段字典.md</span>。
        </div>
        <button class="btn secondary" data-act="closeSheet" type="button">知道了</button>
      `,
    );
  }

  function openTimeline() {
    if (!gameState) return;
    sheet.open("时间线（最近 10 周）", renderTimelineRows({ state: gameState }));
  }

  function startWeek() {
    if (!gameData) return;
    if (!gameState) {
      toast.show("请先开始新游戏");
      return;
    }
    if (gameState.gameOver) {
      router.setView("gameover");
      return;
    }

    if (gameState.currentEvent && gameState.currentEvent.week === gameState.currentWeek) {
      router.setView("event");
      return;
    }

    const rng = createRng(gameState.rngSeed);
    const activated = maybeTriggerWorldEvents(gameState, gameData, rng);
    const ev = pickWeeklyEvent(gameState, gameData, rng);

    gameState.currentEvent = { week: gameState.currentWeek, eventId: ev.id };
    gameState.rngSeed = rng.seed;
    saveGame(gameState);

    if (activated.length) {
      toast.show(`世界事件：${activated[0].name}`);
    }

    router.setView("event");
  }

  function chooseOption(choiceCode) {
    if (!gameData || !gameState) return;
    if (!gameState.currentEvent) return;

    const ev = getCurrentEvent();
    if (!ev) {
      toast.show("事件不存在（请检查数据表）");
      gameState.currentEvent = null;
      saveGame(gameState);
      router.setView("home");
      return;
    }

    const choices = getVisibleChoices(ev.id, gameState, gameData);
    const choice = choices.find((c) => String(c.code) === String(choiceCode)) || choices[0];
    if (!choice) return;

    const rng = createRng(gameState.rngSeed);
    const outcome = resolveChoiceOutcome(choice, gameState, rng);
    const summary = advanceWeek({
      state: gameState,
      data: gameData,
      event: ev,
      choice,
      choiceOutcome: outcome,
      rng,
    });

    gameState.rngSeed = rng.seed;
    gameState.currentEvent = null;
    saveGame(gameState);

    toast.show(`已结算：净现金流 ${fmtSignedMoney(summary.weeklyNetCashflow)}`);

    if (summary.unlockedAchievements?.length) {
      const a = summary.unlockedAchievements[0];
      toast.show(`解锁成就：${a.icon ? a.icon + " " : ""}${a.name}`);
    }

    if (gameState.gameOver) router.setView("gameover");
    else router.setView("home");

    sheet.open("本周结算", renderTurnSummarySheet({ summary, choice, outcome }));
  }

  function renderTurnSummarySheet({ summary, choice, outcome }) {
    const outcomeText =
      (outcome.outcome === "success" ? choice.outcomes?.success?.text : choice.outcomes?.fail?.text) ||
      (outcome.outcome === "success" ? "你的决策得到落实。" : "结果不如预期，出现了额外代价。");

    const shops = (summary.shopBreakdown || [])
      .map(
        (x) => `
        <div class="row">
          <div style="min-width:0">
            <b style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis">${escapeHtml(x.shopName)}</b>
            <span>营收 ${fmtMoney(x.revenue)}${x.forcedClosed ? " · 强制停业" : ""}</span>
          </div>
          <div class="mono ${x.profit >= 0 ? "good" : "bad"}" style="font-weight:950">${fmtSignedMoney(x.profit)}</div>
        </div>
      `,
      )
      .join("");

    const achievements = (summary.unlockedAchievements || [])
      .map(
        (a) => `
        <div class="row">
          <div style="min-width:0">
            <b>${escapeHtml((a.icon ? a.icon + " " : "") + a.name)}</b>
            <span>${escapeHtml(a.rewardMsg || "")}</span>
          </div>
          <div class="mono">✔</div>
        </div>
      `,
      )
      .join("");

    return `
      <div style="color:rgba(232,238,252,.92); font-size:13px; line-height:1.55">
        <b style="font-weight:950">${escapeHtml(summary.eventTitle)} · 选 ${escapeHtml(summary.choiceCode)}</b>
        <div style="margin-top:6px; color:var(--muted)">结果：${outcome.outcome === "success" ? "成功" : "失败"}（成功率 ${fmtPct01(outcome.successRate)}）</div>
        <div style="margin-top:8px">${escapeHtml(outcomeText)}</div>
      </div>

      <div style="margin-top:10px; display:flex; flex-direction:column; gap:10px">
        <div class="row"><div><b>店铺利润汇总</b><span>不含生活费/贷款</span></div><div class="mono">${fmtMoney(summary.shopProfitTotal)}</div></div>
        <div class="row"><div><b>上周净现金流</b><span>最终现金变化</span></div><div class="mono ${summary.weeklyNetCashflow >= 0 ? "good" : "bad"}" style="font-weight:950">${fmtSignedMoney(summary.weeklyNetCashflow)}</div></div>
        <div class="row"><div><b>现金</b><span>${fmtMoney(summary.cashBefore)} → ${fmtMoney(summary.cashAfter)}</span></div><div class="mono">—</div></div>
      </div>

      <div style="margin-top:10px; display:flex; flex-direction:column; gap:10px">
        ${shops}
      </div>

      ${achievements ? `<div style="margin-top:10px; display:flex; flex-direction:column; gap:10px">${achievements}</div>` : ""}

      <button class="btn secondary" data-act="closeSheet" type="button">关闭</button>
    `;
  }

  function startNewGameFromForm() {
    if (!gameData) return;
    const playerName = String(document.getElementById("newPlayerName")?.value || "").trim() || "阿店老板";
    const mbtiId = String(document.getElementById("newMbti")?.value || "").trim() || "INTJ";
    const shopTypeId = String(document.getElementById("newShopType")?.value || "").trim() || "milk_tea";
    const locationId = String(document.getElementById("newLocation")?.value || "").trim() || "street";

    gameState = createNewGame({ playerName, mbtiId, shopTypeId, locationId }, gameData);
    saveGame(gameState);
    toast.show("开局完成");
    router.setView("home");
  }

  function resetGame() {
    resetSave();
    gameState = null;
    toast.show("已清空存档");
    router.setView("new_game");
  }

  function openShopSheet(shopId) {
    if (!gameState || !gameData) return;
    const sp = (gameState.shops || []).find((s) => s.id === shopId);
    if (!sp) return;

    const typeName = gameData.shopTypes.get(sp.typeId)?.name || sp.typeId;
    const locName = gameData.locations.get(sp.locationId)?.name || sp.locationId;

    sheet.open(
      "店铺详情",
      `
        <div class="row"><span>名称</span><b>${escapeHtml(sp.name)}</b></div>
        <div class="row"><span>类型</span><b>${escapeHtml(typeName)}</b></div>
        <div class="row"><span>位置</span><b>${escapeHtml(locName)}</b></div>
        <div class="row"><span>评分</span><b class="mono">${Number(sp.rating || 0).toFixed(1)}</b></div>
        <div class="row"><span>面积</span><b class="mono">${sp.area}㎡</b></div>
        <div class="row"><span>员工数</span><b class="mono">${sp.staffCount}</b></div>
        <div class="row"><span>上周营收</span><b class="mono">${fmtMoney(sp.lastWeekRevenue || 0)}</b></div>
        <div class="row"><span>上周利润</span><b class="mono ${sp.lastWeekProfit >= 0 ? "good" : "bad"}">${fmtSignedMoney(sp.lastWeekProfit || 0)}</b></div>
        <button class="btn secondary" data-act="closeSheet" type="button">关闭</button>
      `,
    );
  }

  function openDataSourceSheet() {
    const current = getDataBaseUrl();
    sheet.open(
      "数据源",
      `
        <label>数值表路径（相对 web/）</label>
        <input id="dataBaseUrlInput" value="${escapeAttr(current)}" placeholder="../docs/数值" />
        <button class="btn" data-act="saveDataSource" type="button">保存并重载</button>
        <button class="btn secondary" data-act="closeSheet" type="button">取消</button>
      `,
    );
  }

  function saveDataSourceFromSheet() {
    const input = document.getElementById("dataBaseUrlInput");
    const next = String(input?.value || "").trim();
    if (!next) {
      toast.show("路径不能为空");
      return;
    }
    localStorage.setItem(STORAGE_KEYS.dataBaseUrl, next);
    sheet.close();
    renderLoading("正在重载数据…");
    void boot();
  }

  function getDataBaseUrl() {
    return localStorage.getItem(STORAGE_KEYS.dataBaseUrl) || getDefaultDataBaseUrl();
  }

  function getCurrentEvent() {
    if (!gameState?.currentEvent) return null;
    const id = String(gameState.currentEvent.eventId || "").trim();
    if (!id) return null;

    const ev = gameData.events.find((e) => e.id === id);
    if (ev) return ev;
    if (id === "SYS_NOTHING") return getFallbackEvent();
    return null;
  }

  function hydrateState(raw) {
    if (!raw || typeof raw !== "object") return null;
    if (!raw.player) return null;

    raw.flags = raw.flags || {};
    raw.world = raw.world || { activeEvents: [] };
    raw.world.activeEvents = raw.world.activeEvents || [];
    raw.timeline = raw.timeline || [];
    raw.pendingEventQueue = raw.pendingEventQueue || [];
    raw.eventHistory = raw.eventHistory || {};
    raw.currentEvent = raw.currentEvent || null;
    raw.shops = raw.shops || [];
    raw.player.mods = raw.player.mods || { traffic_bonus: 0, hire_bonus: 0, loyalty_bonus: 0, hire_cost: 0 };
    raw.player.stats = raw.player.stats || {
      weeksSurvived: 0,
      profitStreak: 0,
      healthStreak: 0,
      crisisHandled: 0,
      totalStaffHired: 0,
      inheritanceCount: 0,
      adsWatched: 0,
      wasBankruptOnce: false,
    };
    raw.player.achievementsUnlocked = raw.player.achievementsUnlocked || {};
    raw.player.stressMaxWeeks = raw.player.stressMaxWeeks || 0;

    // 兜底：确保至少有一个婚恋状态 flag（events.csv/choices.csv 目前使用 required_flags 做门槛）
    if (!raw.flags.single && !raw.flags.dating && !raw.flags.married && !raw.flags.divorced) {
      raw.flags.single = true;
    }

    return raw;
  }
}


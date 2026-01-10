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
  renderDelivery,
  renderEmpDetail,
  renderEvent,
  renderGameOver,
  renderHome,
  renderLocation,
  renderNetSheet,
  renderNewGame,
  renderPlayerSheet,
  renderRank,
  renderSettings,
  renderShops,
  renderStaff,
  renderStatusSheet,
  renderTimelineRows,
  renderWelfare,
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

    if (view === "staff") {
      rootEl.innerHTML = renderStaff({ state: gameState, data: gameData });
      return;
    }

    if (view === "emp") {
      const empId = String(router.params?.id || "");
      const emp = (gameState.employees || []).find((p) => p.id === empId);
      rootEl.innerHTML = renderEmpDetail({ state: gameState, data: gameData, emp });
      return;
    }

    if (view === "delivery") {
      rootEl.innerHTML = renderDelivery({ state: gameState, data: gameData });
      return;
    }

    if (view === "location") {
      rootEl.innerHTML = renderLocation({ state: gameState, data: gameData });
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

    if (view === "rank") {
      rootEl.innerHTML = renderRank({ state: gameState });
      return;
    }

    if (view === "welfare") {
      rootEl.innerHTML = renderWelfare({ state: gameState });
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
        sheet.open("本月净现金流构成", renderNetSheet({ state: gameState }));
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
        return;
      }

      if (act === "openShopCreate") {
        openShopCreateSheet(el.getAttribute("data-id"));
        return;
      }

      if (act === "openShopClose") {
        openShopCloseSheet();
        return;
      }

      if (act === "openShopRelocate") {
        openShopRelocateSheet(el.getAttribute("data-id"));
        return;
      }

      if (act === "openStaffShop") {
        openStaffShopSheet(el.getAttribute("data-id"));
        return;
      }

      if (act === "createShop") {
        createShopFromSheet();
        return;
      }

      if (act === "closeShop") {
        closeShopById(el.getAttribute("data-id"));
        return;
      }

      if (act === "relocateShop") {
        relocateShopFromSheet();
        return;
      }

      if (act === "openEmp") {
        const empId = el.getAttribute("data-id");
        router.setView("emp", { id: empId });
        return;
      }

      if (act === "openAssignEmp" || act === "openTransferEmp") {
        openAssignEmployeeSheet(el.getAttribute("data-id"));
        return;
      }

      if (act === "assignEmp") {
        assignEmployeeToShop(el.getAttribute("data-id"), el.getAttribute("data-shop"));
        return;
      }

      if (act === "openHire") {
        openHireSheet(el.getAttribute("data-shop"));
        return;
      }

      if (act === "openSchedule") {
        openScheduleSheet(el.getAttribute("data-shop"));
        return;
      }

      if (act === "openTraining") {
        openTrainingSheet(el.getAttribute("data-shop"));
        return;
      }

      if (act === "openFire") {
        openFireSheet(el.getAttribute("data-shop"));
        return;
      }

      if (act === "hireEmp") {
        hireEmployee(el.getAttribute("data-id"), el.getAttribute("data-shop"));
        return;
      }

      if (act === "scheduleEmp") {
        scheduleEmployee(el.getAttribute("data-id"));
        return;
      }

      if (act === "trainEmp") {
        trainEmployee(el.getAttribute("data-id"));
        return;
      }

      if (act === "fireEmp") {
        fireEmployee(el.getAttribute("data-id"));
        return;
      }

      if (act === "empTalk") {
        talkEmployee(el.getAttribute("data-id"));
        return;
      }

      if (act === "empSchedule") {
        scheduleEmployee(el.getAttribute("data-id"));
        return;
      }

      if (act === "empTrain") {
        trainEmployee(el.getAttribute("data-id"));
        return;
      }

      if (act === "empFire") {
        fireEmployee(el.getAttribute("data-id"));
        return;
      }

      if (act === "openShopDelivery") {
        openShopDeliverySheet(el.getAttribute("data-id"));
        return;
      }

      if (act === "toggleShopDelivery") {
        toggleShopDelivery(el.getAttribute("data-id"));
        return;
      }

      if (act === "saveShopDelivery") {
        saveShopDeliveryFromSheet(el.getAttribute("data-id"));
        return;
      }

      if (act === "openLoc") {
        openLocationSheet(el.getAttribute("data-id"));
        return;
      }

      if (act === "claimDaily") {
        claimDailyReward();
        return;
      }

      if (act === "toast") {
        toast.show(el.getAttribute("data-msg") || "");
      }
    });
  }

  function openHelp() {
    sheet.open(
      "帮助",
      `
        <div class="row"><div><b>如何开始</b><span>点击底部“开始本月”，进入事件选择</span></div><div class="mono">▶</div></div>
        <div class="row"><div><b>表驱动</b><span>事件/选项/世界事件/成就来自 docs/数值</span></div><div class="mono">CSV</div></div>
        <div class="row"><div><b>与店铺绑定</b><span>选址/人事/外卖均按店铺配置</span></div><div class="mono">🏪</div></div>
        <div style="color:var(--muted); font-size:12px; line-height:1.55">
          数值口径见：<span class="mono">docs/数值/数值类型.md</span>；表字段见：<span class="mono">docs/数值/字段字典.md</span>。
        </div>
        <button class="btn secondary" data-act="closeSheet" type="button">知道了</button>
      `,
    );
  }

  function openTimeline() {
    if (!gameState) return;
    sheet.open("时间线（最近 10 月）", renderTimelineRows({ state: gameState }));
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

    sheet.open("本月结算", renderTurnSummarySheet({ summary, choice, outcome }));
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
        <div class="row"><div><b>上月净现金流</b><span>最终现金变化</span></div><div class="mono ${summary.weeklyNetCashflow >= 0 ? "good" : "bad"}" style="font-weight:950">${fmtSignedMoney(summary.weeklyNetCashflow)}</div></div>
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

  function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function genId(prefix) {
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
  }

  function syncShopStaffCounts() {
    if (!gameState) return;
    const counts = new Map();
    for (const e of gameState.employees || []) {
      if (!e.shopId) continue;
      counts.set(e.shopId, (counts.get(e.shopId) || 0) + 1);
    }
    for (const sp of gameState.shops || []) {
      sp.staffCount = counts.get(sp.id) || 0;
    }
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
        <div class="row"><span>上月营收</span><b class="mono">${fmtMoney(sp.lastWeekRevenue || 0)}</b></div>
        <div class="row"><span>上月利润</span><b class="mono ${sp.lastWeekProfit >= 0 ? "good" : "bad"}">${fmtSignedMoney(sp.lastWeekProfit || 0)}</b></div>
        <button class="btn secondary" data-act="openShopDelivery" data-id="${escapeAttr(sp.id)}" type="button">外卖设置</button>
        <button class="btn secondary" data-act="nav" data-to="staff" type="button">管理人事</button>
        <button class="btn secondary" data-act="closeSheet" type="button">关闭</button>
      `,
    );
  }

  function openShopCreateSheet(locationId) {
    if (!gameState || !gameData) return;
    const typeOptions = Array.from(gameData.shopTypes.values())
      .map((t) => `<option value="${escapeAttr(t.id)}">${escapeHtml(t.name)}</option>`)
      .join("");
    const locOptions = Array.from(gameData.locations.values())
      .map(
        (l) =>
          `<option value="${escapeAttr(l.id)}" ${locationId === l.id ? "selected" : ""}>${escapeHtml(l.name)}</option>`,
      )
      .join("");

    sheet.open(
      "开新店（Demo）",
      `
        <label>店铺类型</label>
        <select id="shopCreateType">${typeOptions}</select>
        <label>门面位置</label>
        <select id="shopCreateLocation">${locOptions}</select>
        <label>店铺名称（可选）</label>
        <input id="shopCreateName" placeholder="例如：星光饮品 · 江景路" />
        <button class="btn" data-act="createShop" type="button">确认开店</button>
        <button class="btn secondary" data-act="closeSheet" type="button">取消</button>
      `,
    );
  }

  function createShopFromSheet() {
    if (!gameState || !gameData) return;
    const typeId = String(document.getElementById("shopCreateType")?.value || "").trim();
    const locationId = String(document.getElementById("shopCreateLocation")?.value || "").trim();
    const nameInput = String(document.getElementById("shopCreateName")?.value || "").trim();
    createShopAtLocation({ typeId, locationId, nameInput });
  }

  function createShopAtLocation({ typeId, locationId, nameInput }) {
    if (!gameState || !gameData) return;
    const type = gameData.shopTypes.get(typeId) ?? Array.from(gameData.shopTypes.values())[0];
    const loc = gameData.locations.get(locationId) ?? Array.from(gameData.locations.values())[0];
    if (!type || !loc) return;

    const id = genId("shop");
    const name = nameInput || `${type.name} · ${loc.name}`;
    const shop = {
      id,
      name,
      typeId: type.id,
      locationId: loc.id,
      operationMode: "normal",
      area: type.ideal_area ?? 30,
      staffCount: 0,
      rating: 4 + randInt(0, 6) / 10,
      lastWeekProfit: 0,
      lastWeekRevenue: 0,
      delivery: {
        enabled: false,
        budget: 1500,
        feeRate: 0.2,
        orders: 320,
      },
    };

    gameState.shops.push(shop);
    syncShopStaffCounts();
    saveGame(gameState);
    sheet.close();
    toast.show("已开新店");
    router.setView("shops");
  }

  function openShopCloseSheet() {
    if (!gameState) return;
    const list = (gameState.shops || [])
      .map(
        (sp) => `
        <div class="row">
          <div><b>${escapeHtml(sp.name)}</b><span>评分 ★ ${Number(sp.rating || 0).toFixed(1)}</span></div>
          <button class="btn secondary" data-act="closeShop" data-id="${escapeAttr(sp.id)}" type="button">关店</button>
        </div>
      `,
      )
      .join("");

    sheet.open(
      "关店（Demo）",
      list || `<div class="row"><span>暂无店铺</span><b class="mono">—</b></div>`,
    );
  }

  function closeShopById(shopId) {
    if (!gameState) return;
    const idx = (gameState.shops || []).findIndex((sp) => sp.id === shopId);
    if (idx === -1) return;
    for (const e of gameState.employees || []) {
      if (e.shopId === shopId) {
        e.shopId = "";
        e.mood = "紧张";
        e.risk = "中";
      }
    }
    const [removed] = gameState.shops.splice(idx, 1);
    syncShopStaffCounts();
    saveGame(gameState);
    sheet.close();
    toast.show(`已关闭 ${removed?.name || "店铺"}`);
    router.setView("shops");
  }

  function openShopRelocateSheet(locationId) {
    if (!gameState || !gameData) return;
    if (!gameState.shops.length) {
      sheet.open("搬店 / 选址（Demo）", `<div class="row"><span>暂无店铺</span><b class="mono">—</b></div>`);
      return;
    }
    const shopOptions = (gameState.shops || [])
      .map((sp) => `<option value="${escapeAttr(sp.id)}">${escapeHtml(sp.name)}</option>`)
      .join("");
    const locOptions = Array.from(gameData.locations.values())
      .map(
        (l) =>
          `<option value="${escapeAttr(l.id)}" ${locationId === l.id ? "selected" : ""}>${escapeHtml(l.name)}</option>`,
      )
      .join("");

    sheet.open(
      "搬店 / 选址（Demo）",
      `
        <label>选择店铺</label>
        <select id="relocateShopId">${shopOptions}</select>
        <label>新位置</label>
        <select id="relocateLocationId">${locOptions}</select>
        <button class="btn" data-act="relocateShop" type="button">确认搬店</button>
        <button class="btn secondary" data-act="closeSheet" type="button">取消</button>
      `,
    );
  }

  function relocateShopFromSheet() {
    if (!gameState || !gameData) return;
    const shopId = String(document.getElementById("relocateShopId")?.value || "").trim();
    const locationId = String(document.getElementById("relocateLocationId")?.value || "").trim();
    const sp = (gameState.shops || []).find((s) => s.id === shopId);
    const loc = gameData.locations.get(locationId);
    if (!sp || !loc) return;
    sp.locationId = loc.id;
    sp.name = `${gameData.shopTypes.get(sp.typeId)?.name || "店铺"} · ${loc.name}`;
    saveGame(gameState);
    sheet.close();
    toast.show("已完成搬店");
    router.setView("shops");
  }

  function openStaffShopSheet(shopId) {
    if (!gameState || !gameData) return;
    const sp = (gameState.shops || []).find((s) => s.id === shopId);
    if (!sp) return;
    const typeName = gameData.shopTypes.get(sp.typeId)?.name || sp.typeId;
    const locName = gameData.locations.get(sp.locationId)?.name || sp.locationId;
    const list = (gameState.employees || []).filter((e) => e.shopId === sp.id);
    const payroll = list.reduce((a, e) => a + Math.round(Number(e.wage || 0)), 0);

    const rows = list.length
      ? list
          .map((p) => {
            const riskCls = String(p.risk || "").includes("高")
              ? "bad"
              : String(p.risk || "").includes("中")
                ? "warn"
                : "good";
            return `
              <div class="row" data-act="openEmp" data-id="${escapeAttr(p.id)}">
                <div style="min-width:0">
                  <b>${escapeHtml(p.name)} · ${escapeHtml(p.role)}</b>
                  <span>心情 ${escapeHtml(p.mood)} · 风险 <b class="${riskCls}">${escapeHtml(p.risk)}</b></span>
                </div>
                <div class="mono" style="font-weight:950">${fmtMoney(p.wage).replace("¥ ", "¥ ")}/月</div>
              </div>
            `;
          })
          .join("")
      : `<div class="row"><span>暂无员工</span><b class="mono">—</b></div>`;

    sheet.open(
      `人事（${escapeHtml(sp.name)}）`,
      `
        <div class="row"><div><b>${escapeHtml(typeName)}</b><span>${escapeHtml(locName)}</span></div><div class="mono">员工 ${list.length}</div></div>
        <div class="row"><div><b>月工资合计</b><span>用于粗估经营压力</span></div><div class="mono" style="font-weight:950">${fmtMoney(payroll).replace("¥ ", "¥ ")}</div></div>
        <div style="display:flex; flex-direction:column; gap:10px">
          ${rows}
        </div>
        <div class="btnline" style="margin-top:2px">
          <button class="btn small" data-act="openHire" data-shop="${escapeAttr(sp.id)}" type="button">招聘</button>
          <button class="btn small secondary" data-act="openSchedule" data-shop="${escapeAttr(sp.id)}" type="button">排班</button>
          <button class="btn small secondary" data-act="openTraining" data-shop="${escapeAttr(sp.id)}" type="button">培训</button>
          <button class="btn small danger" data-act="openFire" data-shop="${escapeAttr(sp.id)}" type="button">开除</button>
        </div>
        <button class="btn secondary" data-act="closeSheet" type="button" style="margin-top:10px">关闭</button>
      `,
    );
  }

  function openAssignEmployeeSheet(empId) {
    if (!gameState) return;
    const emp = (gameState.employees || []).find((e) => e.id === empId);
    if (!emp) return;
    const shops = gameState.shops || [];
    if (!shops.length) {
      toast.show("暂无店铺可分配");
      return;
    }

    const list = shops
      .map(
        (sp) => `
          <div class="row">
            <div><b>${escapeHtml(sp.name)}</b><span>当前员工 ${sp.staffCount} 人</span></div>
            <button class="btn secondary" data-act="assignEmp" data-id="${escapeAttr(emp.id)}" data-shop="${escapeAttr(sp.id)}" type="button">分配到本店</button>
          </div>
        `,
      )
      .join("");

    sheet.open(`分配员工（${escapeHtml(emp.name)}）`, list);
  }

  function assignEmployeeToShop(empId, shopId) {
    if (!gameState) return;
    const emp = (gameState.employees || []).find((e) => e.id === empId);
    const sp = (gameState.shops || []).find((s) => s.id === shopId);
    if (!emp || !sp) return;
    emp.shopId = sp.id;
    emp.mood = "稳定";
    emp.risk = "低";
    syncShopStaffCounts();
    saveGame(gameState);
    sheet.close();
    toast.show(`已分配：${emp.name} → ${sp.name}`);
    router.setView("staff");
  }

  function openHireSheet(shopId) {
    if (!gameState) return;
    const sp = (gameState.shops || []).find((s) => s.id === shopId);
    if (!sp) {
      toast.show("请先选择要招聘的店铺");
      return;
    }
    const pool = [
      { id: "c1", name: "阿敏", role: "收银", mood: "稳定", wage: 3600, risk: "低" },
      { id: "c2", name: "小周", role: "后厨", mood: "紧张", wage: 4100, risk: "中" },
      { id: "c3", name: "阿哲", role: "外卖打包", mood: "积极", wage: 3900, risk: "低" },
    ];
    gameState.hirePool = pool;
    const list = pool
      .map(
        (p) => `
        <div class="row">
          <div><b>${escapeHtml(p.name)} · ${escapeHtml(p.role)}</b><span>心情：${escapeHtml(p.mood)} · 风险：${escapeHtml(p.risk)}</span></div>
          <button class="btn secondary" data-act="hireEmp" data-id="${escapeAttr(p.id)}" data-shop="${escapeAttr(sp.id)}" type="button">录用到本店</button>
        </div>
      `,
      )
      .join("");

    sheet.open(`招聘（${escapeHtml(sp.name)}）`, list);
  }

  function openScheduleSheet(shopId) {
    if (!gameState) return;
    const sp = (gameState.shops || []).find((s) => s.id === shopId);
    if (!sp) {
      toast.show("请先选择要排班的店铺");
      return;
    }
    const list = (gameState.employees || [])
      .filter((e) => e.shopId === sp.id)
      .map(
        (p) => `
        <div class="row">
          <div><b>${escapeHtml(p.name)}</b><span>当前：${escapeHtml(p.mood)}</span></div>
          <button class="btn secondary" data-act="scheduleEmp" data-id="${escapeAttr(p.id)}" type="button">调整排班</button>
        </div>
      `,
      )
      .join("");
    sheet.open(`排班（${escapeHtml(sp.name)}）`, list || `<div class="row"><span>暂无员工</span><b class="mono">—</b></div>`);
  }

  function openTrainingSheet(shopId) {
    if (!gameState) return;
    const sp = (gameState.shops || []).find((s) => s.id === shopId);
    if (!sp) {
      toast.show("请先选择要培训的店铺");
      return;
    }
    const list = (gameState.employees || [])
      .filter((e) => e.shopId === sp.id)
      .map(
        (p) => `
        <div class="row">
          <div><b>${escapeHtml(p.name)}</b><span>培训后：效率提升</span></div>
          <button class="btn secondary" data-act="trainEmp" data-id="${escapeAttr(p.id)}" type="button">安排培训</button>
        </div>
      `,
      )
      .join("");
    sheet.open(`培训（${escapeHtml(sp.name)}）`, list || `<div class="row"><span>暂无员工</span><b class="mono">—</b></div>`);
  }

  function openFireSheet(shopId) {
    if (!gameState) return;
    const sp = (gameState.shops || []).find((s) => s.id === shopId);
    if (!sp) {
      toast.show("请先选择要开除的店铺");
      return;
    }
    const list = (gameState.employees || [])
      .filter((e) => e.shopId === sp.id)
      .map(
        (p) => `
        <div class="row">
          <div><b>${escapeHtml(p.name)}</b><span>角色：${escapeHtml(p.role)}</span></div>
          <button class="btn secondary" data-act="fireEmp" data-id="${escapeAttr(p.id)}" type="button">开除</button>
        </div>
      `,
      )
      .join("");
    sheet.open(`开除（${escapeHtml(sp.name)}）`, list || `<div class="row"><span>暂无员工</span><b class="mono">—</b></div>`);
  }

  function hireEmployee(candidateId, shopId) {
    if (!gameState) return;
    const sp = (gameState.shops || []).find((s) => s.id === shopId);
    if (!sp) return;
    const pool = gameState.hirePool || [];
    const pick = pool.find((p) => p.id === candidateId);
    if (!pick) return;
    const emp = { ...pick, id: genId("emp"), shopId: sp.id };
    gameState.employees.push(emp);
    syncShopStaffCounts();
    gameState.player.stats.totalStaffHired += 1;
    saveGame(gameState);
    sheet.close();
    toast.show(`已录用 ${emp.name}`);
    router.setView("staff");
  }

  function scheduleEmployee(empId) {
    if (!gameState) return;
    const emp = gameState.employees.find((p) => p.id === empId);
    if (!emp) return;
    emp.mood = "稳定";
    emp.risk = "低";
    saveGame(gameState);
    sheet.close();
    toast.show(`${emp.name} 排班已调整`);
    router.setView("staff");
  }

  function trainEmployee(empId) {
    if (!gameState) return;
    const emp = gameState.employees.find((p) => p.id === empId);
    if (!emp) return;
    emp.mood = "积极";
    emp.risk = "低";
    saveGame(gameState);
    sheet.close();
    toast.show(`${emp.name} 已完成培训`);
    router.setView("staff");
  }

  function fireEmployee(empId) {
    if (!gameState) return;
    const idx = gameState.employees.findIndex((p) => p.id === empId);
    if (idx === -1) return;
    const [removed] = gameState.employees.splice(idx, 1);
    syncShopStaffCounts();
    saveGame(gameState);
    sheet.close();
    toast.show(`已开除 ${removed?.name || "员工"}`);
    router.setView("staff");
  }

  function talkEmployee(empId) {
    if (!gameState) return;
    const emp = gameState.employees.find((p) => p.id === empId);
    if (!emp) return;
    emp.mood = "稳定";
    emp.risk = "低";
    saveGame(gameState);
    toast.show(`${emp.name} 情绪稳定`);
    router.setView("emp", { id: empId });
  }

  function openShopDeliverySheet(shopId) {
    if (!gameState) return;
    const sp = (gameState.shops || []).find((s) => s.id === shopId);
    if (!sp) return;
    sp.delivery = sp.delivery || { enabled: false, budget: 1500, feeRate: 0.2, orders: 320 };

    const d = sp.delivery;
    sheet.open(
      `外卖设置（${escapeHtml(sp.name)}）`,
      `
        <div class="row"><div><b>是否开通</b><span>按店铺管理</span></div><div class="mono ${d.enabled ? "good" : "bad"}" style="font-weight:950">${d.enabled ? "已开通" : "未开通"}</div></div>
        <div class="row"><div><b>平台抽成</b><span>（Demo 固定）</span></div><div class="mono">${Math.round(Number(d.feeRate || 0.2) * 100)}%</div></div>
        <div class="row"><div><b>本月订单</b><span>（Demo 固定）</span></div><div class="mono">${Number(d.orders || 0)}</div></div>

        <label style="margin-top:8px">推广预算（元/月）</label>
        <input id="shopDeliveryBudgetInput" type="number" min="0" value="${Number(d.budget || 0)}" />

        <div style="display:flex; gap:10px; margin-top:10px">
          <button class="btn secondary" data-act="toggleShopDelivery" data-id="${escapeAttr(sp.id)}" type="button">${d.enabled ? "暂停外卖" : "开通外卖"}</button>
          <button class="btn" data-act="saveShopDelivery" data-id="${escapeAttr(sp.id)}" type="button">保存预算</button>
        </div>
        <button class="btn secondary" data-act="closeSheet" type="button" style="margin-top:10px">关闭</button>
      `,
    );
  }

  function toggleShopDelivery(shopId) {
    if (!gameState) return;
    const sp = (gameState.shops || []).find((s) => s.id === shopId);
    if (!sp) return;
    sp.delivery = sp.delivery || { enabled: false, budget: 1500, feeRate: 0.2, orders: 320 };
    sp.delivery.enabled = !sp.delivery.enabled;
    saveGame(gameState);
    toast.show(sp.delivery.enabled ? "已开通外卖" : "已暂停外卖");
    openShopDeliverySheet(sp.id);
  }

  function saveShopDeliveryFromSheet(shopId) {
    if (!gameState) return;
    const sp = (gameState.shops || []).find((s) => s.id === shopId);
    if (!sp) return;
    sp.delivery = sp.delivery || { enabled: false, budget: 1500, feeRate: 0.2, orders: 320 };

    const val = Number(document.getElementById("shopDeliveryBudgetInput")?.value || 0);
    if (!Number.isFinite(val) || val < 0) {
      toast.show("预算不能为空");
      return;
    }
    sp.delivery.budget = Math.round(val);
    saveGame(gameState);
    toast.show("已保存");
    openShopDeliverySheet(sp.id);
  }

  function openLocationSheet(locationId) {
    if (!gameState || !gameData) return;
    const loc = gameData.locations.get(locationId);
    if (!loc) return;
    sheet.open(
      "门面详情（Demo）",
      `
        <div class="row"><div><b>${escapeHtml(loc.name)}</b><span>人流系数 ${loc.traffic_multiplier}x · 租金系数 ${loc.rent_multiplier.toFixed(1)}</span></div><div class="mono">${escapeHtml(loc.id)}</div></div>
        <div class="row"><div><b>竞争</b><span>${escapeHtml(loc.competition_base)}</span></div><div class="mono">—</div></div>
        <button class="btn secondary" data-act="openShopCreate" data-id="${escapeAttr(loc.id)}" type="button">在此开新店</button>
        <button class="btn secondary" data-act="openShopRelocate" data-id="${escapeAttr(loc.id)}" type="button">搬店到这里</button>
        <button class="btn secondary" data-act="closeSheet" type="button">关闭</button>
      `,
    );
  }

  function claimDailyReward() {
    if (!gameState) return;
    if (gameState.welfare.dailyClaimed) return;
    gameState.welfare.dailyClaimed = true;
    gameState.player.cash += 1000;
    saveGame(gameState);
    toast.show("已领取今日奖励");
    router.setView("welfare");
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
    raw.employees = raw.employees || [];
    for (const sp of raw.shops) {
      sp.delivery = sp.delivery || { enabled: false, budget: 1500, feeRate: 0.2, orders: 320 };
      if (typeof sp.staffCount !== "number") sp.staffCount = 0;
    }
    const fallbackShopId = raw.shops[0]?.id || "";
    for (const e of raw.employees) {
      if (typeof e.shopId !== "string") e.shopId = fallbackShopId;
    }
    const staffCounts = new Map();
    for (const e of raw.employees) {
      if (!e.shopId) continue;
      staffCounts.set(e.shopId, (staffCounts.get(e.shopId) || 0) + 1);
    }
    for (const sp of raw.shops) {
      sp.staffCount = staffCounts.get(sp.id) || 0;
    }
    raw.leaderboard =
      raw.leaderboard && raw.leaderboard.length
        ? raw.leaderboard
        : [
            { rank: 1, name: "江城连锁", cash: 245000 },
            { rank: 2, name: "巷口热干面", cash: 183000 },
            { rank: 3, name: raw.player?.name || "你", cash: raw.player?.cash || 0 },
            { rank: 4, name: "夜市达人", cash: 92000 },
          ];
    raw.welfare = raw.welfare || { dailyClaimed: false, skipTickets: 0 };
    raw.hirePool = raw.hirePool || [];
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
    if (typeof raw.player.stressMaxMonths !== "number") {
      raw.player.stressMaxMonths = Number(raw.player.stressMaxWeeks || 0);
    }
    delete raw.player.stressMaxWeeks;

    // 兜底：确保至少有一个婚恋状态 flag（events.csv/choices.csv 目前使用 required_flags 做门槛）
    if (!raw.flags.single && !raw.flags.dating && !raw.flags.married && !raw.flags.divorced) {
      raw.flags.single = true;
    }

    return raw;
  }
}

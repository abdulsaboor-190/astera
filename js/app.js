// Shared UI state is initialized here and reused by later screens.
window.state = {
  route: "#/chat",
  filters: { range: "q3", region: "all" },
  pinned: [],
  pipelineOverrides: {},
  draft: [],
  chatMessages: [],
  chartChanges: {}
};
window.state.chatMessages = window.state.chatMessages || [];
window.state.chartChanges = window.state.chartChanges || {};
// Restore saved chat pins when browser storage is available; the app still works without it.
try {
  const savedPins = window.localStorage.getItem("astera-pinned-charts");
  if (savedPins) window.state.pinned = JSON.parse(savedPins).filter((item) => item && item.id && item.chartData);
} catch (error) {
  window.state.pinned = [];
}

// Small inline SVGs keep the shell self-contained and work offline.
const ICONS = {
  chat: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 11.5a7.5 7.5 0 0 1-7.5 7.5H6l-3 2v-6.2A7.5 7.5 0 1 1 20 11.5Z"/><path d="M8 11h.01M12 11h.01M16 11h.01"/></svg>',
  dashboard: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="8" height="8" rx="1.5"/><rect x="13" y="3" width="8" height="5" rx="1.5"/><rect x="13" y="10" width="8" height="11" rx="1.5"/><rect x="3" y="13" width="8" height="8" rx="1.5"/></svg>',
  pipelines: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="7" height="6" rx="1.5"/><rect x="14" y="15" width="7" height="6" rx="1.5"/><path d="M6.5 9v3.5a3 3 0 0 0 3 3H14M17.5 15v-3.5a3 3 0 0 0-3-3H10"/></svg>',
  close: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg>',
  running: '<svg class="status-icon status-icon-spin" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 12a8 8 0 0 1-13.7 5.7M4 12a8 8 0 0 1 13.7-5.7"/><path d="M6 17.7v-4h4M18 6.3v4h-4"/></svg>',
  succeeded: '<svg class="status-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4.5 4.5L19 7"/></svg>',
  failed: '<svg class="status-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m7 7 10 10M17 7 7 17"/></svg>',
  scheduled: '<svg class="status-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>'
};

const NAV_ITEMS = [
  { route: "#/chat", label: "Chat", icon: ICONS.chat },
  { route: "#/dashboard", label: "Dashboard", icon: ICONS.dashboard },
  { route: "#/pipelines", label: "Pipelines", icon: ICONS.pipelines }
];

// Badge names and icon shapes remain consistent across all screens.
const STATUS_INFO = {
  Running: { icon: ICONS.running, className: "running" },
  Succeeded: { icon: ICONS.succeeded, className: "succeeded" },
  Failed: { icon: ICONS.failed, className: "failed" },
  Scheduled: { icon: ICONS.scheduled, className: "scheduled" }
};

let activeSheet = null;
let sheetReturnFocus = null;
let toastTimer = null;

// Return the currently focusable controls inside an open sheet.
function sheetFocusables() {
  if (!activeSheet) return [];
  return Array.from(activeSheet.querySelectorAll(
    'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
  )).filter((element) => element.getClientRects().length > 0);
}

function closeSheet() {
  if (!activeSheet) return;
  const sheet = activeSheet;
  const returnFocus = sheetReturnFocus;
  const backdrop = sheet.closest(".sheet-backdrop");
  if (backdrop) backdrop.classList.remove("is-open");
  document.body.classList.remove("sheet-is-open");
  activeSheet = null;
  sheetReturnFocus = null;
  if (backdrop) backdrop.remove();
  if (returnFocus && document.contains(returnFocus)) returnFocus.focus();
}

function openSheet(title, html, options = {}) {
  closeSheet();
  sheetReturnFocus = document.activeElement;
  const sheetId = `sheet-${Date.now()}`;
  const overlay = document.createElement("div");
  overlay.className = `sheet-backdrop${options.sidePanel ? " sheet-side-backdrop" : ""}`;
  overlay.innerHTML = `<section class="sheet-panel${options.sidePanel ? " is-side-panel" : ""}" role="dialog" aria-modal="true" aria-labelledby="${sheetId}-title" tabindex="-1">
    <header class="sheet-header">
      <h2 id="${sheetId}-title">${title}</h2>
      <button class="sheet-close btn btn-ghost" type="button" aria-label="Close panel">${ICONS.close}</button>
    </header>
    <div class="sheet-content">${html}</div>
  </section>`;
  document.body.appendChild(overlay);
  activeSheet = overlay.querySelector(".sheet-panel");
  document.body.classList.add("sheet-is-open");

  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) closeSheet();
  });
  overlay.querySelector(".sheet-close").addEventListener("click", closeSheet);
  overlay.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      closeSheet();
      return;
    }
    if (event.key !== "Tab" || !activeSheet) return;
    const items = sheetFocusables();
    if (!items.length) {
      event.preventDefault();
      activeSheet.focus();
      return;
    }
    const first = items[0];
    const last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });

  requestAnimationFrame(() => {
    overlay.classList.add("is-open");
    const first = sheetFocusables()[0];
    (first || activeSheet).focus();
  });
}

function toast(message, options = {}) {
  const { actionLabel, onAction, secondaryActionLabel, onSecondaryAction } = options;
  const oldToast = document.querySelector(".toast");
  if (oldToast) oldToast.remove();
  window.clearTimeout(toastTimer);

  const node = document.createElement("div");
  node.className = `toast${secondaryActionLabel ? " toast-has-two-actions" : ""}`;
  node.setAttribute("role", "status");
  node.setAttribute("aria-live", "polite");
  node.innerHTML = `<span class="toast-message"></span>${actionLabel ? '<button class="btn btn-ghost toast-action" type="button"></button>' : ""}${secondaryActionLabel ? '<button class="btn btn-ghost toast-secondary-action" type="button"></button>' : ""}<button class="toast-dismiss" type="button" aria-label="Dismiss notification">${ICONS.close}</button>`;
  node.querySelector(".toast-message").textContent = message;
  const action = node.querySelector(".toast-action");
  if (action) {
    action.textContent = actionLabel;
    action.addEventListener("click", () => {
      if (typeof onAction === "function") onAction();
      node.remove();
      window.clearTimeout(toastTimer);
    });
  }
  const secondaryAction = node.querySelector(".toast-secondary-action");
  if (secondaryAction) {
    secondaryAction.textContent = secondaryActionLabel;
    secondaryAction.addEventListener("click", () => {
      if (typeof onSecondaryAction === "function") onSecondaryAction();
      node.remove();
      window.clearTimeout(toastTimer);
    });
  }
  node.querySelector(".toast-dismiss").addEventListener("click", () => node.remove());
  document.body.appendChild(node);
  toastTimer = window.setTimeout(() => node.remove(), 5000);
}

// Shared UI helpers are available to the chart and pipeline modules.
window.UI = {
  statusBadge(status) {
    const info = STATUS_INFO[status];
    if (!info) return `<span class="status-badge status-unknown" role="status" aria-label="Status: ${status}">${status}</span>`;
    return `<span class="status-badge status-${info.className}" role="status" aria-label="Status: ${status}">${info.icon}<span>${status}</span></span>`;
  },
  openSheet,
  closeSheet,
  toast
};

// Read the four supported hash routes and send unknown paths to Chat.
function normalizeRoute(hash) {
  const route = hash || "#/chat";
  if (["#/chat", "#/dashboard", "#/pipelines"].includes(route)) return route;
  if (/^#\/pipeline\/[^/]+$/.test(route)) return route;
  return "#/chat";
}

function routeTitle(route) {
  if (route.startsWith("#/pipeline/")) {
    const id = route.slice("#/pipeline/".length);
    const pipeline = window.DATA?.pipelines?.find((item) => item.id === id);
    return pipeline ? pipeline.name : "Pipeline";
  }
  return NAV_ITEMS.find((item) => item.route === route)?.label || "Chat";
}

function updateDocumentTitle(route) {
  document.title = `${routeTitle(route)} · Astera Studio`;
}

function navLink(item, activeRoute) {
  const active = item.route === activeRoute ||
    (item.route === "#/pipelines" && activeRoute.startsWith("#/pipeline/"));
  return `<a class="nav-link" href="${item.route}"${active ? ' aria-current="page"' : ""}>
    <span class="nav-link-content">${item.icon}<span>${item.label}</span></span>
    ${active ? '<span class="nav-current-text">Current</span>' : ""}
  </a>`;
}

function pipelineLinks(activeRoute) {
  const pipelines = window.DATA?.pipelines || [];
  return pipelines.map((pipeline) => {
    const active = activeRoute === `#/pipeline/${pipeline.id}`;
    const status = window.getPipelineStatus?.(pipeline.id) || pipeline.status;
    return `<a class="pipeline-link" href="#/pipeline/${pipeline.id}"${active ? ' aria-current="page"' : ""}>
      <span class="pipeline-dot" aria-hidden="true"></span>
      <span>${pipeline.name}</span>
      <span class="pipeline-status-text">${status}</span>
    </a>`;
  }).join("");
}

function escapeMarkup(value) {
  return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}

function mostRecentDataUpdate() {
  const succeeded = window.DATA.pipelines
    .filter((pipeline) => window.getPipelineStatus(pipeline.id) === "Succeeded")
    .map((pipeline) => {
      const effectiveRun = window.state.pipelineOverrides[pipeline.id]?.lastRun || pipeline.lastRun;
      const justNow = /^just now$/i.test(effectiveRun);
      const minutes = Number((effectiveRun.match(/(\d+) min/) || [])[1]);
      const hours = Number((effectiveRun.match(/(\d+) hour/) || [])[1]);
      return { value: effectiveRun, age: justNow ? 0 : minutes || hours * 60 || 999999 };
    })
    .sort((a, b) => a.age - b.age);
  return succeeded[0]?.value?.toLowerCase() || "12 min ago";
}

function renderKpiCard(kpi) {
  const pipelineStatus = window.getPipelineStatus(kpi.pipelineId);
  const isStale = Boolean(kpi.stale && pipelineStatus !== "Succeeded");
  const range = window.state.filters.range;
  const region = window.state.filters.region;
  // Read the prepared value for this filter pair; the UI does no aggregation.
  const filtered = window.DATA.filterData.values[range][region];
  const fields = {
    revenue: ["revenue", "revenueDelta"],
    orders: ["orders", "ordersDelta"],
    "average-order-value": ["aov", "aovDelta"],
    "target-attainment": ["attainment", "attainmentDelta"]
  }[kpi.id];
  // Refreshed attainment is precomputed only for Q3 filter pairs; other filters use filterData.
  const refreshedAttainment = kpi.id === "target-attainment" && pipelineStatus === "Succeeded"
    ? window.state.pipelineOverrides[kpi.pipelineId]?.attainmentByFilter?.[range]?.[region]
    : null;
  const value = refreshedAttainment?.value || (fields ? filtered[fields[0]] : kpi.value);
  const delta = refreshedAttainment?.delta || (fields ? filtered[fields[1]] : kpi.delta);
  const negative = String(delta).trim().startsWith("-") || String(delta).trim().startsWith("−");
  const cleanDelta = String(delta).replace(/^[+\-−]/, "");
  const deltaText = `${negative ? "−" : "+"}${cleanDelta} vs previous period`;
  const displayValue = String(value).replace(/(\d)([MkK])\b/g, "$1 $2");
  return `<article class="kpi-card card">
    <div class="kpi-card-top"><h3>${escapeMarkup(kpi.label)}</h3>${isStale ? '<span class="stale-tag"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>Stale</span>' : ""}</div>
    <p class="kpi-value">${escapeMarkup(displayValue)}</p>
    <p class="kpi-delta ${negative ? "is-negative" : "is-positive"}"><span aria-hidden="true">${negative ? "↓" : "↑"}</span>${escapeMarkup(deltaText)}</p>
    <div class="kpi-pipeline-status"><span>From ${escapeMarkup(window.DATA.pipelines.find((item) => item.id === kpi.pipelineId)?.name || "pipeline")}</span>${window.UI.statusBadge(pipelineStatus)}</div>
  </article>`;
}

const FILTER_RANGES = [
  { id: "30d", label: "Last 30 days" },
  { id: "q3", label: "Q3" },
  { id: "q2", label: "Q2" },
  { id: "ytd", label: "Year to date" }
];
const FILTER_REGIONS = [
  { id: "all", label: "All" },
  { id: "north", label: "North" },
  { id: "east", label: "East" },
  { id: "south", label: "South" },
  { id: "west", label: "West" }
];

function activeDashboardFilterCount() {
  const filters = window.state.filters;
  return Number(filters.range !== "q3") + Number(filters.region !== "all");
}

function renderInlineFilterGroup(title, name, options, selected) {
  return `<fieldset class="filter-chip-group"><legend>${title}</legend><div>${options.map((option) => `<label class="filter-chip${selected === option.id ? " is-selected" : ""}">
    <input type="radio" name="${name}" value="${option.id}"${selected === option.id ? " checked" : ""}><span>${option.label}</span></label>`).join("")}</div></fieldset>`;
}

function renderDashboardFilters() {
  const { range, region } = window.state.filters;
  const count = activeDashboardFilterCount();
  const active = [];
  if (range !== "q3") active.push(FILTER_RANGES.find((item) => item.id === range)?.label || range);
  if (region !== "all") active.push(FILTER_REGIONS.find((item) => item.id === region)?.label || region);
  return `<section class="dashboard-filter-controls" aria-label="Dashboard filters">
    <button class="btn btn-secondary phone-filter-button" type="button" data-open-filters aria-haspopup="dialog"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M7 12h10m-7 6h4"/></svg><span>Filters</span><span class="filter-count">${count}</span></button>
    <div class="inline-filter-groups">
      ${renderInlineFilterGroup("Date range", "dashboard-range", FILTER_RANGES, range)}
      ${renderInlineFilterGroup("Region", "dashboard-region", FILTER_REGIONS, region)}
    </div>
    ${active.length ? `<p class="active-filter-summary"><strong>Active filters:</strong> ${active.map(escapeMarkup).join(" · ")} <button type="button" class="clear-filters" data-clear-filters>Clear</button></p>` : ""}
  </section>`;
}

function renderChartCard({ id, title, pipelineId, updated }) {
  const pipeline = window.DATA.pipelines.find((item) => item.id === pipelineId);
  const status = window.getPipelineStatus(pipelineId);
  const lastUpdated = window.state.pipelineOverrides[pipelineId]?.lastRun || updated || pipeline?.lastRun || "Unknown";
  const failedStep = window.PipelineViews.getProvenance(pipelineId)?.steps.find((step) => step.status === "Failed");
  return `<article class="chart-card card${id === "regional-sales-chart" ? " chart-card-anchor" : ""}">
    <header class="chart-card-header"><div><h3>${escapeMarkup(title)}</h3><p>Updated ${escapeMarkup(lastUpdated)}</p></div>${window.UI.statusBadge(status)}</header>
    <div class="chart-canvas-wrap"><div class="chart-skeleton" role="status" aria-live="polite"><p class="chart-skeleton-caption">Loading Northwind data for this chart.</p><span></span><span></span><span></span><span></span><span></span></div><canvas id="${id}" role="img" aria-label="${escapeMarkup(title)} chart"></canvas></div>
    ${id === "regional-sales-chart" ? '<p class="chart-selection" id="regional-chart-selection" aria-live="polite">Choose a region to open its store breakdown.</p>' : ""}
    ${status === "Failed" ? `<button class="btn btn-secondary chart-rerun" type="button" data-rerun-pipeline="${escapeMarkup(pipelineId)}" data-rerun-step="${escapeMarkup(failedStep?.id || "")}">Re-run</button>` : ""}
    <button class="provenance-link" type="button" data-provenance="${escapeMarkup(pipelineId)}">View pipeline behind this chart<span aria-hidden="true">→</span></button>
    <button class="provenance-link chart-change-open" type="button" data-change-chart="${escapeMarkup(id)}">Change</button>
  </article>`;
}

function renderPinnedPlaceholders() {
  const pinned = window.state.pinned || [];
  if (!pinned.length) return `<section class="pinned-section" aria-labelledby="pinned-title"><h2 id="pinned-title">Pinned from chat</h2><p class="pinned-empty-state">Nothing pinned yet. Pin a chart from chat and it will stay close at hand here.</p></section>`;
  const items = pinned.map((item) => {
    const title = item.title || item.question || "Pinned chart";
    const status = window.getPipelineStatus(item.pipelineId);
    const summary = item.pipelineId === "regional-targets" ? (window.state.pipelineOverrides[item.pipelineId]?.chatSummary || item.summary) : item.summary;
    return `<article class="card pinned-chart-card"><header><div><h3>${escapeMarkup(title)}</h3><p>${window.UI.statusBadge(status)}</p></div><button class="btn btn-ghost pinned-unpin" type="button" data-unpin="${escapeMarkup(item.id)}" aria-label="Unpin ${escapeMarkup(title)}" title="Unpin chart">Unpin</button></header><div class="pinned-chart-wrap"><div class="chart-skeleton" role="status" aria-live="polite"><p class="chart-skeleton-caption">Loading Northwind data for this chart.</p><span></span><span></span><span></span><span></span><span></span></div><canvas id="pinned-chart-${escapeMarkup(item.id)}" role="img" aria-label="${escapeMarkup(title)} chart"></canvas></div><p>${escapeMarkup(summary || "Pinned from chat")}</p><div class="pinned-chart-actions"><button class="provenance-link" type="button" data-provenance="${escapeMarkup(item.pipelineId)}">View pipeline behind this chart<span aria-hidden="true">→</span></button><button class="provenance-link" type="button" data-change-chart="pinned-${escapeMarkup(item.id)}">Change</button></div></article>`;
  }).join("");
  return `<section class="pinned-section" aria-labelledby="pinned-title"><h2 id="pinned-title">Pinned from chat</h2><div class="pinned-grid">${items}</div></section>`;
}

// The phone uses a 2x2 grid so all four KPIs stay visible without horizontal swiping.
function renderDashboardView() {
  const failures = window.DATA.pipelines.filter((pipeline) => window.getPipelineStatus(pipeline.id) === "Failed");
  const running = window.DATA.pipelines.filter((pipeline) => window.getPipelineStatus(pipeline.id) === "Running");
  const failureSummary = failures.length
    ? `<a class="freshness-failures" href="#/pipeline/${escapeMarkup(failures[0].id)}">${window.UI.statusBadge("Failed")}<span>${failures.length} ${failures.length === 1 ? "pipeline failed" : "pipelines failed"}</span><span aria-hidden="true">→</span></a>`
    : running.length ? `<span class="freshness-running">${window.UI.statusBadge("Running")}<span>${running.length} ${running.length === 1 ? "pipeline is running" : "pipelines are running"}</span></span>`
      : '<span class="freshness-all-good">✓ Northwind’s data pipelines are up to date.</span>';
  const latest = mostRecentDataUpdate();
  const charts = [
    renderChartCard({ id: "regional-sales-chart", title: "Sales vs target by region", pipelineId: "regional-targets", updated: latest }),
    renderChartCard({ id: "monthly-revenue-chart", title: "Monthly revenue", pipelineId: "quarterly-sales", updated: latest }),
    renderChartCard({ id: "top-categories-chart", title: "Top categories", pipelineId: "quarterly-sales", updated: latest })
  ].join("");
  return `<section class="dashboard-view" aria-labelledby="dashboard-heading">
    <header class="page-header dashboard-heading"><p class="page-eyebrow">Northwind Retail · Q3</p><h2 id="dashboard-heading">Dashboard</h2><span class="page-header-accent" aria-hidden="true"></span><p class="page-subtitle">Revenue is up 6.1%. South and West are still behind target.</p></header>
    <div class="freshness-strip"><div class="freshness-updated"><span class="freshness-dot" aria-hidden="true"></span><span>Data updated <strong>${escapeMarkup(latest)}</strong></span></div>${failureSummary}</div>
    ${renderDashboardFilters()}
    <section class="kpi-grid" aria-label="Key performance indicators">${window.DATA.kpis.map(renderKpiCard).join("")}</section>
    <section class="dashboard-charts" aria-label="Northwind charts">${charts}</section>
    ${renderPinnedPlaceholders()}
  </section>`;
}

function chatQuestionSuggestions() {
  return window.DATA.chatAnswers.map((answer) => answer.question);
}

function renderSuggestionButtons(questions, className = "chat-suggestions") {
  return `<div class="${className}" aria-label="Suggested questions">${questions.map((question) => `<button class="chat-suggestion-chip" type="button" data-chat-suggestion="${escapeMarkup(question)}">${escapeMarkup(question)}</button>`).join("")}</div>`;
}

function renderChatMessage(message) {
  if (message.role === "user") {
    return `<article class="chat-message user-message"><div class="chat-bubble">${escapeMarkup(message.text)}</div></article>`;
  }
  if (message.typing) {
    return `<article class="chat-message assistant-message"><div class="assistant-avatar" aria-hidden="true">A</div><div class="chat-bubble typing-bubble" role="status" aria-label="Preparing a reply for Northwind"><span></span><span></span><span></span></div></article>`;
  }
  if (message.answer) {
    const answer = message.answer;
    const answerStatus = window.getPipelineStatus(answer.pipelineId);
    const stale = answer.pipelineId === "regional-targets" && answerStatus !== "Succeeded";
    const summary = answer.pipelineId === "regional-targets" && answerStatus === "Succeeded"
      ? (window.state.pipelineOverrides[answer.pipelineId]?.chatSummary || answer.summary.replace(/ Regional Targets failed at the Orders DB join 2 hours ago, so this result is stale\./i, " Regional Targets has refreshed this result."))
      : answer.summary;
    const pinId = pinIdForAnswer(answer);
    const isPinned = window.state.pinned.some((item) => item.id === pinId);
    return `<article class="chat-message assistant-message"><div class="assistant-avatar" aria-hidden="true">A</div><div class="chat-chart-card card">
      <header class="chat-chart-header"><h3>${escapeMarkup(answer.question)}</h3>${stale ? '<span class="chat-stale-tag"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>Stale · Regional Targets failed 2 hours ago</span>' : ""}</header>
      <div class="chat-chart-canvas-wrap"><div class="chart-skeleton" role="status" aria-live="polite"><p class="chart-skeleton-caption">Loading Northwind data for this chart.</p><span></span><span></span><span></span><span></span><span></span></div><canvas class="chat-chart-canvas" id="chat-chart-${escapeMarkup(message.id)}" role="img" aria-label="${escapeMarkup(answer.question)}"></canvas></div>
      <p class="chat-chart-summary">${escapeMarkup(summary)}</p>
      <div class="chat-chart-actions" data-answer-id="${escapeMarkup(pinId)}">
        ${window.getPipelineStatus(answer.pipelineId) === "Failed" ? `<button class="btn btn-secondary" type="button" data-rerun-pipeline="${escapeMarkup(answer.pipelineId)}" data-rerun-step="${escapeMarkup(window.PipelineViews.getProvenance(answer.pipelineId)?.steps.find((step) => step.status === "Failed")?.id || "")}">Re-run</button>` : ""}
        ${isPinned ? '<button class="btn btn-secondary" type="button" disabled><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4.5 4.5L19 7"/></svg>Pinned</button><button class="btn btn-ghost" type="button" data-unpin="' + escapeMarkup(pinId) + '">Unpin</button>' : '<button class="btn btn-secondary" type="button" data-pin="' + escapeMarkup(message.id) + '"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 4h8l-1 6 3 3v2h-5v5l-1 1-1-1v-5H6v-2l3-3z"/></svg>Pin</button>'}
        <button class="btn btn-ghost" type="button" data-provenance="${escapeMarkup(answer.pipelineId)}">View pipeline behind this chart</button>
        <button class="btn btn-ghost" type="button" data-change-chart="chat-${escapeMarkup(message.id)}">Change</button>
      </div>
    </div></article>`;
  }
  return `<article class="chat-message assistant-message"><div class="assistant-avatar" aria-hidden="true">A</div><div class="chat-bubble assistant-copy"><p>${escapeMarkup(message.text)}</p>${message.suggestions?.length ? renderSuggestionButtons(message.suggestions, "chat-suggestions chat-inline-suggestions") : ""}</div></article>`;
}

function renderChatView() {
  const messages = window.state.chatMessages;
  const initial = messages.length === 0
    ? `<article class="chat-message assistant-message"><div class="assistant-avatar" aria-hidden="true">A</div><div class="chat-bubble assistant-copy"><p>Good afternoon. Northwind’s Q3 sales are up overall, while South and West remain below target. What would you like to look at?</p>${renderSuggestionButtons(chatQuestionSuggestions())}</div></article>`
    : messages.map(renderChatMessage).join("");
  return `<section class="chat-view" aria-labelledby="chat-heading">
    <div class="chat-layout"><div class="chat-column">
      <div class="chat-thread" id="chat-thread" aria-live="polite" aria-relevant="additions text" aria-label="Conversation">
        <header class="page-header chat-page-header"><p class="page-eyebrow">Northwind Retail · Q3</p><h2 id="chat-heading">Chat</h2><span class="page-header-accent" aria-hidden="true"></span><p class="page-subtitle">Ask about sales, regions or categories.</p></header>${initial}<div class="chat-thread-end" id="chat-thread-end" aria-hidden="true"></div>
      </div>
      <form class="chat-composer" id="chat-composer" autocomplete="off">
        <label class="visually-hidden" for="chat-input">Ask Astera a question</label>
        <input id="chat-input" name="question" type="text" placeholder="Ask about sales, regions, or categories…" enterkeyhint="send" maxlength="500">
        <button class="btn btn-primary chat-send" type="submit" aria-label="Send message"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6"/></svg></button>
      </form>
    </div><aside class="chat-side-reserve" aria-hidden="true"></aside></div>
  </section>`;
}

function pinIdForAnswer(answer) {
  return `chat-${answer.pipelineId}-${answer.question.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;
}

function persistPinnedCharts() {
  try { window.localStorage.setItem("astera-pinned-charts", JSON.stringify(window.state.pinned)); }
  catch (error) { /* Keep pins for this session even when storage is blocked or full. */ }
}

function setPinned(pinId, shouldPin) {
  if (shouldPin) {
    const message = window.state.chatMessages.find((item) => item.answer && pinIdForAnswer(item.answer) === pinId);
    if (!message) return;
    if (!window.state.pinned.some((item) => item.id === pinId)) {
      const answer = message.answer;
      window.state.pinned.push({ id: pinId, title: answer.question, question: answer.question, summary: answer.summary, chartType: answer.chartType, chartData: answer.chartData, pipelineId: answer.pipelineId });
    }
  } else {
    window.state.pinned = window.state.pinned.filter((item) => item.id !== pinId);
  }
  persistPinnedCharts();
  window.renderApp();
}

function showProvenance(pipelineId) {
  if (window.matchMedia("(max-width: 639px)").matches) {
    window.location.hash = `#/pipeline/${pipelineId}`;
    return;
  }
  const pipeline = window.PipelineViews.getProvenance(pipelineId);
  if (!pipeline) return;
  window.UI.openSheet(pipeline.name, window.PipelineViews.renderProvenancePanel(pipelineId), { sidePanel: true });
  window.PipelineViews.wireProvenancePanel(document.querySelector(".sheet-content"));
  document.querySelector(".provenance-panel a")?.addEventListener("click", window.UI.closeSheet);
}

const CHART_CHANGE_CHOICES = [
  { value: "line", label: "Make it a line chart" },
  { value: "bar", label: "Make it a bar chart" },
  { value: "only-south-west", label: "Only South and West" },
  { value: "percent", label: "Show as % of target" },
  { value: "reset", label: "Reset" }
];

function changeConfirmation(change) {
  return ({ line: "The chart now uses a line view.", bar: "The chart now uses bars.", "only-south-west": "Showing South and West.", "only-south": "Showing South.", percent: "The chart now shows percentages.", reset: "The chart is back to its original view." })[change] || "The chart has been updated.";
}

// Both the change sheet and chat text route through this single action function.
function applyChartChange(chartId, change, options = {}) {
  if (change === "reset") {
    delete window.state.chartChanges[chartId];
  } else {
    const saved = { ...(window.state.chartChanges[chartId] || {}) };
    if (change === "line" || change === "bar") saved.type = change;
    if (change === "only-south-west") saved.region = "south-west";
    if (change === "only-south") saved.region = "south";
    if (change === "percent") saved.percent = true;
    window.state.chartChanges[chartId] = saved;
  }
  window.DashboardCharts?.applyChange(chartId, window.state.chartChanges[chartId] || {});

  const confirmation = changeConfirmation(change);
  if (options.chat) {
    window.state.chatMessages.push({ id: `change-user-${Date.now()}`, role: "user", text: options.userText || CHART_CHANGE_CHOICES.find((item) => item.value === change)?.label || change });
    window.state.chatMessages.push({ id: `change-assistant-${Date.now()}`, role: "assistant", text: confirmation });
    window.renderApp();
    scrollChatToLatest();
  } else {
    window.UI.toast(confirmation);
  }
}

function showChangeSheet(chartId, isChat = false) {
  const hasTarget = chartHasTargetSeries(chartId);
  const choices = CHART_CHANGE_CHOICES.map((choice) => choice.value === "percent" && !hasTarget
    ? { ...choice, label: "Show as % of total" }
    : choice);
  const chips = choices.map((choice) => `<button class="chat-suggestion-chip chart-change-chip" type="button" data-chart-change="${escapeMarkup(choice.value)}">${escapeMarkup(choice.label)}</button>`).join("");
  window.UI.openSheet("Change chart", `<div class="chart-change-sheet"><p>Choose what you want to see.</p><div class="chat-suggestions">${chips}</div></div>`);
  document.querySelectorAll("[data-chart-change]").forEach((button) => button.addEventListener("click", () => {
    applyChartChange(chartId, button.dataset.chartChange, { chat: isChat });
    window.UI.closeSheet();
  }));
}

function chartHasTargetSeries(chartId) {
  if (chartId === "regional-sales-chart") return true;
  let answer = null;
  if (chartId.startsWith("chat-")) answer = window.state.chatMessages.find((item) => item.id === chartId.slice(5))?.answer;
  if (chartId.startsWith("pinned-")) answer = window.state.pinned.find((item) => item.id === chartId.slice(7));
  return Boolean(answer?.chartData?.sales && answer?.chartData?.target);
}

function wirePipelineRerunButtons(root = document) {
  root.querySelectorAll("[data-rerun-pipeline]").forEach((button) => {
    button.addEventListener("click", () => window.rerunPipeline?.(button.dataset.rerunPipeline, button.dataset.rerunStep));
  });
}

let chatKeyboardListenersReady = false;

function updateChatKeyboardInset() {
  if (window.state.route !== "#/chat" || !window.visualViewport) {
    document.documentElement.style.setProperty("--keyboard-inset", "0px");
    document.body.classList.remove("chat-keyboard-open");
    return;
  }
  // visualViewport shrinks when the iOS keyboard opens; lift the fixed composer above it.
  const inset = Math.max(0, window.innerHeight - window.visualViewport.height - window.visualViewport.offsetTop);
  document.documentElement.style.setProperty("--keyboard-inset", `${inset}px`);
  document.body.classList.toggle("chat-keyboard-open", inset > 100);
}

function installChatKeyboardTracking() {
  if (chatKeyboardListenersReady) return;
  chatKeyboardListenersReady = true;
  window.visualViewport?.addEventListener("resize", updateChatKeyboardInset);
  window.visualViewport?.addEventListener("scroll", updateChatKeyboardInset);
  window.addEventListener("resize", updateChatKeyboardInset);
}

function scrollChatToLatest(keepInputFocused = false) {
  window.requestAnimationFrame(() => {
    const end = document.getElementById("chat-thread-end");
    end?.scrollIntoView({ block: "end", behavior: "auto" });
    if (keepInputFocused) {
      const input = document.getElementById("chat-input");
      input?.focus({ preventScroll: true });
    }
    updateChatKeyboardInset();
  });
}

function sendChatQuestion(question, keepInputFocused = false) {
  const text = String(question || "").trim();
  if (!text) return;
  const latestChart = [...window.state.chatMessages].reverse().find((message) => message.answer);
  const chartChange = latestChart ? changeFromChatText(text) : null;
  if (chartChange) {
    applyChartChange(`chat-${latestChart.id}`, chartChange, { chat: true, userText: text });
    return;
  }
  const id = `message-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const typingId = `${id}-typing`;
  window.state.chatMessages.push({ id, role: "user", text });
  window.state.chatMessages.push({ id: typingId, role: "assistant", typing: true });
  window.renderApp();
  scrollChatToLatest(keepInputFocused);

  window.setTimeout(() => {
    const needle = text.toLocaleLowerCase();
    const answer = window.DATA.chatAnswers.find((item) =>
      item.keywords.some((keyword) => needle.includes(keyword.toLocaleLowerCase()))
    );
    const typingMessage = window.state.chatMessages.find((message) => message.id === typingId);
    if (!typingMessage) return;
    if (answer) {
      typingMessage.typing = false;
      typingMessage.answer = answer;
    } else {
      typingMessage.typing = false;
        typingMessage.text = "I can pull up sales, regional targets, monthly revenue, or category performance. Try one of these:";
      typingMessage.suggestions = chatQuestionSuggestions();
    }
    window.renderApp();
    scrollChatToLatest(keepInputFocused);
  }, 800);
}

function changeFromChatText(text) {
  const query = text.toLocaleLowerCase();
  if (query.includes("reset")) return "reset";
  if (query.includes("line chart") || query.includes("as a line")) return "line";
  if (query.includes("bar chart") || query.includes("as a bar")) return "bar";
  if (query.includes("only south") && query.includes("west")) return "only-south-west";
  if (query.includes("only south")) return "only-south";
  if (query.includes("percent") || query.includes("percentage") || query.includes("% of target")) return "percent";
  return null;
}

function wireChartActions(root, isChat = false) {
  root.querySelectorAll("[data-provenance]").forEach((button) => button.addEventListener("click", () => showProvenance(button.dataset.provenance)));
  root.querySelectorAll("[data-change-chart]").forEach((button) => button.addEventListener("click", () => showChangeSheet(button.dataset.changeChart, isChat)));
}

function wireChatView() {
  const composer = document.getElementById("chat-composer");
  if (composer) {
    composer.addEventListener("submit", (event) => {
      event.preventDefault();
      const input = document.getElementById("chat-input");
      const question = input.value;
      input.value = "";
      sendChatQuestion(question, true);
    });
  }
  document.querySelectorAll("[data-chat-suggestion]").forEach((button) => {
    button.addEventListener("click", () => sendChatQuestion(button.dataset.chatSuggestion));
  });
  document.querySelectorAll("[data-pin]").forEach((button) => {
    button.addEventListener("click", () => {
      const message = window.state.chatMessages.find((item) => item.id === button.dataset.pin);
      if (!message?.answer) return;
      const pinId = pinIdForAnswer(message.answer);
      setPinned(pinId, true);
      window.UI.toast("Pinned to the dashboard.", {
        actionLabel: "View dashboard",
        onAction: () => { window.location.hash = "#/dashboard"; },
        secondaryActionLabel: "Undo",
        onSecondaryAction: () => setPinned(pinId, false)
      });
    });
  });
  document.querySelectorAll("[data-unpin]").forEach((button) => {
    button.addEventListener("click", () => setPinned(button.dataset.unpin, false));
  });
  wireChartActions(document.getElementById("main-content") || document, true);
  wirePipelineRerunButtons(document.getElementById("main-content") || document);
}

function renderDashboardAtScrollPosition(scrollY) {
  window.renderApp();
  window.requestAnimationFrame(() => window.scrollTo(0, scrollY));
}

function applyDashboardFilters(range, region) {
  const cachedRange = window.DATA.filterData.values[range] ? range : "q3";
  const cachedRegion = window.DATA.filterData.values[cachedRange][region] ? region : "all";
  const scrollY = window.scrollY;
  window.state.filters = { range: cachedRange, region: cachedRegion };
  renderDashboardAtScrollPosition(scrollY);
}

function openDashboardFilterSheet() {
  const range = window.state.filters.range;
  const region = window.state.filters.region;
  const radioOptions = (name, options, selected) => options.map((option) => `<label class="filter-radio-option">
    <input type="radio" name="${name}" value="${option.id}"${selected === option.id ? " checked" : ""}>
    <span class="filter-radio-mark" aria-hidden="true"></span><span>${option.label}</span></label>`).join("");
  window.UI.openSheet("Dashboard filters", `<div class="filter-sheet-content">
    <fieldset><legend>Date range</legend><div class="filter-radio-list">${radioOptions("sheet-range", FILTER_RANGES, range)}</div></fieldset>
    <fieldset><legend>Region</legend><div class="filter-radio-list">${radioOptions("sheet-region", FILTER_REGIONS, region)}</div></fieldset>
    <div class="filter-sheet-actions"><button class="btn btn-ghost" type="button" data-filter-reset>Reset</button><button class="btn btn-primary" type="button" data-filter-apply>Apply</button></div>
  </div>`);
  const sheet = document.querySelector(".sheet-panel");
  sheet.querySelector("[data-filter-apply]").addEventListener("click", () => {
    const nextRange = sheet.querySelector('[name="sheet-range"]:checked')?.value || "q3";
    const nextRegion = sheet.querySelector('[name="sheet-region"]:checked')?.value || "all";
    window.UI.closeSheet();
    applyDashboardFilters(nextRange, nextRegion);
  });
  sheet.querySelector("[data-filter-reset]").addEventListener("click", () => {
    window.UI.closeSheet();
    applyDashboardFilters("q3", "all");
  });
}

function wireDashboardFilters() {
  const dashboard = document.querySelector(".dashboard-view");
  if (!dashboard) return;
  dashboard.querySelector("[data-open-filters]")?.addEventListener("click", openDashboardFilterSheet);
  dashboard.querySelectorAll('.inline-filter-groups input[type="radio"]').forEach((input) => {
    input.addEventListener("change", () => {
      const nextRange = dashboard.querySelector('[name="dashboard-range"]:checked')?.value || window.state.filters.range;
      const nextRegion = dashboard.querySelector('[name="dashboard-region"]:checked')?.value || window.state.filters.region;
      applyDashboardFilters(nextRange, nextRegion);
    });
  });
  dashboard.querySelector("[data-clear-filters]")?.addEventListener("click", () => applyDashboardFilters("q3", "all"));
}

window.openDrill = function openDrill(regionName) {
  const region = window.DATA.regions.find((item) => item.name.toLowerCase() === String(regionName).toLowerCase());
  const breakdown = region && window.DATA.drillDown?.[region.id];
  if (!region || !breakdown) {
    window.UI.toast("I can’t find a store breakdown for that region.");
    return;
  }
  const rows = breakdown.stores.map((store) => `<tr><th scope="row">${escapeMarkup(store.name)}</th><td>$${escapeMarkup(store.sales)} K</td><td>$${escapeMarkup(store.target)} K</td><td>${escapeMarkup(store.attainment)}</td></tr>`).join("");
  window.DashboardCharts?.destroyDrillChart?.();
  window.UI.openSheet(`${escapeMarkup(region.name)} breakdown`, `<div class="drill-sheet"><p>Q3 store performance · values in $K</p><div class="drill-chart-wrap"><div class="chart-skeleton" role="status" aria-live="polite"><p class="chart-skeleton-caption">Loading Northwind store sales.</p><span></span><span></span><span></span><span></span><span></span></div><canvas id="drill-monthly-chart" role="img" aria-label="${escapeMarkup(region.name)} monthly sales over six months"></canvas></div><div class="drill-table-wrap"><table class="drill-table"><caption>Store sales vs target</caption><thead><tr><th scope="col">Store</th><th scope="col">Sales</th><th scope="col">Target</th><th scope="col">Attainment</th></tr></thead><tbody>${rows}</tbody></table></div><a class="btn btn-secondary" href="#/pipeline/regional-targets">View pipeline behind this</a></div>`);
  window.DashboardCharts?.renderDrillChart(region.id);
  document.querySelector(".drill-sheet a")?.addEventListener("click", window.UI.closeSheet);
};

// Temporary Chat controls make the reusable pieces easy to inspect by hand.
function renderChatTestView() {
  const badges = ["Running", "Succeeded", "Failed", "Scheduled"]
    .map((status) => window.UI.statusBadge(status)).join("");
  return `<section class="test-page" aria-labelledby="view-title">
    <h2 id="view-title">Reusable components</h2>
    <p class="test-intro">Temporary preview for status, sheet, and toast components.</p>
    <article class="card test-section">
      <h3>Status badges</h3>
      <div class="badge-row">${badges}</div>
    </article>
    <article class="card test-section">
      <h3>Bottom sheet and side panel</h3>
      <p>Open this panel to try the close button, backdrop, Escape key, and focus return.</p>
      <button class="btn btn-primary" type="button" data-test="open-sheet">Open sheet</button>
    </article>
    <article class="card test-section">
      <h3>Toast with Undo</h3>
      <p>Undo runs a small demo action and dismisses the toast.</p>
      <button class="btn btn-secondary" type="button" data-test="show-toast">Show toast</button>
    </article>
  </section>`;
}

// Other route views remain placeholders until their own phases are implemented.
function renderMainView(route) {
  if (route === "#/chat") return renderChatView();
  if (route === "#/dashboard") return renderDashboardView();
  if (route === "#/pipelines") return window.PipelineViews.renderList();
  if (route.startsWith("#/pipeline/")) {
    return window.PipelineViews.renderDetail(route.slice("#/pipeline/".length));
  }
  const title = routeTitle(route);
  return `<section class="card placeholder-card" aria-labelledby="view-title">
    <h2 id="view-title">${title}</h2>
    <p>${title} view</p>
  </section>`;
}

function wireTestControls() {
  const sheetButton = document.querySelector('[data-test="open-sheet"]');
  const toastButton = document.querySelector('[data-test="show-toast"]');
  if (sheetButton) {
    sheetButton.addEventListener("click", () => openSheet("Component preview", `
      <p>This sheet becomes a right-side panel on desktop.</p>
      <label class="test-field">Example field<input type="text" placeholder="Try typing here"></label>
      <button class="btn btn-primary" type="button">Example action</button>
    `));
  }
  if (toastButton) {
    toastButton.addEventListener("click", () => toast("Demo change applied", {
      actionLabel: "Undo",
      onAction: () => toast("Demo change undone")
    }));
  }
}

// Rebuild the shell when the route changes and mark the current destination.
function render() {
  window.state.route = normalizeRoute(window.location.hash);
  const route = window.state.route;
  updateDocumentTitle(route);
  const app = document.getElementById("app");
  if (!app) return;

  window.DashboardCharts?.destroyAll();

  const nav = NAV_ITEMS.map((item) => navLink(item, route)).join("");
  app.innerHTML = `<div class="app-shell">
    <aside class="sidebar" aria-label="Main navigation">
      <a class="brand-lockup" href="#/chat" aria-label="Astera Studio home"><span class="brand-mark"><img src="logo/astera_software_logo.jpg" width="200" height="200" alt=""></span><span class="brand-logo-chip"><img class="brand-wordmark" src="logo/image.png" width="253" height="69" alt=""></span><span class="brand-name">Studio</span></a>
      <nav class="sidebar-nav" aria-label="Main">${nav}</nav>
      <section class="pipeline-list" aria-label="Your pipelines">
        <h2 class="pipeline-heading">Your pipelines</h2>
        ${pipelineLinks(route)}
      </section>
    </aside>
    <div class="workspace">
      <header class="topbar"><a class="brand-lockup topbar-brand-lockup" href="#/chat" aria-label="Astera Studio home"><span class="brand-logo-chip"><img class="brand-wordmark" src="logo/image.png" width="253" height="69" alt=""></span><span class="brand-name">Studio</span></a><span class="topbar-context">Northwind Retail</span></header>
      <main class="main-content" id="main-content">${renderMainView(route)}</main>
    </div>
    <nav class="bottom-nav" aria-label="Main navigation">${nav}</nav>
    <div id="draft-bar-root" aria-live="polite"></div>
  </div>`;
  wireTestControls();
  window.PipelineViews.wire(document.getElementById("main-content"));
  if (route === "#/dashboard") {
    wireDashboardFilters();
    wireChartActions(document.getElementById("main-content"), false);
    window.DashboardCharts?.render();
    window.DashboardCharts?.renderPinnedCharts();
    document.querySelectorAll("[data-unpin]").forEach((button) => button.addEventListener("click", () => setPinned(button.dataset.unpin, false)));
    wirePipelineRerunButtons(document.getElementById("main-content"));
  }
  if (route === "#/chat") {
    installChatKeyboardTracking();
    wireChatView();
    window.DashboardCharts?.renderChatCharts();
    updateChatKeyboardInset();
  }
  window.renderDraftBar?.();
}

// Pipeline run progress can redraw the current route without changing the hash.
window.renderApp = render;

// Hash changes support browser back and forward navigation.
window.addEventListener("hashchange", render);
window.addEventListener("DOMContentLoaded", render);

// Render immediately when this classic script runs after the app container.
render();

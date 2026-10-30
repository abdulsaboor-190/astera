// Pipeline screens, draft editing, and the responsive canvas live in this file.
(function () {
  const escapeHtml = (value) => String(value ?? "")
    .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;").replaceAll("'", "&#39;");
  const basePipeline = (id) => window.DATA.pipelines.find((pipeline) => pipeline.id === id);
  const findPipeline = (id) => {
    const base = basePipeline(id);
    if (!base) return null;
    const override = window.state.pipelineOverrides[id] || {};
    return {
      ...base,
      ...override,
      steps: base.steps.map((step) => ({ ...step, ...(override.steps?.[step.id] || {}) }))
    };
  };

  // All screens can ask this helper for the current effective status.
  window.getPipelineStatus = function getPipelineStatus(id) {
    return window.state.pipelineOverrides[id]?.status || basePipeline(id)?.status || "Scheduled";
  };
  const selectedCanvasSteps = {};
  const selectedPipelineViews = {};
  const icon = {
    lock: '<svg class="lock-icon" viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>',
    filter: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16M7 12h10m-7 7h4"/></svg>',
    join: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5v5a4 4 0 0 0 4 4h6a4 4 0 0 1 4 4v1M19 5v1a4 4 0 0 1-4 4H9a4 4 0 0 0-4 4v5"/></svg>',
    transform: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M7 12h10m-7 6h4"/><circle cx="8" cy="6" r="2"/><circle cx="15" cy="12" r="2"/></svg>',
    sort: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4v16m0 0-3-3m3 3 3-3M17 20V4m0 0-3 3m3-3 3 3"/></svg>',
    read: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v17H6.5A2.5 2.5 0 0 0 4 22zM4 5.5v14A2.5 2.5 0 0 1 6.5 17H20"/></svg>',
    database: '<svg viewBox="0 0 24 24" aria-hidden="true"><ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/></svg>',
    publish: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 16V4m-5 5 5-5 5 5M4 14v6h16v-6"/></svg>',
    close: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg>'
  };

  // Draft changes stay separate from the live mock data until Apply is added.
  window.addDraft = function addDraft(change) {
    window.state.draft.push(change);
    window.renderDraftBar?.();
    return window.state.draft;
  };
  window.discardDraft = function discardDraft() {
    window.state.draft = [];
    window.renderDraftBar?.();
    return window.state.draft;
  };
  window.getDraft = function getDraft() {
    return window.state.draft;
  };

  function latestDraftValue(pipelineId, stepId, key, fallback) {
    const changes = window.getDraft().filter((change) =>
      change.pipelineId === pipelineId && change.stepId === stepId && change.key === key
    );
    return changes.length ? changes[changes.length - 1].newValue : fallback;
  }

  // Apply saved reorder changes to a copy so DATA remains untouched.
  function orderedSteps(pipeline) {
    const steps = pipeline.steps.slice();
    window.getDraft().filter((change) => change.pipelineId === pipeline.id && change.key === "order")
      .forEach((change) => {
        const index = steps.findIndex((step) => step.id === change.stepId);
        if (index < 0) return;
        const [step] = steps.splice(index, 1);
        steps.splice(Math.max(0, Math.min(Number(change.newValue), steps.length)), 0, step);
      });
    return steps;
  }

  function formatRows(value) {
    return Number(value || 0).toLocaleString("en-US").replaceAll(",", " ");
  }

  function draftAddedMessage(count) {
    return `${count} ${count === 1 ? "change" : "changes"} added to the draft.`;
  }

  function feedNames(pipeline) {
    return (pipeline.feeds || []).map((feedId) => {
      const kpi = window.DATA.kpis.find((item) => item.id === feedId);
      return kpi ? kpi.label : feedId.replaceAll("-", " ");
    });
  }

  function renderList() {
    const cards = window.DATA.pipelines.map((source) => {
      const pipeline = findPipeline(source.id);
      return `<a class="pipeline-card card${pipeline.status === "Failed" ? " pipeline-card-failed" : ""}" href="#/pipeline/${escapeHtml(pipeline.id)}">
      <span class="pipeline-card-heading"><strong>${escapeHtml(pipeline.name)}</strong>${window.UI.statusBadge(pipeline.status)}</span>
      <span class="pipeline-card-meta"><span class="pipeline-card-label">Last run</span>${escapeHtml(pipeline.lastRun)}</span>
      <span class="pipeline-card-meta"><span class="pipeline-card-label">Feeds</span>${feedNames(pipeline).map(escapeHtml).join(", ") || "Nothing yet"}</span>
      <span class="pipeline-card-people"><span>Owner: ${escapeHtml(pipeline.owner || "Northwind data team")}</span><span>Edited by ${escapeHtml(pipeline.lastEditedBy || "Northwind data team")} · ${escapeHtml(pipeline.lastEditedAt || "Recently")}</span></span>
      <span class="pipeline-card-open" aria-hidden="true">Open pipeline <span>→</span></span>
    </a>`;
    }).join("");
    return `<section class="pipeline-list-view" aria-labelledby="pipeline-list-title">
      <header class="page-header pipeline-list-header"><p class="page-eyebrow">Northwind Retail · Q3</p><h2 id="pipeline-list-title">Pipelines</h2><span class="page-header-accent" aria-hidden="true"></span><p class="page-subtitle">Four pipelines · one needs attention.</p></header>
      <div class="pipeline-card-grid">${cards}</div>
    </section>`;
  }

  function stepStatus(status) {
    if (status === "Skipped") return '<span class="status-badge status-skipped" role="status" aria-label="Status: Skipped"><span aria-hidden="true">—</span><span>Skipped</span></span>';
    return window.UI.statusBadge(status);
  }

  function typeLabel(type) {
    return String(type || "step").replaceAll("-", " ").replace(/^./, (letter) => letter.toUpperCase());
  }

  // Inspector labels turn parameter keys into readable field names.
  function fieldLabel(key) {
    const labels = { rowsIn: "Rows in", rowsOut: "Rows out", groupBy: "Group by", includeStatus: "Include status", regionCode: "Region code", stepName: "Step name" };
    return labels[key] || String(key || "field")
      .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
      .replaceAll("-", " ").replaceAll("_", " ")
      .replace(/^./, (letter) => letter.toUpperCase());
  }

  function stepLabel(pipeline, step) {
    return latestDraftValue(pipeline.id, step.id, "stepName",
      latestDraftValue(pipeline.id, step.id, "label", step.label));
  }


  function nodeIcon(type) {
    if (type.includes("database")) return icon.database;
    if (type.includes("excel")) return icon.read;
    if (type.includes("filter")) return icon.filter;
    if (type.includes("join")) return icon.join;
    if (type.includes("transform")) return icon.transform;
    if (type.includes("sort")) return icon.sort;
    if (type.includes("publish")) return icon.publish;
    return icon.read;
  }

  function renderDataPreview(step, pipeline) {
    const samples = step.type.includes("join")
      ? [["North", "NW-N", "Q3 target", "Matched"], ["East", "NW-E", "Q3 target", "Matched"], ["South", "NW-S", "Q3 target", "Matched"], ["West", "NW-W", "Q3 target", "Matched"], ["Central", "NW-C", "No target", "Review"]]
      : step.type.includes("transform")
        ? [["North", "$1,350K", "Q3", "1,240"], ["East", "$1,260K", "Q3", "1,110"], ["South", "$1,130K", "Q3", "980"], ["West", "$1,080K", "Q3", "940"], ["Central", "$420K", "Q3", "380"]]
        : step.type.includes("filter")
          ? [["NW-1042", "Q3", "Complete", "Included"], ["NW-1043", "Q3", "Complete", "Included"], ["NW-1044", "Q2", "Complete", "Filtered"], ["NW-1045", "Q3", "Pending", "Filtered"], ["NW-1046", "Q3", "Complete", "Included"]]
          : [["NW-1001", "North", "$245.00", "Q3"], ["NW-1002", "East", "$318.50", "Q3"], ["NW-1003", "South", "$187.00", "Q3"], ["NW-1004", "West", "$422.00", "Q3"], ["NW-1005", "North", "$279.00", "Q3"]];
    const columns = step.type.includes("join") ? ["Region", "Region code", "Target source", "Join result"]
      : step.type.includes("transform") ? ["Region", "Sales", "Period", "Orders"]
        : step.type.includes("filter") ? ["Order", "Quarter", "Status", "Filter result"]
          : ["Order", "Region", "Order value", "Period"];
    return `<section class="canvas-data-preview" aria-label="Sample data preview"><div class="canvas-data-heading"><div><h3>Data preview</h3><p>Five sample rows for ${escapeHtml(stepLabel(pipeline, step))}</p></div><span>Sample data</span></div>
      <div class="canvas-table-scroll"><table><thead><tr>${columns.map((name) => `<th scope="col">${name}</th>`).join("")}</tr></thead><tbody>${samples.map((row) => `<tr>${row.map((value) => `<td>${escapeHtml(value)}</td>`).join("")}</tr>`).join("")}</tbody></table></div></section>`;
  }

  function canvasNode(step, x, y, activeId, pipelineId, extra = {}) {
    const selected = step.id === activeId;
    return `<button class="canvas-node${selected ? " is-selected" : ""}${extra.draft ? " is-draft-node" : ""}${extra.input ? " is-input-node" : ""}${extra.feed ? " is-feed-step" : ""}" type="button"${extra.readOnly ? " disabled" : ""} data-canvas-step="${escapeHtml(step.id)}" data-canvas-pipeline="${escapeHtml(pipelineId)}" aria-pressed="${selected}" style="left:${x}px;top:${y}px">
      ${selected ? '<span class="canvas-selected-label">Selected</span>' : ""}
      <span class="canvas-node-title"><span class="canvas-node-icon">${nodeIcon(step.type)}</span><strong>${escapeHtml(stepLabel(findPipeline(pipelineId), step))}</strong></span>
      <span class="canvas-node-meta">${stepStatus(step.status)}</span>
      ${extra.input ? `<span class="canvas-node-rows">${formatRows(step.rowsOut)} rows</span>` : `<span class="canvas-node-number">${extra.draft ? "Draft step" : `Step ${extra.number}`}</span>`}
    </button>`;
  }

  function canvasContent(pipeline, provenance = false) {
    const steps = orderedSteps(pipeline);
    const draftNodes = window.getDraft().filter((change) => change.pipelineId === pipeline.id && change.key === "addStep").map((change) => change.newValue);
    const nodes = [...steps, ...draftNodes];
    const activeId = selectedCanvasSteps[pipeline.id] || nodes[0]?.id;
    const width = Math.max(500, 40 + nodes.length * 232 + 40);
    const height = 350;
    const positions = new Map(nodes.map((step, index) => [step.id, { x: 40 + index * 232, y: 64 }]));
    const extraNodes = [];
    steps.forEach((step) => (step.params?.extraInputs || []).forEach((input, index) => {
      const name = input.label.replace(/^Read database:\s*/i, "");
      const source = { id: `input-${step.id}-${index}`, pipelineId: pipeline.id, type: input.type || "read-database", label: name,
        plain: `Read ${formatRows(input.rows)} rows from ${name}.`, rowsIn: 0, rowsOut: input.rows, status: "Succeeded", error: "",
        params: { database: name, rows: input.rows }, editable: [] };
      const target = positions.get(step.id);
      extraNodes.push({ step: source, target, y: 232 + index * 8 });
    }));
    let paths = "";
    for (let index = 0; index < nodes.length - 1; index += 1) {
      const from = positions.get(nodes[index].id);
      const to = positions.get(nodes[index + 1].id);
      paths += `<path d="M ${from.x + 168} ${from.y + 48} H ${to.x}"/>`;
    }
    extraNodes.forEach(({ target, y }) => { paths += `<path class="canvas-input-line" marker-end="url(#canvas-arrow-${escapeHtml(pipeline.id)})" d="M ${target.x + 84} ${y} V ${target.y + 112}"/>`; });
    const stepNodes = nodes.map((step, index) => canvasNode(step, positions.get(step.id).x, 64, activeId, pipeline.id, { number: index + 1, draft: draftNodes.some((item) => item.id === step.id), feed: provenance, readOnly: provenance })).join("");
    const inputMarkup = extraNodes.map(({ step, target, y }) => canvasNode(step, target.x, y, activeId, pipeline.id, { input: true, feed: provenance, readOnly: provenance })).join("");
    const arrowId = `canvas-arrow-${pipeline.id}`;
    const toolbar = provenance
      ? `<div class="canvas-toolbar"><strong>Steps feeding this chart</strong></div>`
      : `<div class="canvas-toolbar"><span>Pipeline canvas</span><div class="canvas-zoom-controls" aria-label="Canvas zoom controls">
      <button class="btn btn-secondary" type="button" data-zoom="out" aria-label="Zoom out">−</button><button class="btn btn-secondary" type="button" data-zoom="in" aria-label="Zoom in">+</button><button class="btn btn-secondary canvas-fit" type="button" data-zoom="fit">Fit</button></div>
      <span class="tablet-canvas-note">Add or rewire steps on desktop</span>
      <div class="add-step-menu-wrap"><button class="btn btn-secondary" type="button" data-add-menu aria-expanded="false">＋ Add step</button><div class="add-step-menu" role="menu" hidden>${["Filter", "Join", "Transform", "Sort"].map((type) => `<button type="button" role="menuitem" data-add-step="${type}">${nodeIcon(type.toLowerCase())}<span>${type}</span></button>`).join("")}</div></div></div>`;
    return `<div class="canvas-column${provenance ? " provenance-canvas-column" : ""}">${toolbar}
      <div class="canvas-viewport" aria-label="Pannable pipeline canvas" tabindex="0"><div class="canvas-world" style="width:${width}px;height:${height}px"><svg class="canvas-connectors" viewBox="0 0 ${width} ${height}" aria-hidden="true"><defs><marker id="${escapeHtml(arrowId)}" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L6,3 z"/></marker></defs>${paths}</svg>${stepNodes}${inputMarkup}</div></div>
      ${provenance ? "" : '<p class="canvas-hint">Drag to move around · Pinch or use the zoom controls</p>'}</div>`;
  }

  function renderCanvasMode(pipeline, activeStepId) {
    const step = findCanvasStep(pipeline, activeStepId) || orderedSteps(pipeline)[0];
    if (!step) return '<div class="canvas-empty">There are no steps here yet. Add the first one when you are ready.</div>';
    return `<div class="canvas-layout">${canvasContent(pipeline)}<aside class="canvas-inspector" aria-label="Selected step inspector">${renderInspector(pipeline, step)}</aside><div class="canvas-preview-slot">${renderDataPreview(step, pipeline)}</div></div>`;
  }

  function renderStepTimeline(pipeline) {
    const steps = orderedSteps(pipeline);
    const items = steps.map((step, index) => `<li class="pipeline-step${step.status === "Failed" ? " is-failed" : ""}${step.status === "Skipped" ? " is-skipped" : ""}${index === steps.length - 1 ? " is-last" : ""}">
      <span class="step-number" aria-hidden="true">${index + 1}</span><button class="step-card" type="button" data-pipeline-id="${escapeHtml(pipeline.id)}" data-step-id="${escapeHtml(step.id)}" aria-label="Open step ${index + 1}: ${escapeHtml(stepLabel(pipeline, step))}, ${escapeHtml(step.status)}">
      <span class="step-card-heading"><strong>${escapeHtml(stepLabel(pipeline, step))}</strong>${stepStatus(step.status)}</span><span class="step-description">${escapeHtml(step.plain)}</span>
      <span class="step-row-counts"><span>Rows</span><strong>${formatRows(step.rowsIn)} <span aria-hidden="true">→</span> ${formatRows(step.rowsOut)}</strong></span>
      ${step.status === "Failed" && step.error ? `<span class="step-error"><strong>Run stopped</strong>${escapeHtml(step.error)}</span>` : ""}
      ${(step.params?.extraInputs || []).map((input) => `<span class="step-extra-input"><strong>Also reads:</strong> ${escapeHtml(input.label.replace(/^Read database:\s*/i, ""))} (${formatRows(input.rows)} rows)</span>`).join("")}</button>
      ${step.status === "Failed" ? `<div class="failed-step-actions">${pipeline.humanNote ? `<p class="step-human-note">${escapeHtml(pipeline.humanNote)}</p>` : ""}<p>Orders DB now uses “region_id”. Update this step’s key, then run it again.</p><button class="btn btn-secondary" type="button" data-rerun-from="${escapeHtml(step.id)}" data-pipeline-id="${escapeHtml(pipeline.id)}">Run again from this step</button></div>` : ""}</li>`).join("");
    return `<div class="pipeline-step-section"><div class="pipeline-step-heading"><h3>Pipeline steps</h3><p>Choose a step to see its inputs and output.</p></div><ol class="pipeline-timeline">${items}</ol><p class="pipeline-structure-note"><span aria-hidden="true">ⓘ</span> Add or rewire steps on desktop</p></div>`;
  }

  function renderDetail(id) {
    const pipeline = findPipeline(id);
    if (!pipeline) return `<section class="card pipeline-not-found"><h2>Pipeline not found</h2><p>I couldn’t find that pipeline in this Northwind workspace.</p><a class="btn btn-secondary" href="#/pipelines">Back to pipelines</a></section>`;
    const steps = orderedSteps(pipeline);
    const failureIndex = steps.findIndex((step) => step.status === "Failed");
    const rerun = failureIndex >= 0 ? `Re-run from step ${failureIndex + 1}` : "Re-run";
    const currentView = selectedPipelineViews[pipeline.id] || "canvas";
    if (!findCanvasStep(pipeline, selectedCanvasSteps[pipeline.id])) selectedCanvasSteps[pipeline.id] = steps[0]?.id;
    return `<section class="pipeline-detail" data-pipeline-id="${escapeHtml(pipeline.id)}" data-view="${currentView}" aria-labelledby="pipeline-detail-title">
      <header class="pipeline-detail-header"><a class="btn btn-secondary pipeline-back" href="#/pipelines"><span aria-hidden="true">←</span><span>Back</span></a>
        <div class="pipeline-detail-title-row"><div class="page-header"><p class="page-eyebrow">Northwind Retail · Q3 pipeline</p><h2 id="pipeline-detail-title">${escapeHtml(pipeline.name)}</h2><span class="page-header-accent" aria-hidden="true"></span><p class="page-subtitle pipeline-support-line">${window.UI.statusBadge(pipeline.status)}<span>Owner: ${escapeHtml(pipeline.owner || "Northwind data team")}</span><span>Last run · ${escapeHtml(pipeline.lastRun)}</span></p><p class="pipeline-edited-line">Edited by ${escapeHtml(pipeline.lastEditedBy || "Northwind data team")} · ${escapeHtml(pipeline.lastEditedAt || "Recently")}</p></div></div>
        <button class="btn btn-primary pipeline-rerun" type="button" data-rerun-pipeline="${escapeHtml(pipeline.id)}"${pipeline.status === "Running" ? " disabled" : ""}>${rerun}</button></header>
      <p class="draft-empty-state" role="status"${window.getDraft().length ? " hidden" : ""}>No draft changes. You’re viewing the saved pipeline.</p>
      <div class="pipeline-view-toggle" role="group" aria-label="Pipeline view"><button class="${currentView === "list" ? "is-active" : ""}" type="button" data-pipeline-view="list" aria-pressed="${currentView === "list"}">List</button><button class="${currentView === "canvas" ? "is-active" : ""}" type="button" data-pipeline-view="canvas" aria-pressed="${currentView === "canvas"}">Canvas</button></div>
      <div class="list-mode">${renderStepTimeline(pipeline)}</div><div class="canvas-mode">${renderCanvasMode(pipeline, selectedCanvasSteps[pipeline.id])}</div>
    </section>`;
  }

  function findCanvasStep(pipeline, stepId) {
    if (!pipeline || !stepId) return null;
    const base = orderedSteps(pipeline).find((step) => step.id === stepId);
    if (base) return base;
    const added = window.getDraft().find((change) => change.pipelineId === pipeline.id && change.key === "addStep" && change.stepId === stepId);
    if (added) return added.newValue;
    for (const step of pipeline.steps) {
      const inputs = step.params?.extraInputs || [];
      const index = inputs.findIndex((input, position) => `input-${step.id}-${position}` === stepId);
      if (index >= 0) {
        const input = inputs[index];
        const name = input.label.replace(/^Read database:\s*/i, "");
        return { id: stepId, pipelineId: pipeline.id, type: input.type || "read-database", label: name,
          plain: `Read ${formatRows(input.rows)} rows from ${name}.`, rowsIn: 0, rowsOut: input.rows,
          status: "Succeeded", error: "", params: { database: name, rows: input.rows }, editable: [] };
      }
    }
    return null;
  }

  function renderInspector(pipeline, step) {
    const steps = orderedSteps(pipeline);
    const index = steps.findIndex((item) => item.id === step.id);
    const editable = new Set(step.editable || []);
    const pseudo = ["label", "stepName", "schedule", "enabled"].filter((key) => editable.has(key));
    const editKeys = [...Object.keys(step.params || {}).filter((key) => editable.has(key)), ...pseudo]
      .filter((key, position, all) => all.indexOf(key) === position);
    const locked = Object.entries(step.params || {}).filter(([key]) => !editable.has(key));
    const fields = editKeys.length ? editKeys.map((key) => editableControl(pipeline, step, key)).join("") : '<p class="inspector-no-edits">This step has no safe settings to change here.</p>';
    const lockedHtml = locked.length ? `<section class="inspector-structure"><h4>Read-only details</h4>${locked.map(([key, value]) => readonlyParam(key, value)).join("")}</section>` : "";
    const order = index < 0 ? "" : `<section class="inspector-move"><h3>Step order</h3><div class="inspector-move-buttons"><button class="btn btn-secondary" type="button" data-move-step="up"${index === 0 ? " disabled" : ""}>Move up</button><button class="btn btn-secondary" type="button" data-move-step="down"${index === steps.length - 1 ? " disabled" : ""}>Move down</button></div></section>`;
    return `<div class="step-inspector" data-inspector-pipeline="${escapeHtml(pipeline.id)}" data-inspector-step="${escapeHtml(step.id)}" data-start-index="${index}">
      <div class="inspector-summary"><div class="inspector-type">${escapeHtml(typeLabel(step.type))}</div>${stepStatus(step.status)}<p>${escapeHtml(step.plain)}</p>
        <div class="inspector-row-counts"><span>Rows in <strong>${formatRows(step.rowsIn)}</strong></span><span aria-hidden="true">→</span><span>Rows out <strong>${formatRows(step.rowsOut)}</strong></span></div>${step.error ? `<div class="step-error"><strong>Run stopped</strong>${escapeHtml(step.error)}</div>` : ""}
        ${step.status === "Failed" ? `<div class="inspector-failure-actions">${pipeline.humanNote ? `<p class="step-human-note">${escapeHtml(pipeline.humanNote)}</p>` : ""}<p>Orders DB now uses “region_id”. Update this step’s key, then run it again.</p><button class="btn btn-secondary" type="button" data-rerun-from="${escapeHtml(step.id)}" data-pipeline-id="${escapeHtml(pipeline.id)}">Run again from this step</button></div>` : ""}
      </div><section class="inspector-edit-section"><h3>Edit</h3>${fields}</section>${lockedHtml}${order}
      <div class="inspector-actions"><button class="btn btn-ghost" type="button" data-inspector-cancel>Cancel</button><button class="btn btn-primary" type="button" data-inspector-save>Save changes</button></div></div>`;
  }

  function editableControl(pipeline, step, key) {
    const value = draftValue(pipeline, step, key);
    const label = escapeHtml(fieldLabel(key));
    if (typeof value === "boolean" || key === "enabled") return `<label class="inspector-toggle"><span><strong>${label}</strong><small>Turn this step on or off</small></span><input type="checkbox" data-edit-key="${escapeHtml(key)}"${value ? " checked" : ""}><span class="toggle-control" aria-hidden="true"></span></label>`;
    const options = selectOptions(key, value);
    if (options.length > 1) return `<label class="inspector-field"><span>${label}</span><select data-edit-key="${escapeHtml(key)}">${options.map((option) => `<option value="${escapeHtml(option)}"${option === value ? " selected" : ""}>${escapeHtml(option)}</option>`).join("")}</select></label>`;
    return `<label class="inspector-field"><span>${label}</span><input type="text" data-edit-key="${escapeHtml(key)}" value="${escapeHtml(value)}"></label>`;
  }

  function readonlyParam(key, value) {
    const display = Array.isArray(value) ? value.join(", ") : value && typeof value === "object" ? JSON.stringify(value, null, 2) : typeof value === "boolean" ? (value ? "Enabled" : "Disabled") : String(value ?? "—");
    return `<div class="inspector-readonly"><div class="inspector-readonly-value"><span>${escapeHtml(fieldLabel(key))}</span><strong>${escapeHtml(display)}</strong></div><span class="inspector-lock-note">${icon.lock}<span>Structure changes are desktop-only</span></span></div>`;
  }

  function draftValue(pipeline, step, key) {
    let base = key === "label" || key === "stepName" ? step.label : key === "schedule" ? pipeline.schedule : key === "enabled" ? (step.params?.enabled ?? true) : step.params?.[key];
    return latestDraftValue(pipeline.id, step.id, key, base);
  }

  function selectOptions(key, value) {
    const options = { value: ["Q1", "Q2", "Q3", "Q4"], quarter: ["Q1", "Q2", "Q3", "Q4"],
      includeStatus: ["complete", "all", "pending"], groupBy: ["day", "week", "month", "quarter", "region", "channel"],
      schedule: ["Every day at 04:00", "Every day at 05:00", "Every day at 06:00", "Tomorrow at 06:00"] };
    return Array.from(new Set([value, ...(options[key] || [])].filter((item) => item !== undefined && item !== null)));
  }

  // Shared binding records values only when the user chooses Save changes.
  function bindInspector(host, pipeline, step, onSaved) {
    const inspector = host.querySelector(".step-inspector");
    const rerunFromStep = inspector.querySelector("[data-rerun-from]");
    if (rerunFromStep) rerunFromStep.addEventListener("click", () => rerunPipeline(pipeline.id, step.id));
    const startIndex = Number(inspector.dataset.startIndex);
    let plannedIndex = startIndex;
    const up = inspector.querySelector('[data-move-step="up"]');
    const down = inspector.querySelector('[data-move-step="down"]');
    if (up && down) {
      const update = () => {
        up.disabled = plannedIndex <= 0;
        down.disabled = plannedIndex >= orderedSteps(pipeline).length - 1;
      };
      up.addEventListener("click", () => { plannedIndex -= 1; update(); });
      down.addEventListener("click", () => { plannedIndex += 1; update(); });
    }
    const cancel = inspector.querySelector("[data-inspector-cancel]");
    if (cancel) cancel.addEventListener("click", window.UI.closeSheet);
    inspector.querySelector("[data-inspector-save]").addEventListener("click", () => {
      let count = 0;
      inspector.querySelectorAll("[data-edit-key]").forEach((control) => {
        const key = control.dataset.editKey;
        const oldValue = draftValue(pipeline, step, key);
        const newValue = control.type === "checkbox" ? control.checked : control.value;
        if (newValue !== oldValue) {
          window.addDraft({ pipelineId: pipeline.id, stepId: step.id, key, oldValue, newValue });
          count += 1;
        }
      });
      if (plannedIndex !== startIndex) {
        window.addDraft({ pipelineId: pipeline.id, stepId: step.id, key: "order", oldValue: startIndex, newValue: plannedIndex });
        count += 1;
      }
      onSaved(count);
    });
  }

  // Store run progress outside DATA so it survives route changes.
  function setPipelineOverride(pipelineId, update) {
    const current = window.state.pipelineOverrides[pipelineId] || {};
    window.state.pipelineOverrides[pipelineId] = {
      ...current,
      ...update,
      steps: { ...(current.steps || {}), ...(update.steps || {}) }
    };
    window.renderApp?.();
  }

  function rerunPipeline(pipelineId, stepId) {
    const pipeline = findPipeline(pipelineId);
    if (!pipeline || pipeline.status === "Running") return;
    const runSteps = orderedSteps(pipeline);
    const startIndex = Math.max(0, runSteps.findIndex((step) => step.id === stepId));
    const work = runSteps.slice(startIndex);
    if (!work.length) return;

    // Mark the failed step as running immediately, then finish downstream steps in order.
    const runningStep = work[0];
    window.UI.closeSheet();
    setPipelineOverride(pipelineId, {
      status: "Running",
      steps: { [runningStep.id]: { status: "Running" } }
    });

    const outputRows = {
      "targets-join": { rowsIn: 1050, rowsOut: 9800 },
      "targets-transform": { rowsIn: 9800, rowsOut: 4 },
      "targets-publish": { rowsIn: 4, rowsOut: 4 }
    };

    work.forEach((step, index) => {
      window.setTimeout(() => {
        const rowCounts = outputRows[step.id] || { rowsIn: step.rowsIn || 0, rowsOut: step.rowsOut || 1 };
        setPipelineOverride(pipelineId, {
          steps: { [step.id]: { status: "Succeeded", error: "", ...rowCounts } }
        });
      }, 700 + index * 700);
    });

    window.setTimeout(() => {
      const completedUpdate = { status: "Succeeded", lastRun: "just now" };
      if (pipelineId === "regional-targets") {
        // Keep Q3 revenue at $4.82M while refreshing regional targets to 92% overall.
        completedUpdate.attainmentByFilter = { q3: {
          all: { value: "92%", delta: "−2.0 pts" },
          north: { value: "104%", delta: "+4 pts" },
          east: { value: "100%", delta: "0 pts" },
          south: { value: "87%", delta: "−13 pts" },
          west: { value: "78%", delta: "−22 pts" }
        } };
        completedUpdate.chatSummary = "Q3 revenue remains $4.82 M. North and East met target; South (87%) and West (78%) remained below. Overall target attainment is 92%.";
        completedUpdate.regionData = { q3: {
          north: { sales: 1350, target: 1300 },
          east: { sales: 1260, target: 1260 },
          south: { sales: 1130, target: 1300 },
          west: { sales: 1080, target: 1380 }
        } };
      }
      setPipelineOverride(pipelineId, completedUpdate);
      window.UI.toast(pipelineId === "regional-targets"
        ? "Regional Targets ran successfully. Target attainment is now 92%."
        : `${pipeline.name} ran successfully. Its data is current.`);
    }, 3000);
  }
  window.rerunPipeline = rerunPipeline;

  function saveFromSheet(count, pipeline, step) {
    window.UI.closeSheet();
    if (!count) return;
    const main = document.getElementById("main-content");
    if (main) {
      main.innerHTML = renderDetail(pipeline.id);
      if (window.matchMedia("(min-width: 640px)").matches) wireCanvas(main);
      const stepButton = Array.from(main.querySelectorAll("[data-step-id]"))
        .find((button) => button.dataset.stepId === step.id);
      if (stepButton) stepButton.focus();
    }
    window.UI.toast(draftAddedMessage(window.getDraft().length));
  }

  function openStep(pipelineId, stepId) {
    const pipeline = findPipeline(pipelineId);
    const step = pipeline && findCanvasStep(pipeline, stepId);
    if (!pipeline || !step) return;
    window.UI.openSheet(`${escapeHtml(stepLabel(pipeline, step))} settings`, renderInspector(pipeline, step));
    const sheet = document.querySelector(".sheet-panel");
    if (sheet) bindInspector(sheet, pipeline, step, (count) => saveFromSheet(count, pipeline, step));
  }
  window.openStep = openStep;

  function updateSelectedCanvas(container, pipelineId, stepId) {
    const pipeline = findPipeline(pipelineId);
    const step = pipeline && findCanvasStep(pipeline, stepId);
    if (!pipeline || !step) return;
    selectedCanvasSteps[pipelineId] = stepId;
    container.querySelectorAll("[data-canvas-step]").forEach((node) => {
      const selected = node.dataset.canvasStep === stepId;
      node.classList.toggle("is-selected", selected);
      node.setAttribute("aria-pressed", String(selected));
      let badge = node.querySelector(".canvas-selected-label");
      if (selected && !badge) {
        badge = document.createElement("span");
        badge.className = "canvas-selected-label";
        badge.textContent = "Selected";
        node.prepend(badge);
      } else if (!selected && badge) badge.remove();
    });
    const inspector = container.querySelector(".canvas-inspector");
    if (inspector) {
      inspector.innerHTML = renderInspector(pipeline, step);
      bindInspector(inspector, pipeline, step, (count) => saveFromCanvas(count, pipeline, step, container));
    }
    const preview = container.querySelector(".canvas-preview-slot");
    if (preview) preview.innerHTML = renderDataPreview(step);
  }

  function saveFromCanvas(count, pipeline, step, container) {
    if (!count) return;
    container.innerHTML = renderDetail(pipeline.id);
    wireCanvas(container);
    const newInspector = container.querySelector(".canvas-inspector");
    if (newInspector) {
      const updatedStep = findCanvasStep(pipeline, selectedCanvasSteps[pipeline.id] || step.id);
      if (updatedStep) bindInspector(newInspector, pipeline, updatedStep, (nextCount) => saveFromCanvas(nextCount, pipeline, updatedStep, container));
    }
    window.UI.toast(draftAddedMessage(window.getDraft().length));
  }

  function wireCanvas(container) {
    const viewport = container.querySelector(".canvas-viewport");
    if (!viewport) return;
    const world = viewport.querySelector(".canvas-world");
    const pointers = new Map();
    const view = { x: 12, y: 12, scale: 0.82, dragging: false, moved: false, startX: 0, startY: 0, baseX: 0, baseY: 0, pinch: null, suppressClick: false };
    const apply = () => { world.style.transform = `translate(${view.x}px, ${view.y}px) scale(${view.scale})`; };
    const fit = () => {
      const margin = 24;
      const scale = Math.min((viewport.clientWidth - margin * 2) / world.offsetWidth, (viewport.clientHeight - margin * 2) / world.offsetHeight, 1);
      view.scale = Math.max(0.15, scale);
      view.x = (viewport.clientWidth - world.offsetWidth * view.scale) / 2;
      view.y = Math.max(8, (viewport.clientHeight - world.offsetHeight * view.scale) / 2);
      apply();
    };
    apply();
    requestAnimationFrame(fit);

    // Pointer Events use one pointer for panning and two for a centered pinch zoom.
    viewport.addEventListener("pointerdown", (event) => {
      if (event.pointerType === "mouse" && event.button !== 0) return;
      viewport.setPointerCapture(event.pointerId);
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      view.moved = false;
      if (pointers.size === 1) {
        view.dragging = true;
        view.startX = event.clientX;
        view.startY = event.clientY;
        view.baseX = view.x;
        view.baseY = view.y;
      } else if (pointers.size === 2) {
        const points = Array.from(pointers.values());
        const rect = viewport.getBoundingClientRect();
        const centerX = (points[0].x + points[1].x) / 2 - rect.left;
        const centerY = (points[0].y + points[1].y) / 2 - rect.top;
        view.pinch = { distance: Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y), scale: view.scale, worldX: (centerX - view.x) / view.scale, worldY: (centerY - view.y) / view.scale, centerX, centerY };
      }
    });
    viewport.addEventListener("pointermove", (event) => {
      if (!pointers.has(event.pointerId)) return;
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (pointers.size >= 2 && view.pinch) {
        const points = Array.from(pointers.values());
        const distance = Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
        const rect = viewport.getBoundingClientRect();
        const centerX = (points[0].x + points[1].x) / 2 - rect.left;
        const centerY = (points[0].y + points[1].y) / 2 - rect.top;
        view.scale = Math.max(0.15, Math.min(1.8, view.pinch.scale * distance / Math.max(1, view.pinch.distance)));
        view.x = centerX - view.pinch.worldX * view.scale;
        view.y = centerY - view.pinch.worldY * view.scale;
        view.moved = true;
      } else if (view.dragging) {
        const dx = event.clientX - view.startX;
        const dy = event.clientY - view.startY;
        if (Math.abs(dx) + Math.abs(dy) > 4) view.moved = true;
        view.x = view.baseX + dx;
        view.y = view.baseY + dy;
      }
      apply();
    });
    const endPointer = (event) => {
      if (!pointers.has(event.pointerId)) return;
      pointers.delete(event.pointerId);
      view.dragging = pointers.size === 1;
      view.pinch = null;
      if (view.moved) {
        view.suppressClick = true;
        window.setTimeout(() => { view.suppressClick = false; }, 0);
      }
    };
    viewport.addEventListener("pointerup", endPointer);
    viewport.addEventListener("pointercancel", endPointer);
    viewport.addEventListener("click", (event) => {
      if (view.suppressClick) { event.preventDefault(); event.stopImmediatePropagation(); view.suppressClick = false; }
    }, true);
    viewport.addEventListener("wheel", (event) => {
      event.preventDefault();
      view.scale = Math.max(0.15, Math.min(1.8, view.scale + (event.deltaY < 0 ? 0.08 : -0.08)));
      apply();
    }, { passive: false });
    container.querySelectorAll("[data-zoom]").forEach((button) => button.addEventListener("click", () => {
      if (button.dataset.zoom === "fit") fit();
      else view.scale = Math.max(0.15, Math.min(1.8, view.scale + (button.dataset.zoom === "in" ? 0.12 : -0.12)));
      apply();
    }));
  }

  function wire(container) {
    container.addEventListener("click", (event) => {
      const viewToggle = event.target.closest("[data-pipeline-view]");
      if (viewToggle) {
        const detail = container.querySelector(".pipeline-detail");
        detail.dataset.view = viewToggle.dataset.pipelineView;
        selectedPipelineViews[detail.dataset.pipelineId] = viewToggle.dataset.pipelineView;
        detail.querySelectorAll("[data-pipeline-view]").forEach((button) => {
          const active = button === viewToggle;
          button.classList.toggle("is-active", active);
          button.setAttribute("aria-pressed", String(active));
        });
        if (viewToggle.dataset.pipelineView === "canvas") {
          window.requestAnimationFrame(() => container.querySelector('[data-zoom="fit"]')?.click());
        }
        return;
      }
      const canvasNode = event.target.closest("[data-canvas-step]");
      if (canvasNode) {
        updateSelectedCanvas(container, canvasNode.dataset.canvasPipeline, canvasNode.dataset.canvasStep);
        return;
      }
      const stepButton = event.target.closest("[data-step-id]");
      if (stepButton) { window.openStep(stepButton.dataset.pipelineId, stepButton.dataset.stepId); return; }
      const rerunFrom = event.target.closest("[data-rerun-from]");
      if (rerunFrom) {
        rerunPipeline(rerunFrom.dataset.pipelineId, rerunFrom.dataset.rerunFrom);
        return;
      }
      const rerun = event.target.closest("[data-rerun-pipeline]");
      if (rerun) {
        const pipeline = findPipeline(rerun.dataset.rerunPipeline);
        const failedStep = orderedSteps(pipeline).find((step) => step.status === "Failed");
        rerunPipeline(pipeline.id, failedStep?.id || orderedSteps(pipeline)[0]?.id);
        return;
      }
      const menuToggle = event.target.closest("[data-add-menu]");
      if (menuToggle) {
        const menu = menuToggle.nextElementSibling;
        menu.hidden = !menu.hidden;
        menuToggle.setAttribute("aria-expanded", String(!menu.hidden));
        return;
      }
      const addButton = event.target.closest("[data-add-step]");
      if (addButton) {
        const detail = container.querySelector(".pipeline-detail");
        const pipelineId = detail.dataset.pipelineId;
        const type = addButton.dataset.addStep;
        const id = `draft-${type.toLowerCase()}-${Date.now()}`;
        const step = { id, pipelineId, type: type.toLowerCase(), label: type, plain: `New ${type.toLowerCase()} step. Configure this step in the inspector.`, rowsIn: 0, rowsOut: 0, status: "Scheduled", error: "", params: {}, editable: [] };
        window.addDraft({ pipelineId, stepId: id, key: "addStep", oldValue: null, newValue: step });
        selectedCanvasSteps[pipelineId] = id;
        container.innerHTML = renderDetail(pipelineId);
        wireCanvas(container);
        const newInspector = container.querySelector(".canvas-inspector");
        if (newInspector) bindInspector(newInspector, findPipeline(pipelineId), step, (count) => saveFromCanvas(count, findPipeline(pipelineId), step, container));
        window.UI.toast(`${type} step added to the draft. ${window.getDraft().length} changes are ready to review.`);
      }
    });
    if (window.matchMedia("(min-width: 640px)").matches) wireCanvas(container);
    const detail = container.querySelector(".pipeline-detail");
    const pipeline = detail && findPipeline(detail.dataset.pipelineId);
    const inspector = container.querySelector(".canvas-inspector");
    const step = pipeline && inspector && findCanvasStep(pipeline, selectedCanvasSteps[pipeline.id]);
    if (inspector && step) bindInspector(inspector, pipeline, step, (count) => saveFromCanvas(count, pipeline, step, container));
  }

  function draftValueLabel(value, key) {
    if (key === "order") return `Step ${Number(value) + 1}`;
    if (key === "addStep") return value ? `${value.label} node` : "Not added";
    if (value && typeof value === "object") return JSON.stringify(value);
    if (typeof value === "boolean") return value ? "On" : "Off";
    return String(value ?? "Empty");
  }

  function draftChangeDescription(change) {
    const pipeline = findPipeline(change.pipelineId);
    const step = pipeline && findCanvasStep(pipeline, change.stepId);
    if (change.key === "addStep") return `Add ${change.newValue.label} step`;
    if (change.key === "order") return `Move ${step ? stepLabel(pipeline, step) : "step"}`;
    return `${step ? stepLabel(pipeline, step) : "Pipeline"}: ${fieldLabel(change.key)}`;
  }

  function draftEffect(change) {
    if (change.pipelineId === "regional-targets" && change.stepId === "targets-join") {
      return "Join output: 9,800 → 7,400 rows";
    }
    if (change.key === "order") return "The step order changes in the pipeline preview.";
    if (change.key === "addStep") return "A new draft node is added to the canvas.";
    return "This setting will be used the next time the pipeline runs.";
  }

  function openDraftPreview() {
    const changes = window.getDraft();
    const items = changes.map((change) => `<li class="draft-preview-item"><div><strong>${escapeHtml(draftChangeDescription(change))}</strong>
      <p>${escapeHtml(draftValueLabel(change.oldValue, change.key))} <span aria-hidden="true">→</span> ${escapeHtml(draftValueLabel(change.newValue, change.key))}</p>
      <small>${escapeHtml(draftEffect(change))}</small></div></li>`).join("");
    window.UI.openSheet("Preview draft", `<div class="draft-preview"><p>Check these changes and their effect before applying them.</p><ol>${items}</ol></div>`);
  }

  function applyDraftChanges() {
    const changes = window.getDraft().slice();
    if (!changes.length) return;
    const snapshots = new Map();
    changes.forEach((change) => {
      const pipeline = basePipeline(change.pipelineId);
      if (pipeline && !snapshots.has(change.pipelineId)) {
        snapshots.set(change.pipelineId, JSON.parse(JSON.stringify(pipeline)));
      }
    });

    // Apply each draft item to the live mock data only after the user chooses Apply.
    changes.forEach((change) => {
      const pipeline = basePipeline(change.pipelineId);
      if (!pipeline) return;
      if (change.key === "addStep") {
        pipeline.steps.push(JSON.parse(JSON.stringify(change.newValue)));
        return;
      }
      if (change.key === "order") {
        const index = pipeline.steps.findIndex((step) => step.id === change.stepId);
        if (index >= 0) {
          const [step] = pipeline.steps.splice(index, 1);
          pipeline.steps.splice(Math.max(0, Math.min(Number(change.newValue), pipeline.steps.length)), 0, step);
        }
        return;
      }
      if (change.key === "schedule") {
        pipeline.schedule = change.newValue;
        return;
      }
      const step = pipeline.steps.find((item) => item.id === change.stepId);
      if (!step) return;
      if (change.key === "label" || change.key === "stepName") step.label = change.newValue;
      else {
        step.params = step.params || {};
        step.params[change.key] = change.newValue;
      }
    });

    window.discardDraft();
    window.renderApp?.();
    window.UI.toast("Draft changes applied.", {
      actionLabel: "Undo",
      onAction: () => {
        snapshots.forEach((snapshot, pipelineId) => {
          const index = window.DATA.pipelines.findIndex((item) => item.id === pipelineId);
          if (index >= 0) window.DATA.pipelines[index] = JSON.parse(JSON.stringify(snapshot));
        });
        window.renderApp?.();
        window.UI.toast("Draft changes undone.");
      }
    });
  }

  // The global draft bar is rebuilt after routes and draft edits.
  function renderDraftBar() {
    const root = document.getElementById("draft-bar-root");
    document.body.classList.toggle("has-draft", window.getDraft().length > 0);
    document.querySelectorAll(".draft-empty-state").forEach((note) => { note.hidden = window.getDraft().length > 0; });
    if (!root) return;
    const changes = window.getDraft();
    if (!changes.length) {
      root.innerHTML = "";
      return;
    }
    root.innerHTML = `<section class="draft-bar" aria-label="Unsaved pipeline changes"><strong>${changes.length} unsaved ${changes.length === 1 ? "change" : "changes"}</strong>
      <div class="draft-bar-actions"><button class="btn btn-ghost" type="button" data-draft-action="discard">Discard</button><button class="btn btn-secondary" type="button" data-draft-action="preview">Preview</button><button class="btn btn-primary" type="button" data-draft-action="apply">Apply</button></div></section>`;
    root.querySelector('[data-draft-action="preview"]').addEventListener("click", openDraftPreview);
    root.querySelector('[data-draft-action="apply"]').addEventListener("click", applyDraftChanges);
    root.querySelector('[data-draft-action="discard"]').addEventListener("click", () => {
      window.UI.openSheet("Discard draft changes", `<div class="draft-confirm"><p>Remove all ${changes.length} unsaved ${changes.length === 1 ? "change" : "changes"} from this draft?</p><div><button class="btn btn-ghost" type="button" data-discard-cancel>Keep editing</button><button class="btn btn-danger" type="button" data-discard-confirm>Discard changes</button></div></div>`);
      const sheet = document.querySelector(".sheet-panel");
      sheet.querySelector("[data-discard-cancel]").addEventListener("click", window.UI.closeSheet);
      sheet.querySelector("[data-discard-confirm]").addEventListener("click", () => {
        window.discardDraft();
        window.UI.closeSheet();
        window.UI.toast("Draft discarded. The saved pipeline is unchanged.");
      });
    });
  }

  window.renderDraftBar = renderDraftBar;

  // Chat provenance reads the same effective pipeline and step states as detail views.
  function getProvenance(pipelineId) {
    const pipeline = findPipeline(pipelineId);
    if (!pipeline) return null;
    return {
      id: pipeline.id,
      name: pipeline.name,
      status: window.getPipelineStatus(pipelineId),
      steps: pipeline.steps.map((step) => ({
        id: step.id,
        label: stepLabel(pipeline, step),
        status: step.status,
        rowsIn: step.rowsIn,
        rowsOut: step.rowsOut
      }))
    };
  }

  // The chart provenance side panel reuses the pipeline's live canvas and status overrides.
  function renderProvenancePanel(pipelineId) {
    const pipeline = findPipeline(pipelineId);
    if (!pipeline) return "";
    return `<div class="provenance-panel"><p class="provenance-panel-note">Highlighted nodes are the steps feeding this chart.</p>${canvasContent(pipeline, true)}<a class="btn btn-primary" href="#/pipeline/${escapeHtml(pipelineId)}">Open full pipeline</a></div>`;
  }

  function wireProvenancePanel(host) {
    const canvas = host?.querySelector(".provenance-canvas-column");
    if (canvas) wireCanvas(canvas);
  }

  window.PipelineViews = { renderList, renderDetail, wire, getProvenance, renderProvenancePanel, wireProvenancePanel };
})();

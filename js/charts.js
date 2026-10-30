// Dashboard charts are rendered from window.DATA with the local Chart.js build.
(function () {
  const charts = {};

  function hideChartSkeleton(chart) {
    chart.canvas?.parentElement?.querySelector(".chart-skeleton")?.setAttribute("hidden", "");
  }

  // Keep the original dataset so each selected view can be rebuilt consistently.
  function registerChart(id, chart) {
    charts[id] = chart;
    chart.$asteraBase = {
      type: chart.config.type,
      indexAxis: chart.options.indexAxis,
      labels: [...chart.data.labels],
      scales: Object.fromEntries(Object.entries(chart.options.scales || {}).map(([axis, scale]) => [axis, { ...scale, ticks: { ...(scale.ticks || {}) } }])),
      datasets: chart.data.datasets.map((dataset) => ({ ...dataset, data: [...dataset.data] }))
    };
    const saved = window.state.chartChanges?.[id];
    if (saved) applyChartView(chart, id, saved);
    hideChartSkeleton(chart);
    return chart;
  }

  function applyChartView(chart, id, changes = {}) {
    const base = chart.$asteraBase;
    if (!base) return;
    chart.config.type = changes.type || base.type;
    chart.options.indexAxis = chart.config.type === "line" ? "x" : base.indexAxis;
    chart.options.scales = Object.fromEntries(Object.entries(base.scales).map(([axis, scale]) => [axis, { ...scale, ticks: { ...(scale.ticks || {}) } }]));
    if (chart.config.type === "line" && base.indexAxis === "y") {
      const categoryAxis = chart.options.scales.y;
      const valueAxis = chart.options.scales.x;
      chart.options.scales.x = { ...categoryAxis, grid: { ...(categoryAxis?.grid || {}), display: false } };
      chart.options.scales.y = { ...valueAxis };
    }
    chart.data.labels = [...base.labels];
    chart.data.datasets = base.datasets.map((dataset) => ({ ...dataset, data: [...dataset.data] }));

    const isRegional = chart.data.labels.some((label) => ["north", "east", "south", "west"].includes(String(label).toLowerCase()));
    if (changes.region) {
      if (isRegional) {
        const names = changes.region === "south-west" ? ["south", "west"] : [changes.region];
        if (id === "regional-sales-chart") {
          // Rebuild from the selected-range cache so an active region filter cannot hide bars.
          const range = window.state.filters.range;
          const rows = window.DATA.regions.map((item) => ({
            ...item,
            ...window.DATA.filterData.values[range][item.id],
            ...(window.state.pipelineOverrides["regional-targets"]?.regionData?.[range]?.[item.id] || {})
          })).filter((item) => names.includes(item.id));
          chart.data.labels = rows.map((item) => item.name);
          chart.data.datasets[0].data = rows.map((item) => item.sales);
          chart.data.datasets[1].data = rows.map((item) => item.target);
        } else {
          const indexes = chart.data.labels.map((label, index) => names.includes(String(label).toLowerCase()) ? index : -1).filter((index) => index >= 0);
          chart.data.labels = indexes.map((index) => base.labels[index]);
          chart.data.datasets.forEach((dataset, index) => { dataset.data = indexes.map((point) => base.datasets[index].data[point]); });
        }
      } else {
        // Monthly and category charts use the precomputed region series, no client math.
        const messageId = id.startsWith("chat-") ? id.slice(5) : "";
        const answer = window.state.chatMessages.find((item) => item.id === messageId)?.answer;
        const pinId = id.startsWith("pinned-") ? id.slice(7) : "";
        const pinnedAnswer = window.state.pinned.find((item) => item.id === pinId);
        const chartKind = id === "monthly-revenue-chart" || answer?.chartType === "line" || pinnedAnswer?.chartType === "line" ? "monthly" : "categories";
        const range = window.state.filters.range;
        const cache = window.DATA.filterData.charts[chartKind][range];
        chart.data.labels = [...base.labels];
        chart.data.datasets = ["south", "west"].filter((region) => changes.region === "south-west" || region === changes.region).map((region, index) => {
          const series = cache[region];
          return {
            ...base.datasets[0], label: region[0].toUpperCase() + region.slice(1),
            data: [...(Array.isArray(series) ? series : series.values)],
            borderDash: index ? [5, 3] : [], borderColor: index ? themeColors().muted : themeColors().brand,
            backgroundColor: index ? themeColors().surfaceMuted : base.datasets[0].backgroundColor
          };
        });
      }
    }

    if (changes.percent) {
      if (isRegional && chart.data.datasets.length > 1) {
        const sales = chart.data.datasets[0].data;
        const targets = chart.data.datasets[1].data;
        chart.data.datasets[0].data = sales.map((value, index) => targets[index] ? Math.round(value / targets[index] * 100) : 0);
        chart.data.datasets[0].label = "Attainment (% of target)";
        chart.data.datasets[1].data = targets.map(() => 100);
        chart.data.datasets[1].label = "Target (100%)";
      } else {
        // If the chart has no target series, show each series as a share of its total.
        chart.data.datasets.forEach((dataset) => {
          const total = dataset.data.reduce((sum, value) => sum + Number(value || 0), 0);
          dataset.data = dataset.data.map((value) => total ? Math.round(Number(value) / total * 100) : 0);
          dataset.label = `${dataset.label} (% of total)`;
        });
      }
      chart.options.scales = chart.options.scales || {};
      const axis = chart.options.indexAxis === "y" ? "x" : "y";
      chart.options.scales[axis] = { ...(chart.options.scales[axis] || {}), ticks: { ...(chart.options.scales[axis]?.ticks || {}), callback: (value) => `${value}%` } };
    }
    chart.update();
  }

  function applyChange(id, changes) {
    const chart = charts[id];
    if (chart) applyChartView(chart, id, changes);
  }

  function themeColors() {
    const styles = getComputedStyle(document.documentElement);
    return {
      text: styles.getPropertyValue("--color-text").trim(),
      muted: styles.getPropertyValue("--color-muted").trim(),
      border: styles.getPropertyValue("--color-border").trim(),
      surface: styles.getPropertyValue("--color-surface").trim(),
      surfaceMuted: styles.getPropertyValue("--color-surface-muted").trim(),
      brand: styles.getPropertyValue("--color-brand").trim(),
      brandSoft: styles.getPropertyValue("--color-brand-soft").trim()
    };
  }

  // A light diagonal pattern helps distinguish data series without relying on color.
  function stripePattern(lineColor, backgroundColor) {
    const patternCanvas = document.createElement("canvas");
    patternCanvas.width = 10;
    patternCanvas.height = 10;
    const context = patternCanvas.getContext("2d");
    context.fillStyle = backgroundColor;
    context.fillRect(0, 0, 10, 10);
    context.strokeStyle = lineColor;
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(-2, 10);
    context.lineTo(10, -2);
    context.moveTo(4, 12);
    context.lineTo(12, 4);
    context.stroke();
    return context;
  }

  function rgbaFromHex(hex, alpha) {
    const match = hex.match(/^#([\da-f]{6})$/i);
    if (!match) return `rgba(0, 92, 204, ${alpha})`;
    const number = parseInt(match[1], 16);
    return `rgba(${number >> 16}, ${(number >> 8) & 255}, ${number & 255}, ${alpha})`;
  }

  function baseOptions(colors) {
    return {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 350 },
      interaction: { mode: "nearest", intersect: true },
      plugins: {
        legend: {
          display: true,
          position: "bottom",
          labels: {
            color: colors.text,
            usePointStyle: true,
            pointStyle: "rectRounded",
            boxWidth: 14,
            boxHeight: 10,
            padding: 16,
            font: { size: 12, family: '"Poppins", "Avenir Next", Avenir, "Segoe UI", Arial, sans-serif' }
          }
        },
        tooltip: { enabled: true }
      },
      scales: {
        x: {
          ticks: { color: colors.muted, font: { size: 11, family: '"Poppins", "Avenir Next", Avenir, "Segoe UI", Arial, sans-serif' } },
          grid: { color: colors.border, drawTicks: false }
        },
        y: {
          beginAtZero: true,
          ticks: { color: colors.muted, font: { size: 11, family: '"Poppins", "Avenir Next", Avenir, "Segoe UI", Arial, sans-serif' } },
          grid: { color: colors.border, drawTicks: false }
        }
      }
    };
  }

  function moneyInMillions(value) {
    return `$${(value / 1000).toFixed(2)} M`;
  }

  function renderRegionalChart() {
    const canvas = document.getElementById("regional-sales-chart");
    if (!canvas) return;
    const colors = themeColors();
    const context = canvas.getContext("2d");
    const salesPattern = context.createPattern(stripePattern(colors.brand, colors.brandSoft).canvas, "repeat");
    const { range, region } = window.state.filters;
    const regionCache = window.DATA.filterData.values[range];
    const updatedRegionCache = window.state.pipelineOverrides["regional-targets"]?.regionData?.[range] || {};
    const regions = region === "all"
      ? window.DATA.regions.map((item) => ({ ...item, ...regionCache[item.id], ...(updatedRegionCache[item.id] || {}) }))
      : window.DATA.regions.filter((item) => item.id === region).map((item) => ({ ...item, ...regionCache[item.id], ...(updatedRegionCache[item.id] || {}) }));
    const chart = new window.Chart(context, {
      type: "bar",
      data: {
        labels: regions.map((region) => region.name),
        datasets: [
          {
            label: "Sales ($K)",
            data: regions.map((region) => region.sales),
            backgroundColor: salesPattern,
            borderColor: colors.brand,
            borderWidth: regions.map(() => 1),
            borderRadius: 4
          },
          {
            label: "Target ($K)",
            data: regions.map((region) => region.target),
            backgroundColor: colors.surfaceMuted,
            borderColor: colors.muted,
            borderDash: [5, 3],
            borderWidth: regions.map(() => 2),
            borderRadius: 4
          }
        ]
      },
      options: {
        ...baseOptions(colors),
        onClick(event, elements) {
          if (!elements.length) return;
          const { index, datasetIndex } = elements[0];
          const regionName = chart.data.labels[index];
          chart.data.datasets.forEach((dataset, setIndex) => {
            dataset.borderWidth = dataset.data.map((_, itemIndex) =>
              itemIndex === index ? (setIndex === datasetIndex ? 4 : 3) : (setIndex === 0 ? 1 : 2)
            );
          });
          chart.update();
          const selection = document.getElementById("regional-chart-selection");
          if (selection) selection.textContent = `Selected ${regionName}`;
          window.openDrill?.(regionName);
        },
        scales: {
          ...baseOptions(colors).scales,
          y: {
            ...baseOptions(colors).scales.y,
            title: { display: true, text: "Revenue ($K)", color: colors.muted, font: { size: 11 } },
            ticks: { ...baseOptions(colors).scales.y.ticks, callback: (value) => `$${value}` }
          }
        }
      }
    });
    registerChart("regional-sales-chart", chart);
  }

  function renderMonthlyChart() {
    const canvas = document.getElementById("monthly-revenue-chart");
    if (!canvas) return;
    const colors = themeColors();
    const context = canvas.getContext("2d");
    const fill = context.createLinearGradient(0, 0, 0, 260);
    fill.addColorStop(0, rgbaFromHex(colors.brand, 0.24));
    fill.addColorStop(1, rgbaFromHex(colors.brand, 0.01));
    // This precomputed series is selected directly by range and region keys.
    const { range, region } = window.state.filters;
    const series = window.DATA.filterData.charts.monthly[range][region];
    const chart = new window.Chart(context, {
      type: "line",
      data: {
        labels: series.labels,
        datasets: [{
          label: "Revenue",
          data: series.values,
          borderColor: colors.brand,
          backgroundColor: fill,
          borderWidth: 3,
          fill: true,
          tension: 0.32,
          pointRadius: 4,
          pointHoverRadius: 7,
          pointBackgroundColor: colors.surface,
          pointBorderColor: colors.brand,
          pointBorderWidth: 2
        }]
      },
      options: {
        ...baseOptions(colors),
        scales: {
          ...baseOptions(colors).scales,
          y: {
            ...baseOptions(colors).scales.y,
            ticks: { ...baseOptions(colors).scales.y.ticks, callback: (value) => moneyInMillions(value) }
          }
        },
        plugins: {
          ...baseOptions(colors).plugins,
          tooltip: { callbacks: { label: (item) => `Revenue: ${moneyInMillions(item.raw)}` } }
        }
      }
    });
    registerChart("monthly-revenue-chart", chart);
  }

  function renderCategoriesChart() {
    const canvas = document.getElementById("top-categories-chart");
    if (!canvas) return;
    const colors = themeColors();
    const context = canvas.getContext("2d");
    const pattern = context.createPattern(stripePattern(colors.brand, colors.brandSoft).canvas, "repeat");
    // Category totals are cached for each date range in filterData as well.
    const { range, region } = window.state.filters;
    const values = window.DATA.filterData.charts.categories[range][region];
    const chart = new window.Chart(context, {
      type: "bar",
      data: {
        labels: window.DATA.categories.map((item) => item.name),
        datasets: [{
          label: "Revenue ($K)",
          data: values,
          backgroundColor: pattern,
          borderColor: colors.brand,
          borderWidth: 1,
          borderRadius: 4
        }]
      },
      options: {
        ...baseOptions(colors),
        indexAxis: "y",
        scales: {
          x: {
            ...baseOptions(colors).scales.x,
            beginAtZero: true,
            ticks: { ...baseOptions(colors).scales.x.ticks, callback: (value) => `$${value} K` }
          },
          y: { ...baseOptions(colors).scales.y, grid: { display: false } }
        },
        plugins: {
          ...baseOptions(colors).plugins,
          tooltip: { callbacks: { label: (item) => `Revenue: $${item.raw} K` } }
        }
      }
    });
    registerChart("top-categories-chart", chart);
  }

  // Scripted chat answers use the same local Chart.js build and theme as the dashboard.
  function renderChatCharts() {
    if (!window.Chart) return;
    window.state.chatMessages.forEach((message) => {
      const answer = message.answer;
      if (!answer) return;
      const canvas = document.getElementById(`chat-chart-${message.id}`);
      if (!canvas) return;
      const colors = themeColors();
      const context = canvas.getContext("2d");
      const regionUpdate = window.state.pipelineOverrides["regional-targets"]?.regionData?.q3;
      const chartData = answer.pipelineId === "regional-targets" && regionUpdate
        ? {
          ...answer.chartData,
          sales: answer.chartData.labels.map((label, index) => regionUpdate[label.toLowerCase()]?.sales ?? answer.chartData.sales[index]),
          target: answer.chartData.target?.map((value, index) => regionUpdate[answer.chartData.labels[index].toLowerCase()]?.target ?? value)
        }
        : answer.chartData;
      let config;

      if (answer.chartType === "bar") {
        const striped = context.createPattern(stripePattern(colors.brand, colors.brandSoft).canvas, "repeat");
        config = {
          type: "bar",
          data: {
            labels: chartData.labels,
            datasets: [
              { label: "Sales ($K)", data: chartData.sales, backgroundColor: striped, borderColor: colors.brand, borderWidth: 1, borderRadius: 4 },
              { label: "Target ($K)", data: chartData.target, backgroundColor: colors.surfaceMuted, borderColor: colors.muted, borderDash: [5, 3], borderWidth: 2, borderRadius: 4 }
            ]
          },
          options: { ...baseOptions(colors), scales: { ...baseOptions(colors).scales,
            y: { ...baseOptions(colors).scales.y, ticks: { ...baseOptions(colors).scales.y.ticks, callback: (value) => `$${value}` } } } }
        };
      } else if (answer.chartType === "line") {
        config = {
          type: "line",
          data: { labels: chartData.labels, datasets: [{
            label: "Revenue", data: chartData.values, borderColor: colors.brand,
            backgroundColor: rgbaFromHex(colors.brand, 0.14), fill: true, tension: 0.32,
            borderWidth: 3, pointRadius: 4, pointHoverRadius: 7,
            pointBackgroundColor: colors.surface, pointBorderColor: colors.brand, pointBorderWidth: 2
          }] },
          options: { ...baseOptions(colors), scales: { ...baseOptions(colors).scales,
            y: { ...baseOptions(colors).scales.y, ticks: { ...baseOptions(colors).scales.y.ticks, callback: (value) => moneyInMillions(value) } } },
            plugins: { ...baseOptions(colors).plugins, tooltip: { callbacks: { label: (item) => `Revenue: ${moneyInMillions(item.raw)}` } } } }
        };
      } else {
        const striped = context.createPattern(stripePattern(colors.brand, colors.brandSoft).canvas, "repeat");
        config = {
          type: "bar",
          data: { labels: chartData.labels, datasets: [{
            label: "Revenue ($K)", data: chartData.values, backgroundColor: striped,
            borderColor: colors.brand, borderWidth: 1, borderRadius: 4
          }] },
          options: { ...baseOptions(colors), indexAxis: "y",
            scales: { x: { ...baseOptions(colors).scales.x, beginAtZero: true, ticks: { ...baseOptions(colors).scales.x.ticks, callback: (value) => `$${value} K` } },
              y: { ...baseOptions(colors).scales.y, grid: { display: false } } },
            plugins: { ...baseOptions(colors).plugins, tooltip: { callbacks: { label: (item) => `Revenue: $${item.raw} K` } } }
          }
        };
      }

      registerChart(`chat-${message.id}`, new window.Chart(context, config));
    });
  }

  // Pinned charts keep their chat answer data and use a compact card height on the dashboard.
  function renderPinnedCharts() {
    if (!window.Chart) return;
    (window.state.pinned || []).forEach((answer) => {
      const canvas = document.getElementById(`pinned-chart-${answer.id}`);
      if (!canvas || !answer.chartData) return;
      const colors = themeColors();
      const context = canvas.getContext("2d");
      const pattern = context.createPattern(stripePattern(colors.brand, colors.brandSoft).canvas, "repeat");
      const options = baseOptions(colors);
      const regionUpdate = window.state.pipelineOverrides["regional-targets"]?.regionData?.q3;
      const chartData = answer.pipelineId === "regional-targets" && regionUpdate && answer.chartData.sales
        ? {
          ...answer.chartData,
          sales: answer.chartData.labels.map((label, index) => regionUpdate[label.toLowerCase()]?.sales ?? answer.chartData.sales[index]),
          target: answer.chartData.target?.map((value, index) => regionUpdate[answer.chartData.labels[index].toLowerCase()]?.target ?? value)
        }
        : answer.chartData;
      let config;
      if (answer.chartType === "line") {
        config = { type: "line", data: { labels: chartData.labels, datasets: [{
          label: "Revenue", data: chartData.values, borderColor: colors.brand,
          backgroundColor: rgbaFromHex(colors.brand, 0.14), fill: true, tension: 0.32,
          borderWidth: 3, pointRadius: 3, pointBackgroundColor: colors.surface
        }] }, options };
      } else if (answer.chartType === "bar" && answer.chartData.sales) {
        config = { type: "bar", data: { labels: chartData.labels, datasets: [
          { label: "Sales ($K)", data: chartData.sales, backgroundColor: pattern, borderColor: colors.brand, borderWidth: 1 },
          { label: "Target ($K)", data: chartData.target, backgroundColor: colors.surfaceMuted, borderColor: colors.muted, borderDash: [5, 3], borderWidth: 2 }
        ] }, options };
      } else {
        config = { type: "bar", data: { labels: chartData.labels, datasets: [{
          label: "Revenue ($K)", data: chartData.values, backgroundColor: pattern, borderColor: colors.brand, borderWidth: 1
        }] }, options: { ...options, indexAxis: "y" } };
      }
      registerChart(`pinned-${answer.id}`, new window.Chart(context, config));
    });
  }

  // Drill-down sheets have their own small responsive monthly chart.
  function renderDrillChart(regionId) {
    if (!window.Chart) return;
    const canvas = document.getElementById("drill-monthly-chart");
    const series = window.DATA.drillDown?.[regionId]?.monthly;
    if (!canvas || !series) return;
    charts.drill?.destroy();
    const colors = themeColors();
    const fill = rgbaFromHex(colors.brand, 0.14);
    charts.drill = new window.Chart(canvas.getContext("2d"), {
      type: "line",
      data: { labels: series.labels, datasets: [{
        label: "Sales ($K)", data: series.values, borderColor: colors.brand, backgroundColor: fill,
        fill: true, tension: 0.32, borderWidth: 3, pointRadius: 3, pointBackgroundColor: colors.surface
      }] },
      options: { ...baseOptions(colors), plugins: { ...baseOptions(colors).plugins, legend: { display: false } },
        scales: { ...baseOptions(colors).scales, y: { ...baseOptions(colors).scales.y, ticks: { ...baseOptions(colors).scales.y.ticks, callback: (value) => `$${value} K` } } }
      }
    });
    hideChartSkeleton(charts.drill);
  }

  function destroyDrillChart() {
    charts.drill?.destroy();
    delete charts.drill;
  }

  function destroyAll() {
    Object.values(charts).forEach((chart) => chart?.destroy());
    Object.keys(charts).forEach((key) => delete charts[key]);
  }

  function render() {
    if (!window.Chart) return;
    destroyAll();
    renderRegionalChart();
    renderMonthlyChart();
    renderCategoriesChart();
  }

  window.DashboardCharts = { render, destroyAll, renderChatCharts, renderPinnedCharts, renderDrillChart, destroyDrillChart, applyChange };
})();

// Population Analytics (Chart.js) — CBD East/North/West only via JSON
(function () {
  const charts = { trend: null, growth: null, density: null };
  let raw = null;
  let initialized = false;
  let selectedRegions = new Set();

  window.PopulationAnalytics = { ensureInitialized };

  window.initializePopulationAnalytics = function () {
    const applyBtn = document.getElementById('apply-filters-btn');
    const resetBtn = document.getElementById('reset-filters-btn');
    const regionSelect = document.getElementById('region-select');
    const selectAllBtn = document.getElementById('select-all-regions');
    const clearBtn = document.getElementById('clear-regions');

    applyBtn?.addEventListener('click', () => {
      const { fromYear, toYear } = getYearRange();
      if (fromYear > toYear) return alert('From Year cannot be later than To Year');
      updateFilterInfo(fromYear, toYear);
      updateAll(buildFiltered(raw, fromYear, toYear, [...selectedRegions]));
    });

    resetBtn?.addEventListener('click', () => {
      const defaults = { from: 2011, to: 2021 };
      setYearRange(defaults.from, defaults.to);
      updateFilterInfo(defaults.from, defaults.to);
      selectedRegions = new Set(Object.keys(raw?.regions || {}));
      syncRegionSelect(regionSelect, selectedRegions);
      updateAll(buildFiltered(raw, defaults.from, defaults.to, [...selectedRegions]));
    });

    regionSelect?.addEventListener('change', () => {
      selectedRegions = new Set([...regionSelect.options].filter(o => o.selected).map(o => o.value));
    });

    selectAllBtn?.addEventListener('click', () => {
      selectedRegions = new Set(Object.keys(raw?.regions || {}));
      syncRegionSelect(regionSelect, selectedRegions);
    });

    clearBtn?.addEventListener('click', () => {
      selectedRegions.clear();
      syncRegionSelect(regionSelect, selectedRegions);
    });

    // Load data
    loadJSON('./population_sa4.json')
      .then(data => {
        raw = data;
        populateRegionSelect(regionSelect, Object.keys(raw.regions));
        selectedRegions = new Set(Object.keys(raw.regions)); // default: all
      })
      .catch(err => console.error('Failed to load population_sa4.json', err));
  };

  function ensureInitialized() {
    if (initialized || !raw) return;
    const { fromYear, toYear } = getYearRange();
    updateFilterInfo(fromYear, toYear);
    const filtered = buildFiltered(raw, fromYear, toYear, [...selectedRegions]);
    initAll(filtered);
    initialized = true;
  }

  // -------- data/io ----------
  async function loadJSON(path) {
    const res = await fetch(path, { cache: 'no-cache' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  // -------- ui helpers ----------
  function populateRegionSelect(selectEl, regions) {
    if (!selectEl) return;
    selectEl.innerHTML = '';
    regions.forEach(r => {
      const opt = document.createElement('option');
      opt.value = r; opt.textContent = r; opt.selected = true;
      selectEl.appendChild(opt);
    });
  }
  function syncRegionSelect(selectEl, selected) {
    if (!selectEl) return;
    [...selectEl.options].forEach(o => { o.selected = selected.has(o.value); });
  }

  // -------- filters ----------
  function getYearRange() {
    const fromYear = parseInt(document.getElementById('from-year').value, 10);
    const toYear   = parseInt(document.getElementById('to-year').value, 10);
    return { fromYear, toYear };
  }
  function setYearRange(from, to) {
    document.getElementById('from-year').value = String(from);
    document.getElementById('to-year').value   = String(to);
  }
  function updateFilterInfo(from, to) {
    const span = document.getElementById('filter-range');
    if (span) span.textContent = `${from} - ${to}`;
  }

  // -------- derivations ----------
  function buildFiltered(rawData, fromYear, toYear, chosen) {
    if (!rawData) return null;

    const s = rawData.years.indexOf(fromYear);
    const e = rawData.years.indexOf(toYear);
    const valid = (s !== -1 && e !== -1 && s <= e);
    const labels = valid ? rawData.years.slice(s, e + 1) : rawData.years.slice();

    const regions = chosen.length ? chosen : Object.keys(rawData.regions);
    const palette = ['#6366f1','#10b981','#f59e0b'];

    // Trend datasets
    const trendDatasets = regions.map((name, i) => {
      const arr = rawData.regions[name].population;
      return {
        label: name,
        data: valid ? arr.slice(s, e + 1) : arr.slice(),
        borderColor: palette[i % palette.length],
        backgroundColor: 'transparent',
        borderWidth: 2,
        tension: 0.35,
        pointRadius: 2
      };
    });

    // Growth % per region (first vs last value within selected range)
    const growthData = regions.map(name => {
      const series = rawData.regions[name].population;
      const sub = valid ? series.slice(s, e + 1) : series.slice();
      const first = sub[0], last = sub[sub.length - 1];
      const pct = first ? ((last - first) / first) * 100 : 0;
      return { name, pct: +pct.toFixed(1) };
    }).sort((a,b) => b.pct - a.pct);

    // Density 2021 for selected regions
    const density = regions.map(name => ({
      name, value: rawData.regions[name].density_2021 ?? 0
    })).sort((a,b) => b.value - a.value);

    // Stats (sum of selected regions, latest year in range)
    const totals = labels.map((_, idx) =>
      regions.reduce((sum, r) => {
        const series = rawData.regions[r].population;
        const baseIndex = valid ? s + idx : idx;
        return sum + (series[baseIndex] ?? 0);
      }, 0)
    );
    const totalPopulation = totals[totals.length - 1] || 0;
    const yoy = computeYoYPercent(totals);
    const avgGrowthRate = yoy.length ? +(yoy.slice(1).reduce((a,b)=>a+b,0) / (yoy.length - 1)).toFixed(1) : 0;

    return {
      labels,
      trendDatasets,
      growthData,
      density,
      stats: { totalPopulation, avgGrowthRate, yearsAnalyzed: labels.length }
    };
  }

  function computeYoYPercent(series) {
    const out = [0];
    for (let i = 1; i < series.length; i++) {
      const p = series[i-1] || 0, c = series[i] || 0;
      out.push(p ? ((c - p) / p) * 100 : 0);
    }
    return out;
  }

  // -------- charts ----------
  function initAll(data) {
    initTrendChart(data.labels, data.trendDatasets);
    initGrowthChart(data.growthData);
    initDensityChart(data.density);
    updateStats(data.stats);
  }
  function updateAll(data) {
    if (!data) return;
    // trend
    charts.trend.data.labels = data.labels;
    charts.trend.data.datasets = data.trendDatasets;
    charts.trend.update();
    // growth
    charts.growth.data.labels = data.growthData.map(d => d.name);
    charts.growth.data.datasets[0].data = data.growthData.map(d => d.pct);
    charts.growth.update();
    // density
    charts.density.data.labels = data.density.map(d => d.name);
    charts.density.data.datasets[0].data = data.density.map(d => d.value);
    charts.density.update();
    // stats
    updateStats(data.stats);
  }

  function initTrendChart(labels, datasets) {
    const ctx = document.getElementById('trend-chart');
    if (!ctx) return;
    charts.trend?.destroy();
    charts.trend = new Chart(ctx, {
      type: 'line',
      data: { labels, datasets },
      options: {
        responsive: true, maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { position: 'bottom' },
          tooltip: { callbacks: { label: (c) => `${c.dataset.label}: ${c.parsed.y.toLocaleString()}` } }
        },
        scales: {
          x: { title: { display: true, text: 'Year' }, grid: { display: false } },
          y: { title: { display: true, text: 'Population' }, ticks: { callback: v => (v/1000)+'k' } }
        }
      }
    });
  }

  function initGrowthChart(growthData) {
    const ctx = document.getElementById('growth-chart');
    if (!ctx) return;
    charts.growth?.destroy();
    charts.growth = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: growthData.map(d => d.name),
        datasets: [{ label: 'Growth % (selected range)', data: growthData.map(d => d.pct), backgroundColor: '#6366f1' }]
      },
      options: {
        indexAxis: 'y',
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => `${c.parsed.x.toFixed(1)}%` } } },
        scales: {
          x: { title: { display: true, text: 'Percent' }, ticks: { callback: v => v + '%' } },
          y: { title: { display: false } }
        }
      }
    });
  }

  function initDensityChart(densityData) {
    const ctx = document.getElementById('density-chart');
    if (!ctx) return;
    charts.density?.destroy();
    charts.density = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: densityData.map(d => d.name),
        datasets: [{ label: 'Population density (2021, persons/km²)', data: densityData.map(d => d.value), backgroundColor: '#10b981' }]
      },
      options: {
        indexAxis: 'y',
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => c.parsed.x.toLocaleString() + ' per km²' } } },
        scales: {
          x: { title: { display: true, text: 'Persons per km²' } },
          y: { title: { display: false } }
        }
      }
    });
  }

  function updateStats({ totalPopulation, avgGrowthRate, yearsAnalyzed }) {
    const totalEl  = document.getElementById('total-population');
    const growthEl = document.getElementById('avg-growth');
    const yearsEl  = document.getElementById('years-analyzed');
    if (totalEl)  totalEl.textContent  = totalPopulation.toLocaleString();
    if (growthEl) growthEl.textContent = avgGrowthRate + '%';
    if (yearsEl)  yearsEl.textContent  = yearsAnalyzed;
  }
})();


/*
// Population analytics: data, filters, and Chart.js rendering
// Exposes window.PopulationAnalytics.ensureInitialized()

(function () {
    // local state
    const charts = { bar: null, line: null };
    let currentData = null;
    let initialized = false;
  
    // public API
    window.PopulationAnalytics = {
      ensureInitialized
    };
  
    // called by main.js on DOMContentLoaded
    window.initializePopulationAnalytics = function initializePopulationAnalytics() {
      const applyBtn = document.getElementById('apply-filters-btn');
      const resetBtn = document.getElementById('reset-filters-btn');
  
      if (!applyBtn || !resetBtn) return;
  
      applyBtn.addEventListener('click', () => {
        const { fromYear, toYear } = getYearRange();
        if (fromYear > toYear) {
          alert('From Year cannot be later than To Year');
          return;
        }
        updateFilterInfo(fromYear, toYear);
        const filtered = filterDataByYears(currentData, fromYear, toYear);
        updateCharts(filtered);
      });
  
      resetBtn.addEventListener('click', () => {
        setYearRange(2011, 2016);
        updateFilterInfo(2011, 2016);
        const filtered = filterDataByYears(currentData, 2011, 2016);
        updateCharts(filtered);
      });
  
      // pre-load data so first render is instant
      loadPopulationData().then(data => {
        currentData = data;
        // do not render until user opens analytics tab
      }).catch(err => console.error('Error loading population data:', err));
    };
  
    // Ensure charts are initialized once when entering analytics tab
    function ensureInitialized() {
      if (initialized) return;
      if (!currentData) return; // data still loading; will be initialized next click
  
      const { fromYear, toYear } = getYearRange();
      updateFilterInfo(fromYear, toYear);
      const filtered = filterDataByYears(currentData, fromYear, toYear);
      initializeCharts(filtered);
      initialized = true;
    }
  
    // ----- Data (mock) -----
    async function loadPopulationData() {
      await new Promise(r => setTimeout(r, 400)); // simulate latency
      return {
        barChartData: {
          years: [2011,2012,2013,2014,2015,2016,2017,2018,2019,2020,2021],
          datasets: [
            { label: 'Melbourne - Inner',        data: [180000,185000,190000,195000,200000,205000,210000,215000,220000,225000,230000], backgroundColor: '#6366f1' },
            { label: 'Melbourne - Inner East',   data: [450000,455000,460000,465000,470000,475000,480000,485000,490000,495000,500000], backgroundColor: '#10b981' },
            { label: 'Melbourne - Inner South',  data: [300000,310000,320000,330000,340000,350000,360000,370000,380000,390000,400000], backgroundColor: '#f59e0b' },
            { label: 'Melbourne - North East',   data: [350000,360000,380000,390000,400000,410000,420000,430000,440000,450000,460000], backgroundColor: '#ef4444' },
            { label: 'Melbourne - North West',   data: [620000,640000,670000,690000,710000,730000,750000,770000,790000,810000,830000], backgroundColor: '#06b6d4' },
            { label: 'Melbourne - Outer East',   data: [500000,520000,540000,560000,580000,600000,620000,640000,660000,680000,700000], backgroundColor: '#8b5cf6' },
            { label: 'Melbourne - South East',   data: [650000,670000,690000,710000,730000,750000,770000,790000,810000,830000,850000], backgroundColor: '#f97316' },
            { label: 'Melbourne - West',         data: [680000,700000,720000,740000,760000,780000,800000,820000,840000,860000,880000], backgroundColor: '#22d3ee' }
          ]
        },
        lineChartData: {
          years: [2011,2012,2013,2014,2015,2016,2017,2018,2019,2020,2021],
          growthRate: [0.0,2.1,2.2,2.3,2.4,2.4,2.3,2.2,2.1,1.8,2.0]
        },
        totalPopulation: 4026100,
        avgGrowthRate: 2.3,
        yearsAnalyzed: 11
      };
    }
  
    // ----- Filters helpers -----
    function getYearRange() {
      const fromYear = parseInt(document.getElementById('from-year').value, 10);
      const toYear = parseInt(document.getElementById('to-year').value, 10);
      return { fromYear, toYear };
    }
    function setYearRange(from, to) {
      document.getElementById('from-year').value = String(from);
      document.getElementById('to-year').value = String(to);
    }
    function updateFilterInfo(from, to) {
      const span = document.getElementById('filter-range');
      if (span) span.textContent = `${from} - ${to}`;
    }
  
    // ----- Filtering -----
    function filterDataByYears(data, fromYear, toYear) {
      if (!data) return null;
      const s = data.barChartData.years.indexOf(fromYear);
      const e = data.barChartData.years.indexOf(toYear);
      if (s === -1 || e === -1) return data;
  
      const filteredBar = {
        years: data.barChartData.years.slice(s, e + 1),
        datasets: data.barChartData.datasets.map(ds => ({ ...ds, data: ds.data.slice(s, e + 1) }))
      };
      const filteredLine = {
        years: data.lineChartData.years.slice(s, e + 1),
        growthRate: data.lineChartData.growthRate.slice(s, e + 1)
      };
      return {
        ...data,
        barChartData: filteredBar,
        lineChartData: filteredLine,
        yearsAnalyzed: e - s + 1
      };
    }
  
    // ----- Charts -----
    function initializeCharts(data) {
      initBarChart(data.barChartData);
      initLineChart(data.lineChartData);
      updateStats(data);
    }
  
    function initBarChart(barData) {
      const ctx = document.getElementById('population-bar-chart');
      if (!ctx) return;
      if (charts.bar) charts.bar.destroy();
  
      charts.bar = new Chart(ctx, {
        type: 'bar',
        data: { labels: barData.years, datasets: barData.datasets },
        options: {
          responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false },
          plugins: {
            legend: { position: 'bottom', labels: { boxWidth: 12, padding: 15, font: { size: 11 } } },
            tooltip: {
              backgroundColor: 'rgba(0,0,0,0.8)', titleColor: '#fff', bodyColor: '#fff',
              borderColor: '#6366f1', borderWidth: 1, cornerRadius: 8,
              callbacks: { label: (ctx) => `${ctx.dataset.label}: ${ctx.parsed.y.toLocaleString()}` }
            }
          },
          scales: {
            x: { title: { display: true, text: 'Year' }, grid: { display: false } },
            y: {
              title: { display: true, text: 'Number of People' },
              ticks: { callback: (v) => (v / 1000) + 'k' }
            }
          }
        }
      });
    }
  
    function initLineChart(lineData) {
      const ctx = document.getElementById('population-line-chart');
      if (!ctx) return;
      if (charts.line) charts.line.destroy();
  
      charts.line = new Chart(ctx, {
        type: 'line',
        data: {
          labels: lineData.years,
          datasets: [{
            label: 'Population Growth Rate',
            data: lineData.growthRate,
            borderColor: '#6366f1',
            backgroundColor: 'rgba(99,102,241,0.1)',
            borderWidth: 3,
            pointRadius: 6,
            pointBorderWidth: 2,
            pointBackgroundColor: '#ffffff',
            pointBorderColor: '#6366f1',
            fill: true,
            tension: 0.4
          }]
        },
        options: {
          responsive: true, maintainAspectRatio: false, interaction: { intersect: false, mode: 'index' },
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: 'rgba(0,0,0,0.8)', titleColor: '#fff', bodyColor: '#fff',
              borderColor: '#6366f1', borderWidth: 1, cornerRadius: 8,
              callbacks: { label: (ctx) => `Growth Rate: ${ctx.parsed.y}%` }
            }
          },
          scales: {
            x: { title: { display: true, text: 'Year' }, grid: { display: false } },
            y: { title: { display: true, text: 'Percentage Change (%)' }, min: 0, max: 3, ticks: { callback: (v) => v + '%' } }
          }
        }
      });
    }
  
    function updateCharts(data) {
      if (!data) return;
      if (charts.bar) {
        charts.bar.data.labels = data.barChartData.years;
        charts.bar.data.datasets = data.barChartData.datasets;
        charts.bar.update();
      }
      if (charts.line) {
        charts.line.data.labels = data.lineChartData.years;
        charts.line.data.datasets[0].data = data.lineChartData.growthRate;
        charts.line.update();
      }
      updateStats(data);
    }
  
    function updateStats(data) {
      const totalEl = document.getElementById('total-population');
      const growthEl = document.getElementById('avg-growth');
      const yearsEl = document.getElementById('years-analyzed');
  
      if (totalEl)  totalEl.textContent = data.totalPopulation.toLocaleString();
      if (growthEl) growthEl.textContent = data.avgGrowthRate + '%';
      if (yearsEl)  yearsEl.textContent = data.yearsAnalyzed;
    }
  })();
  */

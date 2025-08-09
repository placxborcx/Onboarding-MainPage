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
  
// ===== js/population-analytics.js =====

// Population analytics functionality
function initializePopulationAnalytics() {
    const fromYearSelect = document.getElementById('from-year');
    const toYearSelect = document.getElementById('to-year');
    const applyFiltersBtn = document.getElementById('apply-filters-btn');
    const resetFiltersBtn = document.getElementById('reset-filters-btn');
    const filterRangeSpan = document.getElementById('filter-range');
    
    // Event listeners
    applyFiltersBtn.addEventListener('click', applyFilters);
    resetFiltersBtn.addEventListener('click', resetFilters);
    
    // Load initial data
    loadPopulationData();
    
    function applyFilters() {
        const fromYear = parseInt(fromYearSelect.value);
        const toYear = parseInt(toYearSelect.value);
        
        if (fromYear > toYear) {
            alert('From Year cannot be later than To Year');
            return;
        }
        
        // Update filter info
        filterRangeSpan.textContent = `${fromYear} - ${toYear}`;
        
        // Filter and update charts
        const filteredData = filterDataByYears(currentData, fromYear, toYear);
        updateCharts(filteredData, fromYear, toYear);
    }
    
    function resetFilters() {
        fromYearSelect.value = '2011';
        toYearSelect.value = '2016';
        filterRangeSpan.textContent = '2011 - 2016';
        
        // Reset charts to default range
        const filteredData = filterDataByYears(currentData, 2011, 2016);
        updateCharts(filteredData, 2011, 2016);
    }
    
    async function loadPopulationData() {
        try {
            // Mock population data - replace with actual backend API call
            currentData = await getPopulationData();
            
            // Initialize charts with default filter (2011-2016)
            const filteredData = filterDataByYears(currentData, 2011, 2016);
            if (document.querySelector('#analytics-panel').classList.contains('active')) {
                initializeCharts(filteredData, 2011, 2016);
            }
        } catch (error) {
            console.error('Error loading population data:', error);
        }
    }
    
    // Mock API function - replace with actual backend call
    async function getPopulationData() {
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Mock population data based on the screenshots
        return {
            barChartData: {
                years: [2011, 2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021],
                datasets: [
                    {
                        label: 'Melbourne - Inner',
                        data: [180000, 185000, 190000, 195000, 200000, 205000, 210000, 215000, 220000, 225000, 230000],
                        backgroundColor: '#6366f1'
                    },
                    {
                        label: 'Melbourne - Inner East',
                        data: [450000, 455000, 460000, 465000, 470000, 475000, 480000, 485000, 490000, 495000, 500000],
                        backgroundColor: '#10b981'
                    },
                    {
                        label: 'Melbourne - Inner South',
                        data: [300000, 310000, 320000, 330000, 340000, 350000, 360000, 370000, 380000, 390000, 400000],
                        backgroundColor: '#f59e0b'
                    },
                    {
                        label: 'Melbourne - North East',
                        data: [350000, 360000, 380000, 390000, 400000, 410000, 420000, 430000, 440000, 450000, 460000],
                        backgroundColor: '#ef4444'
                    },
                    {
                        label: 'Melbourne - North West',
                        data: [620000, 640000, 670000, 690000, 710000, 730000, 750000, 770000, 790000, 810000, 830000],
                        backgroundColor: '#06b6d4'
                    },
                    {
                        label: 'Melbourne - Outer East',
                        data: [500000, 520000, 540000, 560000, 580000, 600000, 620000, 640000, 660000, 680000, 700000],
                        backgroundColor: '#8b5cf6'
                    },
                    {
                        label: 'Melbourne - South East',
                        data: [650000, 670000, 690000, 710000, 730000, 750000, 770000, 790000, 810000, 830000, 850000],
                        backgroundColor: '#f97316'
                    },
                    {
                        label: 'Melbourne - West',
                        data: [680000, 700000, 720000, 740000, 760000, 780000, 800000, 820000, 840000, 860000, 880000],
                        backgroundColor: '#22d3ee'
                    }
                ]
            },
            lineChartData: {
                years: [2011, 2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021],
                growthRate: [0.0, 2.1, 2.2, 2.3, 2.4, 2.4, 2.3, 2.2, 2.1, 1.8, 2.0]
            },
            totalPopulation: 4026100,
            avgGrowthRate: 2.3,
            yearsAnalyzed: 11
        };
    }
    
    function filterDataByYears(data, fromYear, toYear) {
        if (!data) return null;
        
        const startIndex = data.barChartData.years.indexOf(fromYear);
        const endIndex = data.barChartData.years.indexOf(toYear);
        
        if (startIndex === -1 || endIndex === -1) return data;
        
        const filteredBarData = {
            years: data.barChartData.years.slice(startIndex, endIndex + 1),
            datasets: data.barChartData.datasets.map(dataset => ({
                ...dataset,
                data: dataset.data.slice(startIndex, endIndex + 1)
            }))
        };
        
        const filteredLineData = {
            years: data.lineChartData.years.slice(startIndex, endIndex + 1),
            growthRate: data.lineChartData.growthRate.slice(startIndex, endIndex + 1)
        };
        
        return {
            ...data,
            barChartData: filteredBarData,
            lineChartData: filteredLineData,
            yearsAnalyzed: endIndex - startIndex + 1
        };
    }
}

function initializeCharts(data = null, fromYear = 2011, toYear = 2016) {
    if (!data && currentData) {
        data = filterDataByYears(currentData, fromYear, toYear);
    }
    
    if (!data) return;
    
    // Initialize bar chart
    initializeBarChart(data.barChartData);
    
    // Initialize line chart
    initializeLineChart(data.lineChartData);
    
    // Update stats
    updateStats(data);
}

function initializeBarChart(barData) {
    const ctx = document.getElementById('population-bar-chart');
    if (!ctx) return;
    
    // Destroy existing chart if it exists
    if (charts.barChart) {
        charts.barChart.destroy();
    }
    
    charts.barChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: barData.years,
            datasets: barData.datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        boxWidth: 12,
                        padding: 15,
                        font: {
                            size: 11
                        }
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleColor: '#ffffff',
                    bodyColor: '#ffffff',
                    borderColor: '#6366f1',
                    borderWidth: 1,
                    cornerRadius: 8,
                    callbacks: {
                        label: function(context) {
                            return `${context.dataset.label}: ${context.parsed.y.toLocaleString()}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Year'
                    },
                    grid: {
                        display: false
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Number of People'
                    },
                    ticks: {
                        callback: function(value) {
                            return (value / 1000) + 'k';
                        }
                    }
                }
            }
        }
    });
}

function initializeLineChart(lineData) {
    const ctx = document.getElementById('population-line-chart');
    if (!ctx) return;
    
    // Destroy existing chart if it exists
    if (charts.lineChart) {
        charts.lineChart.destroy();
    }
    
    charts.lineChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: lineData.years,
            datasets: [{
                label: 'Population Growth Rate',
                data: lineData.growthRate,
                borderColor: '#6366f1',
                backgroundColor: 'rgba(99, 102, 241, 0.1)',
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
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                intersect: false,
                mode: 'index'
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleColor: '#ffffff',
                    bodyColor: '#ffffff',
                    borderColor: '#6366f1',
                    borderWidth: 1,
                    cornerRadius: 8,
                    callbacks: {
                        label: function(context) {
                            return `Growth Rate: ${context.parsed.y}%`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Year'
                    },
                    grid: {
                        display: false
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Percentage Change (%)'
                    },
                    min: 0,
                    max: 3,
                    ticks: {
                        callback: function(value) {
                            return value + '%';
                        }
                    }
                }
            }
        }
    });
}

function updateCharts(data, fromYear, toYear) {
    if (charts.barChart) {
        charts.barChart.data.labels = data.barChartData.years;
        charts.barChart.data.datasets = data.barChartData.datasets;
        charts.barChart.update();
    }
    
    if (charts.lineChart) {
        charts.lineChart.data.labels = data.lineChartData.years;
        charts.lineChart.data.datasets[0].data = data.lineChartData.growthRate;
        charts.lineChart.update();
    }
    
    updateStats(data);
}

function updateStats(data) {
    const totalPopulationEl = document.getElementById('total-population');
    const avgGrowthEl = document.getElementById('avg-growth');
    const yearsAnalyzedEl = document.getElementById('years-analyzed');
    
    if (totalPopulationEl) {
        totalPopulationEl.textContent = data.totalPopulation.toLocaleString();
    }
    
    if (avgGrowthEl) {
        avgGrowthEl.textContent = data.avgGrowthRate + '%';
    }
    
    if (yearsAnalyzedEl) {
        yearsAnalyzedEl.textContent = data.yearsAnalyzed;
    }
}
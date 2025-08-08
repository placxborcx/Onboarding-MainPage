// ===== js/main.js =====

// Global variables
let charts = {};
let currentData = null;

// DOM Elements
const tabButtons = document.querySelectorAll('.tab-button');
const functionPanels = document.querySelectorAll('.function-panel');

// Initialize application
document.addEventListener('DOMContentLoaded', function() {
    initializeTabs();
    initializeParkingSearch();
    initializePopulationAnalytics();
});

// Tab functionality
function initializeTabs() {
    tabButtons.forEach(button => {
        button.addEventListener('click', function() {
            const targetTab = this.getAttribute('data-tab');
            switchTab(targetTab);
        });
    });
}

function switchTab(targetTab) {
    // Update active tab button
    tabButtons.forEach(button => {
        button.classList.remove('active');
        if (button.getAttribute('data-tab') === targetTab) {
            button.classList.add('active');
        }
    });
    
    // Update active panel
    functionPanels.forEach(panel => {
        panel.classList.remove('active');
        if (panel.id === targetTab + '-panel') {
            panel.classList.add('active');
        }
    });
    
    // Initialize charts if switching to analytics tab
    if (targetTab === 'analytics' && !charts.barChart) {
        setTimeout(() => {
            initializeCharts();
        }, 100);
    }
}

/** Cache DOM nodes */
const tabButtons = document.querySelectorAll('.tab-button');
const functionPanels = document.querySelectorAll('.function-panel');

/** Boot */
document.addEventListener('DOMContentLoaded', () => {
  initializeTabs();
  initializeNavbarTabs();
  initializeParkingSearch();        // from parking-search.js
  initializePopulationAnalytics();  // from population-analytics.js (data + filter wiring)
});

/** Setup lower tab buttons */
function initializeTabs() {
  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      const targetTab = button.getAttribute('data-tab');
      switchTab(targetTab);

      // reflect active on navbar
      document.querySelectorAll('.nav-link').forEach(l => {
        l.classList.toggle('active', l.getAttribute('data-tab') === targetTab);
      });
    });
  });
}

/** Setup navbar tabs to switch tabs */
function initializeNavbarTabs() {
  document.querySelectorAll('.top-tab[data-tab]').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const targetTab = link.getAttribute('data-tab');
      switchTab(targetTab);

      // set top tab active
      document.querySelectorAll('.top-tab').forEach(l => l.classList.remove('active'));
      link.classList.add('active');
    });
  });
}

/** Core tab switcher */
function switchTab(targetTab) {
  // buttons active state
  tabButtons.forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-tab') === targetTab);
  });

  // panels active state
  functionPanels.forEach(panel => {
    panel.classList.toggle('active', panel.id === `${targetTab}-panel`);
  });

  // ensure analytics charts are initialized when switching in
  if (targetTab === 'analytics' && window.PopulationAnalytics) {
    window.PopulationAnalytics.ensureInitialized();
  }
}

function initializeParkingSearch() {
  // ---- Hook up DOM ----
  const locationInput  = document.getElementById('location-input');
  const findParkingBtn = document.getElementById('find-parking-btn');
  const loadingState   = document.getElementById('loading');
  const resultsSection = document.getElementById('results-section');
  const noResults      = document.getElementById('no-results');
  const parkingList    = document.getElementById('parking-list');

  if (!locationInput || !findParkingBtn) return; // panel not present

  // Avoid double-binding if this runs twice
  if (window.__parkingSearchBound) return;
  window.__parkingSearchBound = true;

  findParkingBtn.addEventListener('click', handleParkingSearch);
  locationInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleParkingSearch();
  });

  // ---- API config (adjust if needed) ----
  const API_BASE = "https://tbbtxhv865.execute-api.ap-southeast-2.amazonaws.com";
  const PATH     = "/api/parking/nearby";

  let inFlight; // AbortController to cancel previous search

  async function handleParkingSearch() {
    const q = (locationInput.value || "").trim();
    if (!q) {
      alert("Please enter a location to search for parking.");
      return;
    }

    // cancel any previous request
    if (inFlight) inFlight.abort();
    inFlight = new AbortController();

    hideAllStates();
    loadingState.classList.remove('hidden');

    try {
      const data = await fetchNearbyByAddress(q, inFlight.signal);
      const { bands, center } = normalizeToBands(data);

      const hasAny =
        (bands.within_100m && bands.within_100m.length) ||
        (bands["100_to_200m"] && bands["100_to_200m"].length) ||
        (bands["200_to_500m"] && bands["200_to_500m"].length) ||
        (bands["500_to_1000m"] && bands["500_to_1000m"].length);

      if (hasAny) {
        renderBands(parkingList, bands, center);
        resultsSection.classList.remove('hidden');
      } else {
        noResults.classList.remove('hidden');
      }
    } catch (err) {
      if (err.name === 'AbortError') return; // ignore cancelled request
      console.error('[parking] search error:', err);
      alert(err.message || 'Search failed. Please try again.');
    } finally {
      loadingState.classList.add('hidden');
    }
  }

  function hideAllStates() {
    loadingState.classList.add('hidden');
    resultsSection.classList.add('hidden');
    noResults.classList.add('hidden');
    if (parkingList) parkingList.innerHTML = '';
  }

  // ---- Fetch ----
  async function fetchNearbyByAddress(address, signal) {
    const url = `${API_BASE}${PATH}?q=${encodeURIComponent(address)}`;
    const res = await fetch(url, { method: 'GET', signal });

    // try JSON first; if not JSON, throw the plain text
    let body;
    try {
      body = await res.json();
    } catch {
      const text = await res.text();
      throw new Error(text || `HTTP ${res.status}`);
    }

    if (!res.ok || body?.success === false) {
      throw new Error(body?.error || body?.message || `HTTP ${res.status}`);
    }
    return body;
  }

  // ---- Normalization: support both “grouped” and “flat” shapes ----
  function normalizeToBands(payload) {
    // If already grouped from backend
    if (payload && payload.results && !Array.isArray(payload.results)) {
      return {
        bands: payload.results,
        center: payload.center || null
      };
    }

    // Otherwise, convert flat list -> bands
    const flat = Array.isArray(payload?.results) ? payload.results : [];
    const bands = {
      within_100m:  [],
      "100_to_200m": [],
      "200_to_500m": [],
      "500_to_1000m": []
    };

    for (const item of flat) {
      // Expecting {coordinates:{lat,lng}, distance:"0.12 km", ...}
      const lat = item?.coordinates?.lat ?? item?.lat ?? null;
      const lon = item?.coordinates?.lng ?? item?.lon ?? null;
      const distM = toMeters(item?.distance);

      if (lat == null || lon == null || distM == null) continue;

      const bay = {
        distance_m: distM,
        lat: +lat,
        lon: +lon,
        kerbsideid: item?.kerbsideid ?? null,
        status_description: item?.status_description ?? item?.status ?? null,
        status_timestamp: item?.status_timestamp ?? null,
        lastupdated: item?.lastupdated ?? null,
        zone_number: item?.zone_number ?? null
      };

      if (distM <= 100) bands.within_100m.push(bay);
      else if (distM <= 200) bands["100_to_200m"].push(bay);
      else if (distM <= 500) bands["200_to_500m"].push(bay);
      else if (distM <= 1000) bands["500_to_1000m"].push(bay);
    }

    Object.keys(bands).forEach(k => bands[k].sort((a,b)=>a.distance_m-b.distance_m));

    // Try to pass center if present on payload
    const center = payload?.center || null;
    return { bands, center };
  }

  function toMeters(distance) {
    // Accepts "238.7 m", "0.12 km", 250, "250", etc.
    if (distance == null) return null;
    if (typeof distance === 'number') return distance;
    if (typeof distance !== 'string') return null;

    const v = distance.trim().toLowerCase();
    // try km
    const km = v.match(/^([\d.]+)\s*km$/i);
    if (km) return Math.round(parseFloat(km[1]) * 1000);
    // try m
    const m = v.match(/^([\d.]+)\s*m$/i);
    if (m) return Math.round(parseFloat(m[1]));
    // fallback: parse as number
    const n = parseFloat(v);
    return isNaN(n) ? null : n;
  }

  // ---- Renderers ----
  function renderBands(container, bands, center) {
    container.innerHTML = '';

    const order = [
      ['within_100m',  'Within 100 m'],
      ['100_to_200m',  '100–200 m'],
      ['200_to_500m',  '200–500 m'],
      ['500_to_1000m', '500–1000 m']
    ];

    // Optional: show search center if available
    if (center && typeof center.lat === 'number' && typeof center.lon === 'number') {
      const hint = document.createElement('div');
      hint.className = 'search-center-hint';
      hint.textContent = `Search center: (${center.lat.toFixed(5)}, ${center.lon.toFixed(5)})`;
      container.appendChild(hint);
    }

    order.forEach(([key, label]) => {
      const items = bands[key] || [];
      const section = document.createElement('div');
      section.className = 'band-section';

      const header = document.createElement('h3');
      header.className = 'band-title';
      header.textContent = `${label} (${items.length})`;
      section.appendChild(header);

      if (!items.length) {
        const empty = document.createElement('div');
        empty.className = 'band-empty';
        empty.textContent = 'No bays found in this range.';
        section.appendChild(empty);
      } else {
        const list = document.createElement('div');
        list.className = 'band-list';
        items.forEach(item => list.appendChild(createBayCard(item)));
        section.appendChild(list);
      }

      container.appendChild(section);
    });
  }

  function createBayCard(bay) {
    // bay fields: distance_m, lat, lon, kerbsideid, status_description, status_timestamp, lastupdated, zone_number
    const card = document.createElement('div');
    card.className = 'parking-item';

    const status = (bay.status_description || '').toLowerCase();
    const badgeClass =
      status.includes('unoccupied') ? 'success' :
      status.includes('present')    ? 'danger'  : 'warning';

    const gm = `https://www.google.com/maps/dir/?api=1&destination=${bay.lat},${bay.lon}`;

    card.innerHTML = `
      <div class="parking-header">
        <div>
          <div class="parking-name">Bay #${bay.kerbsideid ?? 'N/A'}</div>
          <div class="parking-address">📍 ${bay.lat.toFixed(6)}, ${bay.lon.toFixed(6)}</div>
        </div>
        <div class="parking-availability ${badgeClass}">
          ${formatMeters(bay.distance_m)}
        </div>
      </div>
      <div class="parking-details">
        <div class="parking-info">
          <div class="info-item"><span>🕒</span><span>${formatTime(bay.status_timestamp || bay.lastupdated)}</span></div>
          <div class="info-item"><span>🚦</span><span>${bay.status_description || 'Unknown'}</span></div>
          <div class="info-item"><span>🧭</span><span>Zone ${bay.zone_number ?? '—'}</span></div>
        </div>
        <a href="${gm}" target="_blank" class="navigate-btn">Open in Maps</a>
      </div>
    `;
    return card;
  }

  // ---- Utils ----
  function formatMeters(m) {
    if (m == null || isNaN(m)) return '—';
    if (m < 1000) return `${Math.round(m)} m`;
    return `${(m / 1000).toFixed(2)} km`;
  }

  function formatTime(iso) {
    if (!iso) return '—';
    try {
      const d = new Date(iso);
      if (isNaN(d.getTime())) return iso;
      return d.toLocaleString();
    } catch {
      return iso;
    }
  }
}

/*
// Parking search feature (real API, grouped bands)

function initializeParkingSearch() {
  const locationInput  = document.getElementById('location-input');
  const findParkingBtn = document.getElementById('find-parking-btn');
  const loadingState   = document.getElementById('loading');
  const resultsSection = document.getElementById('results-section');
  const noResults      = document.getElementById('no-results');
  const parkingList    = document.getElementById('parking-list'); // container for results

  if (!locationInput || !findParkingBtn) return;

  findParkingBtn.addEventListener('click', handleParkingSearch);
  locationInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleParkingSearch();
  });

  async function handleParkingSearch() {
    const q = locationInput.value.trim();
    if (!q) {
      alert('Please enter a location to search for parking.');
      return;
    }

    hideAllStates();
    loadingState.classList.remove('hidden');

    try {
      const data = await fetchNearbyByAddress(q);
      const bands = (data && data.results) || {};
      const hasAny =
        (bands.within_100m && bands.within_100m.length) ||
        (bands["100_to_200m"] && bands["100_to_200m"].length) ||
        (bands["200_to_500m"] && bands["200_to_500m"].length) ||
        (bands["500_to_1000m"] && bands["500_to_1000m"].length);

      if (hasAny) {
        renderBands(parkingList, bands, data.center);
        resultsSection.classList.remove('hidden');
      } else {
        noResults.classList.remove('hidden');
      }
    } catch (err) {
      console.error('Error searching for parking:', err);
      alert(err.message || 'Search failed. Please try again.');
    } finally {
      loadingState.classList.add('hidden');
    }
  }

  function hideAllStates() {
    loadingState.classList.add('hidden');
    resultsSection.classList.add('hidden');
    noResults.classList.add('hidden');
    if (parkingList) parkingList.innerHTML = '';
  }

  // ==== API ====
  const API_BASE = "https://tbbtxhv865.execute-api.ap-southeast-2.amazonaws.com";
  const PATH = "/api/parking/nearby"


  async function fetchNearbyByAddress(address) {
    const url = `${API_BASE}${PATH}?q=${encodeURIComponent(address)}`;
    const res = await fetch(url, { method: 'GET' });
    const body = await res.json().catch(async () => { throw new Error(await res.text()); });
    if (!res.ok || body.success === false) throw new Error(body.error || `HTTP ${res.status}`);
    return body;
  }

  // ==== Renderers ====

  function renderBands(container, bands, center) {
    container.innerHTML = '';

    const order = [
      ['within_100m',  'Within 100 m'],
      ['100_to_200m',  '100–200 m'],
      ['200_to_500m',  '200–500 m'],
      ['500_to_1000m', '500–1000 m']
    ];

    order.forEach(([key, label]) => {
      const items = bands[key] || [];
      const section = document.createElement('div');
      section.className = 'band-section';

      const header = document.createElement('h3');
      header.className = 'band-title';
      header.textContent = `${label} (${items.length})`;
      section.appendChild(header);

      if (!items.length) {
        const empty = document.createElement('div');
        empty.className = 'band-empty';
        empty.textContent = 'No bays found in this range.';
        section.appendChild(empty);
      } else {
        const list = document.createElement('div');
        list.className = 'band-list';
        items.forEach(item => {
          list.appendChild(createBayCard(item));
        });
        section.appendChild(list);
      }

      container.appendChild(section);
    });

    // optional: show searched center
    if (center && typeof center.lat === 'number' && typeof center.lon === 'number') {
      const hint = document.createElement('div');
      hint.className = 'search-center-hint';
      hint.textContent = `Search center: (${center.lat.toFixed(5)}, ${center.lon.toFixed(5)})`;
      container.prepend(hint);
    }
  }

  function createBayCard(bay) {
    // bay fields from backend: distance_m, lat, lon, kerbsideid, status_description, status_timestamp, lastupdated, zone_number
    const card = document.createElement('div');
    card.className = 'parking-item';

    const status = (bay.status_description || '').toLowerCase();
    const badgeClass =
      status.includes('unoccupied') ? 'success' :
      status.includes('present')    ? 'danger'  : 'warning';

    const gm = `https://www.google.com/maps/dir/?api=1&destination=${bay.lat},${bay.lon}`;

    card.innerHTML = `
      <div class="parking-header">
        <div>
          <div class="parking-name">Bay #${bay.kerbsideid ?? 'N/A'}</div>
          <div class="parking-address">📍 ${bay.lat.toFixed(6)}, ${bay.lon.toFixed(6)}</div>
        </div>
        <div class="parking-availability ${badgeClass}">
          ${formatMeters(bay.distance_m)}
        </div>
      </div>

      <div class="parking-details">
        <div class="parking-info">
          <div class="info-item"><span>🕒</span><span>${formatTime(bay.status_timestamp || bay.lastupdated)}</span></div>
          <div class="info-item"><span>🚦</span><span>${bay.status_description || 'Unknown'}</span></div>
          <div class="info-item"><span>🧭</span><span>Zone ${bay.zone_number ?? '—'}</span></div>
        </div>
        <a href="${gm}" target="_blank" class="navigate-btn">Open in Maps</a>
      </div>
    `;
    return card;
  }

  // ==== Utils ====
  function formatMeters(m) {
    if (m == null || isNaN(m)) return '—';
    if (m < 1000) return `${Math.round(m)} m`;
    return `${(m / 1000).toFixed(2)} km`;
  }

  function formatTime(iso) {
    if (!iso) return '—';
    try {
      const d = new Date(iso);
      if (isNaN(d.getTime())) return iso;
      return d.toLocaleString();
    } catch {
      return iso;
    }
  }
}


//////////////////////////////////////////////////////////////end code
// Parking search feature (mocked API)

function initializeParkingSearch() {
    const locationInput = document.getElementById('location-input');
    const findParkingBtn = document.getElementById('find-parking-btn');
    const loadingState = document.getElementById('loading');
    const resultsSection = document.getElementById('results-section');
    const noResults = document.getElementById('no-results');
    const parkingList = document.getElementById('parking-list');
  
    if (!locationInput || !findParkingBtn) return; // guard in case panel not present
  
    findParkingBtn.addEventListener('click', handleParkingSearch);
    locationInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') handleParkingSearch();
    });
  
    async function handleParkingSearch() {
      const location = locationInput.value.trim();
      if (!location) {
        alert('Please enter a location to search for parking.');
        return;
      }
  
      hideAllStates();
      loadingState.classList.remove('hidden');
  
      try {
        const parkingData = await searchParkingSpaces(location);
        if (parkingData && parkingData.length > 0) {
          displayParkingResults(parkingData);
          resultsSection.classList.remove('hidden');
        } else {
          noResults.classList.remove('hidden');
        }
      } catch (err) {
        console.error('Error searching for parking:', err);
        alert('Error occurred while searching for parking. Please try again.');
      } finally {
        loadingState.classList.add('hidden');
      }
    }
  
    function hideAllStates() {
      loadingState.classList.add('hidden');
      resultsSection.classList.add('hidden');
      noResults.classList.add('hidden');
    }
  
    // REAL API
const API_BASE = "https://xbtfcqbgeh.execute-api.ap-southeast-2.amazonaws.com/api";
const PATH = "/parking/search";

async function searchParkingSpaces(location) {
  const url = `${API_BASE}${PATH}?location=${encodeURIComponent(location)}`;
  console.log("[parking] GET", url);
  const res = await fetch(url, {
    method: "GET",
    // No custom headers = no CORS preflight headaches
  });

  // Helpful console diagnostics
  console.log("[parking] status", res.status, res.statusText);

  let data;
  try {
    data = await res.json();
  } catch (e) {
    const text = await res.text();
    console.error("[parking] Non-JSON response:", text);
    throw new Error(`API returned non-JSON (${res.status})`);
  }

  console.log("[parking] body", data);

  if (!res.ok) {
    const msg = (data && (data.message || data.error)) || `HTTP ${res.status}`;
    throw new Error(msg);
  }

  // Expect shape: { results: [...], total, message }
  if (Array.isArray(data.results)) return data.results;

  return [];
}

  
    function displayParkingResults(parkingData) {
      parkingList.innerHTML = '';
      parkingData.forEach(p => parkingList.appendChild(createParkingItem(p)));
    }
  
    function createParkingItem(parking) {
      const item = document.createElement('div');
      item.className = 'parking-item';
  
      const availabilityClass =
        parking.availableSpaces > 20 ? 'success' :
        parking.availableSpaces > 5  ? 'warning' : 'danger';
  
      const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${parking.coordinates.lat},${parking.coordinates.lng}`;
  
      item.innerHTML = `
        <div class="parking-header">
          <div>
            <div class="parking-name">${parking.name}</div>
            <div class="parking-address">📍 ${parking.address}</div>
          </div>
          <div class="parking-availability ${availabilityClass}">
            ${parking.availableSpaces} available
          </div>
        </div>
        <div class="parking-details">
          <div class="parking-info">
            <div class="info-item"><span>📏</span><span>${parking.distance}</span></div>
            <div class="info-item"><span>🚗</span><span>${parking.availableSpaces}/${parking.totalSpaces} spaces</span></div>
            <div class="info-item"><span>💰</span><span>${parking.price}</span></div>
          </div>
          <a href="${googleMapsUrl}" target="_blank" class="navigate-btn"><span>🧭</span>Navigate</a>
        </div>
      `;
      return item;
    }
  }
  
*/
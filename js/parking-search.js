function initializeParkingSearch() {
  // ---- Hook up DOM ----
  const locationInput  = document.getElementById('location-input');
  const findParkingBtn = document.getElementById('find-parking-btn');
  const loadingState   = document.getElementById('loading');
  const resultsSection = document.getElementById('results-section');
  const noResults      = document.getElementById('no-results');
  const parkingList    = document.getElementById('parking-list');

  if (!locationInput || !findParkingBtn) return;
  if (window.__parkingSearchBound) return;
  window.__parkingSearchBound = true;

  // ---- API config ----
  const API_BASE = "https://tbbtxhv865.execute-api.ap-southeast-2.amazonaws.com";
  const PATH     = "/api/parking/nearby";

  // ---- Mapbox config ----
  const MAPBOX_TOKEN   = "pk.eyJ1IjoibGVvbi0xMzIiLCJhIjoiY21lNmt3MDU5MHE1NzJzcHI3bnI4dnBuaiJ9.bGUrNp8xR2edF6INiJYwww";
  const REQUIRE_EXACT  = false;                               // force user to choose from dropdown (if true)
  const SEARCH_CENTER  = { lon: 144.9631, lat: -37.8136 };    // CBD
  const MAX_RADIUS_KM  = 40;                                  // keep suggestions to Greater Melbourne

  let chosen = null;  // the picked suggestion
  let lastBands = null, lastCenter = null;

  // ---- Sort control ----
  const sortWrap = document.createElement('div');
  sortWrap.style.margin = '10px 0';
  sortWrap.innerHTML = `
    <label style="font-weight:600;margin-right:8px;">Sort by:</label>
    <select id="sort-mode">
      <option value="distance">Distance (default)</option>
      <option value="maxstay">Longest stay</option>
    </select>`;
  resultsSection?.insertAdjacentElement('afterbegin', sortWrap);
  const sortSelect = sortWrap.querySelector('#sort-mode');
  sortSelect.addEventListener('change', () => {
    if (lastBands) renderBands(parkingList, lastBands, lastCenter, sortSelect.value);
  });

  // ---- Dropdown UI under input ----
  const dropdown = document.createElement('div');
  dropdown.className = 'ac-list ac-hidden';
  const parent = locationInput.parentElement;
  if (getComputedStyle(parent).position === 'static') parent.style.position = 'relative';
  parent.appendChild(dropdown);

  findParkingBtn.addEventListener('click', handleParkingSearch);
  locationInput.addEventListener('input', handleSuggestInput);
  locationInput.addEventListener('focus', () => { if (dropdown.__items?.length) dropdown.classList.remove('ac-hidden'); });
  locationInput.addEventListener('blur',  () => setTimeout(()=>dropdown.classList.add('ac-hidden'), 120));
  locationInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      if (!dropdown.classList.contains('ac-hidden') && (dropdown.__hi ?? -1) >= 0) {
        e.preventDefault();
        selectItem(dropdown.__items[dropdown.__hi]);
        return;
      }
      handleParkingSearch();
    }
    if (dropdown.classList.contains('ac-hidden') || !(dropdown.__items||[]).length) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); moveHighlight(1); }
    if (e.key === 'ArrowUp')   { e.preventDefault(); moveHighlight(-1); }
  });

  function iconFor(type) {
    switch (type) {
      case 'address': return '🏠';
      case 'poi': return '📍';
      case 'place':
      case 'locality': return '🗺️';
      case 'neighborhood':
      case 'district': return '🏙️';
      case 'postcode': return '🏷️';
      default: return '📌';
    }
  }

  function moveHighlight(delta) {
    const n = dropdown.__items.length;
    dropdown.__hi = ((dropdown.__hi ?? -1) + delta + n) % n;
    renderDropdown(dropdown.__items);
  }

  let suggestDebounce, suggestInFlight;
  async function handleSuggestInput() {
    const q = (locationInput.value || '').trim();
    chosen = null; // typing resets current selection
    if (suggestDebounce) clearTimeout(suggestDebounce);
    if (!q) { dropdown.classList.add('ac-hidden'); dropdown.__items = []; return; }

    suggestDebounce = setTimeout(async () => {
      if (suggestInFlight) suggestInFlight.abort();
      suggestInFlight = new AbortController();
      try {
        const items = await mapboxSuggest(q, { signal: suggestInFlight.signal });
        dropdown.__items = items;
        dropdown.__hi = items.length ? 0 : -1;
        renderDropdown(items);
      } catch (e) { /* ignore */ }
    }, 150);
  }

  function renderDropdown(items) {
    dropdown.innerHTML = '';
    if (!items.length) { dropdown.classList.add('ac-hidden'); return; }
    dropdown.classList.remove('ac-hidden');
    items.forEach((it, idx) => {
      const row = document.createElement('div');
      row.className = 'ac-item' + (idx === (dropdown.__hi ?? -1) ? ' ac-active' : '');
      row.innerHTML = `
        <div class="ac-ico">${iconFor(it.type)}</div>
        <div class="ac-text">
          <div class="ac-title">${it.primary}</div>
          <div class="ac-sub">${it.secondary}</div>
        </div>`;
      row.addEventListener('mousedown', (e)=>{ e.preventDefault(); selectItem(it); });
      dropdown.appendChild(row);
    });
  }

  function selectItem(it) {
    chosen = it;
    locationInput.value = it.label; // show full place name
    dropdown.classList.add('ac-hidden');
  }

  // ---- Search flow ----
  let inFlight;
  async function handleParkingSearch() {
    const q = (locationInput.value || "").trim();
    if (!q) { alert("Please enter a location to search for parking."); return; }
    if (REQUIRE_EXACT && !chosen) {
      alert("Please choose a suggestion from the list for an exact location.");
      dropdown.classList.remove('ac-hidden');
      return;
    }
    if (inFlight) inFlight.abort();
    inFlight = new AbortController();

    hideAllStates();
    // Hide features section when search starts
    const featuresSection = document.querySelector('.features-section');
    if (featuresSection) {
        featuresSection.style.display = 'none';
    }
    loadingState.classList.remove('hidden');

    try {
      const url = chosen && Number.isFinite(chosen.lat) && Number.isFinite(chosen.lon)
        ? `${API_BASE}${PATH}?lat=${encodeURIComponent(chosen.lat)}&lon=${encodeURIComponent(chosen.lon)}`
        : `${API_BASE}${PATH}?q=${encodeURIComponent(q)}`;

      const data = await fetchJson(url, inFlight.signal);
      const { bands, center } = normalizeToBands(data);

      // remember for resorting
      lastBands = bands; lastCenter = center;

      // initial render (respect sort selector)
      renderBands(parkingList, bands, center, sortSelect.value);

      const hasAny =
        (bands.within_100m?.length) ||
        (bands["100_to_200m"]?.length) ||
        (bands["200_to_500m"]?.length) ||
        (bands["500_to_1000m"]?.length);

      if (hasAny) {
        resultsSection.classList.remove('hidden');
      } else {
        noResults.classList.remove('hidden');
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('[parking] search error:', err);
        alert(err.message || 'Search failed. Please try again.');
      }
    } finally {
      loadingState.classList.add('hidden');
    }
  }

  function hideAllStates() {
    loadingState.classList.add('hidden');
    resultsSection.classList.add('hidden');
    noResults.classList.add('hidden');
    if (parkingList) parkingList.innerHTML = '';

    // Show features section when clearing results
    const featuresSection = document.querySelector('.features-section');
    if (featuresSection) {
        featuresSection.style.display = 'block';
    }
  }

  // ---- Fetch helper ----
  async function fetchJson(url, signal) {
    const res = await fetch(url, { method: 'GET', signal });
    let body;
    try { body = await res.json(); }
    catch {
      const text = await res.text().catch(()=> '');
      throw new Error(text || `HTTP ${res.status}`);
    }
    if (!res.ok || body?.success === false || (typeof body?.error === 'string' && body.error)) {
      throw new Error(body?.error || `HTTP ${res.status}`);
    }
    return body;
  }

  // ---- Mapbox suggest (POIs + addresses) ----
  async function mapboxSuggest(q, {signal} = {}) {
    const base = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json`;
    const common =
      `access_token=${MAPBOX_TOKEN}` +
      `&country=AU` +
      `&proximity=${SEARCH_CENTER.lon},${SEARCH_CENTER.lat}` +
      `&autocomplete=true&limit=10&language=en`;

    // pass 1: POIs (shops/venues/restaurants)
    let url = `${base}?${common}&types=poi`;
    let res = await fetch(url, { signal });
    let data = await res.json();

    // pass 2: add addresses/places if nothing solid
    if (!res.ok || !(data.features || []).length) {
      url = `${base}?${common}&types=poi,address,place,locality,neighborhood,postcode,district`;
      res = await fetch(url, { signal });
      data = await res.json();
      if (!res.ok) throw new Error(data?.message || `HTTP ${res.status}`);
    }

    // keep within Greater Melbourne
    const feats = (data.features || []).filter(f => {
      const [lon, lat] = f.center || [];
      if (lat == null || lon == null) return false;
      return km(SEARCH_CENTER.lat, SEARCH_CENTER.lon, lat, lon) <= MAX_RADIUS_KM;
    });

    // re-rank by name match, then distance to CBD
    feats.sort((a,b) => {
      const sa = scoreMatch(q, a);
      const sb = scoreMatch(q, b);
      if (sb !== sa) return sb - sa;
      const da = km(SEARCH_CENTER.lat, SEARCH_CENTER.lon, a.center[1], a.center[0]);
      const db = km(SEARCH_CENTER.lat, SEARCH_CENTER.lon, b.center[1], b.center[0]);
      return da - db;
    });

    return feats.map(f => ({
      id: f.id,
      label: f.place_name,
      primary: f.text,
      secondary: extractCategory(f) || (f.context||[]).map(c=>c.text).join(" • "),
      lat: f.center?.[1],
      lon: f.center?.[0],
      type: (f.place_type && f.place_type[0]) || 'poi'
    }));
  }

  // helpers for suggest ranking
  function km(aLat, aLon, bLat, bLon) {
    const R = 6371, toRad = d => d * Math.PI/180;
    const dLat = toRad(bLat - aLat), dLon = toRad(bLon - aLon);
    const s = Math.sin(dLat/2)**2 + Math.cos(toRad(aLat))*Math.cos(toRad(bLat))*Math.sin(dLon/2)**2;
    return 2*R*Math.asin(Math.sqrt(s));
  }
  function scoreMatch(q, f) {
    const qTokens = q.toLowerCase().split(/\s+/).filter(Boolean);
    const name = (f.text || "").toLowerCase();
    const full = (f.place_name || "").toLowerCase();
    let hits = 0, starts = 0;
    for (const t of qTokens) {
      if (name.includes(t) || full.includes(t)) {
        hits++;
        if (name.startsWith(t) || full.startsWith(t)) starts++;
      }
    }
    const exact = name === q.toLowerCase() ? 1 : 0;
    return exact*100 + starts*10 + hits;
  }
  function extractCategory(f) {
    const p = f.properties || {};
    const cats = p.category || p.categories || p.poi_category || p.maki;
    return Array.isArray(cats) ? cats.join(", ") : (cats || "");
  }

  // ---- Normalization ----
  function normalizeToBands(payload) {
    if (payload && payload.bands) {
      return { bands: payload.bands, center: payload.center || null };
    }
    if (payload && payload.results && !Array.isArray(payload.results)) {
      return { bands: payload.results, center: payload.center || null };
    }
    const flat = Array.isArray(payload?.results) ? payload.results : [];
    const bands = {
      within_100m:  [],
      "100_to_200m": [],
      "200_to_500m": [],
      "500_to_1000m": []
    };
    for (const item of flat) {
      const lat = item?.coordinates?.lat ?? item?.lat ?? null;
      const lon = item?.coordinates?.lng ?? item?.lon ?? null;
      const distM = toMeters(item?.distance) ?? item?.distance_m ?? null;
      if (lat == null || lon == null || distM == null) continue;
      const bay = {
        distance_m: +distM,
        lat: +lat,
        lon: +lon,
        kerbsideid: item?.kerbsideid ?? null,
        status_description: item?.status_description ?? item?.status ?? null,
        status_timestamp: item?.status_timestamp ?? null,
        lastupdated: item?.lastupdated ?? null,
        zone_number: item?.zone_number ?? null,
        street: item?.street ?? null,
        max_stay_label: item?.max_stay_label ?? null,
        max_stay_min: item?.max_stay_min ?? null,
        metered: !!item?.metered,
      };
      if (bay.distance_m <= 100) bands.within_100m.push(bay);
      else if (bay.distance_m <= 200) bands["100_to_200m"].push(bay);
      else if (bay.distance_m <= 500) bands["200_to_500m"].push(bay);
      else if (bay.distance_m <= 1000) bands["500_to_1000m"].push(bay);
    }
    Object.keys(bands).forEach(k => bands[k].sort((a,b)=>a.distance_m-b.distance_m));
    return { bands, center: payload?.center || null };
  }

  function toMeters(distance) {
    if (distance == null) return null;
    if (typeof distance === 'number') return distance;
    if (typeof distance !== 'string') return null;
    const v = distance.trim().toLowerCase();
    const km = v.match(/^([\d.]+)\s*km$/i);
    if (km) return Math.round(parseFloat(km[1]) * 1000);
    const m = v.match(/^([\d.]+)\s*m$/i);
    if (m) return Math.round(parseFloat(m[1]));
    const n = parseFloat(v);
    return isNaN(n) ? null : n;
  }

  // ---- Renderers ----
  function renderBands(container, bands, center, sortMode = 'distance') {
    container.innerHTML = '';
    const order = [
      ['within_100m',  'Within 100 m'],
      ['100_to_200m',  '100–200 m'],
      ['200_to_500m',  '200–500 m'],
      ['500_to_1000m', '500–1000 m']
    ];

    if (center && typeof center.lat === 'number' && typeof center.lon === 'number') {
      const hint = document.createElement('div');
      hint.className = 'search-center-hint';
      hint.textContent = `Search center: (${center.lat.toFixed(5)}, ${center.lon.toFixed(5)})`;
      container.appendChild(hint);
    }

    // comparator for "Longest stay" (desc), tie-breaker distance (asc)
    const byMaxStay = (a, b) => {
      const av = a.max_stay_min ?? -1;
      const bv = b.max_stay_min ?? -1;
      if (av !== bv) return bv - av;
      return (a.distance_m ?? 1e9) - (b.distance_m ?? 1e9);
    };

    order.forEach(([key, label]) => {
      const items = (bands[key] || []).slice(); // clone (don’t mutate original)
      if (sortMode === 'maxstay') items.sort(byMaxStay);

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
    const card = document.createElement('div');
    card.className = 'parking-item';

    const s = (bay.status_description || '').toLowerCase();
    const isAvail = s.includes('unoccupied');
    const statusText = isAvail ? 'Available' : 'Unavailable';
    const badgeClass = isAvail ? 'success' : 'danger';

    const gm = `https://www.google.com/maps/dir/?api=1&destination=${bay.lat},${bay.lon}`;
    const street = bay.street || `Bay #${bay.kerbsideid ?? 'N/A'}`;

    const meterBadge = bay.metered ? `<span class="pill">Metered</span>` : '';
    const maxStay = bay.max_stay_label ? `<span class="pill">${bay.max_stay_label}</span>` : '';

    card.innerHTML = `
      <div class="parking-header">
        <div>
          <div class="parking-name">${street}</div>
          <div class="parking-address">📍 ${bay.lat.toFixed(6)}, ${bay.lon.toFixed(6)}</div>
        </div>
        <div class="parking-availability ${badgeClass}">
          ${formatMeters(bay.distance_m)}
        </div>
      </div>
      <div class="parking-details">
        <div class="parking-info">
          <div class="info-item"><span>🕒</span><span>${formatTime(bay.status_timestamp || bay.lastupdated)}</span></div>
          <div class="info-item"><span>🚦</span><span>${statusText}</span></div>
          <div class="info-item"><span>🧭</span><span>Zone ${bay.zone_number ?? '—'}</span></div>
          <div class="info-item"><span>⏳</span><span>${maxStay || '—'}</span></div>
          <div class="info-item"><span>💳</span><span>${meterBadge || '—'}</span></div>
        </div>
        <a href="${gm}" target="_blank" class="navigate-btn">Open in Maps</a>
      </div>
    `;
    return card;
  }

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

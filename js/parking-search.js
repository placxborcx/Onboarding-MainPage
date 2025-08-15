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

   
    const flat = Array.isArray(payload?.results)
      ? payload.results
      : (Array.isArray(payload) ? payload : []);

    const bands = {
      within_100m: [],
      "100_to_200m": [],
      "200_to_500m": [],
      "500_to_1000m": []
    };

    for (const item of flat) {
      const lat   = item?.coordinates?.lat ?? item?.lat ?? null;
      const lon   = item?.coordinates?.lng ?? item?.lon ?? null;
      const distM = toMeters(item?.distance) ?? item?.distance_m ?? null;
      if (lat == null || lon == null || distM == null) continue;

         // accept any of these keys coming from the API
      const segDesc =
        item?.segment_description ??
        item?.segmentDescription ??
        item?.segment_desc ??
        null;

      const available = (typeof item?.availableSpaces === 'number') ? item.availableSpaces : null;
      const total     = (typeof item?.totalSpaces === 'number') ? item.totalSpaces : null;

      
      let status = null;
      if (available != null) {
        status = available > 0 ? 'unoccupied' : 'occupied';
      } else {
        status = item?.status_description ?? item?.status ?? null;
      }

      const bay = {
        distance_m: +distM,
        lat: +lat,
        lon: +lon,

        name: item?.name ?? null,

        availableSpaces: available,
        totalSpaces: total,

        kerbsideid: item?.kerbsideid ?? null,
        status_description: status,
        status_timestamp: item?.status_timestamp ?? null,
        lastupdated: item?.lastupdated ?? null,
        zone_number: item?.zone_number ?? null,
        street: item?.street ?? null,
        max_stay_label: item?.max_stay_label ?? null,
        max_stay_min: item?.max_stay_min ?? null,
        metered: !!item?.metered,
        price: item?.price ?? null,
        address: item?.address ?? null
        street: item?.street ?? null,
        segment_description: segDesc,  // <— keep it
      };
      


      if (bay.distance_m <= 100) bands.within_100m.push(bay);
      else if (bay.distance_m <= 200) bands["100_to_200m"].push(bay);
      else if (bay.distance_m <= 500) bands["200_to_500m"].push(bay);
      else if (bay.distance_m <= 1000) bands["500_to_1000m"].push(bay);
    }

    Object.keys(bands).forEach(k => bands[k].sort((a, b) => a.distance_m - b.distance_m));
    return { bands, center: payload?.center || null };
  }

  // ---- Normalization previous version 0815 1254----
  /*
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

  */

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

// new version
  // IMPORTANT: Lock this key down to your domain in Google Cloud (HTTP referrer restrictions).
const GOOGLE_MAPS_API_KEY = "AIzaSyAGZ4lmkAg-qNxKmSZvZe9VeGG8uEYT_s4";

// In-memory cache for this session
const addrMemCache = new Map();

// Build a concise address like "123 Collins St, Melbourne, VIC"
function formatShortAddress(geocodeResult) {
  const byType = {};
  for (const c of geocodeResult.address_components) {
    for (const t of c.types) byType[t] = c;
  }
  const streetNum = byType.street_number?.long_name || "";
  const route     = byType.route?.long_name || "";
  const locality  = byType.locality?.long_name || byType.sublocality?.long_name || "";
  const state     = byType.administrative_area_level_1?.short_name || "";

  const line1 = streetNum && route ? `${streetNum} ${route}` : (route || streetNum);
  const short = [line1, locality, state].filter(Boolean).join(", ");
  return short || geocodeResult.formatted_address;
}

// Reverse geocoding with in-memory cache + 7-day localStorage TTL
// ---- Google (Places + Geocoding) config ----
const GOOGLE_MAPS_API_KEY = "YOUR_GOOGLE_KEY"; // lock by HTTP referrer in Google Cloud

// In-memory caches for this session
const addrMemCache = new Map();
const poiMemCache  = new Map();

function haversineMeters(lat1, lon1, lat2, lon2) {
  const toRad = d => d * Math.PI / 180, R = 6371000;
  const dLat = toRad(lat2 - lat1), dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat/2)**2 +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLon/2)**2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

// Build a concise address like "123 Collins St, Melbourne, VIC"
function formatShortAddress(geocodeResult) {
  const byType = {};
  for (const c of geocodeResult.address_components) {
    for (const t of c.types) byType[t] = c;
  }
  const streetNum = byType.street_number?.long_name || "";
  const route     = byType.route?.long_name || "";
  const locality  = byType.locality?.long_name || byType.sublocality?.long_name || "";
  const state     = byType.administrative_area_level_1?.short_name || "";
  const line1 = streetNum && route ? `${streetNum} ${route}` : (route || streetNum);
  const short = [line1, locality, state].filter(Boolean).join(", ");
  return short || geocodeResult.formatted_address;
}

// Reverse geocoding with mem-cache + 7-day localStorage TTL
async function getAddressFromLatLon(lat, lon) {
  const key = `${lat.toFixed(5)},${lon.toFixed(5)}`;
  const lsKey = `addr_${key}`;
  if (addrMemCache.has(key)) return addrMemCache.get(key);

  const cached = localStorage.getItem(lsKey);
  if (cached) {
    try {
      const { value, ts } = JSON.parse(cached);
      if (Date.now() - ts < 7*24*60*60*1000) {
        addrMemCache.set(key, value);
        return value;
      }
    } catch {}
  }

  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lon}&key=${GOOGLE_MAPS_API_KEY}`;
    const resp = await fetch(url);
    const data = await resp.json();
    if (data.status === "OK" && data.results.length > 0) {
      const address = formatShortAddress(data.results[0]);
      addrMemCache.set(key, address);
      localStorage.setItem(lsKey, JSON.stringify({ value: address, ts: Date.now() }));
      return address;
    }
  } catch (e) { console.warn("Geocode failed:", e); }

  return `📍 ${lat.toFixed(6)}, ${lon.toFixed(6)}`;
}

// Get nearest POI name from Places API: try type=parking, then type=establishment
async function getPlaceNameFromLatLon(lat, lon) {
  const key = `${lat.toFixed(5)},${lon.toFixed(5)}`;
  const lsKey = `poi_${key}`;
  if (poiMemCache.has(key)) return poiMemCache.get(key);

  const cached = localStorage.getItem(lsKey);
  if (cached) {
    try {
      const parsed = JSON.parse(cached);
      if (Date.now() - parsed.ts < 7*24*60*60*1000) {
        poiMemCache.set(key, parsed.value);
        return parsed.value; // { name, place_id }
      }
    } catch {}
  }

  async function queryNearby(type) {
    const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lon}&rankby=distance&type=${type}&key=${GOOGLE_MAPS_API_KEY}`;
    const resp = await fetch(url);
    const data = await resp.json();
    if (data.status === "OK" && data.results.length > 0) {
      // Prefer a result within ~60 m of the bay
      for (const r of data.results) {
        const p = r.geometry?.location;
        if (!p) continue;
        if (haversineMeters(lat, lon, p.lat, p.lng) <= 60) {
          return { name: r.name, place_id: r.place_id };
        }
      }
      // Or fall back to the closest entry
      const r0 = data.results[0];
      if (r0?.name && r0?.place_id) return { name: r0.name, place_id: r0.place_id };
    }
    return null;
  }

  try {
    let best = await queryNearby("parking");
    if (!best) best = await queryNearby("establishment");
    if (best) {
      poiMemCache.set(key, best);
      localStorage.setItem(lsKey, JSON.stringify({ value: best, ts: Date.now() }));
      return best;
    }
  } catch (e) { console.warn("Places nearby failed:", e); }

  return null;
}

// Resolve best label for a bay: POI name (title) + short address (subtitle)
async function resolveBestLocationLabel(lat, lon) {
  const [poi, addr] = await Promise.all([
    getPlaceNameFromLatLon(lat, lon),
    getAddressFromLatLon(lat, lon)
  ]);
  if (poi?.name) {
    return { title: poi.name, subtitle: addr, place_id: poi.place_id };
  }
  return { title: addr, subtitle: `📍 ${lat.toFixed(6)}, ${lon.toFixed(6)}`, place_id: null };
}



  /*
  const GOOGLE_MAPS_API_KEY = "AIzaSyAGZ4lmkAg-qNxKmSZvZe9VeGG8uEYT_s4";

async function getAddressFromLatLon(lat, lon) {
  const cacheKey = `addr_${lat.toFixed(6)}_${lon.toFixed(6)}`;

  // Check localStorage first
  const cached = localStorage.getItem(cacheKey);
  if (cached) return cached;

  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lon}&key=${GOOGLE_MAPS_API_KEY}`;
    const resp = await fetch(url);
    const data = await resp.json();

    if (data.status === "OK" && data.results.length > 0) {
      const address = data.results[0].formatted_address;
      localStorage.setItem(cacheKey, address);
      return address;
    }
  } catch (err) {
    console.error("Reverse geocoding failed", err);
  }

  return `Bay #N/A`; // fallback
}
*/

// new version 0815 + Google Maps integration
function createBayCard(bay) {
  const card = document.createElement('div');
  card.className = 'parking-item';

  // Availability (prefer counts)
  const rawStatus = (bay.status_description || '').toLowerCase();
  const hasCounts = typeof bay.availableSpaces === 'number' && typeof bay.totalSpaces === 'number';
  const isAvail   = hasCounts ? (bay.availableSpaces > 0) : rawStatus.includes('unoccupied');

  const statusText = hasCounts
    ? (isAvail ? `Available (${Math.max(0, bay.availableSpaces)}/${Math.max(0, bay.totalSpaces)})`
               : `Unavailable (0/${Math.max(0, bay.totalSpaces)})`)
    : (isAvail ? 'Available' : 'Unavailable');

  const badgeClass = isAvail ? 'success' : 'danger';
  const zoneLabel  = bay.name ? bay.name : (bay.zone_number ? `Zone ${bay.zone_number}` : '—');

  // Initial render (instant paint)
  const gm = `https://www.google.com/maps/dir/?api=1&destination=${bay.lat},${bay.lon}`;
  card.innerHTML = `
    <div class="parking-header">
      <div>
        <div class="parking-name">Resolving place…</div>
        <div class="parking-address">📍 ${bay.lat.toFixed(6)}, ${bay.lon.toFixed(6)}</div>
      </div>
      <div class="parking-availability ${badgeClass}">
        ${formatMeters(bay.distance_m)}
      </div>
    </div>
    <div class="parking-details">
      <div class="parking-info">
        <div class="info-item"><span>🚦</span><span>${statusText}</span></div>
        <div class="info-item"><span>🧭</span><span>${zoneLabel}</span></div>
      </div>
      <div class="parking-badges">
        ${bay.metered ? `<span class="pill">Metered</span>` : ''}
      </div>
      <a href="${gm}" target="_blank" class="navigate-btn">Open in Maps</a>
    </div>
  `;

  // Async: replace title (POI name) and subtitle (short address), upgrade Maps link with place_id
  (async () => {
    const nameEl = card.querySelector('.parking-name');
    const addrEl = card.querySelector('.parking-address');
    const linkEl = card.querySelector('.navigate-btn');

    const { title, subtitle, place_id } = await resolveBestLocationLabel(bay.lat, bay.lon);

    if (nameEl) nameEl.textContent = title;       // <-- this replaces the first coordinates line
    if (addrEl) addrEl.textContent = subtitle;    // short address (not just coords)

    if (place_id && linkEl) {
      linkEl.href = `https://www.google.com/maps/dir/?api=1&destination=${bay.lat},${bay.lon}&destination_place_id=${place_id}`;
    }
  })();

  return card;
}

  


  // ----  createBayCard previous version 0815 1254----
  /*
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
          <div class="info-item"><span>🧭</span><span>Zone ${bay.name ?? '—'}</span></div>
          <div class="info-item"><span>⏳</span><span>${maxStay || '—'}</span></div>
        </div>
        <a href="${gm}" target="_blank" class="navigate-btn">Open in Maps</a>
      </div>
    `;
    return card;
  }

  */

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
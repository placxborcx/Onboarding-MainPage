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
const API_BASE = "https://xbtfcqbgeh.execute-api.ap-southeast-2.amazonaws.com";

async function searchParkingSpaces(location) {
  const url = `${API_BASE}/parking-api?location=${encodeURIComponent(location)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`API error ${res.status}`);
  const data = await res.json();
  return Array.isArray(data.results) ? data.results : [];
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
  

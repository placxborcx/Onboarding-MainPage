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
  
    // Mock API
    async function searchParkingSpaces(location) {
      await new Promise(r => setTimeout(r, 1200)); // simulate latency
  
      const mockData = {
        'clayton': [
          { name: 'City Center Parking', availableSpaces: 45, totalSpaces: 200, address: '123 Main St, Clayton', distance: '0.2 km', price: '$3.50/hour', coordinates: { lat: -37.9249, lng: 145.1340 } },
          { name: 'Shopping Mall Garage', availableSpaces: 12, totalSpaces: 150, address: '456 Royalty Street, Clayton', distance: '0.5 km', price: '$2.00/hour', coordinates: { lat: -37.9260, lng: 145.1350 } },
          { name: 'Metro Station Parking', availableSpaces: 8, totalSpaces: 80, address: '789 Transit Way, Clayton', distance: '0.7 km', price: '$4.00/hour', coordinates: { lat: -37.9270, lng: 145.1360 } },
          { name: 'University Parking Lot', availableSpaces: 23, totalSpaces: 120, address: '321 Campus Drive, Clayton', distance: '1.1 km', price: '$5.00/hour', coordinates: { lat: -37.9280, lng: 145.1370 } }
        ],
        'melbourne': [
          { name: 'Collins Street Parking', availableSpaces: 32, totalSpaces: 180, address: '100 Collins Street, Melbourne', distance: '0.1 km', price: '$8.00/hour', coordinates: { lat: -37.8136, lng: 144.9631 } },
          { name: 'Federation Square Garage', availableSpaces: 15, totalSpaces: 250, address: '200 Flinders Street, Melbourne', distance: '0.3 km', price: '$6.50/hour', coordinates: { lat: -37.8182, lng: 144.9696 } }
        ]
      };
  
      const normalized = location.toLowerCase().trim();
      for (const [key, data] of Object.entries(mockData)) {
        if (normalized.includes(key)) return data;
      }
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
  
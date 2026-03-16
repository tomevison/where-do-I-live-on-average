let locations = [];

const locationList = document.getElementById('locations');
const addBtn = document.getElementById('add');
const calculateBtn = document.getElementById('calculate');

// Initialize Leaflet map
const map = L.map('map').setView([0, 0], 2);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

// Add a location to the list
function addLocation(name, weight) {
  locations.push({ name, weight });
  const li = document.createElement('li');
  li.textContent = `${name} (${weight} year${weight>1?'s':''})`;
  locationList.appendChild(li);
}

// Geocode a location using Nominatim (OpenStreetMap)
async function geocode(location) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(location)}`;
  const res = await fetch(url);
  const data = await res.json();
  if (data && data.length > 0) {
    return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
  }
  return null;
}

// Compute weighted geographic centroid
function computeWeightedCentroid(coords, weights) {
  let x = 0, y = 0, z = 0, total = 0;
  for (let i = 0; i < coords.length; i++) {
    const lat = coords[i].lat * Math.PI / 180;
    const lon = coords[i].lon * Math.PI / 180;
    const w = weights[i];
    x += w * Math.cos(lat) * Math.cos(lon);
    y += w * Math.cos(lat) * Math.sin(lon);
    z += w * Math.sin(lat);
    total += w;
  }
  x /= total; y /= total; z /= total;

  const lon = Math.atan2(y, x);
  const hyp = Math.sqrt(x * x + y * y);
  const lat = Math.atan2(z, hyp);

  return { lat: lat * 180 / Math.PI, lon: lon * 180 / Math.PI };
}

// Event listeners
addBtn.addEventListener('click', () => {
  const loc = document.getElementById('location').value;
  const weight = parseFloat(document.getElementById('weight').value) || 1;
  if (loc) addLocation(loc, weight);
});

calculateBtn.addEventListener('click', async () => {
  if (locations.length === 0) return alert("Add at least one location");

  let coords = [];
  let weights = [];

  // Clear previous markers
  map.eachLayer(layer => {
    if (layer instanceof L.Marker) map.removeLayer(layer);
  });

  for (let loc of locations) {
    const g = await geocode(loc.name);
    if (g) {
      coords.push(g);
      weights.push(loc.weight);
      // Add marker for each location with popup
      L.marker([g.lat, g.lon]).addTo(map)
        .bindPopup(`${loc.name} (${loc.weight} year${loc.weight>1?'s':''})`);
    }
  }

  // Compute weighted centroid
  const centroid = computeWeightedCentroid(coords, weights);

  // Add marker for average location
  L.marker([centroid.lat, centroid.lon], {icon: L.icon({
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/684/684908.png',
    iconSize: [32, 32],
    iconAnchor: [16, 32]
  })}).addTo(map)
    .bindPopup(`<strong>Your average location</strong><br>This is the weighted centroid based on time spent at each location.`)
    .openPopup();

  // Adjust map to show all points
  const allCoords = coords.concat([centroid]);
  const bounds = L.latLngBounds(allCoords.map(c => [c.lat, c.lon]));
  map.fitBounds(bounds.pad(0.2)); // pad a bit for spacing
});

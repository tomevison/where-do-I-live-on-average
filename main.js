let locations = [];

const locationList = document.getElementById('locations');
const addBtn = document.getElementById('add');
const calculateBtn = document.getElementById('calculate');

const map = L.map('map').setView([0, 0], 2);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

function addLocation(name, weight) {
  locations.push({name, weight});
  const li = document.createElement('li');
  li.textContent = `${name} (${weight})`;
  locationList.appendChild(li);
}

async function geocode(location) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(location)}`;
  const res = await fetch(url);
  const data = await res.json();
  if(data && data.length > 0) {
    return {lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon)};
  }
  return null;
}

function computeWeightedCentroid(coords, weights) {
  // Convert lat/lon to radians
  let x=0, y=0, z=0, total=0;
  for(let i=0;i<coords.length;i++){
    let lat = coords[i].lat * Math.PI/180;
    let lon = coords[i].lon * Math.PI/180;
    let w = weights[i];
    x += w * Math.cos(lat) * Math.cos(lon);
    y += w * Math.cos(lat) * Math.sin(lon);
    z += w * Math.sin(lat);
    total += w;
  }
  x/=total; y/=total; z/=total;

  // Convert back to lat/lon
  let lon = Math.atan2(y,x);
  let hyp = Math.sqrt(x*x + y*y);
  let lat = Math.atan2(z,hyp);

  return {lat: lat*180/Math.PI, lon: lon*180/Math.PI};
}

addBtn.addEventListener('click', () => {
  const loc = document.getElementById('location').value;
  const weight = parseFloat(document.getElementById('weight').value) || 1;
  if(loc) addLocation(loc, weight);
});

calculateBtn.addEventListener('click', async () => {
  if(locations.length === 0) return alert("Add at least one location");

  let coords = [];
  let weights = [];

  for(let loc of locations){
    const g = await geocode(loc.name);
    if(g){
      coords.push(g);
      weights.push(loc.weight);
      L.marker([g.lat,g.lon]).addTo(map).bindPopup(`${loc.name} (${loc.weight})`);
    }
  }

  const centroid = computeWeightedCentroid(coords, weights);
  L.marker([centroid.lat, centroid.lon], {color:'red'}).addTo(map).bindPopup('Your average location').openPopup();
  map.setView([centroid.lat, centroid.lon], 4);
});

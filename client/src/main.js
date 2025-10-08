let home = null;
let watchId = null;
let isAway = false;
let awayStart = null;
let totalAwayMs = 0;

const distEl = document.getElementById("distance");
const statusEl = document.getElementById("status");
const awayEl = document.getElementById("awayTime");

// Initialize Leaflet map
const map = L.map('map').setView([0, 0], 2);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
}).addTo(map);

let homeMarker = null;
let userMarker = null;
let polyline = L.polyline([], { color: 'red' }).addTo(map);

document.getElementById("setHome").addEventListener("click", setHome);
document.getElementById("start").addEventListener("click", startTracking);
document.getElementById("stop").addEventListener("click", stopTracking);

// Set Home Location
function setHome() {
  if (!navigator.geolocation) return alert("Geolocation not supported");

  navigator.geolocation.getCurrentPosition(pos => {
    home = [pos.coords.latitude, pos.coords.longitude];
    localStorage.setItem("home", JSON.stringify(home));

    if (homeMarker) homeMarker.remove();
    homeMarker = L.marker(home).addTo(map).bindPopup("Home").openPopup();
    map.setView(home, 15);

    statusEl.textContent = "Home";
    distEl.textContent = "0";

    // Fetch and display home address
    getAddress(home[0], home[1]).then(address => {
      const homeAddrEl = document.getElementById("homeAddress");
      if (homeAddrEl) homeAddrEl.textContent = address;
      alert("Home location saved!\nAddress: " + address);
    }).catch(err => console.error(err));

  }, err => {
    console.error("Geo error:", err);
    alert("Failed to get location");
  }, { enableHighAccuracy: true });
}

// Start Tracking
function startTracking() {
  home = JSON.parse(localStorage.getItem("home"));
  if (!home) return alert("Set home first!");

  // Initial position
  navigator.geolocation.getCurrentPosition(updatePositionAsyncWrapper, handleError, { enableHighAccuracy: true });

  watchId = navigator.geolocation.watchPosition(updatePositionAsyncWrapper, handleError, {
    enableHighAccuracy: true,
    maximumAge: 1000,
    timeout: 5000
  });
}

// Stop Tracking
function stopTracking() {
  if (watchId) {
    navigator.geolocation.clearWatch(watchId);
    watchId = null;
    statusEl.textContent = "Stopped";
  }
}

// Update Position (sync)
function updatePosition(pos) {
  const current = [pos.coords.latitude, pos.coords.longitude];
  const distance = haversineMeters(home, current);
  distEl.textContent = distance.toFixed(1);

  const threshold = 1; // meters
  if (distance > threshold && !isAway) {
    isAway = true;
    awayStart = Date.now();
    statusEl.textContent = "Away";
  } else if (distance <= threshold && isAway) {
    isAway = false;
    totalAwayMs += Date.now() - awayStart;
    awayStart = null;
    statusEl.textContent = "Home";
  } else if (!isAway && distance <= threshold) {
    statusEl.textContent = "Home";
  }

  let total = totalAwayMs;
  if (isAway) total += Date.now() - awayStart;
  awayEl.textContent = formatMs(total);

  // Update map marker
  if (!userMarker) {
    userMarker = L.marker(current).addTo(map).bindPopup("You").openPopup();
  } else {
    userMarker.setLatLng(current);
  }
  polyline.addLatLng(current);
  map.panTo(current);
}

// Async wrapper for address fetching
function updatePositionAsyncWrapper(pos) {
  updatePosition(pos); // synchronous updates

  const current = [pos.coords.latitude, pos.coords.longitude];
  getAddress(current[0], current[1]).then(address => {
    const curEl = document.getElementById("currentLocation");
    if (curEl) curEl.textContent = address;
    if (userMarker) userMarker.bindPopup("You: " + address);
  }).catch(err => console.error(err));
}

// Reverse Geocoding via OpenStreetMap
async function getAddress(lat, lon) {
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}`);
    if (!res.ok) throw new Error('Network response was not ok');
    const data = await res.json();
    return data.display_name || "Address not found";
  } catch (err) {
    console.error("Reverse geocode error:", err);
    return "Address not found";
  }
}

// Error Handling
function handleError(err) {
  console.warn("Geo error:", err.message);
  statusEl.textContent = "Error";
}

// Haversine Distance
function haversineMeters([lat1, lon1], [lat2, lon2]) {
  const R = 6371e3;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat/2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Format milliseconds to h/m/s
function formatMs(ms) {
  const s = Math.floor(ms / 1000) % 60;
  const m = Math.floor(ms / 60000) % 60;
  const h = Math.floor(ms / 3600000);
  return `${h}h ${m}m ${s}s`;
}

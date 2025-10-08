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

function setHome() {
  if (!navigator.geolocation) return alert("Geolocation not supported");
  navigator.geolocation.getCurrentPosition((pos) => {
    home = [pos.coords.latitude, pos.coords.longitude];
    localStorage.setItem("home", JSON.stringify(home));

    if (homeMarker) homeMarker.remove();
    homeMarker = L.marker(home).addTo(map).bindPopup("Home").openPopup();
    map.setView(home, 15);

    statusEl.textContent = "Home";
    distEl.textContent = "0";
    alert("Home location saved!");
  }, (err) => {
    console.error("Geo error:", err);
    alert("Failed to get location");
  }, { enableHighAccuracy: true });
}

function startTracking() {
  home = JSON.parse(localStorage.getItem("home"));
  if (!home) return alert("Set home first!");

  // Initial position
  navigator.geolocation.getCurrentPosition(updatePosition, handleError, { enableHighAccuracy: true });

  watchId = navigator.geolocation.watchPosition(updatePosition, handleError, {
    enableHighAccuracy: true,
    maximumAge: 1000,
    timeout: 5000
  });
}

function stopTracking() {
  if (watchId) {
    navigator.geolocation.clearWatch(watchId);
    watchId = null;
    statusEl.textContent = "Stopped";
  }
}

function updatePosition(pos) {
  const current = [pos.coords.latitude, pos.coords.longitude];
  const distance = haversineMeters(home, current);
  distEl.textContent = distance.toFixed(1);

  const threshold = 1; //in meters 
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

  // Update map
  if (!userMarker) {
    userMarker = L.marker(current).addTo(map).bindPopup("You").openPopup();
  } else {
    userMarker.setLatLng(current);
  }
  polyline.addLatLng(current);
  map.panTo(current);
}

function handleError(err) {
  console.warn("Geo error:", err.message);
  statusEl.textContent = "Error";
}

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

function formatMs(ms) {
  const s = Math.floor(ms / 1000) % 60;
  const m = Math.floor(ms / 60000) % 60;
  const h = Math.floor(ms / 3600000);
  return `${h}h ${m}m ${s}s`;
}

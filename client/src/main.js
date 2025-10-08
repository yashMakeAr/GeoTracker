let home = null;
let watchId = null;
let isAway = false;
let awayStart = null;
let totalAwayMs = 0;

const distEl = document.getElementById("distance");
const statusEl = document.getElementById("status");
const awayEl = document.getElementById("awayTime");

document.getElementById("setHome").addEventListener("click", setHome);
document.getElementById("start").addEventListener("click", startTracking);
document.getElementById("stop").addEventListener("click", stopTracking);

function setHome() {
  if (!navigator.geolocation) return alert("Geolocation not supported");
  navigator.geolocation.getCurrentPosition((pos) => {
    home = [pos.coords.latitude, pos.coords.longitude];
    localStorage.setItem("home", JSON.stringify(home));
    statusEl.textContent = "Home"; // update immediately
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

  // Initial check immediately
  navigator.geolocation.getCurrentPosition(updatePosition, handleError, { enableHighAccuracy: true });

  watchId = navigator.geolocation.watchPosition(updatePosition, handleError, {
    enableHighAccuracy: true,
    maximumAge: 1000, // avoiding very old cached positions
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

  const threshold = 50; // meters, reduce threshold for more sensitive tracking
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
}

function handleError(err) {
  console.warn("Geo error:", err.message);
  statusEl.textContent = "Error";
}

function haversineMeters([lat1, lon1], [lat2, lon2]) {
  const R = 6371e3; // meters
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

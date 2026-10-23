(function () {
"use strict";

const $ = id => document.getElementById(id);
const G = window.Garden;
function el(tag, text, className) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
}
function button(text, handler, className = "quiet") {
  const node = el("button", text, className);
  node.type = "button";
  node.addEventListener("click", handler);
  return node;
}
function formatDate(value, year = false) {
  const date = G.parseDate(value);
  return date ? date.toLocaleDateString("en-US", { month: "short", day: "numeric", ...(year ? { year: "numeric" } : {}), timeZone: "UTC" }) : "Not set";
}
function dateRange(a, b) { return formatDate(a) + " – " + formatDate(b, a?.slice(0, 4) !== b?.slice(0, 4)); }
function readJSON(key, fallback) {
  const raw = localStorage.getItem(key);
  return raw === null ? fallback : JSON.parse(raw);
}
function writeJSON(key, data) {
  try { localStorage.setItem(key, JSON.stringify(data)); return true; }
  catch { $("storageStatus").textContent = "Storage is unavailable or full. Changes stay in this tab only; keep it open to retain them."; return false; }
}

let crops = [], settings = {}, editing = null, weather = null, weatherVersion = 0, locationIntent = 0;
let storageProtected = false;
const apiBase = (localStorage.getItem("agricultureApiUrl") || "").trim().replace(/\\/$/, "");
let remoteReady = false;
let remoteGarden = null;
try {
  remoteGarden = localStorage.getItem("agricultureGardenId");
  if (!remoteGarden) {
    remoteGarden = crypto.randomUUID();
    localStorage.setItem("agricultureGardenId", remoteGarden);
  }
} catch { remoteGarden = null; }
async function apiRequest(path, options = {}) {
  const response = await fetch(apiBase + path, {
    ...options, headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    signal: AbortSignal.timeout(10000)
  });
  if (!response.ok) throw new Error("Backend request failed (" + response.status + ")");
  return response.status === 204 ? null : response.json();
}
function syncCrops() {
  if (!remoteReady) return;
  // Serialize snapshots to avoid overlapping saves overwriting newer changes.
  pendingSave = pendingSave.then(async () => {
    await apiRequest("/api/gardens/" + remoteGarden + "/crops", {
      method: "PUT", body: JSON.stringify(crops.map(c => ({
        ...c, yield: c.yield === "" || c.yield == null ? null : Number(c.yield)
      })))
    });
    $("storageStatus").textContent = "Saved in PostgreSQL and this browser.";
  }).catch(() => {
    remoteReady = false;
    $("storageStatus").textContent = "Backend unavailable. Your changes are saved in this browser.";
  });
}
let pendingSave = Promise.resolve();
async function connectBackend() {
  if (!apiBase || !remoteGarden || storageProtected) return;
  try {
    const remote = await apiRequest("/api/gardens/" + remoteGarden + "/crops");
    if (crops.length && !remote.length) {
      remoteReady = true;
      syncCrops();
    } else if (remote.length) {
      crops = remote;
      persistCrops();
      renderCrops();
      remoteReady = true;
      $("storageStatus").textContent = "Loaded from PostgreSQL. Changes sync to the backend.";
    } else {
      remoteReady = true;
      $("storageStatus").textContent = "Connected to PostgreSQL. Your garden is empty.";
    }
  } catch {
    $("storageStatus").textContent = "Backend unavailable. Your crops are still saved in this browser.";
  }
}
try {
  const saved = readJSON("crops", []);
  if (!Array.isArray(saved)) throw new Error("Invalid saved records");
  crops = saved;
} catch {
  // Never overwrite unreadable original records.
  storageProtected = true;
  $("storageStatus").textContent = "Saved records could not be read. New records will stay in this tab; your original saved data will not be overwritten.";
}
try { settings = readJSON("gardenSettings", {}) || {}; } catch { settings = {}; }
const defaultLocation = { name: "Greensboro, North Carolina", latitude: 36.0726, longitude: -79.792, timezone: "America/New_York" };
let gardenLocation = settings.location;
if (!gardenLocation || typeof gardenLocation.name !== "string" || !Number.isFinite(gardenLocation.latitude) || !Number.isFinite(gardenLocation.longitude) || Math.abs(gardenLocation.latitude) > 90 || Math.abs(gardenLocation.longitude) > 180) gardenLocation = defaultLocation;

function persistCrops() { if (!storageProtected) writeJSON("crops", crops); syncCrops(); }
function saveSettings() {
  settings = { location: gardenLocation, calendar: $("calendarRegion").value, spring: $("lastFrost").value, fall: $("firstFrost").value };
  writeJSON("gardenSettings", settings);
}
function chosenCrop() { return G.CROPS.find(c => c.id === $("cropPreset").value); }
function usableWeather() { return weather && Date.now() - weather.fetchedAt < 30 * 60 * 1000 ? weather : null; }

// Populate real crop presets, while keeping room for a crop from your own seed packet.
G.CROPS.forEach(crop => {
  const option = el("option", crop.name);
  option.value = crop.id;
  $("cropPreset").append(option);
});
const other = el("option", "Other crop");
other.value = "custom";
$("cropPreset").append(other);
$("plantDate").value = G.today(gardenLocation.timezone);
$("calendarRegion").value = settings.calendar === "custom" ? "custom" : "nc";
if (G.parseDate(settings.spring)) $("lastFrost").value = settings.spring;
if (G.parseDate(settings.fall)) $("firstFrost").value = settings.fall;

function syncMethods(preferred) {
  const crop = chosenCrop();
  $("customFields").hidden = Boolean(crop);
  $("cropName").required = !crop;
  $("cropName").disabled = Boolean(crop);
  $("customDays").disabled = Boolean(crop);
  $("plantMethod").replaceChildren();
  Object.keys(crop?.methods || { seed: [], transplant: [] }).forEach(method => {
    const option = el("option", method === "seed" ? "Seeds" : method === "tuber" ? "Seed potatoes" : "Transplants");
    option.value = method;
    $("plantMethod").append(option);
  });
  if ([...$("plantMethod").options].some(o => o.value === preferred)) $("plantMethod").value = preferred;
}
function getEstimate() {
  const crop = chosenCrop();
  if (crop) return G.estimate(crop, $("plantMethod").value, $("plantDate").value);
  const days = Number($("customDays").value);
  const date = Number.isInteger(days) && days >= 1 && days <= 1095 ? G.addDays($("plantDate").value, days) : null;
  return date ? { early: date, late: date, suggested: date } : null;
}
function refreshPlanner(updateEstimate = true) {
  $("frostFields").hidden = $("calendarRegion").value !== "custom";
  $("harvestDate").min = $("plantDate").value;
  $("harvestDate").setCustomValidity("");
  const crop = chosenCrop(), planting = $("plantDate").value, method = $("plantMethod").value;
  const estimate = getEstimate();
  if (updateEstimate) $("harvestDate").value = estimate?.suggested || "";
  $("harvestHint").textContent = estimate ? "Estimated harvest: " + dateRange(estimate.early, estimate.late) + ". You can adjust the date. Changing the crop, method, or planting date recalculates it." : "Set your own harvest date, or enter days to harvest from your seed packet.";
  $("cropGuide").replaceChildren();
  $("plantingAdvice").replaceChildren();
  if (!crop) {
    $("cropGuide").append(el("p", "Use your seed packet or plant label for planting and harvest guidance."));
    $("plantingAdvice").className = "advice neutral";
    $("plantingAdvice").append(el("strong", "Your crop, your plan"), el("p", "Custom crops use the dates you provide. No preset planting recommendation is applied."));
    return;
  }
  const [low, high] = crop.methods[method];
  $("cropGuide").append(el("strong", crop.icon + "  " + (crop.season === "warm" ? "Warm-season crop" : "Cool-season crop")), el("p", low + "–" + high + " days to harvest from " + (method === "seed" ? "sowing seeds." : method === "tuber" ? "planting seed potatoes." : "setting transplants outdoors.")));
  const year = G.parseDate(planting) ? Number(planting.slice(0, 4)) : Number(G.today().slice(0, 4));
  const windows = G.plantingWindows(crop, year, $("calendarRegion").value, $("lastFrost").value, $("firstFrost").value, method);
  if (windows.length) {
    $("cropGuide").append(el("p", ($("calendarRegion").value === "nc" ? "Central NC outdoor windows: " : "General frost-based windows: ") + windows.map(([a, b]) => dateRange(a, b)).join(" · "), "small"));
    const next = windows.find(([a, b]) => b >= planting);
    if (next && planting < next[0]) $("cropGuide").append(button("Use next window: " + formatDate(next[0]), () => { $("plantDate").value = next[0]; refreshPlanner(); }, "text-button"));
    if (!next && $("calendarRegion").value === "nc") {
      const nextYear = G.plantingWindows(crop, year + 1, "nc", "", "", method)[0][0];
      $("cropGuide").append(button("Plan for " + formatDate(nextYear, true), () => { $("plantDate").value = nextYear; refreshPlanner(); }, "text-button"));
    }
  }
  const advice = G.recommendation(crop, method, planting, $("calendarRegion").value, $("lastFrost").value, $("firstFrost").value, usableWeather());
  $("plantingAdvice").className = "advice " + advice.tone;
  $("plantingAdvice").append(el("strong", advice.title), el("p", advice.text));
}
function resetPlanner() {
  editing = null;
  $("cropForm").reset();
  $("calendarRegion").value = settings.calendar === "custom" ? "custom" : "nc";
  if (G.parseDate(settings.spring)) $("lastFrost").value = settings.spring;
  if (G.parseDate(settings.fall)) $("firstFrost").value = settings.fall;
  $("plantDate").value = G.today(gardenLocation.timezone);
  $("planner-heading").textContent = "Add a crop";
  $("saveCrop").textContent = "Save crop";
  $("cancelEdit").hidden = true;
  syncMethods();
  refreshPlanner();
}
function editCrop(index) {
  const record = crops[index];
  if (!record || typeof record !== "object") return;
  editing = index;
  $("cropPreset").value = G.CROPS.some(c => c.id === record.preset) ? record.preset : "custom";
  syncMethods(record.method);
  $("cropName").value = String(record.name || "").slice(0, 80);
  $("plantDate").value = G.parseDate(record.plantDate) ? record.plantDate : "";
  $("customDays").value = record.customDays || "";
  $("yieldAmount").value = record.yield ?? "";
  $("cropNotes").value = record.notes || "";
  refreshPlanner(false);
  $("harvestDate").value = G.parseDate(record.harvestDate) ? record.harvestDate : "";
  $("planner-heading").textContent = "Edit your planting";
  $("saveCrop").textContent = "Save changes";
  $("cancelEdit").hidden = false;
  $("formStatus").textContent = "";
  $("planner").scrollIntoView({ behavior: "smooth", block: "start" });
  $("cropPreset").focus({ preventScroll: true });
}
function renderCrops() {
  $("cropList").replaceChildren();
  $("cropCount").textContent = crops.length;
  if (!crops.length) {
    const empty = el("div", undefined, "empty-garden");
    empty.append(el("span", "🌱", "empty-icon"), el("h3", "No crops added yet"), el("p", "Choose a crop and planting date to start your log."));
    $("cropList").append(empty);
    return;
  }
  const today = G.today(gardenLocation.timezone);
  crops.forEach((raw, index) => {
    const crop = raw && typeof raw === "object" ? raw : { name: "Saved record" };
    const preset = G.CROPS.find(c => c.id === crop.preset);
    const card = el("article", undefined, "crop-item");
    const top = el("div", undefined, "section-top"), identity = el("div", undefined, "crop-identity");
    identity.append(el("span", preset?.icon || "🌱", "crop-icon"), el("h3", String(crop.name || "Unnamed crop")));
    let status = !G.parseDate(crop.plantDate) || !G.parseDate(crop.harvestDate) ? "Check dates" : crop.plantDate > today ? "Planned" : crop.harvestDate <= today ? "Check for harvest" : "Growing";
    top.append(identity, el("span", status, "badge" + (status === "Growing" ? " growing" : "")));
    card.append(top);
    const dates = el("div", undefined, "crop-dates");
    const planted = el("div"), harvest = el("div");
    planted.append(el("span", "PLANTED", "eyebrow"), el("strong", formatDate(crop.plantDate, true)));
    harvest.append(el("span", "EXPECTED HARVEST", "eyebrow"), el("strong", formatDate(crop.harvestDate, true)));
    dates.append(planted, harvest);
    card.append(dates);
    if (G.parseDate(crop.plantDate) && G.parseDate(crop.harvestDate)) {
      const total = G.daysBetween(crop.plantDate, crop.harvestDate);
      const elapsed = G.daysBetween(crop.plantDate, today);
      const progress = el("progress");
      progress.max = 100;
      progress.value = total > 0 ? Math.max(0, Math.min(100, elapsed / total * 100)) : 0;
      progress.setAttribute("aria-label", "Time elapsed until expected harvest for " + crop.name);
      card.append(progress);
      const left = G.daysBetween(today, crop.harvestDate);
      card.append(el("p", crop.plantDate > today ? "Planting in " + G.daysBetween(today, crop.plantDate) + " days" : left > 0 ? left + " days until the planned harvest date" : "The planned harvest date has arrived. Check your crop for ripeness.", "muted small"));
    }
    if (crop.notes) card.append(el("p", String(crop.notes), "crop-notes"));
    const bottom = el("div", undefined, "crop-bottom"), actions = el("div", undefined, "crop-actions");
    bottom.append(el("span", crop.yield !== "" && crop.yield != null ? String(crop.yield) + " lb recorded" : "Yield not recorded", "small muted"));
    actions.append(button("Edit", () => editCrop(index)), button("Remove", () => {
      const prompt = el("div", undefined, "delete-prompt");
      prompt.append(el("span", "Remove this planting?"), button("Yes, remove", () => {
        crops.splice(index, 1);
        if (editing === index) resetPlanner();
        else if (editing !== null && editing > index) editing--;
        persistCrops();
        renderCrops();
      }, "danger"), button("Keep it", () => prompt.remove()));
      if (!card.querySelector(".delete-prompt")) card.append(prompt);
    }));
    bottom.append(actions);
    card.append(bottom);
    $("cropList").append(card);
  });
}
$("cropPreset").addEventListener("change", () => { syncMethods(); refreshPlanner(); });
["plantDate", "plantMethod", "customDays"].forEach(id => $(id).addEventListener("input", () => refreshPlanner()));
["calendarRegion", "lastFrost", "firstFrost"].forEach(id => $(id).addEventListener("change", () => { saveSettings(); refreshPlanner(false); }));
$("harvestDate").addEventListener("input", () => $("harvestDate").setCustomValidity(""));
$("cancelEdit").addEventListener("click", () => { resetPlanner(); $("formStatus").textContent = ""; });
$("cropForm").addEventListener("submit", event => {
  event.preventDefault();
  const plantDate = $("plantDate").value, harvestDate = $("harvestDate").value, preset = chosenCrop();
  if (!preset && !$("cropName").value.trim()) {
    $("formStatus").textContent = "Give your crop a name before saving.";
    $("cropName").focus();
    return;
  }
  if (!G.parseDate(plantDate) || !G.parseDate(harvestDate) || harvestDate < plantDate) {
    $("harvestDate").setCustomValidity("Choose a harvest date on or after the planting date.");
    $("harvestDate").reportValidity();
    return;
  }
  const record = {
    ...(editing !== null && typeof crops[editing] === "object" ? crops[editing] : {}),
    name: preset?.name || $("cropName").value.trim(), preset: preset?.id || "custom",
    method: $("plantMethod").value, plantDate, harvestDate,
    yield: $("yieldAmount").value, notes: $("cropNotes").value.trim(),
    customDays: preset ? null : Number($("customDays").value) || null
  };
  const wasEditing = editing !== null;
  if (wasEditing) crops[editing] = record;
  else crops.push(record);
  persistCrops();
  resetPlanner();
  renderCrops();
  $("formStatus").textContent = wasEditing ? "Planting updated." : "Added to your garden.";
});

// The public Open-Meteo endpoints need no API key for this noncommercial app.
async function getJSON(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error(response.status === 429 ? "The weather service is busy. Try again in a moment." : "The weather service could not complete the request.");
    return await response.json();
  } catch (error) {
    if (error.name === "AbortError") throw new Error("The request timed out. Please try again.");
    throw error;
  } finally { clearTimeout(timer); }
}
function weatherLabel(code) {
  if (code === 0) return ["☀️", "Clear skies"];
  if ([1, 2].includes(code)) return ["🌤️", "Partly cloudy"];
  if (code === 3) return ["☁️", "Overcast"];
  if ([45, 48].includes(code)) return ["🌫️", "Fog"];
  if ([51, 53, 55, 56, 57].includes(code)) return ["🌦️", "Drizzle"];
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return ["🌧️", "Rain"];
  if ([71, 73, 75, 77, 85, 86].includes(code)) return ["❄️", "Snow"];
  if ([95, 96, 99].includes(code)) return ["⛈️", "Thunderstorms"];
  return ["🌡️", "Conditions unavailable"];
}
function number(value, digits = 0) { return Number.isFinite(value) ? value.toFixed(digits) : "—"; }
function renderWeather() {
  if (!weather) return;
  $("weatherContent").hidden = false;
  const [icon, description] = weatherLabel(weather.current.weather_code), d = weather.daily;
  $("weatherIcon").textContent = icon;
  $("temperature").textContent = number(weather.current.temperature_2m) + "°F";
  $("weatherLocation").textContent = gardenLocation.name;
  $("weatherDescription").textContent = description;
  $("weatherDetail").textContent = "High " + number(d.temperature_2m_max[0]) + "° · Low " + number(d.temperature_2m_min[0]) + "°\nWind " + number(weather.current.wind_speed_10m) + " mph";
  $("forecast").replaceChildren();
  d.time.forEach((date, index) => {
    const day = el("div", undefined, "forecast-day");
    const [symbol, label] = weatherLabel(d.weather_code[index]);
    const dayName = index === 0 ? "Today" : G.parseDate(date).toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" });
    const mark = el("span", symbol, "forecast-icon");
    mark.setAttribute("role", "img");
    mark.setAttribute("aria-label", label);
    day.append(el("span", dayName, "small"), mark, el("strong", number(d.temperature_2m_max[index]) + "°"), el("span", number(d.temperature_2m_min[index]) + "°", "muted small"), el("span", number(d.precipitation_sum[index], 2) + " in", "rain small"));
    day.title = formatDate(date, true) + ": " + label;
    $("forecast").append(day);
  });
  $("alerts").replaceChildren();
  const advisories = G.advisories(weather);
  if (weather.partial) $("alerts").append(el("p", "Some forecast values are missing. Weather guidance is limited to the available data.", "muted small"));
  if (!advisories.length && !weather.partial) $("alerts").append(el("p", "No major temperature, rain, or wind risks flagged in the next seven days.", "calm-note"));
  advisories.forEach(advice => {
    const box = el("div", undefined, "weather-advice");
    box.append(el("strong", advice.title + " · " + formatDate(advice.date)), el("p", advice.text));
    $("alerts").append(box);
  });
}
async function loadWeather() {
  const request = ++weatherVersion, requestedLocation = { ...gardenLocation };
  weather = null;
  $("weatherContent").hidden = true;
  $("alerts").replaceChildren();
  $("refreshWeather").disabled = true;
  $("weatherStatus").textContent = "Loading weather for " + requestedLocation.name + "…";
  refreshPlanner(false);
  const params = new URLSearchParams({
    latitude: requestedLocation.latitude, longitude: requestedLocation.longitude,
    current: "temperature_2m,weather_code,wind_speed_10m",
    daily: "temperature_2m_max,temperature_2m_min,precipitation_sum,weather_code,wind_speed_10m_max",
    temperature_unit: "fahrenheit", wind_speed_unit: "mph", precipitation_unit: "inch",
    timezone: "auto", forecast_days: "7"
  });
  try {
    let raw;
    if (apiBase) {
      try {
        raw = await apiRequest("/api/weather?" + new URLSearchParams({
          latitude: requestedLocation.latitude, longitude: requestedLocation.longitude
        }));
      } catch {
        raw = await getJSON("https://api.open-meteo.com/v1/forecast?" + params);
      }
    } else raw = await getJSON("https://api.open-meteo.com/v1/forecast?" + params);
    if (request !== weatherVersion) return;
    weather = G.normalizeWeather(raw);
    if (typeof weather.timezone === "string") { gardenLocation.timezone = weather.timezone; saveSettings(); }
    renderWeather();
    const time = new Date(weather.fetchedAt).toLocaleTimeString("en-US", { timeZone: weather.timezone || undefined, hour: "numeric", minute: "2-digit" });
    $("weatherStatus").textContent = "Updated " + time + " · " + (weather.timezone || "local time") + " · Forecast begins " + formatDate(weather.daily.time[0]);
    refreshPlanner(false);
  } catch (error) {
    if (request !== weatherVersion) return;
    weather = null;
    $("weatherContent").hidden = true;
    $("alerts").replaceChildren();
    $("weatherStatus").textContent = "Weather unavailable for " + requestedLocation.name + ". " + (error.message === "Failed to fetch" ? "Check your connection and try Refresh." : error.message);
    refreshPlanner(false);
  } finally { if (request === weatherVersion) $("refreshWeather").disabled = false; }
}
function chooseLocation(next) {
  locationIntent++;
  gardenLocation = next;
  $("locationResults").replaceChildren();
  // The NC calendar is regional. Never silently apply it to a distant city.
  if ($("calendarRegion").value === "nc" && !(next.latitude >= 34.5 && next.latitude <= 36.6 && next.longitude >= -81.4 && next.longitude <= -78.0)) {
    $("calendarRegion").value = "custom";
    $("regionNote").textContent = "New location selected. Add local frost dates to get a general planting window for this garden.";
  }
  saveSettings();
  loadWeather();
  renderCrops();
}
$("locationForm").addEventListener("submit", async event => {
  event.preventDefault();
  const query = $("locationSearch").value.trim();
  if (query.length < 2) return;
  const intent = ++locationIntent;
  $("searchButton").disabled = true;
  $("locationResults").replaceChildren(el("p", "Looking for matching locations…", "muted small"));
  try {
    const data = await getJSON("https://geocoding-api.open-meteo.com/v1/search?" + new URLSearchParams({ name: query, count: "6", language: "en", format: "json" }));
    if (intent !== locationIntent) return;
    $("locationResults").replaceChildren();
    const results = (data.results || []).filter(r => Number.isFinite(r.latitude) && Number.isFinite(r.longitude));
    if (!results.length) $("locationResults").append(el("p", "No locations found. Try a nearby city or add a state or country.", "muted small"));
    results.forEach(result => {
      const name = [result.name, result.admin1, result.country].filter(Boolean).join(", ");
      $("locationResults").append(button(name + " ↗", () => chooseLocation({ name, latitude: result.latitude, longitude: result.longitude, timezone: result.timezone }), "location-result"));
    });
  } catch (error) {
    if (intent === locationIntent) $("locationResults").replaceChildren(el("p", "Location search is unavailable. Try again or use your current location.", "muted small"));
  } finally { $("searchButton").disabled = false; }
});
$("useLocation").addEventListener("click", () => {
  if (!navigator.geolocation) { $("locationResults").replaceChildren(el("p", "Location is not supported in this browser. Search for your city instead.")); return; }
  const intent = ++locationIntent;
  $("useLocation").disabled = true;
  $("locationResults").replaceChildren(el("p", "Waiting for your location…", "muted small"));
  navigator.geolocation.getCurrentPosition(position => {
    $("useLocation").disabled = false;
    if (intent !== locationIntent) return;
    const { latitude, longitude } = position.coords;
    chooseLocation({ name: "Your location (" + latitude.toFixed(2) + ", " + longitude.toFixed(2) + ")", latitude, longitude });
  }, error => {
    $("useLocation").disabled = false;
    const message = error.code === 1
      ? "Location permission is blocked. Allow location access in your browser, or search for your city above."
      : error.code === 3
        ? "Finding your location timed out. Try again or search for your city above."
        : "Your location could not be found. Search for your city above.";
    if (intent === locationIntent) $("locationResults").replaceChildren(el("p", message, "muted small"));
  }, { timeout: 10000, maximumAge: 300000, enableHighAccuracy: false });
});
$("refreshWeather").addEventListener("click", loadWeather);
syncMethods();
refreshPlanner();
renderCrops();
connectBackend();
loadWeather();
// Expired forecasts never continue to drive planting advice.
setInterval(() => {
  if (weather && !usableWeather()) {
    weather = null;
    $("weatherContent").hidden = true;
    $("alerts").replaceChildren();
    $("weatherStatus").textContent = "The forecast has expired. Refresh to get current weather for " + gardenLocation.name + ".";
    refreshPlanner(false);
  }
}, 60000);

})();

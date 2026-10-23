/* Crop ranges and calendar: NC State Extension, Central NC calendar.
   Weather thresholds are app heuristics, not official weather warnings. */
(function (root) {
  "use strict";
  const CROPS = [
    { id: "tomato", name: "Tomatoes", icon: "🍅", season: "warm", methods: { transplant: [75, 85] }, windows: [["04-15", "07-14"], ["08-01", "08-14"]] },
    { id: "cucumber", name: "Cucumbers", icon: "🥒", season: "warm", methods: { seed: [56, 65], transplant: [28, 37] }, windows: [["04-15", "08-14"]] },
    { id: "squash", name: "Summer squash", icon: "🌼", season: "warm", methods: { seed: [50, 60], transplant: [30, 40] }, windows: [["04-01", "08-14"]] },
    { id: "beans", name: "Bush snap beans", icon: "🫘", season: "warm", methods: { seed: [50, 55] }, windows: [["03-15", "09-30"]] },
    { id: "carrot", name: "Carrots", icon: "🥕", season: "cool", methods: { seed: [75, 80] }, windows: [["02-01", "03-31"], ["06-15", "09-14"]] },
    { id: "lettuce", name: "Leaf lettuce", icon: "🥬", season: "cool", methods: { seed: [40, 50], transplant: [15, 25] }, windows: [["02-01", "04-30"], ["08-01", "09-30"]] },
    { id: "spinach", name: "Spinach", icon: "🌿", season: "cool", methods: { seed: [50, 60] }, windows: [["02-15", "06-30"], ["08-01", "10-14"]] },
    { id: "kale", name: "Kale", icon: "🥬", season: "cool", methods: { seed: [40, 50], transplant: [14, 22] }, windows: [["02-15", "06-30"], ["08-01", "09-30"]] },
    { id: "radish", name: "Radishes", icon: "🌱", season: "cool", methods: { seed: [20, 25] }, windows: [["02-01", "06-30"], ["08-01", "09-14"]] },
    { id: "beet", name: "Beets", icon: "🌱", season: "cool", methods: { seed: [55, 60] }, windows: [["03-01", "04-14"], ["07-15", "09-14"]] }
  ];
  // UTC calendar arithmetic avoids shifted dates around daylight saving time.
  function parseDate(value) {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
    const date = new Date(value + "T00:00:00Z");
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value ? date : null;
  }
  function addDays(value, days) {
    const date = parseDate(value);
    if (!date || !Number.isFinite(days)) return null;
    date.setUTCDate(date.getUTCDate() + days);
    return date.toISOString().slice(0, 10);
  }
  function daysBetween(a, b) {
    return parseDate(a) && parseDate(b) ? Math.round((parseDate(b) - parseDate(a)) / 86400000) : null;
  }
  function today(timezone) {
    try { return new Intl.DateTimeFormat("en-CA", { timeZone: timezone || undefined, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date()); }
    catch { return today(); }
  }
  function estimate(crop, method, planted) {
    const range = crop?.methods[method];
    return range && parseDate(planted) ? { early: addDays(planted, range[0]), late: addDays(planted, range[1]), suggested: addDays(planted, Math.round((range[0] + range[1]) / 2)) } : null;
  }
  function plantingWindows(crop, year, calendar, spring, fall, method) {
    if (calendar === "nc") return crop.windows.map(([a, b]) => [year + "-" + a, year + "-" + b]);
    if (!parseDate(spring) || !parseDate(fall) || spring >= fall || spring.slice(0, 4) !== String(year) || fall.slice(0, 4) !== String(year)) return [];
    const maturity = crop.methods[method]?.[1];
    if (!maturity) return [];
    // General frost-relative planning, separate from the sourced regional calendar.
    const ranges = crop.season === "warm"
      ? [[addDays(spring, 14), addDays(fall, -maturity - 14)]]
      : [[addDays(spring, -28), addDays(spring, 14)], [addDays(fall, -maturity - 21), addDays(fall, -maturity)]];
    return ranges.filter(([a, b]) => a <= b);
  }
  function recommendation(crop, method, planted, calendar, spring, fall, weather) {
    const windows = plantingWindows(crop, Number(planted?.slice(0, 4)), calendar, spring, fall, method);
    if (!parseDate(planted)) return { tone: "neutral", title: "Choose a planting date", text: "See how it fits your planting calendar." };
    if (!windows.length) return { tone: "neutral", title: "Add your local frost dates", text: "Enter a last spring frost and first fall frost in the planting year to calculate a general window." };
    if (!windows.some(([a, b]) => planted >= a && planted <= b)) return { tone: "caution", title: "Outside the suggested planting window", text: "You can still save this planting. Consider local conditions or a protected growing space." };
    const forecastDay = weather?.daily.time.indexOf(planted) ?? -1;
    if (forecastDay >= 0) {
      const d = weather.daily;
      if (d.temperature_2m_min.slice(forecastDay).some(t => !Number.isFinite(t)) || !Number.isFinite(d.temperature_2m_max[forecastDay]) || !Number.isFinite(d.precipitation_sum[forecastDay])) return { tone: "neutral", title: "Some forecast data is missing", text: "The date fits the calendar, but weather guidance is incomplete. Check local conditions before planting." };
      const lows = d.temperature_2m_min.slice(forecastDay).filter(Number.isFinite);
      if (lows.some(t => t <= 32)) return { tone: "caution", title: "Freezing temperatures in the forecast", text: "Consider delaying planting or protecting seedlings. Air temperature cannot confirm soil conditions." };
      if (crop.season === "warm" && lows.some(t => t < 50)) return { tone: "caution", title: "Cool nights ahead", text: "Consider waiting for warmer nights before planting this warm-season crop." };
      if (crop.season === "cool" && d.temperature_2m_max[forecastDay] >= 80) return { tone: "caution", title: "A hot start for a cool-season crop", text: "Consider a cooler planting day and check soil moisture." };
      if (d.precipitation_sum[forecastDay] >= 1) return { tone: "caution", title: "Heavy precipitation is forecast", text: "Consider waiting until beds drain before planting." };
    }
    return { tone: "good", title: "Within the suggested planting window", text: forecastDay >= 0 ? "Check soil warmth and moisture before planting. A short forecast cannot rule out frost later in the season." : "This is calendar guidance; the selected date is outside the loaded weather forecast." };
  }
  function normalizeWeather(raw) {
    const keys = ["temperature_2m_max", "temperature_2m_min", "precipitation_sum", "weather_code", "wind_speed_10m_max"];
    const d = raw?.daily, c = raw?.current;
    if (!d || !Array.isArray(d.time) || !d.time.length || d.time.some(t => !parseDate(t)) || keys.some(k => !Array.isArray(d[k]) || d[k].length !== d.time.length) || !c || !Number.isFinite(c.temperature_2m)) throw new Error("The weather service returned incomplete data.");
    if (!Number.isFinite(d.temperature_2m_min[0]) || !Number.isFinite(d.temperature_2m_max[0])) throw new Error("The weather service returned incomplete data.");
    return { current: c, daily: d, timezone: raw.timezone, partial: keys.some(k => d[k].some(v => !Number.isFinite(v))), fetchedAt: Date.now() };
  }
  function advisories(weather) {
    const d = weather.daily, result = [];
    function notice(test, values, title, text) {
      const i = values.findIndex(v => Number.isFinite(v) && test(v));
      if (i >= 0) result.push({ date: d.time[i], title, text });
    }
    notice(t => t <= 32, d.temperature_2m_min, "Freezing temperatures", "Protect tender plants or bring containers inside.");
    notice(t => t >= 90, d.temperature_2m_max, "Hot weather", "Check soil moisture early and keep new seedlings from drying out.");
    notice(p => p >= 1, d.precipitation_sum, "Heavy precipitation", "Check drainage and hold off on watering if the soil is already wet.");
    if (Array.isArray(d.wind_speed_10m_max)) notice(w => w >= 20, d.wind_speed_10m_max, "Windy conditions", "Secure supports and protect young transplants.");
    return result;
  }
  const api = { CROPS, parseDate, addDays, daysBetween, today, estimate, plantingWindows, recommendation, normalizeWeather, advisories };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.Garden = api;
})(typeof window !== "undefined" ? window : globalThis);

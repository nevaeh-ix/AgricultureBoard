"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const G = require("./core.js");
const tomato = G.CROPS.find(c => c.id === "tomato");
const lettuce = G.CROPS.find(c => c.id === "lettuce");
const forecast = () => ({
  timezone: "America/New_York",
  current: { temperature_2m: 70, weather_code: 0, wind_speed_10m: 5 },
  daily: {
    time: ["2027-05-01", "2027-05-02", "2027-05-03"],
    temperature_2m_min: [55, 56, 55], temperature_2m_max: [75, 76, 75],
    precipitation_sum: [0, 0.1, 0], weather_code: [0, 1, 0], wind_speed_10m_max: [5, 7, 9]
  }
});
test("calendar arithmetic handles leap years, year boundaries, and DST", () => {
  assert.equal(G.addDays("2028-02-28", 1), "2028-02-29");
  assert.equal(G.addDays("2027-12-31", 1), "2028-01-01");
  assert.equal(G.addDays("2027-03-13", 2), "2027-03-15");
  assert.equal(G.daysBetween("2027-11-06", "2027-11-08"), 2);
  for (const value of ["2027-02-29", "2027-04-31", "not a date"]) assert.equal(G.parseDate(value), null);
});
test("harvest estimates distinguish seeds from transplants", () => {
  assert.deepEqual(G.estimate(lettuce, "seed", "2027-03-01"), { early: "2027-04-10", late: "2027-04-20", suggested: "2027-04-15" });
  assert.deepEqual(G.estimate(lettuce, "transplant", "2027-03-01"), { early: "2027-03-16", late: "2027-03-26", suggested: "2027-03-21" });
  assert.equal(G.estimate(tomato, "seed", "2027-03-01"), null);
});
test("corn, tomatoes and potatoes have distinct planting material and harvest estimates", () => {
  const corn = G.CROPS.find(c => c.id === "corn");
  const potato = G.CROPS.find(c => c.id === "potato");
  assert.equal(G.CROPS.filter(c => c.id === "tomato").length, 1);
  assert.deepEqual(G.estimate(corn, "seed", "2027-04-01"), { early: "2027-06-25", late: "2027-06-30", suggested: "2027-06-28" });
  assert.deepEqual(G.estimate(potato, "tuber", "2027-03-01"), { early: "2027-06-04", late: "2027-06-29", suggested: "2027-06-17" });
  assert.equal(G.estimate(potato, "seed", "2027-03-01"), null);
  assert.deepEqual(G.plantingWindows(corn, 2027, "nc"), [["2027-03-15", "2027-05-31"]]);
  assert.deepEqual(G.plantingWindows(potato, 2027, "nc"), [["2027-02-15", "2027-03-31"]]);
});
test("planting window boundaries and separate summer windows", () => {
  const advice = date => G.recommendation(tomato, "transplant", date, "nc").tone;
  for (const date of ["2027-04-14", "2027-07-15", "2027-08-15"]) assert.equal(advice(date), "caution");
  for (const date of ["2027-04-15", "2027-07-14", "2027-08-01"]) assert.equal(advice(date), "good");
});
test("custom frost dates must be ordered in the planting year", () => {
  const windows = (spring, fall) => G.plantingWindows(tomato, 2027, "custom", spring, fall, "transplant");
  assert.deepEqual(windows("2026-04-15", "2026-10-31"), []);
  assert.deepEqual(windows("2027-10-31", "2027-04-15"), []);
  assert.deepEqual(windows("2027-04-15", "2027-10-31"), [["2027-04-29", "2027-07-24"]]);
  assert.deepEqual(windows("2027-06-01", "2027-07-01"), []);
});
test("forecast lows override a favorable calendar", () => {
  const raw = forecast(); raw.daily.temperature_2m_min[2] = 30;
  assert.match(G.recommendation(tomato, "transplant", "2027-05-01", "nc", "", "", G.normalizeWeather(raw)).title, /Freezing/);
});
test("warm-season and cool-season crops handle cool nights differently", () => {
  const raw = forecast(); raw.daily.time = ["2027-04-15", "2027-04-16", "2027-04-17"]; raw.daily.temperature_2m_min = [45, 48, 46];
  const weather = G.normalizeWeather(raw);
  assert.match(G.recommendation(tomato, "transplant", "2027-04-15", "nc", "", "", weather).title, /Cool nights/);
  assert.equal(G.recommendation(lettuce, "seed", "2027-04-15", "nc", "", "", weather).tone, "good");
});
test("future dates do not reuse today's forecast", () => {
  const raw = forecast(); raw.daily.temperature_2m_min[0] = 20;
  const advice = G.recommendation(tomato, "transplant", "2027-06-01", "nc", "", "", G.normalizeWeather(raw));
  assert.equal(advice.tone, "good");
  assert.match(advice.text, /outside the loaded weather forecast/);
});
test("past forecast days do not warn about later plantings", () => {
  const raw = forecast(); raw.daily.temperature_2m_min[0] = 20;
  assert.equal(G.recommendation(tomato, "transplant", "2027-05-03", "nc", "", "", G.normalizeWeather(raw)).tone, "good");
});
test("null weather values never become freezing or dry weather", () => {
  const raw = forecast(); raw.daily.temperature_2m_min[1] = null; raw.daily.precipitation_sum[1] = null;
  const weather = G.normalizeWeather(raw);
  assert.equal(weather.partial, true);
  assert.deepEqual(G.advisories(weather), []);
  assert.equal(G.recommendation(tomato, "transplant", "2027-05-01", "nc", "", "", weather).tone, "neutral");
});
test("malformed API data is rejected", () => {
  assert.throws(() => G.normalizeWeather({}), /incomplete/);
  const raw = forecast(); raw.daily.temperature_2m_min.pop();
  assert.throws(() => G.normalizeWeather(raw), /incomplete/);
});
test("advisories use the actual threshold day", () => {
  const raw = forecast();
  raw.daily.temperature_2m_min[1] = 32; raw.daily.temperature_2m_max[2] = 90;
  raw.daily.precipitation_sum[0] = 1; raw.daily.wind_speed_10m_max[1] = 20;
  assert.deepEqual(G.advisories(G.normalizeWeather(raw)).map(n => n.date), ["2027-05-02", "2027-05-03", "2027-05-01", "2027-05-02"]);
});

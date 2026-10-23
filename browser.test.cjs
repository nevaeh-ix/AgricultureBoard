// Load classic script tags, rather than eval(), to exercise real global bindings.
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { JSDOM, VirtualConsole } = require("jsdom");
const source = name => readFileSync(require("node:path").join(__dirname, name), "utf8");
const fixture = {
  timezone: "America/New_York",
  current: { temperature_2m: 72, weather_code: 0, wind_speed_10m: 4 },
  daily: { time: ["2027-04-01", "2027-04-02"], temperature_2m_max: [75, 76],
    temperature_2m_min: [54, 55], precipitation_sum: [0, 0.1], weather_code: [0, 1], wind_speed_10m_max: [6, 8] }
};
async function openApp() {
  const errors = [], requests = [];
  let failWeather = false, denied = true;
  const vc = new VirtualConsole();
  vc.on("jsdomError", e => errors.push(e.message));
  const html = source("index.html").replace(/<script\b[^>]*src="[^"]*"[^>]*><\/script>/g, "")
    .replace("</body>", "<script>" + source("core.js") + "</script><script>" + source("script.js") + "</script></body>");
  const dom = new JSDOM(html, {
    url: "https://example.com/AgricultureBoard/", runScripts: "dangerously", virtualConsole: vc,
    beforeParse(window) {
      window.HTMLElement.prototype.scrollIntoView = () => {};
      Object.defineProperty(window.navigator, "geolocation", { value: { getCurrentPosition(success, error) {
        if (denied) error({ code: 1 });
        else success({ coords: { latitude: 35.78, longitude: -78.64 } });
      } } });
      window.fetch = async url => {
        requests.push(String(url));
        if (String(url).includes("geocoding-api")) return { ok: true, json: async () => ({ results: [
          { name: "Raleigh", admin1: "North Carolina", country: "United States", latitude: 35.78, longitude: -78.64, timezone: "America/New_York" }
        ] }) };
        return { ok: !failWeather, status: failWeather ? 503 : 200, json: async () => JSON.parse(JSON.stringify(fixture)) };
      };
    }
  });
  const tick = () => new Promise(resolve => setImmediate(resolve));
  const $ = id => dom.window.document.getElementById(id);
  const change = (id, value, type = "input") => { $(id).value = value; $(id).dispatchEvent(new dom.window.Event(type, { bubbles: true })); };
  await tick();
  return { dom, $, tick, change, errors, requests, fail: () => { failWeather = true; }, allowLocation: () => { denied = false; } };
}
test("classic browser script starts without colliding with window.location", async t => {
  const app = await openApp(); t.after(() => app.dom.window.close());
  assert.deepEqual(app.errors, []);
  assert.equal(app.$("cropPreset").options.length, 13);
  assert.equal(app.$("temperature").textContent, "72°F");
  assert.equal(app.dom.window.location.pathname, "/AgricultureBoard/");
});
test("save, edit, and remove controls work with the page's actual script tags", async t => {
  const a = await openApp(); t.after(() => a.dom.window.close());
  a.change("cropPreset", "potato", "change");
  a.change("plantDate", "2027-03-01");
  assert.equal(a.$("plantMethod").selectedOptions[0].textContent, "Seed potatoes");
  assert.equal(a.$("harvestDate").value, "2027-06-17");
  a.$("saveCrop").click();
  assert.match(a.$("cropList").textContent, /Potatoes/);
  const buttons = () => [...a.$("cropList").querySelectorAll("button")];
  buttons().find(b => b.textContent === "Edit").click();
  a.change("yieldAmount", "5.5");
  a.$("saveCrop").click();
  assert.match(a.$("cropList").textContent, /5.5 lb recorded/);
  assert.equal(a.$("cropList").querySelectorAll("article").length, 1);
  buttons().find(b => b.textContent === "Remove").click();
  buttons().find(b => b.textContent === "Yes, remove").click();
  assert.equal(a.$("cropList").querySelectorAll("article").length, 0);
  assert.equal(a.dom.window.localStorage.getItem("crops"), "[]");
  assert.deepEqual(a.errors, []);
});
test("city search selects coordinates and refreshes weather", async t => {
  const a = await openApp(); t.after(() => a.dom.window.close());
  a.change("locationSearch", "Raleigh");
  a.$("searchButton").click();
  await a.tick();
  a.$("locationResults").querySelector("button").click();
  await a.tick();
  assert.match(a.$("weatherLocation").textContent, /Raleigh/);
  assert.match(a.requests.at(-1), /latitude=35.78/);
  assert.match(a.requests.at(-1), /longitude=-78.64/);
  a.fail();
  a.$("refreshWeather").click();
  await a.tick();
  assert.match(a.$("weatherStatus").textContent, /unavailable/);
  assert.equal(a.$("weatherContent").hidden, true);
});
test("current location supports success and explains denied permission", async t => {
  const a = await openApp(); t.after(() => a.dom.window.close());
  a.$("useLocation").click();
  assert.match(a.$("locationResults").textContent, /permission is blocked/);
  assert.equal(a.$("useLocation").disabled, false);
  a.allowLocation();
  a.$("useLocation").click();
  await a.tick();
  assert.match(a.requests.at(-1), /latitude=35.78/);
  assert.match(a.$("weatherLocation").textContent, /Your location/);
});

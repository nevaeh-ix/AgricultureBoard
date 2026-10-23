# AgricultureBoard

A garden planner with live local weather, crop presets, planting windows, and a browser-saved crop log. Built with HTML, CSS, and JavaScript.

## Run locally

Use Python 3 to serve the files:

~~~sh
python -m http.server 8000
~~~

Open http://localhost:8000. No build step or API key is required for this noncommercial app. Internet access is needed for weather, location search, and optional web fonts. The interface and crop log work without weather; system fonts are used if web fonts cannot load.

## Plan a planting

- Search for a city or postal code and select a matching location. Greensboro, NC is the initial location. The optional location button requests browser permission only when clicked.
- Select one of 12 crops, including tomatoes, sweet corn, and potatoes, or enter a custom crop. Where supported, switch between seeds and transplants to update the harvest range. Potatoes use seed tubers.
- Choose a planting date to see a calendar recommendation and estimated harvest range. The harvest date remains editable; changing the crop, method, or planting date recalculates it.
- Save, edit, or remove plantings. Existing records under the original localStorage key, crops, are retained. Storage is specific to this browser and origin; it does not sync across devices.

## Data and recommendation limits

Weather and city search use [Open-Meteo](https://open-meteo.com/) and its [geocoding API](https://open-meteo.com/en/docs/geocoding-api). Requests include current temperature, conditions, wind, and seven daily forecasts in Fahrenheit, inches, and mph, using the location's timezone. The public API is for noncommercial use; commercial deployments need to review the provider's terms. Requests time out after 15 seconds. Expired data stops driving recommendations after 30 minutes.

Crop maturity ranges and half-month outdoor planting windows are adapted from the [NC State Extension Central North Carolina calendar](https://content.ces.ncsu.edu/central-north-carolina-planting-calendar-for-annual-vegetables-fruits-and-herbs). Seed and transplant maturity ranges are distinct. Tomatoes use transplants; the app does not treat indoor tomato sowing as outdoor planting.

For other regions, enter local frost dates for the same planting year. Those windows are app heuristics, not an Extension calendar: warm crops start 14 days after the last spring frost and stop one full maturity period plus 14 days before the first fall frost; cool crops have a spring window from 28 days before to 14 days after the spring frost, plus a fall window 0–21 days before a maturity-period lead-in to the fall frost. This calculator requires spring and fall dates in that order within one calendar year; frost-free climates and seasons spanning New Year need local guidance.

Forecast tips flag lows at or below 32°F, highs at or above 90°F, daily precipitation at or above 1 inch, and wind at or above 20 mph. Warm-season planting guidance also flags nights below 50°F; cool-season guidance flags planting-day highs at or above 80°F. These are simple app thresholds, not official warnings or soil measurements. Forecasts cannot establish frost-free conditions for the full growing season. Harvest dates are estimates; check variety labels and actual ripeness.

Only the selected city's coordinates or your requested device location are sent to the weather service. Crop records stay in local browser storage. Custom crop text and search results are rendered as text rather than HTML.

## Checks

Requires Node.js 22 or newer. Development dependencies are only needed for tests; the website still runs without installing packages.

~~~sh
npm ci
npm test
~~~

Tests cover harvest calculations, seeds/transplants/tubers, calendar boundaries, frost dates, forecast scope, missing API values, and weather thresholds. Browser DOM checks load the actual classic script tags and exercise startup, crop controls, city selection, current location, denied permissions, and weather failures.

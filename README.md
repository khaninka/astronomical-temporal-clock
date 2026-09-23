# Astronomical Hours

A browser-only astronomical temporal clock, built with JavaScript ES Modules, HTML, CSS, Vite, and Vitest. There is no framework and no backend.

## Delivery pipeline

The module sequence is fixed:

`Location → SunCrossing → BoundaryRule → TemporalClock → Display`

Development is milestone-gated: **the next module begins only after the previous module has unit tests and has been integrated into the browser application.** Do not implement a later module speculatively.

The project decisions are kept as separate documents rather than collapsed into this README:

- [Specification](docs/specification.md)
- [Verification & Test Plan](docs/verification-test-plan.md)
- [Development Plan](docs/development-plan.md)
- [Security Assessment](docs/security.md)
- [SunCrossing Reference Standard](docs/sun-crossing-reference.md)

The astronomy implementation is based on the published report [NREL Solar Position Algorithm, NREL/TP-560-34302](https://docs.nlr.gov/docs/fy08osti/34302.pdf). It is an independent implementation; the separately licensed reference C source is not copied into this project.

## Current milestone: M5 Display — complete

`Location` is complete and integrated in the browser. It provides:

- manual latitude, longitude, and elevation input;
- coordinate lookup through the browser Geolocation API after an explicit button click;
- device-local date and time;
- required, finite-number, latitude-range, and longitude-range validation;
- unit tests for validation, geolocation success/failure, date/time formatting, and terrain elevation lookup.

The M2 calculation core now provides:

- `solarPosition(time, observer)` mathematics implemented independently from NREL SPA;
- `findSunCrossing({ start, end, observer, targetAltitude, direction })` for rising or setting crossings;
- an explicit `NO_CROSSING` result for polar/no-event intervals;
- canonical NREL regression tests and Astronomy Engine as a development-only oracle.

M1 through M5 are complete for the local v1 prototype. Five accessible tabs use the approved English labels `Settings`, `Clock`, `Day boundaries`, `Time calculation`, and `Day hours`. A first visit opens Settings; after valid location data is saved, the live clock opens automatically for the tab session. The clock shows the active DAY or NIGHT period as twelve astronomical sectors between boundary labels `0…12` on a semicircle. Time calculation explains the active period, its boundaries and duration, the duration of one astronomical hour, and the resulting astronomical time. The Day hours tab lists the twelve daytime astronomical hours with their ordinary local start and end times. At astronomical night (`צאת הכוכבים לחומרא`, stringent nightfall) the table switches once to the following calendar date; civil midnight does not change it.

The live schedule is refreshed when the device's local date changes and whenever the page resumes after sleep or returns from the background. DAY/NIGHT transitions therefore do not require a page reload.

If the browser does not provide a reliable altitude, elevation remains empty. The user can enter it manually or explicitly request estimated terrain elevation. Validated latitude, longitude, and elevation are saved only in the current tab session (`sessionStorage`). The live clock always uses the current device-local date. An editable date remains under **Diagnostic test date** and affects only BoundaryRule and diagnostic TemporalClock output.

## Run locally

Requires a current Node.js release.

```sh
npm install
npm run dev
```

Open the local URL printed by Vite. Browser geolocation is available in a secure context; `localhost` is treated as secure by modern browsers.

## GitHub Pages

The production build uses the repository base path `/astronomical-temporal-clock/`. Pushes to `main` run the tests, build `dist`, and deploy that directory through `.github/workflows/deploy-pages.yml`. In the repository settings, select **Settings → Pages → Build and deployment → Source: GitHub Actions**.

## Test

```sh
npm test
```

For a detailed NREL SPA comparison showing expected values, calculated values, differences, and tolerances:

```sh
npm run verify:spa
```

After the canonical fixture passes, compare our implementation with the independent development oracle:

```sh
npm run verify:oracle
```

For the readable multi-location, multi-season, elevation, crossing, and polar-state report:

```sh
npm run verify:matrix
```

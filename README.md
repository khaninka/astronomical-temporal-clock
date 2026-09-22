# Astronomical Temporal Clock

A browser-only astronomical temporal clock, built with JavaScript ES Modules, HTML, CSS, Vite, and Vitest. There is no framework and no backend.
...

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

## Current milestone: M5 Display

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

M2, M3, and M4 are complete. M5 is active: the existing diagnostic screen remains available, and the current graphical prototype shows the active DAY or NIGHT period as twelve astronomical sectors on a semicircle. A shared pointer synchronizes those sectors with an inner ordinary-time scale. The display is rebuilt from the selected date, coordinates, and elevation.

If the browser does not provide a reliable altitude, elevation remains empty. The user can enter it manually or explicitly request estimated terrain elevation. Location data is kept in the page only; persistence belongs to a future explicit requirement.

## Run locally

Requires a current Node.js release.

```sh
npm install
npm run dev
```

Open the local URL printed by Vite. Browser geolocation is available in a secure context; `localhost` is treated as secure by modern browsers.

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

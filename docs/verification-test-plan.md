# Astronomical Temporal Clock — Verification & Test Plan

Version 0.1 (reconstructed from the approved project discussion)

## 1. Strategy

Testing follows the runtime pipeline. A module must pass its unit tests, its integration with every preceding module, and its security/privacy gate before work starts on the next module. Astronomical comparisons use an independent authoritative reference, not the production implementation itself.

At every gate, repeat the dependency audit, inspect new input-to-output paths for injection, confirm what data is stored or transmitted, review browser permissions, and update `docs/security.md` with remaining risks and a go/no-go conclusion.

## 2. M1 — Location gate

Unit verification:

- accept latitude limits `−90` and `+90`;
- reject latitude outside those limits;
- accept longitude limits `−180` and `+180`;
- reject longitude outside those limits;
- reject missing and non-finite values;
- normalize valid numeric strings to numbers;
- preserve elevation in metres, including negative and decimal values;
- combine coordinates with a valid device `Date`;
- handle Geolocation API absence, permission denial, unavailability, and timeout;
- preserve unavailable altitude as unknown, leave elevation empty, and require manual input before saving;
- format device-local date/time without deriving a timezone from coordinates.
- initialize the calculation date from the device, allow editing it, validate it as a real local calendar date, and reset it on request; no calculation time-of-day is accepted;
- generate the Google Maps URL only from validated latitude/longitude;
- keep the external map link hidden until valid coordinates are available.
- never call the terrain-elevation service automatically;
- reject invalid coordinates before an Open-Meteo request;
- validate the returned elevation and preserve unknown on no-data/error responses;
- show the Open-Meteo/Copernicus source and keep the populated elevation editable.

Browser integration/demo verification:

1. Enter values manually and save them.
2. Request browser location and show the returned values.
3. Edit geolocation-provided values and save the edited values.
4. Show validation feedback without proceeding on invalid input.
5. Show and update device-local date/time.
6. Change the calculation date, confirm `LocationData`, and reset it with **Use device date**.
7. Open the optional map link and confirm that it points to the entered coordinates.
8. Press **Get terrain elevation**, verify the Open-Meteo disclosure/status, Copernicus attribution, editable result, and failure behavior.

Gate 1 passes only when automated tests pass and the demo is verified in a browser.

## 3. M2 — SunCrossing gate (active)

Compare morning/evening crossings and sunrise/sunset against an agreed independent astronomical reference for multiple coordinates, dates, hemispheres, seasons, and high latitudes. Verify explicit no-crossing results.

Verification order is mandatory:

1. Implement NREL SPA from the published mathematics without Astronomy Engine.
2. Pass the official Appendix A.5 canonical fixture, including selected intermediate quantities, zenith, elevation, azimuth, equation of time, sunrise, transit, and sunset.
3. Freeze that fixture as a regression test.
4. Add Astronomy Engine only afterward and use it as an independent development oracle over the wider test matrix.

Completed core checks:

- canonical NREL position and event fixture passes;
- position comparison with Astronomy Engine passes;
- rising and setting crossings at `−6°` differ from Astronomy Engine by `0.012 s` and `0.043 s` in the canonical location;
- polar intervals return `NO_CROSSING`;
- invalid and overlong search intervals are rejected;
- all searches use explicit UTC start/end instants and an explicit direction.
- position matrix covers both hemispheres, equatorial, mid-latitude, and high-latitude locations across equinoxes and solstices;
- crossing matrix covers civil, nautical, and astronomical targets, both directions, and UTC-date rollover;
- polar-day, polar-night, midnight-sun, and no-sunrise states agree with the independent oracle;
- `0/500/1000/2000 m` cases verify only the small NREL topocentric parallax effect.

Elevation is tested at the same latitude/longitude/date for `0`, `500`, `1000`, and `2000 m` solely to verify the NREL topocentric parallax calculation. No local-relief, line-of-sight, shadow, or geometric horizon correction may be inferred from terrain elevation. Tests must keep crossing targets referenced to the astronomical horizon.

The broader control matrix, `Location → SunCrossing` integration, and diagnostic result presentation are complete. Integration tests verify normalized coordinates/elevation, device-local calendar-day boundaries, changed location/date/target inputs, real rising/setting results, and preserved polar `NO_CROSSING` states. The browser displays local and UTC crossing times, target altitude, astronomical-horizon reference, and explicit no-crossing messages.

## 4. M3 — BoundaryRule gate (complete)

Use exact fixtures. Netz `06:10` must produce DAY start `04:58`; elevated-horizon shkiah `18:20` must produce DAY end `18:56`. Verify both boundaries independently, date-boundary rollover, and the complete `Location → SunCrossing → BoundaryRule` chain. No 90-minute variant may exist in the v1 API or UI.

The initial evening rule must reproduce the supplied `798 m` calendar checks:

- 2026-04-19: expected shkiah `19:15:15`, calculated target within the agreed tolerance;
- 2026-10-11: expected shkiah `18:16:15`;
- 2026-01-04: expected shkiah `16:53:30`.

Verify the ideal elevated-horizon formula independently and confirm that it is applied only to shkiah, not to netz. Add exact boundary comparisons for a reference time one millisecond before shkiah, exactly at shkiah, and one millisecond after it. Exactly at shkiah must belong to the newly started evening/night cycle.

## 5. M4 — TemporalClock gate (complete)

For both DAY and NIGHT verify:

- period start → `00:00:00`;
- 25% → `03:00:00`;
- 50% → `06:00:00`;
- 75% → `09:00:00`;
- period end → `12:00:00`;
- transition `DAY 12:00 → NIGHT 00:00`;
- simulated transitions and midnight/date rollover;
- before netz, between netz and shkiah, exactly at shkiah, and after shkiah;
- selected-today live comparison versus historical/future date with no live-state claim;
- correct temporal-hour, minute, and second lengths.

Run the full computational chain and simulate arbitrary times rather than waiting for real events.

Implemented checks cover `0/25/50/75/100%`, real temporal-hour duration, invalid intervals, pre-dawn NIGHT using yesterday's DAY end, DAY, post-DAY NIGHT using tomorrow's DAY start, exact DAY-start and DAY-end transitions, the full `Location → SunCrossing → BoundaryRule → TemporalClock` chain, polar `UNAVAILABLE`, live ticking for today, and suppression of live state for historical/future dates.

## 6. M5 — Display gate (active)

Keep all inputs and intermediate results visible and traceable. Verify manual entry, geolocation, recalculation, DAY/NIGHT transition, error states, and accessibility. For the graphical face, verify twelve equal sectors for the active period, pre-dawn and evening NIGHT selection, the exact DAY-end switch, synchronized pointer fraction, ordinary-time labels, one current-sector highlight, and rebuilding after Location/date/elevation changes.

# Astronomical Temporal Clock — Specification

Version 0.1 (reconstructed from the approved project discussion)

## 1. Purpose

The product is a location-dependent clock based on unequal temporal hours. A calculated DAY is divided into 12 temporal hours and the following NIGHT into 12 temporal hours. Their durations in SI seconds usually differ and vary with date and location.

The first implementation is a static browser application. It uses JavaScript ES Modules, HTML, and CSS, with no application framework and no backend. The calculation modules should remain portable to a future physical device.

## 2. Fixed processing pipeline

`Location → SunCrossing → BoundaryRule → TemporalClock → Display`

The current branch is explicitly scoped to the Israel fixed-minute boundary model. It applies `עלות השחר = visible sunrise −72 ordinary minutes` and `צאת הכוכבים לחומרא = visible sunset +36 ordinary minutes`. It does not reinterpret these offsets as latitude-aware astronomical twilight. A future global angular model, if pursued, must be developed separately.

Each module has one responsibility and later modules must not be folded into earlier ones.

An independent Test/Reference layer may compare results with authoritative external astronomical data, but it is not part of the runtime pipeline.

## 3. Data conventions

- Coordinate reference: WGS 84.
- Latitude and longitude: signed decimal degrees.
- Latitude range: `−90…+90`; north is positive.
- Longitude range: `−180…+180`; east is positive.
- Elevation: metres.
- No DMS coordinate representation inside the system.
- Astronomical calculations will convert angles to radians internally.
- Astronomical event instants will use UTC internally; user-facing local date/time comes from the device/browser.
- Timezone is not inferred from manually entered coordinates.

## 4. M1 — Location

`LocationData` contains:

```text
latitude
longitude
elevation
localDateTime
```

The user can enter latitude, longitude, and elevation manually or click **Use my location**. Browser geolocation fills all available values, and the fields remain editable. If browser altitude is unavailable, elevation remains empty and the UI explicitly requests manual input. Unknown elevation must never be represented as `0 m`, because zero is a real physical value. The calculation input is a device-local calendar date without a time-of-day component; `SunCrossing` calculates the whole selected day.

After coordinates pass validation, the page provides an optional **Check coordinates in Google Maps** link. The application does not contact Google automatically; opening the link is an explicit user action.

### Terrain elevation lookup

The user may press **Get terrain elevation** to query the **Open-Meteo Elevation API** using validated latitude and longitude. The lookup is never triggered automatically. The returned value is estimated terrain elevation from Copernicus DEM GLO-90 (90 m resolution) and remains editable.

The integration must:

- run only after an explicit user action, never automatically after geolocation;
- identify the returned value as estimated terrain elevation, not device/GPS altitude;
- display the source dataset and available resolution/accuracy metadata;
- leave the elevation field editable;
- preserve `unknown` when the service returns no data or fails;
- validate the response before using it;
- disclose that latitude and longitude will be transmitted to Open-Meteo.

The public OpenTopoData endpoint was evaluated but cannot be called directly from this browser-only application because it does not provide the required CORS response header. It remains a future option behind a controlled proxy or self-hosted deployment.

If the lookup is not used or fails, missing browser altitude requires manual elevation entry.

The live clock always uses the current device-local calendar date. A separate diagnostic date defaults to that date but remains editable for integration testing and historical/future BoundaryRule calculations. **Use device date** resets the diagnostic value. No calculation time-of-day is accepted. Dates are interpreted in the device's local timezone; coordinates do not change or infer a timezone.

**Confirm location** validates and produces `LocationData` for the in-memory pipeline. It does not persist coordinates or time across page reloads.

M1 validates required fields, finite numeric values, and coordinate ranges. It does not calculate solar events or temporal time.

## 5. M2 — SunCrossing (complete)

The module finds morning and evening crossings of a requested solar altitude and provides standard astronomical sunrise/sunset events. Its inputs include date, location, elevation, and requested solar altitude.

Elevation affects only the NREL SPA topocentric calculation; it is not applied separately to crossing targets or `BoundaryRule` offsets. All solar-altitude targets are referenced to the astronomical horizon. The clock models astronomical position and general sky illumination, which do not depend on whether local relief, a building, or another obstacle hides the solar disk from an observer. Local shade and direct visibility are outside the project. Atmospheric assumptions must remain explicit. Polar/no-crossing cases must be represented, not fabricated.

The NREL SPA implementation, independent Astronomy Engine matrix, Location integration, polar states, and diagnostic output have passed the M2 gate.

## 6. M3 — BoundaryRule (not implemented)

This module converts solar events into the clock's DAY boundaries. The only v1 rule is:

```text
dayStart = netz − 72 ordinary minutes
dayEnd   = elevated-horizon shkiah + 36 ordinary minutes
```

Netz is the standard `−0.8333°` morning crossing. `DAY start` is `Alot hashachar`, exactly 72 ordinary minutes before netz. The 90-minute stringent alternative is deliberately absent from v1: it is not a parameter, preset, or hidden option.

The evening anchor (shkiah) uses an ideal elevated horizon: `−0.8333° − acos(R/(R+h))`, where `h` is terrain elevation above mean sea level and obstructions are ignored. This shkiah rule matched the three supplied calendar fixtures within 14 seconds. `DAY end` is `Tzeit hakochavim l'chumra`, exactly 36 ordinary minutes after this shkiah.

Shkiah remains an explicitly reported transition anchor; civil midnight does not reset the clock. The `−72/+36` rules and elevated-horizon policy belong here, not in the verified base `SunCrossing` mathematics. Alternative profiles are outside v1.

## 7. M4 — TemporalClock (not implemented)

Given `start`, `end`, and current time `t`, a period is mapped to twelve temporal hours:

```text
X = 12 × (t − start) / (end − start)
```

DAY runs from `dayStart` to `dayEnd`. NIGHT runs from `dayEnd` to the next day's `dayStart`. Both are expressed as `00:00:00…12:00:00` on their own variable-duration scales.

The current device time must be classified explicitly against the calculated boundaries:

- before morning boundary: NIGHT that began at the previous shkiah;
- from morning boundary up to shkiah: DAY;
- at or after shkiah: NIGHT and the newly started evening cycle.

This live classification is shown only when the selected calculation date is the device's current local date. Historical and future dates show calculated boundaries without claiming a current state.

## 8. M5 — Display (implemented)

The interface uses four tabs: `Location`, `Astronomical Temporal Clock`, `BoundaryRule`, and `TemporalClock`. Location is shown until validated coordinates/elevation exist; then the clock is the default. Latitude, longitude, and elevation are stored only for the current tab session, while dates are never persisted. The diagnostic date cannot change the live clock date.

The first display is diagnostic, showing device-local time, inputs, all intermediate astronomical/boundary values, temporal time, and temporal-hour duration. A decorative clock face follows only after full-pipeline integration succeeds.

## 9. Explicit exclusions for the current milestone

The completed browser prototype contains no weather input, light sensor, local-shadow model, backend, account, or framework. Its only persistence is validated latitude, longitude, and elevation in tab-scoped session storage.

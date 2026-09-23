# Astronomical Temporal Clock — Security Assessment

## Required security gate

Security and privacy must be reassessed at the end of every milestone and whenever dependencies, data flows, hosting, persistence, or permissions change. A milestone report is incomplete unless it answers:

1. What data does this version receive, store, display, or transmit?
2. What new attack surfaces were introduced?
3. How is untrusted input validated and rendered?
4. What does the dependency audit report?
5. Which browser permissions are requested, and only when?
6. Are secrets, credentials, accounts, persistence, or backend services present?
7. Which risks remain before production deployment?
8. Is it safe to proceed to the next milestone?

Security findings are classified as `critical`, `high`, `moderate`, `low`, or `informational`. Critical and high findings block the next milestone. Moderate findings require an explicit resolution or documented acceptance before release.

## M1 Location assessment — 2026-09-21

### Scope and data flow

M1 receives latitude, longitude, elevation, and device-local date/time. Browser geolocation is requested only after the user presses **Use my location**. Validated latitude, longitude, and elevation are kept in tab-scoped session storage after **Next/Done** or a valid tab transition; dates are not persisted. Values are not sent over the network unless the user requests Open-Meteo elevation or explicitly opens the Google Maps verification link.

There is no backend, authentication, account, cookie, database, analytics, third-party script, external API call, or application secret.

### Existing protections

- Latitude and longitude are required, converted to finite numbers, and range-checked.
- Elevation is required and must be a finite number.
- Device date/time must be a valid `Date`.
- The editable diagnostic date is parsed as a real device-local calendar date before entering `LocationData`; it has no time-of-day component, cannot alter the live clock's current date, and is not persisted.
- Browser geolocation errors are converted to controlled user messages.
- Missing browser altitude is represented as unknown rather than silently converted to a plausible physical value.
- User-derived values and errors are rendered with `textContent`, not HTML insertion.
- No `eval`, dynamic function construction, `document.write`, `innerHTML`, or equivalent execution sink is used in application code.
- The page does not automatically make network requests or load third-party resources.
- The optional Google Maps link uses validated numeric coordinates and `rel="noopener noreferrer"` to isolate the new tab and suppress referrer information.
- The application has no production runtime dependencies.
- Production output contains only static HTML, CSS, and JavaScript.

### Current findings

#### Moderate — vulnerable development/test dependency

`npm audit` reports a path-traversal/arbitrary-file-read advisory in the installed Vitest 3 dependency chain (`GHSA-82fw-gwwq-j7x9`). The available automated fix upgrades Vitest and the coverage package to a new major version.

This code is development-only and is not included in the browser production bundle, so it does not directly expose visitors to the vulnerability. It still matters on developer and CI machines, especially when running untrusted test files or mock definitions. Upgrade compatibility must be checked and the audit repeated.

#### Moderate — production browser policy not configured

The repository does not yet define a Content Security Policy or deployment response headers such as `X-Content-Type-Options`, `Referrer-Policy`, and an appropriate `Permissions-Policy`. A static host must supply these, or a compatible CSP must be added to the HTML, before public release.

#### Low — precise location is displayed in the page

Coordinates are privacy-sensitive. This version stores validated latitude, longitude, and elevation in origin- and tab-scoped `sessionStorage`; the browser removes them when the tab session ends. Any script executing on the same origin in that tab could read them. Clicking **Check coordinates in Google Maps** intentionally transmits latitude and longitude to Google, subject to Google's privacy practices. No transmission occurs merely by displaying the link.

#### Resolved — elevation domain bounds

Elevation is finite and restricted to the supported terrestrial range `−500…10,000 m` before it enters astronomy or the M3 horizon formula.

#### Informational — development server is not a production server

Vite's development server is for local work only. It must not be exposed as the deployed service. Local development should bind to loopback unless LAN access is deliberately required.

### M1 conclusion

The current static M1 has a low application attack surface and no identified critical or high-severity application-code vulnerability. It is reasonably safe for local development and demonstration. It is **not yet production-hardened** because dependency remediation and deployment security policy remain open.

Proceeding to M2 is acceptable only as local development; public release requires the moderate findings to be resolved or explicitly accepted with deployment controls.

## External service: Open-Meteo Elevation API

Open-Meteo is an optional source of estimated terrain elevation. The application sends it validated latitude and longitude only after the user explicitly presses **Get terrain elevation**. No request occurs automatically after browser geolocation or manual input.

The implementation validates coordinates before transmission, uses HTTPS, applies a request timeout, validates HTTP/JSON/elevation fields, displays Open-Meteo and Copernicus DEM provenance, and never converts a failure into `0 m`. Remaining risks are third-party availability and rate limits, disclosure of precise coordinates to Open-Meteo, and reliance on a public service. A proxy or self-hosted elevation service remains an option for a later privacy-sensitive deployment.

The public OpenTopoData endpoint was rejected for direct frontend use because it does not return a browser CORS permission header. Bypassing this restriction through an arbitrary public CORS proxy is not permitted.

## M2 NREL SPA implementation review

The initial SPA implementation is deterministic, local-only mathematics with fixed-size coefficient tables. It adds no network request, permission, secret, persistence, or runtime dependency. Inputs are checked for finite numeric values, coordinate ranges, valid `Date` instances, and real ISO calendar dates. Polar no-crossing states are returned explicitly rather than converted to fabricated times. Computational work is bounded by fixed tables, so the current implementation does not expose an input-dependent resource-exhaustion loop.

## M2 SunCrossing core review — 2026-09-22

The crossing search receives UTC start/end dates, validated observer coordinates/elevation, a target altitude, and an explicit rising/setting direction. It stores and transmits nothing, requests no browser permission, makes no network call, uses no secret or backend, and renders no content. Astronomy Engine is a development-only oracle and is absent from production source imports and the browser bundle.

Untrusted numeric/date input is validated before calculation. Search duration is capped at 48 hours, scan and bisection tolerances must be positive finite values, and a missing event returns `NO_CROSSING`. These limits bound CPU work and prevent an attacker from supplying an arbitrarily long interval. The current tests use fixed public coordinates and do not transmit a user's position.

`npm audit` reports 3 moderate findings in the Vitest development/test chain (`GHSA-82fw-gwwq-j7x9`), with 0 high and 0 critical findings. Remediation currently requires a major-version upgrade. These packages are not production runtime dependencies, but untrusted test/mock files must not be run. Deployment CSP/headers also remain open as documented above.

No critical or high application-code finding blocks M2. Browser integration, the elevation policy, the broader crossing matrix, and diagnostic presentation now pass. The 3 moderate Vitest-chain findings are explicitly accepted for local development because the affected packages are development-only and untrusted tests are not run. Production headers and the compatible dependency upgrade remain mandatory before public release.

### Elevation policy addendum

No new calculation, I/O path, or dependency was added. Terrain elevation is passed to the bounded NREL topocentric calculation and is never converted into a local-horizon or shadow correction. This matches the clock's astronomical-position and general-sky-illumination model and removes the risk of treating direct solar visibility as a clock boundary.

### Control-matrix addendum

The expanded oracle matrix contains only fixed public test coordinates and dates. It performs deterministic local calculations and makes no network requests. Astronomy Engine remains a development-only dependency and is not imported by production source. Matrix size is fixed, so it does not create an input-controlled resource-exhaustion path.

### Location integration addendum

Confirmed Location data now enters the production `SunCrossing` calculation locally. The integration adds no transmission, persistence, browser permission, external script, runtime dependency, or HTML execution sink. It validates Location again at the module boundary, derives a bounded device-local calendar-day interval, and performs exactly two bounded crossing searches. Polar states remain structured data rather than fabricated times.

### Crossing display addendum

The diagnostic display renders dates, times, numeric targets, and fixed state messages exclusively through `textContent`. It introduces no HTML interpretation, URL construction, storage, transmission, permission, dependency, or unbounded computation. `NO_CROSSING` remains explicit and cannot be mistaken for a fabricated timestamp.

### M2 conclusion

M2 has no critical or high findings and is safe to close for local development. It receives validated Location/date data, stores nothing, and transmits nothing during astronomical calculation. The optional Google Maps and Open-Meteo actions retain their existing explicit disclosures. M3 may begin. Public deployment remains blocked on the documented moderate dependency remediation/acceptance and production browser-policy headers.

## M3 BoundaryRule review — 2026-09-22

M3 adds deterministic constant-time arithmetic plus two already-bounded `SunCrossing` calls. Elevation is restricted to `−500…10,000 m`; negative/sea-level elevation receives zero ideal-horizon dip. The DAY offsets are fixed constants (`−72 min`, `+36 min`) rather than untrusted inputs. Reference-time comparison accepts only a valid `Date` and treats exact shkiah as the new evening cycle. No network request, permission, storage, secret, backend, runtime dependency, or HTML execution sink was added.

The principal residual risk is model interpretation: ideal elevated-horizon shkiah ignores surrounding terrain and buildings. The UI states this explicitly. Three supplied calendar fixtures agree within 14 seconds. There are no critical or high M3 findings; the existing moderate Vitest-development advisory and deployment-header work remain unchanged.

### M3 conclusion

The approved fixed `−72/+36` BoundaryRule, elevated-horizon shkiah, exact-boundary behavior, Location integration, calendar fixtures, browser output, and input limits pass. M3 is closed for local development. M4 may begin only on explicit user direction.

## M4 TemporalClock review — 2026-09-22

M4 performs fixed-size date arithmetic and division over previously validated boundaries. It calculates only the previous, current, and next local dates, so work is bounded. Invalid dates, reversed intervals, references outside a mapped period, and missing polar boundaries produce controlled errors or `UNAVAILABLE`; fabricated temporal time is never returned. Browser updates reuse cached boundaries and perform only constant-time mapping once per second, avoiding repeated astronomy calculations.

All rendered values use `textContent`. M4 adds no network request, permission, persistence, secret, backend, external script, or runtime dependency. Live status is shown only when the selected calculation date equals the current device-local date. No critical or high finding is present; existing development-only Vitest and production-header findings remain unchanged. The user approved the checked DAY and NIGHT results, so M4 is closed for local development.

## M5 Display review — 2026-09-22

The current M5 face derives a fixed set of 12 sectors for the active DAY or NIGHT period from the already validated and bounded M4 schedule. Rendering work is constant-size once per second. SVG nodes and labels are created with DOM methods, fixed element names, fixed attributes, and `textContent`; no untrusted HTML is interpreted. Invalid or missing boundaries are rejected instead of drawing a misleading clock. The pointer and ordinary-time scale share the same validated period fraction, avoiding the misleading 24-hour/12-hour synchronization of the rejected full-circle prototype.

M5 adds no automatic network request, browser permission, secret, backend, external script, or runtime dependency. It stores only validated latitude, longitude, and elevation in session storage by explicit user requirement; no date or calculated result is stored. The diagnostic views remain present for traceability. No critical or high finding is present. The development-only Vitest advisory and production CSP/header work remain required before public deployment.

### Tabs and persistence addendum

Five ARIA tabs separate Location, the clock, BoundaryRule, TemporalClock, and the active-period hour table. Disabled tabs prevent presenting unavailable calculations; arrow, Home, and End navigation is supported after tabs become available. The 13-row table is generated with DOM methods and `textContent` from the already validated, fixed-size schedule. Persistence is deliberately limited to three validated numbers in `sessionStorage`. Stored values are validated again before calculation, storage failures degrade to in-memory operation, and the device-local current date is regenerated on every load. No HTML interpretation, dependency, permission, or automatic transmission was added.

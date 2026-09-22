# Astronomical Temporal Clock — Development Plan

## Governing rule

The next module starts only after the current module has passed unit testing, integration with the entire already-completed chain, and a documented security/privacy review. Every milestone report must answer the security questions in [Security Assessment](security.md). Critical and high findings block progression.

## Milestones

1. **M1 Location** — normalize and validate WGS 84 coordinates/elevation, obtain browser geolocation, attach device-local date/time, unit-test, integrate into a small browser demo, and assess location privacy and browser permissions.
2. **M2 SunCrossing** — approve the algorithm/reference/tolerance, implement solar crossings and sunrise/sunset, unit-test, integrate `Location → SunCrossing`, and review numeric denial-of-service and dependency risks.
3. **M3 BoundaryRule** — implement the sole v1 rule `netz −72 min / elevated shkiah +36 min`, unit-test, integrate through M3, and review all new input paths.
4. **M4 TemporalClock** — map DAY and NIGHT independently to twelve unequal hours, unit-test mathematical checkpoints, integrate the full computational pipeline, and review date/time boundary and resource-exhaustion risks.
5. **M5 Display** — preserve the diagnostic display of every intermediate result, add the graphical temporal/civil clock face, complete integration/e2e and security testing, and verify production headers/CSP/privacy behavior.

The web prototype v1 is complete only after M5. Portability to a later embedded/electronic version is an architectural constraint, not a current implementation milestone.

## Current status

M1 through M4 are complete. The user approved M4 after checking both DAY and NIGHT results. M5 is active: the initial unsynchronized full-circle concept was replaced by a shared semicircle for the active DAY or NIGHT period. Twelve temporal sectors and the ordinary-time scale now use the same period fraction and pointer. The diagnostic screen remains available.

The independent NREL SPA implementation passed Appendix A.5 before Astronomy Engine was added as a development-only oracle. The verified generic `SunCrossing` core remains referenced to the astronomical horizon. M3 will define an asymmetric initial boundary profile: standard morning crossing and ideal elevated-horizon shkiah, followed by explicit comparison of the relevant time with shkiah. Civil midnight never starts a new clock cycle. Details are fixed in `sun-crossing-reference.md` and `specification.md`.

## M1 extension

- **Terrain elevation:** an optional user-triggered Open-Meteo lookup fills the editable elevation field from latitude/longitude using Copernicus DEM GLO-90. It identifies the value as an estimate, retains source metadata, handles no-data/error states, and is included in the M1 security and test gates. OpenTopoData remains a future proxy/self-hosted alternative because its public endpoint does not permit direct browser CORS requests.

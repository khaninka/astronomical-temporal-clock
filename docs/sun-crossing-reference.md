# SunCrossing — Reference Standard and Benchmark Plan

Status: M2 complete; position, generic crossings, independent verification, Location integration, and diagnostic browser output pass.

## 0. Required implementation order

The project must not use Astronomy Engine while developing the first NREL SPA implementation. The order is fixed:

1. Implement the required NREL SPA mathematics independently from the published report.
2. Reproduce the canonical Appendix A.5 fixture using only our implementation and the published expected values.
3. Diagnose discrepancies against the report's intermediate values, not against another library.
4. Freeze the passing canonical fixture as a regression test.
5. Only then add Astronomy Engine as a development-only independent oracle.
6. Compare both implementations across the broader test matrix.
7. Begin `SunCrossing` root-search integration only after the underlying solar-position function has passed these checks.

This ordering prevents the independent library from becoming an accidental implementation dependency or a source of result-fitting.

## 1. Primary scientific reference

The primary mathematical reference is:

> Reda, I.; Andreas, A. *Solar Position Algorithm for Solar Radiation Applications*, NREL/TP-560-34302, revised January 2008. DOI: `10.2172/15003974`.

Stable entry points:

- Publication record: <https://research-hub.nlr.gov/en/publications/solar-position-algorithm-for-solar-radiation-applications-revised/>
- Current report PDF: <https://docs.nlr.gov/docs/fy08osti/34302.pdf>
- Official SPA calculator and implementation information: <https://midcdmz.nlr.gov/spa/>
- Persistent DOI: <https://doi.org/10.2172/15003974>

The project will implement the mathematics independently. The official C source is not copied or redistributed because it has separate licence conditions.

## 2. Canonical NREL SPA fixture

Source: report Appendix A.5, Table A5.1.

### Inputs

```text
Local date                    2003-10-17
Local standard time           12:30:30
Time-zone offset              −07:00
UTC instant                   2003-10-17T19:30:30Z
Latitude                      +39.742476°
Longitude                     −105.1786°
Observer elevation            1830.14 m
Pressure                      820 mbar
Temperature                   11 °C
ΔT                            67 s
Surface slope                 30°
Surface azimuth rotation      −10°
```

### Reference outputs

```text
Julian day                    2452930.312847
Topocentric zenith            50.11162°
Topocentric elevation         39.88838°  (90° − zenith)
Topocentric azimuth           194.34024° eastward from north
Surface incidence             25.18700°
Equation of time              14.641503 min
Solar transit                 2003-10-17T18:46:04.97Z
Sunrise                       2003-10-17T13:12:43.46Z
Sunset                        2003-10-18T00:20:19.19Z
```

The UTC date attached to sunset is made explicit here because the report prints event times in UT and sunset falls after UTC midnight.

## 3. Independent checks

- **Astronomy Engine:** automated development-only oracle for position and arbitrary solar-altitude crossings. Implemented after the NREL fixture passed; it is not imported by production source code.
- **US Naval Observatory:** independent event-level check for sunrise, sunset, transit, twilight, and polar states.
- **NOAA calculator:** manual secondary sanity check only; it is no longer actively maintained.

No reference library will be consulted during the initial SPA implementation or included in the production runtime.

## 4. M2 acceptance work

1. Reproduce the canonical NREL angular outputs directly from the report.
2. Freeze the canonical fixture as a regression test.
3. Resolve conventions for geometric versus refracted altitude.
4. Define how terrain elevation affects topocentric position without introducing local shadowing. **Complete; see Elevation and astronomical horizon below.**
5. Define pressure and temperature defaults for refraction.
6. Define ΔT/ΔUT1 sources and acceptable approximations for the supported date range.
7. Establish time and angular tolerances before comparing implementations.
8. Add Astronomy Engine as a development-only oracle. **Complete.**
9. Add public fixed-coordinate cases for equator, both hemispheres, solstices, equinoxes, high latitudes, polar no-crossing, and UTC date rollover. **Position matrix and polar no-crossing are complete; broader crossing matrix remains.**
10. Integrate normalized Location data and the device-local calculation date into the browser flow. **Complete.**

The required M2 items are approved and the M2 gate is closed. Additional reference cases may still be added as regression coverage without reopening the architecture.

## 5. Canonical fixture result

The independent JavaScript implementation reproduces the published position outputs at their printed precision, including topocentric zenith `50.11162°`, azimuth `194.34024°`, and incidence `25.18700°`.

Event differences from the printed NREL values are:

```text
Sunrise   +0.234 s
Transit   +0.166 s
Sunset    +0.102 s
```

The regression-test acceptance tolerance is `≤ 0.5 s`, substantially tighter than the report's stated `±30 s` sunrise/sunset uncertainty. The report's rounded `H/H′` and Equation-of-Time entries contain small internal rounding inconsistencies; the final topocentric outputs match and are treated as authoritative.

## 6. Generic crossing contract

`findSunCrossing` searches an explicit UTC interval of at most 48 hours for the instant when the geometric altitude of the Sun's centre crosses a requested altitude. The caller must choose `RISING` or `SETTING`; no date or direction is inferred. The implementation scans for a bracket and then uses bisection to one-millisecond time tolerance. If the requested crossing does not occur, it returns `NO_CROSSING` rather than inventing a time.

For the canonical observer, crossings through `−6°` differ from Astronomy Engine by `0.012 s` rising and `0.043 s` setting. This oracle is development-only.

## 7. Elevation and astronomical horizon

The Location `elevation` field is terrain elevation above mean sea level at the selected coordinates. It is not the observer's eye height above nearby ground.

NREL SPA uses this elevation only in its topocentric parallax calculation. Every `SunCrossing` target is measured relative to the astronomical horizon.

The clock models the Sun's astronomical position and general sky illumination. Direct visibility of the solar disk is irrelevant: local shade does not move a crossing. Surrounding relief, buildings, vegetation, and whether the observer can see the Sun are deliberately excluded from the model and are not planned inputs.

No horizon depression is derived from terrain elevation. Standard sunrise/sunset uses the NREL target `−0.8333°`, representing nominal refraction plus solar semidiameter. Civil, nautical, and astronomical twilight targets are respectively `−6°`, `−12°`, and `−18°`, all relative to the astronomical horizon.

## 8. Privacy and security

Reference fixtures use public, fixed coordinates rather than the user's current position. Reference libraries must be development-only dependencies and pass dependency audit. Automated tests must not silently send coordinates to online services; online comparisons, if used, must be an explicit maintenance action.

import { describe, expect, it } from 'vitest';
import { julianDay, solarEvents, solarPosition } from '../src/astronomy/nrel-spa.js';

// Canonical fixture: NREL/TP-560-34302, Appendix A.5, Table A5.1.
// https://docs.nlr.gov/docs/fy08osti/34302.pdf

const closeTo = (actual, expected, digits = 5) => expect(actual).toBeCloseTo(expected, digits);
const expectWithinMilliseconds = (actual, expected, toleranceMs) => {
  expect(Math.abs(actual.getTime() - new Date(expected).getTime())).toBeLessThanOrEqual(toleranceMs);
};

describe('NREL SPA', () => {
  it('calculates the canonical Julian day', () => {
    closeTo(julianDay(new Date('2003-10-17T19:30:30Z')), 2452930.312847, 6);
  });

  it('reproduces the published Appendix A.5 position fixture', () => {
    const result = solarPosition({
      date: new Date('2003-10-17T19:30:30Z'),
      latitude: 39.742476,
      longitude: -105.1786,
      elevation: 1830.14,
      pressure: 820,
      temperature: 11,
      deltaT: 67,
      deltaUt1: 0,
      surfaceSlope: 30,
      surfaceAzimuthRotation: -10,
    });

    closeTo(result.julianDay, 2452930.312847, 6);
    closeTo(result.heliocentricLongitude, 24.0182616917, 7);
    closeTo(result.heliocentricLatitude, -0.0001011219, 9);
    closeTo(result.radiusVector, 0.9965422974, 9);
    closeTo(result.geocentricLongitude, 204.0182616917, 7);
    closeTo(result.geocentricLatitude, 0.0001011219, 9);
    closeTo(result.nutationLongitude, -0.00399840, 7);
    closeTo(result.nutationObliquity, 0.00166657, 7);
    closeTo(result.trueObliquity, 23.440465, 6);
    closeTo(result.apparentLongitude, 204.0085519281, 7);
    closeTo(result.geocentricRightAscension, 202.22741, 5);
    closeTo(result.geocentricDeclination, -9.31434, 5);
    closeTo(result.localHourAngle, 11.105900, 5);
    // The report's rounded H/H' pair is internally inconsistent by ~0.00002°;
    // final topocentric angles match at the published precision.
    closeTo(result.topocentricHourAngle, 11.10629, 4);
    closeTo(result.topocentricRightAscension, 202.22704, 5);
    closeTo(result.topocentricDeclination, -9.316179, 6);
    closeTo(result.topocentricZenith, 50.11162, 5);
    closeTo(result.topocentricAzimuth, 194.34024, 5);
    closeTo(result.incidenceAngle, 25.18700, 5);
    closeTo(result.equationOfTime, 14.641503, 4);
  });

  it('reproduces the published Appendix A.5 sunrise, transit, and sunset', () => {
    const events = solarEvents({
      date: '2003-10-17',
      latitude: 39.742476,
      longitude: -105.1786,
      deltaT: 67,
      deltaUt1: 0,
    });

    expect(events.state).toBe('NORMAL');
    expectWithinMilliseconds(events.sunrise, '2003-10-17T13:12:43.460Z', 500);
    expectWithinMilliseconds(events.transit, '2003-10-17T18:46:04.970Z', 500);
    expectWithinMilliseconds(events.sunset, '2003-10-18T00:20:19.190Z', 500);
  });

  it('returns an explicit no-crossing state for polar day', () => {
    const events = solarEvents({
      date: '2026-06-21',
      latitude: 89,
      longitude: 0,
    });
    expect(events).toMatchObject({ state: 'SUN_ALWAYS_ABOVE', sunrise: null, sunset: null });
  });

  it('rejects a normalized but nonexistent calendar date', () => {
    expect(() => solarEvents({ date: '2026-02-30', latitude: 0, longitude: 0 }))
      .toThrow('date must be valid');
  });

  it('rejects invalid observer coordinates', () => {
    expect(() => solarPosition({
      date: new Date('2026-01-01T00:00:00Z'),
      latitude: 91,
      longitude: 0,
    })).toThrow('latitude must be between -90 and 90');
  });
});

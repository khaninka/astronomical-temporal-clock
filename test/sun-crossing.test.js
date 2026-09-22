import { Body, Observer, SearchAltitude } from 'astronomy-engine';
import { describe, expect, it } from 'vitest';
import { findSunCrossing } from '../src/astronomy/sun-crossing.js';
import { crossingCases, noCrossingCases } from './fixtures/astronomy-matrix.js';

const observer = { latitude: 39.742476, longitude: -105.1786, elevation: 1830.14 };

describe('SunCrossing', () => {
  it.each([
    ['RISING', 1, '2003-10-17T00:00:00Z', '2003-10-17T18:00:00Z'],
    ['SETTING', -1, '2003-10-17T18:00:00Z', '2003-10-18T06:00:00Z'],
  ])('matches Astronomy Engine for a -6° %s crossing', (direction, oracleDirection, startIso, endIso) => {
    const start = new Date(startIso);
    const end = new Date(endIso);
    const result = findSunCrossing({
      start,
      end,
      observer,
      targetAltitude: -6,
      direction,
      deltaT: 67,
    });
    const oracle = SearchAltitude(
      Body.Sun,
      new Observer(observer.latitude, observer.longitude, observer.elevation),
      oracleDirection,
      start,
      (end-start)/86_400_000,
      -6,
    );

    expect(result.state).toBe('FOUND');
    expect(Math.abs(result.time-oracle.date)).toBeLessThan(2000);
    expect(result.altitude).toBeCloseTo(-6, 5);
  });

  it('returns NO_CROSSING for polar day at the standard sunrise altitude', () => {
    const result = findSunCrossing({
      start: new Date('2026-06-21T00:00:00Z'),
      end: new Date('2026-06-22T00:00:00Z'),
      observer: { latitude: 89, longitude: 0, elevation: 0 },
      targetAltitude: -0.8333,
      direction: 'RISING',
    });
    expect(result).toEqual({
      state: 'NO_CROSSING',
      time: null,
      direction: 'RISING',
      targetAltitude: -0.8333,
    });
  });

  it('rejects an ambiguous or invalid search contract', () => {
    expect(() => findSunCrossing({
      start: new Date('2026-01-02T00:00:00Z'),
      end: new Date('2026-01-01T00:00:00Z'),
      observer,
      targetAltitude: 0,
      direction: 'RISING',
    })).toThrow('end must be after start');

    expect(() => findSunCrossing({
      start: new Date('2026-01-01T00:00:00Z'),
      end: new Date('2026-01-04T00:00:00Z'),
      observer,
      targetAltitude: 0,
      direction: 'RISING',
    })).toThrow('must not exceed 48 hours');
  });

  it.each(crossingCases)('matches the oracle matrix: $name', (fixture) => {
    const start = new Date(fixture.start);
    const end = new Date(fixture.end);
    const observerData = { latitude: fixture.latitude, longitude: fixture.longitude, elevation: fixture.elevation };
    const result = findSunCrossing({
      start,
      end,
      observer: observerData,
      targetAltitude: fixture.targetAltitude,
      direction: fixture.direction,
      deltaT: fixture.deltaT ?? 69,
    });
    const oracle = SearchAltitude(
      Body.Sun,
      new Observer(fixture.latitude, fixture.longitude, fixture.elevation),
      fixture.direction === 'RISING' ? 1 : -1,
      start,
      (end-start)/86_400_000,
      fixture.targetAltitude,
    );

    expect(oracle).not.toBeNull();
    expect(result.state).toBe('FOUND');
    expect(Math.abs(result.time-oracle.date)).toBeLessThan(2000);
  });

  it.each(noCrossingCases)('agrees on explicit NO_CROSSING: $name', (fixture) => {
    const start = new Date(fixture.start);
    const end = new Date(fixture.end);
    const result = findSunCrossing({
      start,
      end,
      observer: { latitude: fixture.latitude, longitude: fixture.longitude, elevation: fixture.elevation },
      targetAltitude: fixture.targetAltitude,
      direction: fixture.direction,
    });
    const oracle = SearchAltitude(
      Body.Sun,
      new Observer(fixture.latitude, fixture.longitude, fixture.elevation),
      fixture.direction === 'RISING' ? 1 : -1,
      start,
      (end-start)/86_400_000,
      fixture.targetAltitude,
    );

    expect(oracle).toBeNull();
    expect(result.state).toBe('NO_CROSSING');
    expect(result.time).toBeNull();
  });
});

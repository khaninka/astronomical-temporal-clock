import { describe, expect, it } from 'vitest';
import { calculateLocationTemporalClock, calculateTemporalClock, formatTemporalTime, mapPeriodToTemporalTime } from '../src/astronomy/temporal-clock.js';

const start = new Date('2026-09-22T02:00:00Z');
const end = new Date('2026-09-22T14:00:00Z');

describe('M4 temporal period mapping', () => {
  it.each([
    [0, '00:00:00.000'],
    [0.25, '03:00:00.000'],
    [0.5, '06:00:00.000'],
    [0.75, '09:00:00.000'],
    [1, '12:00:00.000'],
  ])('maps %s of a period to %s', (fraction, expected) => {
    const referenceTime = new Date(start.getTime()+(end-start)*fraction);
    expect(formatTemporalTime(mapPeriodToTemporalTime(referenceTime, start, end))).toBe(expected);
  });

  it('reports the real duration of one temporal hour', () => {
    expect(mapPeriodToTemporalTime(start, start, end).temporalHourDurationMilliseconds)
      .toBe(60*60*1000);
  });

  it('rejects reversed periods and references outside the period', () => {
    expect(() => mapPeriodToTemporalTime(start, end, start)).toThrow('periodEnd must be after');
    expect(() => mapPeriodToTemporalTime(new Date(start.getTime()-1), start, end)).toThrow('inside the period');
  });
});

describe('M4 DAY/NIGHT selection', () => {
  const previous = { dayEnd: { state: 'FOUND', time: new Date('2026-09-21T16:00:00Z') } };
  const current = {
    dayStart: { state: 'FOUND', time: new Date('2026-09-22T02:00:00Z') },
    dayEnd: { state: 'FOUND', time: new Date('2026-09-22T16:00:00Z') },
  };
  const next = { dayStart: { state: 'FOUND', time: new Date('2026-09-23T02:00:00Z') } };

  it.each([
    ['before DAY start', '2026-09-22T01:00:00Z', 'NIGHT'],
    ['exactly at DAY start', '2026-09-22T02:00:00Z', 'DAY'],
    ['inside DAY', '2026-09-22T10:00:00Z', 'DAY'],
    ['exactly at DAY end', '2026-09-22T16:00:00Z', 'NIGHT'],
    ['after DAY end', '2026-09-22T20:00:00Z', 'NIGHT'],
  ])('selects $2 %s', (_name, instant, expectedPeriod) => {
    expect(calculateTemporalClock({ referenceTime: new Date(instant), previous, current, next }).period)
      .toBe(expectedPeriod);
  });

  it('maps the DAY-end transition to NIGHT 00:00:00', () => {
    const result = calculateTemporalClock({ referenceTime: current.dayEnd.time, previous, current, next });
    expect(result.period).toBe('NIGHT');
    expect(formatTemporalTime(result)).toBe('00:00:00.000');
  });
});

describe('Location → BoundaryRule → TemporalClock integration', () => {
  const location = { latitude: 31.8199732324092, longitude: 35.1879525911133, elevation: 798 };

  it('calculates the live DAY temporal time across adjacent civil dates', () => {
    const result = calculateLocationTemporalClock(location, new Date('2026-09-22T09:00:00Z'));
    expect(result.state).toBe('AVAILABLE');
    expect(result.period).toBe('DAY');
    expect(result.periodStart).toEqual(result.current.dayStart.time);
    expect(result.periodEnd).toEqual(result.current.dayEnd.time);
    expect(result.hour).toBeGreaterThanOrEqual(0);
    expect(result.hour).toBeLessThan(12);
  });

  it('uses yesterday DAY end for the post-midnight NIGHT interval', () => {
    const result = calculateLocationTemporalClock(location, new Date('2026-09-22T01:00:00Z'));
    expect(result.state).toBe('AVAILABLE');
    expect(result.period).toBe('NIGHT');
    expect(result.periodStart).toEqual(result.previous.dayEnd.time);
    expect(result.periodEnd).toEqual(result.current.dayStart.time);
  });

  it('returns UNAVAILABLE rather than fabricating polar boundaries', () => {
    const result = calculateLocationTemporalClock(
      { latitude: 89, longitude: 0, elevation: 0 },
      new Date('2026-06-21T12:00:00Z'),
    );
    expect(result).toEqual({ state: 'UNAVAILABLE', reason: 'A required DAY/NIGHT boundary does not occur.' });
  });
});

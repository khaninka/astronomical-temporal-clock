import { describe, expect, it, vi } from 'vitest';
import { ALOT_OFFSET_SECONDS, calculateLocationBoundaries, compareTimeToShkiah, geometricHorizonDip, TZEIT_LCHUMRA_OFFSET_SECONDS } from '../src/astronomy/boundary-rule.js';

const location = {
  latitude: 31.8199732324092,
  longitude: 35.1879525911133,
  elevation: 798,
};

describe('M3 BoundaryRule', () => {
  it('calculates the ideal geometric horizon dip from terrain elevation', () => {
    expect(geometricHorizonDip(0)).toBe(0);
    expect(geometricHorizonDip(798)).toBeCloseTo(0.9068016654, 9);
    expect(geometricHorizonDip(-430)).toBe(0);
  });

  it('uses the standard target only for netz and the elevated target for shkiah', () => {
    const crossingFinder = vi.fn(({ direction, targetAltitude }) => ({ state: 'FOUND', direction, targetAltitude, time: new Date(0) }));
    const result = calculateLocationBoundaries({ ...location, localDateTime: '2026-04-19' }, { crossingFinder });

    expect(result.morningTargetAltitude).toBe(-0.8333);
    expect(result.eveningTargetAltitude).toBeCloseTo(-1.7401016654, 9);
    expect(crossingFinder.mock.calls[0][0]).toMatchObject({ direction: 'RISING', targetAltitude: -0.8333 });
    expect(crossingFinder.mock.calls[1][0].direction).toBe('SETTING');
  });

  it.each([
    ['2026-04-19', '2026-04-19T16:15:15Z'],
    ['2026-10-11', '2026-10-11T15:16:15Z'],
    ['2026-01-04', '2026-01-04T14:53:30Z'],
  ])('reproduces the supplied calendar shkiah fixture for %s', (localDateTime, expectedIso) => {
    const result = calculateLocationBoundaries({ ...location, localDateTime });
    expect(result.shkiah.state).toBe('FOUND');
    expect(Math.abs(result.shkiah.time-new Date(expectedIso))).toBeLessThan(15_000);
  });

  it('defines the only supported DAY boundaries as netz −72 and shkiah +36 minutes', () => {
    const result = calculateLocationBoundaries({ ...location, localDateTime: '2026-09-22' });
    expect(ALOT_OFFSET_SECONDS).toBe(72*60);
    expect(TZEIT_LCHUMRA_OFFSET_SECONDS).toBe(36*60);
    expect(result.netz.time-result.dayStart.time).toBe(72*60*1000);
    expect(result.dayEnd.time-result.shkiah.time).toBe(36*60*1000);
    expect(result.offsets).toEqual({ alotSeconds: 4320, tzeitLchumraSeconds: 2160 });
  });

  it('classifies the exact shkiah instant as the new evening cycle', () => {
    const shkiah = { state: 'FOUND', time: new Date('2026-04-19T16:15:19.497Z') };
    expect(compareTimeToShkiah(new Date(shkiah.time.getTime()-1), shkiah)).toBe('BEFORE_SHKIAH');
    expect(compareTimeToShkiah(new Date(shkiah.time), shkiah)).toBe('AT_OR_AFTER_SHKIAH');
    expect(compareTimeToShkiah(new Date(shkiah.time.getTime()+1), shkiah)).toBe('AT_OR_AFTER_SHKIAH');
  });

  it('preserves no-crossing and bounds elevation', () => {
    expect(compareTimeToShkiah(new Date(), { state: 'NO_CROSSING', time: null })).toBe('NO_SHKIAH');
    try {
      calculateLocationBoundaries({ ...location, elevation: 10_001, localDateTime: '2026-04-19' });
      throw new Error('Expected invalid elevation to be rejected.');
    } catch (error) {
      expect(error.message).toBe('Invalid location');
      expect(error.errors.elevation).toContain('−500 and 10,000');
    }
  });
});

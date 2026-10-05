import { describe, expect, it } from 'vitest';
import { millisecondsUntilNextOrdinarySecond, quantizeToOrdinarySecond } from '../src/display/live-time.js';

describe('live display time synchronization', () => {
  it('maps every sample inside one ordinary second to the same display instant', () => {
    const early = quantizeToOrdinarySecond(new Date('2026-10-04T02:16:28.001Z'));
    const late = quantizeToOrdinarySecond(new Date('2026-10-04T02:16:28.999Z'));
    expect(early).toEqual(new Date('2026-10-04T02:16:28.000Z'));
    expect(late).toEqual(early);
  });

  it('schedules the next update on an ordinary-second boundary', () => {
    expect(millisecondsUntilNextOrdinarySecond(10_000)).toBe(1_000);
    expect(millisecondsUntilNextOrdinarySecond(10_001)).toBe(999);
    expect(millisecondsUntilNextOrdinarySecond(10_947)).toBe(53);
  });

  it('rejects invalid time input', () => {
    expect(() => quantizeToOrdinarySecond(new Date(Number.NaN))).toThrow('valid Date');
    expect(() => millisecondsUntilNextOrdinarySecond(Number.NaN)).toThrow('finite');
  });
});

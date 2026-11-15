import { describe, expect, it } from 'vitest';
import { createMorningPrayerTimes } from '../src/prayer-times.js';

function found(localDateTime) {
  return { state: 'FOUND', time: new Date(localDateTime) };
}

const schedule = {
  current: {
    dayEnd: found('2026-11-13T19:00:00'),
    netz: found('2026-11-13T06:10:30'),
  },
  next: {
    dayEnd: found('2026-11-14T19:00:00'),
    netz: found('2026-11-14T06:11:30'),
  },
};

describe('Morning prayer times', () => {
  it('uses the approved weekday offsets from calculated netz', () => {
    const result = createMorningPrayerTimes(schedule, new Date('2026-11-13T12:00:00'));
    expect(result.isShabbat).toBe(false);
    expect(result.rows.map(({ id, offsetSeconds }) => [id, offsetSeconds])).toEqual([
      ['talit', -3960],
      ['mizmor-shir', -1500],
      ['yishtabach', -600],
      ['shema', -330],
      ['emet-veyatziv', -150],
      ['netz', 0],
    ]);
    expect(result.rows[0].time).toEqual(new Date('2026-11-13T05:04:30'));
    expect(result.talitOffsetFromAlotMinutes).toBe(6);
  });

  it('uses the approved Shabbat offsets after astronomical night', () => {
    const result = createMorningPrayerTimes(schedule, new Date('2026-11-13T20:00:00'));
    expect(result.isShabbat).toBe(true);
    expect(result.netz).toEqual(schedule.next.netz.time);
    expect(result.rows.find(({ id }) => id === 'mizmor-shir').offsetSeconds).toBe(-2700);
    expect(result.rows.find(({ id }) => id === 'yishtabach').offsetSeconds).toBe(-900);
    expect(result.rows.find(({ id }) => id === 'talit').time).toEqual(new Date('2026-11-14T05:05:30'));
  });

  it('rejects missing astronomical boundaries', () => {
    expect(() => createMorningPrayerTimes({ current: {}, next: {} }, new Date())).toThrow(RangeError);
  });
});

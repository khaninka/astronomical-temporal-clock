import { describe, expect, it } from 'vitest';
import { createCrossingDisplayModel } from '../src/astronomy/crossing-display.js';

describe('SunCrossing display model', () => {
  it('formats found crossings in device-local time and UTC', () => {
    const model = createCrossingDisplayModel({
      localDateTime: new Date(2026, 8, 22),
      morningTargetAltitude: -0.8333,
      eveningTargetAltitude: -1.740101665,
      horizonDip: 0.906801665,
      netz: { state: 'FOUND', time: new Date('2026-09-22T03:27:10.125Z') },
      shkiah: { state: 'FOUND', time: new Date('2026-09-22T15:35:42.500Z') },
      dayStart: { state: 'FOUND', time: new Date('2026-09-22T02:15:10.125Z') },
      dayEnd: { state: 'FOUND', time: new Date('2026-09-22T16:11:42.500Z') },
    }, new Date(2026, 8, 23));
    expect(model.morningTargetAltitude).toBe('-0.833300°');
    expect(model.eveningTargetAltitude).toBe('-1.740102°');
    expect(model.horizonDip).toBe('0.906802°');
    expect(model.reference).toBe('Astronomical horizon');
    expect(model.netz.localTime).toEqual(expect.any(String));
    expect(model.netz.utcTime).toBe('2026-09-22T03:27:10.125Z');
    expect(model.shkiah.utcTime).toBe('2026-09-22T15:35:42.500Z');
    expect(model.dayStart.utcTime).toBe('2026-09-22T02:15:10.125Z');
    expect(model.dayEnd.utcTime).toBe('2026-09-22T16:11:42.500Z');
    expect(model.liveComparison).toBeNull();
  });

  it('shows explicit messages instead of fabricated polar times', () => {
    const model = createCrossingDisplayModel({
      localDateTime: new Date(2026, 5, 21),
      morningTargetAltitude: -0.8333,
      eveningTargetAltitude: -1.5,
      horizonDip: 0.6667,
      netz: { state: 'NO_CROSSING', time: null },
      shkiah: { state: 'NO_CROSSING', time: null },
      dayStart: { state: 'NO_CROSSING', time: null },
      dayEnd: { state: 'NO_CROSSING', time: null },
    }, new Date(2026, 5, 22));
    expect(model.netz).toEqual({ state: 'NO_CROSSING', localTime: 'No netz crossing on this date', utcTime: null });
    expect(model.shkiah).toEqual({ state: 'NO_CROSSING', localTime: 'No shkiah crossing on this date', utcTime: null });
  });

  it('compares device time with shkiah only for the selected current date', () => {
    const calculation = {
      localDateTime: new Date(2026, 3, 19),
      morningTargetAltitude: -0.8333,
      eveningTargetAltitude: -1.74,
      horizonDip: 0.9067,
      netz: { state: 'FOUND', time: new Date(2026, 3, 19, 6) },
      shkiah: { state: 'FOUND', time: new Date(2026, 3, 19, 19, 15) },
      dayStart: { state: 'FOUND', time: new Date(2026, 3, 19, 4, 48) },
      dayEnd: { state: 'FOUND', time: new Date(2026, 3, 19, 19, 51) },
    };
    expect(createCrossingDisplayModel(calculation, new Date(2026, 3, 19, 19, 14)).liveComparison)
      .toContain('before shkiah');
    expect(createCrossingDisplayModel(calculation, new Date(2026, 3, 19, 19, 15)).liveComparison)
      .toContain('new evening cycle');
    expect(createCrossingDisplayModel(calculation, new Date(2026, 3, 20, 1)).liveComparison).toBeNull();
  });
});

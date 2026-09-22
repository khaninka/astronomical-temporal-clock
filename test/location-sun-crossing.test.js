import { describe, expect, it, vi } from 'vitest';
import {
  calculateLocationSunCrossings,
  localCalendarDayInterval,
  STANDARD_SUNRISE_SUNSET_ALTITUDE,
} from '../src/astronomy/location-sun-crossing.js';

describe('Location → SunCrossing integration', () => {
  it('builds an explicit interval from midnight to midnight in device-local time', () => {
    const selected = new Date(2026, 2, 20, 14, 35, 12);
    const { start, end } = localCalendarDayInterval(selected);

    expect(start).toEqual(new Date(2026, 2, 20, 0, 0, 0));
    expect(end).toEqual(new Date(2026, 2, 21, 0, 0, 0));
  });

  it('passes normalized Location values to both crossing directions', () => {
    const crossingFinder = vi.fn(({ direction }) => ({ state: 'FOUND', direction, time: new Date(0) }));
    const result = calculateLocationSunCrossings({
      latitude: '31.5326', longitude: '35.0998', elevation: '930',
      localDateTime: '2026-03-20T14:30:00',
    }, { crossingFinder });

    expect(result.observer).toEqual({ latitude: 31.5326, longitude: 35.0998, elevation: 930 });
    expect(result.targetAltitude).toBe(STANDARD_SUNRISE_SUNSET_ALTITUDE);
    expect(crossingFinder).toHaveBeenCalledTimes(2);
    expect(crossingFinder.mock.calls.map(([call]) => call.direction)).toEqual(['RISING', 'SETTING']);
    expect(crossingFinder.mock.calls[0][0].observer).toEqual(result.observer);
    expect(crossingFinder.mock.calls[1][0].start).toEqual(result.interval.start);
  });

  it('uses a changed location, elevation, date, and target on recalculation', () => {
    const crossingFinder = vi.fn(({ direction }) => ({ state: 'NO_CROSSING', time: null, direction }));
    const result = calculateLocationSunCrossings({
      latitude: '-33.9249', longitude: '18.4241', elevation: '25',
      localDateTime: '2026-12-21T06:30:00',
    }, { targetAltitude: -6, crossingFinder });

    expect(result.observer).toEqual({ latitude: -33.9249, longitude: 18.4241, elevation: 25 });
    expect(result.interval.start.getFullYear()).toBe(2026);
    expect(result.interval.start.getMonth()).toBe(11);
    expect(result.interval.start.getDate()).toBe(21);
    expect(result.targetAltitude).toBe(-6);
  });

  it('calculates real rising and setting crossings for Hebron', () => {
    const result = calculateLocationSunCrossings({
      latitude: 31.5326, longitude: 35.0998, elevation: 930,
      localDateTime: new Date(2026, 2, 20, 12, 0, 0),
    });

    expect(result.rising.state).toBe('FOUND');
    expect(result.setting.state).toBe('FOUND');
    expect(result.rising.time < result.setting.time).toBe(true);
  });

  it('preserves explicit no-crossing states for a polar date', () => {
    const result = calculateLocationSunCrossings({
      latitude: 89, longitude: 0, elevation: 0,
      localDateTime: new Date(2026, 5, 21, 12, 0, 0),
    });

    expect(result.rising.state).toBe('NO_CROSSING');
    expect(result.setting.state).toBe('NO_CROSSING');
  });
});

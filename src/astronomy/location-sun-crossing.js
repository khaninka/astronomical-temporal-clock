import { createLocationData } from '../location.js';
import { findSunCrossing } from './sun-crossing.js';

export const STANDARD_SUNRISE_SUNSET_ALTITUDE = -0.8333;

export function localCalendarDayInterval(localDateTime) {
  if (!(localDateTime instanceof Date) || Number.isNaN(localDateTime.getTime())) {
    throw new TypeError('localDateTime must be a valid Date.');
  }
  const start = new Date(
    localDateTime.getFullYear(),
    localDateTime.getMonth(),
    localDateTime.getDate(),
  );
  const end = new Date(
    localDateTime.getFullYear(),
    localDateTime.getMonth(),
    localDateTime.getDate()+1,
  );
  return { start, end };
}

/**
 * Integration boundary from normalized Location data to the SunCrossing core.
 * The calendar day follows the device-local date selected in Location.
 */
export function calculateLocationSunCrossings(
  locationInput,
  {
    targetAltitude = STANDARD_SUNRISE_SUNSET_ALTITUDE,
    crossingFinder = findSunCrossing,
  } = {},
) {
  if (!Number.isFinite(targetAltitude) || targetAltitude < -90 || targetAltitude > 90) {
    throw new RangeError('targetAltitude must be between -90 and 90.');
  }
  if (typeof crossingFinder !== 'function') throw new TypeError('crossingFinder must be a function.');

  const location = createLocationData(locationInput, locationInput?.localDateTime);
  const observer = {
    latitude: location.latitude,
    longitude: location.longitude,
    elevation: location.elevation,
  };
  const interval = localCalendarDayInterval(location.localDateTime);
  const common = { ...interval, observer, targetAltitude };

  return {
    localDateTime: new Date(location.localDateTime),
    observer,
    interval,
    targetAltitude,
    rising: crossingFinder({ ...common, direction: 'RISING' }),
    setting: crossingFinder({ ...common, direction: 'SETTING' }),
  };
}

import { createLocationData } from '../location.js';
import { localCalendarDayInterval, STANDARD_SUNRISE_SUNSET_ALTITUDE } from './location-sun-crossing.js';
import { findSunCrossing } from './sun-crossing.js';

const MEAN_EARTH_RADIUS_METRES = 6_371_008.8;
export const ALOT_OFFSET_SECONDS = 72 * 60;
export const TZEIT_LCHUMRA_OFFSET_SECONDS = 36 * 60;

function validateElevation(elevation) {
  if (!Number.isFinite(elevation)) throw new TypeError('elevation must be finite.');
  if (elevation < -500 || elevation > 10_000) {
    throw new RangeError('elevation must be between -500 and 10000 metres.');
  }
}

export function geometricHorizonDip(elevation) {
  validateElevation(elevation);
  if (elevation <= 0) return 0;
  return Math.acos(MEAN_EARTH_RADIUS_METRES/(MEAN_EARTH_RADIUS_METRES+elevation)) * 180/Math.PI;
}

function offsetCrossing(crossing, offsetSeconds, sign) {
  if (crossing.state === 'NO_CROSSING') return crossing;
  return { ...crossing, time: new Date(crossing.time.getTime()+sign*offsetSeconds*1000) };
}

/**
 * M3 initial rule: standard morning crossing and an ideal elevated-horizon
 * evening crossing. Surrounding terrain and direct obstructions are ignored.
 */
export function calculateLocationBoundaries(
  locationInput,
  { crossingFinder = findSunCrossing } = {},
) {
  if (typeof crossingFinder !== 'function') throw new TypeError('crossingFinder must be a function.');

  const location = createLocationData(locationInput, locationInput?.localDateTime);
  validateElevation(location.elevation);
  const observer = { latitude: location.latitude, longitude: location.longitude, elevation: location.elevation };
  const interval = localCalendarDayInterval(location.localDateTime);
  const horizonDip = geometricHorizonDip(location.elevation);
  const morningTargetAltitude = STANDARD_SUNRISE_SUNSET_ALTITUDE;
  const eveningTargetAltitude = STANDARD_SUNRISE_SUNSET_ALTITUDE-horizonDip;
  const netz = crossingFinder({ ...interval, observer, targetAltitude: morningTargetAltitude, direction: 'RISING' });
  const shkiah = crossingFinder({ ...interval, observer, targetAltitude: eveningTargetAltitude, direction: 'SETTING' });

  return {
    localDateTime: new Date(location.localDateTime),
    observer,
    interval,
    horizonDip,
    morningTargetAltitude,
    eveningTargetAltitude,
    netz,
    shkiah,
    dayStart: offsetCrossing(netz, ALOT_OFFSET_SECONDS, -1),
    dayEnd: offsetCrossing(shkiah, TZEIT_LCHUMRA_OFFSET_SECONDS, 1),
    offsets: { alotSeconds: ALOT_OFFSET_SECONDS, tzeitLchumraSeconds: TZEIT_LCHUMRA_OFFSET_SECONDS },
  };
}

export function compareTimeToShkiah(referenceTime, eveningBoundary) {
  if (!(referenceTime instanceof Date) || Number.isNaN(referenceTime.getTime())) {
    throw new TypeError('referenceTime must be a valid Date.');
  }
  if (eveningBoundary?.state !== 'FOUND' || !(eveningBoundary.time instanceof Date)
    || Number.isNaN(eveningBoundary.time.getTime())) {
    return 'NO_SHKIAH';
  }
  return referenceTime < eveningBoundary.time ? 'BEFORE_SHKIAH' : 'AT_OR_AFTER_SHKIAH';
}

import { solarPosition } from './nrel-spa.js';

const DIRECTIONS = new Set(['RISING', 'SETTING']);
const MAX_INTERVAL_MILLISECONDS = 48 * 60 * 60 * 1000;

function validateDate(value, name) {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
    throw new TypeError(`${name} must be a valid Date.`);
  }
}

function altitudeAt(timeMs, observer, options) {
  return solarPosition({
    date: new Date(timeMs),
    latitude: observer.latitude,
    longitude: observer.longitude,
    elevation: observer.elevation,
    pressure: options.pressure,
    temperature: options.temperature,
    deltaT: options.deltaT,
    deltaUt1: options.deltaUt1,
  }).topocentricElevationUncorrected;
}

/**
 * Finds a geometric solar-altitude crossing in an explicit UTC interval.
 * The target is the altitude of the Sun's center above the astronomical horizon.
 */
export function findSunCrossing({
  start,
  end,
  observer,
  targetAltitude,
  direction,
  pressure = 1013.25,
  temperature = 15,
  deltaT = 69,
  deltaUt1 = 0,
  scanStepMilliseconds = 10 * 60 * 1000,
  toleranceMilliseconds = 1,
}) {
  validateDate(start, 'start');
  validateDate(end, 'end');
  if (end <= start) throw new RangeError('end must be after start.');
  if (end-start > MAX_INTERVAL_MILLISECONDS) {
    throw new RangeError('Search interval must not exceed 48 hours.');
  }
  if (!observer || !Number.isFinite(observer.latitude) || !Number.isFinite(observer.longitude)
    || !Number.isFinite(observer.elevation)) {
    throw new TypeError('observer must contain finite latitude, longitude, and elevation.');
  }
  if (!Number.isFinite(targetAltitude) || targetAltitude < -90 || targetAltitude > 90) {
    throw new RangeError('targetAltitude must be between -90 and 90.');
  }
  if (!DIRECTIONS.has(direction)) throw new RangeError('direction must be RISING or SETTING.');
  if (!Number.isFinite(scanStepMilliseconds) || scanStepMilliseconds <= 0) {
    throw new RangeError('scanStepMilliseconds must be positive.');
  }
  if (!Number.isFinite(toleranceMilliseconds) || toleranceMilliseconds <= 0) {
    throw new RangeError('toleranceMilliseconds must be positive.');
  }

  const options = { pressure, temperature, deltaT, deltaUt1 };
  const desiredSign = direction === 'RISING' ? 1 : -1;
  let left = start.getTime();
  let leftValue = altitudeAt(left, observer, options) - targetAltitude;

  for (let right = Math.min(left+scanStepMilliseconds, end.getTime()); left < end.getTime(); right = Math.min(left+scanStepMilliseconds, end.getTime())) {
    const rightValue = altitudeAt(right, observer, options) - targetAltitude;
    const crosses = desiredSign > 0
      ? leftValue <= 0 && rightValue >= 0
      : leftValue >= 0 && rightValue <= 0;

    if (crosses) {
      let low = left;
      let high = right;
      while (high-low > toleranceMilliseconds) {
        const middle = Math.floor((low+high)/2);
        const middleValue = altitudeAt(middle, observer, options) - targetAltitude;
        if ((desiredSign > 0 && middleValue >= 0) || (desiredSign < 0 && middleValue <= 0)) high = middle;
        else low = middle;
      }
      const time = new Date(Math.round((low+high)/2));
      return {
        state: 'FOUND',
        time,
        direction,
        targetAltitude,
        altitude: altitudeAt(time.getTime(), observer, options),
      };
    }

    if (right === end.getTime()) break;
    left = right;
    leftValue = rightValue;
  }

  return { state: 'NO_CROSSING', time: null, direction, targetAltitude };
}

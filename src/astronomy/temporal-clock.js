import { createLocationData } from '../location.js';
import { calculateLocationBoundaries } from './boundary-rule.js';

const TEMPORAL_HOURS_PER_PERIOD = 12;
const SECONDS_PER_TEMPORAL_CYCLE = 12 * 60 * 60;

function validateDate(value, name) {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
    throw new TypeError(`${name} must be a valid Date.`);
  }
}

function requireFound(boundary, name) {
  if (boundary?.state !== 'FOUND' || !(boundary.time instanceof Date)
    || Number.isNaN(boundary.time.getTime())) {
    throw new RangeError(`${name} must be a FOUND boundary.`);
  }
  return boundary.time;
}

export function mapPeriodToTemporalTime(referenceTime, periodStart, periodEnd) {
  validateDate(referenceTime, 'referenceTime');
  validateDate(periodStart, 'periodStart');
  validateDate(periodEnd, 'periodEnd');
  const duration = periodEnd-periodStart;
  if (duration <= 0) throw new RangeError('periodEnd must be after periodStart.');
  if (referenceTime < periodStart || referenceTime > periodEnd) {
    throw new RangeError('referenceTime must be inside the period.');
  }

  const fraction = (referenceTime-periodStart)/duration;
  const totalTemporalMilliseconds = fraction*SECONDS_PER_TEMPORAL_CYCLE*1000;
  const wholeTemporalMilliseconds = Math.floor(totalTemporalMilliseconds+1e-7);
  const hour = Math.floor(wholeTemporalMilliseconds/3_600_000);
  const minute = Math.floor((wholeTemporalMilliseconds%3_600_000)/60_000);
  const second = Math.floor((wholeTemporalMilliseconds%60_000)/1000);
  const millisecond = wholeTemporalMilliseconds%1000;

  return {
    fraction,
    decimalHours: fraction*TEMPORAL_HOURS_PER_PERIOD,
    hour,
    minute,
    second,
    millisecond,
    temporalHourDurationMilliseconds: duration/TEMPORAL_HOURS_PER_PERIOD,
  };
}

export function calculateTemporalClock({ referenceTime, previous, current, next }) {
  validateDate(referenceTime, 'referenceTime');
  const previousDayEnd = requireFound(previous?.dayEnd, 'previous.dayEnd');
  const currentDayStart = requireFound(current?.dayStart, 'current.dayStart');
  const currentDayEnd = requireFound(current?.dayEnd, 'current.dayEnd');
  const nextDayStart = requireFound(next?.dayStart, 'next.dayStart');

  let period;
  let periodStart;
  let periodEnd;
  if (referenceTime < currentDayStart) {
    period = 'NIGHT';
    periodStart = previousDayEnd;
    periodEnd = currentDayStart;
  } else if (referenceTime < currentDayEnd) {
    period = 'DAY';
    periodStart = currentDayStart;
    periodEnd = currentDayEnd;
  } else {
    period = 'NIGHT';
    periodStart = currentDayEnd;
    periodEnd = nextDayStart;
  }

  return {
    period,
    periodStart,
    periodEnd,
    ...mapPeriodToTemporalTime(referenceTime, periodStart, periodEnd),
  };
}

function localDateWithOffset(date, dayOffset) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()+dayOffset);
}

export function calculateLocationTemporalClock(locationInput, referenceTime = new Date()) {
  validateDate(referenceTime, 'referenceTime');
  const location = createLocationData(locationInput, locationInput?.localDateTime ?? referenceTime);
  const boundaryInput = (dayOffset) => ({
    latitude: location.latitude,
    longitude: location.longitude,
    elevation: location.elevation,
    localDateTime: localDateWithOffset(referenceTime, dayOffset),
  });
  const previous = calculateLocationBoundaries(boundaryInput(-1));
  const current = calculateLocationBoundaries(boundaryInput(0));
  const next = calculateLocationBoundaries(boundaryInput(1));

  if ([previous.dayEnd, current.dayStart, current.dayEnd, next.dayStart]
    .some((boundary) => boundary.state !== 'FOUND')) {
    return { state: 'UNAVAILABLE', reason: 'A required DAY/NIGHT boundary does not occur.' };
  }
  return { state: 'AVAILABLE', ...calculateTemporalClock({ referenceTime, previous, current, next }), previous, current, next };
}

export function formatTemporalTime(value) {
  const pad = (number, length = 2) => String(number).padStart(length, '0');
  return `${pad(value.hour)}:${pad(value.minute)}:${pad(value.second)}.${pad(value.millisecond, 3)}`;
}

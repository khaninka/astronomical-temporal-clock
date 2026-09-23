import { formatLocalDate } from '../location.js';
import { compareTimeToShkiah } from './boundary-rule.js';

function displayCrossing(crossing, label) {
  if (crossing?.state === 'NO_CROSSING') {
    return { state: 'NO_CROSSING', localTime: `No ${label.toLowerCase()} crossing on this date`, utcTime: null };
  }
  if (crossing?.state !== 'FOUND' || !(crossing.time instanceof Date)
    || Number.isNaN(crossing.time.getTime())) {
    throw new TypeError(`${label} must be a valid FOUND or NO_CROSSING result.`);
  }
  return {
    state: 'FOUND',
    localTime: new Intl.DateTimeFormat(undefined, { timeStyle: 'medium' }).format(crossing.time),
    utcTime: crossing.time.toISOString(),
  };
}

function sameLocalDate(a, b) {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate();
}

export function createCrossingDisplayModel(calculation, referenceTime = new Date()) {
  if (!calculation || !(calculation.localDateTime instanceof Date)
    || !Number.isFinite(calculation.morningTargetAltitude)
    || !Number.isFinite(calculation.eveningTargetAltitude)
    || !Number.isFinite(calculation.horizonDip)) {
    throw new TypeError('A valid BoundaryRule calculation is required.');
  }
  const comparison = sameLocalDate(calculation.localDateTime, referenceTime)
    ? compareTimeToShkiah(referenceTime, calculation.shkiah)
    : null;
  const comparisonText = {
    BEFORE_SHKIAH: 'Current device time is before visible sunset.',
    AT_OR_AFTER_SHKIAH: 'Current device time is at or after visible sunset; the new evening cycle has begun.',
    NO_SHKIAH: 'Visible sunset does not occur on this date.',
  }[comparison] ?? null;
  return {
    date: formatLocalDate(calculation.localDateTime),
    reference: 'Astronomical horizon',
    horizonDip: `${calculation.horizonDip.toFixed(6)}°`,
    morningTargetAltitude: `${calculation.morningTargetAltitude.toFixed(6)}°`,
    eveningTargetAltitude: `${calculation.eveningTargetAltitude.toFixed(6)}°`,
    netz: displayCrossing(calculation.netz, 'Visible sunrise'),
    shkiah: displayCrossing(calculation.shkiah, 'Visible sunset'),
    dayStart: displayCrossing(calculation.dayStart, 'DAY start'),
    dayEnd: displayCrossing(calculation.dayEnd, 'DAY end'),
    liveComparison: comparisonText,
  };
}

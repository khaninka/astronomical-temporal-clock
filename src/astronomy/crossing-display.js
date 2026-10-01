import { formatLocalDate } from '../location.js';
import { compareTimeToShkiah } from './boundary-rule.js';

function displayCrossing(crossing, label) {
  if (crossing?.state === 'NO_CROSSING') {
    return { state: 'NO_CROSSING', localTime: `אין ${label} בתאריך זה`, utcTime: null };
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
    BEFORE_SHKIAH: 'השעה הנוכחית במכשיר היא לפני השקיעה הנראית.',
    AT_OR_AFTER_SHKIAH: 'השעה הנוכחית במכשיר היא לאחר השקיעה הנראית; מחזור הערב החדש החל.',
    NO_SHKIAH: 'אין שקיעה נראית בתאריך זה.',
  }[comparison] ?? null;
  return {
    date: formatLocalDate(calculation.localDateTime),
    reference: 'אופק אסטרונומי',
    horizonDip: `${calculation.horizonDip.toFixed(6)}°`,
    morningTargetAltitude: `${calculation.morningTargetAltitude.toFixed(6)}°`,
    eveningTargetAltitude: `${calculation.eveningTargetAltitude.toFixed(6)}°`,
    netz: displayCrossing(calculation.netz, 'נץ נראה'),
    shkiah: displayCrossing(calculation.shkiah, 'שקיעה נראית'),
    dayStart: displayCrossing(calculation.dayStart, 'תחילת היום'),
    dayEnd: displayCrossing(calculation.dayEnd, 'סוף היום'),
    tzeitShabbat: displayCrossing(calculation.tzeitShabbat, 'צאת שבת'),
    liveComparison: comparisonText,
  };
}

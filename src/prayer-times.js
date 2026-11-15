const WEEKDAY_RULES = [
  { id: 'talit', label: 'עטיפת טלית', offsetSeconds: -66*60 },
  { id: 'mizmor-shir', label: 'מזמור שיר', offsetSeconds: -25*60 },
  { id: 'yishtabach', label: 'ישתבח', offsetSeconds: -10*60 },
  { id: 'shema', label: 'ק״ש', offsetSeconds: -5*60-30 },
  { id: 'emet-veyatziv', label: 'אמת ויציב', offsetSeconds: -2*60-30 },
  { id: 'netz', label: 'נץ החמה', offsetSeconds: 0 },
];

const SHABBAT_OFFSETS = new Map([
  ['mizmor-shir', -45*60],
  ['yishtabach', -15*60],
]);

function requireFoundTime(boundary, name) {
  if (boundary?.state !== 'FOUND' || !(boundary.time instanceof Date) || Number.isNaN(boundary.time.getTime())) {
    throw new RangeError(`${name} must be FOUND with a valid time.`);
  }
  return boundary.time;
}

export function createMorningPrayerTimes(schedule, referenceTime = new Date()) {
  if (!(referenceTime instanceof Date) || Number.isNaN(referenceTime.getTime())) {
    throw new TypeError('referenceTime must be a valid Date.');
  }
  const currentDayEnd = requireFoundTime(schedule?.current?.dayEnd, 'current.dayEnd');
  const day = referenceTime < currentDayEnd ? schedule.current : schedule.next;
  const netz = requireFoundTime(day?.netz, 'displayedDay.netz');
  const isShabbat = netz.getDay() === 6;
  const rows = WEEKDAY_RULES.map((rule) => {
    const offsetSeconds = isShabbat && SHABBAT_OFFSETS.has(rule.id)
      ? SHABBAT_OFFSETS.get(rule.id)
      : rule.offsetSeconds;
    return {
      id: rule.id,
      label: rule.label,
      offsetSeconds,
      time: new Date(netz.getTime()+offsetSeconds*1_000),
    };
  });
  return {
    date: new Date(netz.getFullYear(), netz.getMonth(), netz.getDate()),
    netz,
    isShabbat,
    rows,
    talitOffsetFromAlotMinutes: 6,
    alotBeforeNetzMinutes: 72,
    talitBeforeNetzMinutes: Math.abs(rows[0].offsetSeconds)/60,
  };
}

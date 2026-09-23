const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';
const HOURS_PER_PERIOD = 12;
const START_ANGLE = -90;
const END_ANGLE = 90;
const SWEEP_ANGLE = END_ANGLE-START_ANGLE;
const CENTER_X = 250;
const CENTER_Y = 270;

function requireDate(value, name) {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) throw new TypeError(`${name} must be a valid Date.`);
  return value;
}

function requireBoundary(boundary, name) {
  if (boundary?.state !== 'FOUND') throw new RangeError(`${name} must be FOUND.`);
  return requireDate(boundary.time, `${name}.time`);
}

function selectPeriod(schedule, referenceTime) {
  const currentStart = requireBoundary(schedule?.current?.dayStart, 'current.dayStart');
  const currentEnd = requireBoundary(schedule?.current?.dayEnd, 'current.dayEnd');
  if (referenceTime < currentStart) return { period: 'NIGHT', start: requireBoundary(schedule.previous?.dayEnd, 'previous.dayEnd'), end: currentStart };
  if (referenceTime < currentEnd) return { period: 'DAY', start: currentStart, end: currentEnd };
  return { period: 'NIGHT', start: currentEnd, end: requireBoundary(schedule.next?.dayStart, 'next.dayStart') };
}

function timeAtFraction(start, end, fraction) {
  return new Date(start.getTime()+(end-start)*fraction);
}

function formatClockTime(date) {
  return new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit', hour12: false }).format(date);
}

export function createClockFaceModel(schedule, referenceTime = new Date()) {
  requireDate(referenceTime, 'referenceTime');
  const interval = selectPeriod(schedule, referenceTime);
  const duration = interval.end-interval.start;
  if (duration <= 0) throw new RangeError('Clock period boundaries must be strictly increasing.');
  const fraction = (referenceTime-interval.start)/duration;
  if (fraction < 0 || fraction > 1) throw new RangeError('referenceTime must be inside the displayed period.');
  const segments = Array.from({ length: HOURS_PER_PERIOD }, (_, index) => ({
    period: interval.period,
    hour: index+1,
    start: timeAtFraction(interval.start, interval.end, index/HOURS_PER_PERIOD),
    end: timeAtFraction(interval.start, interval.end, (index+1)/HOURS_PER_PERIOD),
    startAngle: START_ANGLE+index/HOURS_PER_PERIOD*SWEEP_ANGLE,
    endAngle: START_ANGLE+(index+1)/HOURS_PER_PERIOD*SWEEP_ANGLE,
    isCurrent: fraction >= index/HOURS_PER_PERIOD && (fraction < (index+1)/HOURS_PER_PERIOD || index === HOURS_PER_PERIOD-1),
  }));
  const civilTicks = [0, .25, .5, .75, 1].map((tickFraction) => {
    const time = timeAtFraction(interval.start, interval.end, tickFraction);
    return { fraction: tickFraction, angle: START_ANGLE+tickFraction*SWEEP_ANGLE, time, label: formatClockTime(time) };
  });
  return {
    ...interval,
    fraction,
    pointerAngle: START_ANGLE+fraction*SWEEP_ANGLE,
    referenceTime,
    ordinaryTime: formatClockTime(referenceTime),
    segments,
    civilTicks,
  };
}

export function createTemporalHourTable(schedule, referenceTime = new Date()) {
  const model = createClockFaceModel(schedule, referenceTime);
  const currentHour = Math.min(HOURS_PER_PERIOD-1, Math.floor(model.fraction*HOURS_PER_PERIOD));
  return {
    period: model.period,
    start: model.start,
    end: model.end,
    rows: Array.from({ length: HOURS_PER_PERIOD+1 }, (_, hour) => ({
      hour,
      time: hour === 0 ? model.start : model.segments[hour-1].end,
      isCurrent: hour === currentHour,
      isPeriodEnd: hour === HOURS_PER_PERIOD,
    })),
  };
}

function polarPoint(radius, angle) {
  const radians = (angle-90)*Math.PI/180;
  return { x: CENTER_X+radius*Math.cos(radians), y: CENTER_Y+radius*Math.sin(radians) };
}

function arcPath(radius, startAngle, endAngle) {
  const start = polarPoint(radius, startAngle);
  const end = polarPoint(radius, endAngle);
  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 0 1 ${end.x} ${end.y}`;
}

function sectorPath(startAngle, endAngle, radius = 230) {
  const start = polarPoint(radius, startAngle);
  const end = polarPoint(radius, endAngle);
  return `M ${CENTER_X} ${CENTER_Y} L ${start.x} ${start.y} A ${radius} ${radius} 0 0 1 ${end.x} ${end.y} Z`;
}

function svgElement(name, attributes = {}) {
  const element = document.createElementNS(SVG_NAMESPACE, name);
  for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, String(value));
  return element;
}

export function renderClockFace(svg, model) {
  if (!(svg instanceof SVGElement)) throw new TypeError('svg must be an SVG element.');
  svg.replaceChildren();
  svg.setAttribute('viewBox', '0 0 500 325');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', `${model.period} temporal clock: twelve astronomical hours synchronized with ordinary time`);
  svg.classList.toggle('day-mode', model.period === 'DAY');
  svg.classList.toggle('night-mode', model.period === 'NIGHT');

  const sky = svgElement('path', { d: `${sectorPath(START_ANGLE, END_ANGLE)} Z`, class: 'sundial-sky' });
  svg.append(sky);

  for (const segment of model.segments) {
    const path = svgElement('path', {
      d: sectorPath(segment.startAngle, segment.endAngle),
      class: `temporal-sector ${segment.period.toLowerCase()}${segment.isCurrent ? ' current' : ''}`,
      'data-period': segment.period,
      'data-hour': segment.hour,
    });
    const title = svgElement('title');
    title.textContent = `${segment.period} ${segment.hour}: ${formatClockTime(segment.start)}–${formatClockTime(segment.end)}`;
    path.append(title);
    svg.append(path);
  }

  svg.append(svgElement('path', { d: sectorPath(START_ANGLE, END_ANGLE, 158), class: 'inner-dial' }));

  for (let boundary = 0; boundary <= HOURS_PER_PERIOD; boundary += 1) {
    const angle = START_ANGLE+boundary/HOURS_PER_PERIOD*SWEEP_ANGLE;
    const start = polarPoint(158, angle);
    const end = polarPoint(225, angle);
    svg.append(svgElement('line', { x1: start.x, y1: start.y, x2: end.x, y2: end.y, class: 'hour-ray' }));
    const labelPoint = polarPoint(218, angle);
    const label = svgElement('text', { x: labelPoint.x, y: labelPoint.y, class: 'hour-label' });
    label.textContent = String(boundary);
    svg.append(label);
  }

  svg.append(svgElement('path', { d: arcPath(145, START_ANGLE, END_ANGLE), class: 'civil-arc' }));
  for (const tick of model.civilTicks) {
    const inner = polarPoint(135, tick.angle);
    const outer = polarPoint(153, tick.angle);
    svg.append(svgElement('line', { x1: inner.x, y1: inner.y, x2: outer.x, y2: outer.y, class: 'civil-tick' }));
    const labelPoint = polarPoint(119, tick.angle);
    const label = svgElement('text', { x: labelPoint.x, y: labelPoint.y, class: 'civil-time-label' });
    label.textContent = tick.label;
    svg.append(label);
  }

  const pointerEnd = polarPoint(218, model.pointerAngle);
  svg.append(svgElement('line', { x1: CENTER_X, y1: CENTER_Y, x2: pointerEnd.x, y2: pointerEnd.y, class: 'period-pointer' }));
  svg.append(svgElement('line', { x1: 18, y1: CENTER_Y, x2: 482, y2: CENTER_Y, class: 'horizon-line' }));
  svg.append(svgElement('circle', { cx: CENTER_X, cy: CENTER_Y, r: 10, class: 'clock-pin' }));
  const ordinaryTime = svgElement('text', { x: CENTER_X, y: 305, class: 'ordinary-time' });
  ordinaryTime.textContent = model.ordinaryTime;
  svg.append(ordinaryTime);
}

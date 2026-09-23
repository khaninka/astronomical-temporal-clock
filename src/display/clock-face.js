const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';
const HOURS_PER_PERIOD = 12;
const START_ANGLE = -90;
const END_ANGLE = 90;
const SWEEP_ANGLE = END_ANGLE-START_ANGLE;
const CENTER_X = 300;
const CENTER_Y = 320;
const OUTER_RADIUS = 275;
const INNER_RADIUS = 195;
const CIVIL_ARC_RADIUS = 176;
const CIVIL_LABEL_RADIUS = 150;
const LENS_TRACK_RADIUS = 105;

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

export function createClockFacePreviewModel(schedule, referenceTime, temporalHour) {
  const liveModel = createClockFaceModel(schedule, referenceTime);
  if (![0, 3, 6, 9, 12].includes(temporalHour)) {
    throw new RangeError('temporalHour must be one of 0, 3, 6, 9, or 12.');
  }
  const fraction = temporalHour/HOURS_PER_PERIOD;
  const previewTime = timeAtFraction(liveModel.start, liveModel.end, fraction);
  return {
    ...liveModel,
    fraction,
    pointerAngle: START_ANGLE+fraction*SWEEP_ANGLE,
    referenceTime: previewTime,
    ordinaryTime: formatClockTime(previewTime),
    segments: liveModel.segments.map((segment, index) => ({
      ...segment,
      isCurrent: temporalHour === HOURS_PER_PERIOD
        ? index === HOURS_PER_PERIOD-1
        : fraction >= index/HOURS_PER_PERIOD && fraction < (index+1)/HOURS_PER_PERIOD,
    })),
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

function sectorPath(startAngle, endAngle, radius = OUTER_RADIUS) {
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
  svg.setAttribute('viewBox', '0 0 600 375');
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

  svg.append(svgElement('path', { d: sectorPath(START_ANGLE, END_ANGLE, INNER_RADIUS), class: 'inner-dial' }));

  for (let boundary = 0; boundary <= HOURS_PER_PERIOD; boundary += 1) {
    const angle = START_ANGLE+boundary/HOURS_PER_PERIOD*SWEEP_ANGLE;
    const start = polarPoint(INNER_RADIUS, angle);
    const end = polarPoint(OUTER_RADIUS-7, angle);
    svg.append(svgElement('line', { x1: start.x, y1: start.y, x2: end.x, y2: end.y, class: 'hour-ray' }));
    const labelPoint = polarPoint(OUTER_RADIUS-15, angle);
    if (boundary === 0 || boundary === HOURS_PER_PERIOD) labelPoint.y -= 12;
    const label = svgElement('text', { x: labelPoint.x, y: labelPoint.y, class: 'hour-label' });
    label.textContent = String(boundary);
    svg.append(label);
  }

  svg.append(svgElement('path', { d: arcPath(CIVIL_ARC_RADIUS, START_ANGLE, END_ANGLE), class: 'civil-arc' }));
  const civilLabels = [];
  for (const tick of model.civilTicks) {
    const inner = polarPoint(CIVIL_ARC_RADIUS-11, tick.angle);
    const outer = polarPoint(CIVIL_ARC_RADIUS+9, tick.angle);
    svg.append(svgElement('line', { x1: inner.x, y1: inner.y, x2: outer.x, y2: outer.y, class: 'civil-tick' }));
    const labelPoint = polarPoint(CIVIL_LABEL_RADIUS, tick.angle);
    if (tick.fraction === 0 || tick.fraction === 1) labelPoint.y -= 6;
    const label = svgElement('text', { x: labelPoint.x, y: labelPoint.y, class: 'civil-time-label' });
    label.textContent = tick.label;
    civilLabels.push(label);
  }

  svg.append(svgElement('line', { x1: 23, y1: CENTER_Y, x2: 577, y2: CENTER_Y, class: 'horizon-line' }));
  const pointerEnd = polarPoint(OUTER_RADIUS-15, model.pointerAngle);
  svg.append(svgElement('line', { x1: CENTER_X, y1: CENTER_Y, x2: pointerEnd.x, y2: pointerEnd.y, class: 'period-pointer' }));
  svg.append(...civilLabels);
  svg.append(svgElement('circle', { cx: CENTER_X, cy: CENTER_Y, r: 10, class: 'clock-pin' }));
  const lensPoint = polarPoint(LENS_TRACK_RADIUS, model.pointerAngle);
  svg.append(svgElement('circle', { cx: lensPoint.x, cy: lensPoint.y, r: 28, class: 'time-lens' }));
  const ordinaryTime = svgElement('text', { x: lensPoint.x, y: lensPoint.y, class: 'ordinary-time' });
  ordinaryTime.textContent = model.ordinaryTime;
  svg.append(ordinaryTime);
}

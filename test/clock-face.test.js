// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';
import { createClockFaceModel, createTemporalHourTable, renderClockFace } from '../src/display/clock-face.js';

const found = (iso) => ({ state: 'FOUND', time: new Date(iso) });
const schedule = {
  previous: { dayStart: found('2026-09-21T05:14:00'), dayEnd: found('2026-09-21T19:17:00') },
  current: { dayStart: found('2026-09-22T05:15:00'), dayEnd: found('2026-09-22T19:15:00') },
  next: { dayStart: found('2026-09-23T05:15:00'), dayEnd: found('2026-09-23T19:15:00') },
};

describe('Display semicircle', () => {
  it('builds twelve equal visual sectors for the active DAY period', () => {
    const model = createClockFaceModel(schedule, new Date('2026-09-22T12:15:00'));
    expect(model.period).toBe('DAY');
    expect(model.segments).toHaveLength(12);
    expect(model.segments[0].startAngle).toBe(-90);
    expect(model.segments[11].endAngle).toBe(90);
    expect(model.fraction).toBe(.5);
    expect(model.pointerAngle).toBe(0);
    expect(model.segments.filter(({ isCurrent }) => isCurrent)).toHaveLength(1);
  });

  it('switches to the preceding NIGHT before DAY starts', () => {
    const model = createClockFaceModel(schedule, new Date('2026-09-22T00:16:00'));
    expect(model.period).toBe('NIGHT');
    expect(model.start).toEqual(schedule.previous.dayEnd.time);
    expect(model.end).toEqual(schedule.current.dayStart.time);
    expect(model.pointerAngle).toBeCloseTo(0, 8);
  });

  it('switches to the following NIGHT at DAY end', () => {
    const model = createClockFaceModel(schedule, new Date('2026-09-22T19:15:00'));
    expect(model.period).toBe('NIGHT');
    expect(model.start).toEqual(schedule.current.dayEnd.time);
    expect(model.end).toEqual(schedule.next.dayStart.time);
    expect(model.pointerAngle).toBe(-90);
  });

  it('renders one shared pointer, twelve sectors, and civil-time labels', () => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    renderClockFace(svg, createClockFaceModel(schedule, new Date('2026-09-22T12:15:00')));
    expect(svg.querySelectorAll('.temporal-sector')).toHaveLength(12);
    expect(svg.querySelectorAll('.period-pointer')).toHaveLength(1);
    expect(svg.querySelectorAll('.hour-ray')).toHaveLength(13);
    expect(svg.querySelectorAll('.hour-label')).toHaveLength(13);
    expect([...svg.querySelectorAll('.hour-label')].map(({ textContent }) => textContent)).toEqual([
      '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12',
    ]);
    expect(svg.querySelectorAll('.horizon-line')).toHaveLength(1);
    expect(svg.querySelectorAll('.inner-dial')).toHaveLength(1);
    expect(svg.querySelectorAll('.civil-time-label')).toHaveLength(5);
    expect(svg.querySelectorAll('.current')).toHaveLength(1);
    expect(svg.getAttribute('aria-label')).toContain('synchronized with ordinary time');
  });

  it('lists all thirteen hour boundaries for the active period', () => {
    const table = createTemporalHourTable(schedule, new Date('2026-09-22T12:15:00'));
    expect(table.period).toBe('DAY');
    expect(table.rows).toHaveLength(13);
    expect(table.rows[0].time).toEqual(schedule.current.dayStart.time);
    expect(table.rows[12].time).toEqual(schedule.current.dayEnd.time);
    expect(table.rows[12].isPeriodEnd).toBe(true);
    expect(table.rows.filter(({ isCurrent }) => isCurrent)).toHaveLength(1);
    expect(table.rows.find(({ isCurrent }) => isCurrent).hour).toBe(6);
  });
});

// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const formMarkup = `
  <nav>
    <button id="tab-location" aria-selected="true">Location</button>
    <button id="tab-clock" aria-selected="false" disabled>Clock</button>
    <button id="tab-boundary" aria-selected="false" disabled>Boundary</button>
    <button id="tab-temporal" aria-selected="false" disabled>Temporal</button>
    <button id="tab-hours" aria-selected="false" disabled>Hours</button>
  </nav>
  <section id="view-location">
    <form id="location-form">
      <input id="latitude" name="latitude">
      <input id="longitude" name="longitude">
      <button id="use-location" type="button">Use my location</button>
      <label><input id="elevation" name="elevation"><button id="get-elevation" type="button">Get terrain elevation</button></label>
      <p id="elevation-source" hidden></p>
      <div class="test-controls">
        <input id="calculation-date" name="localDateTime" type="date">
        <button id="use-device-date" type="button">Use device date</button>
      </div>
      <button id="revert-location" type="button" hidden disabled>Revert changes</button>
      <button id="location-next" type="submit">Next</button>
    </form>
    <time id="local-date-time"></time>
    <p id="status"></p>
    <a id="map-link" href="#" hidden>Map</a>
  </section>
  <section id="crossing-results" hidden>
    <span id="crossing-date"></span><span id="crossing-reference"></span><span id="horizon-dip"></span>
    <span id="rising-target"></span><span id="setting-target"></span>
    <span id="rising-local"></span><span id="rising-utc"></span>
    <span id="setting-local"></span><span id="setting-utc"></span>
    <span id="day-start-local"></span><span id="day-start-utc"></span>
    <span id="day-end-local"></span><span id="day-end-utc"></span>
    <span id="cycle-status" hidden></span>
  </section>
  <section id="temporal-results" hidden>
    <p id="temporal-context"></p>
    <span id="temporal-period"></span><span id="temporal-time"></span>
    <span id="temporal-interval"></span><span id="temporal-period-duration"></span><span id="temporal-hour-duration"></span>
  </section>
  <section id="clock-display" hidden>
    <output id="period-indicator"></output><svg id="clock-face"></svg><output id="clock-readout"></output>
  </section>
  <section id="hour-table-view" hidden>
    <p id="hour-table-context"></p><table><tbody id="hour-table-body"></tbody></table>
  </section>
`;

describe('Location browser integration', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.resetModules();
    sessionStorage.clear();
    document.body.innerHTML = formMarkup;
    HTMLFormElement.prototype.reportValidity = vi.fn(() => true);
  });

  it('opens Location first and switches between enabled tabs', async () => {
    await import('../src/app.js');
    expect(document.querySelector('#view-location').hidden).toBe(false);
    expect(document.querySelector('#tab-location').getAttribute('aria-selected')).toBe('true');
    expect(document.querySelector('#tab-clock').disabled).toBe(true);
  });

  it('restores saved coordinates and elevation while using today for the live clock', async () => {
    vi.setSystemTime(new Date(2026, 8, 22, 10, 0, 0));
    sessionStorage.setItem('astronomical-temporal-clock.location.v1', JSON.stringify({
      latitude: 31.8,
      longitude: 35.2,
      elevation: 800,
    }));
    await import('../src/app.js');

    expect(document.querySelector('#latitude').value).toBe('31.8');
    expect(document.querySelector('#longitude').value).toBe('35.2');
    expect(document.querySelector('#elevation').value).toBe('800');
    expect(document.querySelector('#calculation-date').value).toBe('2026-09-22');
    expect(document.querySelector('#clock-display').hidden).toBe(false);
    expect(document.querySelector('#tab-clock').getAttribute('aria-selected')).toBe('true');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it('gets terrain elevation only after the user clicks the button', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({ elevation: [799] }),
    }));
    vi.stubGlobal('fetch', fetchMock);
    await import('../src/app.js');
    document.querySelector('#latitude').value = '31.8';
    document.querySelector('#longitude').value = '35.2';

    expect(fetchMock).not.toHaveBeenCalled();
    document.querySelector('#get-elevation').click();
    await vi.waitFor(() => expect(document.querySelector('#elevation').value).toBe('799'));

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(document.querySelector('#elevation-source').textContent).toContain('Open-Meteo');
    expect(document.querySelector('#elevation-source').textContent).toContain('Copernicus DEM GLO-90');
    expect(document.querySelector('#elevation-source').hidden).toBe(false);
    expect(document.querySelector('#elevation-source').previousElementSibling.querySelector('#elevation')).not.toBeNull();
    expect(document.querySelector('#elevation-source').nextElementSibling.classList).toContain('test-controls');
  });

  it('validates, normalizes, and displays a manually entered location', async () => {
    await import('../src/app.js');
    document.querySelector('#latitude').value = '31.8';
    document.querySelector('#longitude').value = '35.2';
    document.querySelector('#elevation').value = '800';
    document.querySelector('#calculation-date').value = '2026-12-21';

    document.querySelector('#location-form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

    expect(document.querySelector('#status').textContent).toBe('Saved for this browser session.');
    expect(document.querySelector('#location-next').textContent).toBe('Done');
    expect(document.querySelector('#status').textContent).not.toContain('00:00:00');
    expect(document.querySelector('#local-date-time').textContent).not.toBe('');
    expect(document.querySelector('#map-link').hidden).toBe(false);
    expect(document.querySelector('#map-link').href).toBe('https://www.google.com/maps/search/?api=1&query=31.8%2C35.2');
    expect(JSON.parse(sessionStorage.getItem('astronomical-temporal-clock.location.v1'))).toEqual({
      latitude: 31.8,
      longitude: 35.2,
      elevation: 800,
    });
    expect(document.querySelector('#clock-display').hidden).toBe(false);
    expect(document.querySelector('#tab-clock').getAttribute('aria-selected')).toBe('true');
    document.querySelector('#tab-boundary').click();
    expect(document.querySelector('#crossing-results').hidden).toBe(false);
    expect(document.querySelector('#rising-target').textContent).toBe('-0.833300°');
    expect(Number.parseFloat(document.querySelector('#setting-target').textContent)).toBeLessThan(-0.8333);
    expect(Number.parseFloat(document.querySelector('#horizon-dip').textContent)).toBeGreaterThan(0);
    expect(document.querySelector('#crossing-reference').textContent).toBe('Astronomical horizon');
    expect(document.querySelector('#rising-local').textContent).not.toBe('');
    expect(document.querySelector('#setting-local').textContent).not.toBe('');
    expect(document.querySelector('#day-start-local').textContent).not.toBe('');
    expect(document.querySelector('#day-end-local').textContent).not.toBe('');
  });

  it('auto-saves valid edits on tab change and can revert unsaved edits', async () => {
    await import('../src/app.js');
    document.querySelector('#latitude').value = '31.8';
    document.querySelector('#longitude').value = '35.2';
    document.querySelector('#elevation').value = '800';
    document.querySelector('#location-form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

    document.querySelector('#tab-location').click();
    document.querySelector('#latitude').value = '32';
    document.querySelector('#latitude').dispatchEvent(new Event('input', { bubbles: true }));
    expect(document.querySelector('#revert-location').disabled).toBe(false);
    document.querySelector('#revert-location').click();
    expect(document.querySelector('#latitude').value).toBe('31.8');

    document.querySelector('#latitude').value = '32';
    document.querySelector('#latitude').dispatchEvent(new Event('input', { bubbles: true }));
    document.querySelector('#tab-boundary').click();
    expect(document.querySelector('#crossing-results').hidden).toBe(false);
    expect(JSON.parse(sessionStorage.getItem('astronomical-temporal-clock.location.v1')).latitude).toBe(32);
  });

  it('allows the test date to be changed and reset to device time', async () => {
    vi.setSystemTime(new Date(2026, 8, 22, 14, 5, 9));
    await import('../src/app.js');
    const input = document.querySelector('#calculation-date');
    expect(input.value).toBe('2026-09-22');

    input.value = '2026-12-21';
    expect(input.value).toBe('2026-12-21');

    document.querySelector('#use-device-date').click();
    expect(input.value).toBe('2026-09-22');
  });

  it('keeps the live clock on today while the diagnostic date can change', async () => {
    vi.setSystemTime(new Date(2026, 8, 22, 16, 0, 0));
    await import('../src/app.js');
    document.querySelector('#latitude').value = '31.8199732324092';
    document.querySelector('#longitude').value = '35.1879525911133';
    document.querySelector('#elevation').value = '798';
    document.querySelector('#calculation-date').value = '2026-09-22';
    document.querySelector('#location-form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

    expect(document.querySelector('#clock-display').hidden).toBe(false);
    expect(document.querySelectorAll('#clock-face .temporal-sector')).toHaveLength(12);
    document.querySelector('#tab-hours').click();
    expect(document.querySelector('#hour-table-view').hidden).toBe(false);
    expect(document.querySelectorAll('#hour-table-body tr')).toHaveLength(12);
    document.querySelector('#tab-clock').click();
    document.querySelector('#tab-temporal').click();
    expect(document.querySelector('#temporal-results').hidden).toBe(false);
    expect(document.querySelector('#temporal-period').textContent).toBe('DAY');
    expect(document.querySelector('#temporal-period-duration').textContent).toMatch(/^\d+\.\d{6} ordinary minutes$/);
    expect(document.querySelector('#temporal-hour-duration').textContent).toMatch(/^\d+\.\d{6} ordinary minutes$/);
    const initial = document.querySelector('#temporal-time').textContent;
    expect(initial).toMatch(/^\d{2}:\d{2}:\d{2}\.\d{3}$/);

    await vi.advanceTimersByTimeAsync(1_000);
    expect(document.querySelector('#temporal-time').textContent).not.toBe(initial);

    document.querySelector('#calculation-date').value = '2026-09-21';
    document.querySelector('#location-form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    expect(document.querySelector('#temporal-results').hidden).toBe(true);
    expect(document.querySelector('#clock-display').hidden).toBe(false);
    expect(document.querySelectorAll('#clock-face .temporal-sector')).toHaveLength(12);
    document.querySelector('#tab-temporal').click();
    expect(document.querySelector('#temporal-results').hidden).toBe(false);
    expect(document.querySelector('#temporal-context').textContent).toContain('Diagnostic preview');
    document.querySelector('#tab-boundary').click();
    expect(document.querySelector('#crossing-results').hidden).toBe(false);
    expect(document.querySelector('#crossing-date').textContent).not.toBe('');
  });

  it('refreshes across DAY/NIGHT boundaries and after the device wakes on the next date', async () => {
    const observer = { latitude: 31.8199732324092, longitude: 35.1879525911133, elevation: 798 };
    const referenceDate = new Date(2026, 8, 22, 12, 0, 0);
    const { calculateLocationTemporalClock } = await import('../src/astronomy/temporal-clock.js');
    const schedule = calculateLocationTemporalClock({ ...observer, localDateTime: referenceDate }, referenceDate);
    const beforeDayEnd = new Date(schedule.current.dayEnd.time.getTime()-60_000);
    const afterDayEnd = new Date(schedule.current.dayEnd.time.getTime()+60_000);
    const afterNextDayStart = new Date(schedule.next.dayStart.time.getTime()+60_000);

    vi.setSystemTime(beforeDayEnd);
    await import('../src/app.js');
    document.querySelector('#latitude').value = String(observer.latitude);
    document.querySelector('#longitude').value = String(observer.longitude);
    document.querySelector('#elevation').value = String(observer.elevation);
    document.querySelector('#location-form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    expect(document.querySelector('#period-indicator').textContent).toBe('DAY');
    expect(document.querySelector('#clock-readout').textContent).toContain('Astronomical time');

    vi.setSystemTime(afterDayEnd);
    await vi.advanceTimersByTimeAsync(1_000);
    expect(document.querySelector('#period-indicator').textContent).toBe('NIGHT');

    vi.setSystemTime(afterNextDayStart);
    window.dispatchEvent(new Event('pageshow'));
    expect(document.querySelector('#period-indicator').textContent).toBe('DAY');
    expect(document.querySelector('#hour-table-context').textContent).not.toBe('');
  });

  it('fills editable fields from browser geolocation', async () => {
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: {
        getCurrentPosition: (success) => success({
          coords: { latitude: 40.7, longitude: -74, altitude: 12, altitudeAccuracy: 5 },
        }),
      },
    });
    await import('../src/app.js');

    document.querySelector('#use-location').click();
    await vi.waitFor(() => expect(document.querySelector('#status').textContent).toContain('Location received'));

    expect(document.querySelector('#latitude').value).toBe('40.7');
    expect(document.querySelector('#longitude').value).toBe('-74');
    expect(document.querySelector('#elevation').value).toBe('12');
    expect(document.querySelector('#latitude').readOnly).toBe(false);
    expect(document.querySelector('#map-link').href).toBe('https://www.google.com/maps/search/?api=1&query=40.7%2C-74');
  });

  it('leaves elevation empty when the device does not provide altitude', async () => {
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: {
        getCurrentPosition: (success) => success({
          coords: { latitude: 31.8, longitude: 35.2, altitude: null, altitudeAccuracy: null },
        }),
      },
    });
    await import('../src/app.js');

    document.querySelector('#use-location').click();
    await vi.waitFor(() => expect(document.querySelector('#status').textContent).toContain('enter it manually'));

    expect(document.querySelector('#elevation').value).toBe('');
    expect(document.querySelector('#map-link').hidden).toBe(false);
  });
});

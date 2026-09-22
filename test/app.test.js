// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const formMarkup = `
  <form id="location-form">
    <input id="latitude" name="latitude">
    <input id="longitude" name="longitude">
    <input id="elevation" name="elevation">
    <input id="calculation-date" name="localDateTime" type="date">
    <button id="use-location" type="button">Use my location</button>
    <button id="get-elevation" type="button">Get terrain elevation</button>
    <p id="elevation-source" hidden></p>
    <button id="use-device-date" type="button">Use device date</button>
    <button type="submit">Save</button>
  </form>
  <time id="local-date-time"></time>
  <p id="status"></p>
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
    <span id="temporal-period"></span><span id="temporal-time"></span>
    <span id="temporal-interval"></span><span id="temporal-hour-duration"></span>
  </section>
  <section id="clock-display" hidden>
    <p id="clock-mode"></p><svg id="clock-face"></svg><output id="clock-readout"></output>
  </section>
  <a id="map-link" href="#" hidden>Map</a>
`;

describe('Location browser integration', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.resetModules();
    document.body.innerHTML = formMarkup;
    HTMLFormElement.prototype.reportValidity = vi.fn(() => true);
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
  });

  it('validates, normalizes, and displays a manually entered location', async () => {
    await import('../src/app.js');
    document.querySelector('#latitude').value = '31.8';
    document.querySelector('#longitude').value = '35.2';
    document.querySelector('#elevation').value = '800';
    document.querySelector('#calculation-date').value = '2026-12-21';

    document.querySelector('#location-form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

    expect(document.querySelector('#status').textContent).toContain('Location confirmed: 31.8, 35.2, 800 m for');
    expect(document.querySelector('#status').textContent).not.toContain('00:00:00');
    expect(document.querySelector('#local-date-time').textContent).not.toBe('');
    expect(document.querySelector('#map-link').hidden).toBe(false);
    expect(document.querySelector('#map-link').href).toBe('https://www.google.com/maps/search/?api=1&query=31.8%2C35.2');
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

  it('shows and advances TemporalClock only for the selected current device date', async () => {
    vi.setSystemTime(new Date(2026, 8, 22, 16, 0, 0));
    await import('../src/app.js');
    document.querySelector('#latitude').value = '31.8199732324092';
    document.querySelector('#longitude').value = '35.1879525911133';
    document.querySelector('#elevation').value = '798';
    document.querySelector('#calculation-date').value = '2026-09-22';
    document.querySelector('#location-form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

    expect(document.querySelector('#temporal-results').hidden).toBe(false);
    expect(document.querySelector('#clock-display').hidden).toBe(false);
    expect(document.querySelectorAll('#clock-face .temporal-sector')).toHaveLength(12);
    expect(document.querySelector('#temporal-period').textContent).toBe('DAY');
    const initial = document.querySelector('#temporal-time').textContent;
    expect(initial).toMatch(/^\d{2}:\d{2}:\d{2}\.\d{3}$/);

    await vi.advanceTimersByTimeAsync(1_000);
    expect(document.querySelector('#temporal-time').textContent).not.toBe(initial);

    document.querySelector('#calculation-date').value = '2026-09-21';
    document.querySelector('#location-form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    expect(document.querySelector('#temporal-results').hidden).toBe(true);
    expect(document.querySelector('#clock-display').hidden).toBe(false);
    expect(document.querySelector('#clock-mode').textContent).toContain('Selected-date preview');
    expect(document.querySelectorAll('#clock-face .temporal-sector')).toHaveLength(12);
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

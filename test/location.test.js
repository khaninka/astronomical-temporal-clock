import { describe, expect, it, vi } from 'vitest';
import { createGoogleMapsUrl, createLocationData, formatLocalDate, formatLocalDateInput, formatLocalDateTime, formatLocalDateTimeInput, getBrowserLocation, getTerrainElevation, LocationValidationError, parseLocalDateTime, validateLocation } from '../src/location.js';

describe('validateLocation', () => {
  it('normalizes valid numeric strings', () => {
    expect(validateLocation({ latitude: '31.9', longitude: '35.2', elevation: '760' }))
      .toEqual({ latitude: 31.9, longitude: 35.2, elevation: 760 });
  });

  it.each([
    ['latitude', { latitude: '-90', longitude: '0', elevation: '0' }],
    ['latitude', { latitude: '90', longitude: '0', elevation: '0' }],
    ['longitude', { latitude: '0', longitude: '-180', elevation: '0' }],
    ['longitude', { latitude: '0', longitude: '180', elevation: '0' }],
  ])('accepts the %s boundary', (_field, input) => expect(validateLocation(input)).toBeTruthy());

  it('reports missing, non-finite, and out-of-range fields together', () => {
    expect(() => validateLocation({ latitude: '', longitude: '181', elevation: 'Infinity' }))
      .toThrow(LocationValidationError);
    try {
      validateLocation({ latitude: '', longitude: '181', elevation: 'Infinity' });
    } catch (error) {
      expect(error.errors).toEqual({
        latitude: 'This field is required.',
        longitude: 'Longitude must be between −180 and 180.',
        elevation: 'Enter a finite number.',
      });
    }
  });

  it.each([-501, 10_001])('rejects elevation outside the supported terrestrial range: %s m', (elevation) => {
    expect(() => validateLocation({ latitude: 31.8, longitude: 35.2, elevation }))
      .toThrow('Invalid location');
  });
});

describe('createLocationData', () => {
  it('combines normalized WGS 84 coordinates with device-local date/time', () => {
    const now = new Date(2026, 8, 21, 14, 30);
    expect(createLocationData({ latitude: '31.8', longitude: '35.2', elevation: '800' }, now))
      .toEqual({ latitude: 31.8, longitude: 35.2, elevation: 800, localDateTime: now });
  });

  it('accepts an editable local date/time string', () => {
    const data = createLocationData({
      latitude: '31.8',
      longitude: '35.2',
      elevation: '800',
      localDateTime: '2026-12-21T06:30:15',
    });
    expect(data.localDateTime.getFullYear()).toBe(2026);
    expect(data.localDateTime.getMonth()).toBe(11);
    expect(data.localDateTime.getDate()).toBe(21);
    expect(data.localDateTime.getHours()).toBe(6);
    expect(data.localDateTime.getMinutes()).toBe(30);
  });
});

describe('local date/time input', () => {
  it('formats and parses a device-local value without changing its fields', () => {
    const date = new Date(2026, 8, 22, 14, 5, 9);
    const value = formatLocalDateTimeInput(date);
    expect(value).toBe('2026-09-22T14:05:09');
    expect(parseLocalDateTime(value).getTime()).toBe(date.getTime());
  });

  it('rejects an empty value', () => {
    expect(() => parseLocalDateTime('')).toThrow('localDate is required');
  });

  it('formats and parses a date-only value as local midnight without UTC shift', () => {
    const date = parseLocalDateTime('2026-09-22');
    expect(date).toEqual(new Date(2026, 8, 22, 0, 0, 0));
    expect(formatLocalDateInput(new Date(2026, 8, 22, 23, 59))).toBe('2026-09-22');
  });

  it('rejects a normalized but nonexistent calendar date', () => {
    expect(() => parseLocalDateTime('2026-02-30')).toThrow('valid local date');
  });
});

describe('createGoogleMapsUrl', () => {
  it('creates a Google Maps search URL from validated coordinates', () => {
    expect(createGoogleMapsUrl({ latitude: '31.8', longitude: '35.2', elevation: '800' }))
      .toBe('https://www.google.com/maps/search/?api=1&query=31.8%2C35.2');
  });

  it('rejects invalid coordinates before creating an external URL', () => {
    expect(() => createGoogleMapsUrl({ latitude: '91', longitude: '35.2' }))
      .toThrow(LocationValidationError);
  });
});

describe('getTerrainElevation', () => {
  it('returns validated terrain elevation and its dataset', async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      json: async () => ({ elevation: [812] }),
    }));

    await expect(getTerrainElevation({ latitude: '31.8', longitude: '35.2' }, fetchImpl))
      .resolves.toEqual({
        elevation: 812,
        dataset: 'Copernicus DEM GLO-90 (90 m)',
        provider: 'Open-Meteo',
      });
    expect(fetchImpl).toHaveBeenCalledOnce();
    expect(String(fetchImpl.mock.calls[0][0])).toContain('latitude=31.8&longitude=35.2');
  });

  it('rejects missing terrain data instead of returning zero', async () => {
    const fetchImpl = async () => ({
      ok: true,
      json: async () => ({ elevation: [null] }),
    });
    await expect(getTerrainElevation({ latitude: 31.8, longitude: 35.2 }, fetchImpl))
      .rejects.toThrow('No terrain elevation');
  });

  it('does not call the service for invalid coordinates', async () => {
    const fetchImpl = vi.fn();
    await expect(getTerrainElevation({ latitude: 91, longitude: 35.2 }, fetchImpl))
      .rejects.toThrow(LocationValidationError);
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});

describe('getBrowserLocation', () => {
  it('maps browser coordinates and preserves unavailable altitude as unknown', async () => {
    const geolocation = {
      getCurrentPosition: vi.fn((success) => success({ coords: { latitude: 12.3, longitude: -45.6, altitude: null, altitudeAccuracy: null } })),
    };
    await expect(getBrowserLocation(geolocation)).resolves.toEqual({ latitude: 12.3, longitude: -45.6, elevation: null });
    expect(geolocation.getCurrentPosition).toHaveBeenCalledOnce();
  });

  it('treats zero altitude without altitude accuracy as unknown', async () => {
    const geolocation = {
      getCurrentPosition: (success) => success({
        coords: { latitude: 31.8, longitude: 35.2, altitude: 0, altitudeAccuracy: null },
      }),
    };
    await expect(getBrowserLocation(geolocation)).resolves.toEqual({
      latitude: 31.8,
      longitude: 35.2,
      elevation: null,
    });
  });

  it('returns a useful message when permission is denied', async () => {
    const geolocation = { getCurrentPosition: (_success, failure) => failure({ code: 1 }) };
    await expect(getBrowserLocation(geolocation)).rejects.toThrow('Location permission was denied.');
  });

  it('rejects when the API is unavailable', async () => {
    await expect(getBrowserLocation(null)).rejects.toThrow('Geolocation is not supported');
  });
});

describe('formatLocalDateTime', () => {
  it('formats the supplied device date as a non-empty value', () => {
    expect(formatLocalDateTime(new Date(2026, 0, 2, 3, 4, 5))).toEqual(expect.any(String));
    expect(formatLocalDateTime(new Date(2026, 0, 2, 3, 4, 5)).length).toBeGreaterThan(0);
  });
});

describe('formatLocalDate', () => {
  it('formats a calendar date without a time of day', () => {
    const formatted = formatLocalDate(new Date(2026, 8, 22, 0, 0, 0));
    expect(formatted).toEqual(expect.any(String));
    expect(formatted).not.toContain('00:00');
  });
});

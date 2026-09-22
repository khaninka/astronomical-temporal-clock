export class LocationValidationError extends Error {
  constructor(errors) {
    super('Invalid location');
    this.name = 'LocationValidationError';
    this.errors = errors;
  }
}

function parseRequiredNumber(value, field, errors) {
  if (value === '' || value === null || value === undefined) {
    errors[field] = 'This field is required.';
    return null;
  }

  const number = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(number)) {
    errors[field] = 'Enter a finite number.';
    return null;
  }
  return number;
}

export function validateLocation(input) {
  const errors = {};
  const latitude = parseRequiredNumber(input.latitude, 'latitude', errors);
  const longitude = parseRequiredNumber(input.longitude, 'longitude', errors);
  const elevation = parseRequiredNumber(input.elevation, 'elevation', errors);

  if (latitude !== null && (latitude < -90 || latitude > 90)) {
    errors.latitude = 'Latitude must be between −90 and 90.';
  }
  if (longitude !== null && (longitude < -180 || longitude > 180)) {
    errors.longitude = 'Longitude must be between −180 and 180.';
  }
  if (elevation !== null && (elevation < -500 || elevation > 10_000)) {
    errors.elevation = 'Elevation must be between −500 and 10,000 metres.';
  }

  if (Object.keys(errors).length > 0) {
    throw new LocationValidationError(errors);
  }

  return { latitude, longitude, elevation };
}

export function validateCoordinates(input) {
  const errors = {};
  const latitude = parseRequiredNumber(input.latitude, 'latitude', errors);
  const longitude = parseRequiredNumber(input.longitude, 'longitude', errors);

  if (latitude !== null && (latitude < -90 || latitude > 90)) {
    errors.latitude = 'Latitude must be between −90 and 90.';
  }
  if (longitude !== null && (longitude < -180 || longitude > 180)) {
    errors.longitude = 'Longitude must be between −180 and 180.';
  }
  if (Object.keys(errors).length > 0) {
    throw new LocationValidationError(errors);
  }
  return { latitude, longitude };
}

export function parseLocalDateTime(value) {
  if (value instanceof Date) {
    if (!Number.isNaN(value.getTime())) return new Date(value);
    throw new TypeError('localDateTime must be a valid local date and time.');
  }
  if (typeof value !== 'string' || value.trim() === '') {
    throw new TypeError('localDate is required.');
  }
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  const date = dateOnly
    ? new Date(Number(dateOnly[1]), Number(dateOnly[2])-1, Number(dateOnly[3]))
    : new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new TypeError('localDate must be a valid local date.');
  }
  if (dateOnly && (date.getFullYear() !== Number(dateOnly[1])
    || date.getMonth() !== Number(dateOnly[2])-1
    || date.getDate() !== Number(dateOnly[3]))) {
    throw new TypeError('localDate must be a valid local date.');
  }
  return date;
}

export function formatLocalDateInput(date = new Date()) {
  const value = parseLocalDateTime(date);
  const pad = (number) => String(number).padStart(2, '0');
  return `${value.getFullYear()}-${pad(value.getMonth()+1)}-${pad(value.getDate())}`;
}

export function formatLocalDateTimeInput(date = new Date()) {
  const value = parseLocalDateTime(date);
  const pad = (number) => String(number).padStart(2, '0');
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`
    + `T${pad(value.getHours())}:${pad(value.getMinutes())}:${pad(value.getSeconds())}`;
}

export function createLocationData(input, localDateTime = input.localDateTime ?? new Date()) {
  const location = validateLocation(input);
  return { ...location, localDateTime: parseLocalDateTime(localDateTime) };
}

export function createGoogleMapsUrl(input) {
  const { latitude, longitude } = validateCoordinates(input);
  const query = encodeURIComponent(`${latitude},${longitude}`);
  return `https://www.google.com/maps/search/?api=1&query=${query}`;
}

export async function getTerrainElevation(input, fetchImpl = globalThis.fetch) {
  const { latitude, longitude } = validateCoordinates(input);
  if (typeof fetchImpl !== 'function') throw new Error('Terrain elevation lookup is unavailable.');

  const url = new URL('https://api.open-meteo.com/v1/elevation');
  url.searchParams.set('latitude', latitude);
  url.searchParams.set('longitude', longitude);

  let response;
  try {
    response = await fetchImpl(url, { signal: AbortSignal.timeout(10_000) });
  } catch {
    throw new Error('Could not reach the terrain elevation service.');
  }
  if (!response.ok) throw new Error('Terrain elevation service returned an error.');

  let payload;
  try {
    payload = await response.json();
  } catch {
    throw new Error('Terrain elevation service returned an invalid response.');
  }

  const elevation = payload?.elevation?.[0];
  if (!Number.isFinite(elevation)) {
    throw new Error('No terrain elevation is available for these coordinates.');
  }

  return {
    elevation,
    dataset: 'Copernicus DEM GLO-90 (90 m)',
    provider: 'Open-Meteo',
  };
}

export function getBrowserLocation(geolocation = globalThis.navigator?.geolocation) {
  if (!geolocation) {
    return Promise.reject(new Error('Geolocation is not supported by this browser.'));
  }

  return new Promise((resolve, reject) => {
    geolocation.getCurrentPosition(
      ({ coords }) => {
        try {
          const hasReliableAltitude = Number.isFinite(coords.altitude)
            && Number.isFinite(coords.altitudeAccuracy);
          const location = validateLocation({
            latitude: coords.latitude,
            longitude: coords.longitude,
            elevation: hasReliableAltitude ? coords.altitude : 0,
          });
          resolve({
            ...location,
            elevation: hasReliableAltitude ? coords.altitude : null,
          });
        } catch (error) {
          reject(error);
        }
      },
      (error) => reject(new Error(geolocationErrorMessage(error))),
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 },
    );
  });
}

function geolocationErrorMessage(error) {
  if (error?.code === 1) return 'Location permission was denied.';
  if (error?.code === 2) return 'Your location is unavailable.';
  if (error?.code === 3) return 'Location request timed out.';
  return 'Could not get your location.';
}

export function formatLocalDateTime(date = new Date()) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'full',
    timeStyle: 'medium',
  }).format(date);
}

export function formatLocalDate(date = new Date()) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'full' }).format(parseLocalDateTime(date));
}

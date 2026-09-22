export const positionCases = [
  { name: 'Hebron — March equinox', instant: '2026-03-20T10:00:00Z', latitude: 31.5326, longitude: 35.0998, elevation: 930 },
  { name: 'Quito — March equinox', instant: '2026-03-20T15:00:00Z', latitude: -0.1807, longitude: -78.4678, elevation: 2850 },
  { name: 'Greenwich — June solstice', instant: '2026-06-21T12:00:00Z', latitude: 51.4769, longitude: 0, elevation: 46 },
  { name: 'Cape Town — December solstice', instant: '2026-12-21T10:00:00Z', latitude: -33.9249, longitude: 18.4241, elevation: 25 },
  { name: 'Sydney — September equinox', instant: '2026-09-23T02:00:00Z', latitude: -33.8688, longitude: 151.2093, elevation: 58 },
  { name: 'Singapore — near equator', instant: '2026-05-15T05:00:00Z', latitude: 1.3521, longitude: 103.8198, elevation: 15 },
  { name: 'Anchorage — northern winter', instant: '2026-12-21T21:00:00Z', latitude: 61.2181, longitude: -149.9003, elevation: 31 },
  { name: 'Ushuaia — southern winter', instant: '2026-06-21T16:00:00Z', latitude: -54.8019, longitude: -68.303, elevation: 23 },
];

export const elevationCases = [0, 500, 1000, 2000].map((elevation) => ({
  name: `Hebron elevation ${elevation} m`,
  instant: '2026-03-20T10:00:00Z',
  latitude: 31.5326,
  longitude: 35.0998,
  elevation,
}));

export const crossingCases = [
  { name: 'Hebron civil dawn', start: '2026-03-20T00:00:00Z', end: '2026-03-21T00:00:00Z', latitude: 31.5326, longitude: 35.0998, elevation: 930, targetAltitude: -6, direction: 'RISING' },
  { name: 'Hebron civil dusk', start: '2026-03-20T00:00:00Z', end: '2026-03-21T00:00:00Z', latitude: 31.5326, longitude: 35.0998, elevation: 930, targetAltitude: -6, direction: 'SETTING' },
  { name: 'Quito astronomical dawn', start: '2026-03-20T00:00:00Z', end: '2026-03-21T00:00:00Z', latitude: -0.1807, longitude: -78.4678, elevation: 2850, targetAltitude: -18, direction: 'RISING' },
  { name: 'Cape Town nautical dusk', start: '2026-12-21T00:00:00Z', end: '2026-12-22T00:00:00Z', latitude: -33.9249, longitude: 18.4241, elevation: 25, targetAltitude: -12, direction: 'SETTING' },
  { name: 'Sydney civil dawn', start: '2026-09-23T00:00:00Z', end: '2026-09-24T00:00:00Z', latitude: -33.8688, longitude: 151.2093, elevation: 58, targetAltitude: -6, direction: 'RISING' },
  { name: 'Anchorage civil dusk', start: '2026-03-20T00:00:00Z', end: '2026-03-21T00:00:00Z', latitude: 61.2181, longitude: -149.9003, elevation: 31, targetAltitude: -6, direction: 'SETTING' },
  { name: 'Denver UTC-date rollover', start: '2003-10-17T18:00:00Z', end: '2003-10-18T06:00:00Z', latitude: 39.742476, longitude: -105.1786, elevation: 1830.14, targetAltitude: -6, direction: 'SETTING', deltaT: 67 },
];

export const noCrossingCases = [
  { name: 'North Pole polar day', start: '2026-06-21T00:00:00Z', end: '2026-06-22T00:00:00Z', latitude: 89, longitude: 0, elevation: 0, targetAltitude: -0.8333, direction: 'RISING' },
  { name: 'North Pole polar night', start: '2026-12-21T00:00:00Z', end: '2026-12-22T00:00:00Z', latitude: 89, longitude: 0, elevation: 0, targetAltitude: -0.8333, direction: 'SETTING' },
  { name: 'Tromso midnight sun', start: '2026-06-21T00:00:00Z', end: '2026-06-22T00:00:00Z', latitude: 69.6492, longitude: 18.9553, elevation: 10, targetAltitude: -0.8333, direction: 'SETTING' },
  { name: 'Tromso polar night', start: '2026-12-21T00:00:00Z', end: '2026-12-22T00:00:00Z', latitude: 69.6492, longitude: 18.9553, elevation: 10, targetAltitude: -0.8333, direction: 'RISING' },
];

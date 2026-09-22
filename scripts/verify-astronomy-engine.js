import { Body, Equator, Horizon, Observer, SearchAltitude } from 'astronomy-engine';
import { solarPosition } from '../src/astronomy/nrel-spa.js';
import { findSunCrossing } from '../src/astronomy/sun-crossing.js';

const date = new Date('2003-10-17T19:30:30Z');
const observer = new Observer(39.742476, -105.1786, 1830.14);
const equatorial = Equator(Body.Sun, date, observer, true, true);
const oraclePosition = Horizon(date, observer, equatorial.ra, equatorial.dec);
const ours = solarPosition({
  date,
  latitude: observer.latitude,
  longitude: observer.longitude,
  elevation: observer.height,
  pressure: 820,
  temperature: 11,
  deltaT: 67,
});

const positionRows = [
  {
    Quantity: 'Geometric altitude',
    'Our NREL SPA': ours.topocentricElevationUncorrected.toFixed(9),
    'Astronomy Engine': oraclePosition.altitude.toFixed(9),
    'Absolute difference': `${Math.abs(ours.topocentricElevationUncorrected-oraclePosition.altitude).toFixed(9)}°`,
    Tolerance: '0.001°',
  },
  {
    Quantity: 'Azimuth',
    'Our NREL SPA': ours.topocentricAzimuth.toFixed(9),
    'Astronomy Engine': oraclePosition.azimuth.toFixed(9),
    'Absolute difference': `${Math.abs(ours.topocentricAzimuth-oraclePosition.azimuth).toFixed(9)}°`,
    Tolerance: '0.001°',
  },
];

const crossingCases = [
  ['Rising through -6°', 'RISING', 1, new Date('2003-10-17T00:00:00Z'), new Date('2003-10-17T18:00:00Z')],
  ['Setting through -6°', 'SETTING', -1, new Date('2003-10-17T18:00:00Z'), new Date('2003-10-18T06:00:00Z')],
];
const eventRows = crossingCases.map(([event, direction, oracleDirection, start, end]) => {
  const ours = findSunCrossing({ start, end, observer: { latitude: observer.latitude, longitude: observer.longitude, elevation: observer.height }, targetAltitude: -6, direction, deltaT: 67 });
  const oracle = SearchAltitude(Body.Sun, observer, oracleDirection, start, (end-start)/86_400_000, -6).date;
  return {
  Event: event,
  'Our NREL SPA': ours.time.toISOString(),
  'Astronomy Engine': oracle.toISOString(),
  'Difference (s)': ((ours.time-oracle)/1000).toFixed(3),
  Tolerance: '±2.000 s',
  };
});

const positionPass = Math.abs(ours.topocentricElevationUncorrected-oraclePosition.altitude) < 0.001
  && Math.abs(ours.topocentricAzimuth-oraclePosition.azimuth) < 0.001;
const eventPass = eventRows.every((row) => Math.abs(Number(row['Difference (s)'])) < 2);

console.log('Independent Astronomy Engine comparison');
console.log('Astronomy Engine is used only as a development oracle.\n');
console.table(positionRows);
console.table(eventRows);
console.log(`Overall result: ${positionPass && eventPass ? 'PASS' : 'FAIL'}`);
if (!positionPass || !eventPass) process.exitCode = 1;

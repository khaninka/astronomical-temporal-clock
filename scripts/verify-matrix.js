import { Body, Equator, Horizon, Observer, SearchAltitude } from 'astronomy-engine';
import { solarPosition } from '../src/astronomy/nrel-spa.js';
import { findSunCrossing } from '../src/astronomy/sun-crossing.js';
import { crossingCases, elevationCases, noCrossingCases, positionCases } from '../test/fixtures/astronomy-matrix.js';

const angularDifference = (a, b) => Math.abs(((a-b+540)%360)-180);
const elevationBaseline = solarPosition({
  date: new Date(elevationCases[0].instant),
  latitude: elevationCases[0].latitude,
  longitude: elevationCases[0].longitude,
  elevation: 0,
  deltaT: 69,
}).topocentricElevationUncorrected;

const positionRows = [...positionCases, ...elevationCases].map((fixture) => {
  const date = new Date(fixture.instant);
  const observer = new Observer(fixture.latitude, fixture.longitude, fixture.elevation);
  const equatorial = Equator(Body.Sun, date, observer, true, true);
  const oracle = Horizon(date, observer, equatorial.ra, equatorial.dec);
  const ours = solarPosition({ date, latitude: fixture.latitude, longitude: fixture.longitude, elevation: fixture.elevation, deltaT: 69 });
  const altitudeDifference = Math.abs(ours.topocentricElevationUncorrected-oracle.altitude);
  const azimuthDifference = angularDifference(ours.topocentricAzimuth, oracle.azimuth);
  return {
    Case: fixture.name,
    'Our altitude': `${ours.topocentricElevationUncorrected.toFixed(9)}°`,
    'Effect vs 0 m': fixture.name.startsWith('Hebron elevation')
      ? `${((ours.topocentricElevationUncorrected-elevationBaseline)*3600).toFixed(6)}″`
      : '—',
    'Altitude diff': `${altitudeDifference.toFixed(6)}°`,
    'Azimuth diff': `${azimuthDifference.toFixed(6)}°`,
    Result: altitudeDifference < 0.01 && azimuthDifference < 0.01 ? 'PASS' : 'FAIL',
  };
});

const crossingRows = crossingCases.map((fixture) => {
  const start = new Date(fixture.start);
  const end = new Date(fixture.end);
  const observer = new Observer(fixture.latitude, fixture.longitude, fixture.elevation);
  const ours = findSunCrossing({
    start, end,
    observer: { latitude: fixture.latitude, longitude: fixture.longitude, elevation: fixture.elevation },
    targetAltitude: fixture.targetAltitude,
    direction: fixture.direction,
    deltaT: fixture.deltaT ?? 69,
  });
  const oracle = SearchAltitude(Body.Sun, observer, fixture.direction === 'RISING' ? 1 : -1, start, (end-start)/86_400_000, fixture.targetAltitude);
  const difference = oracle && ours.state === 'FOUND' ? Math.abs(ours.time-oracle.date)/1000 : Infinity;
  return {
    Case: fixture.name,
    Target: `${fixture.targetAltitude}° ${fixture.direction}`,
    'Our UTC': ours.time?.toISOString() ?? ours.state,
    'Oracle UTC': oracle?.date.toISOString() ?? 'NO_CROSSING',
    'Diff (s)': Number.isFinite(difference) ? difference.toFixed(3) : '—',
    Result: difference < 2 ? 'PASS' : 'FAIL',
  };
});

const noCrossingRows = noCrossingCases.map((fixture) => {
  const start = new Date(fixture.start);
  const end = new Date(fixture.end);
  const observer = new Observer(fixture.latitude, fixture.longitude, fixture.elevation);
  const ours = findSunCrossing({ start, end, observer: { latitude: fixture.latitude, longitude: fixture.longitude, elevation: fixture.elevation }, targetAltitude: fixture.targetAltitude, direction: fixture.direction });
  const oracle = SearchAltitude(Body.Sun, observer, fixture.direction === 'RISING' ? 1 : -1, start, (end-start)/86_400_000, fixture.targetAltitude);
  return {
    Case: fixture.name,
    'Our result': ours.state,
    'Oracle result': oracle ? oracle.date.toISOString() : 'NO_CROSSING',
    Result: ours.state === 'NO_CROSSING' && oracle === null ? 'PASS' : 'FAIL',
  };
});

console.log('Astronomy verification matrix');
console.log('Astronomy Engine is a development-only oracle. All targets use the astronomical horizon.\n');
console.log('Position and elevation matrix (tolerance 0.01°; elevation effect is topocentric parallax only)');
console.table(positionRows);
console.log('Crossing matrix (tolerance 2 s)');
console.table(crossingRows);
console.log('Polar/no-crossing matrix');
console.table(noCrossingRows);

const passed = [...positionRows, ...crossingRows, ...noCrossingRows].every((row) => row.Result === 'PASS');
console.log(`Overall result: ${passed ? 'PASS' : 'FAIL'}`);
if (!passed) process.exitCode = 1;

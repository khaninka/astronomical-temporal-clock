import { solarEvents, solarPosition } from '../src/astronomy/nrel-spa.js';

const source = 'https://docs.nlr.gov/docs/fy08osti/34302.pdf';
const input = {
  date: new Date('2003-10-17T19:30:30Z'),
  latitude: 39.742476,
  longitude: -105.1786,
  elevation: 1830.14,
  pressure: 820,
  temperature: 11,
  deltaT: 67,
  deltaUt1: 0,
  surfaceSlope: 30,
  surfaceAzimuthRotation: -10,
};

const expectedPosition = [
  ['Julian day', 'julianDay', 2452930.312847, 0.000001, 'day'],
  ['Heliocentric longitude', 'heliocentricLongitude', 24.0182616917, 0.0000001, '°'],
  ['Heliocentric latitude', 'heliocentricLatitude', -0.0001011219, 0.000000001, '°'],
  ['Earth radius vector', 'radiusVector', 0.9965422974, 0.000000001, 'AU'],
  ['Nutation longitude', 'nutationLongitude', -0.00399840, 0.0000001, '°'],
  ['Nutation obliquity', 'nutationObliquity', 0.00166657, 0.0000001, '°'],
  ['True obliquity', 'trueObliquity', 23.440465, 0.000001, '°'],
  ['Right ascension', 'geocentricRightAscension', 202.22741, 0.00001, '°'],
  ['Declination', 'geocentricDeclination', -9.31434, 0.00001, '°'],
  ['Topocentric zenith', 'topocentricZenith', 50.11162, 0.00001, '°'],
  ['Topocentric elevation', 'topocentricElevation', 39.88838, 0.00001, '°'],
  ['Topocentric azimuth', 'topocentricAzimuth', 194.34024, 0.00001, '°'],
  ['Surface incidence', 'incidenceAngle', 25.18700, 0.00001, '°'],
  ['Equation of time', 'equationOfTime', 14.641503, 0.0001, 'min'],
];

const expectedEvents = [
  ['Sunrise', 'sunrise', '2003-10-17T13:12:43.460Z'],
  ['Solar transit', 'transit', '2003-10-17T18:46:04.970Z'],
  ['Sunset', 'sunset', '2003-10-18T00:20:19.190Z'],
];

const position = solarPosition(input);
const events = solarEvents({
  date: '2003-10-17',
  latitude: input.latitude,
  longitude: input.longitude,
  deltaT: input.deltaT,
  deltaUt1: input.deltaUt1,
});

console.log('NREL SPA canonical verification');
console.log(`Source: ${source}`);
console.log('Fixture: Appendix A.5, Table A5.1\n');
console.log('Input');
console.table({
  'UTC instant': input.date.toISOString(),
  Latitude: `${input.latitude}°`,
  Longitude: `${input.longitude}°`,
  Elevation: `${input.elevation} m`,
  Pressure: `${input.pressure} mbar`,
  Temperature: `${input.temperature} °C`,
  'ΔT': `${input.deltaT} s`,
});

let passed = true;
const positionRows = expectedPosition.map(([quantity, key, expected, tolerance, unit]) => {
  const actual = position[key];
  const difference = actual - expected;
  const pass = Math.abs(difference) <= tolerance;
  passed &&= pass;
  return {
    Quantity: quantity,
    Expected: `${expected} ${unit}`,
    Actual: `${actual.toFixed(10)} ${unit}`,
    Difference: `${difference >= 0 ? '+' : ''}${difference.toExponential(3)} ${unit}`,
    Tolerance: `±${tolerance} ${unit}`,
    Result: pass ? 'PASS' : 'FAIL',
  };
});

console.log('\nPosition');
console.table(positionRows);

const eventRows = expectedEvents.map(([quantity, key, expectedIso]) => {
  const expected = new Date(expectedIso);
  const actual = events[key];
  const differenceSeconds = (actual.getTime() - expected.getTime()) / 1000;
  const pass = Math.abs(differenceSeconds) <= 0.5;
  passed &&= pass;
  return {
    Event: quantity,
    Expected: expected.toISOString(),
    Actual: actual.toISOString(),
    'Difference (s)': `${differenceSeconds >= 0 ? '+' : ''}${differenceSeconds.toFixed(3)}`,
    Tolerance: '±0.500 s',
    Result: pass ? 'PASS' : 'FAIL',
  };
});

console.log('\nEvents');
console.table(eventRows);
console.log(`\nOverall result: ${passed ? 'PASS' : 'FAIL'}`);

if (!passed) process.exitCode = 1;


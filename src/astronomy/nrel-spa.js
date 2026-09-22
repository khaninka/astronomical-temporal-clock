/**
 * Independent implementation of the published NREL Solar Position Algorithm.
 * Primary source: NREL/TP-560-34302, revised January 2008.
 * https://docs.nlr.gov/docs/fy08osti/34302.pdf
 *
 * The separately licensed reference C source was not copied.
 */
const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;

// NREL/TP-560-34302, Table A4.2. Values are published VSOP87 terms.
const L_TERMS = [
  [[175347046,0,0],[3341656,4.6692568,6283.07585],[34894,4.6261,12566.1517],[3497,2.7441,5753.3849],[3418,2.8289,3.5231],[3136,3.6277,77713.7715],[2676,4.4181,7860.4194],[2343,6.1352,3930.2097],[1324,0.7425,11506.7698],[1273,2.0371,529.691],[1199,1.1096,1577.3435],[990,5.233,5884.927],[902,2.045,26.298],[857,3.508,398.149],[780,1.179,5223.694],[753,2.533,5507.553],[505,4.583,18849.228],[492,4.205,775.523],[357,2.92,0.067],[317,5.849,11790.629],[284,1.899,796.298],[271,0.315,10977.079],[243,0.345,5486.778],[206,4.806,2544.314],[205,1.869,5573.143],[202,2.458,6069.777],[156,0.833,213.299],[132,3.411,2942.463],[126,1.083,20.775],[115,0.645,0.98],[103,0.636,4694.003],[102,0.976,15720.839],[102,4.267,7.114],[99,6.21,2146.17],[98,0.68,155.42],[86,5.98,161000.69],[85,1.3,6275.96],[85,3.67,71430.7],[80,1.81,17260.15],[79,3.04,12036.46],[75,1.76,5088.63],[74,3.5,3154.69],[74,4.68,801.82],[70,0.83,9437.76],[62,3.98,8827.39],[61,1.82,7084.9],[57,2.78,6286.6],[56,4.39,14143.5],[56,3.47,6279.55],[52,0.19,12139.55],[52,1.33,1748.02],[51,0.28,5856.48],[49,0.49,1194.45],[41,5.37,8429.24],[41,2.4,19651.05],[39,6.17,10447.39],[37,6.04,10213.29],[37,2.57,1059.38],[36,1.71,2352.87],[36,1.78,6812.77],[33,0.59,17789.85],[30,0.44,83996.85],[30,2.74,1349.87],[25,3.16,4690.48]],
  [[628331966747,0,0],[206059,2.678235,6283.07585],[4303,2.6351,12566.1517],[425,1.59,3.523],[119,5.796,26.298],[109,2.966,1577.344],[93,2.59,18849.23],[72,1.14,529.69],[68,1.87,398.15],[67,4.41,5507.55],[59,2.89,5223.69],[56,2.17,155.42],[45,0.4,796.3],[36,0.47,775.52],[29,2.65,7.11],[21,5.34,0.98],[19,1.85,5486.78],[19,4.97,213.3],[17,2.99,6275.96],[16,0.03,2544.31],[16,1.43,2146.17],[15,1.21,10977.08],[12,2.83,1748.02],[12,3.26,5088.63],[12,5.27,1194.45],[12,2.08,4694],[11,0.77,553.57],[10,1.3,6286.6],[10,4.24,1349.87],[9,2.7,242.73],[9,5.64,951.72],[8,5.3,2352.87],[6,2.65,9437.76],[6,4.67,4690.48]],
  [[52919,0,0],[8720,1.0721,6283.0758],[309,0.867,12566.152],[27,0.05,3.52],[16,5.19,26.3],[16,3.68,155.42],[10,0.76,18849.23],[9,2.06,77713.77],[7,0.83,775.52],[5,4.66,1577.34],[4,1.03,7.11],[4,3.44,5573.14],[3,5.14,796.3],[3,6.05,5507.55],[3,1.19,242.73],[3,6.12,529.69],[3,0.31,398.15],[3,2.28,553.57],[2,4.38,5223.69],[2,3.75,0.98]],
  [[289,5.844,6283.076],[35,0,0],[17,5.49,12566.15],[3,5.2,155.42],[1,4.72,3.52],[1,5.3,18849.23],[1,5.97,242.73]],
  [[114,3.142,0],[8,4.13,6283.08],[1,3.84,12566.15]],
  [[1,3.14,0]],
];

const B_TERMS = [
  [[280,3.199,84334.662],[102,5.422,5507.553],[80,3.88,5223.69],[44,3.7,2352.87],[32,4,1577.34]],
  [[9,3.9,5507.55],[6,1.73,5223.69]],
];

const R_TERMS = [
  [[100013989,0,0],[1670700,3.0984635,6283.07585],[13956,3.05525,12566.1517],[3084,5.1985,77713.7715],[1628,1.1739,5753.3849],[1576,2.8469,7860.4194],[925,5.453,11506.77],[542,4.564,3930.21],[472,3.661,5884.927],[346,0.964,5507.553],[329,5.9,5223.694],[307,0.299,5573.143],[243,4.273,11790.629],[212,5.847,1577.344],[186,5.022,10977.079],[175,3.012,18849.228],[110,5.055,5486.778],[98,0.89,6069.78],[86,5.69,15720.84],[86,1.27,161000.69],[65,0.27,17260.15],[63,0.92,529.69],[57,2.01,83996.85],[56,5.24,71430.7],[49,3.25,2544.31],[47,2.58,775.52],[45,5.54,9437.76],[43,6.01,6275.96],[39,5.36,4694],[38,2.39,8827.39],[37,0.83,19651.05],[37,4.9,12139.55],[36,1.67,12036.46],[35,1.84,2942.46],[33,0.24,7084.9],[32,0.18,5088.63],[32,1.78,398.15],[28,1.21,6286.6],[28,1.9,6279.55],[26,4.59,10447.39]],
  [[103019,1.10749,6283.07585],[1721,1.0644,12566.1517],[702,3.142,0],[32,1.02,18849.23],[31,2.84,5507.55],[25,1.32,5223.69],[18,1.42,1577.34],[10,5.91,10977.08],[9,1.42,6275.96],[9,0.27,5486.78]],
  [[4359,5.7846,6283.0758],[124,5.579,12566.152],[12,3.14,0],[9,3.63,77713.77],[6,1.87,5573.14],[3,5.47,18849.23]],
  [[145,4.273,6283.076],[7,3.92,12566.15]],
  [[4,2.56,6283.08]],
];

// Table A4.3: Y0..Y4, then a,b,c,d. Blank published cells are zero.
const NUTATION_TERMS = [
  [0,0,0,0,1,-171996,-174.2,92025,8.9],[-2,0,0,2,2,-13187,-1.6,5736,-3.1],[0,0,0,2,2,-2274,-0.2,977,-0.5],[0,0,0,0,2,2062,0.2,-895,0.5],[0,1,0,0,0,1426,-3.4,54,-0.1],[0,0,1,0,0,712,0.1,-7,0],[-2,1,0,2,2,-517,1.2,224,-0.6],[0,0,0,2,1,-386,-0.4,200,0],[0,0,1,2,2,-301,0,129,-0.1],[-2,-1,0,2,2,217,-0.5,-95,0.3],[-2,0,1,0,0,-158,0,0,0],[-2,0,0,2,1,129,0.1,-70,0],[0,0,-1,2,2,123,0,-53,0],[2,0,0,0,0,63,0,0,0],[0,0,1,0,1,63,0.1,-33,0],[2,0,-1,2,2,-59,0,26,0],[0,0,-1,0,1,-58,-0.1,32,0],[0,0,1,2,1,-51,0,27,0],[-2,0,2,0,0,48,0,0,0],[0,0,-2,2,1,46,0,-24,0],[2,0,0,2,2,-38,0,16,0],[0,0,2,2,2,-31,0,13,0],[0,0,2,0,0,29,0,0,0],[-2,0,1,2,2,29,0,-12,0],[0,0,0,2,0,26,0,0,0],[-2,0,0,2,0,-22,0,0,0],[0,0,-1,2,1,21,0,-10,0],[0,2,0,0,0,17,-0.1,0,0],[2,0,-1,0,1,16,0,-8,0],[-2,2,0,2,2,-16,0.1,7,0],[0,1,0,0,1,-15,0,9,0],[-2,0,1,0,1,-13,0,7,0],[0,-1,0,0,1,-12,0,6,0],[0,0,2,-2,0,11,0,0,0],[2,0,-1,2,1,-10,0,5,0],[2,0,1,2,2,-8,0,3,0],[0,1,0,2,2,7,0,-3,0],[-2,1,1,0,0,-7,0,0,0],[0,-1,0,2,2,-7,0,3,0],[2,0,0,2,1,-7,0,3,0],[2,0,1,0,0,6,0,0,0],[-2,0,2,2,2,6,0,-3,0],[-2,0,1,2,1,6,0,-3,0],[2,0,-2,0,1,-6,0,3,0],[2,0,0,0,1,-6,0,3,0],[0,-1,1,0,0,5,0,0,0],[-2,-1,0,2,1,-5,0,3,0],[-2,0,0,0,1,-5,0,3,0],[0,0,2,2,1,-5,0,3,0],[-2,0,2,0,1,4,0,0,0],[-2,1,0,2,1,4,0,0,0],[0,0,1,-2,0,4,0,0,0],[-1,0,1,0,0,-4,0,0,0],[-2,1,0,0,0,-4,0,0,0],[1,0,0,0,0,-4,0,0,0],[0,0,1,2,0,3,0,0,0],[0,0,-2,2,2,-3,0,0,0],[-1,-1,1,0,0,-3,0,0,0],[0,1,1,0,0,-3,0,0,0],[0,-1,1,2,2,-3,0,0,0],[2,-1,-1,2,2,-3,0,0,0],[0,0,3,2,2,-3,0,0,0],[2,-1,0,2,2,-3,0,0,0],
];

const radians = (degrees) => degrees * DEG_TO_RAD;
const degrees = (radiansValue) => radiansValue * RAD_TO_DEG;
const normalizeDegrees = (value) => ((value % 360) + 360) % 360;

function periodicSum(groups, jme) {
  return groups.reduce((total, terms, power) => {
    const sum = terms.reduce((groupTotal, [a, b, c]) => groupTotal + a * Math.cos(b + c * jme), 0);
    return total + sum * (jme ** power);
  }, 0) / 1e8;
}

export function julianDay(date, deltaUt1Seconds = 0) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) throw new TypeError('date must be valid.');
  if (!Number.isFinite(deltaUt1Seconds)) throw new TypeError('deltaUt1Seconds must be finite.');
  return (date.getTime() / 86_400_000) + 2_440_587.5 + (deltaUt1Seconds / 86_400);
}

export function solarPosition({
  date,
  latitude,
  longitude,
  elevation = 0,
  pressure = 1013.25,
  temperature = 15,
  deltaT = 69,
  deltaUt1 = 0,
  surfaceSlope = 0,
  surfaceAzimuthRotation = 0,
}) {
  for (const [name, value] of Object.entries({ latitude, longitude, elevation, pressure, temperature, deltaT, deltaUt1, surfaceSlope, surfaceAzimuthRotation })) {
    if (!Number.isFinite(value)) throw new TypeError(`${name} must be finite.`);
  }
  if (latitude < -90 || latitude > 90) throw new RangeError('latitude must be between -90 and 90.');
  if (longitude < -180 || longitude > 180) throw new RangeError('longitude must be between -180 and 180.');

  const jd = julianDay(date, deltaUt1);
  const jde = jd + deltaT / 86_400;
  const jc = (jd - 2_451_545) / 36_525;
  const jce = (jde - 2_451_545) / 36_525;
  const jme = jce / 10;

  const heliocentricLongitude = normalizeDegrees(degrees(periodicSum(L_TERMS, jme)));
  const heliocentricLatitude = degrees(periodicSum(B_TERMS, jme));
  const radiusVector = periodicSum(R_TERMS, jme);
  const geocentricLongitude = normalizeDegrees(heliocentricLongitude + 180);
  const geocentricLatitude = -heliocentricLatitude;

  const x = [
    297.85036 + 445267.111480*jce - 0.0019142*jce**2 + jce**3/189474,
    357.52772 + 35999.050340*jce - 0.0001603*jce**2 - jce**3/300000,
    134.96298 + 477198.867398*jce + 0.0086972*jce**2 + jce**3/56250,
    93.27191 + 483202.017538*jce - 0.0036825*jce**2 + jce**3/327270,
    125.04452 - 1934.136261*jce + 0.0020708*jce**2 + jce**3/450000,
  ];
  let nutationLongitudeUnits = 0;
  let nutationObliquityUnits = 0;
  for (const term of NUTATION_TERMS) {
    const argument = radians(term.slice(0, 5).reduce((sum, coefficient, index) => sum + coefficient * x[index], 0));
    nutationLongitudeUnits += (term[5] + term[6] * jce) * Math.sin(argument);
    nutationObliquityUnits += (term[7] + term[8] * jce) * Math.cos(argument);
  }
  const nutationLongitude = nutationLongitudeUnits / 36_000_000;
  const nutationObliquity = nutationObliquityUnits / 36_000_000;

  const u = jme / 10;
  const meanObliquityArcseconds = 84381.448 - 4680.93*u - 1.55*u**2 + 1999.25*u**3
    - 51.38*u**4 - 249.67*u**5 - 39.05*u**6 + 7.12*u**7 + 27.87*u**8 + 5.79*u**9 + 2.45*u**10;
  const trueObliquity = meanObliquityArcseconds / 3600 + nutationObliquity;
  const aberrationCorrection = -20.4898 / (3600 * radiusVector);
  const apparentLongitude = geocentricLongitude + nutationLongitude + aberrationCorrection;

  const meanSiderealTime = normalizeDegrees(280.46061837 + 360.98564736629*(jd-2451545)
    + 0.000387933*jc**2 - jc**3/38710000);
  const apparentSiderealTime = meanSiderealTime + nutationLongitude * Math.cos(radians(trueObliquity));

  const lambda = radians(apparentLongitude);
  const beta = radians(geocentricLatitude);
  const epsilon = radians(trueObliquity);
  const geocentricRightAscension = normalizeDegrees(degrees(Math.atan2(
    Math.sin(lambda)*Math.cos(epsilon) - Math.tan(beta)*Math.sin(epsilon),
    Math.cos(lambda),
  )));
  const geocentricDeclination = degrees(Math.asin(
    Math.sin(beta)*Math.cos(epsilon) + Math.cos(beta)*Math.sin(epsilon)*Math.sin(lambda),
  ));
  const localHourAngle = normalizeDegrees(apparentSiderealTime + longitude - geocentricRightAscension);

  const horizontalParallax = 8.794 / (3600 * radiusVector);
  const latitudeRad = radians(latitude);
  const hourAngleRad = radians(localHourAngle);
  const declinationRad = radians(geocentricDeclination);
  const parallaxRad = radians(horizontalParallax);
  const observerU = Math.atan(0.99664719 * Math.tan(latitudeRad));
  const observerX = Math.cos(observerU) + elevation / 6_378_140 * Math.cos(latitudeRad);
  const observerY = 0.99664719 * Math.sin(observerU) + elevation / 6_378_140 * Math.sin(latitudeRad);
  const rightAscensionParallax = degrees(Math.atan2(
    -observerX * Math.sin(parallaxRad) * Math.sin(hourAngleRad),
    Math.cos(declinationRad) - observerX * Math.sin(parallaxRad) * Math.cos(hourAngleRad),
  ));
  const topocentricDeclination = degrees(Math.atan2(
    (Math.sin(declinationRad) - observerY*Math.sin(parallaxRad)) * Math.cos(radians(rightAscensionParallax)),
    Math.cos(declinationRad) - observerX*Math.sin(parallaxRad)*Math.cos(hourAngleRad),
  ));
  const topocentricRightAscension = geocentricRightAscension + rightAscensionParallax;
  const topocentricHourAngle = localHourAngle - rightAscensionParallax;
  const topocentricElevationUncorrected = degrees(Math.asin(
    Math.sin(latitudeRad)*Math.sin(radians(topocentricDeclination))
    + Math.cos(latitudeRad)*Math.cos(radians(topocentricDeclination))*Math.cos(radians(topocentricHourAngle)),
  ));
  const refractionCorrection = topocentricElevationUncorrected > 0
    ? (pressure/1010) * (283/(273+temperature)) * 1.02
      / (60 * Math.tan(radians(topocentricElevationUncorrected + 10.3/(topocentricElevationUncorrected+5.11))))
    : 0;
  const topocentricElevation = topocentricElevationUncorrected + refractionCorrection;
  const topocentricZenith = 90 - topocentricElevation;
  const astronomersAzimuth = normalizeDegrees(degrees(Math.atan2(
    Math.sin(radians(topocentricHourAngle)),
    Math.cos(radians(topocentricHourAngle))*Math.sin(latitudeRad)
      - Math.tan(radians(topocentricDeclination))*Math.cos(latitudeRad),
  )));
  const topocentricAzimuth = normalizeDegrees(astronomersAzimuth + 180);
  const incidenceAngle = degrees(Math.acos(
    Math.cos(radians(topocentricZenith))*Math.cos(radians(surfaceSlope))
    + Math.sin(radians(surfaceSlope))*Math.sin(radians(topocentricZenith))
      * Math.cos(radians(astronomersAzimuth-surfaceAzimuthRotation)),
  ));

  const meanLongitude = normalizeDegrees(280.4664567 + 360007.6982779*jme + 0.03032028*jme**2
    + jme**3/49931 - jme**4/15300 - jme**5/2000000);
  const equationOfTimeRaw = 4 * (meanLongitude - 0.0057183
    - geocentricRightAscension + nutationLongitude*Math.cos(epsilon));
  const equationOfTime = equationOfTimeRaw > 20 ? equationOfTimeRaw - 1440
    : equationOfTimeRaw < -20 ? equationOfTimeRaw + 1440 : equationOfTimeRaw;

  return {
    julianDay: jd,
    julianEphemerisDay: jde,
    julianCentury: jc,
    julianEphemerisCentury: jce,
    julianEphemerisMillennium: jme,
    heliocentricLongitude,
    heliocentricLatitude,
    radiusVector,
    geocentricLongitude,
    geocentricLatitude,
    nutationLongitude,
    nutationObliquity,
    trueObliquity,
    aberrationCorrection,
    apparentLongitude,
    meanSiderealTime,
    apparentSiderealTime,
    geocentricRightAscension,
    geocentricDeclination,
    localHourAngle,
    horizontalParallax,
    rightAscensionParallax,
    topocentricRightAscension,
    topocentricDeclination,
    topocentricHourAngle,
    topocentricElevationUncorrected,
    refractionCorrection,
    topocentricElevation,
    topocentricZenith,
    topocentricAzimuth,
    incidenceAngle,
    equationOfTime,
  };
}

const normalizeFraction = (value) => ((value % 1) + 1) % 1;
const normalizeSignedDegrees = (value) => {
  const normalized = normalizeDegrees(value);
  return normalized >= 180 ? normalized - 360 : normalized;
};

function interpolateDaily(values, n) {
  let a = values[1] - values[0];
  let b = values[2] - values[1];
  if (Math.abs(a) > 2) a = normalizeSignedDegrees(a);
  if (Math.abs(b) > 2) b = normalizeSignedDegrees(b);
  return values[1] + n * (a + b + (b-a)*n) / 2;
}

export function solarEvents({
  date,
  latitude,
  longitude,
  deltaT = 69,
  deltaUt1 = 0,
  sunriseAltitude = -0.8333,
}) {
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new TypeError('date must be an ISO calendar date (YYYY-MM-DD).');
  }
  const [year, month, day] = date.split('-').map(Number);
  const midnightMs = Date.UTC(year, month-1, day);
  const parsedDate = new Date(midnightMs);
  if (!Number.isFinite(midnightMs)
    || parsedDate.getUTCFullYear() !== year
    || parsedDate.getUTCMonth() !== month-1
    || parsedDate.getUTCDate() !== day) {
    throw new TypeError('date must be valid.');
  }

  const positions = [-1,0,1].map((offset) => solarPosition({
    date: new Date(midnightMs + offset*86_400_000),
    latitude,
    longitude,
    deltaT,
    deltaUt1,
  }));
  const center = positions[1];
  const rightAscensions = positions.map((position) => position.geocentricRightAscension);
  const declinations = positions.map((position) => position.geocentricDeclination);
  const latitudeRad = radians(latitude);
  const declination0Rad = radians(declinations[1]);
  const hourAngleArgument = (Math.sin(radians(sunriseAltitude)) - Math.sin(latitudeRad)*Math.sin(declination0Rad))
    / (Math.cos(latitudeRad)*Math.cos(declination0Rad));

  if (hourAngleArgument < -1 || hourAngleArgument > 1) {
    return {
      state: hourAngleArgument < -1 ? 'SUN_ALWAYS_ABOVE' : 'SUN_ALWAYS_BELOW',
      sunrise: null,
      transit: null,
      sunset: null,
    };
  }

  const hourAngle0 = degrees(Math.acos(hourAngleArgument));
  const approximateTransit = normalizeFraction((rightAscensions[1] - longitude - center.apparentSiderealTime) / 360);
  const approximate = [
    approximateTransit,
    normalizeFraction(approximateTransit-hourAngle0/360),
    normalizeFraction(approximateTransit+hourAngle0/360),
  ];

  const corrected = approximate.map((m, index) => {
    const siderealTime = center.apparentSiderealTime + 360.985647*m;
    const n = m + deltaT/86_400;
    const alphaPrime = interpolateDaily(rightAscensions, n);
    const deltaPrime = interpolateDaily(declinations, n);
    const hourAnglePrime = normalizeSignedDegrees(siderealTime + longitude - alphaPrime);
    const altitude = degrees(Math.asin(
      Math.sin(latitudeRad)*Math.sin(radians(deltaPrime))
      + Math.cos(latitudeRad)*Math.cos(radians(deltaPrime))*Math.cos(radians(hourAnglePrime)),
    ));
    if (index === 0) return m-hourAnglePrime/360;
    return m + (altitude-sunriseAltitude)
      / (360*Math.cos(radians(deltaPrime))*Math.cos(latitudeRad)*Math.sin(radians(hourAnglePrime)));
  });

  let [transitFraction, sunriseFraction, sunsetFraction] = corrected;
  if (sunsetFraction <= sunriseFraction) sunsetFraction += 1;
  if (transitFraction < sunriseFraction) transitFraction += 1;

  return {
    state: 'NORMAL',
    sunrise: new Date(midnightMs + sunriseFraction*86_400_000),
    transit: new Date(midnightMs + transitFraction*86_400_000),
    sunset: new Date(midnightMs + sunsetFraction*86_400_000),
    fractions: { sunrise: sunriseFraction, transit: transitFraction, sunset: sunsetFraction },
  };
}

import { Body, Equator, Horizon, Observer } from 'astronomy-engine';
import { describe, expect, it } from 'vitest';
import { solarPosition } from '../src/astronomy/nrel-spa.js';
import { elevationCases, positionCases } from './fixtures/astronomy-matrix.js';

const angularDifference = (a, b) => Math.abs(((a-b+540)%360)-180);

function astronomyEnginePosition(date, observer) {
  const coordinates = Equator(Body.Sun, date, observer, true, true);
  return Horizon(date, observer, coordinates.ra, coordinates.dec);
}

describe('Astronomy Engine independent oracle', () => {
  it('independently agrees with the canonical NREL position', () => {
    const date = new Date('2003-10-17T19:30:30Z');
    const observer = new Observer(39.742476, -105.1786, 1830.14);
    const oracle = astronomyEnginePosition(date, observer);
    const ours = solarPosition({
      date,
      latitude: observer.latitude,
      longitude: observer.longitude,
      elevation: observer.height,
      pressure: 820,
      temperature: 11,
      deltaT: 67,
    });

    expect(Math.abs(ours.topocentricElevationUncorrected-oracle.altitude)).toBeLessThan(0.001);
    expect(angularDifference(ours.topocentricAzimuth, oracle.azimuth)).toBeLessThan(0.001);
  });

  it.each([...positionCases, ...elevationCases])('agrees on geometric altitude and azimuth: $name', ({ instant, latitude, longitude, elevation }) => {
    const date = new Date(instant);
    const observer = new Observer(latitude, longitude, elevation);
    const oracle = astronomyEnginePosition(date, observer);
    const ours = solarPosition({ date, latitude, longitude, elevation, deltaT: 69 });

    expect(Math.abs(ours.topocentricElevationUncorrected-oracle.altitude)).toBeLessThan(0.01);
    expect(angularDifference(ours.topocentricAzimuth, oracle.azimuth)).toBeLessThan(0.01);
  });

  it('uses terrain elevation only for the small topocentric parallax correction', () => {
    const values = elevationCases.map(({ instant, latitude, longitude, elevation }) => solarPosition({
      date: new Date(instant), latitude, longitude, elevation, deltaT: 69,
    }).topocentricElevationUncorrected);

    expect(new Set(values).size).toBe(values.length);
    expect(Math.abs(values.at(-1)-values[0])).toBeLessThan(0.00001);
  });

});

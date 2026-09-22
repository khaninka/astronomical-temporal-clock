import { createGoogleMapsUrl, createLocationData, formatLocalDate, formatLocalDateInput, formatLocalDateTime, getBrowserLocation, getTerrainElevation, LocationValidationError } from './location.js';
import { calculateLocationBoundaries } from './astronomy/boundary-rule.js';
import { createCrossingDisplayModel } from './astronomy/crossing-display.js';
import { calculateLocationTemporalClock, calculateTemporalClock, formatTemporalTime } from './astronomy/temporal-clock.js';
import { createClockFaceModel, renderClockFace } from './display/clock-face.js';

const form = document.querySelector('#location-form');
const latitudeInput = document.querySelector('#latitude');
const longitudeInput = document.querySelector('#longitude');
const elevationInput = document.querySelector('#elevation');
const locationButton = document.querySelector('#use-location');
const elevationButton = document.querySelector('#get-elevation');
const elevationSource = document.querySelector('#elevation-source');
const calculationDateInput = document.querySelector('#calculation-date');
const deviceDateButton = document.querySelector('#use-device-date');
const timeElement = document.querySelector('#local-date-time');
const statusElement = document.querySelector('#status');
const mapLink = document.querySelector('#map-link');
const crossingResults = document.querySelector('#crossing-results');
const crossingDate = document.querySelector('#crossing-date');
const crossingReference = document.querySelector('#crossing-reference');
const horizonDip = document.querySelector('#horizon-dip');
const risingTarget = document.querySelector('#rising-target');
const settingTarget = document.querySelector('#setting-target');
const risingLocal = document.querySelector('#rising-local');
const risingUtc = document.querySelector('#rising-utc');
const settingLocal = document.querySelector('#setting-local');
const settingUtc = document.querySelector('#setting-utc');
const dayStartLocal = document.querySelector('#day-start-local');
const dayStartUtc = document.querySelector('#day-start-utc');
const dayEndLocal = document.querySelector('#day-end-local');
const dayEndUtc = document.querySelector('#day-end-utc');
const cycleStatus = document.querySelector('#cycle-status');
const temporalResults = document.querySelector('#temporal-results');
const temporalPeriod = document.querySelector('#temporal-period');
const temporalTime = document.querySelector('#temporal-time');
const temporalInterval = document.querySelector('#temporal-interval');
const temporalHourDuration = document.querySelector('#temporal-hour-duration');
const clockDisplay = document.querySelector('#clock-display');
const clockSvg = document.querySelector('#clock-face');
const clockReadout = document.querySelector('#clock-readout');
const clockMode = document.querySelector('#clock-mode');
let temporalSchedule = null;
let displaySchedule = null;
let displayReferenceTime = null;
let displayIsLive = false;

function sameLocalDate(a, b) {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate();
}

function renderTemporalClock(now = new Date()) {
  if (!temporalSchedule || !sameLocalDate(temporalSchedule.current.localDateTime, now)) {
    temporalResults.hidden = true;
  } else {
    const result = calculateTemporalClock({
      referenceTime: now,
      previous: temporalSchedule.previous,
      current: temporalSchedule.current,
      next: temporalSchedule.next,
    });
    temporalPeriod.textContent = result.period;
    temporalTime.textContent = formatTemporalTime(result);
    temporalInterval.textContent = `${formatLocalDateTime(result.periodStart)} → ${formatLocalDateTime(result.periodEnd)}`;
    temporalHourDuration.textContent = `${(result.temporalHourDurationMilliseconds/60_000).toFixed(6)} ordinary minutes`;
    temporalResults.hidden = false;
  }
  if (!displaySchedule) {
    clockDisplay.hidden = true;
    return;
  }
  const clockTime = displayIsLive ? now : displayReferenceTime;
  const displayResult = calculateTemporalClock({
    referenceTime: clockTime,
    previous: displaySchedule.previous,
    current: displaySchedule.current,
    next: displaySchedule.next,
  });
  renderClockFace(clockSvg, createClockFaceModel(displaySchedule, clockTime));
  clockReadout.textContent = `${displayResult.period} ${formatTemporalTime(displayResult)}`;
  clockMode.textContent = displayIsLive ? 'Live · device local time' : `Selected-date preview · ${formatLocalDate(clockTime)} at 12:00`;
  clockDisplay.hidden = false;
}

function renderCrossing(element, utcElement, crossing) {
  element.textContent = crossing.localTime;
  utcElement.textContent = crossing.utcTime ? `UTC ${crossing.utcTime}` : '';
  utcElement.hidden = crossing.utcTime === null;
}

function renderCrossings(calculation) {
  const model = createCrossingDisplayModel(calculation);
  crossingDate.textContent = model.date;
  crossingReference.textContent = model.reference;
  horizonDip.textContent = model.horizonDip;
  risingTarget.textContent = model.morningTargetAltitude;
  settingTarget.textContent = model.eveningTargetAltitude;
  renderCrossing(risingLocal, risingUtc, model.netz);
  renderCrossing(settingLocal, settingUtc, model.shkiah);
  renderCrossing(dayStartLocal, dayStartUtc, model.dayStart);
  renderCrossing(dayEndLocal, dayEndUtc, model.dayEnd);
  cycleStatus.textContent = model.liveComparison ?? '';
  cycleStatus.hidden = model.liveComparison === null;
  crossingResults.hidden = false;
}

function showMapLink(location) {
  mapLink.href = createGoogleMapsUrl(location);
  mapLink.hidden = false;
}

function renderDeviceTime(now = new Date()) {
  timeElement.dateTime = now.toISOString();
  timeElement.textContent = formatLocalDateTime(now);
}

function clearValidity() {
  for (const input of [latitudeInput, longitudeInput, elevationInput]) input.setCustomValidity('');
}

function currentFormValues() {
  return Object.fromEntries(new FormData(form));
}

function showValidationErrors(errors) {
  clearValidity();
  for (const [name, message] of Object.entries(errors)) form.elements[name]?.setCustomValidity(message);
  statusElement.textContent = Object.values(errors).join(' ');
  form.reportValidity();
}

form.addEventListener('submit', (event) => {
  event.preventDefault();
  clearValidity();
  try {
    const location = createLocationData(currentFormValues());
    const crossings = calculateLocationBoundaries(location);
    renderCrossings(crossings);
    const now = new Date();
    displayIsLive = sameLocalDate(location.localDateTime, now);
    displayReferenceTime = displayIsLive
      ? now
      : new Date(location.localDateTime.getFullYear(), location.localDateTime.getMonth(), location.localDateTime.getDate(), 12);
    const displayTemporal = calculateLocationTemporalClock(location, displayReferenceTime);
    displaySchedule = displayTemporal.state === 'AVAILABLE' ? displayTemporal : null;
    const liveTemporal = sameLocalDate(location.localDateTime, now)
      ? calculateLocationTemporalClock(location, now)
      : null;
    temporalSchedule = liveTemporal?.state === 'AVAILABLE' ? liveTemporal : null;
    renderTemporalClock(now);
    statusElement.textContent = `Location confirmed: ${location.latitude}, ${location.longitude}, ${location.elevation} m for ${formatLocalDate(location.localDateTime)}. Results are shown below.`;
    showMapLink(location);
  } catch (error) {
    if (error instanceof LocationValidationError) showValidationErrors(error.errors);
    else throw error;
  }
});

deviceDateButton.addEventListener('click', () => {
  calculationDateInput.value = formatLocalDateInput();
  statusElement.textContent = 'Calculation date reset to the device date.';
});

elevationButton.addEventListener('click', async () => {
  elevationButton.disabled = true;
  elevationSource.hidden = true;
  statusElement.textContent = 'Getting estimated terrain elevation from Open-Meteo…';
  try {
    const result = await getTerrainElevation(currentFormValues());
    elevationInput.value = result.elevation;
    elevationSource.textContent = `Estimated terrain elevation from ${result.provider}, ${result.dataset}. You can edit this value.`;
    elevationSource.hidden = false;
    clearValidity();
    statusElement.textContent = `Estimated terrain elevation received: ${result.elevation} m.`;
  } catch (error) {
    if (error instanceof LocationValidationError) showValidationErrors(error.errors);
    else statusElement.textContent = error.message;
  } finally {
    elevationButton.disabled = false;
  }
});

locationButton.addEventListener('click', async () => {
  locationButton.disabled = true;
  statusElement.textContent = 'Getting your location…';
  try {
    const location = await getBrowserLocation();
    latitudeInput.value = location.latitude;
    longitudeInput.value = location.longitude;
    elevationInput.value = location.elevation ?? '';
    clearValidity();
    statusElement.textContent = location.elevation === null
      ? 'Coordinates received. Elevation was not provided by the device; enter it manually before saving.'
      : 'Location received. Review and save it.';
    showMapLink(location);
  } catch (error) {
    statusElement.textContent = error.message;
  } finally {
    locationButton.disabled = false;
  }
});

renderDeviceTime();
calculationDateInput.value = formatLocalDateInput();
setInterval(() => {
  const now = new Date();
  renderDeviceTime(now);
  renderTemporalClock(now);
}, 1_000);

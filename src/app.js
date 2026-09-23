import { createGoogleMapsUrl, createLocationData, formatLocalDate, formatLocalDateInput, formatLocalDateTime, getBrowserLocation, getTerrainElevation, LocationValidationError } from './location.js';
import { calculateLocationBoundaries } from './astronomy/boundary-rule.js';
import { createCrossingDisplayModel } from './astronomy/crossing-display.js';
import { calculateLocationTemporalClock, calculateTemporalClock, formatTemporalTime } from './astronomy/temporal-clock.js';
import { createClockFaceModel, createDayHourTable, renderClockFace } from './display/clock-face.js';

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
const primaryLocationButton = document.querySelector('#location-next');
const revertLocationButton = document.querySelector('#revert-location');
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
const temporalContext = document.querySelector('#temporal-context');
const clockDisplay = document.querySelector('#clock-display');
const clockSvg = document.querySelector('#clock-face');
const clockReadout = document.querySelector('#clock-readout');
const hourTableView = document.querySelector('#hour-table-view');
const hourTableContext = document.querySelector('#hour-table-context');
const hourTableBody = document.querySelector('#hour-table-body');
const tabs = {
  location: document.querySelector('#tab-location'),
  clock: document.querySelector('#tab-clock'),
  boundary: document.querySelector('#tab-boundary'),
  temporal: document.querySelector('#tab-temporal'),
  hours: document.querySelector('#tab-hours'),
};
const views = {
  location: document.querySelector('#view-location'),
  clock: clockDisplay,
  boundary: crossingResults,
  temporal: temporalResults,
  hours: hourTableView,
};
const LOCATION_STORAGE_KEY = 'astronomical-temporal-clock.location.v1';
let temporalSchedule = null;
let temporalReferenceTime = null;
let temporalIsLive = false;
let displaySchedule = null;
let displayReferenceTime = null;
let displayIsLive = false;
let savedLocation = null;
let liveLocation = null;
let displayScheduleDate = null;

function selectTab(name) {
  if (tabs[name].disabled) return;
  for (const [tabName, tab] of Object.entries(tabs)) {
    const selected = tabName === name;
    tab.setAttribute('aria-selected', String(selected));
    tab.tabIndex = selected ? 0 : -1;
    views[tabName].hidden = !selected;
  }
}

function requestTab(name) {
  const leavingLocation = !views.location.hidden && name !== 'location';
  if (leavingLocation && savedLocation) {
    calculateFromForm(name);
    return;
  }
  selectTab(name);
}

for (const [name, tab] of Object.entries(tabs)) {
  tab.addEventListener('click', () => requestTab(name));
  tab.addEventListener('keydown', (event) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const enabledNames = Object.keys(tabs).filter((tabName) => !tabs[tabName].disabled);
    const currentIndex = enabledNames.indexOf(name);
    const targetName = event.key === 'Home'
      ? enabledNames[0]
      : event.key === 'End'
        ? enabledNames.at(-1)
        : enabledNames[(currentIndex+(event.key === 'ArrowRight' ? 1 : -1)+enabledNames.length)%enabledNames.length];
    requestTab(targetName);
    tabs[targetName].focus();
  });
}

function sameLocalDate(a, b) {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate();
}

function localDateKey(date) {
  return `${date.getFullYear()}-${date.getMonth()+1}-${date.getDate()}`;
}

function refreshLiveSchedule(now, force = false) {
  if (!liveLocation) return false;
  const dateKey = localDateKey(now);
  if (!force && displaySchedule && displayScheduleDate === dateKey) return false;
  const locationForToday = createLocationData({
    ...liveLocation,
    localDateTime: formatLocalDateInput(now),
  });
  const liveTemporal = calculateLocationTemporalClock(locationForToday, now);
  displaySchedule = liveTemporal.state === 'AVAILABLE' ? liveTemporal : null;
  displayScheduleDate = dateKey;
  tabs.clock.disabled = displaySchedule === null;
  tabs.hours.disabled = displaySchedule === null;
  return true;
}

function renderTemporalClock(now = new Date()) {
  if (temporalIsLive && displayReferenceTime && !sameLocalDate(displayReferenceTime, now)) {
    temporalIsLive = false;
    temporalReferenceTime = new Date(
      displayReferenceTime.getFullYear(),
      displayReferenceTime.getMonth(),
      displayReferenceTime.getDate(),
      12,
    );
  }
  refreshLiveSchedule(now);
  if (temporalSchedule) {
    const referenceTime = temporalIsLive ? now : temporalReferenceTime;
    const result = calculateTemporalClock({
      referenceTime,
      previous: temporalSchedule.previous,
      current: temporalSchedule.current,
      next: temporalSchedule.next,
    });
    temporalPeriod.textContent = result.period;
    temporalTime.textContent = formatTemporalTime(result);
    temporalInterval.textContent = `${formatLocalDateTime(result.periodStart)} → ${formatLocalDateTime(result.periodEnd)}`;
    temporalHourDuration.textContent = `${(result.temporalHourDurationMilliseconds/60_000).toFixed(6)} ordinary minutes`;
    temporalContext.textContent = temporalIsLive
      ? 'Live result for the current device date'
      : `Diagnostic preview for ${formatLocalDate(referenceTime)} at 12:00`;
  }
  if (!displaySchedule) {
    return;
  }
  const clockTime = displayIsLive ? now : displayReferenceTime;
  const displayResult = calculateTemporalClock({
    referenceTime: clockTime,
    previous: displaySchedule.previous,
    current: displaySchedule.current,
    next: displaySchedule.next,
  });
  const clockModel = createClockFaceModel(displaySchedule, clockTime);
  renderClockFace(clockSvg, clockModel);
  clockReadout.textContent = `${displayResult.period} ${formatTemporalTime(displayResult)}`;
  const table = createDayHourTable(displaySchedule, clockTime);
  hourTableContext.textContent = `${formatLocalDate(table.start)} · DAY ${formatLocalDateTime(table.start)} → ${formatLocalDateTime(table.end)}`;
  hourTableBody.replaceChildren(...table.rows.map((row) => {
    const tr = document.createElement('tr');
    if (row.isCurrent) tr.className = 'current-hour-row';
    const astronomical = document.createElement('th');
    astronomical.scope = 'row';
    astronomical.textContent = String(row.hour);
    const start = document.createElement('td');
    const end = document.createElement('td');
    const timeFormatter = new Intl.DateTimeFormat(undefined, {
      hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
    });
    start.textContent = timeFormatter.format(row.start);
    end.textContent = timeFormatter.format(row.end);
    tr.append(astronomical, start, end);
    return tr;
  }));
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

function saveLocation(location) {
  try {
    const stored = {
      latitude: location.latitude,
      longitude: location.longitude,
      elevation: location.elevation,
    };
    sessionStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify(stored));
    savedLocation = stored;
    return true;
  } catch {
    return false;
  }
}

function calculateFromForm(targetTab = 'clock') {
  clearValidity();
  try {
    const values = currentFormValues();
    const diagnosticLocation = createLocationData(values);
    const crossings = calculateLocationBoundaries(diagnosticLocation);
    renderCrossings(crossings);
    const now = new Date();
    temporalIsLive = sameLocalDate(diagnosticLocation.localDateTime, now);
    temporalReferenceTime = temporalIsLive
      ? now
      : new Date(diagnosticLocation.localDateTime.getFullYear(), diagnosticLocation.localDateTime.getMonth(), diagnosticLocation.localDateTime.getDate(), 12);
    const diagnosticTemporal = calculateLocationTemporalClock(diagnosticLocation, temporalReferenceTime);
    const confirmedLiveLocation = createLocationData({ ...values, localDateTime: formatLocalDateInput(now) });
    liveLocation = {
      latitude: confirmedLiveLocation.latitude,
      longitude: confirmedLiveLocation.longitude,
      elevation: confirmedLiveLocation.elevation,
    };
    displayIsLive = true;
    displayReferenceTime = now;
    const liveTemporal = calculateLocationTemporalClock(confirmedLiveLocation, now);
    displaySchedule = liveTemporal.state === 'AVAILABLE' ? liveTemporal : null;
    displayScheduleDate = localDateKey(now);
    temporalSchedule = diagnosticTemporal?.state === 'AVAILABLE' ? diagnosticTemporal : null;
    renderTemporalClock(now);
    tabs.clock.disabled = displaySchedule === null;
    tabs.boundary.disabled = false;
    tabs.temporal.disabled = temporalSchedule === null;
    tabs.hours.disabled = displaySchedule === null;
    const persisted = saveLocation(confirmedLiveLocation);
    statusElement.textContent = persisted
      ? 'Saved for this browser session.'
      : `Location confirmed for this session: ${confirmedLiveLocation.latitude}, ${confirmedLiveLocation.longitude}, ${confirmedLiveLocation.elevation} m. Browser storage was unavailable.`;
    showMapLink(confirmedLiveLocation);
    primaryLocationButton.textContent = 'Done';
    revertLocationButton.hidden = false;
    revertLocationButton.disabled = true;
    if (!tabs[targetTab].disabled) selectTab(targetTab);
    return true;
  } catch (error) {
    if (error instanceof LocationValidationError) showValidationErrors(error.errors);
    else throw error;
    return false;
  }
}

form.addEventListener('submit', (event) => {
  event.preventDefault();
  calculateFromForm();
});

function updateDraftState() {
  if (!savedLocation) return;
  const changed = latitudeInput.value !== String(savedLocation.latitude)
    || longitudeInput.value !== String(savedLocation.longitude)
    || elevationInput.value !== String(savedLocation.elevation);
  revertLocationButton.disabled = !changed;
  if (changed) statusElement.textContent = 'Unsaved changes.';
}

function updateDraftMapLink() {
  try {
    mapLink.href = createGoogleMapsUrl(currentFormValues());
    mapLink.hidden = false;
  } catch {
    mapLink.hidden = true;
  }
}

for (const input of [latitudeInput, longitudeInput, elevationInput]) {
  input.addEventListener('input', () => {
    updateDraftState();
    if (input !== elevationInput) updateDraftMapLink();
  });
}

revertLocationButton.addEventListener('click', () => {
  if (!savedLocation) return;
  latitudeInput.value = savedLocation.latitude;
  longitudeInput.value = savedLocation.longitude;
  elevationInput.value = savedLocation.elevation;
  updateDraftMapLink();
  revertLocationButton.disabled = true;
  statusElement.textContent = 'Changes reverted to the saved session location.';
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
      ? 'Coordinates received. Elevation was not provided by the device; enter it manually before continuing.'
      : 'Location received. Review it and continue.';
    showMapLink(location);
    updateDraftState();
  } catch (error) {
    statusElement.textContent = error.message;
  } finally {
    locationButton.disabled = false;
  }
});

renderDeviceTime();
calculationDateInput.value = formatLocalDateInput();
selectTab('location');
try {
  const saved = JSON.parse(sessionStorage.getItem(LOCATION_STORAGE_KEY));
  if (saved && typeof saved === 'object') {
    latitudeInput.value = saved.latitude;
    longitudeInput.value = saved.longitude;
    elevationInput.value = saved.elevation;
    calculateFromForm();
  }
} catch {
  sessionStorage.removeItem(LOCATION_STORAGE_KEY);
}
setInterval(() => {
  const now = new Date();
  renderDeviceTime(now);
  renderTemporalClock(now);
}, 1_000);

function resumeLiveClock() {
  if (!liveLocation) return;
  const now = new Date();
  refreshLiveSchedule(now, true);
  renderDeviceTime(now);
  renderTemporalClock(now);
}

window.addEventListener('pageshow', resumeLiveClock);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') resumeLiveClock();
});

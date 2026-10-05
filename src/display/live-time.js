export function quantizeToOrdinarySecond(value = new Date()) {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
    throw new TypeError('value must be a valid Date.');
  }
  return new Date(Math.floor(value.getTime()/1_000)*1_000);
}

export function millisecondsUntilNextOrdinarySecond(timestamp = Date.now()) {
  if (!Number.isFinite(timestamp)) throw new TypeError('timestamp must be finite.');
  const remainder = ((Math.trunc(timestamp)%1_000)+1_000)%1_000;
  return remainder === 0 ? 1_000 : 1_000-remainder;
}

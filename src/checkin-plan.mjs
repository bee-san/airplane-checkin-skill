const AIRLINE_ALIASES = new Map([
  ['ana', 'ana'],
  ['all nippon airways', 'ana'],
  ['nh', 'ana'],
  ['southwest', 'southwest'],
  ['southwest airlines', 'southwest'],
  ['wn', 'southwest'],
  ['delta', 'delta'],
  ['delta air lines', 'delta'],
  ['dl', 'delta'],
  ['united', 'united'],
  ['united airlines', 'united'],
  ['ua', 'united'],
  ['american', 'american'],
  ['american airlines', 'american'],
  ['aa', 'american'],
  ['alaska', 'alaska'],
  ['alaska airlines', 'alaska'],
  ['as', 'alaska'],
  ['jetblue', 'jetblue'],
  ['b6', 'jetblue'],
  ['air canada', 'air-canada'],
  ['ac', 'air-canada'],
  ['westjet', 'westjet'],
  ['ws', 'westjet'],
  ['british airways', 'british-airways'],
  ['ba', 'british-airways'],
  ['ryanair', 'ryanair'],
  ['fr', 'ryanair'],
  ['easyjet', 'easyjet'],
  ['u2', 'easyjet'],
  ['wizz air', 'wizz-air'],
  ['wizzair', 'wizz-air'],
  ['w6', 'wizz-air'],
  ['lufthansa', 'lufthansa'],
  ['lh', 'lufthansa'],
  ['jet2', 'jet2'],
  ['ls', 'jet2'],
]);

const OFFSET_TIMESTAMP = /(?:Z|[+-]\d{2}:\d{2})$/i;

export function calculateCheckinAt({
  departure,
  opensBeforeMinutes = 24 * 60,
  bufferSeconds = 5,
}) {
  const departureDate = parseOffsetTimestamp(departure, 'departure');
  requireFiniteRange(opensBeforeMinutes, 'opensBeforeMinutes', 1, 7 * 24 * 60);
  requireFiniteRange(bufferSeconds, 'bufferSeconds', 0, 5 * 60);

  return new Date(
    departureDate.getTime()
      - (opensBeforeMinutes * 60_000)
      + (bufferSeconds * 1_000),
  ).toISOString();
}

export function buildAttemptSchedule({
  opensAt,
  attempts = 3,
  intervalSeconds = 10,
}) {
  const opening = parseOffsetTimestamp(opensAt, 'opensAt');
  if (!Number.isInteger(attempts) || attempts < 1 || attempts > 10) {
    throw new Error('attempts must be between 1 and 10');
  }
  requireFiniteRange(intervalSeconds, 'intervalSeconds', 1, 5 * 60);

  return Array.from({ length: attempts }, (_, index) => (
    new Date(opening.getTime() + (index * intervalSeconds * 1_000)).toISOString()
  ));
}

export function normaliseAirline(value) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error('airline must be a non-empty string');
  }
  const normalised = value.trim().toLowerCase().replace(/[._]+/g, ' ').replace(/\s+/g, ' ');
  return AIRLINE_ALIASES.get(normalised)
    || normalised.replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export function automationLevelFor(airline) {
  return normaliseAirline(airline) === 'ana' ? 'verified-adapter' : 'guided-browser';
}

function parseOffsetTimestamp(value, fieldName) {
  if (typeof value !== 'string' || !OFFSET_TIMESTAMP.test(value)) {
    throw new Error(`${fieldName} must include an explicit UTC offset or Z suffix`);
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`${fieldName} is not a valid timestamp`);
  }
  return parsed;
}

function requireFiniteRange(value, fieldName, minimum, maximum) {
  if (!Number.isFinite(value) || value < minimum || value > maximum) {
    throw new Error(`${fieldName} must be between ${minimum} and ${maximum}`);
  }
}

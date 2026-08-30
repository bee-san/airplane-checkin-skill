import assert from 'node:assert/strict';
import test from 'node:test';

import {
  automationLevelFor,
  buildAttemptSchedule,
  calculateCheckinAt,
  normaliseAirline,
} from '../src/checkin-plan.mjs';

test('calculates a check-in time after the 24-hour window opens', () => {
  assert.equal(
    calculateCheckinAt({ departure: '2026-10-25T09:00:00+01:00' }),
    '2026-10-24T08:00:05.000Z',
  );
});

test('supports carrier-specific windows without assuming every airline uses 24 hours', () => {
  assert.equal(
    calculateCheckinAt({
      departure: '2026-09-03T18:30:00-04:00',
      opensBeforeMinutes: 48 * 60,
      bufferSeconds: 15,
    }),
    '2026-09-01T22:30:15.000Z',
  );
});

test('rejects timezone-less departure timestamps', () => {
  assert.throws(
    () => calculateCheckinAt({ departure: '2026-09-03T18:30:00' }),
    /explicit UTC offset or Z suffix/,
  );
});

test('builds a bounded retry schedule beginning after the opening time', () => {
  assert.deepEqual(
    buildAttemptSchedule({
      opensAt: '2026-09-01T22:30:05.000Z',
      attempts: 3,
      intervalSeconds: 10,
    }),
    [
      '2026-09-01T22:30:05.000Z',
      '2026-09-01T22:30:15.000Z',
      '2026-09-01T22:30:25.000Z',
    ],
  );
});

test('rejects unbounded or nonsensical retry plans', () => {
  assert.throws(
    () => buildAttemptSchedule({ opensAt: '2026-09-01T22:30:05.000Z', attempts: 0 }),
    /attempts must be between 1 and 10/,
  );
  assert.throws(
    () => buildAttemptSchedule({ opensAt: '2026-09-01T22:30:05.000Z', attempts: 11 }),
    /attempts must be between 1 and 10/,
  );
});

test('normalises common carrier names and IATA codes', () => {
  assert.equal(normaliseAirline('All Nippon Airways'), 'ana');
  assert.equal(normaliseAirline('NH'), 'ana');
  assert.equal(normaliseAirline('WN'), 'southwest');
  assert.equal(normaliseAirline('British Airways'), 'british-airways');
  assert.equal(normaliseAirline('Ryanair'), 'ryanair');
});

test('only ANA is advertised as a verified adapter', () => {
  assert.equal(automationLevelFor('ANA'), 'verified-adapter');
  assert.equal(automationLevelFor('Southwest'), 'guided-browser');
  assert.equal(automationLevelFor('Unknown Example Air'), 'guided-browser');
});

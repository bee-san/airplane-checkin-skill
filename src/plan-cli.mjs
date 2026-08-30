#!/usr/bin/env node

import {
  automationLevelFor,
  buildAttemptSchedule,
  calculateCheckinAt,
  normaliseAirline,
} from './checkin-plan.mjs';

try {
  const options = parseArguments(process.argv.slice(2));
  const airline = normaliseAirline(required(options, 'airline'));
  const departure = required(options, 'departure');
  const opensAt = calculateCheckinAt({
    departure,
    opensBeforeMinutes: numberOption(options, 'opens-before-minutes', 24 * 60),
    bufferSeconds: numberOption(options, 'buffer-seconds', 5),
  });
  const attempts = buildAttemptSchedule({
    opensAt,
    attempts: numberOption(options, 'attempts', 3),
    intervalSeconds: numberOption(options, 'interval-seconds', 10),
  });

  console.log(JSON.stringify({
    airline,
    automationLevel: automationLevelFor(airline),
    departure,
    opensAt,
    attempts,
  }, null, 2));
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}

function parseArguments(argumentsList) {
  const options = {};
  for (let index = 0; index < argumentsList.length; index += 2) {
    const flag = argumentsList[index];
    const value = argumentsList[index + 1];
    if (!flag?.startsWith('--') || value === undefined || value.startsWith('--')) {
      throw new Error(`Expected --name value arguments, received: ${flag || '(nothing)'}`);
    }
    options[flag.slice(2)] = value;
  }
  return options;
}

function required(options, name) {
  const value = options[name];
  if (!value) throw new Error(`Missing required option: --${name}`);
  return value;
}

function numberOption(options, name, fallback) {
  if (options[name] === undefined) return fallback;
  const value = Number(options[name]);
  if (!Number.isFinite(value)) throw new Error(`--${name} must be numeric`);
  return value;
}

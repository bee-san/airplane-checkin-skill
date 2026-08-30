import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const skillPath = path.join(root, 'SKILL.md');
const auditPath = path.join(root, 'references', 'source-audit.md');

function read(pathname) {
  return fs.readFileSync(pathname, 'utf8');
}

test('ships as a valid airplane-checkin Hermes skill', () => {
  const skill = read(skillPath);
  assert.match(skill, /^---\nname: airplane-checkin\n/m);
  assert.match(skill, /description: "Use when /);
  assert.match(skill, /## Safety invariants/);
  assert.match(skill, /## End-to-end workflow/);
  assert.match(skill, /## Verification checklist/);
});

test('does not overclaim universal unattended airline support', () => {
  const skill = read(skillPath);
  assert.doesNotMatch(skill, /works with any airline/i);
  assert.match(skill, /verified adapter/i);
  assert.match(skill, /guided browser/i);
});

test('requires passenger-controlled declarations and human CAPTCHA handoff', () => {
  const skill = read(skillPath);
  assert.match(skill, /passenger must personally review/i);
  assert.match(skill, /never infer or auto-answer/i);
  assert.match(skill, /CAPTCHA/i);
  assert.match(skill, /manual handoff/i);
});

test('uses durable one-shot scheduling with bounded retries and explicit verification', () => {
  const skill = read(skillPath);
  assert.match(skill, /one-shot cron/i);
  assert.match(skill, /bounded retr/i);
  assert.match(skill, /boarding pass|checked-in state/i);
});

test('documents every researched repository and its licence boundary', () => {
  const audit = read(auditPath);
  for (const repository of [
    'bee-san/ana-checkin-playwright',
    'JustinTSmith/airline-checkin-skill',
    'branch-cartesia/auto-flight-checkin',
    'jdholtz/auto-southwest-check-in',
    'pyro2927/SouthwestCheckin',
    'DavidWittman/serverless-southwest-check-in',
    'sw-tools/checkin-service',
    'byalextran/southwest-checkin',
    'TaterTechStudios/SouthwestCheckin',
  ]) {
    assert.match(audit, new RegExp(repository.replace('/', '\\/')));
  }
  assert.match(audit, /No licence detected/i);
  assert.match(audit, /No source code was copied/i);
});

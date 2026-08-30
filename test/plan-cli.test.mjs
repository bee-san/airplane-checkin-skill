import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cli = path.join(root, 'src', 'plan-cli.mjs');

test('prints a redacted multi-attempt plan for a carrier alias', () => {
  const result = spawnSync(process.execPath, [
    cli,
    '--airline', 'NH',
    '--departure', '2026-10-25T09:00:00+01:00',
    '--opens-before-minutes', '1440',
    '--buffer-seconds', '5',
    '--attempts', '3',
    '--interval-seconds', '10',
  ], { encoding: 'utf8' });

  assert.equal(result.status, 0, result.stderr);
  const plan = JSON.parse(result.stdout);
  assert.equal(plan.airline, 'ana');
  assert.equal(plan.automationLevel, 'verified-adapter');
  assert.equal(plan.opensAt, '2026-10-24T08:00:05.000Z');
  assert.deepEqual(plan.attempts, [
    '2026-10-24T08:00:05.000Z',
    '2026-10-24T08:00:15.000Z',
    '2026-10-24T08:00:25.000Z',
  ]);
  assert.deepEqual(Object.keys(plan).sort(), ['airline', 'attempts', 'automationLevel', 'departure', 'opensAt'].sort());
});

test('rejects a timestamp without an offset', () => {
  const result = spawnSync(process.execPath, [
    cli,
    '--airline', 'ANA',
    '--departure', '2026-10-25T09:00:00',
  ], { encoding: 'utf8' });

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /explicit UTC offset or Z suffix/);
});

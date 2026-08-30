import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { chromium } from 'playwright-core';
import {
  completeCheckin,
  findChrome,
  issueBoardingPass,
  searchBooking,
} from './workflow.mjs';

const ACTIONS = new Set(['status', 'checkin', 'boarding-pass']);
const env = process.env;
const action = process.argv[2] || env.ANA_ACTION || 'status';
if (!ACTIONS.has(action)) throw new Error(`Unknown action: ${action}`);

const booking = {
  reservation: required('ANA_RESERVATION_NUMBER'),
  firstName: required('ANA_FIRST_NAME'),
  lastName: required('ANA_LAST_NAME'),
};
if (!/^[A-Z0-9]{6}$/.test(booking.reservation)) {
  throw new Error('ANA_RESERVATION_NUMBER must contain exactly six uppercase letters or digits');
}

const profileDir = path.resolve(env.ANA_PROFILE_DIR || '.runtime/profile');
const artifactDir = path.resolve(env.ANA_ARTIFACT_DIR || 'artifacts');
const debugArtifacts = /^true$/i.test(env.DEBUG_ARTIFACTS || 'false');
const headless = /^true$/i.test(env.HEADLESS || 'false');
fs.mkdirSync(profileDir, { recursive: true });
fs.mkdirSync(artifactDir, { recursive: true });

const executablePath = findChrome(env);
const context = await chromium.launchPersistentContext(profileDir, {
  headless,
  executablePath,
  locale: 'en-GB',
  timezoneId: 'Asia/Tokyo',
  viewport: { width: 1440, height: 1100 },
  acceptDownloads: true,
});

try {
  const page = await context.newPage();
  page.setDefaultTimeout(60_000);
  let status = await searchBooking(page, { booking });

  if (action === 'checkin' && !status.checkedIn) {
    status = await completeCheckin(page, status, {
      declarationConfirmation: env.ANA_CONFIRM_BAGGAGE_RESTRICTIONS,
    });
  }

  let boardingPass = null;
  if (action === 'boarding-pass') {
    if (!status.checkedIn) throw new Error('The booking is not checked in. Run the checkin action first.');
    boardingPass = await issueBoardingPass(page, context, artifactDir);
  }

  if (debugArtifacts) await page.screenshot({ path: path.join(artifactDir, 'final-state.png'), fullPage: true });
  console.log(JSON.stringify({
    action,
    checkedIn: status.checkedIn,
    notCheckedIn: status.notCheckedIn,
    seatFound: status.seatFound,
    boardingPassAvailable: status.boardingPassAvailable,
    boardingPass,
    page: page.url(),
  }, null, 2));
} catch (error) {
  if (debugArtifacts) {
    const active = context.pages().at(-1);
    if (active) await active.screenshot({ path: path.join(artifactDir, 'failure.png'), fullPage: true }).catch(() => {});
  }
  throw error;
} finally {
  await context.close();
}

function required(name) {
  const value = env[name]?.trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value.toUpperCase();
}

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { chromium } from 'playwright-core';

const SEARCH_URL = 'https://aswbe.ana.co.jp/webapps/checkin/checkin-search?CONNECTION_KIND=DEU&LANG=en';
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

const executablePath = findChrome();
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
  let status = await searchBooking(page);

  if (action === 'checkin' && !status.checkedIn) {
    requireDeclarationConfirmation();
    status = await completeCheckin(page, status);
  }

  let boardingPass = null;
  if (action === 'boarding-pass') {
    if (!status.checkedIn) throw new Error('The booking is not checked in. Run the checkin action first.');
    boardingPass = await issueBoardingPass(page);
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

function findChrome() {
  const candidates = [
    env.CHROME_EXECUTABLE,
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
  ].filter(Boolean);
  const found = candidates.find(candidate => fs.existsSync(candidate));
  if (!found) throw new Error('No Chromium browser found. Set CHROME_EXECUTABLE to a Chrome or Chromium binary.');
  return found;
}

async function acceptNecessaryCookies(page) {
  const consent = page.locator('#ensSave');
  if (!await consent.isVisible().catch(() => false)) return;
  for (const id of ['#Statistics-Slide', '#Personalization-Slide']) {
    const input = page.locator(id);
    if (await input.isChecked().catch(() => false)) await input.uncheck();
  }
  await consent.click();
  await page.waitForTimeout(2_000);
}

async function searchBooking(page) {
  await page.goto(SEARCH_URL, { waitUntil: 'domcontentloaded', timeout: 90_000 });
  await page.waitForTimeout(10_000);
  const initialText = await bodyText(page);
  if (page.url().includes('system-error') || initialText.includes('could not be completed properly')) {
    throw new Error('ANA returned its generic system error. Wait before retrying instead of submitting repeatedly.');
  }

  await acceptNecessaryCookies(page);
  await page.locator('#input_checkinSearchOrderId').fill(booking.reservation);
  await page.locator('#input_checkinSearchFirstName').fill(booking.firstName);
  await page.locator('#input_checkinSearchLastName').fill(booking.lastName);
  await page.locator('button[aria-label="Search"]').click();
  await page.waitForTimeout(15_000);

  const text = await bodyText(page);
  const checkedIn = text.includes('Check-in completed') || await page.locator('#cancel-checkin-button-checkin-mybooking').isVisible().catch(() => false);
  const notCheckedIn = text.includes('Not Checked-in');
  if (!checkedIn && !notCheckedIn) throw new Error('ANA returned an unrecognised booking state.');
  return {
    checkedIn,
    notCheckedIn,
    seatFound: /\b\d{1,2}[A-K]\b/.test(text),
    boardingPassAvailable: await page.locator('#print-boarding-pass-button-checkin-mybooking').isEnabled().catch(() => false),
  };
}

function requireDeclarationConfirmation() {
  if (env.ANA_CONFIRM_BAGGAGE_RESTRICTIONS !== 'YES') {
    throw new Error('Check-in refused. The passenger must personally review ANA restrictions, then set ANA_CONFIRM_BAGGAGE_RESTRICTIONS=YES.');
  }
}

async function completeCheckin(page, status) {
  if (!status.notCheckedIn) throw new Error('Expected a Not Checked-in booking state.');
  await page.getByRole('button', { name: 'Online Check-in', exact: true }).click();
  await page.waitForTimeout(12_000);
  if (!page.url().includes('checkin-review')) throw new Error('ANA did not reach the check-in review page.');

  await page.locator('#button_throttle_online_checkin').click();
  const declaration = page.locator('#checkbox_consent-confirmation-checkbox');
  await declaration.waitFor({ state: 'visible' });
  const text = await bodyText(page);
  if (!text.includes('The check-in or carry-on of restricted goods is prohibited by law')) {
    throw new Error('The expected ANA baggage declaration text was not found.');
  }

  if (!await declaration.isChecked()) {
    await page.locator('label[for="checkbox_consent-confirmation-checkbox"]').click();
  }
  if (!await declaration.isChecked()) throw new Error('The baggage declaration checkbox did not remain checked.');
  const next = page.getByRole('button', { name: 'Next', exact: true });
  if (await next.isDisabled()) throw new Error('ANA Next button remained disabled after confirmation.');
  await next.click();

  await page.waitForTimeout(75_000);
  const completionText = await bodyText(page);
  const checkedIn = completionText.includes('Check-in completed') || await page.locator('#cancel-checkin-button-checkin-mybooking').isVisible().catch(() => false);
  if (!checkedIn) {
    throw new Error('Check-in was submitted, but ANA did not expose a verified completed state. Rerun status after a short wait.');
  }
  return {
    checkedIn: true,
    notCheckedIn: false,
    seatFound: /\b\d{1,2}[A-K]\b/.test(completionText),
    boardingPassAvailable: await page.locator('#print-boarding-pass-button-checkin-mybooking').isEnabled().catch(() => false),
  };
}

async function issueBoardingPass(page) {
  const issue = page.locator('#print-boarding-pass-button-checkin-mybooking');
  await issue.waitFor({ state: 'visible' });
  if (await issue.isDisabled()) throw new Error('ANA boarding-pass action is disabled.');
  await issue.click();

  const pdfOption = page.locator('#icon-button-component-hpbp-modal-button');
  await pdfOption.waitFor({ state: 'visible' });
  const popupPromise = context.waitForEvent('page', { timeout: 30_000 }).catch(() => null);
  await pdfOption.click();
  const popup = await popupPromise;
  if (!popup) throw new Error('ANA did not open the boarding-pass window.');
  await popup.waitForLoadState('domcontentloaded', { timeout: 60_000 });
  await popup.waitForTimeout(5_000);

  const output = path.join(artifactDir, 'boarding-pass.pdf');
  const cdp = await context.newCDPSession(popup);
  const result = await cdp.send('Page.printToPDF', { printBackground: true, preferCSSPageSize: true });
  fs.writeFileSync(output, Buffer.from(result.data, 'base64'), { mode: 0o600 });
  if (fs.statSync(output).size < 1_000) throw new Error('Generated boarding-pass PDF is unexpectedly small.');
  return { saved: true, path: output };
}

async function bodyText(page) {
  return (await page.locator('body').innerText()).replace(/\s+/g, ' ');
}

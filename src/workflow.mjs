import fs from 'node:fs';
import path from 'node:path';

export const SEARCH_URL = 'https://aswbe.ana.co.jp/webapps/checkin/checkin-search?CONNECTION_KIND=DEU&LANG=en';

export const DEFAULT_TIMINGS = Object.freeze({
  initialMs: 10_000,
  cookieMs: 2_000,
  searchMs: 15_000,
  reviewMs: 12_000,
  completionMs: 75_000,
  popupMs: 5_000,
});

function timingsWith(overrides = {}) {
  return { ...DEFAULT_TIMINGS, ...overrides };
}

async function pause(page, milliseconds) {
  if (milliseconds > 0) await page.waitForTimeout(milliseconds);
}

async function isEnabledIfPresent(locator) {
  if (await locator.count() === 0) return false;
  return locator.isEnabled().catch(() => false);
}

export function findChrome(environment = process.env) {
  const candidates = [
    environment.CHROME_EXECUTABLE,
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

export async function acceptNecessaryCookies(page, options = {}) {
  const timings = timingsWith(options.timings);
  const consent = page.locator('#ensSave');
  if (!await consent.isVisible().catch(() => false)) return;
  for (const id of ['#Statistics-Slide', '#Personalization-Slide']) {
    const input = page.locator(id);
    if (await input.isChecked().catch(() => false)) await input.uncheck();
  }
  await consent.click();
  await pause(page, timings.cookieMs);
}

export async function detectBookingStatus(page) {
  const text = await bodyText(page);
  const checkedIn = text.includes('Check-in completed')
    || await page.locator('#cancel-checkin-button-checkin-mybooking').isVisible().catch(() => false);
  const notCheckedIn = text.includes('Not Checked-in');
  if (!checkedIn && !notCheckedIn) throw new Error('ANA returned an unrecognised booking state.');
  return {
    checkedIn,
    notCheckedIn,
    seatFound: /\b\d{1,2}[A-K]\b/.test(text),
    boardingPassAvailable: await isEnabledIfPresent(page.locator('#print-boarding-pass-button-checkin-mybooking')),
  };
}

export async function searchBooking(page, options) {
  const { booking, searchUrl = SEARCH_URL } = options;
  const timings = timingsWith(options.timings);
  await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 90_000 });
  await pause(page, timings.initialMs);
  const initialText = await bodyText(page);
  if (page.url().includes('system-error') || initialText.includes('could not be completed properly')) {
    throw new Error('ANA returned its generic system error. Wait before retrying instead of submitting repeatedly.');
  }

  await acceptNecessaryCookies(page, { timings });
  await page.locator('#input_checkinSearchOrderId').fill(booking.reservation);
  await page.locator('#input_checkinSearchFirstName').fill(booking.firstName);
  await page.locator('#input_checkinSearchLastName').fill(booking.lastName);
  await page.locator('button[aria-label="Search"]').click();
  await pause(page, timings.searchMs);
  return detectBookingStatus(page);
}

export function requireDeclarationConfirmation(environment = process.env) {
  if (environment.ANA_CONFIRM_BAGGAGE_RESTRICTIONS !== 'YES') {
    throw new Error('Check-in refused. The passenger must personally review ANA restrictions, then set ANA_CONFIRM_BAGGAGE_RESTRICTIONS=YES.');
  }
}

export async function completeCheckin(page, status, options = {}) {
  requireDeclarationConfirmation({
    ANA_CONFIRM_BAGGAGE_RESTRICTIONS: options.declarationConfirmation,
  });
  const timings = timingsWith(options.timings);
  if (!status.notCheckedIn) throw new Error('Expected a Not Checked-in booking state.');
  await page.getByRole('button', { name: 'Online Check-in', exact: true }).click();
  await pause(page, timings.reviewMs);
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

  await pause(page, timings.completionMs);
  const completionText = await bodyText(page);
  const checkedIn = completionText.includes('Check-in completed')
    || await page.locator('#cancel-checkin-button-checkin-mybooking').isVisible().catch(() => false);
  if (!checkedIn) {
    throw new Error('Check-in was submitted, but ANA did not expose a verified completed state. Rerun status after a short wait.');
  }
  return {
    checkedIn: true,
    notCheckedIn: false,
    seatFound: /\b\d{1,2}[A-K]\b/.test(completionText),
    boardingPassAvailable: await isEnabledIfPresent(page.locator('#print-boarding-pass-button-checkin-mybooking')),
  };
}

export async function issueBoardingPass(page, context, artifactDir, options = {}) {
  const timings = timingsWith(options.timings);
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
  await pause(popup, timings.popupMs);

  const output = path.join(artifactDir, 'boarding-pass.pdf');
  const cdp = await context.newCDPSession(popup);
  const result = await cdp.send('Page.printToPDF', { printBackground: true, preferCSSPageSize: true });
  fs.writeFileSync(output, Buffer.from(result.data, 'base64'), { mode: 0o600 });
  if (fs.statSync(output).size < 1_000) throw new Error('Generated boarding-pass PDF is unexpectedly small.');
  return { saved: true, path: output };
}

export async function bodyText(page) {
  return (await page.locator('body').innerText()).replace(/\s+/g, ' ');
}

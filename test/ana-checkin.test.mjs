import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { after, afterEach, before, beforeEach, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import {
  completeCheckin,
  findChrome,
  requireDeclarationConfirmation,
  searchBooking,
} from '../src/workflow.mjs';

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE_DIR = path.join(TEST_DIR, 'fixtures');
const SYNTHETIC_BOOKING = {
  reservation: 'ABC123',
  firstName: 'SYNTHETIC',
  lastName: 'TRAVELLER',
};
const FAST_TIMINGS = {
  initialMs: 0,
  cookieMs: 0,
  searchMs: 0,
  reviewMs: 0,
  completionMs: 0,
  popupMs: 0,
};
const DECLARATION_TEXT = 'The check-in or carry-on of restricted goods is prohibited by law.';

let browser;
let context;
let origin;
let page;
let server;
let blockedExternalUrls = [];
let requestedPaths = [];

function fixture(name) {
  return fs.readFileSync(path.join(FIXTURE_DIR, name), 'utf8');
}

function htmlResponse(response, body) {
  response.writeHead(200, {
    'cache-control': 'no-store',
    'content-type': 'text/html; charset=utf-8',
  });
  response.end(body);
}

before(async () => {
  server = http.createServer((request, response) => {
    const url = new URL(request.url, 'http://127.0.0.1');
    if (url.pathname === '/favicon.ico') {
      response.writeHead(204);
      response.end();
      return;
    }
    const scenario = url.searchParams.get('scenario') || 'not-checked-in';
    requestedPaths.push(url.pathname);

    if (url.pathname === '/webapps/checkin/checkin-search') {
      if (scenario === 'system-error') {
        htmlResponse(response, '<!doctype html><title>System error</title><p>The operation could not be completed properly.</p>');
        return;
      }
      htmlResponse(response, fixture('checkin-search.html'));
      return;
    }

    if (url.pathname === '/webapps/checkin/checkin-select') {
      if (scenario === 'checked-in') {
        htmlResponse(response, fixture('checkin-completed.html'));
        return;
      }
      if (scenario === 'unknown') {
        htmlResponse(response, fixture('checkin-unknown.html'));
        return;
      }
      htmlResponse(response, fixture('checkin-select.html'));
      return;
    }

    if (url.pathname === '/webapps/checkin/checkin-review') {
      const declaration = scenario === 'missing-declaration'
        ? 'Consult the current airline baggage information before continuing.'
        : DECLARATION_TEXT;
      htmlResponse(response, fixture('checkin-review.html').replace('{{DECLARATION_TEXT}}', declaration));
      return;
    }

    if (url.pathname === '/webapps/checkin/checkin-completed') {
      htmlResponse(response, fixture(
        scenario === 'ambiguous-result' ? 'checkin-ambiguous-result.html' : 'checkin-completed.html',
      ));
      return;
    }

    response.writeHead(404);
    response.end('Not found');
  });

  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  origin = `http://127.0.0.1:${address.port}`;
  browser = await chromium.launch({ executablePath: findChrome(), headless: true });
});

after(async () => {
  await browser?.close();
  await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
});

beforeEach(async () => {
  blockedExternalUrls = [];
  requestedPaths = [];
  context = await browser.newContext({ locale: 'en-GB' });
  await context.route(/https?:\/\//, async route => {
    const requestUrl = route.request().url();
    if (new URL(requestUrl).origin === origin) {
      await route.continue();
      return;
    }
    blockedExternalUrls.push(requestUrl);
    await route.abort('blockedbyclient');
  });
  page = await context.newPage();
  page.setDefaultTimeout(10_000);
});

afterEach(async () => {
  await context.close();
  assert.deepEqual(blockedExternalUrls, [], 'Synthetic tests attempted an external network request');
});

function searchUrl(scenario = 'not-checked-in') {
  return `${origin}/webapps/checkin/checkin-search?scenario=${scenario}`;
}

function search(scenario = 'not-checked-in') {
  return searchBooking(page, {
    booking: SYNTHETIC_BOOKING,
    searchUrl: searchUrl(scenario),
    timings: FAST_TIMINGS,
  });
}

test('the passenger declaration guard accepts only the exact YES token', () => {
  assert.throws(
    () => requireDeclarationConfirmation({ ANA_CONFIRM_BAGGAGE_RESTRICTIONS: 'yes' }),
    /passenger must personally review ANA restrictions/,
  );
  assert.doesNotThrow(() => requireDeclarationConfirmation({ ANA_CONFIRM_BAGGAGE_RESTRICTIONS: 'YES' }));
});

test('status detects a synthetic Not Checked-in booking without entering the mutation flow', async () => {
  const status = await search();

  assert.deepEqual(status, {
    checkedIn: false,
    notCheckedIn: true,
    seatFound: true,
    boardingPassAvailable: false,
  });
  assert.deepEqual(
    JSON.parse(await page.evaluate(() => sessionStorage.getItem('fixture-cookie-selection'))),
    { statistics: false, personalisation: false },
  );
  assert.deepEqual(requestedPaths, [
    '/webapps/checkin/checkin-search',
    '/webapps/checkin/checkin-select',
  ]);
});

test('status recognises the checked-in page contract and enabled boarding-pass action', async () => {
  const status = await search('checked-in');

  assert.equal(status.checkedIn, true);
  assert.equal(status.notCheckedIn, false);
  assert.equal(status.seatFound, true);
  assert.equal(status.boardingPassAvailable, true);
  assert.ok(!requestedPaths.includes('/webapps/checkin/checkin-review'));
});

test('completeCheckin refuses before the review page when explicit confirmation is absent', async () => {
  const status = await search();

  await assert.rejects(
    completeCheckin(page, status, { timings: FAST_TIMINGS }),
    /passenger must personally review ANA restrictions/,
  );
  assert.ok(!requestedPaths.includes('/webapps/checkin/checkin-review'));
});

test('confirmed check-in follows the synthetic review, declaration, and completion pages', async () => {
  const status = await search();
  const completed = await completeCheckin(page, status, {
    declarationConfirmation: 'YES',
    timings: FAST_TIMINGS,
  });

  assert.deepEqual(completed, {
    checkedIn: true,
    notCheckedIn: false,
    seatFound: true,
    boardingPassAvailable: true,
  });
  assert.equal(await page.evaluate(() => sessionStorage.getItem('fixture-declaration-checked')), 'true');
  assert.equal(new URL(page.url()).pathname, '/webapps/checkin/checkin-completed');
  assert.ok(requestedPaths.includes('/webapps/checkin/checkin-review'));
  assert.ok(requestedPaths.includes('/webapps/checkin/checkin-completed'));
});

test('check-in fails closed when the expected restricted-goods declaration is absent', async () => {
  const status = await search('missing-declaration');

  await assert.rejects(
    completeCheckin(page, status, { declarationConfirmation: 'YES', timings: FAST_TIMINGS }),
    /expected ANA baggage declaration text was not found/,
  );
  assert.ok(!requestedPaths.includes('/webapps/checkin/checkin-completed'));
});

test('check-in fails closed when Next stays disabled after the declaration is checked', async () => {
  const status = await search('stuck-next');

  await assert.rejects(
    completeCheckin(page, status, { declarationConfirmation: 'YES', timings: FAST_TIMINGS }),
    /Next button remained disabled/,
  );
  assert.equal(await page.evaluate(() => sessionStorage.getItem('fixture-declaration-checked')), 'true');
  assert.ok(!requestedPaths.includes('/webapps/checkin/checkin-completed'));
});

test('a submitted but ambiguous result is reported as unverified and is not retried', async () => {
  const status = await search('ambiguous-result');

  await assert.rejects(
    completeCheckin(page, status, { declarationConfirmation: 'YES', timings: FAST_TIMINGS }),
    /did not expose a verified completed state/,
  );
  assert.equal(
    requestedPaths.filter(pathname => pathname === '/webapps/checkin/checkin-completed').length,
    1,
  );
});

test('status rejects an unrecognised booking state instead of guessing', async () => {
  await assert.rejects(search('unknown'), /unrecognised booking state/);
  assert.ok(!requestedPaths.includes('/webapps/checkin/checkin-review'));
});

test('status reports ANA generic system errors as retry-later failures', async () => {
  await assert.rejects(search('system-error'), /Wait before retrying instead of submitting repeatedly/);
  assert.deepEqual(requestedPaths, ['/webapps/checkin/checkin-search']);
});

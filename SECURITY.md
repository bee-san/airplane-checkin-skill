# Security Policy

## Protect booking and identity data

Never commit any of the following:

- reservation locators or e-ticket numbers;
- passenger names tied to a real booking;
- passport numbers, dates of birth, expiry dates, MRZ data, or document images;
- account passwords, passkeys, OTPs, recovery codes, or authentication exports;
- browser profiles, cookies, local storage, or session storage;
- boarding-pass PDFs, screenshots, wallet passes, or QR/barcode data;
- email addresses, telephone numbers, or local absolute paths;
- API tokens, private mobile API headers, or undocumented airline keys.

The repository ignores `.env`, browser runtime state, artifacts, screenshots, PDFs, and wallet passes. Run `npm run secret-scan` before every public push and inspect the staged diff manually.

For scheduled work, put sensitive booking details in an opaque local record under a mode-`0700` directory with a mode-`0600` file. Do not include them in cron prompts, job names, logs, or notifications.

## Legal and factual declarations

Dangerous-goods, hazardous-material, baggage, health, immigration, and other factual declarations belong to the passenger. Automation must stop until the passenger personally reviews the airline's current text and confirms it. An agent must never infer, guess, or auto-answer a declaration.

The ANA adapter refuses check-in unless `ANA_CONFIRM_BAGGAGE_RESTRICTIONS=YES` is set after that personal review. This flag records the passenger's confirmation; it does not transfer responsibility to the automation.

## Bot and access controls

Do not bypass CAPTCHA, device verification, anti-bot systems, rate limits, or airline access controls. Do not add stealth plugins, webdriver suppression, harvested headers, reverse-engineered private API keys, or parallel request races. Use the current official site and hand human-verification steps to the user.

## Payment boundary

The skill must stop before paid seats, baggage, upgrades, insurance, donations, or currency choices unless the user explicitly authorises the exact charge. Never infer purchase approval from a seat preference.

## Reporting a vulnerability

Use GitHub private vulnerability reporting for code vulnerabilities. Do not include real bookings, travel documents, screenshots, browser state, or boarding-pass data in public issues.

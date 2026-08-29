# Security Policy

## Protect booking and identity data

Never commit any of the following:

- reservation locators or e-ticket numbers;
- passenger names tied to a real booking;
- passport numbers, dates of birth, expiry dates, MRZ data or document images;
- browser profiles, cookies, local storage or session storage;
- boarding-pass PDFs, screenshots, wallet passes or QR/barcode data;
- email addresses, telephone numbers or local absolute paths;
- API tokens, passwords or authentication exports.

The repository ignores `.env`, `.runtime`, `artifacts`, screenshots, PDFs and wallet passes. Run `npm run secret-scan` before every public push.

## Legal and factual declarations

Dangerous-goods and baggage declarations are personal factual attestations. The script refuses to check in unless `ANA_CONFIRM_BAGGAGE_RESTRICTIONS=YES` is set after the passenger personally reviews and confirms the restriction.

## Reporting a vulnerability

Open a GitHub security advisory for code vulnerabilities. Do not include real booking details or travel documents in public issues.

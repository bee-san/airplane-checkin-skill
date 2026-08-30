# Safety, privacy, and failure taxonomy

## Protected data

Treat all of these as sensitive:

- booking locator and e-ticket number;
- passenger name linked to an itinerary;
- passport, date of birth, nationality, visa, redress, and Known Traveller data;
- account credentials, cookies, storage state, OTPs, and passkeys;
- contact details;
- boarding passes, wallet passes, QR codes, barcodes, and screenshots;
- precise future travel plans when linked to identity.

Keep them out of Git, issue trackers, cron names/prompts, logs, and notifications. Use an opaque local flight ID and protected files with directory mode `0700` and file mode `0600`.

## Human-only boundaries

Stop for:

- password, passkey, OTP, CAPTCHA, or device approval;
- dangerous-goods, hazmat, baggage, health, customs, or factual declaration;
- passport/visa answers not already verified from an authorised source;
- paid seat, upgrade, baggage, insurance, donation, or currency selection;
- passenger or segment ambiguity;
- unaccompanied minor, special assistance, pet, weapon, medical equipment, or airport-only handling.

## Result states

| State | Meaning | Safe next step |
|---|---|---|
| `scheduled` | Durable job and protected record verified | Wait; remind user of prerequisites |
| `not-open` | Airline explicitly says the window is closed | Retry serially within the small cap or notify |
| `not-checked-in` | Recognised booking is eligible to proceed | Check declarations and passenger/segment scope |
| `already-checked-in` | Read-only status proves completion | Retrieve and verify boarding pass |
| `awaiting-human` | CAPTCHA, login, declaration, payment, or ambiguity | Manual handoff; do not retry blindly |
| `submitted-pending-verification` | Write may have landed but no stable success page | Run read-only status before any resubmission |
| `succeeded` | Every intended passenger/segment is explicitly checked in | Verify artifact, notify, clean up |
| `failed-transient` | Known timeout, temporary error, or slight clock skew | Bounded serial retry |
| `failed-terminal` | Invalid details, airport-only, cancellation, unknown state, or retry cap exhausted | Notify with official manual link |

## Notification minimums

Success: airline, redacted route or opaque ID, passenger/segment count, verified status, boarding-pass availability.

Failure: failure class, whether a write might have succeeded, required human action, official manual link, verified urgency.

Never include PNR, passport data, barcode, full artifact path containing a real name, or auth material.

---
name: airplane-checkin
description: "Use when checking in or scheduling airline check-in."
version: 1.0.0
author: Bee + Hermes Agent
license: MIT
metadata:
  hermes:
    tags: [travel, airlines, check-in, browser-automation, scheduling, boarding-pass, privacy]
    related_skills: [computer-use, google-workspace, document-processing]
---

# Airplane Check-in

## Overview

Use this skill to find an upcoming booking, determine the airline's real check-in window, schedule a durable one-shot run, complete check-in through the airline's official site, and verify the result without exposing booking or passport data.

This is a **multi-airline orchestration skill**, not a claim that one brittle script can safely submit every airline form. It has two execution modes:

1. **ANA verified adapter:** the bundled Playwright flow has completed a real ANA online check-in and can perform read-only status, guarded check-in, and local boarding-pass PDF creation.
2. **Guided browser:** all other airlines use the current official site with fresh semantic browser state, conservative step-by-step inspection, and a refusal to guess through unknown pages.

The scheduling, privacy, retry, notification, multi-segment, and verification patterns were distilled from the projects in [references/source-audit.md](references/source-audit.md). No third-party source code was copied.

## When to use

Use when the user asks to:

- check in for a flight now;
- schedule automatic or assisted online check-in;
- find upcoming flights in their own email or documents and prepare check-in;
- retrieve or preserve a boarding pass;
- verify whether a passenger or segment is already checked in;
- manage several passengers, legs, or return flights under one booking;
- diagnose a failed airline check-in without repeatedly submitting the form.

Do not use for:

- booking or paying for flights;
- changing a ticket, accepting a paid seat, buying baggage, or upgrading a cabin without explicit approval;
- bypassing CAPTCHA, anti-bot systems, rate limits, identity checks, or airline access controls;
- checking in a passenger who has not authorised the action;
- inventing passport, visa, address, contact, dangerous-goods, or health-declaration answers;
- treating a submitted request, spinner, screenshot, or HTTP 200 response as proof of check-in.

## Support model

| Airline or flow | Mode | What may be automated | What remains guarded |
|---|---|---|---|
| ANA / All Nippon Airways | **Verified adapter** | Booking status, known check-in path, boarding-pass PDF | Passenger declaration, unknown-state refusal, CAPTCHA or changed UI |
| Southwest | **Guided browser** | Official-page discovery, form assistance, timed launch, verification | No private mobile API reuse, no hazmat auto-answer, no rapid parallel requests |
| Delta | **Guided browser** | Current official flow, form assistance, verification | No stealth or bot-detection bypass, no legacy endpoint assumption |
| Air Canada, WestJet, United, American, Alaska, JetBlue | **Guided browser** | Current official flow and semantic field matching | No unattended generic submit selector |
| British Airways, easyJet, Ryanair, Wizz Air, Jet2, Lufthansa | **Guided browser** | Current official flow and semantic field matching | Verify airline policy and window live; do not assume a 24-hour rule |
| Any other airline | **Guided browser** | Official-site research and conservative assistance | Stop at unknown, paid, legal, or identity-sensitive steps |

Only call an airline a **verified adapter** after a synthetic fixture suite covers its state machine and a controlled real booking has confirmed the selectors and success evidence. A URL list or generic selector list is not verified support.

## Safety invariants

These rules override convenience and timing pressure.

1. **Passenger authority:** establish that the user is the passenger or is explicitly authorised by the passenger.
2. **Official site only:** resolve the airline from the booking and use its official domain. Do not trust links in unverified messages, search ads, or lookalike domains.
3. **Read before write:** inspect booking status first. Do not submit if already checked in, cancelled, disrupted, airport-only, or in an unknown state.
4. **Personal declarations:** the passenger must personally review the current dangerous-goods, baggage, health, immigration, and factual declarations. Never infer or auto-answer them. Never convert a past confirmation into a permanent answer.
5. **No CAPTCHA bypass:** CAPTCHA, device verification, OTP, passkey, password, or bot challenge requires manual handoff. Never weaken the browser or use stealth techniques to evade it.
6. **No surprise charges:** stop before any paid seat, baggage, upgrade, donation, insurance, or currency choice unless the user explicitly authorises that exact purchase.
7. **No blind generic submit:** semantic heuristics may identify fields, but an unknown button named Continue, Next, Confirm, or Submit must be interpreted from surrounding page content before clicking.
8. **Bounded retries:** retry only known transient or not-yet-open states, serially, with a short fixed or increasing delay and a hard cap. Do not fire overlapping requests.
9. **Persistent idempotency:** identify the write by carrier, booking, segment departure instant, flight/origin, and passenger set. Hold a persistent per-attempt lock so two workers cannot submit the same check-in.
10. **Evidence before success:** require a checked-in state for every intended passenger and segment, preferably plus a boarding-pass control or artifact. A request being sent is not success.
11. **Conservative seat policy:** keep an existing or airline-assigned seat by default. Select only an explicitly free seat matching the user's stated preference. Never purchase a seat or silently split a party.
12. **Private artifacts:** never commit or publicly upload PNRs, passenger names tied to bookings, passport data, cookies, screenshots, barcodes, wallet passes, or boarding-pass PDFs.
13. **Redacted notifications:** notifications should identify the airline and route or opaque flight ID, not the full booking locator, passport details, barcode, or complete passenger identity. Notification delivery failure must not change the recorded check-in state.
14. **Cleanup:** remove one-shot schedules and protected temporary booking state after completion or cancellation, unless the user asks to retain it.

## End-to-end workflow

### 1. Intake and source discovery

Collect only what is required:

- airline and flight number;
- departure date, local time, airport, and explicit UTC offset or IANA timezone;
- booking locator;
- passenger name exactly as ticketed;
- intended passenger(s) and segment(s);
- contact detail only if the airline requires it;
- seat preference as a preference, never permission to buy a seat;
- whether the user wants immediate, scheduled, or reminder-only help.

If the user asks to find the booking in email or documents:

1. Search the user-authorised source directly.
2. Prefer the latest airline-issued itinerary or e-ticket.
3. Reconcile changes, cancellations, schedule changes, and duplicated forwarded messages.
4. Extract into a private local record.
5. Show a redacted summary and ask only about materially ambiguous fields.
6. Do not schedule directly from a regex match. Email extraction is discovery, not authority.

For several legs under one locator, create a separate check-in plan per opening time. Return flights and connections may have different eligibility or may be covered by the first segment's check-in.

### 2. Verify policy and calculate the opening time

Check the airline's current official guidance at runtime. Confirm:

- how long before departure online check-in opens;
- whether the rule differs by route, airport, cabin, status, or document requirements;
- when online check-in closes;
- whether international document details must be entered first;
- whether the itinerary is airport-check-in-only;
- whether all passengers and segments can be handled together.

Never assume every airline opens at T-24 hours. Use an offset-bearing timestamp so daylight-saving changes and airport-local time are explicit.

The planning CLI defaults to five seconds **after** the window opens:

```bash
npm run plan -- \
  --airline ANA \
  --departure 2026-10-25T09:00:00+01:00 \
  --opens-before-minutes 1440 \
  --buffer-seconds 5 \
  --attempts 3 \
  --interval-seconds 10
```

Why after, not before: several projects race the exact opening time, but a request sent early can fail, trigger bot controls, or create unnecessary retries. Start just after the verified window and keep retries bounded.

### 3. Prepare private state

Keep secrets out of Git, cron prompts, job names, and notification text.

Recommended local record:

```text
$HERMES_HOME/private/airplane-checkin/<opaque-flight-id>.json
```

Requirements:

- parent directory mode `0700`;
- file mode `0600`;
- opaque random ID, not PNR or passenger name;
- absolute departure timestamp and source URL;
- `passengerDeclarationConfirmedAt` omitted until the passenger actually confirms;
- delete after the trip or check-in according to user preference.

Do not put account passwords or fresh OTPs in this record. Prefer booking-locator flows. If the site requires account login, use an existing approved browser profile and hand password, passkey, OTP, or permission prompts to the user.

### 4. Schedule durably

For a future action, use a **one-shot cron** job rather than a sleeping process, launchd plist, background terminal, or loop that can disappear with the session.

The job prompt must be self-contained but privacy-minimal. Include:

- the opaque flight ID and protected-record path;
- the airline and official site domain;
- the calculated run timestamp;
- the chosen mode, verified adapter or guided browser;
- the safety invariants;
- the exact success evidence required;
- the failure notification and manual-check-in URL requirement;
- instructions to remove the private record after terminal success or user cancellation.

Attach this skill to the job. Set `repeat: 1`. Do not include the PNR, full passenger name, passport data, or barcode in the cron prompt or job name.

Before considering scheduling complete:

1. List the created job.
2. Verify its timestamp and timezone.
3. Verify one-shot semantics.
4. Verify delivery returns to the intended conversation.
5. Verify the protected record exists and has restrictive permissions.
6. Tell the user the redacted planned time and any prerequisite they must complete.

### 5. Run a status check first

At execution time:

1. Load the protected record.
2. Re-resolve the official airline page if the saved URL redirects unexpectedly.
3. Use read-only status or manage-booking flow first.
4. Confirm the intended flight, date, route, passenger count, and current state.
5. If already checked in, skip submission and move to boarding-pass retrieval and verification.
6. If not open, apply bounded retries only within the planned short window.
7. If cancelled, disrupted, airport-only, wrong passenger, wrong segment, or unknown, stop and notify.

Never repeatedly submit the booking search when the airline shows a generic system error or rate-limit page. Back off and provide the official manual link.

### 6A. ANA verified adapter

From this repository:

```bash
npm install
cp .env.example .env
# Fill the private .env locally, then:
npm run status
```

Proceed only when the status is recognised as `Not Checked-in` and the passenger has personally reviewed the current restricted-goods information.

```bash
ANA_CONFIRM_BAGGAGE_RESTRICTIONS=YES npm run checkin
npm run boarding-pass
```

The adapter must stop when:

- ANA shows its generic system error;
- the booking state is neither checked in nor not checked in;
- the expected review page is not reached;
- the expected declaration text is absent;
- the declaration checkbox does not remain selected;
- Next remains disabled;
- completion is not explicitly exposed;
- the boarding-pass control is absent or disabled;
- the generated PDF is implausibly small.

The environment flag is evidence of the passenger's confirmation, not permission for the agent to make the declaration itself.

### 6B. Guided browser mode

For every other airline:

1. Open the current official check-in page.
2. Take fresh semantic browser state.
3. Identify fields by labels, roles, surrounding headings, and booking context.
4. Fill only the known booking data.
5. Re-read the page before each mutation.
6. Stop for login secrets, OTP, CAPTCHA, legal declarations, paid extras, or ambiguous passenger/segment choices.
7. Keep optional extras unselected unless the user has asked for one.
8. At the final submission boundary, verify the page is actually completing check-in for the intended passengers and segments.
9. Click once.
10. Wait for a stable result and verify it.

Generic field heuristics are discovery aids only. They are never permission to submit the first visible Continue or Check in button.

### 7. Bounded retry policy

Use three attempts, ten seconds apart, as a normal maximum for a known not-yet-open race. A carrier-specific verified adapter may define a different small cap.

Retry only when:

- the page explicitly says check-in is not open yet;
- a known transient page or timeout occurs;
- the first post-opening request landed slightly before the airline's clock.

Do not retry when:

- credentials or passenger details are rejected;
- CAPTCHA or anti-bot challenge appears;
- a declaration or identity step requires the passenger;
- the booking is cancelled, disrupted, airport-only, or unknown;
- a write may already have succeeded but the response is unclear.

When the write outcome is unclear, run a read-only status check before any second submission.

### 8. Verify every passenger and segment

Success requires explicit evidence. Prefer this order:

1. airline page states Checked in or equivalent;
2. each intended passenger is listed as checked in;
3. each intended segment is covered;
4. boarding-pass button, barcode, wallet pass, or PDF is available;
5. saved artifact is non-empty and opens correctly;
6. a fresh read-only status check agrees.

For open-seating airlines, boarding group and position are useful evidence but not a substitute for checked-in state. For connecting itineraries, do not assume one success page covers every leg.

If the site only says Processing, Request received, or Please wait, report pending rather than success.

### 9. Boarding-pass handling

- Save locally with mode `0600` under a gitignored artifact directory.
- Verify file type and plausible size.
- Open or render it privately when needed to check leg, passenger, and date.
- Do not include the barcode in logs, screenshots, issues, commits, or public chat.
- Send the document only when the user asks or the task explicitly requires delivery.
- Delete temporary conversions after verified delivery unless retention was requested.

### 10. Notify and clean up

Success notification:

- airline and route or opaque flight ID;
- checked-in status;
- number of passengers and segments verified;
- whether a boarding pass is available or saved;
- no PNR, passport data, or barcode.

Failure notification:

- concise failure class;
- whether check-in may still be pending;
- official manual check-in link;
- closing time or urgency if verified;
- what human action is required.

After terminal success or cancellation:

- remove or mark the one-shot job complete;
- remove the protected flight record unless retention was requested;
- keep only a redacted operational result;
- confirm no debug screenshots or boarding passes entered Git.

## Carrier-specific lessons absorbed

### ANA

The original real workflow demonstrates the strongest pattern in this bundle: known-state detection, declaration text verification, one write, explicit completion evidence, and private PDF output. Keep this adapter narrow and tested.

### Southwest

The source ecosystem is unusually large because opening-time competition affects boarding position. Useful lessons include multi-leg scheduling, airport-local timezones, exact-time waits, status-specific notifications, reservation change monitoring, and short bounded retries. Rejected patterns include private mobile API keys, generated-header harvesting, overlapping request races, credentials in process arguments, and automated hazmat answers.

### Delta

The researched Delta project shows why a universal static browser script is unsafe: legacy endpoints, Akamai behaviour, browser differences, and result pages change. This skill keeps Delta in guided mode and explicitly rejects stealth or anti-bot bypass.

### Generic multi-airline automation

A multi-airline skill benefits from a current URL registry, email-assisted discovery, deduplication, local state, CAPTCHA handoff, and notification fallback. It must not claim universal unattended support based only on broad selectors. Airline-specific adapters require their own fixtures, refusal paths, and controlled live validation.

## Testing and contribution rules

For every new verified adapter:

1. Write synthetic HTML fixtures for not-open, not-checked-in, checked-in, unknown, declaration, payment, CAPTCHA, and completion states.
2. Write the failing test first.
3. Keep parsing and state classification separate from browser side effects.
4. Prove status is read-only.
5. Prove unknown states stop.
6. Prove legal declarations cannot be reached without passenger confirmation.
7. Prove payment controls stop without exact approval.
8. Prove a submitted-but-unclear response triggers status verification rather than immediate resubmission.
9. Prove boarding-pass files are private and plausible.
10. Run secret/privacy scans and inspect the staged diff.
11. Only then perform a controlled real-booking validation owned by the tester.
12. Record the airline, locale, date, and exact success evidence without recording personal data.

Do not add third-party code unless its licence is compatible, attribution is preserved, and the implementation is reviewed line by line. Reimplement concepts independently when repositories are GPL-licensed or have no detected licence.

## Common pitfalls

1. **Assuming T-24 hours:** verify the airline and route policy live.
2. **Timezone abbreviations:** EST/PST are ambiguous and mishandle daylight saving. Use an explicit offset or IANA timezone.
3. **Scheduling before opening:** use a small positive buffer and bounded retries.
4. **Sleeping process:** use durable one-shot scheduling.
5. **Generic submit selectors:** inspect context before every write.
6. **Automation equals success:** verify checked-in state and boarding-pass availability.
7. **Plaintext job names/prompts:** store sensitive details in a protected local record referenced by opaque ID.
8. **Screenshots as harmless debug output:** they can contain names, routes, PNRs, and barcodes.
9. **One locator equals one flight:** enumerate segments and passengers.
10. **Auto-answering hazmat prompts:** only the passenger may make factual declarations.
11. **Rapid API racing:** overlapping requests can increase rate limits and uncertainty.
12. **Using a private mobile API:** undocumented keys and generated headers are brittle and may violate access expectations.
13. **Calling heuristic coverage support:** guided browser assistance is not a verified adapter.

## Verification checklist

- [ ] Passenger authority established.
- [ ] Booking resolved from an airline-issued source.
- [ ] Official airline domain verified.
- [ ] Current check-in opening and closing policy verified.
- [ ] Departure uses an explicit UTC offset or IANA timezone.
- [ ] Every passenger and segment enumerated.
- [ ] Sensitive data stored only in protected local state.
- [ ] One-shot cron timestamp, repeat count, skill attachment, and delivery verified.
- [ ] Status checked before any write.
- [ ] Passenger personally reviewed every factual declaration.
- [ ] CAPTCHA, login secret, OTP, payment, and ambiguous choices handed off.
- [ ] Retries are serial, bounded, and limited to known transient states.
- [ ] Checked-in state verified for every intended passenger and segment.
- [ ] Boarding pass verified privately when available.
- [ ] Notification is redacted and includes the official manual fallback on failure.
- [ ] One-shot schedule and temporary private state cleaned up.
- [ ] Test suite, syntax check, privacy scan, and staged-diff review passed.

## References

- [Source audit and licence boundaries](references/source-audit.md)
- [Safety, privacy, and failure taxonomy](references/safety-and-failures.md)
- [Carrier adapter acceptance checklist](references/adapter-acceptance.md)
- [Privacy-minimal one-shot cron prompt](templates/cron-prompt.md)
- [Protected flight-record template](templates/flight-record.example.json)

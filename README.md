<div align="center">
  <img src="assets/header.svg" alt="Airplane Check-in Skill: guarded multi-airline check-in orchestration for Hermes Agent" width="100%">

# Airplane Check-in Skill

**Schedule and complete airline check-in through official sites, with durable timing, private state, human-controlled declarations, explicit verification, and a field-tested ANA adapter.**

[![Licence: MIT](https://img.shields.io/badge/licence-MIT-ff718d.svg)](LICENSE)
[![Node.js 20+](https://img.shields.io/badge/node.js-20%2B-4ed3a5.svg)](package.json)
[![Hermes skill](https://img.shields.io/badge/Hermes-skill-57d5e8.svg)](SKILL.md)
[![Writes: guarded](https://img.shields.io/badge/check--in_writes-guarded-ffbe55.svg)](#safety-model)

[Install](#install-as-a-hermes-skill) · [Workflow](#what-it-does) · [Support](#support-model) · [ANA adapter](#ana-verified-adapter) · [Source audit](references/source-audit.md)
</div>

## What it does

`airplane-checkin` is a Hermes skill for the whole check-in lifecycle:

1. Find and reconcile the user's airline-issued itinerary.
2. Verify the airline's current opening and closing policy.
3. Calculate the opening time from an offset-bearing departure timestamp.
4. Store booking details privately under an opaque local ID.
5. Create a durable one-shot Hermes cron job.
6. Run status before any write.
7. Complete the current official flow, stopping at CAPTCHA, login secrets, declarations, payments, and unknown states.
8. Verify every intended passenger and segment.
9. Retrieve the boarding pass privately, notify with redacted details, and clean up.

The project began as a real ANA Playwright workflow. It now combines the safest ideas found across a live audit of multi-airline, Delta, and Southwest projects without copying their source or importing their unsafe patterns.

## Support model

| Flow | Level | Behaviour |
|---|---|---|
| ANA / All Nippon Airways | **Verified adapter** | Read-only status, guarded check-in, local boarding-pass PDF |
| Southwest, Delta, Air Canada, WestJet, United, American, Alaska, JetBlue | **Guided browser** | Current official site, semantic inspection, human handoff at guarded boundaries |
| British Airways, easyJet, Ryanair, Wizz Air, Jet2, Lufthansa, other airlines | **Guided browser** | Live policy lookup and conservative official-site assistance |

A generic field selector or URL list is not verified support. New verified adapters need synthetic state fixtures, refusal-path tests, and a controlled real-booking validation. See [the acceptance checklist](references/adapter-acceptance.md).

## Install as a Hermes skill

Clone the repository into a Hermes skills directory:

```bash
git clone https://github.com/bee-san/airplane-checkin-skill.git \
  ~/.hermes/skills/airplane-checkin
cd ~/.hermes/skills/airplane-checkin
npm install
```

Start a fresh Hermes session so the skill registry reloads, then load it explicitly when needed:

```text
/skill airplane-checkin
```

The root [`SKILL.md`](SKILL.md) is the operational playbook. It includes scheduling, browser execution, safety rules, failure handling, verification, and cleanup.

## Plan a check-in time

Do not assume every airline opens at T-24 hours. Verify the current rule first, then pass an ISO timestamp with `Z` or an explicit UTC offset:

```bash
npm run plan -- \
  --airline ANA \
  --departure 2026-10-25T09:00:00+01:00 \
  --opens-before-minutes 1440 \
  --buffer-seconds 5 \
  --attempts 3 \
  --interval-seconds 10
```

Example output is redacted and contains no booking data:

```json
{
  "airline": "ana",
  "automationLevel": "verified-adapter",
  "departure": "2026-10-25T09:00:00+01:00",
  "opensAt": "2026-10-24T08:00:05.000Z",
  "attempts": [
    "2026-10-24T08:00:05.000Z",
    "2026-10-24T08:00:15.000Z",
    "2026-10-24T08:00:25.000Z"
  ]
}
```

The default starts five seconds after the window opens and uses three serial attempts. The helper rejects timezone-less timestamps and retry plans above ten attempts.

## ANA verified adapter

Install and create a private local environment file:

```bash
npm install
cp .env.example .env
```

Fill `.env` locally, then run the read-only status action first:

```bash
npm run status
```

The passenger must personally review ANA's current baggage and restricted-goods information. Only after the passenger confirms it:

```bash
ANA_CONFIRM_BAGGAGE_RESTRICTIONS=YES npm run checkin
npm run boarding-pass
```

The adapter stops rather than guessing when ANA exposes an unknown booking state, changed declaration, disabled control, incomplete result, or implausible PDF. Browser profiles, screenshots, `.env`, and boarding passes are ignored by Git.

<img src="assets/terminal-demo.svg" alt="Synthetic ANA status output containing no booking or passenger data" width="100%">

## Safety model

The skill deliberately rejects risky patterns found during the source audit:

- no CAPTCHA or bot-detection bypass;
- no stealth browser plugins;
- no reverse-engineered mobile API keys or generated-header harvesting;
- no overlapping request races;
- no request before the published opening time;
- no generic click on the first Continue or Submit button;
- no automatic dangerous-goods or hazmat answer;
- no paid seat, baggage, or upgrade without exact approval;
- no success claim from a spinner, HTTP 200, screenshot, or unclear result;
- no PNR, passport data, barcode, or full passenger identity in Git, cron prompts, job names, logs, or notifications.

See [safety, privacy, and failure states](references/safety-and-failures.md).

## GitHub projects absorbed as research

The source audit covers:

- the original ANA Playwright adapter;
- a broad OpenClaw airline-checkin skill;
- a Delta Playwright project;
- mature Southwest projects using Python, Ruby, TypeScript, AWS Step Functions, API clients, browser automation, Docker, notifications, and recorded test fixtures.

Useful concepts were reimplemented independently: multi-segment scheduling, airport-local timing, one-shot jobs, deduplication, serial bounded retries, status-specific notifications, human handoff, explicit result states, and fixture-driven tests.

GPL and unlicensed source was not copied. Unsafe ideas were documented and rejected. See the complete [repository-by-repository audit](references/source-audit.md).

## Development

```bash
npm install
npm test
npm run lint
npm run secret-scan
git diff --check
```

Every new adapter must follow test-first development and the [adapter acceptance checklist](references/adapter-acceptance.md).

## Privacy and security

Read [`SECURITY.md`](SECURITY.md) before using real booking data. Never upload real boarding passes or screenshots to public issues. Use GitHub private vulnerability reporting for code vulnerabilities and remove all personal travel data from reports.

## Independent project

This project is not affiliated with or endorsed by ANA or any other airline. Airline policies, URLs, selectors, identity requirements, and check-in windows can change. The passenger remains responsible for accurate documents, factual declarations, airport deadlines, and compliance with airline and government rules.

## Licence

[MIT](LICENSE)

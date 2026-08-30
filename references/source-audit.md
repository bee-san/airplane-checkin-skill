# GitHub source audit

**Audited:** 30 August 2026
**Method:** live GitHub repository search, repository metadata, default-branch trees, README files, representative scheduler/browser/API code, tests, and licence files. Repositories were inspected read-only and their code was not executed.

This audit records the ideas distilled into `airplane-checkin`. It is not a claim that every project still works against the current airline site.

## Licence rule

- MIT and Apache-2.0 projects may be reused with their licence and attribution obligations satisfied, but this consolidation still reimplemented concepts rather than copying code.
- GPL-3.0 projects were treated as architectural research only so this MIT repository does not accidentally absorb copyleft implementation code.
- **No licence detected** means normal copyright applies. Those projects were used only to identify general ideas and risks. No source code was copied.

## Repositories

| Repository | Snapshot observed | Licence | Useful lesson absorbed | Boundary or red flag |
|---|---|---|---|---|
| [bee-san/ana-checkin-playwright](https://github.com/bee-san/ana-checkin-playwright) | Pushed 29 Aug 2026; JavaScript/Playwright | MIT | Known-state ANA adapter, passenger declaration gate, privacy scan, one submit, explicit completion, private PDF | Airline-specific selectors can drift; live validation covered ANA only |
| [JustinTSmith/airline-checkin-skill](https://github.com/JustinTSmith/airline-checkin-skill) | Pushed 27 Jul 2026; OpenClaw/JavaScript | **No licence detected** | Multi-airline URL registry, durable scheduling idea, local history, Gmail-assisted discovery, deduplication, CAPTCHA notification | Generic selectors were presented too broadly; plaintext local PNR/name; screenshots on every run; stated encryption did not match implementation; no tests |
| [branch-cartesia/auto-flight-checkin](https://github.com/branch-cartesia/auto-flight-checkin) | Pushed 29 Mar 2026; Delta/Python/Playwright | **No licence detected** | Dry-run mode, synthetic mock page, clear result-state vocabulary, bounded retry concept | Uses stealth and browser preferences intended to bypass bot detection; returns success when final state is unclear; starts before the stated opening time |
| [jdholtz/auto-southwest-check-in](https://github.com/jdholtz/auto-southwest-check-in) | Pushed 31 Dec 2025; Python; 593 stars at audit | GPL-3.0 | Mature test structure, multi-flight scheduling, reservation-change reconciliation, airport timezones, notification levels, privacy-aware logging | GPL code not incorporated; account password mode and browser-derived private headers increase sensitivity and fragility |
| [pyro2927/SouthwestCheckin](https://github.com/pyro2927/SouthwestCheckin) | Pushed 10 Jan 2026; Python; 425 stars | GPL-3.0 | Recorded HTTP fixtures, airport timezone lookup, exact opening-time wait, reusable test cassettes | GPL code not incorporated; tests expose a mobile API key pattern; private API may drift |
| [DavidWittman/serverless-southwest-check-in](https://github.com/DavidWittman/serverless-southwest-check-in) | Pushed 22 May 2023; Python/AWS; 61 stars | MIT | State-machine scheduling, per-segment wait states, short serial retries, typed failure routing, fixtures | Uses an undocumented mobile API key and old endpoints; cloud state contains sensitive passenger data |
| [sw-tools/checkin-service](https://github.com/sw-tools/checkin-service) | Pushed 5 Dec 2024; TypeScript/AWS; 9 stars | MIT | First-success cancellation, explicit success/failure response types, retry diagnostics, boarding-position evidence | Launches overlapping requests near opening time and depends on private API headers; this skill deliberately uses serial bounded retries instead |
| [byalextran/southwest-checkin](https://github.com/byalextran/southwest-checkin) | Pushed 18 May 2023; Ruby; 83 stars | MIT | All-segment scheduling, airport-local timezone map, immediate failure notification with manual fallback, boarding-position reporting | Generated-header workaround already documented as broken in 2023; shell-scheduled commands can expose booking data; ten rapid attempts are excessive |
| [TaterTechStudios/SouthwestCheckin](https://github.com/TaterTechStudios/SouthwestCheckin) | Pushed 26 May 2026; JavaScript/Playwright | Apache-2.0 | Synthetic screenshots can aid local diagnosis; explicit unknown-result class | Automatically clicks possible hazmat answers including No and I agree. This pattern was explicitly rejected because only the passenger may answer factual declarations |
| [springyleap/southwest-autocheckin](https://github.com/springyleap/southwest-autocheckin) | Pushed 2 Jul 2016; Southwest service; 68 stars | Apache-2.0 | Queue-oriented processing, round trips, and multi-segment itineraries reinforce that the idempotency unit is a passenger/segment set rather than only a PNR | Old site/API assumptions require fresh validation; do not treat historic activity as current support |
| [Tikolu/ryanair-check-in](https://github.com/Tikolu/ryanair-check-in) | Pushed 12 Feb 2026; Ryanair form automation | **No licence detected** | Exact passenger matching, passenger-scoped form filling, structured input validation, and leaving final submission to the passenger | No reusable licence; browser hooks and CSS-class coupling are brittle |
| [eyalzek/ryanair-free-seats](https://github.com/eyalzek/ryanair-free-seats) | Pushed 5 Jan 2017; legacy Ryanair seat tool | **No licence detected** | Seat-map observation should remain read-only and separate from seat assignment | Legacy predictable-seat exploit and paid-seat manipulation were explicitly rejected |
| [Globussoft-Technologies/globussoft-crm airline web-check-in PRD](https://github.com/Globussoft-Technologies/globussoft-crm/blob/main/docs/PRD_AIRLINE_WEBCHECKIN_AUTOMATION.md) | PRD in an active repository pushed 28 Aug 2026 | **No licence detected** | Per-airline adapters, typed outcomes, per-airline concurrency limits, health metrics, bounded retries, operator opt-out, and DOM/CAPTCHA escalation | Specification only; no reusable licence and no demonstrated carrier implementation |
| [zdxn/swc](https://github.com/zdxn/swc) | Pushed 26 Aug 2025; Python | **No licence detected** | Desktop scheduling and persisted queue concept | No reusable licence; platform-specific GUI and saved reservation data need separate security review |
| [olduser221/southwestBot](https://github.com/olduser221/southwestBot) | Pushed 20 Nov 2020; JavaScript; 14 stars | **No licence detected** | Confirms long-running demand for exact-time check-in and failure reporting | Old selectors/API assumptions and no reusable licence |

## Consolidated design decisions

### Kept

- One record per passenger/booking with one plan per segment opening time.
- Airline-issued email/document discovery followed by user-visible review, not blind scheduling.
- Exact airport-local timing converted to an offset-bearing UTC timestamp.
- A small positive buffer after the verified opening time.
- Durable one-shot scheduling instead of a sleeping foreground process.
- Status-before-write and read-only reconciliation after an unclear write.
- Serial bounded retries with a hard cap.
- Explicit state machine: scheduled, due, not-open, already-checked-in, awaiting-human, submitted-pending-verification, succeeded, failed-terminal.
- Redacted start/success/failure notifications and an official manual fallback link.
- Multi-passenger and multi-segment verification.
- Synthetic HTML fixtures and pure state classification before controlled live testing.
- Private local boarding-pass artifacts and cleanup.

### Rejected

- Claiming that broad CSS selector lists provide unattended support for any airline.
- CAPTCHA or bot-detection bypass, stealth plugins, webdriver flag suppression, or legacy-endpoint evasion.
- Undocumented mobile API keys, generated-header harvesting, and reverse-engineered private API clients.
- Overlapping request races at the opening second.
- Scheduling a request before the published opening time.
- Treating an unclear result as success.
- Automatically answering dangerous-goods or hazardous-material declarations.
- Logging PNRs and full passenger names in job names, process arguments, history, screenshots, or notifications.
- Storing cron payloads with plaintext booking details.
- Copying GPL or unlicensed source into this MIT repository.

## Search coverage and limitations

Searches covered airline check-in automation, Playwright/Selenium check-in, Delta auto check-in, Southwest check-in bots, and named European and North American carriers. GitHub contained a much deeper Southwest ecosystem than for ANA, Delta, Ryanair, Wizz Air, easyJet, British Airways, Jet2, or Lufthansa.

The absence of a discovered repository is not proof that none exists. Search results also contained booking demos, travel search tools, airline reservation coursework, and unrelated projects with incidental check-in text; those were excluded.

Repository activity and airline websites change. Re-run this audit before importing new implementation code or advertising a new verified adapter.

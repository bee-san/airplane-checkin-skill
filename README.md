# ANA Online Check-in with Playwright

A privacy-conscious Chromium automation for ANA online check-in. It supports three explicit actions:

- `status`: read the live booking state without checking in;
- `checkin`: complete check-in only after the passenger explicitly confirms ANA's baggage restriction;
- `boarding-pass`: open ANA's boarding-pass flow and save the rendered pass as a private local PDF.

This project was created from a real troubleshooting session where Safari's automation surface was unavailable, a Firefox-based browser reached an ANA system error, and Chromium completed the flow successfully.

## Safety model

- Real booking and identity values are supplied only through environment variables.
- The script selects necessary cookies only. Statistics and personalisation remain off.
- It will not tick ANA's restricted-goods declaration unless `ANA_CONFIRM_BAGGAGE_RESTRICTIONS=YES` is explicitly set.
- It refuses unrecognised page states rather than guessing.
- It verifies check-in through ANA's live completed state and the availability of the cancel-check-in control.
- Runtime profiles, screenshots, boarding passes and `.env` files are gitignored.
- Output avoids printing booking details or passport data.

## Requirements

- Node.js 20 or newer
- Google Chrome or Chromium
- macOS or Linux

## Install

```bash
git clone https://github.com/bee-san/ana-checkin-playwright.git
cd ana-checkin-playwright
npm install
cp .env.example .env
```

Edit `.env` locally. Do not commit it.

Load the environment in a shell:

```bash
set -a
source .env
set +a
```

## Check status safely

```bash
npm run status
```

The output contains booleans and local status only. It does not print the reservation locator or passenger name.

## Complete check-in

First, the passenger must personally read ANA's baggage and restricted-goods information and confirm that they are not carrying prohibited items.

Then set:

```bash
ANA_CONFIRM_BAGGAGE_RESTRICTIONS=YES
```

Run:

```bash
npm run checkin
```

The script checks the displayed declaration text before ticking the checkbox. If ANA changes the wording or page state, it stops.

## Issue a boarding pass

After check-in is verified:

```bash
npm run boarding-pass
```

The pass is written to `artifacts/boarding-pass.pdf` with private file permissions. The `artifacts` directory is ignored by Git.

## Environment variables

| Variable | Required | Purpose |
|---|---:|---|
| `ANA_RESERVATION_NUMBER` | yes | Six-character booking locator |
| `ANA_FIRST_NAME` | yes | Given name exactly as ticketed |
| `ANA_LAST_NAME` | yes | Family name exactly as ticketed |
| `ANA_CONFIRM_BAGGAGE_RESTRICTIONS` | check-in only | Must equal `YES` after personal confirmation |
| `CHROME_EXECUTABLE` | sometimes | Chrome/Chromium path when auto-detection fails |
| `HEADLESS` | no | Defaults to `false`; headful Chromium was more reliable |
| `ANA_PROFILE_DIR` | no | Private temporary browser profile |
| `ANA_ARTIFACT_DIR` | no | Private output directory |
| `DEBUG_ARTIFACTS` | no | Saves local screenshots when `true` |

## Workflow

1. Open ANA's current online check-in endpoint.
2. Accept necessary cookies only.
3. Search using the reservation locator and ticketed name.
4. Distinguish `Not Checked-in` from ANA's completed state.
5. For check-in, open the review page and preserve the current seat unless the caller changes it separately.
6. Verify ANA's restricted-goods declaration text.
7. Require explicit passenger confirmation before checking the declaration.
8. Submit once and allow ANA's processing page up to one minute.
9. Verify completion from the live booking page.
10. Optionally open ANA's boarding-pass PDF window and print it to a private local PDF.

## Privacy checklist before publishing changes

```bash
npm run lint
npm run secret-scan
git diff --check
git status --short
```

Review every staged file. Never add `.env`, `.runtime`, `artifacts`, screenshots, PDFs, browser storage or copied terminal logs.

## Troubleshooting

See [docs/troubleshooting.md](docs/troubleshooting.md).

## Disclaimer

This is an independent automation utility and is not affiliated with or endorsed by ANA. Airline pages and requirements can change without notice. The passenger remains responsible for accurate travel documents, baggage declarations, airport procedures and compliance with airline and government rules.

## Licence

MIT

# Troubleshooting

## ANA generic system error

Symptom:

```text
The document registration process could not be completed properly.
(CMN00P000-message.error.fatalError)
```

Do not submit repeatedly. ANA may return this after several rapid sessions or when its stateful workflow has expired.

1. Stop automation attempts.
2. Wait before retrying.
3. Use a fresh private browser profile.
4. Start again from the check-in search endpoint, not a deep result URL.
5. Run `status` before another write action.

## Cookie settings cover the form

ANA may show the cookie dialog after the main page renders. The script waits for it, leaves statistics and personalisation off, and applies only the selected necessary cookies.

If the form cannot be found, enable `DEBUG_ARTIFACTS=true` and inspect the local failure screenshot. Never commit the screenshot.

## Styled declaration checkbox intercepts clicks

ANA visually styles the baggage declaration with a label overlay. Clicking the hidden input directly may fail because the styled label intercepts pointer events. The script clicks the label associated with the checkbox, then reads the real checkbox state back before enabling Next.

## Processing page does not prove success

ANA may show `Now processing` for up to one minute. Reaching the result route or seeing a disabled boarding-pass control is not proof of completion.

Verified success requires at least one of these live states:

- the booking page says `Check-in completed`;
- `Cancel Online Check-in` is enabled;
- `Issue Boarding Pass` is enabled.

If processing times out, do not submit again blindly. Run `status` after a short wait.

## Boarding pass says Not issued

Check-in can be complete while the boarding pass is still not issued. Run the separate `boarding-pass` action. It opens ANA's issue dialog, chooses the PDF/print route, and stores a local PDF under `artifacts/`.

## Browser choice

The successful reference flow used Chromium through Playwright. A Safari desktop window may not expose a usable automation surface, while some Firefox-based automation environments can reach ANA's generic system error. These are environment observations, not claims that the browsers themselves are unsupported by ANA.

## Headless mode

Headful mode is the default because it was more reliable for this site. Set `HEADLESS=true` only after testing the status action. Do not move directly to a write action when changing browser mode.

## Names

Use the name exactly as shown on the ticket. Airline ticketing systems may concatenate given names. Do not silently substitute a preferred name, former name or passport OCR result.

## Privacy and support

Debug screenshots, boarding passes, cookies and browser profiles contain sensitive data. Keep them local and delete them when no longer needed. Public bug reports must use synthetic values and must not include barcodes, QR codes, reservation locators or travel-document details.

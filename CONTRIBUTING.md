# Contributing

Contributions are welcome when they preserve the project's safety guarantees.

## Required checks

```bash
npm install
npm test
npm run lint
npm run secret-scan
git diff --check
```

## Pull-request rules

- Use synthetic reservation and passenger values only.
- Never upload screenshots or boarding passes from a real booking.
- Keep the personal declaration guard intact.
- Add a refusal path for any new or unrecognised airline state.
- Avoid selectors based only on generated UUIDs when a stable ID, role or label exists.
- Keep status checks read-only and check-in actions explicit.
- Document any new side effect.

## Testing

Use the local synthetic HTML fixtures for normal status and check-in development. `npm test` launches Chromium, serves those fixtures only on `127.0.0.1`, and does not contact ANA.

When ANA changes its public page contract, update fixtures only from privacy-scrubbed evidence. Preserve stable IDs, accessible roles, labels and the minimum safety-critical wording needed by the assertions. Never copy a real passenger name, booking locator, flight, seat, passport field, barcode, browser profile or boarding pass into a fixture.

Live write testing must use a booking controlled by the tester and requires the passenger's explicit declaration confirmation.

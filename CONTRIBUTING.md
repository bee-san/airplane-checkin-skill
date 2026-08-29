# Contributing

Contributions are welcome when they preserve the project's safety guarantees.

## Required checks

```bash
npm install
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

Test the status parser with synthetic fixtures where possible. Live write testing must use a booking controlled by the tester and requires the passenger's explicit declaration confirmation.

# Contributing

Contributions are welcome when they preserve the project's safety and evidence standards.

## Required checks

```bash
npm install
npm test
npm run lint
npm run secret-scan
git diff --check
```

## Pull-request rules

- Use synthetic reservation, passenger, route, and boarding-pass values only.
- Never upload screenshots, cookies, wallet passes, or boarding passes from a real booking.
- Keep personal declaration, payment, CAPTCHA, and login-secret guards intact.
- Keep status checks read-only and check-in writes explicit.
- Stop on every unknown airline state.
- Use semantic roles, labels, and page context before brittle generated IDs.
- Keep retries serial, bounded, and limited to known transient states.
- Verify all intended passengers and segments before claiming success.
- Document every new side effect and cleanup path.
- Do not add stealth, anti-bot bypass, private mobile API keys, or generated-header harvesting.
- Do not copy GPL or unlicensed source into this MIT repository.

## Adding a carrier adapter

Follow [`references/adapter-acceptance.md`](references/adapter-acceptance.md). In summary:

1. Verify current official URLs and check-in policy.
2. Write synthetic fixtures and failing tests first.
3. Separate state classification from browser mutations.
4. Test unknown, CAPTCHA, declaration, payment, pending, failure, and success states.
5. Prove status is read-only and unclear writes are reconciled through status.
6. Run one controlled real-booking validation owned by the tester or an explicitly authorising passenger.
7. Record non-personal evidence and remove debug artifacts.

A URL registry or generic selector list is guided-browser coverage, not a verified adapter.

## Source research and attribution

Update [`references/source-audit.md`](references/source-audit.md) when a repository materially influences the design. Record its URL, observed activity, licence, useful lesson, and rejected risks. Preserve compatible licence notices when code is reused. Prefer independent reimplementation of concepts when licence compatibility is uncertain.

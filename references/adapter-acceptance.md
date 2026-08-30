# Carrier adapter acceptance checklist

A carrier stays in guided-browser mode until every item below is complete.

## Evidence package

- [ ] Official check-in and manage-booking URLs identified.
- [ ] Current opening and closing policy verified from the airline.
- [ ] Locale, route type, and airport limitations recorded.
- [ ] Required passenger and document fields enumerated.
- [ ] Not-open state fixture.
- [ ] Not-checked-in state fixture.
- [ ] Already-checked-in state fixture.
- [ ] Unknown-state fixture.
- [ ] CAPTCHA or human-verification fixture.
- [ ] Dangerous-goods/declaration fixture.
- [ ] Optional paid-extra fixture.
- [ ] Submission-pending fixture.
- [ ] Completion fixture.
- [ ] Boarding-pass fixture.

## Behavioural tests

- [ ] Status command performs no write.
- [ ] Unknown state stops.
- [ ] Wrong passenger or segment stops.
- [ ] Declaration path requires passenger confirmation.
- [ ] Payment path requires exact approval.
- [ ] CAPTCHA produces manual handoff.
- [ ] Retry schedule is serial and bounded.
- [ ] Unclear write result triggers read-only status.
- [ ] Success requires all intended passengers and segments.
- [ ] Boarding-pass output is private and plausible.
- [ ] Logs and notifications are redacted.

## Live validation

- [ ] Controlled booking belongs to the tester or an explicitly authorising passenger.
- [ ] Status tested first.
- [ ] One check-in submission only.
- [ ] Exact checked-in evidence captured without personal data.
- [ ] Boarding pass verified privately.
- [ ] Test date and locale recorded.
- [ ] Debug artifacts removed.
- [ ] No sensitive data entered Git history.

Only after all checks pass may the support table call it a **verified adapter**.

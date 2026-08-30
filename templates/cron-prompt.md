# One-shot airplane check-in cron prompt

Load the `airplane-checkin` skill and follow every safety invariant.

Process opaque flight ID `FLIGHT_ID` from the protected record at:

`HERMES_HOME/private/airplane-checkin/FLIGHT_ID.json`

Requirements:

1. Verify the file exists, its parent directory is private, and the file is mode `0600` on POSIX.
2. Use only the airline's current official check-in domain recorded in the file, revalidating unexpected redirects.
3. Run a read-only status check before any write.
4. Confirm the intended passenger count and every intended segment.
5. Never infer or auto-answer dangerous-goods, baggage, health, immigration, or other factual declarations.
6. Stop for CAPTCHA, password, passkey, OTP, device approval, payment, paid seat, baggage purchase, or ambiguous passenger/segment choice. Report a manual handoff with the official URL.
7. Keep retries serial and bounded by `retryPolicy`; retry only a known not-yet-open or transient state.
8. If submission may have landed but the result is unclear, run read-only status before any resubmission.
9. Claim success only after explicit checked-in evidence for every intended passenger and segment. Verify the boarding pass privately when available.
10. Send a redacted final result. Never include the PNR, passport data, barcode, full passenger name, or auth material.
11. On terminal success or confirmed cancellation, remove the protected record unless `retainPrivateRecord` is true.

If the protected record is missing, invalid, or stale, stop and report that without guessing.

# Synthetic ANA check-in fixtures

These files are deliberately small reconstructions, not saved copies of ANA pages.

The original reference run retained privacy-sensitive screenshots and semantic browser snapshots, not a reusable raw-HTML archive. The fixtures therefore reproduce only the page contract needed by the workflow:

| Fixture | Reconstructed contract |
|---|---|
| `checkin-search.html` | Search-field IDs, the accessible **Search** button, cookie-save control, and optional statistics/personalisation switches |
| `checkin-select.html` | `Not Checked-in`, selected passenger, seat-shaped text, and the **Online Check-in** action |
| `checkin-review.html` | Review URL, stable online-check-in button ID, **Baggage Information** dialog, required restricted-goods sentence, declaration checkbox/label, and disabled-until-confirmed **Next** action |
| `checkin-completed.html` | `Check-in completed`, seat-shaped text, enabled boarding-pass action, and cancel-check-in control |
| `checkin-ambiguous-result.html` | A submitted-but-unverified result used to prove the workflow reports uncertainty and never invents success |
| `checkin-unknown.html` | A deliberately unrecognised state used to prove the workflow fails closed |

All passenger, reservation, flight, airport and seat values are synthetic. The local fixture server is bound to `127.0.0.1`, and the test suite never contacts ANA.

When updating a fixture, preserve only the minimum stable IDs, accessible roles, labels and safety-critical wording needed by an assertion. Never add real booking data, passport fields, screenshots, browser storage, boarding passes or barcodes.

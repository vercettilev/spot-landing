# src/core: vendored from spot-core

These files are copied unchanged from Poppin's hackathon engine,
`packages/spot-core/src` in
[vercettilev/poppinhackathon](https://github.com/vercettilev/poppinhackathon)
at commit `33f1f558f0d5e1ddc416cfd402fbd7c730ef4d96` (2026-10-02):

| here | there |
| --- | --- |
| `context/extract.ts` | `src/context/extract.ts` |
| `catalog/index.ts` | `src/catalog/index.ts` |
| `telemetry/events.ts` | `src/telemetry/events.ts` |
| `resolve/ultra.ts` | `src/resolve/ultra.ts` |
| `safety/open-mint-gate.ts` | `src/safety/open-mint-gate.ts` |
| `route/jupiter.ts` | `src/route/jupiter.ts` |
| `route/policy.ts` | `src/route/policy.ts` |
| `errors.ts` | `src/errors.ts` |

What Spot takes from them: the CA and cashtag extractor, the curated catalog
(tokenized stocks, bridged assets, the memecoins Poppin probed by hand), the
Jupiter Ultra search client with its ticker tiebreaks, and the safety
thresholds with the "established" exception. The calibration notes in their
comments are the record of how those numbers were chosen.

What Spot changes lives outside this folder, in `src/engine`: the gate there
warns instead of refusing on size (fresh, thin, few holders), always runs the
exit probe, and blocks only what takes the bag away.

Keep these files byte-for-byte equal to upstream so a diff against a newer
spot-core stays readable. Changes go upstream first, then get copied here
with this table's commit updated.

# T24 integration gate investigation

## Sprite contract mismatch, reproduced and corrected
PR17 deliberately keeps opaque character bodies opaque during narration, dimming the image with a brightness filter instead of alpha. The old test still waited for wrapper opacity exactly 0.55. Unchanged local and GitHub runs time out at this condition. The updated check requires wrapper opacity >=0.99 and image brightness <1, while keeping the exact same DOM-node continuity, return-to-speaking and transition checks. The full sprite suite passes locally after the change. Restoring the old alpha behavior now fails the updated check.

## Offline CI investigation, not assumed flaky
Main run 45328851006 timed out after a quality-mode reload at test-portable.mjs:203. Its artifact has no browser/network errors, but settings lightweight=false and original hero art; the existing evidence cannot identify the writer. The unchanged local suite passed that point and then exposed a separate readiness race: isEnabled was read immediately after reload before lazy story readiness, at line 250. A full instrumented run passed, and a separate repeated offline quality/reload probe records settings writes. No product setting-persistence change is justified yet. The readiness test now waits for the existing continue button to become enabled, then still asserts it. Navigation-time fixture/settings diagnostics are retained on failure so another real persistence failure is actionable. No timeout increased, assertion removed, workflow changed or scenario skipped.

Disposable fixtures only; no real player saves. CI must pass on the actual PR head before merge, followed by a fresh main deployment and live asset verification.

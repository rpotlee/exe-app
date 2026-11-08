# Phase 1 review

For the final visual-conformance pass, see [the measured report and UI-only comparisons](visual-conformance/REPORT.md). For the earlier refinement and approved-image comparison, see [Phase 1 acceptance review](PHASE-1-ACCEPTANCE.md). The audit below records the initial implementation.

The pre-change audit found: review-first Inbox without raw completion or editing; four mobile destinations with capture occupying the middle slot; missing mobile Search/Settings; nearly opaque dock; incorrect “Next priorities” label for active Now items; duplicated capture guidance and excess mobile spacing. Baseline checks passed before production edits. `baseline-example.json` is a backup of the initial example state, not user progress.

Implemented only the raw Inbox checklist and navigation/composition parity in the existing vanilla app. The eight entity types, IDs, seed text, structured task state, decision flows, Now limit, and approval logic remain intact. Capture `completedAt` is independent of review status; missing metadata on existing local data is treated as active. Editing uses `checklistText` while `text` remains the original reviewed capture. `archivedAt` hides a row reversibly; archived sources remain retained, searchable and reviewable. The list uses stable capture order. Empty filtered views are explicit.

Mobile has five labeled destinations plus an elevated global cobalt capture button. Search and workspace settings expose the existing backup/restore controls. Capture returns to the prior route or Focus Mode and preserves scroll, unfinished inline text and expanded checklist state. The dock uses frosted translucency with an opaque fallback and safe-area offsets. Focus retains Mission Status without a metrics row, uses a dynamic state line, and labels its other Now outcomes accurately. Removed duplicate heading definition and capture guidance panel; narrowed spacing. Keyboard dialogs trap focus, isolate background controls, restore focus and support Escape. Secondary label contrast was corrected within the existing palette.

## Validation

Start `python3 -m http.server 8000 --bind 127.0.0.1 --directory /workspace/exe-app` in another terminal. Python Playwright and Chromium are installed in this environment.

```sh
node --check app.js
python3 tests/baseline.py
python3 tests/phase1.py
python3 tests/capture_context.py
python3 tests/design_system.py
npm install --cache /tmp/exe-npm-cache --prefix /tmp/exe-a11y --no-package-lock --no-audit --no-fund axe-core@4.14.0
AXE_PATH=/tmp/exe-a11y/node_modules/axe-core/axe.min.js python3 tests/accessibility.py
AXE_PATH=/tmp/exe-a11y/node_modules/axe-core/axe.min.js python3 tests/refinement.py
python3 tests/visual_conformance.py --pass-name pass-2
python3 tests/visual_compare.py
```

The comparison generator additionally uses Python Pillow, available in this environment; it crops reference UI regions solely for documentation. Runtime screens do not use reference artwork.

The functional suite covers 320, 375, 390, 430, 768, 1024, 1280 and 1440 CSS pixels: route and Focus Mode capture return, multiline capture, add/edit/complete/reopen, All/Active/Done, archive/restore, reload persistence, all original captures, independent structured task and review state, Search/Settings access, project navigation, decision actions, focus checklist access, the three-priority cap, horizontal overflow and dock/capture separation.

Accessibility checks cover 320/390/430/1280, twenty route audits with axe WCAG A/AA tags, keyboard trapping/shortcuts, reduced motion, 420px-high resized capture sheets, and Chromium-emulated 20px top/34px bottom safe areas. Resizing is an approximation of keyboard layout, not proof of an actual iOS keyboard. Chromium tests do not establish real iPhone Safari behavior, screen-reader usability or exact visual parity with the approved reference images. Both approved images were inspected during the refinement and compared in PHASE-1-ACCEPTANCE.md. These remain manual review checks. No backend, AI integration, sync, deployment or other phase was started.

## Real browser screenshots

Screenshots use a fresh local example with zero completed tasks; no progress was invented.

| View | Before | After |
| --- | --- | --- |
| Desktop Focus, 1280px | [Before](screenshots/before-desktop.png) | [After](screenshots/after-desktop-focus.png) |
| Mobile Focus, 390px | [Before](screenshots/before-mobile.png) | [After](screenshots/after-mobile-focus.png) |
| Desktop Inbox, 1280px | — | [After](screenshots/after-desktop-inbox.png) |
| Mobile Inbox, 390px | — | [After](screenshots/after-mobile-inbox.png) |

The baseline recording command was run before changes. Future baseline checks do not overwrite the evidence unless explicitly passed `--record`. Functional tests refresh the after screenshots.

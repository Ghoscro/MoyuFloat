# Delivery review

Goal checked against the owner's request:

1. GitHub fork: Ghoscro/MoyuFloat, with upstream attribution and history retained.
2. Local project: standalone working editor under SakuraBot projects/MoyuFloat, loopback 18432, hidden server with reusable launcher.
3. Design before implementation: A/B/C reference displayed; delegated A selected; DESIGN.md and PLAN.md precede code changes. Selected darkroom mechanisms appear in actual desktop/mobile browser screenshots.
4. Reuse and improvement: original renderer/depth/brush/lighting functionality retained; portable scene files, bounded edit history, clean working-size image and depth exports, source-preserving reset, progressive local AI loading and verified local model installation added.
5. Actual checks: import, light presets and drag, brush undo, scene roundtrip, invalid file rejection, reset, lighting limits, responsive layouts, exported image dimensions, WebGPU AI output and launcher cold start verified in docs/VERIFICATION.md.

Original failed model download preserved in verification. A pinned local download and SHA-256 gate repaired this deployment's AI path; model weights remain excluded from Git and are reproducible with setup_model.py. No claim that WASM fallback, full offline inference or the independent userscript was tested. No human preference acceptance claimed.

Independent reread of requirements by the executing agent; no independent subagent or external user review claimed. Detailed screenshots and synthetic fixtures are in docs/evidence. Product paths and scripts operate locally; no credentials or private memory materials are included in the release.

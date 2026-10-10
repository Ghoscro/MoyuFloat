# MoyuFloat · 浮画工作室

2026-10-11 · visual_revision 1 · Plan: docs/PLAN.md

## Goal and selection

An illustration editor for importing one image, shaping depth, placing lights, comparing, and exporting locally. The owner delegated design and implementation in this request. Mode: ai-led; selection: delegated; human feedback: pending. Reference generation used the built-in image tool (backend model unspecified), displayed in chat before implementation. Three distinct directions are recorded in `docs/evidence/design-directions.png`.

A: charcoal darkroom, persistent left inputs/right lights, large central stage, bottom looks. Selected for stable controls and unobstructed artwork. B: ivory editorial atelier, linear workflow, spacious typography; rejected because advanced edits need too much scrolling. C: immersive stage with floating dock/popovers; rejected because the inspector obscures the image. Each differs in layout and density as well as surface and typography.

Hypothesis: a larger stage, visible presets and recoverable edits make experimental relighting easier. Verify import → preset → drag light → compare → undo → save/reopen → export in the real browser. User preference and usability outcomes remain pending.

## References and original differences

Huashu reference-only: `skills/huashu-design/references/design-styles.md`, dark tool/editor mechanisms; no full Huashu workflow claim. Original application: upstream index.html at commit 31a5d1e, MIT. Reuse its WebGL shader, depth processing, local ONNX inference and painting controls. Preserve attribution and the separate mokey userscript.

Original additions: scene-file portability with embedded image/depth, 12-state bounded undo including depth paint, image-preserving reset, source-sized composite export, explicit depth provenance and responsive workspace navigation. Original SVG demonstration artwork with paired approximate hand-authored depth; never label it AI generated.

## Visual rules

One charcoal direction, amber emphasis. Background #121416, panels #1c1f22, raised surface #282c30, border #35393e, text #eef0f2, secondary #9ba3ab, accent #e9b76b, focus #8bc8ff. System Chinese sans-serif; monospace values. Type 12/13/15/22px; spacing 4/8/12/16/24; radii 6/10px. Soft shadow on stage only. Design variance 4 (recognizable editor), motion 2 (state feedback), density 7 (editing needs visible controls).

Desktop: 240px input panel / flexible stage / 280px inspector, canvas height bounded by viewport, presets beneath canvas, sticky header. Tablet: stage first with two panels below. Mobile: canvas first and explicit image/depth/light navigation; panels full width, no sideways document scrolling; controls remain reachable. No marketing hero, decorative animation or fabricated precision metrics.

## States, data and performance

Example ready on startup; selected preset indicated; unavailable history disabled; busy AI disables image/depth replacement/reset/load until completion; failure preserves current depth and allows retry. Reset parameters preserves artwork. Scene parsing validates format, numbers, colors, data URLs, file size and image dimensions before mutating the editor. Local scene save is an explicit download; no silent persistent image storage.

Input images limited to 4096 pixels and WebGL texture limits, with actual working dimensions reported. Source export uses working dimensions, independent of viewport/DPR; final composite excludes markers and comparison split. History stores bounded depth snapshots only on depth changes. Renderer pauses in hidden tabs. First-use AI model download needs network; core editor and local assets work without remote font/runtime loading. Reduced motion disables automatic camera motion initially. Focus rings, accessible names and keyboard editing required.

## Verification

Desktop 1440×900, mobile 390×844 and 320×568; import JPG/PNG, presets, zero/one/eight lights, compare keyboard, paint/undo, reset retaining source, scene roundtrip/invalid file, source-sized clean PNG and depth PNG. AI success must be reported separately from model download/error handling. Save actual screenshots and download dimensions in docs/evidence.

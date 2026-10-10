# Browser verification · 2026-10-11

Environment: Windows, Codex in-app browser. Served on loopback port 18432 after reservation/check. No human usability acceptance claimed.

| Check | Observed result |
|---|---|
| Startup and shader rendering | Example renders, local assets load, no application syntax or shader error observed |
| Desktop 1440×900 | Three-column editor, fitted central image, persistent inspectors, presets beneath image; actual screenshot `evidence/desktop.jpg` |
| Mobile 390×844 | Document scrollWidth 375, viewport 390; stage first, reachable panels, no horizontal overflow |
| Small phone 320×568 | Document scrollWidth 305, viewport 320; toolbar and stage fit, panel navigation reaches lights |
| PNG and JPEG import | `portrait-input.png` and `.jpg`, both display working size 720×1080 and retain portrait proportions |
| Preset/undo/redo | Sunset sets low orange light and ambient 45; undo restores warm light and 72; redo restores sunset |
| Compare | Split visible; keyboard ArrowRight produces aria-valuenow 52; export remains clean composite |
| Scene save/reopen | Saved .moyu includes source/depth and lights; after switching to night, reopen restores sunset, selected orange light and comparison mode |
| Invalid scene | Wrong format rejected; active image and warm light preserved |
| Reset parameters | Portrait filename and 720×1080 remain; depth origin stays unchanged |
| Zero/one/eight lights | Night preset one light; deleting it shows useful empty message and disables light controls. Add eight → 8/8 and add disabled; undo → 7/8 |
| Light dragging | Warm light moved from X28 Y28 to X40 Y43, visible list/marker update |
| Light slider undo | Keyboard intensity 1.10 → 1.15; undo returns 1.10 |
| Brush undo | Before/after scene depth PNG data differs; undo restores byte-identical original depth data |
| Composite PNG size | Saved file decoded as 1400×1000 for example and 720×1080 for portrait; independent of viewport, excludes gizmos and compare split |
| AI first attempt | Remote model stream interrupted near 62 MB with network error; controls re-enabled, depth preserved. This failed attempt remains recorded |
| Local model | `setup_model.py` downloads fixed public revision; 99,060,839 bytes; SHA-256 verified; source receipt in models/receipt.json |
| AI real inference | Local model accepted by actual ONNX Runtime session; UI reports AI depth · WebGPU. Portrait JPEG inference and subsequent example inference completed |
| AI depth PNG | Exported and decoded at 720×1080; grayscale values span a nonconstant range (see evidence/ai-depth.png) |
| Runtime warnings | ONNX emits warnings about shape nodes assigned to CPU. WebGPU preferred provider session and output succeeded; no assertion that all nodes use GPU |
| Launcher | `start.ps1 -NoOpen` recognizes existing correct application and exits 0 without another listener. Verified owned test server stopped; launcher rechecked port, started hidden server and returned HTTP 200 with correct app marker |
| Source checks | `node --check js/engine.js`, unique DOM IDs/local asset checks and Git whitespace check passed |

Limits: WASM-only inference, WebGL-disabled devices, cache-only offline inference, large 4096px input and independent mokey userscript were not tested. Illustration appearance and workflow preference await owner feedback. Preview FPS is a live readout; no fixed FPS guarantee or benchmark claim.

Generated direction reference comes from the built-in image tool (backend unspecified), not a rendered app. Screenshots are actual app renders. SVG sample is original deterministic artwork and approximate manual depth. Input fixture is a synthetic portrait chart for ratio and recovery checks, not a human-photo quality evaluation.

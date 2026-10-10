# 纯样本侦察（无卡点）

Sample: upstream index.html, commit 31a5d1e (hash in evidence/upstream.json). Authorized public MIT source analysis for reuse in a local editor redesign. No binary protection or obfuscation, no bypass needed.

Static verified: root index.html uses direct WebGL 1, not Three.js despite README wording. One fullscreen quad samples image/depth/detail/matcap textures. Depth gradient uses Sobel sampling; an array of eight lights modifies color. Depth import, luminance approximation, manual brush and ONNX model inference all update depthCanvas. Rendering uses a continuously scheduled animation frame. Export uses viewport/DPR-sized canvas.toBlob, so image dimensions depend on browser size. Reset discards user image and calls drawDemo. AI processing awaits session/model then rereads mutable source globals; import/reset during inference can change its input or output destination. Separate mokey package is a React userscript build.

Dynamic observed before changes: local page renders demo and displays all image/depth/light controls in the in-app browser. Browser screenshot confirms original mobile-stacked interface at the panel's default width. No AI success or export dimension claim made from this initial observation.

Inferred: persistent side inspectors plus larger stage will ease repeated light edits; source-size clean export and recovery will improve practical use. These claims require behavior checks and human feedback respectively.

Unknown: actual ONNX model execution on this device; user preference for the selected direction. Windows ripwire executable unavailable; targeted symbol reads used instead. No claim of binary reverse engineering or completed blocker bypass.

Settle: reconnaissance established the relevant reuse boundaries; implementation follows DESIGN.md and dynamic browser checks. Source hashes bind original observations; changed behavior requires fresh evidence.

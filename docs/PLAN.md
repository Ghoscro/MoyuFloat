# Implementation plan

Design decision recorded first in DESIGN.md, revision 1, delegated by the owner's request.

1. Preserve upstream revision and MIT attribution, map original engine and its input/export boundaries.
2. Separate inline styling and renderer into local assets; implement the chosen darkroom layout while retaining control IDs and all shader modes.
3. Add recoverable edits and validated scene roundtrip, preserve uploaded image on reset, export composite/depth at working size, guard asynchronous inference.
4. Verify real rendering and interactions, desktop/narrow states and downloaded artifacts. Record coverage and remaining AI/network limitations.

Task status lives exclusively in `.jspace/control.json`; this file describes sequence, not completion state. No backend, cloud upload, telemetry or changes to the independent userscript.

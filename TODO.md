# TODO

Working plan for the Amplifier DX site. `- [x]` done, `- [~]` partly done, `- [ ]` open.

## Visual redesign

- [x] New theme in `css/theme.css`: graphite panel, bone text, one amber accent, Archivo and IBM Plex Mono *Size:* L *AC:* every section renders with the theme at 1440px and 390px with no sideways scrolling
- [x] Home hero replaced by the kernel schematic *AC:* five module slots mounted on the amplifier-core bus, with one draw-on-load animation that respects reduced motion
- [x] Phone navigation drawer *AC:* menu button opens the sidebar, picking a page closes it
- [x] Sidebar highlights the current page on first load and one sub-item at a time
- [x] Six architecture diagrams recoloured to the site palette *Size:* M *AC:* PNG and SVG re-rendered from the `.dot` sources; README colour table matches
- [x] External App Integration diagram rebuilt from a DOT source *Size:* M *AC:* `assets/amparch.png` removed; new diagram matches amplifier-core 2.0.2
- [ ] Light theme *Size:* L *AC:* every hard-coded colour in the inline stylesheet audited; both themes pass contrast

## Accuracy and tooling

- [x] Chat widget model list and system prompt updated *AC:* `tests/test_chat_model.py` passes
- [x] Site context extraction slimmed and checked *AC:* `tests/test_site_context_accuracy.py` passes
- [x] Specification scripts labelled and tested *AC:* `tests/test_spec_generation.py` passes
- [x] Conceptual docs 03 to 15 re-checked against the installed build *AC:* `tests/test_docs_03_to_15_accuracy.py` passes

## Publish

- [x] Pull request for the redesign into `main` *AC:* checks green, including the diagram render check
- [ ] Merge and confirm the live GitHub Pages site shows the new design

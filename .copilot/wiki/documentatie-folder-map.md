# documentatie/ folder map

- **Only `documentatie/infinite_samples/recadv/` and `documentatie/infinite_samples/retann/` are
  gitignored** (verified directly against `.gitignore`) — NOT the whole `documentatie/` folder. The
  rest of `documentatie/` (specs, manuals, analysis docs) is tracked and searchable normally.
- `grep_search`/`semantic_search` skip gitignored paths by default. Since only the two subfolders
  above are ignored, ordinary searches already reach the rest of `documentatie/`; only pass
  `includeIgnoredFiles: true` when you specifically need to search inside the RECADV/RETANN sample
  XML folders themselves.
- Canonical EDInet XML schema reference (DESADV v4.1 + RECADV v4.0 + RETANN v4.0, field by field):
  `documentatie/dedeman/Infinite_EDInet_DESADV_RECADV.md`.
- Business/billing rules for Auchan + Dedeman:
  `documentatie/Fluxuri complete EDInet Auchan-Dedeman/Manual_integrare_facturare_edi_Auchan_Dedeman.md`
  (summarizes + links to the canonical schema doc; do not duplicate field tables there).
- Production-data validation of those rules:
  `documentatie/Fluxuri complete EDInet Auchan-Dedeman/Analiza_exemplelor_in_Soft1.md`.
- Sample payloads: `documentatie/dedeman/RetAnn.xml` is Infinite's spec example for RETANN
  (fixture template only, not proof of the delivered format — see [retann.md](retann.md) for the
  real delivered format).
- Derived `.md` files in this folder are NOT reliable substitutes for their source `.docx`/`.pdf`.
  The 2026-07-27 extraction of `Manual_integrare_facturare_edi_Auchan_Dedeman.docx` silently
  dropped whole paragraphs and nuances. Re-read the source before reasoning on it:
  `zipfile` + `lxml` over `word/document.xml`, walking `w:p` (with `w:pStyle`) AND `w:tbl`
  (`w:tr`/`w:tc`) — plain text extraction loses the tables.
- Windows console is cp1252: call `sys.stdout.reconfigure(encoding='utf-8', errors='replace')`
  in `mcp_python-execut_run_python` before printing Romanian text or arrows, else UnicodeEncodeError.

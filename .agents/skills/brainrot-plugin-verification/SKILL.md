---
name: brainrot-plugin-verification
description: Verify Brainrot skill packaging and desktop plugin changes with evidence-based phase gates.
---

Read `references/test-matrix.md`. Inspect `ROADMAP.md` and applicable project instructions; work only in the authorized phase. Canonical development skills live in `skills/`; run `python -B scripts/sync_skills.py` after edits and `python -B scripts/sync_skills.py --check` before committing. Never hand-edit generated discovery copies.

Run `python -B -m unittest discover -s tests -v` for skill tooling changes. At runtime phases add checks for observable behavior, not implementation details. Distinguish unit tests, renderer tests, packaged Windows checks and actual host integration. Simulated hooks do not establish desktop compatibility.

Report test commands, outcomes and untested surfaces. Update phase checklists only when evidence meets the written criterion. Stop after completing each phase. Do not publish releases or install host hooks merely to satisfy a packaging test.

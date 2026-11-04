---
name: brainrot-integration-research
description: Verify desktop Claude and Codex extension capabilities before changing Brainrot architecture or integration adapters.
---

Read `references/evidence.md`. Check current official documentation before accepting an API claim. Separate desktop, CLI, remote and web surfaces; record platform, version, source URL and date. A CLI hook or SDK event is not proof that an existing desktop session emits it.

Investigate native panels first, including Claude mods and OpenAI MCP UI/extensions. Check video primitives, local file access, lifecycle, Windows and distribution restrictions. If the preferred layout is unavailable, test a single built-in panel hosting all three videos. If no supported embedded surface works, record the blocker for that host. An external window requires separate user authorization. Do not patch host files or inspect private conversation databases.

Record evidence and unresolved runtime experiments in `docs/research/` and decisions in `docs/ARCHITECTURE.md`. Cite exact pages; mark design proposals separately. Test installed applications only when available and report untested capabilities honestly. Do not call a documentation finding a successful integration test.

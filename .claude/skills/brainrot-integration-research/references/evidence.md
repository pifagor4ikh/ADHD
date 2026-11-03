# Evidence checklist

For each capability record: host/surface, Windows version constraints, API, official URL, documentation date, observed test result or `not tested`, decision and fallback.

Starting sources (revalidate, do not treat as permanent API guarantees):

- https://code.claude.com/docs/en/desktop
- https://code.claude.com/docs/en/plugins/mods/overview
- https://code.claude.com/docs/en/plugins/mods/reference
- https://code.claude.com/docs/en/hooks
- https://developers.openai.com/plugins/build/extensions
- https://developers.openai.com/plugins/build/plugins
- https://developers.openai.com/plugins/build/chatgpt-ui

An unresolved native-video experiment must identify its inputs, supported SDK primitive, expected observation and fallback. Reject invented `Video`, DOM injection, undocumented host endpoints and process activity heuristics presented as agent lifecycle events.

For Claude mods, export types from the installed runtime with `/plugin-types`; public GitHub declarations may lag. Distinguish playback starting on agent activity from launching at OS login; the latter is a separate opt-in UX decision.

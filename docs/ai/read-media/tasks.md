# Tasks

**Source:** User-approved Rettiwt media support scope in this conversation.

## Execution Guard

Stop and report if repository evidence contradicts this task or completion requires material scope expansion. Ordinary implementation details may adapt within the approved behavior.

- [x] T001 — Expose Rettiwt media through all tweet-returning tools
  - **Depends on:** None
  - **Parallel:** No
  - **Goal:** Return attached photos, videos, and GIFs from post details, replies, and search.
  - **Scope:** Shared tweet schema and exports, Rettiwt mapper, focused mapper/provider/MCP tests, README, and v1 compatibility documentation.
  - **Implementation:** Add optional `media` containing `id`, `type` (`PHOTO`, `VIDEO`, `GIF`), `url`, and optional `thumbnail_url`. Map Rettiwt fields into this shape; preserve media order and media-free post behavior. Official API media, downloads, posting, dependency changes, and publishing are outside scope.
  - **Verify:** Focused tests cover media types, missing/empty media, provider propagation, and structured/JSON MCP output. Run type, lint, and formatting checks; inspect the diff.

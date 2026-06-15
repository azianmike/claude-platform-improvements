# PostHog post-wizard report

The wizard has completed a deep integration of PostHog into this Node.js TypeScript project. `posthog-node` was installed and wired into the two server-side scripts (`index.ts` and `rate-limit.ts`). Both scripts are treated as short-lived CLI processes, so the PostHog client is initialized with `flushAt: 1` and `flushInterval: 0` to ensure events are sent immediately, with `await posthog.shutdown()` called in the `finally` block of each script. A `posthog.identify()` call was added in `index.ts` using the current OS username as the distinct ID. Exception autocapture is enabled in both files, and the main error handler in `index.ts` also calls `posthog.captureException()` explicitly. PostHog credentials are read from environment variables (`POSTHOG_API_KEY`, `POSTHOG_HOST`) set in `.env`.

| Event | Description | File |
|---|---|---|
| `agent created` | Fired when a new Anthropic managed agent is successfully created, capturing agent ID, name, model, and version. | `index.ts` |
| `environment created` | Fired when a new cloud environment is created for running agent sessions. | `index.ts` |
| `session started` | Fired when a new agent session is started, linking the agent and environment. | `index.ts` |
| `message sent` | Fired when the user sends an initial message to the agent session. | `index.ts` |
| `agent tool used` | Fired each time the agent invokes a tool during a session, capturing the tool name. | `index.ts` |
| `session completed` | Fired when the agent finishes and the session becomes idle. | `index.ts` |
| `script error` | Fired via `captureException` when an unhandled error occurs during script execution. | `index.ts` |
| `rate limit hit` | Fired when a 429 response is received, capturing model, request count, elapsed time, and rate limit headers. | `rate-limit.ts` |

## Next steps

We've built some insights and a dashboard for you to keep an eye on agent behavior, based on the events we just instrumented:

- [Analytics basics (wizard) — Dashboard](https://us.posthog.com/project/471990/dashboard/1716620)
- [Agent session lifecycle](https://us.posthog.com/project/471990/insights/O7mDsJpe) — Trends for agent created, session started, and session completed over time
- [Agent workflow completion funnel](https://us.posthog.com/project/471990/insights/Y8ryVa7N) — Conversion funnel: agent created → session started → message sent → session completed
- [Agent tool usage trend](https://us.posthog.com/project/471990/insights/B2qsaw3f) — How often the agent invokes tools during sessions
- [Rate limit hits](https://us.posthog.com/project/471990/insights/khA6l80Z) — Number of Anthropic API rate limit events over time

## Verify before merging

- [ ] Run a full production build (the wizard only verified the files it touched) and fix any lint or type errors introduced by the generated code.
- [ ] Run the test suite — call sites that were rewritten or instrumented may need updated mocks or fixtures.
- [ ] Add `POSTHOG_API_KEY` and `POSTHOG_HOST` to `.env.example` (or your team's bootstrap script) so collaborators know what to set.
- [ ] Confirm the returning-visitor path also calls `identify` — a handler that only identifies on fresh login can leave returning sessions on anonymous distinct IDs.

### Agent skill

We've left an agent skill folder in your project. You can use this context for further agent development when using Claude Code. This will help ensure the model provides the most up-to-date approaches for integrating PostHog.

# Contributing

## Workflow

1. Branch off `main`: `feat/...`, `fix/...`, `docs/...`, `chore/...`.
2. Make the change; keep PRs focused.
3. Run the quality gates locally (below).
4. Open a PR with a clear description and link any related task/issue.
5. CI must be green; at least one review before merge.

## Quality gates (run before every PR)

```bash
npm run typecheck
npm run build
cd src-tauri && cargo test && cargo clippy -- -D warnings
```

## Code style

**TypeScript / React**

- Strict TS, no `any` in new code. Explicit prop interfaces.
- Function components only. Side effects in `useEffect`; memoize derived data.
- All OS access goes through `src/lib/tauri.ts` — never `invoke` directly in a component.
- Match the surrounding code's naming and density. Format with Prettier (config added in M1).

**Rust**

- Every `#[tauri::command]` returns `Result<T, String>`.
- Validate any webview-supplied path with `resolve()` before disk access.
- Add a `#[cfg(test)]` test for new command logic (especially parsing).
- `rustfmt` + `cargo clippy` clean.

## Commits

Imperative, scoped, present tense:

```
git: parse rename entries in porcelain status
fs: reject path traversal in resolve()
ui: persist active tab per workspace
docs: add release/notarization guide
```

## Where things live

See [ARCHITECTURE.md](./ARCHITECTURE.md) for the layout and [IPC_API.md](./IPC_API.md) before adding a backend command. New product-scope decisions go in the relevant doc, not just the PR description.

## Out of scope (by product decision)

- Application accounts / login (IWE is local-first; GitHub sign-in is push-only).
- Embedded AI providers (AI is run via CLIs in the integrated terminal).

Propose changes to scope in an issue before building.

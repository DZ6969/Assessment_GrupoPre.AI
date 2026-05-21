# AI Usage

This solution was developed with assistance from AI tools (GitHub Copilot and
ChatGPT/Claude). I am disclosing the nature of that assistance in line with
Grupo PRE.AI's request.

## What AI was used for

- **Project scaffolding** — proposing the initial layout (`src/domain/...`,
  `tests/...`), the `package.json` scripts, the `tsconfig.json` strict options,
  and the Vitest configuration.
- **First-pass implementation** — drafting the iterative traversal in
  `traversal.ts`, the anomaly-aware analyzer in `categoryService.ts`, and the
  deep-clone + detach/append flow used by `moveCategory`.
- **Test suggestions** — proposing the matrix of edge cases per phase
  (inactive ancestors, alphabetic ordering, deep search, cycle detection,
  self-move, descendant move, etc.).
- **Documentation drafts** — generating the initial structure of `README.md`
  with the complexity table and the assumptions list.

## What was reviewed and decided manually

- **Domain semantics** — what counts as a leaf, when an active branch with no
  active descendants should still produce a path, how cycles vs. duplicate ids
  should be reported separately. These were judgment calls and were validated
  against the assessment's specification.
- **Error model** — the choice to expose stable `AnomalyCode` and `ErrorCode`
  string unions (so callers can switch on them) rather than parsing messages.
- **Defensive boundaries** — deciding that the analyzer is permissive and
  reports while it walks, but `moveCategory` refuses to operate on unsafe
  structures. The test suite enforces both behaviors.
- **Iterative traversal** — the explicit-stack approach was kept (instead of a
  cleaner recursive version) specifically because the spec requires resilience
  on deep trees.
- **Immutability of `moveCategory`** — tests assert the input is unchanged via
  `JSON.stringify` snapshots, so the deep-clone strategy is verifiable rather
  than assumed.
- **Final code, naming, comments and commit messages** — all reviewed and
  edited by hand. The responsibility for correctness, maintainability and the
  decisions reflected in this codebase is mine.

## What AI was *not* used for

- Choosing whether to use AI at all, or how to disclose it (this file).
- Final acceptance of the test outcomes — I ran the suite and read each
  failure/passing assertion to confirm semantics matched the spec, rather than
  trusting AI-generated tests blindly.

## Tools

- GitHub Copilot (inline completions while editing).
- A conversational LLM (Claude / ChatGPT class) for design discussion and
  initial drafts.

No proprietary, customer or production data was shared with any AI tool.

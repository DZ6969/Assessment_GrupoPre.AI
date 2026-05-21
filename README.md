# Assessment Grupo PRE.AI — Category Tree Domain

Backend technical assessment. Pure TypeScript domain library that operates on a
category tree (a forest of `CategoryNode` objects), with no database and no
HTTP layer. The focus is correctness, defensive handling of imperfect data, and
clear separation of concerns.

## Stack

- Node.js (>= 18)
- TypeScript (strict)
- Vitest

## Layout

```
src/
  domain/
    types.ts            # CategoryNode, CategorySearchResult, TreeAnalysisReport...
    errors.ts           # DomainError + stable error codes
    validators.ts       # Pure predicates (isValidId, isValidName, ...)
    traversal.ts        # Iterative walkers with cycle protection
    categoryService.ts  # Public operations (Phases 1–4)
  index.ts              # Public re-exports + small demo
tests/
  categoryService.test.ts
```

## Install

```bash
npm install
```

## Run tests

```bash
npm test
```

## Build

```bash
npm run build
```

The compiled output lands in `dist/`.

## Demo

```bash
npm run dev
```

## Public API

```ts
getActiveLeafPaths(structure: CategoryNode[]): string[]
findCategoryById(structure: CategoryNode[], id: number): CategorySearchResult | null
analyzeCategoryTree(structure: CategoryNode[]): TreeAnalysisReport
moveCategory(structure: CategoryNode[], categoryId: number, newParentId: number): CategoryNode[]
```

## Phases completed

- **Phase 1** — `getActiveLeafPaths`: returns full paths to active leaves only,
  excluding any branch where an ancestor is inactive. Output is alphabetically
  sorted via `localeCompare`.
- **Phase 2** — `findCategoryById`: iterative search returning the original
  reference, `path` (array), `pathString` (`"a/b/c"`), depth, parent id and
  `isLeaf`. Returns `null` when not found and never mutates the input. Both
  representations of the path are exposed: the array is convenient for
  programmatic use, the string matches the example in the spec.
- **Phase 3** — `analyzeCategoryTree`: iterative analyzer that produces a
  `TreeAnalysisReport` with active leaf paths, node counts, max depth and a list
  of `TreeAnomaly` entries. Tolerates malformed input without crashing.
- **Phase 4** — `moveCategory`: pure move operation. Rejects unsafe structures
  (duplicate ids, cycles), forbids moving roots, self-moves, descendant moves
  and missing parents. Returns a fresh deep-cloned forest; the input is never
  mutated.

## Anomaly codes

`INVALID_NODE`, `INVALID_ID`, `DUPLICATE_ID`, `INVALID_NAME`,
`INVALID_SUBCATEGORIES`, `NULL_CHILD`, `CYCLE_DETECTED`.

Each anomaly carries `{ code, id?, path?, detail }`.

## Error codes (`DomainError.code`)

`INVALID_STRUCTURE`, `NODE_NOT_FOUND`, `PARENT_NOT_FOUND`, `CANNOT_MOVE_ROOT`,
`CANNOT_MOVE_TO_SELF`, `CANNOT_MOVE_TO_DESCENDANT`, `UNSAFE_STRUCTURE`.

## Assumptions

- Input is a forest (array of root nodes), not a single root.
- A node is a "leaf" when `subcategories` is an empty array. An active node
  whose only children are all inactive is also considered a leaf for the
  purposes of `getActiveLeafPaths` (it has no active descendant path).
- Names are trimmed before being concatenated into a path. Empty/whitespace
  names are flagged as `INVALID_NAME`.
- Cycles are only detected by repeated **object reference** identity. Two
  distinct objects sharing the same `id` are reported as `DUPLICATE_ID`, not as
  a cycle.
- The analyzer reports anomalies but keeps walking siblings — partial reports
  are preferred over hard failures.
- `moveCategory` requires a structurally safe tree (no duplicate ids, no
  cycles). It is the responsibility of the caller to fix issues surfaced by
  `analyzeCategoryTree` first.

## Key design decisions

- **Iterative traversals (explicit stacks)** in `traversal.ts` and the analyzer
  to mitigate stack-overflow risks on very deep trees.
- **Cycle protection by object identity** using a `Set<object>`, both during
  analysis and during the safety pre-check used by `moveCategory`.
- **Immutability for `moveCategory`** via `deepCloneForest` before the
  detach/append step. Tests assert that the original input is byte-identical
  before and after via `JSON.stringify` comparison.
- **Single source of truth for codes**: `AnomalyCode` and `ErrorCodes` are
  exported so callers can switch on them instead of parsing messages.
- **Permissive analyzer, strict mover**: the analyzer keeps walking through
  malformed data; the mover refuses to operate when basic invariants can't be
  trusted.

## Complexity

Let `N` = number of nodes and `D` = max depth.

| Operation              | Time   | Space             |
|------------------------|--------|-------------------|
| `getActiveLeafPaths`   | O(N)   | O(D) stack + O(L) output (L active leaves) |
| `findCategoryById`     | O(N)   | O(D)              |
| `analyzeCategoryTree`  | O(N)   | O(N) (id and ref sets) |
| `moveCategory`         | O(N)   | O(N) (deep clone) |

## Mitigating very deep trees

- All public operations use **iterative walks with an explicit stack**, not
  recursion, so a 100k-deep tree does not blow the JS call stack.
- Reference-identity cycle detection bounds the walk to `O(N)` even when an
  adversarial tree reuses objects.
- `getActiveLeafPaths` keeps a `Set` of seen references so a cycle along an
  active path simply truncates that branch instead of looping.

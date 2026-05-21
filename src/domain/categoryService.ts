import type {
  CategoryNode,
  CategorySearchResult,
  TreeAnalysisReport,
  TreeAnomaly,
} from "./types.js";
import { DomainError, ErrorCodes } from "./errors.js";
import {
  isObject,
  isStrictlyValidNode,
  isValidActive,
  isValidId,
  isValidName,
  isValidSubcategories,
} from "./validators.js";
import { searchById, walkForest } from "./traversal.js";

/**
 * Phase 1 — Active leaf paths.
 *
 * Returns `Parent/Child/...` strings, one per active leaf, where every
 * ancestor on the path is also active. Output is sorted alphabetically.
 *
 * Invalid sub-branches are skipped silently here (use analyzeCategoryTree
 * for diagnostics).
 *
 * Time: O(N).  Space: O(D) for the iteration stack, where D = max depth.
 */
export function getActiveLeafPaths(structure: CategoryNode[]): string[] {
  if (!Array.isArray(structure)) return [];

  const paths: string[] = [];
  const seen = new Set<object>();

  const walk = (node: unknown, ancestors: string[]): void => {
    if (!isObject(node)) return;
    if (seen.has(node)) return;
    seen.add(node);

    const typed = node as unknown as CategoryNode;
    if (!isValidActive(typed.active) || !typed.active) return;
    if (!isValidName(typed.name)) return;

    const path = [...ancestors, typed.name.trim()];
    const subs = typed.subcategories;

    if (!isValidSubcategories(subs) || subs.length === 0) {
      paths.push(path.join("/"));
      return;
    }

    let activeChildCount = 0;
    for (const child of subs) {
      if (
        isObject(child) &&
        isValidActive((child as CategoryNode).active) &&
        (child as CategoryNode).active
      ) {
        activeChildCount++;
        walk(child, path);
      }
    }

    if (activeChildCount === 0) {
      paths.push(path.join("/"));
    }
  };

  for (const root of structure) walk(root, []);

  return paths.sort((a, b) => a.localeCompare(b));
}

/**
 * Phase 2 — Find a category by id at any depth.
 * Returns null if not found. Does not mutate the tree.
 *
 * Time: O(N) worst case. Space: O(D).
 */
export function findCategoryById(
  structure: CategoryNode[],
  id: number,
): CategorySearchResult | null {
  if (!isValidId(id)) return null;
  return searchById(structure, id);
}

/**
 * Phase 3 — Analyze the tree, reporting anomalies without crashing.
 *
 * The analyzer:
 *  - never enters infinite loops (cycles detected by reference identity);
 *  - reports anomalies with `code`, optional `id`/`path` and `detail`;
 *  - cuts a branch when a cycle is detected, but keeps walking siblings;
 *  - counts only structurally valid nodes (id, name, active, subcategories);
 *  - reports DUPLICATE_ID once per repeated occurrence after the first.
 */
export function analyzeCategoryTree(
  structure: CategoryNode[],
): TreeAnalysisReport {
  const anomalies: TreeAnomaly[] = [];
  let totalValidNodes = 0;
  let activeNodes = 0;
  let inactiveNodes = 0;
  let maxDepth = 0;

  const seenIds = new Set<number>();

  if (!Array.isArray(structure)) {
    return {
      activeLeafPaths: [],
      totalValidNodes: 0,
      activeNodes: 0,
      inactiveNodes: 0,
      maxDepth: 0,
      anomalies: [
        {
          code: "INVALID_NODE",
          detail: "Top-level structure must be an array of CategoryNode.",
        },
      ],
    };
  }

  // Iterative DFS for analysis. Uses reference set for cycle detection.
  type Frame = {
    node: unknown;
    path: string[];
    depth: number;
  };
  const seenRefs = new Set<object>();
  const stack: Frame[] = [];
  for (let i = structure.length - 1; i >= 0; i--) {
    stack.push({ node: structure[i], path: [], depth: 0 });
  }

  while (stack.length > 0) {
    const { node, path, depth } = stack.pop()!;

    if (!isObject(node)) {
      anomalies.push({
        code: node === null ? "NULL_CHILD" : "INVALID_NODE",
        path: [...path],
        detail:
          node === null
            ? "Encountered a null child."
            : `Encountered non-object node: ${typeof node}.`,
      });
      continue;
    }

    if (seenRefs.has(node)) {
      const id = isValidId((node as unknown as CategoryNode).id)
        ? (node as unknown as CategoryNode).id
        : undefined;
      anomalies.push({
        code: "CYCLE_DETECTED",
        ...(id !== undefined ? { id } : {}),
        path: [...path],
        detail: "Cycle detected by repeated object reference; branch cut.",
      });
      continue;
    }
    seenRefs.add(node);

    const typed = node as unknown as CategoryNode;
    let nodeIsValid = true;

    if (!isValidId(typed.id)) {
      anomalies.push({
        code: "INVALID_ID",
        path: [...path],
        detail: `Invalid id: ${String(typed.id)}.`,
      });
      nodeIsValid = false;
    } else if (seenIds.has(typed.id)) {
      anomalies.push({
        code: "DUPLICATE_ID",
        id: typed.id,
        path: [...path],
        detail: `Duplicate id ${typed.id}.`,
      });
    } else {
      seenIds.add(typed.id);
    }

    let nameForPath = "";
    if (!isValidName(typed.name)) {
      anomalies.push({
        code: "INVALID_NAME",
        ...(isValidId(typed.id) ? { id: typed.id } : {}),
        path: [...path],
        detail: "Name must be a non-empty string.",
      });
      nodeIsValid = false;
    } else {
      nameForPath = typed.name.trim();
    }

    const nextPath =
      nameForPath.length > 0 ? [...path, nameForPath] : [...path];

    if (!isValidActive(typed.active)) {
      nodeIsValid = false;
    }

    const subs = typed.subcategories;
    if (!isValidSubcategories(subs)) {
      anomalies.push({
        code: "INVALID_SUBCATEGORIES",
        ...(isValidId(typed.id) ? { id: typed.id } : {}),
        path: [...path],
        detail: "subcategories must be an array.",
      });
      nodeIsValid = false;
    }

    if (nodeIsValid) {
      totalValidNodes++;
      if (typed.active) activeNodes++;
      else inactiveNodes++;
      if (depth > maxDepth) maxDepth = depth;
    }

    if (Array.isArray(subs)) {
      for (let i = subs.length - 1; i >= 0; i--) {
        stack.push({ node: subs[i], path: nextPath, depth: depth + 1 });
      }
    }
  }

  return {
    activeLeafPaths: getActiveLeafPaths(structure),
    totalValidNodes,
    activeNodes,
    inactiveNodes,
    maxDepth,
    anomalies,
  };
}

/**
 * Phase 4 — Move a category under a new parent. Pure (returns a clone).
 *
 * Rules:
 *  - rejects when the structure is unsafe (duplicate ids or cycles);
 *  - cannot move a root;
 *  - cannot move a node onto itself or one of its descendants;
 *  - cannot move to a non-existent parent;
 *  - the moved node is appended at the end of the new parent's subcategories.
 *
 * Throws DomainError with a stable code when a rule is violated.
 */
export function moveCategory(
  structure: CategoryNode[],
  categoryId: number,
  newParentId: number,
): CategoryNode[] {
  if (!Array.isArray(structure)) {
    throw new DomainError(
      ErrorCodes.INVALID_STRUCTURE,
      "structure must be an array of CategoryNode.",
    );
  }
  if (!isValidId(categoryId) || !isValidId(newParentId)) {
    throw new DomainError(
      ErrorCodes.INVALID_STRUCTURE,
      "categoryId and newParentId must be finite numbers.",
    );
  }

  assertSafeStructure(structure);

  const target = findCategoryById(structure, categoryId);
  if (!target) {
    throw new DomainError(
      ErrorCodes.NODE_NOT_FOUND,
      `Category ${categoryId} does not exist.`,
    );
  }
  if (target.parentId === null) {
    throw new DomainError(
      ErrorCodes.CANNOT_MOVE_ROOT,
      `Cannot move root category ${categoryId}.`,
    );
  }
  if (categoryId === newParentId) {
    throw new DomainError(
      ErrorCodes.CANNOT_MOVE_TO_SELF,
      "A category cannot be moved under itself.",
    );
  }

  const newParent = findCategoryById(structure, newParentId);
  if (!newParent) {
    throw new DomainError(
      ErrorCodes.PARENT_NOT_FOUND,
      `New parent ${newParentId} does not exist.`,
    );
  }

  if (isDescendantOf(target.node, newParentId)) {
    throw new DomainError(
      ErrorCodes.CANNOT_MOVE_TO_DESCENDANT,
      `Category ${newParentId} is a descendant of ${categoryId}.`,
    );
  }

  // Deep clone, then mutate the clone: detach target from its old parent and
  // append a clone of the (sub)tree to the new parent's subcategories.
  const cloned = deepCloneForest(structure);
  const movedSubtree = detachFromParent(cloned, categoryId);
  if (!movedSubtree) {
    // Defensive: shouldn't happen because we already located target.
    throw new DomainError(
      ErrorCodes.NODE_NOT_FOUND,
      `Category ${categoryId} could not be detached.`,
    );
  }

  const clonedNewParent = findInForest(cloned, newParentId);
  if (!clonedNewParent) {
    throw new DomainError(
      ErrorCodes.PARENT_NOT_FOUND,
      `New parent ${newParentId} not found in cloned tree.`,
    );
  }
  clonedNewParent.subcategories.push(movedSubtree);

  return cloned;
}

// ---------- internals ----------

function assertSafeStructure(structure: CategoryNode[]): void {
  const ids = new Set<number>();

  walkForest(
    structure,
    (node) => {
      const id = (node as CategoryNode).id;
      if (!isValidId(id)) {
        throw new DomainError(
          ErrorCodes.UNSAFE_STRUCTURE,
          "Found a node with an invalid id; cannot operate safely.",
        );
      }
      if (ids.has(id)) {
        throw new DomainError(
          ErrorCodes.UNSAFE_STRUCTURE,
          `Duplicate id ${id} makes the structure unsafe to mutate.`,
        );
      }
      ids.add(id);
      return true;
    },
    (_frame, reason) => {
      if (reason === "cycle") {
        throw new DomainError(
          ErrorCodes.UNSAFE_STRUCTURE,
          "Cycle detected; cannot operate safely.",
        );
      }
    },
  );
}

function isDescendantOf(root: CategoryNode, candidateId: number): boolean {
  if (!isStrictlyValidNode(root)) return false;
  if (root.id === candidateId) return true;
  let found = false;
  walkForest([root], (node) => {
    if (found) return false;
    if ((node as CategoryNode).id === candidateId) {
      found = true;
      return false;
    }
    return true;
  });
  return found;
}

function deepCloneForest(forest: CategoryNode[]): CategoryNode[] {
  return forest.map(deepCloneNode);
}

function deepCloneNode(node: CategoryNode): CategoryNode {
  const subs = Array.isArray(node.subcategories)
    ? node.subcategories.map(deepCloneNode)
    : [];
  return {
    id: node.id,
    name: node.name,
    active: node.active,
    subcategories: subs,
  };
}

function detachFromParent(
  forest: CategoryNode[],
  id: number,
): CategoryNode | null {
  // Search top-level — not allowed to move roots, but detach must still
  // never operate on roots; assertSafeStructure + findCategoryById already
  // ruled that out, so we only descend into subcategories.
  const stack: CategoryNode[] = [...forest];
  while (stack.length > 0) {
    const current = stack.pop()!;
    if (!Array.isArray(current.subcategories)) continue;
    const idx = current.subcategories.findIndex((c) => c && c.id === id);
    if (idx >= 0) {
      const [removed] = current.subcategories.splice(idx, 1);
      return removed ?? null;
    }
    for (const child of current.subcategories) {
      if (child) stack.push(child);
    }
  }
  return null;
}

function findInForest(
  forest: CategoryNode[],
  id: number,
): CategoryNode | null {
  const stack: CategoryNode[] = [...forest];
  while (stack.length > 0) {
    const current = stack.pop()!;
    if (current.id === id) return current;
    if (Array.isArray(current.subcategories)) {
      for (const child of current.subcategories) {
        if (child) stack.push(child);
      }
    }
  }
  return null;
}

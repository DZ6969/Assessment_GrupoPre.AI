import type { CategoryNode, CategorySearchResult } from "./types.js";
import { isObject, isValidSubcategories } from "./validators.js";

/**
 * Iterative pre-order walk over a forest, with cycle protection by reference.
 *
 * The visitor receives the node, its trimmed-name path (root → node) and depth.
 * Returning `false` stops descending into that node's children (used to cut a
 * branch when the analyzer detects a cycle or invalid container).
 *
 * Iterative + explicit stack is used to avoid stack overflows on very deep
 * trees that would otherwise crash recursive walkers.
 */
export type Visitor = (
  node: CategoryNode,
  path: string[],
  depth: number,
  parent: CategoryNode | null,
) => boolean | void;

export type InvalidReason = "not-object" | "cycle";

export interface InvalidFrame {
  path: string[];
  depth: number;
  parent: CategoryNode | null;
}

export function walkForest(
  forest: unknown,
  visit: Visitor,
  onInvalid?: (frame: InvalidFrame, reason: InvalidReason) => void,
): void {
  if (!Array.isArray(forest)) return;

  const seen = new Set<object>();
  type Frame = {
    node: unknown;
    path: string[];
    depth: number;
    parent: CategoryNode | null;
  };
  const stack: Frame[] = [];

  for (let i = forest.length - 1; i >= 0; i--) {
    stack.push({ node: forest[i], path: [], depth: 0, parent: null });
  }

  while (stack.length > 0) {
    const frame = stack.pop()!;
    const { node, path, depth, parent } = frame;

    if (!isObject(node)) {
      onInvalid?.({ path, depth, parent }, "not-object");
      continue;
    }

    if (seen.has(node)) {
      onInvalid?.({ path, depth, parent }, "cycle");
      continue;
    }
    seen.add(node);

    const typed = node as unknown as CategoryNode;
    const rawName = typed.name;
    const name = typeof rawName === "string" ? rawName.trim() : "";
    const nextPath = name.length > 0 ? [...path, name] : [...path, ""];

    const cont = visit(typed, nextPath, depth, parent);
    if (cont === false) continue;

    if (!isValidSubcategories(typed.subcategories)) continue;

    for (let i = typed.subcategories.length - 1; i >= 0; i--) {
      stack.push({
        node: typed.subcategories[i],
        path: nextPath,
        depth: depth + 1,
        parent: typed,
      });
    }
  }
}

/**
 * Iterative search by id. Returns the original node reference, its path,
 * depth, parent id and whether it is a leaf. Does not mutate the tree.
 */
export function searchById(
  forest: CategoryNode[],
  id: number,
): CategorySearchResult | null {
  if (!Array.isArray(forest)) return null;

  let result: CategorySearchResult | null = null;

  walkForest(forest, (node, path, depth, parent) => {
    if (result) return false;
    if ((node as CategoryNode).id === id) {
      const subs = (node as CategoryNode).subcategories;
      result = {
        node: node as CategoryNode,
        path: [...path],
        depth,
        parentId: parent ? parent.id : null,
        isLeaf: Array.isArray(subs) ? subs.length === 0 : true,
      };
      return false;
    }
    return true;
  });

  return result;
}

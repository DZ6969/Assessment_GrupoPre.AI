import type {
  CategoryNode,
  CategorySearchResult,
} from "./types.js";
import {
  isObject,
  isValidActive,
  isValidId,
  isValidName,
  isValidSubcategories,
} from "./validators.js";
import { searchById } from "./traversal.js";

/**
 * Phase 1 — Active leaf paths.
 *
 * Returns `Parent/Child/...` strings, one per active leaf, where every
 * ancestor on the path is also active. Output is sorted alphabetically.
 *
 * Time: O(N).  Space: O(D) for the iteration stack.
 */
export function getActiveLeafPaths(structure: CategoryNode[]): string[] {
  if (!Array.isArray(structure)) return [];

  const paths: string[] = [];
  const seen = new Set<object>();

  const walk = (node: unknown, ancestors: string[]): void => {
    if (!isObject(node)) return;
    if (seen.has(node)) return;
    seen.add(node);

    const typed = node as CategoryNode;
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

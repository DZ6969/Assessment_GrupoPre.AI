import type { CategoryNode } from "./types.js";

/**
 * Lightweight, non-throwing predicates used by analysis and operations.
 * The "looks like a node" check is intentionally permissive: we want the
 * analyzer to keep walking even when individual fields are malformed,
 * so we only require the value to be a non-null object.
 */

export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function isValidId(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function isValidName(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function isValidSubcategories(
  value: unknown,
): value is CategoryNode[] {
  return Array.isArray(value);
}

export function isValidActive(value: unknown): value is boolean {
  return typeof value === "boolean";
}

/**
 * A "structurally valid" node that is safe to recurse into without further
 * defensive checks. Intended for the strict operations (move) where partial
 * structures are unacceptable.
 */
export function isStrictlyValidNode(value: unknown): value is CategoryNode {
  if (!isObject(value)) return false;
  return (
    isValidId(value["id"]) &&
    isValidName(value["name"]) &&
    isValidActive(value["active"]) &&
    isValidSubcategories(value["subcategories"])
  );
}

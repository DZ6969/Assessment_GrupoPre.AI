/**
 * Domain types for the category tree.
 *
 * A category tree is a forest (array of root nodes). Each node has:
 *  - id: numeric identifier (must be a finite number, ideally unique).
 *  - name: human-readable label.
 *  - active: whether the node is enabled.
 *  - subcategories: child nodes (always an array, possibly empty).
 */
export interface CategoryNode {
  id: number;
  name: string;
  active: boolean;
  subcategories: CategoryNode[];
}

/**
 * Result of locating a node in the tree.
 *
 *  - node: the original reference (not a clone).
 *  - path: array of trimmed names from root to node, inclusive.
 *  - pathString: same path joined with "/" (matches the spec example).
 *  - depth: 0 for a root node, +1 per level.
 *  - parentId: id of the parent node, or null if `node` is a root.
 *  - isLeaf: true when subcategories is empty.
 */
export interface CategorySearchResult {
  node: CategoryNode;
  path: string[];
  pathString: string;
  depth: number;
  parentId: number | null;
  isLeaf: boolean;
}

export type AnomalyCode =
  | "INVALID_NODE"
  | "INVALID_ID"
  | "DUPLICATE_ID"
  | "INVALID_NAME"
  | "INVALID_SUBCATEGORIES"
  | "NULL_CHILD"
  | "CYCLE_DETECTED";

export interface TreeAnomaly {
  code: AnomalyCode;
  id?: number;
  path?: string[];
  detail: string;
}

export interface TreeAnalysisReport {
  activeLeafPaths: string[];
  totalValidNodes: number;
  activeNodes: number;
  inactiveNodes: number;
  maxDepth: number;
  anomalies: TreeAnomaly[];
}

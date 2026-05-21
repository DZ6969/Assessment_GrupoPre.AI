import { describe, it, expect } from "vitest";
import {
  analyzeCategoryTree,
  findCategoryById,
  getActiveLeafPaths,
  moveCategory,
} from "../src/domain/categoryService.js";
import { DomainError, ErrorCodes } from "../src/domain/errors.js";
import type { CategoryNode } from "../src/domain/types.js";

const sampleTree = (): CategoryNode[] => [
  {
    id: 1,
    name: "Electrónica",
    active: true,
    subcategories: [
      { id: 2, name: "Celulares", active: true, subcategories: [] },
      { id: 3, name: "Accesorios", active: true, subcategories: [] },
      {
        id: 4,
        name: "Computadoras",
        active: true,
        subcategories: [
          { id: 5, name: "Laptops", active: true, subcategories: [] },
          { id: 6, name: "Servidores", active: false, subcategories: [] },
        ],
      },
      {
        id: 7,
        name: "Audio",
        active: false,
        subcategories: [
          { id: 8, name: "Audífonos", active: true, subcategories: [] },
        ],
      },
    ],
  },
  {
    id: 100,
    name: "Hogar",
    active: true,
    subcategories: [
      { id: 101, name: "Cocina", active: true, subcategories: [] },
    ],
  },
];

// ---------- Phase 1 ----------

describe("getActiveLeafPaths", () => {
  it("returns paths for active leaves only", () => {
    const paths = getActiveLeafPaths(sampleTree());
    expect(paths).toEqual([
      "Electrónica/Accesorios",
      "Electrónica/Celulares",
      "Electrónica/Computadoras/Laptops",
      "Hogar/Cocina",
    ]);
  });

  it("excludes branches where any ancestor is inactive", () => {
    const paths = getActiveLeafPaths(sampleTree());
    expect(paths.some((p) => p.includes("Audio"))).toBe(false);
    expect(paths.some((p) => p.includes("Servidores"))).toBe(false);
  });

  it("returns paths sorted alphabetically", () => {
    const tree: CategoryNode[] = [
      {
        id: 1,
        name: "Z-Root",
        active: true,
        subcategories: [
          { id: 2, name: "Beta", active: true, subcategories: [] },
          { id: 3, name: "Alpha", active: true, subcategories: [] },
        ],
      },
      {
        id: 4,
        name: "A-Root",
        active: true,
        subcategories: [
          { id: 5, name: "Charlie", active: true, subcategories: [] },
        ],
      },
    ];
    expect(getActiveLeafPaths(tree)).toEqual([
      "A-Root/Charlie",
      "Z-Root/Alpha",
      "Z-Root/Beta",
    ]);
  });

  it("treats an active node with no active children as a leaf", () => {
    const tree: CategoryNode[] = [
      {
        id: 1,
        name: "Root",
        active: true,
        subcategories: [
          { id: 2, name: "OnlyInactive", active: false, subcategories: [] },
        ],
      },
    ];
    expect(getActiveLeafPaths(tree)).toEqual(["Root"]);
  });
});

// ---------- Phase 2 ----------

describe("findCategoryById", () => {
  it("locates a deep node and reports correct metadata", () => {
    const result = findCategoryById(sampleTree(), 5);
    expect(result).not.toBeNull();
    expect(result!.node.name).toBe("Laptops");
    expect(result!.path).toEqual(["Electrónica", "Computadoras", "Laptops"]);
    expect(result!.pathString).toBe("Electrónica/Computadoras/Laptops");
    expect(result!.depth).toBe(2);
    expect(result!.parentId).toBe(4);
    expect(result!.isLeaf).toBe(true);
  });

  it("locates a root node with parentId = null and depth = 0", () => {
    const result = findCategoryById(sampleTree(), 1);
    expect(result).not.toBeNull();
    expect(result!.parentId).toBeNull();
    expect(result!.depth).toBe(0);
    expect(result!.pathString).toBe("Electrónica");
    expect(result!.isLeaf).toBe(false);
  });

  it("returns null when the id does not exist", () => {
    expect(findCategoryById(sampleTree(), 9999)).toBeNull();
  });

  it("does not mutate the original tree", () => {
    const tree = sampleTree();
    const snapshot = JSON.stringify(tree);
    findCategoryById(tree, 5);
    expect(JSON.stringify(tree)).toBe(snapshot);
  });
});

// ---------- Phase 3 ----------

describe("analyzeCategoryTree", () => {
  it("counts active/inactive nodes and max depth on a clean tree", () => {
    const report = analyzeCategoryTree(sampleTree());
    expect(report.anomalies).toEqual([]);
    // 1, 2, 3, 4, 5, 6, 7, 8, 100, 101 = 10 nodes
    expect(report.totalValidNodes).toBe(10);
    expect(report.activeNodes).toBe(8);
    expect(report.inactiveNodes).toBe(2);
    expect(report.maxDepth).toBe(2);
    expect(report.activeLeafPaths.length).toBeGreaterThan(0);
  });

  it("reports INVALID_NODE for non-object entries", () => {
    const tree = [42 as unknown as CategoryNode];
    const report = analyzeCategoryTree(tree);
    expect(report.anomalies.some((a) => a.code === "INVALID_NODE")).toBe(true);
  });

  it("reports NULL_CHILD when an entry is null", () => {
    const tree = [
      {
        id: 1,
        name: "Root",
        active: true,
        subcategories: [null as unknown as CategoryNode],
      },
    ];
    const report = analyzeCategoryTree(tree);
    expect(report.anomalies.some((a) => a.code === "NULL_CHILD")).toBe(true);
  });

  it("reports INVALID_SUBCATEGORIES when subcategories is not an array", () => {
    const tree = [
      {
        id: 1,
        name: "Root",
        active: true,
        subcategories: "nope" as unknown as CategoryNode[],
      },
    ];
    const report = analyzeCategoryTree(tree);
    expect(
      report.anomalies.some((a) => a.code === "INVALID_SUBCATEGORIES"),
    ).toBe(true);
  });

  it("reports INVALID_NAME for empty or non-string names", () => {
    const tree: CategoryNode[] = [
      {
        id: 1,
        name: "   ",
        active: true,
        subcategories: [],
      },
    ];
    const report = analyzeCategoryTree(tree);
    expect(report.anomalies.some((a) => a.code === "INVALID_NAME")).toBe(true);
  });

  it("reports INVALID_ID for non-finite ids", () => {
    const tree = [
      {
        id: NaN as unknown as number,
        name: "Root",
        active: true,
        subcategories: [],
      },
    ];
    const report = analyzeCategoryTree(tree);
    expect(report.anomalies.some((a) => a.code === "INVALID_ID")).toBe(true);
  });

  it("reports DUPLICATE_ID once per repeated occurrence", () => {
    const tree: CategoryNode[] = [
      {
        id: 1,
        name: "A",
        active: true,
        subcategories: [{ id: 1, name: "B", active: true, subcategories: [] }],
      },
    ];
    const report = analyzeCategoryTree(tree);
    expect(report.anomalies.filter((a) => a.code === "DUPLICATE_ID")).toHaveLength(1);
  });

  it("detects cycles by reference and does not loop", () => {
    const root: CategoryNode = {
      id: 1,
      name: "Root",
      active: true,
      subcategories: [],
    };
    const child: CategoryNode = {
      id: 2,
      name: "Child",
      active: true,
      subcategories: [],
    };
    root.subcategories.push(child);
    child.subcategories.push(root); // cycle

    const report = analyzeCategoryTree([root]);
    expect(report.anomalies.some((a) => a.code === "CYCLE_DETECTED")).toBe(true);
    // sanity: function returned, no infinite loop
    expect(report.totalValidNodes).toBeGreaterThan(0);
  });
});

// ---------- Phase 4 ----------

describe("moveCategory", () => {
  it("moves a node to a new parent and appends it at the end", () => {
    const tree = sampleTree();
    const result = moveCategory(tree, 5, 100); // Laptops -> Hogar
    const hogar = result.find((n) => n.id === 100)!;
    expect(hogar.subcategories.map((c) => c.id)).toEqual([101, 5]);
    const electronica = result.find((n) => n.id === 1)!;
    const computadoras = electronica.subcategories.find((c) => c.id === 4)!;
    expect(computadoras.subcategories.map((c) => c.id)).toEqual([6]);
  });

  it("does not mutate the original tree", () => {
    const tree = sampleTree();
    const snapshot = JSON.stringify(tree);
    moveCategory(tree, 5, 100);
    expect(JSON.stringify(tree)).toBe(snapshot);
  });

  it("rejects moving a root", () => {
    expect(() => moveCategory(sampleTree(), 1, 100)).toThrow(DomainError);
    try {
      moveCategory(sampleTree(), 1, 100);
    } catch (e) {
      expect((e as DomainError).code).toBe(ErrorCodes.CANNOT_MOVE_ROOT);
    }
  });

  it("rejects moving a node onto itself", () => {
    try {
      moveCategory(sampleTree(), 4, 4);
      throw new Error("expected to throw");
    } catch (e) {
      expect((e as DomainError).code).toBe(ErrorCodes.CANNOT_MOVE_TO_SELF);
    }
  });

  it("rejects moving a node under one of its descendants", () => {
    try {
      moveCategory(sampleTree(), 4, 5); // Computadoras -> Laptops
      throw new Error("expected to throw");
    } catch (e) {
      expect((e as DomainError).code).toBe(
        ErrorCodes.CANNOT_MOVE_TO_DESCENDANT,
      );
    }
  });

  it("rejects moving to a non-existent parent", () => {
    try {
      moveCategory(sampleTree(), 5, 9999);
      throw new Error("expected to throw");
    } catch (e) {
      expect((e as DomainError).code).toBe(ErrorCodes.PARENT_NOT_FOUND);
    }
  });

  it("rejects unsafe structure with duplicate ids", () => {
    const tree: CategoryNode[] = [
      {
        id: 1,
        name: "A",
        active: true,
        subcategories: [
          { id: 1, name: "Dup", active: true, subcategories: [] },
          { id: 2, name: "Other", active: true, subcategories: [] },
        ],
      },
    ];
    try {
      moveCategory(tree, 2, 1);
      throw new Error("expected to throw");
    } catch (e) {
      expect((e as DomainError).code).toBe(ErrorCodes.UNSAFE_STRUCTURE);
    }
  });

  it("rejects unsafe structure with cycles", () => {
    const root: CategoryNode = {
      id: 1,
      name: "Root",
      active: true,
      subcategories: [],
    };
    const child: CategoryNode = {
      id: 2,
      name: "Child",
      active: true,
      subcategories: [],
    };
    root.subcategories.push(child);
    child.subcategories.push(root);

    try {
      moveCategory([root], 2, 1);
      throw new Error("expected to throw");
    } catch (e) {
      expect((e as DomainError).code).toBe(ErrorCodes.UNSAFE_STRUCTURE);
    }
  });
});

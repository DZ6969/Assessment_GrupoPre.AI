import { describe, it, expect } from "vitest";
import {
  findCategoryById,
  getActiveLeafPaths,
} from "../src/domain/categoryService.js";
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
});

describe("findCategoryById", () => {
  it("locates a deep node and reports correct metadata", () => {
    const result = findCategoryById(sampleTree(), 5);
    expect(result).not.toBeNull();
    expect(result!.node.name).toBe("Laptops");
    expect(result!.path).toEqual(["Electrónica", "Computadoras", "Laptops"]);
    expect(result!.depth).toBe(2);
    expect(result!.parentId).toBe(4);
    expect(result!.isLeaf).toBe(true);
  });

  it("locates a root node with parentId = null and depth = 0", () => {
    const result = findCategoryById(sampleTree(), 1);
    expect(result).not.toBeNull();
    expect(result!.parentId).toBeNull();
    expect(result!.depth).toBe(0);
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

/**
 * Demo manual de la API. Ejecutar con:  npx tsx demo.ts
 *
 * No forma parte de la solución entregada — sólo sirve para ver las cuatro
 * operaciones del dominio en acción contra un árbol de ejemplo.
 */
import {
  getActiveLeafPaths,
  analyzeCategoryTree,
  findCategoryById,
  moveCategory,
  DomainError,
} from "./src/index.js";
import type { CategoryNode } from "./src/index.js";

const tree: CategoryNode[] = [
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

const section = (title: string): void => {
  console.log("\n" + "=".repeat(60));
  console.log(title);
  console.log("=".repeat(60));
};

section("1) getActiveLeafPaths");
for (const p of getActiveLeafPaths(tree)) console.log("  -", p);

section("2) findCategoryById(5)  // Laptops");
console.log(JSON.stringify(findCategoryById(tree, 5), null, 2));

section("2b) findCategoryById(9999)  // inexistente");
console.log(findCategoryById(tree, 9999));

section("3) analyzeCategoryTree (árbol limpio)");
console.log(JSON.stringify(analyzeCategoryTree(tree), null, 2));

section("3b) analyzeCategoryTree con anomalías");
const dirtyTree = [
  {
    id: 1,
    name: "Root",
    active: true,
    subcategories: [
      { id: 1, name: "DupId", active: true, subcategories: [] },
      { id: 2, name: "   ", active: true, subcategories: [] },
      null as unknown as CategoryNode,
    ],
  },
];
console.log(JSON.stringify(analyzeCategoryTree(dirtyTree), null, 2));

section("4) moveCategory(5, 100)  // Laptops -> Hogar");
const moved = moveCategory(tree, 5, 100);
console.log("Hogar después del move:");
console.log(JSON.stringify(moved.find((n) => n.id === 100), null, 2));
console.log("\nÁrbol original (NO debe haber cambiado):");
console.log(
  "  Computadoras todavía tiene id 5?",
  tree[0]?.subcategories
    .find((c) => c.id === 4)
    ?.subcategories.some((c) => c.id === 5),
);

section("4b) moveCategory rechaza casos inválidos");
const cases: Array<[string, number, number]> = [
  ["Mover root (id=1)", 1, 100],
  ["Mover sobre sí mismo", 4, 4],
  ["Mover bajo descendiente", 4, 5],
  ["Padre inexistente", 5, 9999],
];
for (const [label, from, to] of cases) {
  try {
    moveCategory(tree, from, to);
    console.log(`  ${label}: NO lanzó error (inesperado)`);
  } catch (e) {
    if (e instanceof DomainError) {
      console.log(`  ${label} -> ${e.code}: ${e.message}`);
    } else {
      console.log(`  ${label} -> error inesperado:`, e);
    }
  }
}

console.log("\nDemo completado.\n");

/**
 * Public entrypoint. Re-exports the domain API so consumers can import from a
 * single place. There is no HTTP layer in this assessment.
 */
export type {
  CategoryNode,
  CategorySearchResult,
  TreeAnalysisReport,
  TreeAnomaly,
  AnomalyCode,
} from "./domain/types.js";

export { DomainError, ErrorCodes } from "./domain/errors.js";

export {
  getActiveLeafPaths,
  findCategoryById,
  analyzeCategoryTree,
  moveCategory,
} from "./domain/categoryService.js";

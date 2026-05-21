/**
 * Public entrypoint. Re-exports the domain API. Phase 1 + Phase 2 for now.
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
} from "./domain/categoryService.js";

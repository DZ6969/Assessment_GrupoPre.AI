/**
 * Domain-level error. Carries a stable `code` for callers to switch on,
 * separate from the human-readable message.
 */
export class DomainError extends Error {
  public readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "DomainError";
    this.code = code;
  }
}

export const ErrorCodes = {
  INVALID_STRUCTURE: "INVALID_STRUCTURE",
  NODE_NOT_FOUND: "NODE_NOT_FOUND",
  PARENT_NOT_FOUND: "PARENT_NOT_FOUND",
  CANNOT_MOVE_ROOT: "CANNOT_MOVE_ROOT",
  CANNOT_MOVE_TO_SELF: "CANNOT_MOVE_TO_SELF",
  CANNOT_MOVE_TO_DESCENDANT: "CANNOT_MOVE_TO_DESCENDANT",
  UNSAFE_STRUCTURE: "UNSAFE_STRUCTURE",
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

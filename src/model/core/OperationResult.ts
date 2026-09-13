export interface OperationResult {
  success: boolean;
  message: string;
  type: "success" | "error" | "info";
}

/**
 * Creates a success operation result
 */
export function createSuccessResult(message: string): OperationResult {
  return {
    success: true,
    message,
    type: "success",
  };
}

/**
 * Creates an error operation result
 */
export function createErrorResult(message: string): OperationResult {
  return {
    success: false,
    message,
    type: "error",
  };
}

/**
 * Creates an info operation result
 */
export function createInfoResult(message: string): OperationResult {
  return {
    success: true,
    message,
    type: "info",
  };
}

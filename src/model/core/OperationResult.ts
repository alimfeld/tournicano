export interface OperationDetails {
  added?: number;
  duplicates?: number;
  ignored?: number;
  groups?: number;
  errors?: string[];
}

export interface OperationResult {
  success: boolean;
  message: string;
  type: "success" | "error" | "info" | "warning";
  details?: OperationDetails;
}

/**
 * Creates a success operation result
 */
export function createSuccessResult(message: string, details?: OperationDetails): OperationResult {
  return {
    success: true,
    message,
    type: "success",
    details,
  };
}

/**
 * Creates an error operation result
 */
export function createErrorResult(message: string, details?: OperationDetails): OperationResult {
  return {
    success: false,
    message,
    type: "error",
    details,
  };
}

/**
 * Creates an info operation result
 */
export function createInfoResult(message: string, details?: OperationDetails): OperationResult {
  return {
    success: true,
    message,
    type: "info",
    details,
  };
}

/**
 * Creates a warning operation result
 */
export function createWarningResult(message: string, details?: OperationDetails): OperationResult {
  return {
    success: true,
    message,
    type: "warning",
    details,
  };
}

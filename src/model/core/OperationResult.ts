export interface OperationDetails {
  affected?: number;
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
 * Pluralizes a word based on count
 * @param count - The count to check
 * @param singular - The singular form of the word
 * @param plural - Optional plural form (defaults to singular + 's')
 * @returns The word in correct plural form
 */
export function pluralize(count: number, singular: string, plural?: string): string {
  if (count === 1) {
    return singular;
  }
  return plural ?? `${singular}s`;
}

/**
 * Creates a formatted operation result message
 * @param result - The operation result to format
 * @returns A formatted message string
 */
export function formatOperationMessage(result: OperationResult): string {
  return result.message;
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

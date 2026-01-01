// Fisher-Yates shuffle
export const shuffle = <T>(array: T[]): T[] => {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};

// Debounce function - delays execution until after wait ms have elapsed since last call
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const debounce = <T extends (...args: any[]) => void>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  
  return (...args: Parameters<T>) => {
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      func(...args);
    }, wait);
  };
};

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
 * Pluralizes a word based on count and includes the count in the result
 * @param count - The count to include
 * @param singular - The singular form of the word
 * @param plural - Optional plural form (defaults to singular + 's')
 * @returns The count followed by the word in correct plural form
 * @example pluralizeWithCount(1, "player") // "1 player"
 * @example pluralizeWithCount(5, "player") // "5 players"
 * @example pluralizeWithCount(2, "match", "matches") // "2 matches"
 */
export function pluralizeWithCount(count: number, singular: string, plural?: string): string {
  return `${count} ${pluralize(count, singular, plural)}`;
}

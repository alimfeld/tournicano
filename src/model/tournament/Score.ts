import { Score } from "./Tournament.ts";

export interface ScoreParseResult {
  success: boolean;
  score?: Score;
  error?: string;
}

export interface ScoreInputValidation {
  canAddDigit: boolean;
  canAddColon: boolean;
  needsColon: boolean;
  isComplete: boolean;
}

/**
 * Parse a score string in format "11:9" into a Score tuple
 */
export function parseScore(input: string): ScoreParseResult {
  if (!input.includes(":")) {
    return {
      success: false,
      error: "Score must include colon separator",
    };
  }

  const parts = input.split(":");
  if (parts.length !== 2) {
    return {
      success: false,
      error: "Score must have exactly two parts",
    };
  }

  // Both parts must have at least one digit
  if (parts[0] === "" || parts[1] === "") {
    return {
      success: false,
      error: "Both scores are required",
    };
  }

  const scoreA = parseInt(parts[0]);
  const scoreB = parseInt(parts[1]);

  if (isNaN(scoreA) || isNaN(scoreB)) {
    return {
      success: false,
      error: "Scores must be numbers",
    };
  }

  if (scoreA < 0 || scoreB < 0) {
    return {
      success: false,
      error: "Scores cannot be negative",
    };
  }

  return {
    success: true,
    score: [scoreA, scoreB],
  };
}

/**
 * Format a Score tuple as a string "11:9"
 */
export function formatScore(score: Score): string {
  return `${score[0]}:${score[1]}`;
}

/**
 * Validate the current state of score input
 */
export function validateScoreInput(input: string, maxDigitsPerSide: number = 2): ScoreInputValidation {
  const parts = input.split(":");

  if (parts.length === 1) {
    // Before colon
    const canAddDigit = parts[0].length < maxDigitsPerSide;
    const needsColon = parts[0].length === maxDigitsPerSide;

    return {
      canAddDigit,
      canAddColon: input.length > 0,
      needsColon,
      isComplete: false,
    };
  } else if (parts.length === 2) {
    // After colon
    const canAddDigit = parts[1].length < maxDigitsPerSide;
    const isComplete = parts[1].length > 0;

    return {
      canAddDigit,
      canAddColon: false,
      needsColon: false,
      isComplete,
    };
  }

  // Invalid state (multiple colons)
  return {
    canAddDigit: false,
    canAddColon: false,
    needsColon: false,
    isComplete: false,
  };
}

/**
 * Add a digit to score input, handling auto-colon insertion
 */
export function addDigitToScore(currentInput: string, digit: string, maxDigitsPerSide: number = 2): string {
  const parts = currentInput.split(":");

  // Check if we can add before colon
  if (parts.length === 1) {
    const currentLength = parts[0].length;

    // If already at max, add colon instead
    if (currentLength >= maxDigitsPerSide) {
      return currentInput + ":";
    }

    // Add the digit
    let newInput = currentInput + digit;

    // If we just reached max, auto-add colon
    if (currentLength + 1 === maxDigitsPerSide) {
      newInput += ":";
    }

    return newInput;
  }

  // After colon - check if we can add
  if (parts.length === 2) {
    if (parts[1].length >= maxDigitsPerSide) {
      return currentInput;
    }
    return currentInput + digit;
  }

  // Invalid state
  return currentInput;
}

/**
 * Format score for display (shows "--:--" for empty input)
 */
export function formatScoreDisplay(input: string): string {
  if (input.length === 0) {
    return "";
  }
  return input;
}

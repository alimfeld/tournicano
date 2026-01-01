import { expect, test } from "vitest";
import {
  parseScore,
  formatScore,
  validateScoreInput,
  addDigitToScore,
  formatScoreDisplay,
} from "./Score.ts";

// parseScore tests
test("parseScore with valid score", () => {
  const result = parseScore("11:9");
  expect(result.success).toBe(true);
  expect(result.score).toEqual([11, 9]);
  expect(result.error).toBeUndefined();
});

test("parseScore with single digit scores", () => {
  const result = parseScore("5:3");
  expect(result.success).toBe(true);
  expect(result.score).toEqual([5, 3]);
});

test("parseScore with zero scores", () => {
  const result = parseScore("0:0");
  expect(result.success).toBe(true);
  expect(result.score).toEqual([0, 0]);
});

test("parseScore without colon", () => {
  const result = parseScore("119");
  expect(result.success).toBe(false);
  expect(result.error).toContain("colon");
});

test("parseScore with empty parts", () => {
  const result1 = parseScore(":9");
  expect(result1.success).toBe(false);
  expect(result1.error).toContain("required");
  
  const result2 = parseScore("11:");
  expect(result2.success).toBe(false);
  expect(result2.error).toContain("required");
});

test("parseScore with non-numeric values", () => {
  const result = parseScore("a:b");
  expect(result.success).toBe(false);
  expect(result.error).toContain("numbers");
});

test("parseScore with negative scores", () => {
  const result = parseScore("-1:5");
  expect(result.success).toBe(false);
  expect(result.error).toContain("negative");
});

test("parseScore with multiple colons", () => {
  const result = parseScore("11:9:5");
  expect(result.success).toBe(false);
  expect(result.error).toContain("two parts");
});

// formatScore tests
test("formatScore formats correctly", () => {
  expect(formatScore([11, 9])).toBe("11:9");
  expect(formatScore([0, 0])).toBe("0:0");
  expect(formatScore([21, 19])).toBe("21:19");
});

// validateScoreInput tests
test("validateScoreInput before colon", () => {
  const validation = validateScoreInput("1");
  expect(validation.canAddDigit).toBe(true);
  expect(validation.canAddColon).toBe(true);
  expect(validation.needsColon).toBe(false);
  expect(validation.isComplete).toBe(false);
});

test("validateScoreInput at 2 digits before colon", () => {
  const validation = validateScoreInput("11");
  expect(validation.canAddDigit).toBe(false);
  expect(validation.canAddColon).toBe(true);
  expect(validation.needsColon).toBe(true);
  expect(validation.isComplete).toBe(false);
});

test("validateScoreInput after colon with no digits", () => {
  const validation = validateScoreInput("11:");
  expect(validation.canAddDigit).toBe(true);
  expect(validation.canAddColon).toBe(false);
  expect(validation.needsColon).toBe(false);
  expect(validation.isComplete).toBe(false);
});

test("validateScoreInput after colon with one digit", () => {
  const validation = validateScoreInput("11:9");
  expect(validation.canAddDigit).toBe(true);
  expect(validation.canAddColon).toBe(false);
  expect(validation.needsColon).toBe(false);
  expect(validation.isComplete).toBe(true);
});

test("validateScoreInput after colon with two digits", () => {
  const validation = validateScoreInput("11:09");
  expect(validation.canAddDigit).toBe(false);
  expect(validation.canAddColon).toBe(false);
  expect(validation.isComplete).toBe(true);
});

test("validateScoreInput with empty input", () => {
  const validation = validateScoreInput("");
  expect(validation.canAddDigit).toBe(true);
  expect(validation.canAddColon).toBe(false);
  expect(validation.isComplete).toBe(false);
});

// addDigitToScore tests
test("addDigitToScore adds digit before colon", () => {
  expect(addDigitToScore("", "1")).toBe("1");
  expect(addDigitToScore("1", "1")).toBe("11:");
});

test("addDigitToScore auto-adds colon after 2 digits", () => {
  const result = addDigitToScore("1", "1");
  expect(result).toBe("11:");
});

test("addDigitToScore adds digit after colon", () => {
  expect(addDigitToScore("11:", "9")).toBe("11:9");
  expect(addDigitToScore("11:9", "5")).toBe("11:95");
});

test("addDigitToScore respects max digits", () => {
  expect(addDigitToScore("11", "5")).toBe("11:"); // At max digits, auto-add colon
  expect(addDigitToScore("11:95", "3")).toBe("11:95"); // Already complete, no change
});

test("addDigitToScore with custom max digits", () => {
  expect(addDigitToScore("111", "2", 3)).toBe("111:");
  expect(addDigitToScore("1", "2", 1)).toBe("1:");
});

// formatScoreDisplay tests
test("formatScoreDisplay with empty input", () => {
  expect(formatScoreDisplay("")).toBe("--:--");
});

test("formatScoreDisplay with input", () => {
  expect(formatScoreDisplay("11")).toBe("11");
  expect(formatScoreDisplay("11:")).toBe("11:");
  expect(formatScoreDisplay("11:9")).toBe("11:9");
});

// Integration test: simulating user input
test("score input simulation", () => {
  let input = "";
  
  // User types "1"
  input = addDigitToScore(input, "1");
  expect(input).toBe("1");
  expect(validateScoreInput(input).canAddDigit).toBe(true);
  
  // User types "1" again - should auto-add colon
  input = addDigitToScore(input, "1");
  expect(input).toBe("11:");
  expect(validateScoreInput(input).canAddDigit).toBe(true);
  expect(validateScoreInput(input).canAddColon).toBe(false);
  
  // User types "9"
  input = addDigitToScore(input, "9");
  expect(input).toBe("11:9");
  expect(validateScoreInput(input).isComplete).toBe(true);
  
  // Parse the final score
  const result = parseScore(input);
  expect(result.success).toBe(true);
  expect(result.score).toEqual([11, 9]);
});

import { expect, test } from "vitest";
import { pluralize, pluralizeWithCount } from "./Util.ts";
import {
  formatOperationMessage,
  createSuccessResult,
  createErrorResult,
  createInfoResult,
  createWarningResult,
  type OperationResult,
} from "./OperationResult.ts";

test("pluralize with count of 1 returns singular", () => {
  expect(pluralize(1, "player")).toBe("player");
  expect(pluralize(1, "group")).toBe("group");
  expect(pluralize(1, "match")).toBe("match");
});

test("pluralize with count of 0 returns plural", () => {
  expect(pluralize(0, "player")).toBe("players");
  expect(pluralize(0, "group")).toBe("groups");
});

test("pluralize with count > 1 returns plural", () => {
  expect(pluralize(2, "player")).toBe("players");
  expect(pluralize(5, "group")).toBe("groups");
  expect(pluralize(10, "round")).toBe("rounds");
});

test("pluralize with custom plural form", () => {
  expect(pluralize(1, "person", "people")).toBe("person");
  expect(pluralize(2, "person", "people")).toBe("people");
  expect(pluralize(0, "person", "people")).toBe("people");
});

test("pluralizeWithCount includes the count", () => {
  expect(pluralizeWithCount(1, "player")).toBe("1 player");
  expect(pluralizeWithCount(5, "player")).toBe("5 players");
  expect(pluralizeWithCount(0, "player")).toBe("0 players");
});

test("pluralizeWithCount with custom plural form", () => {
  expect(pluralizeWithCount(1, "match", "matches")).toBe("1 match");
  expect(pluralizeWithCount(2, "match", "matches")).toBe("2 matches");
  expect(pluralizeWithCount(10, "person", "people")).toBe("10 people");
});

test("formatOperationMessage returns the message", () => {
  const result: OperationResult = {
    success: true,
    message: "Test message",
    type: "success",
  };
  expect(formatOperationMessage(result)).toBe("Test message");
});

test("createSuccessResult creates success result", () => {
  const result = createSuccessResult("Operation successful");
  expect(result.success).toBe(true);
  expect(result.type).toBe("success");
  expect(result.message).toBe("Operation successful");
  expect(result.details).toBeUndefined();
});

test("createSuccessResult with details", () => {
  const result = createSuccessResult("Added players", { added: 5, duplicates: 2 });
  expect(result.success).toBe(true);
  expect(result.type).toBe("success");
  expect(result.message).toBe("Added players");
  expect(result.details?.added).toBe(5);
  expect(result.details?.duplicates).toBe(2);
});

test("createErrorResult creates error result", () => {
  const result = createErrorResult("Operation failed");
  expect(result.success).toBe(false);
  expect(result.type).toBe("error");
  expect(result.message).toBe("Operation failed");
});

test("createErrorResult with details", () => {
  const result = createErrorResult("Validation errors", {
    errors: ["Name is required", "Invalid group"],
  });
  expect(result.success).toBe(false);
  expect(result.type).toBe("error");
  expect(result.details?.errors).toHaveLength(2);
});

test("createInfoResult creates info result", () => {
  const result = createInfoResult("No changes made");
  expect(result.success).toBe(true);
  expect(result.type).toBe("info");
  expect(result.message).toBe("No changes made");
});

test("createWarningResult creates warning result", () => {
  const result = createWarningResult("Partial success", { added: 3, ignored: 2 });
  expect(result.success).toBe(true);
  expect(result.type).toBe("warning");
  expect(result.message).toBe("Partial success");
  expect(result.details?.added).toBe(3);
  expect(result.details?.ignored).toBe(2);
});

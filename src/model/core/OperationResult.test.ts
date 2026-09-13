import { expect, test } from "vitest";
import {
  createSuccessResult,
  createErrorResult,
  createInfoResult,
} from "./OperationResult.ts";

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

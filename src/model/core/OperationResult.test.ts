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
});

test("createErrorResult creates error result", () => {
  const result = createErrorResult("Operation failed");
  expect(result.success).toBe(false);
  expect(result.type).toBe("error");
  expect(result.message).toBe("Operation failed");
});

test("createInfoResult creates info result", () => {
  const result = createInfoResult("No changes made");
  expect(result.success).toBe(true);
  expect(result.type).toBe("info");
  expect(result.message).toBe("No changes made");
});

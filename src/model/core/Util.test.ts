import { expect, test } from "vitest";
import { pluralize, pluralizeWithCount } from "./Util.ts";

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
import { expect, test, vi } from "vitest";
import { debounce, pluralize, pluralizeWithCount } from "./Util.ts";

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

test("debounce runs the pending call synchronously on flush", () => {
  vi.useFakeTimers();
  try {
    const fn = vi.fn();
    const debounced = debounce(fn, 100);

    debounced("a");
    expect(fn).not.toHaveBeenCalled();

    debounced.flush();
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith("a");

    // Timer is cancelled: no second fire after the wait elapses
    vi.advanceTimersByTime(200);
    expect(fn).toHaveBeenCalledTimes(1);
  } finally {
    vi.useRealTimers();
  }
});

test("debounce flush is a no-op when nothing is pending", () => {
  vi.useFakeTimers();
  try {
    const fn = vi.fn();
    const debounced = debounce(fn, 100);

    debounced.flush();
    expect(fn).not.toHaveBeenCalled();

    // Flush only fires the latest pending call, not stale ones
    debounced("a");
    debounced("b");
    debounced.flush();
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith("b");
  } finally {
    vi.useRealTimers();
  }
});
import { expect, test } from "vitest";
import {
  Americano,
  AmericanoMixed,
  GroupBattle,
  GroupBattleMixed,
  MatchingSpec,
  MatchUpGroupMode,
  Mexicano,
  TeamUpGroupMode,
  TeamUpPerformanceMode,
  Tournicano,
  matchingSpecEquals,
} from "./MatchingSpec.ts";

test("matchingSpecEquals should return true for identical specs", () => {
  const spec1: MatchingSpec = {
    teamUp: {
      varietyFactor: 1,
      performanceFactor: 0.5,
      performanceMode: "rank" as unknown as TeamUpPerformanceMode,
      groupFactor: 0,
      groupMode: "none" as unknown as TeamUpGroupMode,
    },
    matchUp: {
      varietyFactor: 1,
      performanceFactor: 0.5,
      groupFactor: 0,
      groupMode: "none" as unknown as MatchUpGroupMode,
    },
  };

  const spec2: MatchingSpec = {
    teamUp: {
      varietyFactor: 1,
      performanceFactor: 0.5,
      performanceMode: "rank" as unknown as TeamUpPerformanceMode,
      groupFactor: 0,
      groupMode: "none" as unknown as TeamUpGroupMode,
    },
    matchUp: {
      varietyFactor: 1,
      performanceFactor: 0.5,
      groupFactor: 0,
      groupMode: "none" as unknown as MatchUpGroupMode,
    },
  };

  expect(matchingSpecEquals(spec1, spec2)).toBe(true);
});

test("matchingSpecEquals should return true for same object", () => {
  const spec: MatchingSpec = Americano;
  expect(matchingSpecEquals(spec, spec)).toBe(true);
});

test("matchingSpecEquals should return true for predefined modes", () => {
  expect(matchingSpecEquals(Americano, Americano)).toBe(true);
  expect(matchingSpecEquals(Mexicano, Mexicano)).toBe(true);
  expect(matchingSpecEquals(Tournicano, Tournicano)).toBe(true);
});

test("matchingSpecEquals should return false when teamUp.varietyFactor differs", () => {
  const spec1: MatchingSpec = { ...Americano };
  const spec2: MatchingSpec = {
    ...Americano,
    teamUp: { ...Americano.teamUp, varietyFactor: 0.5 },
  };
  expect(matchingSpecEquals(spec1, spec2)).toBe(false);
});

test("matchingSpecEquals should return false when teamUp.performanceFactor differs", () => {
  const spec1: MatchingSpec = { ...Mexicano };
  const spec2: MatchingSpec = {
    ...Mexicano,
    teamUp: { ...Mexicano.teamUp, performanceFactor: 0.9 },
  };
  expect(matchingSpecEquals(spec1, spec2)).toBe(false);
});

test("matchingSpecEquals should return false when teamUp.performanceMode differs", () => {
  const spec1: MatchingSpec = { ...Mexicano };
  const spec2: MatchingSpec = {
    ...Mexicano,
    teamUp: { ...Mexicano.teamUp, performanceMode: "rank" as unknown as TeamUpPerformanceMode },
  };
  expect(matchingSpecEquals(spec1, spec2)).toBe(false);
});

test("matchingSpecEquals should return false when teamUp.groupFactor differs", () => {
  const spec1: MatchingSpec = { ...AmericanoMixed };
  const spec2: MatchingSpec = {
    ...AmericanoMixed,
    teamUp: { ...AmericanoMixed.teamUp, groupFactor: 0.5 },
  };
  expect(matchingSpecEquals(spec1, spec2)).toBe(false);
});

test("matchingSpecEquals should return false when teamUp.groupMode differs", () => {
  const spec1: MatchingSpec = { ...AmericanoMixed };
  const spec2: MatchingSpec = {
    ...AmericanoMixed,
    teamUp: { ...AmericanoMixed.teamUp, groupMode: "same" as unknown as TeamUpGroupMode },
  };
  expect(matchingSpecEquals(spec1, spec2)).toBe(false);
});

test("matchingSpecEquals should return false when matchUp.varietyFactor differs", () => {
  const spec1: MatchingSpec = { ...Americano };
  const spec2: MatchingSpec = {
    ...Americano,
    matchUp: { ...Americano.matchUp, varietyFactor: 0.5 },
  };
  expect(matchingSpecEquals(spec1, spec2)).toBe(false);
});

test("matchingSpecEquals should return false when matchUp.performanceFactor differs", () => {
  const spec1: MatchingSpec = { ...Mexicano };
  const spec2: MatchingSpec = {
    ...Mexicano,
    matchUp: { ...Mexicano.matchUp, performanceFactor: 0.9 },
  };
  expect(matchingSpecEquals(spec1, spec2)).toBe(false);
});

test("matchingSpecEquals should return false when matchUp.groupFactor differs", () => {
  const spec1: MatchingSpec = { ...AmericanoMixed };
  const spec2: MatchingSpec = {
    ...AmericanoMixed,
    matchUp: { ...AmericanoMixed.matchUp, groupFactor: 0.5 },
  };
  expect(matchingSpecEquals(spec1, spec2)).toBe(false);
});

test("matchingSpecEquals should return false when matchUp.groupMode differs", () => {
  const spec1: MatchingSpec = { ...GroupBattle };
  const spec2: MatchingSpec = {
    ...GroupBattle,
    matchUp: { ...GroupBattle.matchUp, groupMode: "mixed" as unknown as MatchUpGroupMode },
  };
  expect(matchingSpecEquals(spec1, spec2)).toBe(false);
});

test("matchingSpecEquals should distinguish between different predefined modes", () => {
  expect(matchingSpecEquals(Americano, Mexicano)).toBe(false);
  expect(matchingSpecEquals(Americano, AmericanoMixed)).toBe(false);
  expect(matchingSpecEquals(Mexicano, Tournicano)).toBe(false);
  expect(matchingSpecEquals(GroupBattle, GroupBattleMixed)).toBe(false);
});

test("matchingSpecEquals should compare balanceGroups", () => {
  const spec1 = { ...Americano, balanceGroups: true };
  const spec2 = { ...Americano, balanceGroups: false };
  const spec3 = { ...Americano }; // undefined

  expect(matchingSpecEquals(spec1, spec2)).toBe(false);
  expect(matchingSpecEquals(spec2, spec3)).toBe(true); // false === undefined treated as false
  expect(matchingSpecEquals(spec1, spec1)).toBe(true);
});

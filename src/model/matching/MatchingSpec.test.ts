import { expect, test } from "vitest";
import {
  Americano,
  AmericanoGroups,
  AmericanoMixed,
  GroupBattle,
  GroupBattleMixed,
  MatchingSpec,
  MatchUpGroupMode,
  Mexicano,
  MexicanoGroups,
  TeamUpGroupMode,
  TeamUpPerformanceMode,
  Tournicano,
  TournicanoGroups,
  TournicanoTeams,
  isValidMatchingSpec,
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

test("matchingSpecEquals should return true for predefined formats", () => {
  expect(matchingSpecEquals(Americano, Americano)).toBe(true);
  expect(matchingSpecEquals(Mexicano, Mexicano)).toBe(true);
  expect(matchingSpecEquals(Tournicano, Tournicano)).toBe(true);
  expect(matchingSpecEquals(TournicanoGroups, TournicanoGroups)).toBe(true);
  expect(matchingSpecEquals(AmericanoGroups, AmericanoGroups)).toBe(true);
  expect(matchingSpecEquals(MexicanoGroups, MexicanoGroups)).toBe(true);
});

test("matchingSpecEquals should return false when teamUp.varietyFactor differs", () => {
  const spec1: MatchingSpec = { ...Americano };
  const spec2: MatchingSpec = {
    ...Americano,
    teamUp: { ...Americano.teamUp!, varietyFactor: 0.5 },
  };
  expect(matchingSpecEquals(spec1, spec2)).toBe(false);
});

test("matchingSpecEquals should return false when teamUp.performanceFactor differs", () => {
  const spec1: MatchingSpec = { ...Mexicano };
  const spec2: MatchingSpec = {
    ...Mexicano,
    teamUp: { ...Mexicano.teamUp!, performanceFactor: 0.9 },
  };
  expect(matchingSpecEquals(spec1, spec2)).toBe(false);
});

test("matchingSpecEquals should return false when teamUp.performanceMode differs", () => {
  const spec1: MatchingSpec = { ...Mexicano };
  const spec2: MatchingSpec = {
    ...Mexicano,
    teamUp: { ...Mexicano.teamUp!, performanceMode: "rank" as unknown as TeamUpPerformanceMode },
  };
  expect(matchingSpecEquals(spec1, spec2)).toBe(false);
});

test("matchingSpecEquals should return false when teamUp.groupFactor differs", () => {
  const spec1: MatchingSpec = { ...AmericanoMixed };
  const spec2: MatchingSpec = {
    ...AmericanoMixed,
    teamUp: { ...AmericanoMixed.teamUp!, groupFactor: 0.5 },
  };
  expect(matchingSpecEquals(spec1, spec2)).toBe(false);
});

test("matchingSpecEquals should return false when teamUp.groupMode differs", () => {
  const spec1: MatchingSpec = { ...AmericanoMixed };
  const spec2: MatchingSpec = {
    ...AmericanoMixed,
    teamUp: { ...AmericanoMixed.teamUp!, groupMode: "same" as unknown as TeamUpGroupMode },
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

test("matchingSpecEquals should distinguish between different predefined formats", () => {
  expect(matchingSpecEquals(Americano, Mexicano)).toBe(false);
  expect(matchingSpecEquals(Americano, AmericanoMixed)).toBe(false);
  expect(matchingSpecEquals(Mexicano, Tournicano)).toBe(false);
  expect(matchingSpecEquals(Tournicano, TournicanoGroups)).toBe(false);
  expect(matchingSpecEquals(TournicanoGroups, AmericanoGroups)).toBe(false);
  expect(matchingSpecEquals(AmericanoGroups, MexicanoGroups)).toBe(false);
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

test("isValidMatchingSpec accepts all predefined formats", () => {
  expect(isValidMatchingSpec(Americano)).toBe(true);
  expect(isValidMatchingSpec(AmericanoMixed)).toBe(true);
  expect(isValidMatchingSpec(Mexicano)).toBe(true);
  expect(isValidMatchingSpec(Tournicano)).toBe(true);
  expect(isValidMatchingSpec(TournicanoTeams)).toBe(true); // no teamUp
  expect(isValidMatchingSpec(GroupBattleMixed)).toBe(true);
});

test("isValidMatchingSpec rejects malformed specs", () => {
  // Non-object
  expect(isValidMatchingSpec(null)).toBe(false);
  expect(isValidMatchingSpec(undefined)).toBe(false);
  expect(isValidMatchingSpec("Americano")).toBe(false);

  // Missing matchUp
  expect(isValidMatchingSpec({})).toBe(false);

  // matchUp missing required fields
  expect(isValidMatchingSpec({ matchUp: { varietyFactor: 100 } })).toBe(false);

  // Invalid enum values
  expect(isValidMatchingSpec({
    matchUp: {
      varietyFactor: 100,
      performanceFactor: 0,
      groupFactor: 0,
      groupMode: 99,
    },
  })).toBe(false);

  // Negative factor
  expect(isValidMatchingSpec({
    matchUp: {
      varietyFactor: -100,
      performanceFactor: 0,
      groupFactor: 0,
      groupMode: MatchUpGroupMode.SAME,
    },
  })).toBe(false);

  // Present but incomplete teamUp
  expect(isValidMatchingSpec({
    teamUp: { varietyFactor: 100 },
    matchUp: {
      varietyFactor: 100,
      performanceFactor: 0,
      groupFactor: 0,
      groupMode: MatchUpGroupMode.SAME,
    },
  })).toBe(false);

  // Non-boolean balanceGroups
  expect(isValidMatchingSpec({
    ...Americano,
    balanceGroups: "yes",
  })).toBe(false);
});

test("isValidMatchingSpec accepts any valid custom shape without restricting factors", () => {
  expect(isValidMatchingSpec({
    teamUp: {
      varietyFactor: 50,
      performanceFactor: 20,
      performanceMode: TeamUpPerformanceMode.AVERAGE,
      groupFactor: 30,
      groupMode: TeamUpGroupMode.PAIRED,
    },
    matchUp: {
      varietyFactor: 40,
      performanceFactor: 10,
      groupFactor: 50,
      groupMode: MatchUpGroupMode.CROSS,
    },
    balanceGroups: true,
  })).toBe(true);
});

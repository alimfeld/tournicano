import { expect } from "vitest";
import { test } from "../tournament/TestHelpers.ts";
import { TeamUpGroupMode } from "./MatchingSpec.ts";
import {
  curriedTeamUpGroupWeight,
  getPairingType,
  calculateViolationCount,
  PairingType,
} from "./WeightFunctions.ts";
import { Player } from "./Matching.ts";
import { Mutable } from "../core/Mutable.ts";

const createPlayer = (id: string, group: number): Player => ({
  id,
  group,
  winRatio: 0,
  plusMinus: 0,
  matchCount: 1,
  pauseCount: 0,
  lastPause: -1,
  partners: new Map(),
  opponents: new Map(),
  partnerGroups: [],
});

const setPartnerGroups = (player: Player, groups: number[]): void => {
  (player as Mutable<Player>).partnerGroups = groups;
};

test("getPairingType - returns PAIRED for perfect pairs", () => {
  expect(getPairingType(0, 1)).toBe(PairingType.PAIRED);
  expect(getPairingType(1, 0)).toBe(PairingType.PAIRED);
  expect(getPairingType(2, 3)).toBe(PairingType.PAIRED);
  expect(getPairingType(3, 2)).toBe(PairingType.PAIRED);
});

test("getPairingType - returns SAME_GROUP for same group", () => {
  expect(getPairingType(0, 0)).toBe(PairingType.SAME_GROUP);
  expect(getPairingType(1, 1)).toBe(PairingType.SAME_GROUP);
  expect(getPairingType(2, 2)).toBe(PairingType.SAME_GROUP);
});

test("getPairingType - returns WRONG_PAIRING for wrong pairs", () => {
  expect(getPairingType(1, 2)).toBe(PairingType.WRONG_PAIRING);
  expect(getPairingType(2, 1)).toBe(PairingType.WRONG_PAIRING);
  expect(getPairingType(0, 2)).toBe(PairingType.WRONG_PAIRING);
  expect(getPairingType(3, 0)).toBe(PairingType.WRONG_PAIRING);
});

test("calculateViolationCount - SAME mode counts cross-group partnerships", () => {
  const player = createPlayer("0", 0);
  setPartnerGroups(player, [5, 3, 2]); // g=0:5 (same), g=1:3 (violation), g=2:2 (violation)

  const violations = calculateViolationCount(player, TeamUpGroupMode.SAME);
  expect(violations).toBe(5); // g=1 (3) + g=2 (2) = 5
});

test("calculateViolationCount - SAME mode with no violations", () => {
  const player = createPlayer("0", 0);
  setPartnerGroups(player, [5, 0, 0]); // only same group partnerships

  const violations = calculateViolationCount(player, TeamUpGroupMode.SAME);
  expect(violations).toBe(0);
});

test("calculateViolationCount - PAIRED mode counts same-group and wrong-pairing", () => {
  const player = createPlayer("0", 0);
  setPartnerGroups(player, [5, 3, 0]); // g=0:5 (same group), g=1:3 (correct pair), g=2:0 (wrong pair block)

  const violations = calculateViolationCount(player, TeamUpGroupMode.PAIRED);
  // g=0 (SAME_GROUP) = 5 violations, g=1 (PAIRED) = 0, g=2 (WRONG_PAIRING) = 0
  expect(violations).toBe(5);
});

test("calculateViolationCount - PAIRED mode includes WRONG_PAIRING as violation", () => {
  const player = createPlayer("1", 1);
  setPartnerGroups(player, [3, 5, 3, 0]); // g=0:3 (WRONG_PAIRING), g=1:5 (SAME_GROUP), g=2:3 (PAIRED), g=3:0 (WRONG_PAIRING)

  const violations = calculateViolationCount(player, TeamUpGroupMode.PAIRED);
  // g=0 (WRONG_PAIRING) = 3, g=1 (SAME_GROUP) = 5, g=2 (PAIRED) = 0, g=3 (WRONG_PAIRING) = 0
  expect(violations).toBe(8); // 3 + 5 = 8
});

test("calculateViolationCount - empty partnerGroups returns 0", () => {
  const player = createPlayer("0", 0);
  setPartnerGroups(player, []);

  const sameViolations = calculateViolationCount(player, TeamUpGroupMode.SAME);
  const pairedViolations = calculateViolationCount(player, TeamUpGroupMode.PAIRED);

  expect(sameViolations).toBe(0);
  expect(pairedViolations).toBe(0);
});

test("curriedTeamUpGroupWeight - SAME mode returns higher penalty for larger group diff", () => {
  const weightFn = curriedTeamUpGroupWeight(TeamUpGroupMode.SAME);

  const playerA = createPlayer("0", 0);
  const playerB = createPlayer("1", 0);
  const playerC = createPlayer("2", 2);

  const sameGroup = weightFn({ entity: playerA }, { entity: playerB });
  const diffGroup = weightFn({ entity: playerA }, { entity: playerC });

  expect(Math.abs(sameGroup)).toBeLessThan(Math.abs(diffGroup));
});

test("curriedTeamUpGroupWeight - PAIRED mode returns 0 for perfect pairs", () => {
  const weightFn = curriedTeamUpGroupWeight(TeamUpGroupMode.PAIRED);

  const player0 = createPlayer("0", 0);
  const player1 = createPlayer("1", 1);

  const weight = weightFn({ entity: player0 }, { entity: player1 });
  expect(weight).toBe(0);
});

test("curriedTeamUpGroupWeight - PAIRED mode applies scaling based on violations", () => {
  const weightFn = curriedTeamUpGroupWeight(TeamUpGroupMode.PAIRED);

  const playerWithViolations = createPlayer("0", 0);
  setPartnerGroups(playerWithViolations, [0, 0, 10]); // 10 violations with group 2 (WRONG_PAIRING)

  const playerNoViolations = createPlayer("2", 2);
  setPartnerGroups(playerNoViolations, [0, 0, 0]);

  const weight = weightFn({ entity: playerWithViolations }, { entity: playerNoViolations });

  // Base penalty for WRONG_PAIRING is -2, with scaling multiplier > 1 it should be more negative
  expect(weight).toBeLessThan(-2);
});

test("curriedTeamUpGroupWeight - no scaling for players with zero violations", () => {
  const weightFn = curriedTeamUpGroupWeight(TeamUpGroupMode.PAIRED);

  const playerA = createPlayer("0", 0);
  setPartnerGroups(playerA, [0, 0, 0]);
  const playerB = createPlayer("1", 1);
  setPartnerGroups(playerB, [0, 0, 0]);

  const weight = weightFn({ entity: playerA }, { entity: playerB });

  // Perfect pair should return 0 (no penalty)
  expect(weight).toBe(0);
});

test("curriedTeamUpGroupWeight - scaling applies to same-group penalty in PAIRED", () => {
  const weightFn = curriedTeamUpGroupWeight(TeamUpGroupMode.PAIRED);

  const playerA = createPlayer("0", 0);
  setPartnerGroups(playerA, [10, 0, 0]); // 10 violations (same group)

  const playerB = createPlayer("0", 0); // Same group = same-group penalty
  setPartnerGroups(playerB, [0, 0, 0]); // no violations

  const weight = weightFn({ entity: playerA }, { entity: playerB });

  // Base penalty is -1 (SAME_GROUP), scaled by multiplier > 1
  expect(weight).toBeLessThan(-1);
  expect(weight).toBeGreaterThan(-7);
});

test("curriedTeamUpGroupWeight - PAIRED mode returns WRONG_PAIRING penalty for wrong pairs", () => {
  const weightFn = curriedTeamUpGroupWeight(TeamUpGroupMode.PAIRED);

  const player1 = createPlayer("1", 1);
  const player2 = createPlayer("2", 2);

  const weight = weightFn({ entity: player1 }, { entity: player2 });

  // Base penalty for wrong pairing is -2
  expect(weight).toBe(-2);
});

test("curriedTeamUpGroupWeight - scaling factor distributes violations fairly", () => {
  const weightFn = curriedTeamUpGroupWeight(TeamUpGroupMode.PAIRED);

  // Player A has many violations (should get higher penalty to discourage)
  const playerA = createPlayer("0", 0);
  setPartnerGroups(playerA, [0, 0, 50]); // 50 violations

  // Player B has few violations (should get lower penalty to allow)
  const playerB = createPlayer("2", 2);
  setPartnerGroups(playerB, [0, 0, 5]); // 5 violations

  const weight = weightFn({ entity: playerA }, { entity: playerB });

  // With high violations on one side, multiplier should be higher than 1
  // Base for WRONG_PAIRING is -2, scaled
  expect(weight).toBeLessThan(-2);
});

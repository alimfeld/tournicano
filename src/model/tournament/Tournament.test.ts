import { expect, test as vitest } from "vitest";
import { test, runTournament } from "./TestHelpers.ts";
import { tournamentFactory } from "./Tournament.impl.ts";
import { validatePlayerName, Tournament } from "./Tournament.ts";
import {
  Americano,
  AmericanoMixed,
  AmericanoMixedBalanced,
  Mexicano,
} from "../matching/MatchingSpec.ts";

test("should update performance through rounds", ({ players, scores }) => {
  const tournament = runTournament(players);
  tournament.createRound();
  tournament.createRound();
  tournament.createRound();
  const firstRound = tournament.rounds.at(0)!;
  firstRound.matches.forEach((match, i) => match.submitScore(scores[0][i]));
  const firstRoundPerf = firstRound
    .standings()
    .map((ranked) => [ranked.player.winRatio, ranked.player.plusMinus]);
  tournament.rounds.forEach((round) =>
    expect(
      round
        .standings()
        .map((ranked) => [ranked.player.winRatio, ranked.player.plusMinus]),
    ).toStrictEqual(firstRoundPerf),
  );
});

test("should return hasAllScoresSubmitted - empty tournament", () => {
  const tournament = tournamentFactory.create();

  // Empty tournament (no rounds) should return true (vacuous truth)
  expect(tournament.hasAllScoresSubmitted).toBe(true);
  expect(tournament.rounds).toHaveLength(0);
});

test("should return hasAllScoresSubmitted - progressive score entry", ({ players }) => {
  const tournament = runTournament(players);

  // Create 3 rounds with 2 matches each
  const round1 = tournament.createRound(Americano, 2);
  const round2 = tournament.createRound(Americano, 2);
  const round3 = tournament.createRound(Americano, 2);

  expect(tournament.rounds).toHaveLength(3);

  // Initially, no scores submitted
  expect(tournament.hasAllScoresSubmitted).toBe(false);

  // Submit scores for round 1 (2 out of 6 matches)
  round1.matches[0].submitScore([11, 5]);
  round1.matches[1].submitScore([8, 11]);
  expect(tournament.hasAllScoresSubmitted).toBe(false);

  // Submit scores for round 2 (4 out of 6 matches total)
  round2.matches[0].submitScore([11, 7]);
  round2.matches[1].submitScore([6, 11]);
  expect(tournament.hasAllScoresSubmitted).toBe(false);

  // Submit scores for round 3 (6 out of 6 matches total)
  round3.matches[0].submitScore([11, 3]);
  round3.matches[1].submitScore([9, 11]);
  expect(tournament.hasAllScoresSubmitted).toBe(true);

  // Clear one score
  round2.matches[0].submitScore(undefined);
  expect(tournament.hasAllScoresSubmitted).toBe(false);

  // Re-submit the score
  round2.matches[0].submitScore([11, 7]);
  expect(tournament.hasAllScoresSubmitted).toBe(true);
});

test("should return hasAllScoresSubmitted - single round", ({ players }) => {
  const tournament = runTournament(players);

  const round = tournament.createRound(Americano, 2);
  expect(tournament.hasAllScoresSubmitted).toBe(false);

  // Submit first match score
  round.matches[0].submitScore([11, 5]);
  expect(tournament.hasAllScoresSubmitted).toBe(false);

  // Submit second match score
  round.matches[1].submitScore([8, 11]);
  expect(tournament.hasAllScoresSubmitted).toBe(true);
});

test("should return hasAllScoresSubmitted - after round deletion", ({ players, scores }) => {
  const tournament = runTournament(players);

  // Create 2 rounds with all scores
  const round1 = tournament.createRound(Americano, 2);
  round1.matches[0].submitScore(scores[0][0]);
  round1.matches[1].submitScore(scores[0][1]);

  const round2 = tournament.createRound(Americano, 2);
  round2.matches[0].submitScore(scores[1][0]);
  round2.matches[1].submitScore(scores[1][1]);

  expect(tournament.rounds).toHaveLength(2);
  expect(tournament.hasAllScoresSubmitted).toBe(true);

  // Delete last round
  round2.delete();
  expect(tournament.rounds).toHaveLength(1);
  expect(tournament.hasAllScoresSubmitted).toBe(true);

  // Clear a score in the remaining round
  round1.matches[0].submitScore(undefined);
  expect(tournament.hasAllScoresSubmitted).toBe(false);

  // Re-submit the score
  round1.matches[0].submitScore(scores[0][0]);
  expect(tournament.hasAllScoresSubmitted).toBe(true);

  // Delete the last remaining round
  round1.delete();
  expect(tournament.rounds).toHaveLength(0);
  expect(tournament.hasAllScoresSubmitted).toBe(true);
});

test("should return hasAllScoresSubmitted - after tournament restart", ({ players, scores }) => {
  const tournament = runTournament(players, scores);

  // All scores submitted from runTournament
  expect(tournament.hasAllScoresSubmitted).toBe(true);
  expect(tournament.rounds.length).toBeGreaterThan(0);

  // Restart tournament (deletes all rounds but keeps players)
  tournament.restart();

  expect(tournament.rounds).toHaveLength(0);
  expect(tournament.players()).toHaveLength(players.length);
  expect(tournament.hasAllScoresSubmitted).toBe(true);
});

test("should return hasAllScoresSubmitted - mixed score states", ({ players }) => {
  const tournament = runTournament(players);

  const round = tournament.createRound(Americano, 2);

  // No scores
  expect(tournament.hasAllScoresSubmitted).toBe(false);

  // Submit and then clear a score
  round.matches[0].submitScore([11, 5]);
  round.matches[0].submitScore(undefined);
  expect(tournament.hasAllScoresSubmitted).toBe(false);

  // Submit both scores with one being a draw
  round.matches[0].submitScore([10, 10]);
  round.matches[1].submitScore([11, 9]);
  expect(tournament.hasAllScoresSubmitted).toBe(true);

  // Verify draw is still counted as a submitted score
  expect(round.matches[0].score).toEqual([10, 10]);
});

test("getNextRoundInfo should return correct match count for new tournament", ({ players }) => {
  const tournament = runTournament(players);
  
  const info = tournament.getNextRoundInfo(Americano, 2);
  
  expect(info.matchCount).toBe(2);
  expect(info.activePlayerCount).toBe(10);
  expect(info.balancingEnabled).toBe(false);
});

test("getNextRoundInfo should respect maxMatches constraint", ({ players }) => {
  const tournament = runTournament(players);
  
  const info = tournament.getNextRoundInfo(Americano, 1);
  
  expect(info.matchCount).toBe(1);
  expect(info.activePlayerCount).toBe(10);
});

test("getNextRoundInfo should return group distribution for single group", ({ players }) => {
  const tournament = runTournament(players);
  
  const info = tournament.getNextRoundInfo(Americano, 2);
  
  expect(info.groupDistribution.size).toBe(1);
  const group0 = info.groupDistribution.get(0)!;
  expect(group0.total).toBe(10);
  expect(group0.competing).toBe(8); // 2 matches = 8 players
  expect(group0.paused).toBe(2);
});

test("getNextRoundInfo should return group distribution for multiple groups", () => {
  const tournament = tournamentFactory.create();
  tournament.addPlayers(["Alice", "Bob", "Charlie", "Dave", "Eve"], 0);
  tournament.addPlayers(["Frank", "Grace", "Henry", "Ivy", "Jack"], 1);
  
  const info = tournament.getNextRoundInfo(Americano, 2);
  
  expect(info.groupDistribution.size).toBe(2);
  expect(info.activePlayerCount).toBe(10);
  
  const group0 = info.groupDistribution.get(0)!;
  const group1 = info.groupDistribution.get(1)!;
  
  expect(group0.total).toBe(5);
  expect(group1.total).toBe(5);
  expect(group0.competing + group1.competing).toBe(8);
  expect(group0.paused + group1.paused).toBe(2);
});

test("getNextRoundInfo should indicate balancing enabled", () => {
  const tournament = tournamentFactory.create();
  tournament.addPlayers(["Alice", "Bob", "Charlie", "Dave"], 0);
  tournament.addPlayers(["Eve", "Frank", "Grace", "Henry"], 1);
  
  const info = tournament.getNextRoundInfo(AmericanoMixedBalanced, 2);
  
  expect(info.balancingEnabled).toBe(true);
  expect(info.matchCount).toBe(2);
  
  const group0 = info.groupDistribution.get(0)!;
  const group1 = info.groupDistribution.get(1)!;
  
  // With balancing, equal from each group
  expect(group0.competing).toBe(4);
  expect(group1.competing).toBe(4);
});

test("getNextRoundInfo should handle unbalanced groups with balancing enabled", () => {
  const tournament = tournamentFactory.create();
  tournament.addPlayers(["A1", "A2", "A3", "A4", "A5", "A6", "A7"], 0);
  tournament.addPlayers(["B1", "B2", "B3"], 1);
  
  const info = tournament.getNextRoundInfo(AmericanoMixedBalanced, 2);
  
  expect(info.balancingEnabled).toBe(true);
  expect(info.matchCount).toBe(1); // Only 1 match possible (2 from each group)
  
  const group0 = info.groupDistribution.get(0)!;
  const group1 = info.groupDistribution.get(1)!;
  
  expect(group0.total).toBe(7);
  expect(group1.total).toBe(3);
  expect(group0.competing).toBe(2);
  expect(group1.competing).toBe(2);
});

test("getNextRoundInfo should return 0 matches when balancing impossible", () => {
  const tournament = tournamentFactory.create();
  tournament.addPlayers(["A1", "A2", "A3", "A4", "A5", "A6", "A7", "A8"], 0);
  tournament.addPlayers(["B1"], 1);
  
  const info = tournament.getNextRoundInfo(AmericanoMixedBalanced, 2);
  
  expect(info.balancingEnabled).toBe(true);
  expect(info.matchCount).toBe(0); // Impossible to balance
  expect(info.activePlayerCount).toBe(9);
});

test("getNextRoundInfo should return 0 matches with 3 groups and balancing", () => {
  const tournament = tournamentFactory.create();
  tournament.addPlayers(["A1", "A2", "A3", "A4"], 0);
  tournament.addPlayers(["B1", "B2", "B3", "B4"], 1);
  tournament.addPlayers(["C1", "C2", "C3", "C4"], 2);
  
  const info = tournament.getNextRoundInfo(AmericanoMixedBalanced, 10);
  
  expect(info.balancingEnabled).toBe(true);
  expect(info.matchCount).toBe(0); // 3 groups not supported with balancing
  expect(info.activePlayerCount).toBe(12);
  expect(info.groupDistribution.size).toBe(3);
  
  const group0 = info.groupDistribution.get(0)!;
  const group1 = info.groupDistribution.get(1)!;
  const group2 = info.groupDistribution.get(2)!;
  
  expect(group0.total).toBe(4);
  expect(group1.total).toBe(4);
  expect(group2.total).toBe(4);
  expect(group0.competing).toBe(0);
  expect(group1.competing).toBe(0);
  expect(group2.competing).toBe(0);
});

test("getNextRoundInfo should match createRound match count", ({ players }) => {
  const tournament = runTournament(players);
  
  const info = tournament.getNextRoundInfo(Americano, 2);
  const matchCountBefore = info.matchCount;
  
  const round = tournament.createRound(Americano, 2);
  
  expect(round.matches).toHaveLength(matchCountBefore);
});

test("getNextRoundInfo should handle inactive players correctly", ({ players }) => {
  const tournament = runTournament(players);
  
  // Deactivate 3 players
  tournament.players()[0].activate(false);
  tournament.players()[1].activate(false);
  tournament.players()[2].activate(false);
  
  const info = tournament.getNextRoundInfo(Americano, 2);
  
  expect(info.activePlayerCount).toBe(7);
  expect(info.matchCount).toBe(1); // 7 active = 4 competing = 1 match
  
  const group0 = info.groupDistribution.get(0)!;
  expect(group0.total).toBe(7); // Only active players in distribution
});

// Tests for toggleActivePlayers
test("toggleActivePlayers activates all when majority inactive", () => {
  const tournament = tournamentFactory.create();
  tournament.addPlayers(["Alice", "Bob", "Carol", "Dave"]);
  
  // Get all players and deactivate 3 of them
  const players = tournament.players();
  players[0].activate(false);
  players[1].activate(false);
  players[2].activate(false);
  // players[3] stays active
  
  const result = tournament.toggleActivePlayers(players);
  
  expect(result.success).toBe(true);
  expect(result.message).toBe("3 players activated");
  expect(players.every(p => p.active)).toBe(true);
});

test("toggleActivePlayers deactivates all when majority active", () => {
  const tournament = tournamentFactory.create();
  tournament.addPlayers(["Alice", "Bob", "Carol", "Dave"]);
  
  const players = tournament.players();
  // Deactivate only 1 player (minority)
  players[0].activate(false);
  
  const result = tournament.toggleActivePlayers(players);
  
  // 3 active, 1 inactive - should activate the 1 inactive player
  expect(result.success).toBe(true);
  expect(result.message).toBe("1 player activated");
  expect(players.every(p => p.active)).toBe(true);
});

test("toggleActivePlayers activates when exactly half are active", () => {
  const tournament = tournamentFactory.create();
  tournament.addPlayers(["Alice", "Bob", "Carol", "Dave"]);
  
  const players = tournament.players();
  players[0].activate(false);
  players[1].activate(false);
  // 2 active, 2 inactive - should activate
  
  const result = tournament.toggleActivePlayers(players);
  
  expect(result.success).toBe(true);
  expect(result.message).toBe("2 players activated");
  expect(players.every(p => p.active)).toBe(true);
});

test("toggleActivePlayers works with single player", () => {
  const tournament = tournamentFactory.create();
  tournament.addPlayers(["Alice"]);
  
  const players = tournament.players();
  players[0].activate(false);
  
  const result = tournament.toggleActivePlayers(players);
  
  expect(result.success).toBe(true);
  expect(result.message).toBe("1 player activated");
  expect(players[0].active).toBe(true);
});

test("toggleActivePlayers handles empty array", () => {
  const tournament = tournamentFactory.create();
  tournament.addPlayers(["Alice", "Bob"]);
  
  const result = tournament.toggleActivePlayers([]);
  
  // Empty array has 0 active, 0 total, so should try to activate (0 affected)
  expect(result.success).toBe(true);
  expect(result.message).toMatch(/0 players? (activated|deactivated)/);
});

// Tests for getFilteredPlayers and getPlayerCounts
test("getFilteredPlayers with no filter returns all players", () => {
  const tournament = tournamentFactory.create();
  tournament.addPlayers(["Alice", "Bob", "Carol"]);
  
  const players = tournament.getFilteredPlayers();
  expect(players).toHaveLength(3);
});

test("getFilteredPlayers sorts by name by default", () => {
  const tournament = tournamentFactory.create();
  tournament.addPlayers(["Carol", "Alice", "Bob"]);
  
  const players = tournament.getFilteredPlayers();
  expect(players.map(p => p.name)).toEqual(["Alice", "Bob", "Carol"]);
});

test("getFilteredPlayers with search filter (case insensitive)", () => {
  const tournament = tournamentFactory.create();
  tournament.addPlayers(["Alice", "Bob", "Carol", "Dave"]);
  
  const players = tournament.getFilteredPlayers({ search: "al" });
  expect(players).toHaveLength(1);
  expect(players[0].name).toBe("Alice");
});

test("getFilteredPlayers with participating filter", () => {
  const tournament = tournamentFactory.create();
  tournament.addPlayers(["Alice", "Bob", "Carol", "Dave"]);
  tournament.createRound(); // Alice and Bob will participate
  
  const participating = tournament.getFilteredPlayers({ participating: true });
  expect(participating.length).toBeGreaterThan(0);
  participating.forEach(p => expect(p.inAnyRound()).toBe(true));
  
  const nonParticipating = tournament.getFilteredPlayers({ participating: false });
  nonParticipating.forEach(p => expect(p.inAnyRound()).toBe(false));
});

test("getFilteredPlayers with groups filter", () => {
  const tournament = tournamentFactory.create();
  tournament.addPlayers(["Alice", "Bob"], 0);
  tournament.addPlayers(["Carol", "Dave"], 1);
  
  const group0 = tournament.getFilteredPlayers({ groups: [0] });
  expect(group0).toHaveLength(2);
  expect(group0.every(p => p.group === 0)).toBe(true);
  
  const group1 = tournament.getFilteredPlayers({ groups: [1] });
  expect(group1).toHaveLength(2);
  expect(group1.every(p => p.group === 1)).toBe(true);
  
  const both = tournament.getFilteredPlayers({ groups: [0, 1] });
  expect(both).toHaveLength(4);
});

test("getFilteredPlayers with active filter", () => {
  const tournament = tournamentFactory.create();
  tournament.addPlayers(["Alice", "Bob", "Carol"]);
  tournament.players()[0].activate(false);
  
  const active = tournament.getFilteredPlayers({ active: "active" });
  expect(active).toHaveLength(2);
  expect(active.every(p => p.active)).toBe(true);
  
  const inactive = tournament.getFilteredPlayers({ active: "inactive" });
  expect(inactive).toHaveLength(1);
  expect(inactive.every(p => !p.active)).toBe(true);
  
  const all = tournament.getFilteredPlayers({ active: undefined });
  expect(all).toHaveLength(3);
  
  // Also test with empty filter object
  const allWithEmptyFilter = tournament.getFilteredPlayers({});
  expect(allWithEmptyFilter).toHaveLength(3);
});

test("getFilteredPlayers with combined filters", () => {
  const tournament = tournamentFactory.create();
  tournament.addPlayers(["Alice", "Alison"], 0);
  tournament.addPlayers(["Bob", "Beth"], 1);
  
  const filtered = tournament.getFilteredPlayers({
    search: "al",
    groups: [0],
    active: "active",
  });
  
  expect(filtered).toHaveLength(2);
  expect(filtered.every(p => p.group === 0)).toBe(true);
  expect(filtered.every(p => p.name.toLowerCase().includes("al"))).toBe(true);
});

test("getFilteredPlayers sorted by group", () => {
  const tournament = tournamentFactory.create();
  tournament.addPlayers(["Alice"], 2);
  tournament.addPlayers(["Bob"], 0);
  tournament.addPlayers(["Carol"], 1);
  
  const players = tournament.getFilteredPlayers(undefined, "group");
  expect(players.map(p => p.group)).toEqual([0, 1, 2]);
});

test("getPlayerCounts returns correct totals", () => {
  const tournament = tournamentFactory.create();
  tournament.addPlayers(["Alice", "Bob", "Carol"]);
  tournament.players()[0].activate(false);
  
  const counts = tournament.getPlayerCounts();
  expect(counts.total).toBe(3);
  expect(counts.active).toBe(2);
  expect(counts.inactive).toBe(1);
  expect(counts.participating).toBe(0);
});

test("getPlayerCounts with filter", () => {
  const tournament = tournamentFactory.create();
  tournament.addPlayers(["Alice", "Alison", "Bob"], 0);
  
  const counts = tournament.getPlayerCounts({ search: "al" });
  expect(counts.total).toBe(2);
  expect(counts.active).toBe(2);
});

test("getPlayerCounts byGroup", () => {
  const tournament = tournamentFactory.create();
  tournament.addPlayers(["Alice", "Bob"], 0);
  tournament.addPlayers(["Carol"], 1);
  tournament.players()[0].activate(false);
  
  const counts = tournament.getPlayerCounts();
  
  const group0 = counts.byGroup.get(0);
  expect(group0?.total).toBe(2);
  expect(group0?.active).toBe(1);
  expect(group0?.inactive).toBe(1);
  
  const group1 = counts.byGroup.get(1);
  expect(group1?.total).toBe(1);
  expect(group1?.active).toBe(1);
  expect(group1?.inactive).toBe(0);
});

test("getPlayerCounts participating", () => {
  const tournament = tournamentFactory.create();
  tournament.addPlayers(["Alice", "Bob", "Carol", "Dave"]);
  tournament.createRound();
  
  const counts = tournament.getPlayerCounts();
  expect(counts.participating).toBeGreaterThan(0);
  expect(counts.participating).toBeLessThanOrEqual(4);
});

// Tests for validatePlayerName function
vitest("validatePlayerName accepts valid names", () => {
  expect(validatePlayerName("Alice")).toEqual({ valid: true });
  expect(validatePlayerName("Bob Smith")).toEqual({ valid: true });
  expect(validatePlayerName("Player-123")).toEqual({ valid: true });
  expect(validatePlayerName("José")).toEqual({ valid: true });
});

vitest("validatePlayerName trims whitespace", () => {
  expect(validatePlayerName("  Alice  ")).toEqual({ valid: true });
  expect(validatePlayerName("\tBob\n")).toEqual({ valid: true });
});

vitest("validatePlayerName rejects empty names", () => {
  expect(validatePlayerName("")).toEqual({ 
    valid: false, 
    error: "Name is required" 
  });
  expect(validatePlayerName("   ")).toEqual({ 
    valid: false, 
    error: "Name is required" 
  });
});

vitest("validatePlayerName allows commas", () => {
  const result = validatePlayerName("Smith, John");
  expect(result.valid).toBe(true);
});

vitest("validatePlayerName allows periods", () => {
  const result = validatePlayerName("J.R. Smith");
  expect(result.valid).toBe(true);
});

// Tests for Tournament.validateConfiguration
interface ValidationFixture {
  tournament: Tournament;
}

const validationTest = test.extend<ValidationFixture>({
  tournament: async ({}, use) => {
    const tournament = tournamentFactory.create();
    // Add players in different groups
    tournament.addPlayers(["Alice", "Bob", "Carol", "Dave"], 0);
    tournament.addPlayers(["Eve", "Frank", "Grace", "Hank"], 1);
    await use(tournament);
  },
});

validationTest("validateConfiguration warns for Americano with mixed groups", ({ tournament }) => {
  // Americano doesn't use groups, so having players in multiple groups should warn
  const warnings = tournament.validateConfiguration(Americano);
  expect(warnings).toHaveLength(1);
  expect(warnings[0].type).toBe("groupMismatch");
  expect(warnings[0].message).toContain("mode ignores them");
});

validationTest("validateConfiguration warns when AmericanoMixed used with one group", ({ tournament }) => {
  // Deactivate all players in group 1
  tournament.activateGroup(1, false);
  
  const warnings = tournament.validateConfiguration(AmericanoMixed);
  expect(warnings).toHaveLength(1);
  expect(warnings[0].type).toBe("groupMismatch");
  expect(warnings[0].message).toContain("all active players are in one group");
});

validationTest("validateConfiguration warns when mode ignores groups but players are in multiple groups", ({ tournament }) => {
  // Americano doesn't use groups
  const warnings = tournament.validateConfiguration(Americano);
  expect(warnings).toHaveLength(1);
  expect(warnings[0].type).toBe("groupMismatch");
  expect(warnings[0].message).toContain("mode ignores them");
});

validationTest("validateConfiguration returns no warnings for AmericanoMixed with multiple groups", ({ tournament }) => {
  const warnings = tournament.validateConfiguration(AmericanoMixed);
  expect(warnings).toEqual([]);
});

validationTest("validateConfiguration returns no warnings for Mexicano (no group factor)", ({ tournament }) => {
  const warnings = tournament.validateConfiguration(Mexicano);
  // Mexicano doesn't use groups, but warning only shows if players are in multiple groups
  expect(warnings).toHaveLength(1); // Should warn about multiple groups being ignored
  expect(warnings[0].type).toBe("groupMismatch");
});

validationTest("validateConfiguration handles all players in one group correctly", ({ tournament }) => {
  // Put everyone in group 0
  tournament.activateGroup(1, false);
  
  // Americano should have no warnings (doesn't use groups anyway)
  const americanoWarnings = tournament.validateConfiguration(Americano);
  expect(americanoWarnings).toEqual([]);
  
  // AmericanoMixed should warn (needs multiple groups)
  const mixedWarnings = tournament.validateConfiguration(AmericanoMixed);
  expect(mixedWarnings).toHaveLength(1);
  expect(mixedWarnings[0].type).toBe("groupMismatch");
});

validationTest("validateConfiguration with insufficient players", ({ tournament }) => {
  // Deactivate most players (leave only 2 active)
  const players = tournament.players();
  players.slice(2).forEach(p => p.activate(false));
  
  const warnings = tournament.validateConfiguration(Americano);
  // With < 4 players, no group mismatch warning should appear
  expect(warnings).toEqual([]);
});

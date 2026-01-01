import { expect } from "vitest";
import { test, runTournament } from "./Tournament.test.helpers.ts";
import { tournamentFactory } from "./Tournament.impl.ts";
import {
  Americano,
  AmericanoMixedBalanced,
  MatchingSpec,
  MatchUpGroupMode,
  TeamUpGroupMode,
  TeamUpPerformanceMode,
  matchingSpecEquals,
  Mexicano,
  Tournicano,
  GroupBattle,
  GroupBattleMixed,
  AmericanoMixed,
} from "./MatchingSpec.ts";

test("should serialize tournament", ({ players, scores }) => {
  const tournament = runTournament(players, scores);
  const serialized = tournament.serialize();
  const fromSerialized = tournamentFactory.create(serialized);
  expect(fromSerialized.rounds).toHaveLength(tournament.rounds.length);

  // Compare round data directly
  fromSerialized.rounds.forEach((round, i) => {
    const origRound = tournament.rounds[i]!;

    // Compare matches
    expect(round.matches).toHaveLength(origRound.matches.length);
    round.matches.forEach((match, j) => {
      const origMatch = origRound.matches[j];
      expect(match.teamA.player1.name).toBe(origMatch.teamA.player1.name);
      expect(match.teamA.player2.name).toBe(origMatch.teamA.player2.name);
      expect(match.teamB.player1.name).toBe(origMatch.teamB.player1.name);
      expect(match.teamB.player2.name).toBe(origMatch.teamB.player2.name);
      expect(match.score).toEqual(origMatch.score);
    });

    // Compare paused players
    expect(round.paused).toHaveLength(origRound.paused.length);
    round.paused.forEach((player, j) => {
      expect(player.name).toBe(origRound.paused[j].name);
    });

    // Compare standings
    const standings = round.standings();
    const origStandings = origRound.standings();
    expect(standings).toHaveLength(origStandings.length);
    standings.forEach((ranked, j) => {
      const origRanked = origStandings[j];
      expect(ranked.rank).toBe(origRanked.rank);
      expect(ranked.player.name).toBe(origRanked.player.name);
      expect(ranked.player.wins).toBe(origRanked.player.wins);
      expect(ranked.player.draws).toBe(origRanked.player.draws);
      expect(ranked.player.losses).toBe(origRanked.player.losses);
      expect(ranked.player.pointsFor).toBe(origRanked.player.pointsFor);
      expect(ranked.player.pointsAgainst).toBe(origRanked.player.pointsAgainst);
    });
  });
});

test("should serialize and deserialize registration status", ({ players }) => {
  const tournament = runTournament(players);

  // Deactivate some players
  tournament.players()[0].activate(false);
  tournament.players()[3].activate(false);
  tournament.players()[7].activate(false);

  expect(tournament.activePlayerCount).toBe(7);

  const serialized = tournament.serialize();
  const fromSerialized = tournamentFactory.create(serialized);

  // Verify activation status preserved
  expect(fromSerialized.activePlayerCount).toBe(7);
  expect(fromSerialized.players()[0].active).toBe(false);
  expect(fromSerialized.players()[1].active).toBe(true);
  expect(fromSerialized.players()[3].active).toBe(false);
  expect(fromSerialized.players()[7].active).toBe(false);
});

test("should serialize and deserialize active status", ({ players }) => {
  const tournament = runTournament(players);

  // Deactivate some players
  tournament.players()[0].activate(false);
  tournament.players()[4].activate(false);

  expect(tournament.activePlayerCount).toBe(8);

  const serialized = tournament.serialize();
  const fromSerialized = tournamentFactory.create(serialized);

  // Verify active status preserved
  expect(fromSerialized.activePlayerCount).toBe(8);
  expect(fromSerialized.players()[0].active).toBe(false);
  expect(fromSerialized.players()[1].active).toBe(true);
  expect(fromSerialized.players()[4].active).toBe(false);
});

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

import { expect } from "vitest";
import { test, runTournament } from "./TestHelpers.ts";
import { tournamentFactory } from "./Tournament.impl.ts";

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

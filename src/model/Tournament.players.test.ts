import { expect } from "vitest";
import { test, runTournament } from "./Tournament.test.helpers.ts";
import { tournamentFactory } from "./Tournament.impl.ts";

test("should create empty tournament", () => {
  const tournament = runTournament();
  expect(tournament.players()).toHaveLength(0);
  expect(tournament.rounds).toHaveLength(0);
});

test("should add players", ({ players }) => {
  const tournament = runTournament(players);
  expect(tournament.players()).toHaveLength(players.length);
  expect(tournament.players().map((p) => p.name)).toStrictEqual(
    players.map((p) => p.name),
  );
  tournament.players().forEach((p) => {
    expect(p.active).toBeTruthy();
  });
});

test("should not add players twice", ({ players }) => {
  const tournament = runTournament(players);
  expect(tournament.players()).toHaveLength(players.length);
  tournament.addPlayers(players.map((p) => p.name));
  expect(tournament.players()).toHaveLength(players.length);
});

test("should rename player", ({ players }) => {
  const tournament = runTournament(players);
  const player = tournament.players()[0];
  expect(player.name).not.toBe("Foo");
  player.rename("Foo");
  expect(player.name).toBe("Foo");
});

test("should not rename player to existing name", ({ players }) => {
  const tournament = runTournament(players);
  const player = tournament.players()[0];
  const name = player.name;
  player.rename(tournament.players()[1].name);
  expect(player.name).toBe(name);
});

test("should check if can rename to name", ({ players }) => {
  const tournament = runTournament(players);
  const player = tournament.players()[0];
  
  // New name should be available
  expect(player.canRenameTo("NewName")).toBe(true);
  
  // Existing name (other player) should not be available
  expect(player.canRenameTo(tournament.players()[1].name)).toBe(false);
  
  // Own name should be available (can rename to same name)
  expect(player.canRenameTo(player.name)).toBe(true);
});

test("should activate player", ({ players }) => {
  const tournament = runTournament(players);
  const player = tournament.players()[0];
  player.activate(false);
  expect(player.active).toBe(false);
  player.activate(true);
  expect(player.active).toBe(true);
});

test("should withdraw non-participating player", ({ players }) => {
  const tournament = runTournament(players);
  const player = tournament.players()[0];
  const success = player.delete();
  expect(success).toBeTruthy();
  expect(tournament.players()).toHaveLength(players.length - 1);
});

test("should not withdraw participating player", ({ players, scores }) => {
  const tournament = runTournament(players, scores);
  const player = tournament.players()[0];
  const success = player.delete();
  expect(success).toBeFalsy();
  expect(tournament.players()).toHaveLength(players.length);
});

test("should create rounds", ({ players, scores }) => {
  const tournament = runTournament(players, scores);
  expect(tournament.rounds).toHaveLength(scores.length);
});

test("should balance play stats", ({ players, scores }) => {
  const tournament = runTournament(players, scores);
  tournament.rounds
    .at(-1)!
    .standings()
    .forEach((ranked) => {
      const player = ranked.player;
      expect(player.matchCount).toBe(4);
      expect(player.pauseCount).toBe(1);
    });
});

test("should balance matchings", ({ players, scores }) => {
  const tournament = runTournament(players, scores);
  tournament.rounds.forEach((round) => {
    round.standings().forEach((ranked) => {
      const player = ranked.player;
      expect(
        Array.from(player.partners.values()).reduce((acc, rounds) => (acc += rounds.length), 0),
      ).toBe(player.matchCount);
      round.standings().forEach((ranked) => {
        const partner = ranked.player;
        expect(player.partners.get(partner.id)?.length || 0).toBeLessThanOrEqual(
          1,
        );
      });
      expect(
        Array.from(player.opponents.values())
          .reduce((acc, rounds) => (acc += rounds.length), 0),
      ).toBe(player.matchCount * 2);
    });
  });
});

// Tests for activePlayerCount property
test("should return active player count - initial state", ({ players }) => {
  const tournament = runTournament(players);

  // All players initially active
  expect(tournament.activePlayerCount).toBe(10);
  expect(tournament.activePlayerCount).toBe(tournament.players().length);
});

test("should return active player count - after individual deactivation", ({ players }) => {
  const tournament = runTournament(players);

  // Deactivate 3 specific players
  tournament.players()[0].activate(false);
  tournament.players()[3].activate(false);
  tournament.players()[7].activate(false);

  expect(tournament.activePlayerCount).toBe(7);

  // Verify the correct players are counted as active
  const activePlayers = tournament.players().filter(p => p.active);
  expect(activePlayers).toHaveLength(7);
  expect(tournament.activePlayerCount).toBe(activePlayers.length);
});

test("should return active player count - bulk operations", ({ players }) => {
  const tournament = runTournament(players);

  // Deactivate all players
  tournament.activateAll(false);
  expect(tournament.activePlayerCount).toBe(0);

  // Reactivate some players
  tournament.players()[0].activate(true);
  tournament.players()[1].activate(true);
  tournament.players()[4].activate(true);
  tournament.players()[8].activate(true);
  tournament.players()[9].activate(true);

  expect(tournament.activePlayerCount).toBe(5);

  // Reactivate all players
  tournament.activateAll(true);
  expect(tournament.activePlayerCount).toBe(10);
});

test("should return active player count - with groups", () => {
  const tournament = tournamentFactory.create();

  // Add players in different groups
  tournament.addPlayers(["Alice", "Bob", "Charlie"], 0);
  tournament.addPlayers(["Dave", "Eve", "Frank"], 1);

  // All players active initially
  expect(tournament.activePlayerCount).toBe(6);

  // Deactivate all players in group 0
  tournament.activateGroup(0, false);
  expect(tournament.activePlayerCount).toBe(3);

  // Deactivate all players in group 1
  tournament.activateGroup(1, false);
  expect(tournament.activePlayerCount).toBe(0);

  // Reactivate group 0
  tournament.activateGroup(0, true);
  expect(tournament.activePlayerCount).toBe(3);
});

test("should return active player count - empty tournament", () => {
  const tournament = tournamentFactory.create();

  expect(tournament.activePlayerCount).toBe(0);
  expect(tournament.players()).toHaveLength(0);
});

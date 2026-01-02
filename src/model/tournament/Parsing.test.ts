import { expect, test } from "vitest";
import { tournamentFactory } from "./Tournament.impl.ts";

test("addPlayersFromInput with empty input returns info result", () => {
  const tournament = tournamentFactory.create();
  const result = tournament.addPlayersFromInput("");
  
  expect(result.success).toBe(true);
  expect(result.type).toBe("info");
  expect(result.message).toBe("No players added");
});

test("addPlayersFromInput with single group", () => {
  const tournament = tournamentFactory.create();
  const result = tournament.addPlayersFromInput("Alice\nBob\nCarol");
  
  expect(result.success).toBe(true);
  expect(result.type).toBe("success");
  expect(result.message).toContain("Added 3 players");
  expect(result.message).toContain("to the tournament");
  expect(result.details?.added).toBe(3);
  
  const players = tournament.players(0);
  expect(players).toHaveLength(3);
  expect(players.map(p => p.name)).toEqual(["Alice", "Bob", "Carol"]);
});

test("addPlayersFromInput with multiple groups", () => {
  const tournament = tournamentFactory.create();
  const result = tournament.addPlayersFromInput("Alice\nBob\n\nCarol\nDave\n\nEve\nFrank");
  
  expect(result.success).toBe(true);
  expect(result.type).toBe("success");
  expect(result.message).toContain("Added 6 players");
  expect(result.message).toContain("in 3 groups");
  expect(result.details?.added).toBe(6);
  expect(result.details?.groups).toBe(3);
  
  expect(tournament.players(0).map(p => p.name)).toEqual(["Alice", "Bob"]);
  expect(tournament.players(1).map(p => p.name)).toEqual(["Carol", "Dave"]);
  expect(tournament.players(2).map(p => p.name)).toEqual(["Eve", "Frank"]);
});

test("addPlayersFromInput allows commas in player names", () => {
  const tournament = tournamentFactory.create();
  const result = tournament.addPlayersFromInput("Smith, John\nDoe, Jane");
  
  expect(result.success).toBe(true);
  expect(result.details?.added).toBe(2);
  const players = tournament.players(0);
  expect(players).toHaveLength(2);
  expect(players.map(p => p.name)).toEqual(["Smith, John", "Doe, Jane"]);
});

test("addPlayersFromInput allows periods in player names", () => {
  const tournament = tournamentFactory.create();
  const result = tournament.addPlayersFromInput("J.R. Smith\nT.J. Jones");
  
  expect(result.success).toBe(true);
  expect(result.details?.added).toBe(2);
  const players = tournament.players(0);
  expect(players).toHaveLength(2);
  expect(players.map(p => p.name)).toEqual(["J.R. Smith", "T.J. Jones"]);
});

test("addPlayersFromInput with duplicate names", () => {
  const tournament = tournamentFactory.create();
  tournament.addPlayers(["Alice"]);
  
  const result = tournament.addPlayersFromInput("Alice\nBob\nCarol");
  
  expect(result.success).toBe(false);
  expect(result.type).toBe("error");
  expect(result.message).toContain("Added 2 players");
  expect(result.message).toContain("1 duplicate ignored");
  expect(result.details?.added).toBe(2);
  expect(result.details?.duplicates).toBe(1);
});

test("addPlayersFromInput with only duplicates", () => {
  const tournament = tournamentFactory.create();
  tournament.addPlayers(["Alice", "Bob"]);
  
  const result = tournament.addPlayersFromInput("Alice\nBob");
  
  expect(result.success).toBe(false);
  expect(result.type).toBe("error");
  expect(result.message).toBe("No players added - 2 duplicates ignored");
  expect(result.details?.duplicates).toBe(2);
});

test("addPlayersFromInput with max 4 groups default", () => {
  const tournament = tournamentFactory.create();
  const result = tournament.addPlayersFromInput("A\n\nB\n\nC\n\nD\n\nE\n\nF");
  
  // Only first 4 groups should be processed, last 2 players ignored
  expect(result.success).toBe(false);
  expect(result.type).toBe("error");
  expect(result.message).toContain("Added 4 players");
  expect(result.message).toContain("2 players ignored");
  expect(result.details?.added).toBe(4);
  expect(result.details?.ignored).toBe(2);
  expect(tournament.groups).toHaveLength(4);
});

test("addPlayersFromInput with custom max groups", () => {
  const tournament = tournamentFactory.create();
  const result = tournament.addPlayersFromInput("A\n\nB\n\nC", 2);
  
  expect(result.success).toBe(false);
  expect(result.type).toBe("error");
  expect(result.message).toContain("Added 2 players");
  expect(result.message).toContain("1 player ignored");
  expect(result.details?.added).toBe(2);
  expect(result.details?.ignored).toBe(1);
});

test("addPlayersFromInput with consecutive empty lines creates empty groups", () => {
  const tournament = tournamentFactory.create();
  const result = tournament.addPlayersFromInput("Alice\n\n\nBob");
  
  expect(result.success).toBe(true);
  expect(result.type).toBe("success");
  expect(result.details?.added).toBe(2);
  expect(result.details?.groups).toBe(2);
  // Tournament only tracks groups that have players
  expect(tournament.groups).toHaveLength(2);
  expect(tournament.players(0).map(p => p.name)).toEqual(["Alice"]);
  expect(tournament.players(1)).toHaveLength(0);
  expect(tournament.players(2).map(p => p.name)).toEqual(["Bob"]);
});

test("addPlayersFromInput with leading empty lines", () => {
  const tournament = tournamentFactory.create();
  const result = tournament.addPlayersFromInput("\n\nAlice");
  
  expect(result.success).toBe(true);
  expect(result.details?.added).toBe(1);
  // Tournament only tracks groups that have players
  expect(tournament.groups).toHaveLength(1);
  expect(tournament.players(0)).toHaveLength(0);
  expect(tournament.players(1)).toHaveLength(0);
  expect(tournament.players(2).map(p => p.name)).toEqual(["Alice"]);
});

test("addPlayersFromInput skips to Group D with 3 empty lines", () => {
  const tournament = tournamentFactory.create();
  // To get to group 3 (D, 0-indexed), we need 3 increments from group 0
  // Start at group 0, then empty, empty, empty gets us to group 3
  const result = tournament.addPlayersFromInput("\n\n\nGeorge");
  
  expect(result.success).toBe(true);
  expect(result.details?.added).toBe(1);
  // Tournament only tracks groups that have players
  expect(tournament.groups).toHaveLength(1);
  expect(tournament.players(0)).toHaveLength(0);
  expect(tournament.players(1)).toHaveLength(0);
  expect(tournament.players(2)).toHaveLength(0);
  expect(tournament.players(3).map(p => p.name)).toEqual(["George"]);
});

test("addPlayersFromInput ignores trailing empty lines", () => {
  const tournament = tournamentFactory.create();
  const result = tournament.addPlayersFromInput("Alice\n\n\n");
  
  expect(result.success).toBe(true);
  expect(result.details?.added).toBe(1);
  expect(tournament.groups).toHaveLength(1);
  expect(tournament.players(0).map(p => p.name)).toEqual(["Alice"]);
});

test("addPlayersFromInput with whitespace handling", () => {
  const tournament = tournamentFactory.create();
  const result = tournament.addPlayersFromInput("  Alice  \n  Bob  \n\n  Carol  ");
  
  expect(result.success).toBe(true);
  expect(result.details?.added).toBe(3);
  expect(tournament.players(0).map(p => p.name)).toEqual(["Alice", "Bob"]);
  expect(tournament.players(1).map(p => p.name)).toEqual(["Carol"]);
});

test("addPlayersFromInput with multiple errors", () => {
  const tournament = tournamentFactory.create();
  tournament.addPlayers(["Alice"]);
  
  const result = tournament.addPlayersFromInput("Alice\nBob\n\nCarol\n\nDave\n\nEve\n\nFrank\n\nGeorge");
  
  expect(result.success).toBe(false);
  expect(result.type).toBe("error");
  expect(result.message).toContain("4 players");
  expect(result.message).toContain("1 duplicate");
  expect(result.message).toContain("2 players");
  expect(result.details?.added).toBe(4);
  expect(result.details?.duplicates).toBe(1);
  expect(result.details?.ignored).toBe(2);
});

test("addPlayersFromInput ignores empty names from whitespace-only lines", () => {
  const tournament = tournamentFactory.create();
  const result = tournament.addPlayersFromInput("Alice\n   \nBob");
  
  expect(result.success).toBe(true);
  expect(result.details?.added).toBe(2);
  expect(result.details?.groups).toBe(2);
  expect(tournament.players(0).map(p => p.name)).toEqual(["Alice"]);
  expect(tournament.players(1).map(p => p.name)).toEqual(["Bob"]);
});

test("addPlayersFromInput activates players by default", () => {
  const tournament = tournamentFactory.create();
  tournament.addPlayersFromInput("Alice\nBob");
  
  const players = tournament.players(0);
  expect(players[0].active).toBe(true);
  expect(players[1].active).toBe(true);
});

test("addPlayersFromInput with only whitespace returns info", () => {
  const tournament = tournamentFactory.create();
  const result = tournament.addPlayersFromInput("   \n   \n   ");
  
  expect(result.success).toBe(true);
  expect(result.type).toBe("info");
  expect(result.message).toBe("No players added");
});

test("addPlayersFromInput with mixed groups and empty groups", () => {
  const tournament = tournamentFactory.create();
  // Alice (group 0), empty line, Bob (group 1), 2 empty lines, Carol (group 3)
  const result = tournament.addPlayersFromInput("Alice\n\nBob\n\n\nCarol");
  
  expect(result.success).toBe(true);
  expect(result.details?.added).toBe(3);
  expect(result.details?.groups).toBe(3);
  // Tournament only tracks groups that have players
  expect(tournament.groups).toHaveLength(3);
  expect(tournament.players(0).map(p => p.name)).toEqual(["Alice"]);
  expect(tournament.players(1).map(p => p.name)).toEqual(["Bob"]);
  expect(tournament.players(2)).toHaveLength(0);
  expect(tournament.players(3).map(p => p.name)).toEqual(["Carol"]);
});

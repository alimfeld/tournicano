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
  const result = tournament.addPlayersFromInput("Alice, Bob, Carol");
  
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
  const result = tournament.addPlayersFromInput("Alice, Bob\nCarol, Dave\nEve, Frank");
  
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

test("addPlayersFromInput with period separator", () => {
  const tournament = tournamentFactory.create();
  const result = tournament.addPlayersFromInput("Alice. Bob. Carol");
  
  expect(result.success).toBe(true);
  expect(result.details?.added).toBe(3);
  expect(tournament.players(0)).toHaveLength(3);
});

test("addPlayersFromInput with mixed separators", () => {
  const tournament = tournamentFactory.create();
  const result = tournament.addPlayersFromInput("Alice, Bob. Carol");
  
  expect(result.success).toBe(true);
  expect(result.details?.added).toBe(3);
});

test("addPlayersFromInput with duplicate names", () => {
  const tournament = tournamentFactory.create();
  tournament.addPlayers(["Alice"]);
  
  const result = tournament.addPlayersFromInput("Alice, Bob, Carol");
  
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
  
  const result = tournament.addPlayersFromInput("Alice, Bob");
  
  expect(result.success).toBe(false);
  expect(result.type).toBe("error");
  expect(result.message).toBe("No players added - 2 duplicates ignored");
  expect(result.details?.duplicates).toBe(2);
});

test("addPlayersFromInput with max 4 groups default", () => {
  const tournament = tournamentFactory.create();
  const result = tournament.addPlayersFromInput("A\nB\nC\nD\nE\nF");
  
  // Only first 4 groups should be processed, last 2 groups ignored
  expect(result.success).toBe(false);
  expect(result.type).toBe("error");
  expect(result.message).toContain("Added 4 players");
  expect(result.message).toContain("2 groups ignored");
  expect(result.details?.added).toBe(4);
  expect(result.details?.ignored).toBe(2);
  expect(tournament.groups).toHaveLength(4);
});

test("addPlayersFromInput with custom max groups", () => {
  const tournament = tournamentFactory.create();
  const result = tournament.addPlayersFromInput("A\nB\nC", 2);
  
  expect(result.success).toBe(false);
  expect(result.type).toBe("error");
  expect(result.message).toContain("Added 2 players");
  expect(result.message).toContain("1 group ignored");
  expect(result.details?.added).toBe(2);
  expect(result.details?.ignored).toBe(1);
});

test("addPlayersFromInput with empty lines", () => {
  const tournament = tournamentFactory.create();
  const result = tournament.addPlayersFromInput("Alice, Bob\n\nCarol, Dave\n\n");
  
  expect(result.success).toBe(true);
  expect(result.type).toBe("success");
  expect(result.details?.added).toBe(4);
  expect(result.details?.groups).toBe(2);
});

test("addPlayersFromInput with whitespace handling", () => {
  const tournament = tournamentFactory.create();
  const result = tournament.addPlayersFromInput("  Alice  ,  Bob  \n  Carol  ");
  
  expect(result.success).toBe(true);
  expect(result.details?.added).toBe(3);
  expect(tournament.players(0).map(p => p.name)).toEqual(["Alice", "Bob"]);
  expect(tournament.players(1).map(p => p.name)).toEqual(["Carol"]);
});

test("addPlayersFromInput with multiple errors", () => {
  const tournament = tournamentFactory.create();
  tournament.addPlayers(["Alice"]);
  
  const result = tournament.addPlayersFromInput("Alice, Bob\nCarol\nDave\nEve\nFrank\nGeorge");
  
  expect(result.success).toBe(false);
  expect(result.type).toBe("error");
  expect(result.message).toContain("4 players");
  expect(result.message).toContain("1 duplicate");
  expect(result.message).toContain("2 groups");
  expect(result.details?.added).toBe(4);
  expect(result.details?.duplicates).toBe(1);
  expect(result.details?.ignored).toBe(2);
});

test("addPlayersFromInput ignores empty names", () => {
  const tournament = tournamentFactory.create();
  const result = tournament.addPlayersFromInput("Alice, , Bob,, Carol");
  
  expect(result.success).toBe(true);
  expect(result.details?.added).toBe(3);
  expect(tournament.players(0)).toHaveLength(3);
});

test("addPlayersFromInput activates players by default", () => {
  const tournament = tournamentFactory.create();
  tournament.addPlayersFromInput("Alice, Bob");
  
  const players = tournament.players(0);
  expect(players[0].active).toBe(true);
  expect(players[1].active).toBe(true);
});

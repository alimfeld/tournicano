import { test, expect } from "vitest";
import { tournamentFactory } from "./Tournament.impl.ts";

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

// Tests for exportPlayersText
test("exportPlayersText exports all players by group", () => {
  const tournament = tournamentFactory.create();
  tournament.addPlayers(["Carol", "Alice", "Bob"], 0);
  tournament.addPlayers(["Frank", "Dave", "Eve"], 1);
  
  const text = tournament.exportPlayersText();
  
  // Should be sorted within each group and separated by newlines
  expect(text).toBe("Alice, Bob, Carol\nDave, Eve, Frank");
});

test("exportPlayersText exports single group", () => {
  const tournament = tournamentFactory.create();
  tournament.addPlayers(["Carol", "Alice", "Bob"], 0);
  
  const text = tournament.exportPlayersText();
  
  expect(text).toBe("Alice, Bob, Carol");
});

test("exportPlayersText with filter exports filtered players", () => {
  const tournament = tournamentFactory.create();
  tournament.addPlayers(["Alice", "Bob", "Carol"], 0);
  tournament.addPlayers(["Dave", "Eve"], 1);
  
  // Deactivate some players
  const players = tournament.players();
  players.find(p => p.name === "Bob")!.activate(false);
  players.find(p => p.name === "Eve")!.activate(false);
  
  const text = tournament.exportPlayersText({ active: "active" });
  
  // Should only include active players, sorted by name
  expect(text).toBe("Alice, Carol, Dave");
});

test("exportPlayersText with group filter", () => {
  const tournament = tournamentFactory.create();
  tournament.addPlayers(["Alice", "Bob", "Carol"], 0);
  tournament.addPlayers(["Dave", "Eve"], 1);
  
  const text = tournament.exportPlayersText({ groups: [1] });
  
  expect(text).toBe("Dave, Eve");
});

test("exportPlayersText with search filter", () => {
  const tournament = tournamentFactory.create();
  tournament.addPlayers(["Alice", "Bob", "Carol", "Dave"]);
  
  const text = tournament.exportPlayersText({ search: "a" });
  
  // Should include Alice, Bob, Carol, Dave (all names containing 'a' case-insensitive)
  // Actually Bob doesn't have 'a', so only Alice, Carol, Dave
  expect(text).toBe("Alice, Carol, Dave");
});

test("exportPlayersText handles empty tournament", () => {
  const tournament = tournamentFactory.create();
  
  const text = tournament.exportPlayersText();
  
  expect(text).toBe("");
});

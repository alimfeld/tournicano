import { expect, test } from "vitest";
import { tournamentFactory } from "./Tournament.impl.ts";

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

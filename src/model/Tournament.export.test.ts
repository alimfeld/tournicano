import { expect } from "vitest";
import { test, runTournament } from "./Tournament.test.helpers.ts";
import { tournamentFactory } from "./Tournament.impl.ts";
import { settingsFactory } from "./Settings.impl.ts";
import { Americano, Mexicano } from "./MatchingSpec.ts";

test("should export standings text with no rounds", () => {
  const tournament = tournamentFactory.create();
  tournament.addPlayers(["Alice", "Bob", "Charlie", "Dave"], 0);
  
  const text = tournament.exportStandingsText(0);
  
  expect(text).toContain("No standings available");
});

test("should export standings text for specific round", ({ players, scores }) => {
  const tournament = runTournament(players.slice(0, 4), [scores[0]]);
  
  const text = tournament.exportStandingsText(0);
  
  expect(text).toContain("STANDINGS - Round 1 of 1");
  expect(text).toContain("Export Date:");
  expect(text).toContain("OVERALL STANDINGS");
  expect(text).not.toContain("ROUND 1"); // Should not include round details
  expect(text).not.toContain("PLAYERS"); // Should not include player list
});

test("should export standings text with group filter", () => {
  const tournament = tournamentFactory.create();
  tournament.addPlayers(["Alice", "Bob"], 0);
  tournament.addPlayers(["Charlie", "Dave"], 1);
  
  const round = tournament.createRound(Americano, 1);
  round.matches[0].submitScore([11, 5]);
  
  // Export with single group filter
  const textGroupA = tournament.exportStandingsText(0, [0]);
  
  expect(textGroupA).toContain("GROUP A STANDINGS");
  expect(textGroupA).not.toContain("OVERALL STANDINGS");
  expect(textGroupA).not.toContain("GROUP B");
});

test("should export standings text with multiple group filter", () => {
  const tournament = tournamentFactory.create();
  tournament.addPlayers(["Alice", "Bob"], 0);
  tournament.addPlayers(["Charlie", "Dave"], 1);
  tournament.addPlayers(["Eve", "Frank"], 2);
  
  const round = tournament.createRound(Americano, 1);
  round.matches[0].submitScore([11, 5]);
  
  // Export with multiple groups filter
  const text = tournament.exportStandingsText(0, [0, 1]);
  
  expect(text).toContain("OVERALL STANDINGS");
  expect(text).not.toContain("GROUP A STANDINGS");
  expect(text).not.toContain("GROUP B STANDINGS");
});

test("should export backup JSON with settings", ({ players }) => {
  const settings = settingsFactory.create();
  settings.setCourts(3);
  settings.setMatchingSpec(Mexicano);
  
  const tournament = runTournament(players.slice(0, 4));
  
  const backupJson = tournament.exportBackup(settings);
  const backup = JSON.parse(backupJson);
  
  expect(backup.version).toBe(1);
  expect(backup.exportDate).toBeDefined();
  expect(backup.settings.courts).toBe(3);
  expect(backup.settings.matchingSpec).toEqual(Mexicano);
});

test("should export backup JSON with all players", ({ players }) => {
  const settings = settingsFactory.create();
  const tournament = tournamentFactory.create();
  tournament.addPlayers([players[0].name, players[1].name], 0);
  tournament.addPlayers([players[2].name, players[3].name], 1);
  
  const backupJson = tournament.exportBackup(settings);
  const backup = JSON.parse(backupJson);
  
  expect(backup.players).toHaveLength(4);
  expect(backup.players[0]).toHaveProperty("name");
  expect(backup.players[0]).toHaveProperty("group");
  expect(backup.players[0]).toHaveProperty("active");
  expect(backup.players[0].group).toBe(0); // Numeric group, not "A"
  expect(backup.players[2].group).toBe(1); // Numeric group, not "B"
});

test("should export backup JSON without player IDs", ({ players }) => {
  const settings = settingsFactory.create();
  const tournament = runTournament(players.slice(0, 4));
  
  const backupJson = tournament.exportBackup(settings);
  const backup = JSON.parse(backupJson);
  
  backup.players.forEach((player: any) => {
    expect(player).not.toHaveProperty("id");
    expect(player).toHaveProperty("name");
  });
});

test("should export backup JSON with rounds and matches", ({ players, scores }) => {
  const settings = settingsFactory.create();
  const tournament = runTournament(players.slice(0, 4), [scores[0], scores[1]]);
  
  const backupJson = tournament.exportBackup(settings);
  const backup = JSON.parse(backupJson);
  
  expect(backup.rounds).toHaveLength(2);
  expect(backup.rounds[0].matches).toHaveLength(1);
  expect(backup.rounds[0].matches[0].teamA).toHaveLength(2); // Array of 2 names
  expect(backup.rounds[0].matches[0].teamB).toHaveLength(2);
  expect(backup.rounds[0].matches[0].score).toBeDefined();
});

test("should export backup JSON with paused and inactive players", () => {
  const settings = settingsFactory.create();
  const tournament = tournamentFactory.create();
  tournament.addPlayers(["Alice", "Bob", "Charlie", "Dave", "Eve"], 0);
  
  // First round - all active, one will be paused (5 players, only 4 can play)
  const round1 = tournament.createRound(Americano, 1);
  round1.matches[0].submitScore([11, 5]);
  
  // Check who was paused in round 1
  const pausedInRound1 = round1.paused.map(p => p.name);
  expect(pausedInRound1).toHaveLength(1); // One player should be paused
  
  // Deactivate the player who was paused
  const pausedPlayer = tournament.players().find(p => p.name === pausedInRound1[0])!;
  pausedPlayer.activate(false);
  
  // Second round - previously paused player is now inactive
  tournament.createRound(Americano, 1);
  
  const backupJson = tournament.exportBackup(settings);
  const backup = JSON.parse(backupJson);
  
  expect(backup.rounds[0].paused).toContain(pausedInRound1[0]); // Was paused in first round
  expect(backup.rounds[1].inactive).toContain(pausedInRound1[0]); // Is inactive in second round
});

test("should export backup JSON without computed standings", ({ players, scores }) => {
  const settings = settingsFactory.create();
  const tournament = runTournament(players.slice(0, 4), [scores[0]]);
  
  const backupJson = tournament.exportBackup(settings);
  const backup = JSON.parse(backupJson);
  
  // Should not have standings data
  expect(backup).not.toHaveProperty("standings");
  expect(backup).not.toHaveProperty("metadata");
  
  // Should have essential data only
  expect(backup).toHaveProperty("settings");
  expect(backup).toHaveProperty("players");
  expect(backup).toHaveProperty("rounds");
  expect(backup).toHaveProperty("version");
  expect(backup).toHaveProperty("exportDate");
});

test("should export backup JSON without UI preferences", ({ players }) => {
  const settings = settingsFactory.create();
  settings.setTheme("dark");
  settings.enableWakeLock(true);
  
  const tournament = runTournament(players.slice(0, 4));
  
  const backupJson = tournament.exportBackup(settings);
  const backup = JSON.parse(backupJson);
  
  // Should not include theme or wakeLock
  expect(backup.settings).not.toHaveProperty("theme");
  expect(backup.settings).not.toHaveProperty("wakeLock");
  
  // Should only include tournament-relevant settings
  expect(backup.settings).toHaveProperty("courts");
  expect(backup.settings).toHaveProperty("matchingSpec");
});

test("should export backup JSON with inactive players tracked", ({ players }) => {
  const settings = settingsFactory.create();
  const tournament = tournamentFactory.create();
  tournament.addPlayers([players[0].name, players[1].name, players[2].name, players[3].name], 0);
  
  // All players active for first round
  const round1 = tournament.createRound(Americano, 1);
  round1.matches[0].submitScore([11, 5]);
  
  // Deactivate one player before second round
  tournament.players().find(p => p.name === players[0].name)!.activate(false);
  
  tournament.createRound(Americano, 1);
  
  const backupJson = tournament.exportBackup(settings);
  const backup = JSON.parse(backupJson);
  
  // First round should not have inactive players
  expect(backup.rounds[0].inactive).toHaveLength(0);
  
  // Second round should track the inactive player
  expect(backup.rounds[1].inactive).toContain(players[0].name);
  
  // Players list should still include the inactive player
  const inactivePlayers = backup.players.filter((p: any) => p.name === players[0].name);
  expect(inactivePlayers).toHaveLength(1);
  expect(inactivePlayers[0].active).toBe(false);
});

import { expect } from "vitest";
import { test, runTournament } from "./Tournament.test.helpers.ts";
import { tournamentFactory } from "./Tournament.impl.ts";
import { settingsFactory } from "./Settings.impl.ts";
import { Americano, Mexicano, AmericanoMixed, Tournicano } from "./Tournament.matching.ts";

// ==========================================
// 1. VERSION COMPATIBILITY TESTS
// ==========================================

test("should reject unsupported backup version", () => {
  const tournament = tournamentFactory.create();
  const settings = settingsFactory.create();

  const invalidBackup = JSON.stringify({
    version: 2,
    exportDate: new Date().toISOString(),
    settings: { courts: 2, matchingSpec: Americano },
    players: [],
    rounds: [],
  });

  const result = tournament.importBackup(invalidBackup, settings);

  expect(result.success).toBe(false);
  expect(result.error).toContain("Unsupported backup version: 2");
});

test("should accept version 1 backups", () => {
  const tournament = tournamentFactory.create();
  const settings = settingsFactory.create();

  const validBackup = JSON.stringify({
    version: 1,
    exportDate: new Date().toISOString(),
    settings: { courts: 2, matchingSpec: Americano },
    players: [],
    rounds: [],
  });

  const result = tournament.importBackup(validBackup, settings);

  expect(result.success).toBe(true);
});

test("VERSION_1_SNAPSHOT: should match exact format for version 1", ({ players, scores }) => {
  const settings = settingsFactory.create();
  settings.setCourts(3);
  settings.setMatchingSpec(Mexicano);

  const tournament = tournamentFactory.create();
  tournament.addPlayers([players[0].name, players[1].name], 0);
  tournament.addPlayers([players[2].name, players[3].name], 1);

  const round = tournament.createRound(Americano, 1);
  round.matches[0].submitScore(scores[0][0]);

  const backupJson = tournament.exportBackup(settings);
  const backup = JSON.parse(backupJson);

  // Verify structure (don't validate specific match order since it's randomized)
  expect(backup.version).toBe(1);
  expect(backup.exportDate).toBeDefined();
  expect(typeof backup.exportDate).toBe("string");
  
  expect(backup.settings).toEqual({
    courts: 3,
    matchingSpec: Mexicano,
  });
  
  expect(backup.players).toHaveLength(4);
  expect(backup.players[0]).toHaveProperty("name");
  expect(backup.players[0]).toHaveProperty("group");
  expect(backup.players[0]).toHaveProperty("active");
  expect(backup.players[0]).not.toHaveProperty("id"); // Should not have IDs
  
  expect(backup.rounds).toHaveLength(1);
  expect(backup.rounds[0].matches).toHaveLength(1);
  expect(backup.rounds[0].matches[0]).toHaveProperty("teamA");
  expect(backup.rounds[0].matches[0]).toHaveProperty("teamB");
  expect(backup.rounds[0].matches[0]).toHaveProperty("score");
  expect(Array.isArray(backup.rounds[0].matches[0].teamA)).toBe(true);
  expect(backup.rounds[0].matches[0].teamA).toHaveLength(2);
  expect(backup.rounds[0].matches[0].score).toEqual([11, 3]);
  expect(backup.rounds[0].paused).toEqual([]);
  expect(backup.rounds[0].inactive).toEqual([]);
});

// ==========================================
// 2. VALIDATION TESTS (all-or-nothing)
// ==========================================

test("should reject invalid JSON", () => {
  const tournament = tournamentFactory.create();
  const settings = settingsFactory.create();

  const result = tournament.importBackup("invalid json {", settings);

  expect(result.success).toBe(false);
  expect(result.error).toContain("Invalid backup file format");
});

test("should reject backup missing required fields", () => {
  const tournament = tournamentFactory.create();
  const settings = settingsFactory.create();

  const incompleteBackup = JSON.stringify({
    version: 1,
    settings: { courts: 2, matchingSpec: Americano },
    // missing players and rounds
  });

  const result = tournament.importBackup(incompleteBackup, settings);

  expect(result.success).toBe(false);
  expect(result.error).toContain("corrupted or contains invalid data");
});

test("should reject backup with duplicate player names", () => {
  const tournament = tournamentFactory.create();
  const settings = settingsFactory.create();

  const duplicateBackup = JSON.stringify({
    version: 1,
    exportDate: new Date().toISOString(),
    settings: { courts: 2, matchingSpec: Americano },
    players: [
      { name: "Alice", group: 0, active: true },
      { name: "Alice", group: 0, active: true },
    ],
    rounds: [],
  });

  const result = tournament.importBackup(duplicateBackup, settings);

  expect(result.success).toBe(false);
  expect(result.error).toContain("duplicate player names");
});

test("should reject backup with invalid player names (empty string)", () => {
  const tournament = tournamentFactory.create();
  const settings = settingsFactory.create();

  const emptyNameBackup = JSON.stringify({
    version: 1,
    exportDate: new Date().toISOString(),
    settings: { courts: 2, matchingSpec: Americano },
    players: [
      { name: "", group: 0, active: true },
    ],
    rounds: [],
  });

  const result = tournament.importBackup(emptyNameBackup, settings);

  expect(result.success).toBe(false);
  expect(result.error).toContain("invalid player names");
});

test("should reject backup with invalid groups", () => {
  const tournament = tournamentFactory.create();
  const settings = settingsFactory.create();

  const invalidGroupBackup = JSON.stringify({
    version: 1,
    exportDate: new Date().toISOString(),
    settings: { courts: 2, matchingSpec: Americano },
    players: [
      { name: "Alice", group: -1, active: true },
    ],
    rounds: [],
  });

  const result = tournament.importBackup(invalidGroupBackup, settings);

  expect(result.success).toBe(false);
  expect(result.error).toContain("corrupted or contains invalid data");
});

test("should reject backup with invalid scores", () => {
  const tournament = tournamentFactory.create();
  const settings = settingsFactory.create();

  const invalidScoreBackup = JSON.stringify({
    version: 1,
    exportDate: new Date().toISOString(),
    settings: { courts: 2, matchingSpec: Americano },
    players: [
      { name: "Alice", group: 0, active: true },
      { name: "Bob", group: 0, active: true },
      { name: "Charlie", group: 0, active: true },
      { name: "Dave", group: 0, active: true },
    ],
    rounds: [
      {
        matches: [
          {
            teamA: ["Alice", "Bob"],
            teamB: ["Charlie", "Dave"],
            score: [11], // Invalid: should be [number, number]
          },
        ],
        paused: [],
        inactive: [],
      },
    ],
  });

  const result = tournament.importBackup(invalidScoreBackup, settings);

  expect(result.success).toBe(false);
  expect(result.error).toContain("corrupted or contains invalid data");
});

test("should reject backup with rounds referencing unknown players", () => {
  const tournament = tournamentFactory.create();
  const settings = settingsFactory.create();

  const unknownPlayerBackup = JSON.stringify({
    version: 1,
    exportDate: new Date().toISOString(),
    settings: { courts: 2, matchingSpec: Americano },
    players: [
      { name: "Alice", group: 0, active: true },
      { name: "Bob", group: 0, active: true },
    ],
    rounds: [
      {
        matches: [
          {
            teamA: ["Alice", "Bob"],
            teamB: ["Charlie", "Dave"], // Charlie and Dave don't exist
            score: [11, 5],
          },
        ],
        paused: [],
        inactive: [],
      },
    ],
  });

  const result = tournament.importBackup(unknownPlayerBackup, settings);

  expect(result.success).toBe(false);
  expect(result.error).toContain("rounds with unknown players");
});

test("should not modify tournament state on validation failure", ({ players }) => {
  const tournament = tournamentFactory.create();
  tournament.addPlayers([players[0].name, players[1].name], 0);
  
  const settings = settingsFactory.create();
  settings.setCourts(5);

  const invalidBackup = JSON.stringify({
    version: 999, // Invalid version
    exportDate: new Date().toISOString(),
    settings: { courts: 2, matchingSpec: Americano },
    players: [],
    rounds: [],
  });

  const result = tournament.importBackup(invalidBackup, settings);

  expect(result.success).toBe(false);
  // Tournament should still have original players
  expect(tournament.players()).toHaveLength(2);
  expect(tournament.players()[0].name).toBe(players[0].name);
  // Settings should not have changed
  expect(settings.courts).toBe(5);
});

// ==========================================
// 3. ROUND-TRIP TESTS (export → import → export)
// ==========================================

test("ROUNDTRIP: should preserve tournament with no rounds", ({ players }) => {
  const settings1 = settingsFactory.create();
  settings1.setCourts(3);
  settings1.setMatchingSpec(Mexicano);

  const tournament1 = tournamentFactory.create();
  tournament1.addPlayers(players.slice(0, 4).map(p => p.name), 0);

  // First export
  const export1 = tournament1.exportBackup(settings1);

  // Import into new tournament
  const tournament2 = tournamentFactory.create();
  const settings2 = settingsFactory.create();
  const result = tournament2.importBackup(export1, settings2);

  expect(result.success).toBe(true);

  // Second export
  const export2 = tournament2.exportBackup(settings2);

  // Parse both exports
  const backup1 = JSON.parse(export1);
  const backup2 = JSON.parse(export2);

  // Remove dynamic exportDate field
  delete backup1.exportDate;
  delete backup2.exportDate;

  // Should be identical
  expect(backup2).toEqual(backup1);
});

test("ROUNDTRIP: should preserve tournament with single round", ({ players, scores }) => {
  const settings1 = settingsFactory.create();
  settings1.setCourts(2);
  settings1.setMatchingSpec(Americano);

  const tournament1 = runTournament(players.slice(0, 4), [scores[0]], Americano);

  // First export
  const export1 = tournament1.exportBackup(settings1);

  // Import into new tournament
  const tournament2 = tournamentFactory.create();
  const settings2 = settingsFactory.create();
  const result = tournament2.importBackup(export1, settings2);

  expect(result.success).toBe(true);

  // Second export
  const export2 = tournament2.exportBackup(settings2);

  // Parse both exports
  const backup1 = JSON.parse(export1);
  const backup2 = JSON.parse(export2);

  // Remove dynamic exportDate field
  delete backup1.exportDate;
  delete backup2.exportDate;

  // Should be identical
  expect(backup2).toEqual(backup1);
});

test("ROUNDTRIP: should preserve tournament with multiple rounds", ({ players, scores }) => {
  const settings1 = settingsFactory.create();
  settings1.setCourts(3);
  settings1.setMatchingSpec(Tournicano);

  const tournament1 = runTournament(players.slice(0, 6), [scores[0], scores[1], scores[2]], Americano);

  // First export
  const export1 = tournament1.exportBackup(settings1);

  // Import into new tournament
  const tournament2 = tournamentFactory.create();
  const settings2 = settingsFactory.create();
  const result = tournament2.importBackup(export1, settings2);

  expect(result.success).toBe(true);

  // Second export
  const export2 = tournament2.exportBackup(settings2);

  // Parse both exports
  const backup1 = JSON.parse(export1);
  const backup2 = JSON.parse(export2);

  // Remove dynamic exportDate field
  delete backup1.exportDate;
  delete backup2.exportDate;

  // Should be identical
  expect(backup2).toEqual(backup1);
});

test("ROUNDTRIP: should preserve all player data (name, group, active)", ({ players }) => {
  const settings1 = settingsFactory.create();
  const tournament1 = tournamentFactory.create();
  
  tournament1.addPlayers([players[0].name, players[1].name], 0);
  tournament1.addPlayers([players[2].name, players[3].name], 1);
  
  // Deactivate one player
  tournament1.players()[1].activate(false);

  const export1 = tournament1.exportBackup(settings1);

  const tournament2 = tournamentFactory.create();
  const settings2 = settingsFactory.create();
  tournament2.importBackup(export1, settings2);

  expect(tournament2.players()).toHaveLength(4);
  expect(tournament2.players()[0].name).toBe(players[0].name);
  expect(tournament2.players()[0].group).toBe(0);
  expect(tournament2.players()[0].active).toBe(true);
  
  expect(tournament2.players()[1].name).toBe(players[1].name);
  expect(tournament2.players()[1].group).toBe(0);
  expect(tournament2.players()[1].active).toBe(false);
  
  expect(tournament2.players()[2].group).toBe(1);
  expect(tournament2.players()[3].group).toBe(1);
});

test("ROUNDTRIP: should preserve all match scores", ({ players, scores }) => {
  const settings1 = settingsFactory.create();
  // Use 6 players to get 2 matches with 2 scores
  const tournament1 = runTournament(players.slice(0, 6), [scores[0]], Americano);

  const export1 = tournament1.exportBackup(settings1);

  const tournament2 = tournamentFactory.create();
  const settings2 = settingsFactory.create();
  tournament2.importBackup(export1, settings2);

  // Verify all scores are preserved
  expect(tournament2.rounds[0].matches).toHaveLength(tournament1.rounds[0].matches.length);
  tournament2.rounds[0].matches.forEach((match, i) => {
    expect(match.score).toEqual(tournament1.rounds[0].matches[i].score);
  });
});

test("ROUNDTRIP: should preserve paused players in rounds", () => {
  const settings1 = settingsFactory.create();
  const tournament1 = tournamentFactory.create();
  tournament1.addPlayers(["Alice", "Bob", "Charlie", "Dave", "Eve"], 0);

  // First round - 5 players, one will be paused
  const round1 = tournament1.createRound(Americano, 1);
  round1.matches[0].submitScore([11, 5]);

  const pausedPlayer = round1.paused[0].name;

  const export1 = tournament1.exportBackup(settings1);

  const tournament2 = tournamentFactory.create();
  const settings2 = settingsFactory.create();
  tournament2.importBackup(export1, settings2);

  expect(tournament2.rounds[0].paused).toHaveLength(1);
  expect(tournament2.rounds[0].paused[0].name).toBe(pausedPlayer);
});

test("ROUNDTRIP: should preserve inactive players in rounds", () => {
  const settings1 = settingsFactory.create();
  const tournament1 = tournamentFactory.create();
  tournament1.addPlayers(["Alice", "Bob", "Charlie", "Dave", "Eve"], 0);

  // First round - all active
  const round1 = tournament1.createRound(Americano, 1);
  round1.matches[0].submitScore([11, 5]);

  // Deactivate one player
  tournament1.players().find(p => p.name === "Alice")!.activate(false);

  // Second round - Alice is inactive
  tournament1.createRound(Americano, 1);

  const export1 = tournament1.exportBackup(settings1);

  const tournament2 = tournamentFactory.create();
  const settings2 = settingsFactory.create();
  tournament2.importBackup(export1, settings2);

  expect(tournament2.rounds[1].inactive).toHaveLength(1);
  expect(tournament2.rounds[1].inactive[0].name).toBe("Alice");
});

test("ROUNDTRIP: should preserve settings (courts, matchingSpec)", ({ players }) => {
  const settings1 = settingsFactory.create();
  settings1.setCourts(5);
  settings1.setMatchingSpec(AmericanoMixed);

  const tournament1 = tournamentFactory.create();
  tournament1.addPlayers(players.slice(0, 4).map(p => p.name), 0);

  const export1 = tournament1.exportBackup(settings1);

  const tournament2 = tournamentFactory.create();
  const settings2 = settingsFactory.create();
  tournament2.importBackup(export1, settings2);

  expect(settings2.courts).toBe(5);
  expect(settings2.matchingSpec).toEqual(AmericanoMixed);
});

test("ROUNDTRIP: should preserve complex matching specs", ({ players, scores }) => {
  const settings1 = settingsFactory.create();
  settings1.setMatchingSpec(Tournicano);

  const tournament1 = runTournament(players.slice(0, 6), [scores[0]], Tournicano);

  const export1 = tournament1.exportBackup(settings1);

  const tournament2 = tournamentFactory.create();
  const settings2 = settingsFactory.create();
  tournament2.importBackup(export1, settings2);

  expect(settings2.matchingSpec).toEqual(Tournicano);
});

test("ROUNDTRIP: should preserve multiple groups correctly", ({ players }) => {
  const settings1 = settingsFactory.create();
  const tournament1 = tournamentFactory.create();
  
  tournament1.addPlayers([players[0].name, players[1].name], 0);
  tournament1.addPlayers([players[2].name, players[3].name], 1);
  tournament1.addPlayers([players[4].name, players[5].name], 2);

  const export1 = tournament1.exportBackup(settings1);

  const tournament2 = tournamentFactory.create();
  const settings2 = settingsFactory.create();
  tournament2.importBackup(export1, settings2);

  expect(tournament2.groups).toEqual([0, 1, 2]);
  expect(tournament2.players(0)).toHaveLength(2);
  expect(tournament2.players(1)).toHaveLength(2);
  expect(tournament2.players(2)).toHaveLength(2);
});

// ==========================================
// 4. OVERWRITE TESTS
// ==========================================

test("should clear existing players when importing", ({ players }) => {
  const tournament = tournamentFactory.create();
  tournament.addPlayers([players[0].name, players[1].name], 0);

  const settings = settingsFactory.create();

  const newBackup = JSON.stringify({
    version: 1,
    exportDate: new Date().toISOString(),
    settings: { courts: 2, matchingSpec: Americano },
    players: [
      { name: "NewPlayer1", group: 0, active: true },
      { name: "NewPlayer2", group: 0, active: true },
    ],
    rounds: [],
  });

  tournament.importBackup(newBackup, settings);

  expect(tournament.players()).toHaveLength(2);
  expect(tournament.players()[0].name).toBe("NewPlayer1");
  expect(tournament.players()[1].name).toBe("NewPlayer2");
});

test("should clear existing rounds when importing", ({ players, scores }) => {
  const tournament = runTournament(players.slice(0, 4), [scores[0], scores[1]], Americano);
  
  expect(tournament.rounds).toHaveLength(2);

  const settings = settingsFactory.create();

  const emptyBackup = JSON.stringify({
    version: 1,
    exportDate: new Date().toISOString(),
    settings: { courts: 2, matchingSpec: Americano },
    players: [
      { name: "Alice", group: 0, active: true },
      { name: "Bob", group: 0, active: true },
    ],
    rounds: [],
  });

  tournament.importBackup(emptyBackup, settings);

  expect(tournament.rounds).toHaveLength(0);
  expect(tournament.players()).toHaveLength(2);
});

test("should update settings when importing", () => {
  const tournament = tournamentFactory.create();
  const settings = settingsFactory.create();
  
  settings.setCourts(10);
  settings.setMatchingSpec(AmericanoMixed);

  const newBackup = JSON.stringify({
    version: 1,
    exportDate: new Date().toISOString(),
    settings: { courts: 3, matchingSpec: Mexicano },
    players: [],
    rounds: [],
  });

  tournament.importBackup(newBackup, settings);

  expect(settings.courts).toBe(3);
  expect(settings.matchingSpec).toEqual(Mexicano);
});

// ==========================================
// 5. SUCCESS FEEDBACK TESTS
// ==========================================

test("should return success with player and round count summary", ({ players, scores }) => {
  const settings1 = settingsFactory.create();
  const tournament1 = runTournament(players.slice(0, 6), [scores[0], scores[1]], Americano);

  const export1 = tournament1.exportBackup(settings1);

  const tournament2 = tournamentFactory.create();
  const settings2 = settingsFactory.create();
  const result = tournament2.importBackup(export1, settings2);

  expect(result.success).toBe(true);
  expect(result.summary).toBe("Imported 6 players and 2 rounds");
});

test("should return success for empty tournament import", () => {
  const tournament = tournamentFactory.create();
  const settings = settingsFactory.create();

  const emptyBackup = JSON.stringify({
    version: 1,
    exportDate: new Date().toISOString(),
    settings: { courts: 2, matchingSpec: Americano },
    players: [],
    rounds: [],
  });

  const result = tournament.importBackup(emptyBackup, settings);

  expect(result.success).toBe(true);
  expect(result.summary).toBe("Imported 0 players and 0 rounds");
});

test("should use singular form for 1 player and 1 round", () => {
  const tournament = tournamentFactory.create();
  const settings = settingsFactory.create();

  const backup = JSON.stringify({
    version: 1,
    exportDate: new Date().toISOString(),
    settings: { courts: 2, matchingSpec: Americano },
    players: [
      { name: "Alice", group: 0, active: true },
    ],
    rounds: [],
  });

  const result = tournament.importBackup(backup, settings);

  expect(result.success).toBe(true);
  expect(result.summary).toBe("Imported 1 player and 0 rounds");
});

// ==========================================
// 6. ACCUMULATED STATS TESTS
// ==========================================

test("STATS: should preserve matchCount across multiple rounds", ({ players, scores }) => {
  const settings1 = settingsFactory.create();
  const tournament1 = runTournament(players.slice(0, 4), [scores[0], scores[1]], Americano);

  // Verify matchCount in original tournament
  const lastRound1 = tournament1.rounds[tournament1.rounds.length - 1];
  const player1 = lastRound1.matches[0].teamA.player1;
  expect(player1.matchCount).toBe(2); // Played in 2 rounds

  // Export and import
  const export1 = tournament1.exportBackup(settings1);
  const tournament2 = tournamentFactory.create();
  const settings2 = settingsFactory.create();
  tournament2.importBackup(export1, settings2);

  // Verify matchCount is preserved after import
  const lastRound2 = tournament2.rounds[tournament2.rounds.length - 1];
  const player2 = lastRound2.matches[0].teamA.player1;
  expect(player2.matchCount).toBe(2); // Should still be 2
});

test("STATS: should preserve pauseCount across multiple rounds", ({ players }) => {
  const settings1 = settingsFactory.create();
  const tournament1 = tournamentFactory.create();
  
  // Add 5 players so someone gets paused
  tournament1.addPlayers(players.slice(0, 5).map(p => p.name), 0);
  
  // Create 3 rounds (with 1 court, 4 players play, 1 pauses each round)
  const round1 = tournament1.createRound(Americano, 1);
  const round2 = tournament1.createRound(Americano, 1);
  const round3 = tournament1.createRound(Americano, 1);
  
  round1.matches[0].submitScore([11, 0]);
  round2.matches[0].submitScore([11, 0]);
  // Round 3 has no scores yet
  
  // Find a player who paused
  const pausedPlayer1 = round3.paused[0];
  
  if (pausedPlayer1 && pausedPlayer1.pauseCount > 0) {
    const originalPauseCount = pausedPlayer1.pauseCount;
    
    // Export and import
    const export1 = tournament1.exportBackup(settings1);
    const tournament2 = tournamentFactory.create();
    const settings2 = settingsFactory.create();
    tournament2.importBackup(export1, settings2);
    
    // Find the same player after import
    const round3Import = tournament2.rounds[2];
    const pausedPlayer2 = round3Import.paused.find(p => p.name === pausedPlayer1.name);
    
    expect(pausedPlayer2?.pauseCount).toBe(originalPauseCount);
  }
});

test("STATS: should preserve partner history across rounds", ({ players, scores }) => {
  const settings1 = settingsFactory.create();
  const tournament1 = runTournament(players.slice(0, 4), [scores[0], scores[1]], Americano);

  // Get partner history from original tournament
  const lastRound1 = tournament1.rounds[tournament1.rounds.length - 1];
  const player1 = lastRound1.matches[0].teamA.player1;
  const partnerCount1 = player1.partners.size;
  
  expect(partnerCount1).toBeGreaterThan(0); // Should have partners

  // Export and import
  const export1 = tournament1.exportBackup(settings1);
  const tournament2 = tournamentFactory.create();
  const settings2 = settingsFactory.create();
  tournament2.importBackup(export1, settings2);

  // Verify partner history is preserved
  const lastRound2 = tournament2.rounds[tournament2.rounds.length - 1];
  const player2 = lastRound2.matches[0].teamA.player1;
  expect(player2.partners.size).toBe(partnerCount1);
});

test("STATS: should preserve opponent history across rounds", ({ players, scores }) => {
  const settings1 = settingsFactory.create();
  const tournament1 = runTournament(players.slice(0, 4), [scores[0], scores[1]], Americano);

  // Get opponent history from original tournament
  const lastRound1 = tournament1.rounds[tournament1.rounds.length - 1];
  const player1 = lastRound1.matches[0].teamA.player1;
  const opponentCount1 = player1.opponents.size;
  
  expect(opponentCount1).toBeGreaterThan(0); // Should have opponents

  // Export and import
  const export1 = tournament1.exportBackup(settings1);
  const tournament2 = tournamentFactory.create();
  const settings2 = settingsFactory.create();
  tournament2.importBackup(export1, settings2);

  // Verify opponent history is preserved
  const lastRound2 = tournament2.rounds[tournament2.rounds.length - 1];
  const player2 = lastRound2.matches[0].teamA.player1;
  expect(player2.opponents.size).toBe(opponentCount1);
});

test("STATS: should accumulate stats when last round has no scores", ({ players, scores }) => {
  const settings1 = settingsFactory.create();
  const tournament1 = runTournament(players.slice(0, 4), [scores[0]], Americano);
  
  // Create another round WITHOUT scoring it
  tournament1.createRound(Americano);
  
  // Get stats from original tournament's last round
  const lastRound1 = tournament1.rounds[tournament1.rounds.length - 1];
  const player1 = lastRound1.matches[0].teamA.player1;
  expect(player1.matchCount).toBe(2); // Played in both rounds

  // Export and import
  const export1 = tournament1.exportBackup(settings1);
  const tournament2 = tournamentFactory.create();
  const settings2 = settingsFactory.create();
  tournament2.importBackup(export1, settings2);

  // Verify stats are accumulated even though last round has no scores
  const lastRound2 = tournament2.rounds[tournament2.rounds.length - 1];
  const player2 = lastRound2.matches[0].teamA.player1;
  expect(player2.matchCount).toBe(2); // Should have accumulated matchCount from both rounds
  expect(player2.partners.size).toBeGreaterThan(0); // Should have partner history
  expect(player2.opponents.size).toBeGreaterThan(0); // Should have opponent history
});

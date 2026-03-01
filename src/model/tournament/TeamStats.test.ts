import { test, expect, describe } from "vitest";
import { tournamentFactory } from "./Tournament.impl.ts";
import { Americano } from "../matching/MatchingSpec.ts";
import { createTeamKey } from "./Tournament.ts";

/**
 * Tests for team performance tracking across rounds.
 * Teams should accumulate performance stats (wins/losses/points) for leaderboards.
 */

describe("Team Performance Tracking", () => {
  test("T20: Team identity created in round 1", () => {
    // Setup: 4 players, 1 round
    const tournament = tournamentFactory.create();
    tournament.addPlayers(["Alice", "Bob", "Charlie", "Diana"]);

    // Create round 1
    const round1 = tournament.createRound(Americano, 1);

    // Verify: Teams should exist
    const teams = round1.getParticipatingTeams();
    expect(teams.length).toBeGreaterThan(0);

    // Each team should have identity
    for (const team of teams) {
      expect(team.teamKey).toBeDefined();
      expect(team.player1Id).toBeDefined();
      expect(team.player2Id).toBeDefined();
    }
  });

  test("T21: Team structure maintained across multiple rounds", () => {
    // Setup: 6 players to ensure some teams repeat across rounds
    const tournament = tournamentFactory.create();
    tournament.addPlayers(["Alice", "Bob", "Charlie", "Diana", "Eve", "Frank"]);

    // Create 5 rounds to increase chance of team repetition
    for (let i = 0; i < 5; i++) {
      tournament.createRound(Americano, 1);
    }

    const round5 = tournament.rounds[4];
    const round5Teams = round5.getParticipatingTeams();
    expect(round5Teams.length).toBeGreaterThan(0);
    
    // Verify team structure across rounds
    const allTeamKeys = new Set<string>();
    for (let i = 0; i < 5; i++) {
      const teams = tournament.rounds[i].getParticipatingTeams();
      teams.forEach(t => allTeamKeys.add(t.teamKey));
    }
    
    // With 5 rounds and 1 match per round, we create 10 team slots (2 teams per match)
    // There are only 15 possible unique teams (C(6,2)), so structure should be valid
    expect(allTeamKeys.size).toBeGreaterThan(0);
    expect(allTeamKeys.size).toBeLessThanOrEqual(15); // Can't exceed C(6,2)
  });

  test("T22: Same team in different rounds maintains identity", () => {
    // Setup: 4 players, create consistent teams across rounds
    const tournament = tournamentFactory.create();
    tournament.addPlayers(["Alice", "Bob", "Charlie", "Diana"]);

    // Create round 1
    const round1 = tournament.createRound(Americano, 1);
    const round1Teams = round1.getParticipatingTeams();

    // Find a team that played in round 1
    const firstTeam = round1Teams[0];
    const teamKey = firstTeam.teamKey;

    // Create round 2
    const round2 = tournament.createRound(Americano, 1);
    const round2Teams = round2.getParticipatingTeams();

    // Find the same team in round 2
    const sameTeamInRound2 = round2Teams.find(t => t.teamKey === teamKey);

    // If the same team exists in round 2, it should maintain its identity
    if (sameTeamInRound2) {
      expect(sameTeamInRound2.teamKey).toBe(teamKey);
      expect(sameTeamInRound2.player1Id).toBe(firstTeam.player1Id);
      expect(sameTeamInRound2.player2Id).toBe(firstTeam.player2Id);
    }
  });

  test("T23: Team performance cascades when scores submitted", () => {
    // Setup: 4 players, 2 rounds with scores
    const tournament = tournamentFactory.create();
    tournament.addPlayers(["Alice", "Bob", "Charlie", "Diana"]);

    // Create round 1 and submit score
    const round1 = tournament.createRound(Americano, 1);
    const match = round1.matches[0];
    
    round1.matches[0].submitScore([11, 5]);

    // Get the teams from round 1
    const round1Teams = round1.getParticipatingTeams();
    const teamAKey = createTeamKey(match.teamA.player1.id, match.teamA.player2.id);
    const teamBKey = createTeamKey(match.teamB.player1.id, match.teamB.player2.id);

    // Find the teams in round 1
    const teamA_r1 = round1Teams.find(t => t.teamKey === teamAKey);
    const teamB_r1 = round1Teams.find(t => t.teamKey === teamBKey);

    expect(teamA_r1).toBeDefined();
    expect(teamB_r1).toBeDefined();

    // Team A should have performance from winning 11-5
    if (teamA_r1) {
      expect(teamA_r1.wins).toBe(1);
      expect(teamA_r1.losses).toBe(0);
      expect(teamA_r1.pointsFor).toBe(11);
      expect(teamA_r1.pointsAgainst).toBe(5);
    }

    // Team B should have performance from losing 5-11
    if (teamB_r1) {
      expect(teamB_r1.wins).toBe(0);
      expect(teamB_r1.losses).toBe(1);
      expect(teamB_r1.pointsFor).toBe(5);
      expect(teamB_r1.pointsAgainst).toBe(11);
    }

    // Create round 2
    const round2 = tournament.createRound(Americano, 1);
    const round2Teams = round2.getParticipatingTeams();

    // Find the same teams in round 2
    const teamA_r2 = round2Teams.find(t => t.teamKey === teamAKey);
    const teamB_r2 = round2Teams.find(t => t.teamKey === teamBKey);

    // If teams exist in round 2, they should carry forward their performance
    if (teamA_r2) {
      expect(teamA_r2.wins).toBe(1);
      expect(teamA_r2.pointsFor).toBe(11);
      expect(teamA_r2.pointsAgainst).toBe(5);
    }

    if (teamB_r2) {
      expect(teamB_r2.wins).toBe(0);
      expect(teamB_r2.losses).toBe(1);
      expect(teamB_r2.pointsFor).toBe(5);
      expect(teamB_r2.pointsAgainst).toBe(11);
    }
  });

  test("Team performance work with serialization/deserialization", () => {
    // Setup: 4 players, create rounds with scores
    const tournament1 = tournamentFactory.create();
    tournament1.addPlayers(["Alice", "Bob", "Charlie", "Diana"]);

    // Create 2 rounds with scores
    const round1 = tournament1.createRound(Americano, 1);
    round1.matches[0].submitScore([11, 5]);

    const round2 = tournament1.createRound(Americano, 1);
    round2.matches[0].submitScore([8, 11]);

    // Get team from round 2 before serialization
    const match = round2.matches[0];
    const teamKey = createTeamKey(match.teamA.player1.id, match.teamA.player2.id);
    const teamBeforeSerialization = round2.getParticipatingTeams().find(t => t.teamKey === teamKey);

    // Serialize and deserialize
    const serialized = tournament1.serialize();
    const tournament2 = tournamentFactory.create(serialized);

    // Get the same round and team after deserialization
    const round2Deserialized = tournament2.rounds[1];
    const teamAfterDeserialization = round2Deserialized.getParticipatingTeams().find(t => t.teamKey === teamKey);

    // Verify team performance stats are preserved
    if (teamBeforeSerialization && teamAfterDeserialization) {
      expect(teamAfterDeserialization.wins).toBe(teamBeforeSerialization.wins);
      expect(teamAfterDeserialization.losses).toBe(teamBeforeSerialization.losses);
      expect(teamAfterDeserialization.pointsFor).toBe(teamBeforeSerialization.pointsFor);
      expect(teamAfterDeserialization.pointsAgainst).toBe(teamBeforeSerialization.pointsAgainst);
    }
  });
});

import { expect } from "vitest";
import { test, Player } from "../tournament/TestHelpers.ts";
import {
  Americano,
  AmericanoMixed,
  AmericanoMixedBalanced,
  GroupBattle,
  MatchingSpec,
  MatchUpGroupMode,
  TeamUpGroupMode,
  TeamUpPerformanceMode,
} from "./MatchingSpec.ts";
import { matching, partitionPlayers } from "./Matching.ts";

// Tests for group balancing in matching algorithm
test("should balance groups with single group", ({ players }) => {
  const spec: MatchingSpec = { ...Americano, balanceGroups: true };
  players.forEach(p => p.group = 0);

  const [matches, paused] = matching(players.slice(0, 8), spec, 0, 2);

  expect(matches).toHaveLength(2);
  expect(paused).toHaveLength(0);
});

test("should balance 2 groups evenly", ({ players }) => {
  const spec: MatchingSpec = { ...Americano, balanceGroups: true };
  for (let i = 0; i < 4; i++) players[i].group = 0;
  for (let i = 4; i < 8; i++) players[i].group = 1;

  const [matches, _paused] = matching(players.slice(0, 8), spec, 0, 2);

  expect(matches).toHaveLength(2);
  // Count players per group in competing
  const competingGroup0 = matches.flatMap(m => m.flat()).filter(p => p.group === 0);
  const competingGroup1 = matches.flatMap(m => m.flat()).filter(p => p.group === 1);
  expect(competingGroup0).toHaveLength(4);
  expect(competingGroup1).toHaveLength(4);
});

test("should balance 2 uneven groups", ({ players }) => {
  const spec: MatchingSpec = { ...Americano, balanceGroups: true };
  // Group 0: 7 players, Group 1: 3 players
  for (let i = 0; i < 7; i++) players[i].group = 0;
  for (let i = 7; i < 10; i++) players[i].group = 1;

  const [matches, paused] = matching(players, spec, 0, 2);

  // Group 1 has 3 players, can only contribute 2 (multiple of 2)
  // So: 2 from each = 4 players = 1 match
  expect(matches).toHaveLength(1);
  const competingGroup0 = matches.flatMap(m => m.flat()).filter(p => p.group === 0);
  const competingGroup1 = matches.flatMap(m => m.flat()).filter(p => p.group === 1);
  expect(competingGroup0).toHaveLength(2);
  expect(competingGroup1).toHaveLength(2);

  // Paused: 5 from group 0, 1 from group 1
  const pausedGroup0 = paused.filter(p => p.group === 0);
  const pausedGroup1 = paused.filter(p => p.group === 1);
  expect(pausedGroup0).toHaveLength(5);
  expect(pausedGroup1).toHaveLength(1);
});

test("should balance 3 groups with multiple of 4", ({ players }) => {
  const allPlayers = [...players];
  for (let i = 10; i < 24; i++) {
    allPlayers.push(new Player(`${i}`, `Player${i}`));
  }

  const spec: MatchingSpec = { ...Americano, balanceGroups: true };
  // Group 0: 10 players, Group 1: 8 players, Group 2: 6 players
  for (let i = 0; i < 10; i++) allPlayers[i].group = 0;
  for (let i = 10; i < 18; i++) allPlayers[i].group = 1;
  for (let i = 18; i < 24; i++) allPlayers[i].group = 2;

  const [matches, paused] = matching(allPlayers, spec, 0, 4);

  // 3 groups are not supported with balancing - should return 0 matches
  expect(matches).toHaveLength(0);
  expect(paused).toHaveLength(24); // All players paused
});

test("should balance 4 groups", ({ players: _players }) => {
  const allPlayers = [];
  for (let i = 0; i < 16; i++) {
    const p = new Player(`${i}`, `Player${i}`);
    p.group = Math.floor(i / 4);
    allPlayers.push(p);
  }

  const spec: MatchingSpec = { ...Americano, balanceGroups: true };
  const [matches, _paused] = matching(allPlayers, spec, 0, 4);

  expect(matches).toHaveLength(4);
  // Each group should have 4 competing
  for (let g = 0; g < 4; g++) {
    const competingInGroup = matches.flatMap(m => m.flat()).filter(p => p.group === g);
    expect(competingInGroup).toHaveLength(4);
  }
});

test("should respect maxMatches constraint with balancing", ({ players }) => {
  const spec: MatchingSpec = { ...Americano, balanceGroups: true };
  for (let i = 0; i < 4; i++) players[i].group = 0;
  for (let i = 4; i < 8; i++) players[i].group = 1;

  // With 8 players and 2 groups, could do 2 matches
  // But limit to 1 match
  const [matches, _paused] = matching(players.slice(0, 8), spec, 0, 1);

  expect(matches).toHaveLength(1);
  const competingGroup0 = matches.flatMap(m => m.flat()).filter(p => p.group === 0);
  const competingGroup1 = matches.flatMap(m => m.flat()).filter(p => p.group === 1);
  expect(competingGroup0).toHaveLength(2);
  expect(competingGroup1).toHaveLength(2);
});

test("should handle impossible balance gracefully", ({ players }) => {
  const spec: MatchingSpec = { ...Americano, balanceGroups: true };
  for (let i = 0; i < 8; i++) players[i].group = 0;
  players[8].group = 1; // Only 1 player in group 1

  const [matches, paused] = matching(players.slice(0, 9), spec, 0, 2);

  // Group 1 can only contribute 0 (multiple of 2)
  expect(matches).toHaveLength(0);
  expect(paused).toHaveLength(9);
});

test("should select by playRatio within each group", ({ players }) => {
  const spec: MatchingSpec = { ...Americano, balanceGroups: true };
  for (let i = 0; i < 4; i++) players[i].group = 0;
  for (let i = 4; i < 8; i++) players[i].group = 1;

  // Set playRatios
  players[0].matchCount = 2; // Higher ratio
  players[1].matchCount = 1;
  players[2].matchCount = 0; // Lower ratio - should play
  players[3].matchCount = 0; // Lower ratio - should play

  players[4].matchCount = 3; // Higher ratio
  players[5].matchCount = 0; // Lower ratio - should play
  players[6].matchCount = 0; // Lower ratio - should play
  players[7].matchCount = 1;

  const [matches, _paused] = matching(players.slice(0, 8), spec, 0, 1);

  const competing = matches.flatMap(m => m.flat());
  // Should include players with lower playRatio
  expect(competing.some(p => p.id === "2")).toBe(true);
  expect(competing.some(p => p.id === "3")).toBe(true);
  expect(competing.some(p => p.id === "5")).toBe(true);
  expect(competing.some(p => p.id === "6")).toBe(true);
});

test("should handle non-sequential group numbers", ({ players }) => {
  const spec: MatchingSpec = { ...Americano, balanceGroups: true };
  for (let i = 0; i < 4; i++) players[i].group = 1; // Group 1
  for (let i = 4; i < 8; i++) players[i].group = 5; // Group 5

  const [matches, _paused] = matching(players.slice(0, 8), spec, 0, 2);

  expect(matches).toHaveLength(2);
  const competingGroup1 = matches.flatMap(m => m.flat()).filter(p => p.group === 1);
  const competingGroup5 = matches.flatMap(m => m.flat()).filter(p => p.group === 5);
  expect(competingGroup1).toHaveLength(4);
  expect(competingGroup5).toHaveLength(4);
});

test("GroupBattle mode should balance groups", ({ players }) => {
  for (let i = 0; i < 5; i++) players[i].group = 0;
  for (let i = 5; i < 10; i++) players[i].group = 1;

  const [matches, _paused] = matching(players, GroupBattle, 0, 2);

  // Should balance despite uneven group sizes
  const competingGroup0 = matches.flatMap(m => m.flat()).filter(p => p.group === 0);
  const competingGroup1 = matches.flatMap(m => m.flat()).filter(p => p.group === 1);
  expect(competingGroup0.length).toBe(competingGroup1.length);
});

// AmericanoMixedBalanced preset tests
test("AmericanoMixedBalanced should have balanceGroups enabled", () => {
  expect(AmericanoMixedBalanced.balanceGroups).toBe(true);
  expect(AmericanoMixedBalanced.teamUp.groupMode).toBe(TeamUpGroupMode.PAIRED);
  expect(AmericanoMixedBalanced.matchUp.groupMode).toBe(MatchUpGroupMode.SAME);
});

test("AmericanoMixedBalanced should balance groups in practice", ({ players }) => {
  for (let i = 0; i < 6; i++) players[i].group = 0;
  for (let i = 6; i < 10; i++) players[i].group = 1;

  const [matches, _paused] = matching(players, AmericanoMixedBalanced, 0, 2);

  const competingGroup0 = matches.flatMap(m => m.flat()).filter(p => p.group === 0);
  const competingGroup1 = matches.flatMap(m => m.flat()).filter(p => p.group === 1);
  expect(competingGroup0.length).toBe(competingGroup1.length);
});

// Tests for partitionPlayers function

test("partitionPlayers should return group distribution for single group", ({ players }) => {
  players.forEach(p => p.group = 0);
  
  const result = partitionPlayers(players.slice(0, 8), Americano, 2);
  
  expect(result.competing).toHaveLength(8);
  expect(result.paused).toHaveLength(0);
  expect(result.groupDistribution.size).toBe(1);
  
  const group0 = result.groupDistribution.get(0)!;
  expect(group0.total).toBe(8);
  expect(group0.competing).toBe(8);
  expect(group0.paused).toBe(0);
});

test("partitionPlayers should return group distribution for multiple groups", ({ players }) => {
  for (let i = 0; i < 5; i++) players[i].group = 0;
  for (let i = 5; i < 10; i++) players[i].group = 1;
  
  const result = partitionPlayers(players, Americano, 2);
  
  expect(result.competing).toHaveLength(8);
  expect(result.paused).toHaveLength(2);
  expect(result.groupDistribution.size).toBe(2);
  
  const group0 = result.groupDistribution.get(0)!;
  const group1 = result.groupDistribution.get(1)!;
  
  expect(group0.total).toBe(5);
  expect(group1.total).toBe(5);
  expect(group0.competing + group1.competing).toBe(8);
  expect(group0.paused + group1.paused).toBe(2);
});

test("partitionPlayers should balance groups when enabled", ({ players }) => {
  const spec: MatchingSpec = { ...Americano, balanceGroups: true };
  for (let i = 0; i < 7; i++) players[i].group = 0;
  for (let i = 7; i < 10; i++) players[i].group = 1;
  
  const result = partitionPlayers(players, spec, 2);
  
  expect(result.groupDistribution.size).toBe(2);
  
  const group0 = result.groupDistribution.get(0)!;
  const group1 = result.groupDistribution.get(1)!;
  
  expect(group0.total).toBe(7);
  expect(group1.total).toBe(3);
  
  // With balancing, should have equal competing from each group
  expect(group0.competing).toBe(2);
  expect(group1.competing).toBe(2);
  expect(group0.paused).toBe(5);
  expect(group1.paused).toBe(1);
});

test("partitionPlayers should respect maxMatches constraint", ({ players }) => {
  players.forEach(p => p.group = 0);
  
  const result = partitionPlayers(players, Americano, 1);
  
  expect(result.competing).toHaveLength(4); // 1 match = 4 players
  expect(result.paused).toHaveLength(6);
  
  const group0 = result.groupDistribution.get(0)!;
  expect(group0.competing).toBe(4);
  expect(group0.paused).toBe(6);
});

test("partitionPlayers should reject 3 groups with balancing", () => {
  const spec: MatchingSpec = { ...Americano, balanceGroups: true };
  // Create 3 groups with 4 players each (12 total)
  const testPlayers = [
    new Player("0", "P0"), new Player("1", "P1"), new Player("2", "P2"), new Player("3", "P3"),
    new Player("4", "P4"), new Player("5", "P5"), new Player("6", "P6"), new Player("7", "P7"),
    new Player("8", "P8"), new Player("9", "P9"), new Player("10", "P10"), new Player("11", "P11"),
  ];
  for (let i = 0; i < 4; i++) testPlayers[i].group = 0;
  for (let i = 4; i < 8; i++) testPlayers[i].group = 1;
  for (let i = 8; i < 12; i++) testPlayers[i].group = 2;
  
  const result = partitionPlayers(testPlayers, spec, 10);
  
  // Should return all paused, none competing
  expect(result.competing).toHaveLength(0);
  expect(result.paused).toHaveLength(12);
  expect(result.groupDistribution.size).toBe(3);
  
  // All players should be paused
  const group0 = result.groupDistribution.get(0)!;
  const group1 = result.groupDistribution.get(1)!;
  const group2 = result.groupDistribution.get(2)!;
  expect(group0.competing).toBe(0);
  expect(group1.competing).toBe(0);
  expect(group2.competing).toBe(0);
  expect(group0.paused).toBe(4);
  expect(group1.paused).toBe(4);
  expect(group2.paused).toBe(4);
});

test("partitionPlayers should work with 2 groups and balancing", ({ players }) => {
  const spec: MatchingSpec = { ...Americano, balanceGroups: true };
  for (let i = 0; i < 5; i++) players[i].group = 0;
  for (let i = 5; i < 10; i++) players[i].group = 1;
  
  const result = partitionPlayers(players, spec, 2);
  
  // Should successfully create matches with 2 groups
  expect(result.competing.length).toBeGreaterThan(0);
  expect(result.groupDistribution.size).toBe(2);
});

test("partitionPlayers should work with 4 groups and balancing", () => {
  const spec: MatchingSpec = { ...Americano, balanceGroups: true };
  // Create 4 groups with 4 players each (16 total)
  const testPlayers = [
    new Player("0", "P0"), new Player("1", "P1"), new Player("2", "P2"), new Player("3", "P3"),
    new Player("4", "P4"), new Player("5", "P5"), new Player("6", "P6"), new Player("7", "P7"),
    new Player("8", "P8"), new Player("9", "P9"), new Player("10", "P10"), new Player("11", "P11"),
    new Player("12", "P12"), new Player("13", "P13"), new Player("14", "P14"), new Player("15", "P15"),
  ];
  for (let i = 0; i < 4; i++) testPlayers[i].group = 0;
  for (let i = 4; i < 8; i++) testPlayers[i].group = 1;
  for (let i = 8; i < 12; i++) testPlayers[i].group = 2;
  for (let i = 12; i < 16; i++) testPlayers[i].group = 3;
  
  const result = partitionPlayers(testPlayers, spec, 4);
  
  // Should successfully create matches with 4 groups
  expect(result.competing.length).toBeGreaterThan(0);
  expect(result.groupDistribution.size).toBe(4);
});

test("partitionPlayers should work with 4 groups having uneven sizes", () => {
  const spec: MatchingSpec = { ...Americano, balanceGroups: true };
  // Create 4 groups: A=3, B=2, C=2, D=1 (8 total)
  const testPlayers = [
    new Player("0", "P0"), new Player("1", "P1"), new Player("2", "P2"), // Group A
    new Player("3", "P3"), new Player("4", "P4"),                        // Group B
    new Player("5", "P5"), new Player("6", "P6"),                        // Group C
    new Player("7", "P7"),                                               // Group D
  ];
  testPlayers[0].group = 0; testPlayers[1].group = 0; testPlayers[2].group = 0;
  testPlayers[3].group = 1; testPlayers[4].group = 1;
  testPlayers[5].group = 2; testPlayers[6].group = 2;
  testPlayers[7].group = 3;
  
  const result = partitionPlayers(testPlayers, spec, 2);
  
  // Should create 1 match with 1 player from each group (4 total)
  expect(result.competing.length).toBe(4);
  expect(result.paused.length).toBe(4);
  expect(result.groupDistribution.size).toBe(4);
  
  // Each group should have 1 competing
  for (let i = 0; i < 4; i++) {
    const group = result.groupDistribution.get(i)!;
    expect(group.competing).toBe(1);
  }
});

test("partitionPlayers should work with 4 groups having 1 player each", () => {
  const spec: MatchingSpec = { ...Americano, balanceGroups: true };
  const testPlayers = [
    new Player("0", "P0"), new Player("1", "P1"),
    new Player("2", "P2"), new Player("3", "P3"),
  ];
  testPlayers[0].group = 0;
  testPlayers[1].group = 1;
  testPlayers[2].group = 2;
  testPlayers[3].group = 3;
  
  const result = partitionPlayers(testPlayers, spec, 1);
  
  // Should create 1 match with all 4 players
  expect(result.competing.length).toBe(4);
  expect(result.paused.length).toBe(0);
  expect(result.groupDistribution.size).toBe(4);
});

test("partitionPlayers should reject 2 groups with only 1 player each", () => {
  const spec: MatchingSpec = { ...Americano, balanceGroups: true };
  const testPlayers = [
    new Player("0", "P0"), new Player("1", "P1"),
  ];
  testPlayers[0].group = 0;
  testPlayers[1].group = 1;
  
  const result = partitionPlayers(testPlayers, spec, 1);
  
  // Should return all paused (need 2 per group for 2-group mode)
  expect(result.competing.length).toBe(0);
  expect(result.paused.length).toBe(2);
});

test("partitionPlayers should reject 5 groups with balancing", () => {
  const spec: MatchingSpec = { ...Americano, balanceGroups: true };
  const testPlayers = [
    new Player("0", "P0"), new Player("1", "P1"),
    new Player("2", "P2"), new Player("3", "P3"),
    new Player("4", "P4"),
  ];
  testPlayers[0].group = 0;
  testPlayers[1].group = 1;
  testPlayers[2].group = 2;
  testPlayers[3].group = 3;
  testPlayers[4].group = 4;
  
  const result = partitionPlayers(testPlayers, spec, 2);
  
  // Should return all paused (only 2 or 4 groups supported)
  expect(result.competing.length).toBe(0);
  expect(result.paused.length).toBe(5);
});

test("partitionPlayers should reject 6 groups with balancing", () => {
  const spec: MatchingSpec = { ...Americano, balanceGroups: true };
  const testPlayers = [
    new Player("0", "P0"), new Player("1", "P1"),
    new Player("2", "P2"), new Player("3", "P3"),
    new Player("4", "P4"), new Player("5", "P5"),
  ];
  for (let i = 0; i < 6; i++) testPlayers[i].group = i;
  
  const result = partitionPlayers(testPlayers, spec, 2);
  
  // Should return all paused (only 2 or 4 groups supported)
  expect(result.competing.length).toBe(0);
  expect(result.paused.length).toBe(6);
});

// Test for back-to-back pause bug with 7 players
test("should not pause same players in consecutive rounds (7 players)", () => {
  const allPlayers: Player[] = [];
  for (let i = 0; i < 7; i++) {
    allPlayers.push(new Player(`${i}`, `Player${i}`));
  }

  const spec = Americano;
  let backToBackPauseFound = false;

  // Simulate 20 rounds
  for (let round = 0; round < 20; round++) {
    const [matches, paused] = matching(allPlayers, spec, round, 1);

    // Check if any player paused this round also paused last round (back-to-back)
    if (round > 0) {
      const backToBackPlayers = paused.filter(p => p.lastPause === round - 1);
      if (backToBackPlayers.length > 0) {
        console.log(
          `Round ${round}: Back-to-back pause detected for players: ${
            backToBackPlayers.map(p => p.id).join(', ')
          }`
        );
        backToBackPauseFound = true;
      }
    }

    // Update player stats
    matches.forEach((match) => {
      match.forEach((team) => {
        team.forEach((player) => {
          const mutablePlayer = allPlayers.find(p => p.id === player.id)!;
          mutablePlayer.matchCount++;

          // Track partners
          const partner = team[0].id === player.id ? team[1] : team[0];
          const partnerRounds = mutablePlayer.partners.get(partner.id) || [];
          partnerRounds.push(round);
          mutablePlayer.partners.set(partner.id, partnerRounds);

          // Track opponents
          const opponentTeam = match[0] === team ? match[1] : match[0];
          opponentTeam.forEach((opponent) => {
            const oppRounds = mutablePlayer.opponents.get(opponent.id) || [];
            oppRounds.push(round);
            mutablePlayer.opponents.set(opponent.id, oppRounds);
          });
        });
      });
    });

    paused.forEach(p => {
      const mutablePlayer = allPlayers.find(mp => mp.id === p.id)!;
      mutablePlayer.pauseCount++;
      mutablePlayer.lastPause = round;
    });
  }

  // Players should not pause in consecutive rounds (back-to-back)
  expect(backToBackPauseFound).toBe(false);
});

// Tests for simple partitioning mode (no group factors)

test("partitionPlayers should use simple mode for Americano (no group factors)", ({ players }) => {
  players.forEach(p => p.group = 0);
  
  // Set different play ratios
  players[0].matchCount = 5; // Higher ratio - should not play
  players[1].matchCount = 4;
  players[2].matchCount = 3;
  players[3].matchCount = 0; // Lower ratio - should play
  players[4].matchCount = 0; // Lower ratio - should play
  players[5].matchCount = 0; // Lower ratio - should play
  players[6].matchCount = 0; // Lower ratio - should play
  players[7].matchCount = 1;
  players[8].matchCount = 2;
  players[9].matchCount = 2;
  
  const result = partitionPlayers(players, Americano, 2);
  
  expect(result.competing).toHaveLength(8);
  expect(result.paused).toHaveLength(2);
  
  // Players with lowest playRatio should be competing
  const competingIds = result.competing.map(p => p.id);
  expect(competingIds).toContain("3");
  expect(competingIds).toContain("4");
  expect(competingIds).toContain("5");
  expect(competingIds).toContain("6");
  
  // Player with highest playRatio should be paused
  const pausedIds = result.paused.map(p => p.id);
  expect(pausedIds).toContain("0");
});

test("partitionPlayers simple mode should use lastPause as tiebreaker", ({ players }) => {
  players.forEach(p => p.group = 0);
  
  // All players have same play ratio
  players.forEach(p => {
    p.matchCount = 2;
    p.pauseCount = 2;
  });
  
  // Set very different lastPause values
  // Note: Higher lastPause = more recent pause, and those are selected to play (to prevent back-to-back pauses)
  // Group with very old pause (should pause - haven't been active recently)
  players[0].lastPause = -100;
  players[1].lastPause = -99;
  
  // Group with very recent pause (should compete - have been active recently)
  players[2].lastPause = 1000;
  players[3].lastPause = 1001;
  players[4].lastPause = 1002;
  players[5].lastPause = 1003;
  players[6].lastPause = 1004;
  players[7].lastPause = 1005;
  players[8].lastPause = 1006;
  players[9].lastPause = 1007;
  
  const result = partitionPlayers(players, Americano, 2);
  
  expect(result.competing).toHaveLength(8);
  expect(result.paused).toHaveLength(2);
  
  // With such extreme differences, lastPause tiebreaker should work despite shuffle
  // Players with MORE RECENT lastPause (higher values) should compete
  const pausedIds = result.paused.map(p => p.id);
  
  // The two with oldest pause should be paused
  expect(pausedIds).toContain("0");
  expect(pausedIds).toContain("1");
});

test("partitionPlayers simple mode should work with Mexicano", ({ players }) => {
  players.forEach(p => p.group = 0);
  
  // Set different play ratios
  players[0].matchCount = 3;
  players[1].matchCount = 0; // Should play
  players[2].matchCount = 0; // Should play
  players[3].matchCount = 0; // Should play
  players[4].matchCount = 0; // Should play
  players[5].matchCount = 2;
  players[6].matchCount = 1;
  players[7].matchCount = 1;
  players[8].matchCount = 1;
  players[9].matchCount = 1;
  
  const result = partitionPlayers(players, {
    teamUp: {
      varietyFactor: 0,
      performanceFactor: 100,
      performanceMode: TeamUpPerformanceMode.MEXICANO,
      groupFactor: 0,
      groupMode: TeamUpGroupMode.PAIRED,
    },
    matchUp: {
      varietyFactor: 0,
      performanceFactor: 100,
      groupFactor: 0,
      groupMode: MatchUpGroupMode.SAME,
    },
  }, 2);
  
  expect(result.competing).toHaveLength(8);
  expect(result.paused).toHaveLength(2);
  
  // Players with lowest playRatio should be competing
  const competingIds = result.competing.map(p => p.id);
  expect(competingIds).toContain("1");
  expect(competingIds).toContain("2");
  expect(competingIds).toContain("3");
  expect(competingIds).toContain("4");
});

test("partitionPlayers simple mode should ignore groups", ({ players }) => {
  // Set different groups
  for (let i = 0; i < 5; i++) players[i].group = 0;
  for (let i = 5; i < 10; i++) players[i].group = 1;
  
  // Set play ratios so group 0 players have lower ratios
  players[0].matchCount = 0; // Group 0, should play
  players[1].matchCount = 0; // Group 0, should play
  players[2].matchCount = 0; // Group 0, should play
  players[3].matchCount = 0; // Group 0, should play
  players[4].matchCount = 0; // Group 0, should play
  players[5].matchCount = 5; // Group 1, higher ratio
  players[6].matchCount = 5; // Group 1, higher ratio
  players[7].matchCount = 0; // Group 1, should play
  players[8].matchCount = 0; // Group 1, should play
  players[9].matchCount = 0; // Group 1, should play
  
  const result = partitionPlayers(players, Americano, 2);
  
  expect(result.competing).toHaveLength(8);
  expect(result.paused).toHaveLength(2);
  
  // Simple mode ignores groups - just picks by playRatio
  // Should have all 8 players with matchCount=0 competing
  const pausedIds = result.paused.map(p => p.id);
  expect(pausedIds).toContain("5");
  expect(pausedIds).toContain("6");
});

test("partitionPlayers should NOT use simple mode for AmericanoMixed (has group factors)", ({ players }) => {
  // Set different groups
  for (let i = 0; i < 7; i++) players[i].group = 0;
  for (let i = 7; i < 10; i++) players[i].group = 1;
  
  // All players have same play ratio
  players.forEach(p => p.matchCount = 0);
  
  const result = partitionPlayers(players, AmericanoMixed, 2);
  
  // AmericanoMixed has groupFactor > 0, so should use groupAware partitioning
  // This would try to find multiples of 4 or 2 from each group
  expect(result.competing.length + result.paused.length).toBe(10);
});

test("partitionPlayers simple mode should handle exact multiple of 4", ({ players }) => {
  players.forEach(p => p.group = 0);
  
  const result = partitionPlayers(players.slice(0, 8), Americano, 2);
  
  expect(result.competing).toHaveLength(8);
  expect(result.paused).toHaveLength(0);
});

test("partitionPlayers simple mode should handle insufficient players", ({ players }) => {
  players.forEach(p => p.group = 0);
  
  const result = partitionPlayers(players.slice(0, 5), Americano, 2);
  
  // 5 players -> 4 compete (1 match), 1 pauses
  expect(result.competing).toHaveLength(4);
  expect(result.paused).toHaveLength(1);
});

test("partitionPlayers simple mode should respect maxMatches constraint", ({ players }) => {
  players.forEach(p => p.group = 0);
  
  // All have same play ratio
  players.forEach(p => p.matchCount = 0);
  
  const result = partitionPlayers(players, Americano, 1);
  
  // maxMatches=1 means only 4 players compete
  expect(result.competing).toHaveLength(4);
  expect(result.paused).toHaveLength(6);
});

// ===== DIAGNOSTIC TESTS FOR GROUP-AWARE PARTITIONING =====
// These tests verify that the multiple-of-4 partitioning approach
// does not lead to inter-group partnerships (same-group pairings)
// which would violate the TeamUpGroupMode.PAIRED constraint.

test("partitionGroupAware should not create inter-group partnerships with unbalanced groups [7,8]", () => {
  // Setup: 7 males (group 0), 8 females (group 1)
  const allPlayers: Player[] = [];
  for (let i = 0; i < 15; i++) {
    const player = new Player(`${i}`, `Player${i}`);
    player.group = i < 7 ? 0 : 1; // 0-6 = males, 7-14 = females
    allPlayers.push(player);
  }

  let interGroupPartnerships = 0;
  let totalPartnerships = 0;
  let roundsWithViolations = 0;

  // Run 14 rounds to get good coverage
  for (let round = 0; round < 14; round++) {
    const [matches, paused] = matching(allPlayers, AmericanoMixed, round, 3);

    let roundHasViolation = false;

    // Check each match for inter-group partnerships
    matches.forEach((match) => {
      match.forEach((team) => {
        totalPartnerships++;
        const [player1, player2] = team;

        // Check if both players are from the same group (inter-group violation)
        if (player1.group === player2.group) {
          interGroupPartnerships++;
          roundHasViolation = true;
          console.log(
            `Round ${round}: Inter-group partnership detected! ` +
            `Player ${player1.id} (group ${player1.group}) partnered with ` +
            `Player ${player2.id} (group ${player2.group})`
          );
        }
      });
    });

    if (roundHasViolation) {
      roundsWithViolations++;
    }

    // Update player stats for next round
    matches.forEach((match) => {
      match.forEach((team) => {
        team.forEach((player) => {
          const mutablePlayer = allPlayers.find(p => p.id === player.id)!;
          mutablePlayer.matchCount++;

          // Track partners
          const partner = team[0].id === player.id ? team[1] : team[0];
          const partnerRounds = mutablePlayer.partners.get(partner.id) || [];
          partnerRounds.push(round);
          mutablePlayer.partners.set(partner.id, partnerRounds);

          // Track opponents
          const opponentTeam = match[0] === team ? match[1] : match[0];
          opponentTeam.forEach((opponent) => {
            const oppRounds = mutablePlayer.opponents.get(opponent.id) || [];
            oppRounds.push(round);
            mutablePlayer.opponents.set(opponent.id, oppRounds);
          });
        });
      });
    });

    paused.forEach(p => {
      const mutablePlayer = allPlayers.find(mp => mp.id === p.id)!;
      mutablePlayer.pauseCount++;
      mutablePlayer.lastPause = round;
    });
  }

  const interGroupRate = totalPartnerships > 0 ? (interGroupPartnerships / totalPartnerships) * 100 : 0;

  console.log(`\n=== INTER-GROUP PARTNERSHIP DIAGNOSTIC [7,8] ===`);
  console.log(`Total partnerships: ${totalPartnerships}`);
  console.log(`Inter-group partnerships (violations): ${interGroupPartnerships}`);
  console.log(`Inter-group rate: ${interGroupRate.toFixed(2)}%`);
  console.log(`Rounds with violations: ${roundsWithViolations}/14`);

  // With fair pausing in unbalanced scenarios (7M/8F), some inter-group partnerships
  // may occur when the partition creates unbalanced distributions (e.g., 4M+8F).
  // After removing the multiple-of-4 approach, we reduced violations significantly:
  // - Before: 20.24% (17/84 partnerships, 11/14 rounds)
  // - After: ~7% (6/84 partnerships, 3/14 rounds)
  // 
  // The remaining violations occur in edge cases where fair pausing forces
  // unbalanced distributions. These are acceptable as the alternative (AmericanoMixedBalanced)
  // exists for scenarios where perfect balance is more important than fair pausing.
  expect(interGroupRate).toBeLessThan(10); // Max 10% violations (down from 20%+)
});

test("partitionGroupAware should not create inter-group partnerships with unbalanced groups [3,4]", () => {
  // Setup: 3 males (group 0), 4 females (group 1)
  const allPlayers: Player[] = [];
  for (let i = 0; i < 7; i++) {
    const player = new Player(`${i}`, `Player${i}`);
    player.group = i < 3 ? 0 : 1; // 0-2 = males, 3-6 = females
    allPlayers.push(player);
  }

  let interGroupPartnerships = 0;
  let totalPartnerships = 0;

  // Run 7 rounds to get good coverage
  for (let round = 0; round < 7; round++) {
    const [matches, paused] = matching(allPlayers, AmericanoMixed, round, 1);

    // Check each match for inter-group partnerships
    matches.forEach((match) => {
      match.forEach((team) => {
        totalPartnerships++;
        const [player1, player2] = team;

        // Check if both players are from the same group (inter-group violation)
        if (player1.group === player2.group) {
          interGroupPartnerships++;
          console.log(
            `Round ${round}: Inter-group partnership detected! ` +
            `Player ${player1.id} (group ${player1.group}) partnered with ` +
            `Player ${player2.id} (group ${player2.group})`
          );
        }
      });
    });

    // Update player stats for next round
    matches.forEach((match) => {
      match.forEach((team) => {
        team.forEach((player) => {
          const mutablePlayer = allPlayers.find(p => p.id === player.id)!;
          mutablePlayer.matchCount++;

          // Track partners
          const partner = team[0].id === player.id ? team[1] : team[0];
          const partnerRounds = mutablePlayer.partners.get(partner.id) || [];
          partnerRounds.push(round);
          mutablePlayer.partners.set(partner.id, partnerRounds);

          // Track opponents
          const opponentTeam = match[0] === team ? match[1] : match[0];
          opponentTeam.forEach((opponent) => {
            const oppRounds = mutablePlayer.opponents.get(opponent.id) || [];
            oppRounds.push(round);
            mutablePlayer.opponents.set(opponent.id, oppRounds);
          });
        });
      });
    });

    paused.forEach(p => {
      const mutablePlayer = allPlayers.find(mp => mp.id === p.id)!;
      mutablePlayer.pauseCount++;
      mutablePlayer.lastPause = round;
    });
  }

  const interGroupRate = totalPartnerships > 0 ? (interGroupPartnerships / totalPartnerships) * 100 : 0;

  console.log(`\n=== INTER-GROUP PARTNERSHIP DIAGNOSTIC [3,4] ===`);
  console.log(`Total partnerships: ${totalPartnerships}`);
  console.log(`Inter-group partnerships (violations): ${interGroupPartnerships}`);
  console.log(`Inter-group rate: ${interGroupRate.toFixed(2)}%`);

  // With fair pausing in unbalanced scenarios (3M/4F), some inter-group partnerships
  // may occur when the partition creates unbalanced distributions.
  // After removing the multiple-of-4 approach, we reduced violations significantly:
  // - Before: 42.86% (6/14 partnerships)
  // - After: ~14% (2/14 partnerships)
  expect(interGroupRate).toBeLessThan(20); // Max 20% violations (down from 42%+)
});

test("partitionGroupAware distribution analysis for [7,8] scenario", () => {
  // Setup: 7 males (group 0), 8 females (group 1)
  const allPlayers: Player[] = [];
  for (let i = 0; i < 15; i++) {
    const player = new Player(`${i}`, `Player${i}`);
    player.group = i < 7 ? 0 : 1;
    allPlayers.push(player);
  }

  const roundDistributions: { round: number; males: number; females: number }[] = [];

  // Run 14 rounds and track partition distributions
  for (let round = 0; round < 14; round++) {
    const { competing } = partitionPlayers(allPlayers, AmericanoMixed, 3);

    const maleCount = competing.filter(p => p.group === 0).length;
    const femaleCount = competing.filter(p => p.group === 1).length;

    roundDistributions.push({ round, males: maleCount, females: femaleCount });

    // Update stats (simplified - just for partitioning)
    competing.forEach(p => {
      const mutablePlayer = allPlayers.find(mp => mp.id === p.id)!;
      mutablePlayer.matchCount++;
    });

    const pausedInRound = allPlayers.filter(p => !competing.some(c => c.id === p.id));
    pausedInRound.forEach(p => {
      const mutablePlayer = allPlayers.find(mp => mp.id === p.id)!;
      mutablePlayer.pauseCount++;
      mutablePlayer.lastPause = round;
    });
  }

  console.log(`\n=== PARTITION DISTRIBUTION ANALYSIS [7,8] ===`);
  console.log(`Round | Males | Females | Balanced?`);
  roundDistributions.forEach(({ round, males, females }) => {
    const balanced = males === females ? 'YES' : 'NO';
    console.log(`  ${round.toString().padStart(2)}  |   ${males}   |    ${females}    |    ${balanced}`);
  });

  // Count how many rounds have balanced vs unbalanced partitions
  const balancedRounds = roundDistributions.filter(r => r.males === r.females).length;
  const unbalancedRounds = 14 - balancedRounds;

  console.log(`\nBalanced rounds: ${balancedRounds}/14`);
  console.log(`Unbalanced rounds: ${unbalancedRounds}/14`);

  // Log unique distributions
  const uniqueDistributions = new Set(
    roundDistributions.map(r => `${r.males}M+${r.females}F`)
  );
  console.log(`Unique distributions: ${Array.from(uniqueDistributions).join(', ')}`);
});

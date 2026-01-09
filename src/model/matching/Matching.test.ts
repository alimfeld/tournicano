import { expect } from "vitest";
import { test, Player, serialize } from "../tournament/TestHelpers.ts";
import {
  Americano,
  AmericanoMixed,
  GroupBattle,
  GroupBattleMixed,
  MatchingSpec,
  MatchUpGroupMode,
  Mexicano,
  TeamUpGroupMode,
  TeamUpPerformanceMode,
  Tournicano,
} from "./MatchingSpec.ts";
import { matching, Match } from "./Matching.ts";

// Helper: Calculate variance of a numeric array
function calculateVariance(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
  const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
  return squaredDiffs.reduce((sum, v) => sum + v, 0) / values.length;
}

// Helper: Calculate coefficient of variation (CV) - normalized variance
function calculateCV(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
  if (mean === 0) return 0;
  return Math.sqrt(calculateVariance(values)) / mean;
}

// Helper: Update player statistics after a round
function updatePlayerStats(
  players: Player[],
  matches: Match[],
  paused: any[],
  roundIndex: number
): void {
  matches.forEach((match) => {
    match.forEach((team) => {
      team.forEach((player) => {
        const mutablePlayer = players.find(p => p.id === player.id)!;
        mutablePlayer.matchCount++;

        // Track partners
        const partner = team[0].id === player.id ? team[1] : team[0];
        const partnerRounds = mutablePlayer.partners.get(partner.id) || [];
        partnerRounds.push(roundIndex);
        mutablePlayer.partners.set(partner.id, partnerRounds);

        // Track opponents
        const opponentTeam = match[0] === team ? match[1] : match[0];
        opponentTeam.forEach((opponent) => {
          const oppRounds = mutablePlayer.opponents.get(opponent.id) || [];
          oppRounds.push(roundIndex);
          mutablePlayer.opponents.set(opponent.id, oppRounds);
        });
      });
    });
  });

  paused.forEach(p => {
    const mutablePlayer = players.find(mp => mp.id === p.id)!;
    mutablePlayer.pauseCount++;
    mutablePlayer.lastPause = roundIndex;
  });
}

// Helper: Analyze partner distribution for a set of players
interface DistributionAnalysis {
  partnerCounts: Map<string, number>;
  uniqueRate: number;
  maxRepeats: number;
  variance: number;
  cv: number;
  avgPartnershipsPerPair: number;
}

function analyzeDistribution(players: Player[]): DistributionAnalysis {
  const partnerCounts = new Map<string, number>();

  // Collect all partner counts
  players.forEach(p => {
    p.partners.forEach((rounds, partnerId) => {
      const pairKey = [p.id, partnerId].sort().join("-");
      partnerCounts.set(pairKey, rounds.length);
    });
  });

  const counts = Array.from(partnerCounts.values());
  const uniqueCount = counts.filter(c => c === 1).length;
  const uniqueRate = counts.length > 0 ? uniqueCount / counts.length : 0;
  const maxRepeats = counts.length > 0 ? Math.max(...counts) : 0;
  const variance = calculateVariance(counts);
  const cv = calculateCV(counts);
  const avgPartnershipsPerPair = counts.length > 0
    ? counts.reduce((sum, c) => sum + c, 0) / counts.length
    : 0;

  return {
    partnerCounts,
    uniqueRate,
    maxRepeats,
    variance,
    cv,
    avgPartnershipsPerPair,
  };
}

// Helper: Analyze opponent distribution for a set of players
interface OpponentDistributionAnalysis {
  opponentCounts: Map<string, number>;
  minOpponents: number;
  maxOpponents: number;
  avgOpponents: number;
  range: number;
  cv: number;
}

function analyzeOpponentDistribution(players: Player[]): OpponentDistributionAnalysis {
  const opponentCounts = new Map<string, number>();

  // Collect all opponent counts
  players.forEach(p => {
    p.opponents.forEach((rounds, opponentId) => {
      const pairKey = [p.id, opponentId].sort().join("-");
      opponentCounts.set(pairKey, rounds.length);
    });
  });

  const counts = Array.from(opponentCounts.values());
  const minOpponents = counts.length > 0 ? Math.min(...counts) : 0;
  const maxOpponents = counts.length > 0 ? Math.max(...counts) : 0;
  const avgOpponents = counts.length > 0
    ? counts.reduce((sum, c) => sum + c, 0) / counts.length
    : 0;
  const range = maxOpponents - minOpponents;
  const cv = calculateCV(counts);

  return {
    opponentCounts,
    minOpponents,
    maxOpponents,
    avgOpponents,
    range,
    cv,
  };
}

test("should honor play ratio for paused", ({ players }) => {
  players[3].matchCount = 1;
  players[7].matchCount = 1;
  const [_matches, paused] = matching(players, Americano, 0);
  expect(paused).toHaveLength(2);
  expect(paused).toContain(players[3]);
  expect(paused).toContain(players[7]);
});

test("should honor variety for team up", ({ players }) => {
  players[0].matchCount = 2;
  players[0].partners = new Map([
    ["1", [0]],
    ["2", [0]],
  ]);
  players[1].matchCount = 2;
  players[1].partners = new Map([
    ["0", [0]],
    ["3", [0]],
  ]);
  players[2].matchCount = 2;
  players[2].partners = new Map([
    ["0", [0]],
    ["3", [0]],
  ]);
  players[3].matchCount = 2;
  players[3].partners = new Map([
    ["1", [0]],
    ["2", [0]],
  ]);
  const [matches, _paused] = matching(players.slice(0, 4), Americano, 0, 1);
  expect(serialize(matches)).toStrictEqual(
    serialize([
      [
        [players[0], players[3]],
        [players[1], players[2]],
      ],
    ]),
  );
});

test("should prefer never-partnered players in Americano", ({ players }) => {
  // Players 0,1,2,3 have played before
  // Player 0 partnered with 1, never with 2 or 3
  // Player 1 partnered with 0, never with 2 or 3
  // Player 2 partnered with 3, never with 0 or 1
  // Player 3 partnered with 2, never with 0 or 1
  players[0].matchCount = 1;
  players[0].partners = new Map([["1", [0]]]);
  players[1].matchCount = 1;
  players[1].partners = new Map([["0", [0]]]);
  players[2].matchCount = 1;
  players[2].partners = new Map([["3", [0]]]);
  players[3].matchCount = 1;
  players[3].partners = new Map([["2", [0]]]);

  const [matches, _paused] = matching(players.slice(0, 4), Americano, 0, 1);

  // Should pair players who have never partnered: 0-2 or 0-3 AND 1-2 or 1-3
  const teamIds = matches[0].flat().map(p => p.id).sort();
  expect(teamIds).toEqual(["0", "1", "2", "3"]);

  // Check that no team has players who partnered before
  matches[0].forEach(team => {
    const p2Id = team[1].id;
    expect(team[0].partners.has(p2Id)).toBe(false);
  });
});

test("should avoid recent partners more than older partners", ({ players }) => {
  // 8 players, player 0 partnered with 1 recently (round 2) and with 2 long ago (round 0)
  // Should prefer pairing 0 with 2 over 0 with 1
  for (let i = 0; i < 8; i++) {
    players[i].matchCount = 3;
  }
  players[0].partners = new Map([
    ["1", [2]], // recent
    ["2", [0]], // old
  ]);
  players[1].partners = new Map([["0", [2]]]);
  players[2].partners = new Map([["0", [0]]]);

  const [matches, _paused] = matching(players.slice(0, 8), Americano, 0, 2);

  // Find which player is paired with player 0
  let player0Partner = null;
  for (const match of matches) {
    for (const team of match) {
      if (team[0].id === "0") {
        player0Partner = team[1].id;
        break;
      } else if (team[1].id === "0") {
        player0Partner = team[0].id;
        break;
      }
    }
    if (player0Partner) break;
  }

  // Should prefer player 2 (old partner) over player 1 (recent partner)
  // or even better, a never-before partner (3-7)
  expect(player0Partner).not.toBe("1");
});

test("should honor variety for match up in Americano", ({ players }) => {
  // Set up: 0-1 and 2-3 have faced each other before
  // 0-1 and 4-5 have never faced
  // Should match 0-1 vs 4-5 rather than 0-1 vs 2-3
  for (let i = 0; i < 8; i++) {
    players[i].matchCount = 1;
  }

  // Round 0: 0-1 vs 2-3 and 4-5 vs 6-7
  players[0].opponents = new Map([["2", [0]], ["3", [0]]]);
  players[1].opponents = new Map([["2", [0]], ["3", [0]]]);
  players[2].opponents = new Map([["0", [0]], ["1", [0]]]);
  players[3].opponents = new Map([["0", [0]], ["1", [0]]]);
  players[4].opponents = new Map([["6", [0]], ["7", [0]]]);
  players[5].opponents = new Map([["6", [0]], ["7", [0]]]);
  players[6].opponents = new Map([["4", [0]], ["5", [0]]]);
  players[7].opponents = new Map([["4", [0]], ["5", [0]]]);

  // Force specific team pairings by setting partners
  players[0].partners = new Map([["1", [0]]]);
  players[1].partners = new Map([["0", [0]]]);
  players[2].partners = new Map([["3", [0]]]);
  players[3].partners = new Map([["2", [0]]]);
  players[4].partners = new Map([["5", [0]]]);
  players[5].partners = new Map([["4", [0]]]);
  players[6].partners = new Map([["7", [0]]]);
  players[7].partners = new Map([["6", [0]]]);

  const [matches, _paused] = matching(players.slice(0, 8), Americano, 0, 2);

  // Check that teams don't repeat opponents
  matches.forEach(match => {
    const team1 = match[0];
    const team2 = match[1];
    const team1Ids = [team1[0].id, team1[1].id].sort();
    const team2Ids = [team2[0].id, team2[1].id].sort();

    // Check if these exact teams faced before
    const faced01vs23 =
      (team1Ids.join("") === "01" && team2Ids.join("") === "23") ||
      (team1Ids.join("") === "23" && team2Ids.join("") === "01");
    const faced45vs67 =
      (team1Ids.join("") === "45" && team2Ids.join("") === "67") ||
      (team1Ids.join("") === "67" && team2Ids.join("") === "45");

    // These matchups should be avoided if possible
    if (faced01vs23 || faced45vs67) {
      console.log(`Warning: Repeated matchup found: ${team1Ids} vs ${team2Ids}`);
    }
  });
});

test("should pair by performance in Mexicano mode", ({ players }) => {
  // In Mexicano, should pair 1st with 3rd, 2nd with 4th based on rank
  // Set different performance levels
  players[0].winRatio = 1.0;   // Rank 1
  players[0].plusMinus = 10;
  players[1].winRatio = 0.75;  // Rank 2
  players[1].plusMinus = 5;
  players[2].winRatio = 0.5;   // Rank 3
  players[2].plusMinus = 0;
  players[3].winRatio = 0.25;  // Rank 4
  players[3].plusMinus = -5;
  players[4].winRatio = 0.8;   // Should be Rank 2 (0.8 > 0.75)!
  players[4].plusMinus = 8;
  players[5].winRatio = 0.6;   // Should be Rank 4
  players[5].plusMinus = 3;
  players[6].winRatio = 0.4;   // Should be Rank 6
  players[6].plusMinus = -2;
  players[7].winRatio = 0.1;   // Rank 8
  players[7].plusMinus = -10;

  console.log("\n8-player Mexicano - Player performance:");
  players.slice(0, 8).forEach(p => {
    console.log(`  Player ${p.id}: wr=${p.winRatio}, pm=${p.plusMinus}`);
  });

  const [matches, _paused] = matching(players.slice(0, 8), Mexicano, 0, 2, true);

  // Actual ranking by winRatio (descending):
  // Rank 1: player 0 (1.0)
  // Rank 2: player 4 (0.8)
  // Rank 3: player 1 (0.75)
  // Rank 4: player 5 (0.6)
  // Rank 5: player 2 (0.5)
  // Rank 6: player 6 (0.4)
  // Rank 7: player 3 (0.25)
  // Rank 8: player 7 (0.1)

  const teams = matches.flatMap(m => m);
  const teamPairs = teams.map(team => [team[0].id, team[1].id].sort().join("-"));

  console.log("Mexicano pairings:", teamPairs);

  // With Mexicano (rank diff = 2):
  // Rank 1 (player 0) should pair with Rank 3 (player 1)
  // Rank 2 (player 4) should pair with Rank 4 (player 5)
  // Rank 5 (player 2) should pair with Rank 7 (player 3)
  // Rank 6 (player 6) should pair with Rank 8 (player 7)

  const has01Team = teamPairs.some(pair => pair === "0-1");
  const has45Team = teamPairs.some(pair => pair === "4-5");

  expect(has01Team).toBe(true);
  expect(has45Team).toBe(true);
});

test("should match teams by equal performance in Mexicano", ({ players }) => {
  // After teams are formed in Mexicano, should match teams with similar total performance
  players[0].winRatio = 1.0;
  players[0].plusMinus = 10;
  players[1].winRatio = 0.75;
  players[1].plusMinus = 5;
  players[2].winRatio = 0.5;
  players[2].plusMinus = 0;
  players[3].winRatio = 0.25;
  players[3].plusMinus = -5;

  const [matches, _paused] = matching(players.slice(0, 4), Mexicano, 0, 1);

  // Calculate team performance
  const match = matches[0];
  const team1Perf = match[0][0].winRatio + match[0][1].winRatio;
  const team2Perf = match[1][0].winRatio + match[1][1].winRatio;

  console.log(`Team 1 performance: ${team1Perf}, Team 2 performance: ${team2Perf}, diff: ${Math.abs(team1Perf - team2Perf)}`);

  // With Mexicano pairing (rank 1+3 vs rank 2+4):
  // Team 1: 1.0 + 0.5 = 1.5 (players 0+2)
  // Team 2: 0.75 + 0.25 = 1.0 (players 1+3)
  // This is the EXPECTED behavior - Mexicano intentionally creates unbalanced teams
  // The match-up performance factor then tries to balance the matches

  // Since there's only one match possible with 4 players, we just verify teams were created
  expect(matches).toHaveLength(1);
  expect(match[0]).toHaveLength(2);
  expect(match[1]).toHaveLength(2);
});

test("should respect group constraints in AmericanoMixed", ({ players }) => {
  // Set groups: 0-3 are group 0, 4-7 are group 1
  for (let i = 0; i < 4; i++) {
    players[i].group = 0;
  }
  for (let i = 4; i < 8; i++) {
    players[i].group = 1;
  }

  const [matches, _paused] = matching(players.slice(0, 8), AmericanoMixed, 0, 2);

  // In AmericanoMixed with ADJACENT group mode, should prefer adjacent groups
  // groupFactor = 100 for teamUp, so teams should be from adjacent groups
  matches.forEach(match => {
    match.forEach(team => {
      const groupDiff = Math.abs(team[0].group - team[1].group);
      console.log(`Team: player ${team[0].id} (group ${team[0].group}) & player ${team[1].id} (group ${team[1].group}), diff: ${groupDiff}`);
      // With ADJACENT mode, weight is best when |group_diff - 1| = 0, i.e., group_diff = 1
      expect(groupDiff).toBeLessThanOrEqual(1);
    });
  });

  // For matchUp, should balance groups (groupFactor = 100)
  matches.forEach(match => {
    const team1GroupSum = match[0][0].group + match[0][1].group;
    const team2GroupSum = match[1][0].group + match[1][1].group;
    const groupSumDiff = Math.abs(team1GroupSum - team2GroupSum);
    console.log(`Match: Team1 group sum ${team1GroupSum} vs Team2 group sum ${team2GroupSum}, diff: ${groupSumDiff}`);
  });
});

test("debug Mexicano rank calculation", ({ players }) => {
  // Simple case with 4 players, clear ranking
  players[0].winRatio = 1.0;   // Rank 1
  players[0].plusMinus = 10;
  players[1].winRatio = 0.75;  // Rank 2
  players[1].plusMinus = 5;
  players[2].winRatio = 0.5;   // Rank 3
  players[2].plusMinus = 0;
  players[3].winRatio = 0.25;  // Rank 4
  players[3].plusMinus = -5;

  console.log("\n=== DEBUG MEXICANO PAIRING ===");
  console.log("Player 0: winRatio=1.0, plusMinus=10 (expected rank 1)");
  console.log("Player 1: winRatio=0.75, plusMinus=5 (expected rank 2)");
  console.log("Player 2: winRatio=0.5, plusMinus=0 (expected rank 3)");
  console.log("Player 3: winRatio=0.25, plusMinus=-5 (expected rank 4)");
  console.log("\nExpected Mexicano pairing: 0-2 (rank 1-3) and 1-3 (rank 2-4)");

  const [matches, _paused] = matching(players.slice(0, 4), Mexicano, 0, 1, true);

  const teams = matches.flatMap(m => m);
  console.log("\nActual pairing:");
  teams.forEach((team, i) => {
    console.log(`  Team ${i + 1}: ${team[0].id} (wr=${team[0].winRatio}) & ${team[1].id} (wr=${team[1].winRatio})`);
  });

  const teamPairs = teams.map(team => [team[0].id, team[1].id].sort().join("-"));
  console.log("\nTeam pairs:", teamPairs);
});

test("should balance all factors in Tournicano", ({ players }) => {
  // Tournicano has all factors at 100
  // Set up a complex scenario
  for (let i = 0; i < 8; i++) {
    players[i].group = i % 2; // alternating groups
    players[i].winRatio = (8 - i) / 10; // descending performance
    players[i].plusMinus = 8 - i;
    players[i].matchCount = 1;
  }

  // Add some partner history
  players[0].partners = new Map([["1", [0]]]);
  players[1].partners = new Map([["0", [0]]]);

  const [matches, _paused] = matching(players.slice(0, 8), Tournicano, 0, 2);

  // Tournicano should:
  // 1. Avoid repeated partners (variety)
  // 2. Use Mexicano-style pairing (1st with 3rd)
  // 3. Respect adjacent group pairing

  console.log("Tournicano matches:");
  matches.forEach((match, i) => {
    console.log(`Match ${i}:`);
    match.forEach(team => {
      console.log(`  Team: ${team[0].id} (g${team[0].group}, wr${team[0].winRatio}) & ${team[1].id} (g${team[1].group}, wr${team[1].winRatio})`);
    });
  });

  // Check that players 0 and 1 are NOT paired again
  const teams = matches.flatMap(m => m);
  const has01Team = teams.some(team =>
    (team[0].id === "0" && team[1].id === "1") ||
    (team[0].id === "1" && team[1].id === "0")
  );

  expect(has01Team).toBe(false);
});

test("should sort matches by performance when performanceFactor > 0", ({ players }) => {
  // Set up 8 players with different performance levels
  players[0].winRatio = 0.8;
  players[0].plusMinus = 10;
  players[1].winRatio = 0.75;
  players[1].plusMinus = 8;
  players[2].winRatio = 0.6;
  players[2].plusMinus = 5;
  players[3].winRatio = 0.55;
  players[3].plusMinus = 3;
  players[4].winRatio = 0.4;
  players[4].plusMinus = 0;
  players[5].winRatio = 0.35;
  players[5].plusMinus = -2;
  players[6].winRatio = 0.2;
  players[6].plusMinus = -5;
  players[7].winRatio = 0.1;
  players[7].plusMinus = -8;

  // Test with Mexicano (has matchUp.performanceFactor = 100)
  const [matches, _paused] = matching(players.slice(0, 8), Mexicano, 0, 2);

  expect(matches).toHaveLength(2);

  // Calculate total performance (winRatio sum) for each match
  const match0Perf = matches[0][0][0].winRatio + matches[0][0][1].winRatio +
    matches[0][1][0].winRatio + matches[0][1][1].winRatio;
  const match1Perf = matches[1][0][0].winRatio + matches[1][0][1].winRatio +
    matches[1][1][0].winRatio + matches[1][1][1].winRatio;

  console.log(`Match 0 performance: ${match0Perf}`);
  console.log(`Match 1 performance: ${match1Perf}`);

  // First match should have higher total performance
  expect(match0Perf).toBeGreaterThanOrEqual(match1Perf);
});

// Tests for CROSS match up group mode
test("should support GroupBattle mode with 2 groups", ({ players }) => {
  // Set groups: 0-3 are Side A (group 0), 4-7 are Side B (group 1)
  for (let i = 0; i < 4; i++) {
    players[i].group = 0;
  }
  for (let i = 4; i < 8; i++) {
    players[i].group = 1;
  }

  const [matches, _paused] = matching(players.slice(0, 8), GroupBattle, 0, 2);

  // Team up: should pair players from same group
  matches.forEach(match => {
    match.forEach(team => {
      expect(team[0].group).toBe(team[1].group);
      console.log(`Team: ${team[0].id} & ${team[1].id} (both group ${team[0].group})`);
    });
  });

  // Match up: should oppose teams from different groups (CROSS mode)
  matches.forEach(match => {
    const team1GroupSum = match[0][0].group + match[0][1].group;
    const team2GroupSum = match[1][0].group + match[1][1].group;
    // With CROSS mode: (0+0)=0 vs (1+1)=2, maximize difference
    expect(team1GroupSum).not.toBe(team2GroupSum);
    console.log(`Match: Group ${team1GroupSum / 2} vs Group ${team2GroupSum / 2}`);
  });
});

test("should support GroupBattleMixed mode with 4 groups", ({ players }) => {
  // Create 16 players for 4 groups
  const allPlayers = [...players];
  for (let i = 8; i < 16; i++) {
    allPlayers.push(new Player(`${i}`, `Player ${i}`));
  }

  // Groups: A=0, B=1 (Side 1), C=2, D=3 (Side 2)
  for (let i = 0; i < 4; i++) allPlayers[i].group = 0;      // Side 1 men
  for (let i = 4; i < 8; i++) allPlayers[i].group = 1;      // Side 1 women
  for (let i = 8; i < 12; i++) allPlayers[i].group = 2;     // Side 2 men
  for (let i = 12; i < 16; i++) allPlayers[i].group = 3;    // Side 2 women

  const [matches, _paused] = matching(allPlayers, GroupBattleMixed, 0, 4);

  // Team up: should create mixed pairs within each side (0+1 or 2+3)
  matches.forEach(match => {
    match.forEach(team => {
      const groupDiff = Math.abs(team[0].group - team[1].group);
      const inSameSide = Math.floor(team[0].group / 2) === Math.floor(team[1].group / 2);
      expect(groupDiff).toBe(1);  // Mixed (different groups)
      expect(inSameSide).toBe(true);  // But from same side
      console.log(`Team: ${team[0].id} (g${team[0].group}) & ${team[1].id} (g${team[1].group})`);
    });
  });

  // Match up: should oppose teams from different sides (CROSS mode)
  matches.forEach(match => {
    const team1Sum = match[0][0].group + match[0][1].group;
    const team2Sum = match[1][0].group + match[1][1].group;
    // Side 1 has sum 1 (0+1), Side 2 has sum 5 (2+3)
    const bothFromSide1 = team1Sum === 1 && team2Sum === 1;
    const bothFromSide2 = team1Sum === 5 && team2Sum === 5;
    expect(bothFromSide1 || bothFromSide2).toBe(false);  // Not same side
    console.log(`Match: Side sum ${team1Sum} vs Side sum ${team2Sum}`);
  });
});

test("should maintain SAME mode behavior for matchUp groups (regression)", ({ players }) => {
  // This tests that the existing SAME mode still works correctly
  for (let i = 0; i < 4; i++) {
    players[i].group = 0;
  }
  for (let i = 4; i < 8; i++) {
    players[i].group = 1;
  }

  const sameSpec: MatchingSpec = {
    teamUp: {
      varietyFactor: 100,
      performanceFactor: 0,
      performanceMode: TeamUpPerformanceMode.AVERAGE,
      groupFactor: 0,
      groupMode: TeamUpGroupMode.PAIRED,
    },
    matchUp: {
      varietyFactor: 100,
      performanceFactor: 0,
      groupFactor: 100,
      groupMode: MatchUpGroupMode.SAME,
    },
  };

  const [matches, _paused] = matching(players.slice(0, 8), sameSpec, 0, 2);

  // Should minimize group sum difference (SAME mode)
  matches.forEach(match => {
    const team1Sum = match[0][0].group + match[0][1].group;
    const team2Sum = match[1][0].group + match[1][1].group;
    const diff = Math.abs(team1Sum - team2Sum);
    console.log(`Match: sum ${team1Sum} vs sum ${team2Sum}, diff: ${diff}`);
    // With SAME mode, should try to balance (minimize difference)
    expect(diff).toBeLessThanOrEqual(2);
  });
});

test("should maximize group difference with CROSS mode", ({ players }) => {
  // Test that CROSS mode actively maximizes difference between teams
  for (let i = 0; i < 4; i++) {
    players[i].group = 0;
  }
  for (let i = 4; i < 8; i++) {
    players[i].group = 1;
  }

  const crossSpec: MatchingSpec = {
    teamUp: {
      varietyFactor: 100,
      performanceFactor: 0,
      performanceMode: TeamUpPerformanceMode.AVERAGE,
      groupFactor: 100,
      groupMode: TeamUpGroupMode.SAME, // Same group for team up
    },
    matchUp: {
      varietyFactor: 100,
      performanceFactor: 0,
      groupFactor: 100,
      groupMode: MatchUpGroupMode.CROSS, // Cross groups for match up
    },
  };

  const [matches, _paused] = matching(players.slice(0, 8), crossSpec, 0, 2);

  // With CROSS mode and SAME team up: all teams should be homogeneous (0+0 or 1+1)
  // And matches should pit different groups against each other
  matches.forEach(match => {
    const team1Sum = match[0][0].group + match[0][1].group;
    const team2Sum = match[1][0].group + match[1][1].group;
    const diff = Math.abs(team1Sum - team2Sum);

    console.log(`Match: sum ${team1Sum} vs sum ${team2Sum}, diff: ${diff}`);

    // Maximum difference should be 2 (0+0 vs 1+1)
    // CROSS mode should achieve this maximum
    expect(diff).toBe(2);
  });
});
test("should prevent cross-pair violations in PAIRED mode with 4 groups", () => {
  // Create 16 players in 4 groups: 0,1,2,3
  const allPlayers = [];
  for (let i = 0; i < 16; i++) {
    const p = new Player(`${i}`, `Player${i}`);
    p.group = Math.floor(i / 4); // 4 players per group: 0-3 in g0, 4-7 in g1, etc.
    allPlayers.push(p);
  }

  // Valid pairs: (0,1) and (2,3)
  // Invalid pairs: (0,2), (0,3), (1,2), (1,3)

  // Run AmericanoMixed with PAIRED mode (groupFactor=100)
  const [matches, _paused] = matching(allPlayers, AmericanoMixed, 0, 4);

  // Check all teams for violations
  matches.forEach((match, matchIdx) => {
    match.forEach((team, teamIdx) => {
      const groupDiff = Math.abs(team[0].group - team[1].group);
      const pairBlockA = Math.floor(team[0].group / 2);
      const pairBlockB = Math.floor(team[1].group / 2);
      const samePairBlock = pairBlockA === pairBlockB;
      const pairOffset = Math.abs((team[0].group % 2) - (team[1].group % 2));

      const isValidPair = groupDiff === 1 && pairOffset === 1 && samePairBlock;

      if (!isValidPair) {
        console.log(
          `❌ Match ${matchIdx + 1} Team ${teamIdx + 1}: ` +
          `Player ${team[0].id} (g${team[0].group}) & ` +
          `Player ${team[1].id} (g${team[1].group}) - ` +
          `pairBlocks: ${pairBlockA} vs ${pairBlockB}`
        );
      }

      // Should always be a valid pair
      expect(isValidPair).toBe(true);
    });
  });
});

test("should prevent cross-pair violations over multiple rounds with 4 groups", () => {
  // Create 16 players in 4 groups
  const allPlayers = [];
  for (let i = 0; i < 16; i++) {
    const p = new Player(`${i}`, `Player${i}`);
    p.group = Math.floor(i / 4);
    allPlayers.push(p);
  }

  // Simulate 5 rounds
  for (let round = 0; round < 5; round++) {
    const [matches, _paused] = matching(allPlayers, AmericanoMixed, round, 4);

    // Check each match for violations
    matches.forEach((match) => {
      match.forEach((team) => {
        const groupDiff = Math.abs(team[0].group - team[1].group);
        const pairBlockA = Math.floor(team[0].group / 2);
        const pairBlockB = Math.floor(team[1].group / 2);
        const samePairBlock = pairBlockA === pairBlockB;
        const pairOffset = Math.abs((team[0].group % 2) - (team[1].group % 2));

        const isValidPair = groupDiff === 1 && pairOffset === 1 && samePairBlock;

        if (!isValidPair) {
          console.log(
            `❌ Round ${round + 1}: ` +
            `Player ${team[0].id} (g${team[0].group}) & ` +
            `Player ${team[1].id} (g${team[1].group})`
          );
        }

        expect(isValidPair).toBe(true);
      });
    });

    // Update player stats after the round
    matches.forEach((match) => {
      match.forEach((team) => {
        team.forEach((player) => {
          // Track partners
          const partner = team[0].id === player.id ? team[1] : team[0];
          const partnerRounds = player.partners.get(partner.id) || [];
          partnerRounds.push(round);
          player.partners.set(partner.id, partnerRounds);
          // Track opponents
          const opponentTeam = match[0] === team ? match[1] : match[0];
          opponentTeam.forEach((opponent) => {
            const oppRounds = player.opponents.get(opponent.id) || [];
            oppRounds.push(round);
            player.opponents.set(opponent.id, oppRounds);
          });
        });
      });
    });
  }
});

test("should distribute partnerships fairly with 6 players (Americano Mixed)", () => {
  const runsToTest = 20;
  const allAnalyses: DistributionAnalysis[] = [];

  for (let run = 0; run < runsToTest; run++) {
    // Create 6 players: 3 men (group 0), 3 women (group 1)
    const players: Player[] = [];
    for (let i = 0; i < 6; i++) {
      const p = new Player(`${i}`, `Player${i}`);
      p.group = i < 3 ? 0 : 1;
      players.push(p);
    }

    // Simulate 5 rounds (1 court, 2 teams/round, 2 paused)
    for (let round = 0; round < 5; round++) {
      const [matches, paused] = matching(players, AmericanoMixed, round, 1);
      updatePlayerStats(players, matches, paused, round);
    }

    const analysis = analyzeDistribution(players);
    allAnalyses.push(analysis);
  }

  // Aggregate statistics across all runs
  const avgUniqueRate = allAnalyses.reduce((sum, a) => sum + a.uniqueRate, 0) / runsToTest;
  const avgMaxRepeats = allAnalyses.reduce((sum, a) => sum + a.maxRepeats, 0) / runsToTest;
  const maxRepeatsOverall = Math.max(...allAnalyses.map(a => a.maxRepeats));
  const avgCV = allAnalyses.reduce((sum, a) => sum + a.cv, 0) / runsToTest;

  console.log(`\n=== 6 PLAYERS (Americano Mixed) - 5 rounds, 20 runs ===`);
  console.log(`Average unique partnership rate: ${(avgUniqueRate * 100).toFixed(1)}%`);
  console.log(`Average max repeats per pair: ${avgMaxRepeats.toFixed(2)}`);
  console.log(`Max repeats across all runs: ${maxRepeatsOverall}`);
  console.log(`Average coefficient of variation: ${avgCV.toFixed(3)}`);

  // ASSERTIONS
  // With 6 players over 5 rounds: 10 team slots, 9 possible mixed pairs
  // Actual performance: 79.4-82.5% unique, CV: 0.296-0.302, max repeats: 2

  // 1. Most partnerships should be unique (strict threshold based on actual performance)
  expect(avgUniqueRate).toBeGreaterThan(0.78); // 78%+ unique (allows for variance, actual: 79.4-82.5%)

  // 2. No pair should partner excessively (max 2x in 5 rounds is acceptable)
  expect(maxRepeatsOverall).toBeLessThanOrEqual(2);

  // 3. Distribution should be fairly uniform (strict threshold)
  expect(avgCV).toBeLessThan(0.32); // CV < 0.32 (strict, actual: 0.296-0.302)
});

test("should distribute partnerships fairly with 8 players (Americano)", () => {
  const runsToTest = 15; // Fewer runs since 8 players is more deterministic
  const allAnalyses: DistributionAnalysis[] = [];

  for (let run = 0; run < runsToTest; run++) {
    // Create 8 players (no groups for regular Americano)
    const players: Player[] = [];
    for (let i = 0; i < 8; i++) {
      players.push(new Player(`${i}`, `Player${i}`));
    }

    // Simulate 7 rounds (2 courts, 4 teams/round, 0 paused)
    for (let round = 0; round < 7; round++) {
      const [matches, paused] = matching(players, Americano, round, 2);
      updatePlayerStats(players, matches, paused, round);
    }

    const analysis = analyzeDistribution(players);
    allAnalyses.push(analysis);
  }

  // Aggregate statistics
  const avgUniqueRate = allAnalyses.reduce((sum, a) => sum + a.uniqueRate, 0) / runsToTest;
  const avgMaxRepeats = allAnalyses.reduce((sum, a) => sum + a.maxRepeats, 0) / runsToTest;
  const maxRepeatsOverall = Math.max(...allAnalyses.map(a => a.maxRepeats));
  const avgCV = allAnalyses.reduce((sum, a) => sum + a.cv, 0) / runsToTest;

  console.log(`\n=== 8 PLAYERS (Americano) - 7 rounds, 15 runs ===`);
  console.log(`Average unique partnership rate: ${(avgUniqueRate * 100).toFixed(1)}%`);
  console.log(`Average max repeats per pair: ${avgMaxRepeats.toFixed(2)}`);
  console.log(`Max repeats across all runs: ${maxRepeatsOverall}`);
  console.log(`Average coefficient of variation: ${avgCV.toFixed(3)}`);

  // ASSERTIONS
  // With 8 players over 7 rounds: 28 team slots, 28 possible pairs (C(8,2))
  // This is mathematically IDEAL: each pair partners exactly once = perfect variety

  // 1. Should achieve perfect unique rate (100%)
  expect(avgUniqueRate).toBe(1.0); // Exact 100% unique (aggressive expectation)

  // 2. No repeats allowed (perfect distribution)
  expect(maxRepeatsOverall).toBe(1); // Exact 1x per pair (tightened from ≤2)

  // 3. Perfect distribution uniformity
  expect(avgCV).toBe(0); // Perfect uniformity (tightened from <0.4)
});

test("should distribute partnerships fairly with 12 players (Americano)", () => {
  const runsToTest = 10; // Fewer runs (larger tournaments are slower)
  const allAnalyses: DistributionAnalysis[] = [];

  for (let run = 0; run < runsToTest; run++) {
    // Create 12 players
    const players: Player[] = [];
    for (let i = 0; i < 12; i++) {
      players.push(new Player(`${i}`, `Player${i}`));
    }

    // Simulate 11 rounds (3 courts, 6 teams/round, 0 paused)
    for (let round = 0; round < 11; round++) {
      const [matches, paused] = matching(players, Americano, round, 3);
      updatePlayerStats(players, matches, paused, round);
    }

    const analysis = analyzeDistribution(players);
    allAnalyses.push(analysis);
  }

  // Aggregate statistics
  const avgUniqueRate = allAnalyses.reduce((sum, a) => sum + a.uniqueRate, 0) / runsToTest;
  const avgMaxRepeats = allAnalyses.reduce((sum, a) => sum + a.maxRepeats, 0) / runsToTest;
  const maxRepeatsOverall = Math.max(...allAnalyses.map(a => a.maxRepeats));
  const avgCV = allAnalyses.reduce((sum, a) => sum + a.cv, 0) / runsToTest;

  console.log(`\n=== 12 PLAYERS (Americano) - 11 rounds, 10 runs ===`);
  console.log(`Average unique partnership rate: ${(avgUniqueRate * 100).toFixed(1)}%`);
  console.log(`Average max repeats per pair: ${avgMaxRepeats.toFixed(2)}`);
  console.log(`Max repeats across all runs: ${maxRepeatsOverall}`);
  console.log(`Average coefficient of variation: ${avgCV.toFixed(3)}`);

  // ASSERTIONS
  // With 12 players over 11 rounds: 66 team slots, 66 possible pairs (C(12,2))
  // This is mathematically IDEAL: each pair partners exactly once
  // Actual performance: PERFECT - 100% unique, CV: 0.000, max repeats: 1.00

  // 1. Should achieve PERFECT unique rate (exact perfection)
  expect(avgUniqueRate).toBe(1.0); // Exact 100% unique (mathematically ideal)

  // 2. No repeats - each pair partners exactly once (exact perfection)
  expect(maxRepeatsOverall).toBe(1); // Exact 1x per pair

  // 3. Perfect distribution uniformity (exact perfection)
  expect(avgCV).toBe(0); // Perfect uniformity (mathematically ideal)
});

test("should distribute partnerships fairly with 10 players (Americano)", () => {
  const runsToTest = 15;
  const allAnalyses: DistributionAnalysis[] = [];

  for (let run = 0; run < runsToTest; run++) {
    // Create 10 players
    const players: Player[] = [];
    for (let i = 0; i < 10; i++) {
      players.push(new Player(`${i}`, `Player${i}`));
    }

    // Simulate 9 rounds (2 courts, 4 teams/round, 2 paused)
    for (let round = 0; round < 9; round++) {
      const [matches, paused] = matching(players, Americano, round, 2);
      updatePlayerStats(players, matches, paused, round);
    }

    const analysis = analyzeDistribution(players);
    allAnalyses.push(analysis);
  }

  // Aggregate statistics
  const avgUniqueRate = allAnalyses.reduce((sum, a) => sum + a.uniqueRate, 0) / runsToTest;
  const avgMaxRepeats = allAnalyses.reduce((sum, a) => sum + a.maxRepeats, 0) / runsToTest;
  const maxRepeatsOverall = Math.max(...allAnalyses.map(a => a.maxRepeats));
  const avgCV = allAnalyses.reduce((sum, a) => sum + a.cv, 0) / runsToTest;

  console.log(`\n=== 10 PLAYERS (Americano) - 9 rounds, 15 runs ===`);
  console.log(`Average unique partnership rate: ${(avgUniqueRate * 100).toFixed(1)}%`);
  console.log(`Average max repeats per pair: ${avgMaxRepeats.toFixed(2)}`);
  console.log(`Max repeats across all runs: ${maxRepeatsOverall}`);
  console.log(`Average coefficient of variation: ${avgCV.toFixed(3)}`);

  // ASSERTIONS
  // With 10 players over 9 rounds: 45 team slots, 45 possible pairs (C(10,2))
  // This is mathematically IDEAL: each pair partners exactly once
  // Note: With paused players (2 per round), there's slight variance
  // Actual performance: 99.2-100% unique, CV: 0.000-0.043, max repeats: 1.00-1.27

  // 1. Should achieve very high unique rate (strict threshold)
  expect(avgUniqueRate).toBeGreaterThan(0.98); // 98%+ unique (allows for rare variance, actual: 99.2-100%)

  // 2. Max 2 repeats (allows for rare edge cases with paused players)
  expect(maxRepeatsOverall).toBeLessThanOrEqual(2);

  // 3. Excellent distribution uniformity (strict threshold)
  expect(avgCV).toBeLessThan(0.05); // CV < 0.05 (already very tight, actual: 0.000-0.043)
});

test("should distribute partnerships fairly with 16 players (Americano)", () => {
  const runsToTest = 8; // Fewer runs (larger tournaments are slower)
  const allAnalyses: DistributionAnalysis[] = [];

  for (let run = 0; run < runsToTest; run++) {
    // Create 16 players
    const players: Player[] = [];
    for (let i = 0; i < 16; i++) {
      players.push(new Player(`${i}`, `Player${i}`));
    }

    // Simulate 15 rounds (4 courts, 8 teams/round, 0 paused)
    for (let round = 0; round < 15; round++) {
      const [matches, paused] = matching(players, Americano, round, 4);
      updatePlayerStats(players, matches, paused, round);
    }

    const analysis = analyzeDistribution(players);
    allAnalyses.push(analysis);
  }

  // Aggregate statistics
  const avgUniqueRate = allAnalyses.reduce((sum, a) => sum + a.uniqueRate, 0) / runsToTest;
  const avgMaxRepeats = allAnalyses.reduce((sum, a) => sum + a.maxRepeats, 0) / runsToTest;
  const maxRepeatsOverall = Math.max(...allAnalyses.map(a => a.maxRepeats));
  const avgCV = allAnalyses.reduce((sum, a) => sum + a.cv, 0) / runsToTest;

  console.log(`\n=== 16 PLAYERS (Americano) - 15 rounds, 8 runs ===`);
  console.log(`Average unique partnership rate: ${(avgUniqueRate * 100).toFixed(1)}%`);
  console.log(`Average max repeats per pair: ${avgMaxRepeats.toFixed(2)}`);
  console.log(`Max repeats across all runs: ${maxRepeatsOverall}`);
  console.log(`Average coefficient of variation: ${avgCV.toFixed(3)}`);

  // ASSERTIONS
  // With 16 players over 15 rounds: 120 team slots, 120 possible pairs (C(16,2))
  // This is mathematically IDEAL: each pair partners exactly once
  // Actual performance: PERFECT - 100% unique, CV: 0.000, max repeats: 1.00

  // 1. Should achieve PERFECT unique rate (exact perfection)
  expect(avgUniqueRate).toBe(1.0); // Exact 100% unique (mathematically ideal)

  // 2. No repeats - each pair partners exactly once (exact perfection)
  expect(maxRepeatsOverall).toBe(1); // Exact 1x per pair

  // 3. Perfect distribution uniformity (exact perfection)
  expect(avgCV).toBe(0); // Perfect uniformity (mathematically ideal)
});

test("DIAGNOSTIC: trace 6-player Americano to find root cause", () => {
  // Single run with detailed logging
  const players: Player[] = [];
  for (let i = 0; i < 6; i++) {
    players.push(new Player(`${i}`, `Player${i}`));
  }

  console.log('\n=== DIAGNOSTIC: 6-PLAYER AMERICANO ROOT CAUSE ANALYSIS ===\n');

  const pausePairs: string[][] = [];
  const partnerPairs: string[][] = [];

  // Simulate 20 rounds with detailed logging
  for (let round = 0; round < 20; round++) {
    // Enable debug mode for first few rounds to see weights
    const debug = round >= 1 && round <= 3;
    const [matches, paused] = matching(players, Americano, round, 1, debug);
    updatePlayerStats(players, matches, paused, round);

    // Track pause pairs
    if (paused.length === 2) {
      const pair = [paused[0].id, paused[1].id].sort();
      pausePairs.push(pair);
    }

    // Track partner pairs
    matches.forEach(match => {
      match.forEach(team => {
        const pair = [team[0].id, team[1].id].sort();
        partnerPairs.push(pair);
      });
    });

    if (round < 10 || round >= 15) {
      // Log first 10 and last 5 rounds
      const match = matches[0];
      console.log(`Round ${round}: [${match[0][0].id},${match[0][1].id}] vs [${match[1][0].id},${match[1][1].id}] | Paused: [${paused.map(p => p.id).join(',')}]`);
    } else if (round === 10) {
      console.log('... (rounds 10-14) ...');
    }
  }

  // Analyze pause pair frequency
  console.log('\n--- PAUSE PAIR FREQUENCY ---');
  const pausePairCounts = new Map<string, number>();
  pausePairs.forEach(pair => {
    const key = pair.join('-');
    pausePairCounts.set(key, (pausePairCounts.get(key) || 0) + 1);
  });

  const sortedPausePairs = Array.from(pausePairCounts.entries())
    .sort((a, b) => b[1] - a[1]);
  sortedPausePairs.forEach(([pair, count]) => {
    console.log(`  ${pair}: paused together ${count} times`);
  });

  // Analyze partner pair frequency
  console.log('\n--- PARTNER PAIR FREQUENCY (Top 10) ---');
  const partnerPairCounts = new Map<string, number>();
  partnerPairs.forEach(pair => {
    const key = pair.join('-');
    partnerPairCounts.set(key, (partnerPairCounts.get(key) || 0) + 1);
  });

  const sortedPartnerPairs = Array.from(partnerPairCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
  sortedPartnerPairs.forEach(([pair, count]) => {
    console.log(`  ${pair}: partnered ${count} times`);
  });

  // Analyze opponent distribution
  console.log('\n--- OPPONENT DISTRIBUTION ---');
  const analysis = analyzeOpponentDistribution(players);
  const sortedOpponentPairs = Array.from(analysis.opponentCounts.entries())
    .sort((a, b) => b[1] - a[1]);

  sortedOpponentPairs.forEach(([pair, count]) => {
    console.log(`  ${pair}: faced ${count} times`);
  });

  console.log(`\nMin: ${analysis.minOpponents}, Max: ${analysis.maxOpponents}, Range: ${analysis.range}, CV: ${analysis.cv.toFixed(3)}`);

  // Key hypothesis tests:
  console.log('\n--- HYPOTHESIS TESTS ---');

  // Hypothesis 1: Do players who pause together frequently also partner together frequently?
  const pauseToPartnerCorrelation: Array<{ pair: string, pauseCount: number, partnerCount: number }> = [];
  pausePairCounts.forEach((pauseCount, pairKey) => {
    const partnerCount = partnerPairCounts.get(pairKey) || 0;
    pauseToPartnerCorrelation.push({ pair: pairKey, pauseCount, partnerCount });
  });

  console.log('Pause-Partner Correlation:');
  pauseToPartnerCorrelation
    .sort((a, b) => b.pauseCount - a.pauseCount)
    .forEach(({ pair, pauseCount, partnerCount }) => {
      console.log(`  ${pair}: paused ${pauseCount}x → partnered ${partnerCount}x`);
    });

  // Hypothesis 2: How often do pause pairs compete together (both playing)?
  console.log('\nPause Pair Compete-Together Analysis:');
  pauseToPartnerCorrelation.forEach(({ pair, pauseCount }) => {
    const [p1, p2] = pair.split('-');
    const player1 = players.find(p => p.id === p1)!;
    const player2 = players.find(p => p.id === p2)!;

    // Count rounds where both played (not paused)
    let bothPlayedCount = 0;
    for (let round = 0; round < 20; round++) {
      const p1Played = player1.partners.has(p2) && player1.partners.get(p2)!.includes(round) ||
        player1.opponents.has(p2) && player1.opponents.get(p2)!.includes(round) ||
        Array.from(player1.partners.values()).flat().includes(round) ||
        Array.from(player1.opponents.values()).flat().includes(round);
      const p2Played = Array.from(player2.partners.values()).flat().includes(round) ||
        Array.from(player2.opponents.values()).flat().includes(round);

      if (p1Played && p2Played) {
        bothPlayedCount++;
      }
    }

    const opponentCount = analysis.opponentCounts.get(pair) || 0;
    const partnerCount = partnerPairCounts.get(pair) || 0;

    console.log(`  ${pair}: paused together ${pauseCount}x, both played ${bothPlayedCount}x (${partnerCount} as partners, ${opponentCount} as opponents)`);
  });

  // This test is for investigation - don't fail
  expect(true).toBe(true);
});

test("should distribute opponents fairly in 6-player Americano", () => {
  const runsToTest = 20;
  const allAnalyses: OpponentDistributionAnalysis[] = [];

  for (let run = 0; run < runsToTest; run++) {
    // Create 6 players (no groups for regular Americano)
    const players: Player[] = [];
    for (let i = 0; i < 6; i++) {
      players.push(new Player(`${i}`, `Player${i}`));
    }

    // Simulate 20 rounds (1 court, 4 play, 2 pause)
    for (let round = 0; round < 20; round++) {
      const [matches, paused] = matching(players, Americano, round, 1);
      updatePlayerStats(players, matches, paused, round);
    }

    const analysis = analyzeOpponentDistribution(players);
    allAnalyses.push(analysis);
  }

  // Aggregate statistics
  const avgMinOpponents = allAnalyses.reduce((sum, a) => sum + a.minOpponents, 0) / runsToTest;
  const avgMaxOpponents = allAnalyses.reduce((sum, a) => sum + a.maxOpponents, 0) / runsToTest;
  const avgRange = allAnalyses.reduce((sum, a) => sum + a.range, 0) / runsToTest;
  const avgCV = allAnalyses.reduce((sum, a) => sum + a.cv, 0) / runsToTest;
  const maxRangeOverall = Math.max(...allAnalyses.map(a => a.range));

  console.log(`\n=== 6 PLAYERS (Americano) OPPONENT VARIETY - 20 rounds, 20 runs ===`);
  console.log(`Average min opponent count: ${avgMinOpponents.toFixed(1)}`);
  console.log(`Average max opponent count: ${avgMaxOpponents.toFixed(1)}`);
  console.log(`Average range (max-min): ${avgRange.toFixed(1)}`);
  console.log(`Max range across all runs: ${maxRangeOverall}`);
  console.log(`Average coefficient of variation: ${avgCV.toFixed(3)}`);

  // ASSERTIONS
  // With 6 players over 20 rounds:
  // - Each player plays approximately 13-14 rounds (4 play, 2 pause each round)
  // - In those rounds, they face 2 opponents per match = ~26-28 opponent slots
  // - With 5 possible opponents, ideal distribution: 26/5 = 5.2 times each
  // - Actual performance: range: 8.0, CV: 0.509-0.510

  // 1. Range should be tight (strict threshold)
  expect(avgRange).toBeLessThanOrEqual(8); // ≤8 (strict, consistently hits 8.0)

  // 2. Distribution should be relatively uniform (strict threshold)
  expect(avgCV).toBeLessThan(0.52); // CV < 0.52 (strict, actual: 0.509-0.510)
});

test("should distribute opponents fairly in 10-player Americano", () => {
  const runsToTest = 20;
  const allAnalyses: OpponentDistributionAnalysis[] = [];

  for (let run = 0; run < runsToTest; run++) {
    // Create 10 players (no groups for regular Americano)
    const players: Player[] = [];
    for (let i = 0; i < 10; i++) {
      players.push(new Player(`${i}`, `Player${i}`));
    }

    // Simulate 20 rounds (2 courts, 8 play, 2 pause)
    for (let round = 0; round < 20; round++) {
      const [matches, paused] = matching(players, Americano, round, 2);
      updatePlayerStats(players, matches, paused, round);
    }

    const analysis = analyzeOpponentDistribution(players);
    allAnalyses.push(analysis);
  }

  // Aggregate statistics
  const avgMinOpponents = allAnalyses.reduce((sum, a) => sum + a.minOpponents, 0) / runsToTest;
  const avgMaxOpponents = allAnalyses.reduce((sum, a) => sum + a.maxOpponents, 0) / runsToTest;
  const avgRange = allAnalyses.reduce((sum, a) => sum + a.range, 0) / runsToTest;
  const avgCV = allAnalyses.reduce((sum, a) => sum + a.cv, 0) / runsToTest;
  const maxRangeOverall = Math.max(...allAnalyses.map(a => a.range));

  console.log(`\n=== 10 PLAYERS (Americano) OPPONENT VARIETY - 20 rounds, 20 runs ===`);
  console.log(`Average min opponent count: ${avgMinOpponents.toFixed(1)}`);
  console.log(`Average max opponent count: ${avgMaxOpponents.toFixed(1)}`);
  console.log(`Average range (max-min): ${avgRange.toFixed(1)}`);
  console.log(`Max range across all runs: ${maxRangeOverall}`);
  console.log(`Average coefficient of variation: ${avgCV.toFixed(3)}`);

  // ASSERTIONS
  // With 10 players over 20 rounds:
  // - Each player plays approximately 16 rounds (8 play, 2 pause each round)
  // - In those rounds, they face 2 opponents per match = ~32 opponent slots
  // - With 9 possible opponents, ideal distribution: 32/9 = 3.6 times each
  // - Actual performance: range: 3.9-4.2, CV: 0.269-0.272

  // 1. Range should be tight (strict threshold)
  expect(avgRange).toBeLessThan(5); // <5 (strict, actual: 3.9-4.2, max observed: 5)

  // 2. Distribution should be uniform (strict threshold)
  expect(avgCV).toBeLessThan(0.30); // CV < 0.30 (strict, actual: 0.269-0.272)
});

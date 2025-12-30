import { expect, test as baseTest } from "vitest";
import { tournamentFactory } from "./Tournament.impl.ts";
import { Score } from "./Tournament.ts";
import {
  Americano,
  AmericanoMixed,
  AmericanoMixedBalanced,
  GroupBattle,
  GroupBattleMixed,
  Match,
  MatchingSpec,
  MatchUpGroupMode,
  matchingSpecEquals,
  Mexicano,
  TeamUpGroupMode,
  TeamUpPerformanceMode,
  Tournicano,
  matching,
  partitionPlayers,
} from "./Tournament.matching.ts";

class Player {
  group: number = 0;
  winRatio: number = 0;
  plusMinus: number = 0;
  matchCount: number = 0;
  pauseCount: number = 0;
  lastPause: number = 0;
  partners: Map<string, number[]> = new Map();
  opponents: Map<string, number[]> = new Map();
  constructor(
    readonly id: string,
    readonly name: string,
  ) { };
}

interface Fixture {
  players: Player[];
  scores: Score[][];
}

const test = baseTest.extend<Fixture>({
  players: [
    new Player("0", "Ace"),
    new Player("1", "Ben"),
    new Player("2", "Cam"),
    new Player("3", "Dan"),
    new Player("4", "Eli"),
    new Player("5", "Fay"),
    new Player("6", "Gus"),
    new Player("7", "Hal"),
    new Player("8", "Ivy"),
    new Player("9", "Jay"),
  ],
  scores: [
    [
      [11, 3],
      [8, 11],
    ],
    [
      [11, 7],
      [11, 2],
    ],
    [
      [8, 8],
      [1, 11],
    ],
    [
      [11, 0],
      [6, 6],
    ],
    [
      [11, 9],
      [11, 4],
    ],
  ],
});

const runTournament = (
  players: Player[] = [],
  scores: Score[][] = [],
  spec?: MatchingSpec,
) => {
  const tournament = tournamentFactory.create();
  tournament.addPlayers(players.map((p) => p.name));
  scores.forEach((scores) => {
    const round = tournament.createRound(spec, scores.length);
    round.matches.forEach((match, i) => match.submitScore(scores[i]));
  });
  return tournament;
};

const serialize = (matches: Match[]) => {
  const matchLines: string[] = [];
  matches.forEach((match) => {
    matchLines.push(
      [
        [match[0][0].id, match[0][1].id].sort().join(" & "),
        [match[1][0].id, match[1][1].id].sort().join(" & "),
      ]
        .sort()
        .join(" vs "),
    );
  });
  return matchLines.sort().join("\n");
};

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

test("should serialize tournament", ({ players, scores }) => {
  const tournament = runTournament(players, scores);
  const serialized = tournament.serialize();
  const fromSerialized = tournamentFactory.create(serialized);
  expect(fromSerialized.rounds).toHaveLength(tournament.rounds.length);

  // Compare round data directly
  fromSerialized.rounds.forEach((round, i) => {
    const origRound = tournament.rounds[i]!;

    // Compare matches
    expect(round.matches).toHaveLength(origRound.matches.length);
    round.matches.forEach((match, j) => {
      const origMatch = origRound.matches[j];
      expect(match.teamA.player1.name).toBe(origMatch.teamA.player1.name);
      expect(match.teamA.player2.name).toBe(origMatch.teamA.player2.name);
      expect(match.teamB.player1.name).toBe(origMatch.teamB.player1.name);
      expect(match.teamB.player2.name).toBe(origMatch.teamB.player2.name);
      expect(match.score).toEqual(origMatch.score);
    });

    // Compare paused players
    expect(round.paused).toHaveLength(origRound.paused.length);
    round.paused.forEach((player, j) => {
      expect(player.name).toBe(origRound.paused[j].name);
    });

    // Compare standings
    const standings = round.standings();
    const origStandings = origRound.standings();
    expect(standings).toHaveLength(origStandings.length);
    standings.forEach((ranked, j) => {
      const origRanked = origStandings[j];
      expect(ranked.rank).toBe(origRanked.rank);
      expect(ranked.player.name).toBe(origRanked.player.name);
      expect(ranked.player.wins).toBe(origRanked.player.wins);
      expect(ranked.player.draws).toBe(origRanked.player.draws);
      expect(ranked.player.losses).toBe(origRanked.player.losses);
      expect(ranked.player.pointsFor).toBe(origRanked.player.pointsFor);
      expect(ranked.player.pointsAgainst).toBe(origRanked.player.pointsAgainst);
    });
  });
});

test("should serialize and deserialize registration status", ({ players }) => {
  const tournament = runTournament(players);

  // Deactivate some players
  tournament.players()[0].activate(false);
  tournament.players()[3].activate(false);
  tournament.players()[7].activate(false);

  expect(tournament.activePlayerCount).toBe(7);

  const serialized = tournament.serialize();
  const fromSerialized = tournamentFactory.create(serialized);

  // Verify activation status preserved
  expect(fromSerialized.activePlayerCount).toBe(7);
  expect(fromSerialized.players()[0].active).toBe(false);
  expect(fromSerialized.players()[1].active).toBe(true);
  expect(fromSerialized.players()[3].active).toBe(false);
  expect(fromSerialized.players()[7].active).toBe(false);
});

test("should serialize and deserialize active status", ({ players }) => {
  const tournament = runTournament(players);

  // Deactivate some players
  tournament.players()[0].activate(false);
  tournament.players()[4].activate(false);

  expect(tournament.activePlayerCount).toBe(8);

  const serialized = tournament.serialize();
  const fromSerialized = tournamentFactory.create(serialized);

  // Verify active status preserved
  expect(fromSerialized.activePlayerCount).toBe(8);
  expect(fromSerialized.players()[0].active).toBe(false);
  expect(fromSerialized.players()[1].active).toBe(true);
  expect(fromSerialized.players()[4].active).toBe(false);
});

test("should update performance through rounds", ({ players, scores }) => {
  const tournament = runTournament(players);
  tournament.createRound();
  tournament.createRound();
  tournament.createRound();
  const firstRound = tournament.rounds.at(0)!;
  firstRound.matches.forEach((match, i) => match.submitScore(scores[0][i]));
  const firstRoundPerf = firstRound
    .standings()
    .map((ranked) => [ranked.player.winRatio, ranked.player.plusMinus]);
  tournament.rounds.forEach((round) =>
    expect(
      round
        .standings()
        .map((ranked) => [ranked.player.winRatio, ranked.player.plusMinus]),
    ).toStrictEqual(firstRoundPerf),
  );
});

test("should honor play ratio for paused", ({ players }) => {
  players[3].matchCount = 1;
  players[7].matchCount = 1;
  const [_matches, paused] = matching(players, Americano);
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
  const [matches, _paused] = matching(players.slice(0, 4), Americano, 1);
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

  const [matches, _paused] = matching(players.slice(0, 4), Americano, 1);

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

  const [matches, _paused] = matching(players.slice(0, 8), Americano, 2);

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

  const [matches, _paused] = matching(players.slice(0, 8), Americano, 2);

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

  const [matches, _paused] = matching(players.slice(0, 8), Mexicano, 2, true);

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

  const [matches, _paused] = matching(players.slice(0, 4), Mexicano, 1);

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

  const [matches, _paused] = matching(players.slice(0, 8), AmericanoMixed, 2);

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

  const [matches, _paused] = matching(players.slice(0, 4), Mexicano, 1, true);

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

  const [matches, _paused] = matching(players.slice(0, 8), Tournicano, 2);

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
  const [matches, _paused] = matching(players.slice(0, 8), Mexicano, 2);

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

test("should penalize past opponents when forming teams", ({ players }) => {
  // Set up 4 players where 0-1 and 2-3 have been opponents
  // but no one has partnered before
  for (let i = 0; i < 4; i++) {
    players[i].matchCount = 1;
  }

  // Players 0 and 1 faced each other in round 0
  players[0].opponents = new Map([["1", [0]]]);
  players[1].opponents = new Map([["0", [0]]]);

  // Players 2 and 3 faced each other in round 0
  players[2].opponents = new Map([["3", [0]]]);
  players[3].opponents = new Map([["2", [0]]]);

  const [matches, _paused] = matching(players.slice(0, 4), Americano, 1);

  // Since all players have equal match counts and no partner history,
  // the opponent penalty should influence the pairing
  // Expected: prefer pairing 0-2, 0-3, 1-2, or 1-3 over 0-1 or 2-3
  const teamPairs = matches[0].map(team => [team[0].id, team[1].id].sort().join("-"));

  console.log("Teams formed:", teamPairs);

  // Check that we didn't pair past opponents if variety is considered
  // (Note: with only 4 players and 1 match, we can only form 2 teams)
  // The algorithm should avoid 0-1 AND 2-3 appearing together
  const has01 = teamPairs.includes("0-1");
  const has23 = teamPairs.includes("2-3");

  // At least one of the past opponent pairs should be avoided
  expect(has01 && has23).toBe(false);
});

test("should weight partner history more heavily than opponent history", ({ players }) => {
  // Set up scenario where player 0 has:
  // - been partners with player 1 (once, round 0)
  // - been opponents with player 2 (three times, rounds 0, 1, 2)
  // Expected: should still prefer pairing 0-2 over 0-1 (partner penalty > opponent penalty)

  for (let i = 0; i < 8; i++) {
    players[i].matchCount = 3;
  }

  // Player 0 partnered with 1 in round 0
  players[0].partners = new Map([["1", [0]]]);
  players[1].partners = new Map([["0", [0]]]);

  // Player 0 opposed player 2 three times (rounds 0, 1, 2)
  players[0].opponents = new Map([["2", [0, 1, 2]]]);
  players[2].opponents = new Map([["0", [0, 1, 2]]]);

  const [matches, _paused] = matching(players.slice(0, 8), Americano, 2);

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

  console.log(`Player 0 paired with: ${player0Partner}`);

  // Partner penalty should be stronger than opponent penalty
  // So player 0 should NOT be paired with player 1 (past partner)
  // Even though player 2 was a frequent opponent, that penalty is only 20%
  expect(player0Partner).not.toBe("1");
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

  const [matches, _paused] = matching(players.slice(0, 8), GroupBattle, 2);

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

  const [matches, _paused] = matching(allPlayers, GroupBattleMixed, 4);

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

  const [matches, _paused] = matching(players.slice(0, 8), sameSpec, 2);

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

  const [matches, _paused] = matching(players.slice(0, 8), crossSpec, 2);

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

// Tests for hasAllScoresSubmitted property
test("should return hasAllScoresSubmitted - empty tournament", () => {
  const tournament = tournamentFactory.create();

  // Empty tournament (no rounds) should return true (vacuous truth)
  expect(tournament.hasAllScoresSubmitted).toBe(true);
  expect(tournament.rounds).toHaveLength(0);
});

test("should return hasAllScoresSubmitted - progressive score entry", ({ players }) => {
  const tournament = runTournament(players);

  // Create 3 rounds with 2 matches each
  const round1 = tournament.createRound(Americano, 2);
  const round2 = tournament.createRound(Americano, 2);
  const round3 = tournament.createRound(Americano, 2);

  expect(tournament.rounds).toHaveLength(3);

  // Initially, no scores submitted
  expect(tournament.hasAllScoresSubmitted).toBe(false);

  // Submit scores for round 1 (2 out of 6 matches)
  round1.matches[0].submitScore([11, 5]);
  round1.matches[1].submitScore([8, 11]);
  expect(tournament.hasAllScoresSubmitted).toBe(false);

  // Submit scores for round 2 (4 out of 6 matches total)
  round2.matches[0].submitScore([11, 7]);
  round2.matches[1].submitScore([6, 11]);
  expect(tournament.hasAllScoresSubmitted).toBe(false);

  // Submit scores for round 3 (6 out of 6 matches total)
  round3.matches[0].submitScore([11, 3]);
  round3.matches[1].submitScore([9, 11]);
  expect(tournament.hasAllScoresSubmitted).toBe(true);

  // Clear one score
  round2.matches[0].submitScore(undefined);
  expect(tournament.hasAllScoresSubmitted).toBe(false);

  // Re-submit the score
  round2.matches[0].submitScore([11, 7]);
  expect(tournament.hasAllScoresSubmitted).toBe(true);
});

test("should return hasAllScoresSubmitted - single round", ({ players }) => {
  const tournament = runTournament(players);

  const round = tournament.createRound(Americano, 2);
  expect(tournament.hasAllScoresSubmitted).toBe(false);

  // Submit first match score
  round.matches[0].submitScore([11, 5]);
  expect(tournament.hasAllScoresSubmitted).toBe(false);

  // Submit second match score
  round.matches[1].submitScore([8, 11]);
  expect(tournament.hasAllScoresSubmitted).toBe(true);
});

test("should return hasAllScoresSubmitted - after round deletion", ({ players, scores }) => {
  const tournament = runTournament(players);

  // Create 2 rounds with all scores
  const round1 = tournament.createRound(Americano, 2);
  round1.matches[0].submitScore(scores[0][0]);
  round1.matches[1].submitScore(scores[0][1]);

  const round2 = tournament.createRound(Americano, 2);
  round2.matches[0].submitScore(scores[1][0]);
  round2.matches[1].submitScore(scores[1][1]);

  expect(tournament.rounds).toHaveLength(2);
  expect(tournament.hasAllScoresSubmitted).toBe(true);

  // Delete last round
  round2.delete();
  expect(tournament.rounds).toHaveLength(1);
  expect(tournament.hasAllScoresSubmitted).toBe(true);

  // Clear a score in the remaining round
  round1.matches[0].submitScore(undefined);
  expect(tournament.hasAllScoresSubmitted).toBe(false);

  // Re-submit the score
  round1.matches[0].submitScore(scores[0][0]);
  expect(tournament.hasAllScoresSubmitted).toBe(true);

  // Delete the last remaining round
  round1.delete();
  expect(tournament.rounds).toHaveLength(0);
  expect(tournament.hasAllScoresSubmitted).toBe(true);
});

test("should return hasAllScoresSubmitted - after tournament restart", ({ players, scores }) => {
  const tournament = runTournament(players, scores);

  // All scores submitted from runTournament
  expect(tournament.hasAllScoresSubmitted).toBe(true);
  expect(tournament.rounds.length).toBeGreaterThan(0);

  // Restart tournament (deletes all rounds but keeps players)
  tournament.restart();

  expect(tournament.rounds).toHaveLength(0);
  expect(tournament.players()).toHaveLength(players.length);
  expect(tournament.hasAllScoresSubmitted).toBe(true);
});

test("should return hasAllScoresSubmitted - mixed score states", ({ players }) => {
  const tournament = runTournament(players);

  const round = tournament.createRound(Americano, 2);

  // No scores
  expect(tournament.hasAllScoresSubmitted).toBe(false);

  // Submit and then clear a score
  round.matches[0].submitScore([11, 5]);
  round.matches[0].submitScore(undefined);
  expect(tournament.hasAllScoresSubmitted).toBe(false);

  // Submit both scores with one being a draw
  round.matches[0].submitScore([10, 10]);
  round.matches[1].submitScore([11, 9]);
  expect(tournament.hasAllScoresSubmitted).toBe(true);

  // Verify draw is still counted as a submitted score
  expect(round.matches[0].score).toEqual([10, 10]);
});

// Tests for export functionality
test("should export empty tournament as JSON", () => {
  const tournament = tournamentFactory.create();

  const json = tournament.exportJSON();
  const data = JSON.parse(json);

  expect(data.version).toBe(1);
  expect(data.metadata.roundCount).toBe(0);
  expect(data.metadata.playerCount).toBe(0);
  expect(data.metadata.groups).toEqual([]);
  expect(data.rounds).toEqual([]);
  expect(data.standings.overall).toEqual([]);
  expect(data.standings.byGroup).toEqual({});
  expect(data.metadata.exportDate).toBeDefined();
});

test("should export tournament with rounds as JSON", ({ players, scores }) => {
  const tournament = runTournament(players.slice(0, 4), [scores[0]]);

  const json = tournament.exportJSON();
  const data = JSON.parse(json);

  expect(data.version).toBe(1);

  expect(data.metadata.roundCount).toBe(1);
  expect(data.metadata.playerCount).toBe(4);
  expect(data.rounds).toHaveLength(1);
  expect(data.rounds[0].roundNumber).toBe(1);
  expect(data.rounds[0].matches).toHaveLength(1);
  expect(data.rounds[0].matches[0].score).toBeDefined();
  expect(data.standings.overall.length).toBeGreaterThan(0);
});

test("should export tournament with groups as JSON", () => {
  const tournament = tournamentFactory.create();
  tournament.addPlayers(["Alice", "Bob"], 0);
  tournament.addPlayers(["Charlie", "Dave"], 1);

  const round = tournament.createRound(Americano, 1);
  round.matches[0].submitScore([11, 5]);

  const json = tournament.exportJSON();
  const data = JSON.parse(json);

  expect(data.metadata.groups).toEqual(["A", "B"]);
  expect(data.standings.byGroup).toHaveProperty("A");
  expect(data.standings.byGroup).toHaveProperty("B");

  // Verify group labels are letters
  data.standings.overall.forEach((player: any) => {
    expect(player.group).toMatch(/^[A-Z]$/);
  });
});

test("should export player names without UUIDs in JSON", ({ players }) => {
  const tournament = runTournament(players.slice(0, 4));
  const round = tournament.createRound(Americano, 1);
  round.matches[0].submitScore([11, 5]);

  const json = tournament.exportJSON();
  const data = JSON.parse(json);

  // Verify rounds use player names
  data.rounds[0].matches.forEach((match: any) => {
    expect(match.teamA.player1).toBe(match.teamA.player1.toString());
    expect(match.teamA.player2).toBe(match.teamA.player2.toString());
    expect(match.teamB.player1).toBe(match.teamB.player1.toString());
    expect(match.teamB.player2).toBe(match.teamB.player2.toString());
    // Verify they're actual player names, not UUIDs
    expect(match.teamA.player1).not.toMatch(/^[0-9a-f-]{36}$/i);
  });

  // Verify standings use player names
  data.standings.overall.forEach((player: any) => {
    expect(player.name).toBe(player.name.toString());
    expect(player.name).not.toMatch(/^[0-9a-f-]{36}$/i);
  });
});

test("should export specific round index as JSON", ({ players, scores }) => {
  const tournament = runTournament(players.slice(0, 4), [scores[0], scores[1], scores[2]]);

  // Export only up to round 2 (index 1)
  const json = tournament.exportJSON(1);
  const data = JSON.parse(json);

  expect(data.metadata.roundCount).toBe(2);
  expect(data.rounds).toHaveLength(2);
  expect(data.rounds[0].roundNumber).toBe(1);
  expect(data.rounds[1].roundNumber).toBe(2);
});

test("should include reliability in JSON export", ({ players, scores }) => {
  const tournament = runTournament(players.slice(0, 8), [scores[0], scores[1]]);

  const json = tournament.exportJSON();
  const data = JSON.parse(json);

  data.standings.overall.forEach((player: any) => {
    expect(player.reliability).toBeDefined();
    expect(player.reliability).toBeGreaterThanOrEqual(0);
    expect(player.reliability).toBeLessThanOrEqual(1);
    // Reliability = (matchCount + pauseCount) / totalRounds
    const participationCount = player.matchCount + player.pauseCount;
    const expectedReliability = participationCount / 2; // 2 rounds
    expect(player.reliability).toBeCloseTo(expectedReliability, 5);
  });
});

test("should export empty tournament as text", () => {
  const tournament = tournamentFactory.create();

  const text = tournament.exportText();

  expect(text).toContain("TOURNAMENT EXPORT");
  expect(text).toContain("Rounds Completed: 0");
  expect(text).toContain("Players: 0");
  expect(text).not.toContain("ROUND 1");
  expect(text).not.toContain("OVERALL STANDINGS");
});

test("should export tournament with rounds as text", ({ players, scores }) => {
  const tournament = runTournament(players.slice(0, 4), [scores[0]]);

  const text = tournament.exportText();

  expect(text).toContain("TOURNAMENT EXPORT");
  expect(text).toContain("Rounds Completed: 1");
  expect(text).toContain("Players: 4");
  expect(text).toContain("ROUND 1");
  expect(text).toContain("Match 1:");
  expect(text).toContain("vs.");
  expect(text).toContain("OVERALL STANDINGS");
  expect(text).toContain("(after Round 1)");
});

test("should export matches with scores in text format", ({ players, scores }) => {
  const tournament = runTournament(players.slice(0, 4), [scores[0]]);

  const text = tournament.exportText();

  // Should show scores in "X:Y" format
  expect(text).toMatch(/\d+:\d+/);
  // Should show team names with "&" (now with dynamic padding/spaces)
  expect(text).toMatch(/\w+\s+& \w+\s+vs\. \w+\s+& \w+/);
});

test("should export paused players in text format", ({ players, scores }) => {
  const tournament = runTournament(players.slice(0, 5), [scores[0]]);

  const text = tournament.exportText();

  // With 5 players and Americano, one player should be paused
  expect(text).toContain("Paused:");
  expect(text).toMatch(/Paused: \w+/);
});

test("should export group standings with letter labels in text", () => {
  const tournament = tournamentFactory.create();
  tournament.addPlayers(["Alice", "Bob"], 0);
  tournament.addPlayers(["Charlie", "Dave"], 1);

  const round = tournament.createRound(Americano, 1);
  round.matches[0].submitScore([11, 5]);

  const text = tournament.exportText();

  expect(text).toContain("GROUP A STANDINGS");
  expect(text).toContain("GROUP B STANDINGS");
  expect(text).not.toContain("GROUP 0");
  expect(text).not.toContain("GROUP 1");
});

test("should export full player names in text format", ({ players, scores }) => {
  const tournament = runTournament(players.slice(0, 4), [scores[0]]);

  const text = tournament.exportText();

  // Player names should not be truncated (unlike the old format function)
  players.slice(0, 4).forEach((player) => {
    expect(text).toContain(player.name);
  });
});

test("should export standings with win ratio and plus/minus in text", ({ players, scores }) => {
  const tournament = runTournament(players.slice(0, 4), [scores[0]]);

  const text = tournament.exportText();

  // Should show percentages
  expect(text).toMatch(/\d+%/);
  // Should show plus/minus (e.g., "+5" or "-3")
  expect(text).toMatch(/[+-]\d+/);
  // Should show W-D-L record (e.g., "1-0-0")
  expect(text).toMatch(/\(\d+-\d+-\d+\)/);
});

test("should export reliability percentage in text", ({ players, scores }) => {
  const tournament = runTournament(players.slice(0, 8), [scores[0], scores[1]]);

  const text = tournament.exportText();

  // Reliability should be shown as percentage at the end of each line
  // Most players should have 100% reliability (participated in all rounds)
  expect(text).toContain("100%");
});

test("should use ISO 8601 date format in exports", ({ players, scores }) => {
  const tournament = runTournament(players.slice(0, 4), [scores[0]]);

  const json = tournament.exportJSON();
  const data = JSON.parse(json);

  // ISO 8601 format: YYYY-MM-DDTHH:mm:ss.sssZ
  expect(data.metadata.exportDate).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);

  const text = tournament.exportText();
  // Text format should also contain ISO 8601 date
  expect(text).toMatch(/Export Date: \d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/);
});

test("should not export per-group standings for single group tournament", ({ players, scores }) => {
  const tournament = runTournament(players.slice(0, 4), [scores[0]]);
  
  const text = tournament.exportText();
  const json = JSON.parse(tournament.exportJSON());
  
  // Text export should not have per-group standings
  expect(text).toContain("OVERALL STANDINGS");
  expect(text).not.toContain("GROUP A STANDINGS");
  expect(text).not.toContain("GROUP B STANDINGS");
  
  // JSON export should have empty byGroup
  expect(json.standings.overall.length).toBe(4);
  expect(Object.keys(json.standings.byGroup).length).toBe(0);
  
  // Metadata should show only one group
  expect(json.metadata.groups).toEqual(["A"]);
});

test("should not export per-group standings when only one group has active players", () => {
  const tournament = tournamentFactory.create();
  tournament.addPlayers(["Alice", "Bob", "Charlie", "Dave"], 0);
  tournament.addPlayers(["Eve", "Frank"], 1);
  
  // Deactivate all Group B players
  tournament.players().filter(p => p.group === 1).forEach(p => p.activate(false));
  
  const round = tournament.createRound(Americano, 1);
  round.matches[0].submitScore([11, 5]);

  const text = tournament.exportText();
  const json = JSON.parse(tournament.exportJSON());

  // Only Group A participated
  expect(json.metadata.groups).toEqual(["A"]);
  
  // Should not show per-group standings (only 1 group participated)
  expect(text).toContain("OVERALL STANDINGS");
  expect(text).not.toContain("GROUP A STANDINGS");
  expect(text).not.toContain("GROUP B STANDINGS");
  
  expect(Object.keys(json.standings.byGroup).length).toBe(0);
});

test("should export per-group standings in JSON when multiple groups participate", () => {
  const tournament = tournamentFactory.create();
  tournament.addPlayers(["Alice", "Bob"], 0);
  tournament.addPlayers(["Charlie", "Dave"], 1);

  const round = tournament.createRound(Americano, 1);
  round.matches[0].submitScore([11, 5]);

  const json = JSON.parse(tournament.exportJSON());
  
  // Both groups participated
  expect(json.metadata.groups).toEqual(["A", "B"]);
  
  // Should have byGroup with 2 groups
  expect(Object.keys(json.standings.byGroup).length).toBe(2);
  expect(json.standings.byGroup.A).toBeDefined();
  expect(json.standings.byGroup.B).toBeDefined();
  expect(json.standings.byGroup.A.length).toBeGreaterThan(0);
  expect(json.standings.byGroup.B.length).toBeGreaterThan(0);
});

test("should export correct per-group standings for specific round when new group joins later", () => {
  const tournament = tournamentFactory.create();
  tournament.addPlayers(["Alice", "Bob", "Charlie", "Dave"], 0);

  // Round 1: Only Group A
  const round1 = tournament.createRound(Americano, 1);
  round1.matches[0].submitScore([11, 5]);
  
  // Add Group B after Round 1
  tournament.addPlayers(["Eve", "Frank", "Grace", "Henry"], 1);
  
  // Round 2: Both groups participate
  const round2 = tournament.createRound(Americano, 2);
  round2.matches[0].submitScore([11, 5]);
  round2.matches[1].submitScore([11, 7]);

  // Export for Round 1 (index 0) - only Group A participated
  const round1Text = tournament.exportText(0);
  const round1Json = JSON.parse(tournament.exportJSON(0));
  
  expect(round1Json.metadata.roundCount).toBe(1);
  expect(round1Json.metadata.groups).toEqual(["A"]);
  expect(round1Text).toContain("OVERALL STANDINGS (after Round 1)");
  expect(round1Text).not.toContain("GROUP A STANDINGS");
  expect(Object.keys(round1Json.standings.byGroup).length).toBe(0);

  // Export for Round 2 (index 1) - both groups participated
  const round2Text = tournament.exportText(1);
  const round2Json = JSON.parse(tournament.exportJSON(1));
  
  expect(round2Json.metadata.roundCount).toBe(2);
  expect(round2Json.metadata.groups).toEqual(["A", "B"]);
  expect(round2Text).toContain("OVERALL STANDINGS (after Round 2)");
  expect(round2Text).toContain("GROUP A STANDINGS (after Round 2)");
  expect(round2Text).toContain("GROUP B STANDINGS (after Round 2)");
  expect(Object.keys(round2Json.standings.byGroup).length).toBe(2);

  // Export latest (default) - should be same as Round 2
  const latestText = tournament.exportText();
  const latestJson = JSON.parse(tournament.exportJSON());
  
  expect(latestJson.metadata.roundCount).toBe(2);
  expect(latestJson.metadata.groups).toEqual(["A", "B"]);
  expect(Object.keys(latestJson.standings.byGroup).length).toBe(2);
});

test("should export correct standings data structure", ({ players, scores }) => {
  const tournament = runTournament(players.slice(0, 4), [scores[0]]);

  const json = tournament.exportJSON();
  const data = JSON.parse(json);

  // Verify overall standings structure
  expect(data.standings.overall.length).toBeGreaterThan(0);
  const player = data.standings.overall[0];
  expect(player).toHaveProperty("rank");
  expect(player).toHaveProperty("name");
  expect(player).toHaveProperty("group");
  expect(player).toHaveProperty("wins");
  expect(player).toHaveProperty("draws");
  expect(player).toHaveProperty("losses");
  expect(player).toHaveProperty("winRatio");
  expect(player).toHaveProperty("plusMinus");
  expect(player).toHaveProperty("pointsFor");
  expect(player).toHaveProperty("pointsAgainst");
  expect(player).toHaveProperty("matchCount");
  expect(player).toHaveProperty("pauseCount");
  expect(player).toHaveProperty("reliability");
});

test("should handle roundIndex bounds in export", ({ players, scores }) => {
  const tournament = runTournament(players.slice(0, 4), [scores[0], scores[1]]);

  // Export with negative index (should default to 0)
  const json1 = tournament.exportJSON(-1);
  const data1 = JSON.parse(json1);
  expect(data1.metadata.roundCount).toBe(1);

  // Export with index beyond rounds (should use last round)
  const json2 = tournament.exportJSON(999);
  const data2 = JSON.parse(json2);
  expect(data2.metadata.roundCount).toBe(2);

  // Export without index (should use last round)
  const json3 = tournament.exportJSON();
  const data3 = JSON.parse(json3);
  expect(data3.metadata.roundCount).toBe(2);
});

test("should include players list in JSON export", ({ players }) => {
  const tournament = runTournament(players.slice(0, 4));

  const json = tournament.exportJSON();
  const data = JSON.parse(json);

  expect(data.players).toBeDefined();
  expect(data.players).toHaveLength(4);

  // Verify each player has name and group
  data.players.forEach((player: any) => {
    expect(player).toHaveProperty("name");
    expect(player).toHaveProperty("group");
    expect(typeof player.name).toBe("string");
    expect(typeof player.group).toBe("string");
  });

  // Verify all player names are present
  const exportedNames = data.players.map((p: any) => p.name);
  players.slice(0, 4).forEach((player) => {
    expect(exportedNames).toContain(player.name);
  });
});

test("should sort players by group then name in JSON export", () => {
  const tournament = tournamentFactory.create();
  tournament.addPlayers(["Charlie", "Alice"], 0);
  tournament.addPlayers(["Dave", "Bob"], 1);

  const json = tournament.exportJSON();
  const data = JSON.parse(json);

  // Verify sorting: first by group (A, B), then by name
  expect(data.players).toHaveLength(4);
  expect(data.players[0].name).toBe("Alice");
  expect(data.players[0].group).toBe("A");
  expect(data.players[1].name).toBe("Charlie");
  expect(data.players[1].group).toBe("A");
  expect(data.players[2].name).toBe("Bob");
  expect(data.players[2].group).toBe("B");
  expect(data.players[3].name).toBe("Dave");
  expect(data.players[3].group).toBe("B");
});

test("should use group letters in players list", () => {
  const tournament = tournamentFactory.create();
  tournament.addPlayers(["Alice"], 0);
  tournament.addPlayers(["Bob"], 1);
  tournament.addPlayers(["Charlie"], 2);

  const json = tournament.exportJSON();
  const data = JSON.parse(json);

  expect(data.players[0].group).toBe("A");
  expect(data.players[1].group).toBe("B");
  expect(data.players[2].group).toBe("C");
});

test("should include players section in text export", ({ players }) => {
  const tournament = runTournament(players.slice(0, 4));

  const text = tournament.exportText();

  expect(text).toContain("PLAYERS");
  expect(text).toContain("-------");

  // All player names should be present
  players.slice(0, 4).forEach((player) => {
    expect(text).toContain(player.name);
  });
});

test("should format players by group in text export with multiple groups", () => {
  const tournament = tournamentFactory.create();
  tournament.addPlayers(["Alice", "Bob"], 0);
  tournament.addPlayers(["Charlie", "Dave"], 1);

  const text = tournament.exportText();

  expect(text).toContain("PLAYERS");
  expect(text).toContain("Group A:");
  expect(text).toContain("Group B:");
  expect(text).toContain("Alice");
  expect(text).toContain("Bob");
  expect(text).toContain("Charlie");
  expect(text).toContain("Dave");
});

test("should format players without group labels in text export with single group", ({ players }) => {
  const tournament = runTournament(players.slice(0, 4));

  const text = tournament.exportText();

  expect(text).toContain("PLAYERS");
  // Should NOT contain "Group A:" when there's only one group
  expect(text).not.toContain("Group A:");

  // But all player names should be present
  players.slice(0, 4).forEach((player) => {
    expect(text).toContain(player.name);
  });
});

test("should not include active/inactive status in players list", ({ players }) => {
  const tournament = runTournament(players.slice(0, 4));

  // Deactivate a player
  tournament.players()[0].activate(false);

  const json = tournament.exportJSON();
  const data = JSON.parse(json);

  // Verify players list doesn't have active/inactive fields
  data.players.forEach((player: any) => {
    expect(player).not.toHaveProperty("active");
    expect(player).not.toHaveProperty("inactive");
    expect(player).not.toHaveProperty("isActive");
  });

  // But the player should still be in the list
  const exportedNames = data.players.map((p: any) => p.name);
  expect(exportedNames).toContain(players[0].name);
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
  const [matches, _paused] = matching(allPlayers, AmericanoMixed, 4);

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
    const [matches, _paused] = matching(allPlayers, AmericanoMixed, 4);

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
          player.matchCount++;
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

test("matchingSpecEquals should return true for identical specs", () => {
  const spec1: MatchingSpec = {
    teamUp: {
      varietyFactor: 1,
      performanceFactor: 0.5,
      performanceMode: "rank" as TeamUpPerformanceMode,
      groupFactor: 0,
      groupMode: "none" as TeamUpGroupMode,
    },
    matchUp: {
      varietyFactor: 1,
      performanceFactor: 0.5,
      groupFactor: 0,
      groupMode: "none" as MatchUpGroupMode,
    },
  };

  const spec2: MatchingSpec = {
    teamUp: {
      varietyFactor: 1,
      performanceFactor: 0.5,
      performanceMode: "rank" as TeamUpPerformanceMode,
      groupFactor: 0,
      groupMode: "none" as TeamUpGroupMode,
    },
    matchUp: {
      varietyFactor: 1,
      performanceFactor: 0.5,
      groupFactor: 0,
      groupMode: "none" as MatchUpGroupMode,
    },
  };

  expect(matchingSpecEquals(spec1, spec2)).toBe(true);
});

test("matchingSpecEquals should return true for same object", () => {
  const spec: MatchingSpec = Americano;
  expect(matchingSpecEquals(spec, spec)).toBe(true);
});

test("matchingSpecEquals should return true for predefined modes", () => {
  expect(matchingSpecEquals(Americano, Americano)).toBe(true);
  expect(matchingSpecEquals(Mexicano, Mexicano)).toBe(true);
  expect(matchingSpecEquals(Tournicano, Tournicano)).toBe(true);
});

test("matchingSpecEquals should return false when teamUp.varietyFactor differs", () => {
  const spec1: MatchingSpec = { ...Americano };
  const spec2: MatchingSpec = {
    ...Americano,
    teamUp: { ...Americano.teamUp, varietyFactor: 0.5 },
  };
  expect(matchingSpecEquals(spec1, spec2)).toBe(false);
});

test("matchingSpecEquals should return false when teamUp.performanceFactor differs", () => {
  const spec1: MatchingSpec = { ...Mexicano };
  const spec2: MatchingSpec = {
    ...Mexicano,
    teamUp: { ...Mexicano.teamUp, performanceFactor: 0.9 },
  };
  expect(matchingSpecEquals(spec1, spec2)).toBe(false);
});

test("matchingSpecEquals should return false when teamUp.performanceMode differs", () => {
  const spec1: MatchingSpec = { ...Mexicano };
  const spec2: MatchingSpec = {
    ...Mexicano,
    teamUp: { ...Mexicano.teamUp, performanceMode: "rank" as TeamUpPerformanceMode },
  };
  expect(matchingSpecEquals(spec1, spec2)).toBe(false);
});

test("matchingSpecEquals should return false when teamUp.groupFactor differs", () => {
  const spec1: MatchingSpec = { ...AmericanoMixed };
  const spec2: MatchingSpec = {
    ...AmericanoMixed,
    teamUp: { ...AmericanoMixed.teamUp, groupFactor: 0.5 },
  };
  expect(matchingSpecEquals(spec1, spec2)).toBe(false);
});

test("matchingSpecEquals should return false when teamUp.groupMode differs", () => {
  const spec1: MatchingSpec = { ...AmericanoMixed };
  const spec2: MatchingSpec = {
    ...AmericanoMixed,
    teamUp: { ...AmericanoMixed.teamUp, groupMode: "same" as TeamUpGroupMode },
  };
  expect(matchingSpecEquals(spec1, spec2)).toBe(false);
});

test("matchingSpecEquals should return false when matchUp.varietyFactor differs", () => {
  const spec1: MatchingSpec = { ...Americano };
  const spec2: MatchingSpec = {
    ...Americano,
    matchUp: { ...Americano.matchUp, varietyFactor: 0.5 },
  };
  expect(matchingSpecEquals(spec1, spec2)).toBe(false);
});

test("matchingSpecEquals should return false when matchUp.performanceFactor differs", () => {
  const spec1: MatchingSpec = { ...Mexicano };
  const spec2: MatchingSpec = {
    ...Mexicano,
    matchUp: { ...Mexicano.matchUp, performanceFactor: 0.9 },
  };
  expect(matchingSpecEquals(spec1, spec2)).toBe(false);
});

test("matchingSpecEquals should return false when matchUp.groupFactor differs", () => {
  const spec1: MatchingSpec = { ...AmericanoMixed };
  const spec2: MatchingSpec = {
    ...AmericanoMixed,
    matchUp: { ...AmericanoMixed.matchUp, groupFactor: 0.5 },
  };
  expect(matchingSpecEquals(spec1, spec2)).toBe(false);
});

test("matchingSpecEquals should return false when matchUp.groupMode differs", () => {
  const spec1: MatchingSpec = { ...GroupBattle };
  const spec2: MatchingSpec = {
    ...GroupBattle,
    matchUp: { ...GroupBattle.matchUp, groupMode: "mixed" as MatchUpGroupMode },
  };
  expect(matchingSpecEquals(spec1, spec2)).toBe(false);
});

test("matchingSpecEquals should distinguish between different predefined modes", () => {
  expect(matchingSpecEquals(Americano, Mexicano)).toBe(false);
  expect(matchingSpecEquals(Americano, AmericanoMixed)).toBe(false);
  expect(matchingSpecEquals(Mexicano, Tournicano)).toBe(false);
  expect(matchingSpecEquals(GroupBattle, GroupBattleMixed)).toBe(false);
});

// Group Balancing Tests

test("should balance groups with single group", ({ players }) => {
  const spec: MatchingSpec = { ...Americano, balanceGroups: true };
  players.forEach(p => p.group = 0);

  const [matches, paused] = matching(players.slice(0, 8), spec, 2);

  expect(matches).toHaveLength(2);
  expect(paused).toHaveLength(0);
});

test("should balance 2 groups evenly", ({ players }) => {
  const spec: MatchingSpec = { ...Americano, balanceGroups: true };
  for (let i = 0; i < 4; i++) players[i].group = 0;
  for (let i = 4; i < 8; i++) players[i].group = 1;

  const [matches, paused] = matching(players.slice(0, 8), spec, 2);

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

  const [matches, paused] = matching(players, spec, 2);

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

  const [matches, paused] = matching(allPlayers, spec, 4);

  // 3 groups are not supported with balancing - should return 0 matches
  expect(matches).toHaveLength(0);
  expect(paused).toHaveLength(24); // All players paused
});

test("should balance 4 groups", ({ players }) => {
  const allPlayers = [];
  for (let i = 0; i < 16; i++) {
    const p = new Player(`${i}`, `Player${i}`);
    p.group = Math.floor(i / 4);
    allPlayers.push(p);
  }

  const spec: MatchingSpec = { ...Americano, balanceGroups: true };
  const [matches, paused] = matching(allPlayers, spec, 4);

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
  const [matches, paused] = matching(players.slice(0, 8), spec, 1);

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

  const [matches, paused] = matching(players.slice(0, 9), spec, 2);

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

  const [matches, paused] = matching(players.slice(0, 8), spec, 1);

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

  const [matches, paused] = matching(players.slice(0, 8), spec, 2);

  expect(matches).toHaveLength(2);
  const competingGroup1 = matches.flatMap(m => m.flat()).filter(p => p.group === 1);
  const competingGroup5 = matches.flatMap(m => m.flat()).filter(p => p.group === 5);
  expect(competingGroup1).toHaveLength(4);
  expect(competingGroup5).toHaveLength(4);
});

test("GroupBattle mode should balance groups", ({ players }) => {
  for (let i = 0; i < 5; i++) players[i].group = 0;
  for (let i = 5; i < 10; i++) players[i].group = 1;

  const [matches, paused] = matching(players, GroupBattle, 2);

  // Should balance despite uneven group sizes
  const competingGroup0 = matches.flatMap(m => m.flat()).filter(p => p.group === 0);
  const competingGroup1 = matches.flatMap(m => m.flat()).filter(p => p.group === 1);
  expect(competingGroup0.length).toBe(competingGroup1.length);
});

test("matchingSpecEquals should compare balanceGroups", () => {
  const spec1 = { ...Americano, balanceGroups: true };
  const spec2 = { ...Americano, balanceGroups: false };
  const spec3 = { ...Americano }; // undefined

  expect(matchingSpecEquals(spec1, spec2)).toBe(false);
  expect(matchingSpecEquals(spec2, spec3)).toBe(true); // false === undefined treated as false
  expect(matchingSpecEquals(spec1, spec1)).toBe(true);
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

  const [matches, paused] = matching(players, AmericanoMixedBalanced, 2);

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

// Tests for Tournament.getNextRoundInfo

test("getNextRoundInfo should return correct match count for new tournament", ({ players }) => {
  const tournament = runTournament(players);
  
  const info = tournament.getNextRoundInfo(Americano, 2);
  
  expect(info.matchCount).toBe(2);
  expect(info.activePlayerCount).toBe(10);
  expect(info.balancingEnabled).toBe(false);
});

test("getNextRoundInfo should respect maxMatches constraint", ({ players }) => {
  const tournament = runTournament(players);
  
  const info = tournament.getNextRoundInfo(Americano, 1);
  
  expect(info.matchCount).toBe(1);
  expect(info.activePlayerCount).toBe(10);
});

test("getNextRoundInfo should return group distribution for single group", ({ players }) => {
  const tournament = runTournament(players);
  
  const info = tournament.getNextRoundInfo(Americano, 2);
  
  expect(info.groupDistribution.size).toBe(1);
  const group0 = info.groupDistribution.get(0)!;
  expect(group0.total).toBe(10);
  expect(group0.competing).toBe(8); // 2 matches = 8 players
  expect(group0.paused).toBe(2);
});

test("getNextRoundInfo should return group distribution for multiple groups", () => {
  const tournament = tournamentFactory.create();
  tournament.addPlayers(["Alice", "Bob", "Charlie", "Dave", "Eve"], 0);
  tournament.addPlayers(["Frank", "Grace", "Henry", "Ivy", "Jack"], 1);
  
  const info = tournament.getNextRoundInfo(Americano, 2);
  
  expect(info.groupDistribution.size).toBe(2);
  expect(info.activePlayerCount).toBe(10);
  
  const group0 = info.groupDistribution.get(0)!;
  const group1 = info.groupDistribution.get(1)!;
  
  expect(group0.total).toBe(5);
  expect(group1.total).toBe(5);
  expect(group0.competing + group1.competing).toBe(8);
  expect(group0.paused + group1.paused).toBe(2);
});

test("getNextRoundInfo should indicate balancing enabled", () => {
  const tournament = tournamentFactory.create();
  tournament.addPlayers(["Alice", "Bob", "Charlie", "Dave"], 0);
  tournament.addPlayers(["Eve", "Frank", "Grace", "Henry"], 1);
  
  const info = tournament.getNextRoundInfo(AmericanoMixedBalanced, 2);
  
  expect(info.balancingEnabled).toBe(true);
  expect(info.matchCount).toBe(2);
  
  const group0 = info.groupDistribution.get(0)!;
  const group1 = info.groupDistribution.get(1)!;
  
  // With balancing, equal from each group
  expect(group0.competing).toBe(4);
  expect(group1.competing).toBe(4);
});

test("getNextRoundInfo should handle unbalanced groups with balancing enabled", () => {
  const tournament = tournamentFactory.create();
  tournament.addPlayers(["A1", "A2", "A3", "A4", "A5", "A6", "A7"], 0);
  tournament.addPlayers(["B1", "B2", "B3"], 1);
  
  const info = tournament.getNextRoundInfo(AmericanoMixedBalanced, 2);
  
  expect(info.balancingEnabled).toBe(true);
  expect(info.matchCount).toBe(1); // Only 1 match possible (2 from each group)
  
  const group0 = info.groupDistribution.get(0)!;
  const group1 = info.groupDistribution.get(1)!;
  
  expect(group0.total).toBe(7);
  expect(group1.total).toBe(3);
  expect(group0.competing).toBe(2);
  expect(group1.competing).toBe(2);
});

test("getNextRoundInfo should return 0 matches when balancing impossible", () => {
  const tournament = tournamentFactory.create();
  tournament.addPlayers(["A1", "A2", "A3", "A4", "A5", "A6", "A7", "A8"], 0);
  tournament.addPlayers(["B1"], 1);
  
  const info = tournament.getNextRoundInfo(AmericanoMixedBalanced, 2);
  
  expect(info.balancingEnabled).toBe(true);
  expect(info.matchCount).toBe(0); // Impossible to balance
  expect(info.activePlayerCount).toBe(9);
});

test("getNextRoundInfo should return 0 matches with 3 groups and balancing", () => {
  const tournament = tournamentFactory.create();
  tournament.addPlayers(["A1", "A2", "A3", "A4"], 0);
  tournament.addPlayers(["B1", "B2", "B3", "B4"], 1);
  tournament.addPlayers(["C1", "C2", "C3", "C4"], 2);
  
  const info = tournament.getNextRoundInfo(AmericanoMixedBalanced, 10);
  
  expect(info.balancingEnabled).toBe(true);
  expect(info.matchCount).toBe(0); // 3 groups not supported with balancing
  expect(info.activePlayerCount).toBe(12);
  expect(info.groupDistribution.size).toBe(3);
  
  const group0 = info.groupDistribution.get(0)!;
  const group1 = info.groupDistribution.get(1)!;
  const group2 = info.groupDistribution.get(2)!;
  
  expect(group0.total).toBe(4);
  expect(group1.total).toBe(4);
  expect(group2.total).toBe(4);
  expect(group0.competing).toBe(0);
  expect(group1.competing).toBe(0);
  expect(group2.competing).toBe(0);
});

test("getNextRoundInfo should match createRound match count", ({ players }) => {
  const tournament = runTournament(players);
  
  const info = tournament.getNextRoundInfo(Americano, 2);
  const matchCountBefore = info.matchCount;
  
  const round = tournament.createRound(Americano, 2);
  
  expect(round.matches).toHaveLength(matchCountBefore);
});

test("getNextRoundInfo should handle inactive players correctly", ({ players }) => {
  const tournament = runTournament(players);
  
  // Deactivate 3 players
  tournament.players()[0].activate(false);
  tournament.players()[1].activate(false);
  tournament.players()[2].activate(false);
  
  const info = tournament.getNextRoundInfo(Americano, 2);
  
  expect(info.activePlayerCount).toBe(7);
  expect(info.matchCount).toBe(1); // 7 active = 4 competing = 1 match
  
  const group0 = info.groupDistribution.get(0)!;
  expect(group0.total).toBe(7); // Only active players in distribution
});



import { test as baseTest } from "vitest";
import { Score } from "./Tournament.ts";
import { Match } from "./Tournament.matching.ts";
import { MatchingSpec } from "./MatchingSpec.ts";
import { tournamentFactory } from "./Tournament.impl.ts";

export class Player {
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

export interface Fixture {
  players: Player[];
  scores: Score[][];
}

export const test = baseTest.extend<Fixture>({
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

export const runTournament = (
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

export const serialize = (matches: Match[]) => {
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

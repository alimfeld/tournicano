import { expect, test as baseTest } from "vitest";
import { tournamentFactory } from "./Tournament.impl.ts";
import { Score } from "./Tournament.ts";
import {
  Americano,
  Match,
  MatchingSpec,
  matching,
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
  tournament.registerPlayers(players.map((p) => p.name));
  scores.forEach((scores) => {
    const round = tournament.createRound(spec, scores.length);
    round.matches.forEach((match, i) => match.submitScore(scores[i]));
    console.log(round.toString());
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

test("should register players", ({ players }) => {
  const tournament = runTournament(players);
  expect(tournament.players()).toHaveLength(players.length);
  expect(tournament.players().map((p) => p.name)).toStrictEqual(
    players.map((p) => p.name),
  );
  tournament.players().forEach((p) => {
    expect(p.active).toBeTruthy();
  });
});

test("should not register players twice", ({ players }) => {
  const tournament = runTournament(players);
  expect(tournament.players()).toHaveLength(players.length);
  tournament.registerPlayers(players.map((p) => p.name));
  expect(tournament.players()).toHaveLength(players.length);
});

test("should rename player", ({ players }) => {
  const tournament = runTournament(players);
  const player = tournament.players()[0];
  expect(player.name).not.toBe("Foo");
  player.rename("Foo");
  expect(player.name).toBe("Foo");
});

test("should not rename player to already registered name", ({ players }) => {
  const tournament = runTournament(players);
  const player = tournament.players()[0];
  const name = player.name;
  player.rename(tournament.players()[1].name);
  expect(player.name).toBe(name);
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
  const success = player.withdraw();
  expect(success).toBeTruthy();
  expect(tournament.players()).toHaveLength(players.length - 1);
});

test("should not withdraw participating player", ({ players, scores }) => {
  const tournament = runTournament(players, scores);
  const player = tournament.players()[0];
  const success = player.withdraw();
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
        player.partners.values().reduce((acc, rounds) => (acc += rounds.length), 0),
      ).toBe(player.matchCount);
      round.standings().forEach((ranked) => {
        const partner = ranked.player;
        expect(player.partners.get(partner.id)?.length || 0).toBeLessThanOrEqual(
          1,
        );
      });
      expect(
        player.opponents
          .values()
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
  fromSerialized.rounds.forEach((round, i) => {
    expect(round.toString()).toBe(tournament.rounds[i]!.toString());
  });
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

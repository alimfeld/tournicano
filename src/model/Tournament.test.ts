import { expect, test } from "vitest";
import { tournamentFactory } from "./Tournament.impl.ts";
import { Score, TournicanoFlavor } from "./Tournament.ts";

const names = [
  "Ace",
  "Ben",
  "Cam",
  "Dan",
  "Eli",
  "Fay",
  "Gus",
  "Hal",
  "Ivy",
  "Jay",
];

const scores: Score[][] = [
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
];

const runTournament = (
  names: string[] = [],
  scores: Score[][] = [],
  flavor: TournicanoFlavor | undefined = undefined,
) => {
  const tournament = tournamentFactory.create();
  tournament.registerPlayers(names);
  scores.forEach((scores) => {
    const spec = {
      maxMatches: scores.length,
      flavor,
    };
    const round = tournament.createRound(spec);
    round.matches.forEach((match, i) => match.submitScore(scores[i]));
    console.log(round.toString());
  });
  return tournament;
};

test("should create empty tournament", () => {
  const tournament = runTournament();
  expect(tournament.players).toHaveLength(0);
  expect(tournament.rounds).toHaveLength(0);
});

test("should register players", () => {
  const tournament = runTournament(names);
  expect(tournament.players).toHaveLength(names.length);
  tournament.players.forEach((p) => {
    expect(names).toContain(p.name);
    expect(p.active).toBeTruthy();
  });
});

test("should rename player", () => {
  const tournament = runTournament(names);
  const player = tournament.players[0];
  expect(player.name).not.toBe("Ben");
  player.rename("Ben");
  expect(player.name).toBe("Ben");
});

test("should activate player", () => {
  const tournament = runTournament(names);
  const player = tournament.players[0];
  player.activate(false);
  expect(player.active).toBe(false);
  player.activate(true);
  expect(player.active).toBe(true);
});

test("should withdraw non-participating player", () => {
  const tournament = runTournament(names);
  const player = tournament.players[0];
  const success = player.withdraw();
  expect(success).toBeTruthy();
  expect(tournament.players).toHaveLength(names.length - 1);
});

test("should not withdraw participating player", () => {
  const tournament = runTournament(names, scores);
  const player = tournament.players[0];
  const success = player.withdraw();
  expect(success).toBeFalsy();
  expect(tournament.players).toHaveLength(names.length);
});

test("should create rounds", () => {
  const tournament = runTournament(names, scores);
  expect(tournament.rounds).toHaveLength(scores.length);
});

test("should balance play stats", () => {
  const tournament = runTournament(names, scores);
  tournament.rounds
    .at(-1)!
    .standings()
    .forEach((player) => {
      expect(player.matchCount).toBe(4);
      expect(player.pauseCount).toBe(1);
    });
});

test("should balance matchings", () => {
  const tournament = runTournament(names, scores);
  tournament.rounds.forEach((round) => {
    round.standings().forEach((player) => {
      expect(
        player.partnerCounts.values().reduce((acc, count) => (acc += count), 0),
      ).toBe(player.matchCount);
      round
        .standings()
        .forEach((partner) =>
          expect(player.partnerCounts.get(partner.id) || 0).toBeLessThanOrEqual(
            1,
          ),
        );
      expect(
        player.opponentCounts
          .values()
          .reduce((acc, count) => (acc += count), 0),
      ).toBe(player.matchCount * 2);
      round
        .standings()
        .forEach((opponent) =>
          expect(
            player.opponentCounts.get(opponent.id) || 0,
          ).toBeLessThanOrEqual(2),
        );
    });
  });
});

test("should serialize tournament", () => {
  const tournament = runTournament(names, scores);
  const serialized = tournament.serialize();
  const fromSerialized = tournamentFactory.create(serialized);
  expect(fromSerialized.rounds).toHaveLength(tournament.rounds.length);
  fromSerialized.rounds.forEach((round, i) => {
    expect(round.toString()).toBe(tournament.rounds[i]!.toString());
  });
});

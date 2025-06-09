import { expect, test } from "vitest";
import { Tournament } from "./core.ts";

const players = [
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

const roundScores: [number, number][][] = [
  [[11, 3], [8, 11]],
  [[11, 7], [11, 2]],
  [[8, 8], [1, 11]],
  [[11, 0], [6, 6]],
  [[11, 9], [11, 4]],
];

const runTournament = () => {
  const tournament = new Tournament();
  tournament.enrollPlayers(players);
  roundScores.forEach((scores) => {
    const r = tournament.createRound(scores.length);
    scores.forEach((score, m) => {
      tournament.updateScore(r, m, score);
    })
    console.log(`Round ${r + 1}:`);
    tournament.printRound(r);
  });
  console.log("Stats:");
  tournament.printPlayers();
  return tournament;
};

const tournament = runTournament();

test("should store rounds", () => {
  expect(tournament.rounds.length).toBe(roundScores.length);
});

test("should update stats from pairings", () => {
  tournament.getPlayers().forEach((player) => {
    expect(Array.from(player.partners, ([_, value]) => value).reduce((acc, count) => acc + count, 0)).toBe(4);
    expect(Array.from(player.opponents, ([_, value]) => value).reduce((acc, count) => acc + count, 0)).toBe(8);
  });
});

test("should balance play percentage", () => {
  tournament.getPlayers().forEach((player) => {
    expect(player.matches).toBe(4);
    expect(player.pauses).toBe(1);
  });
});

test("should balance partners", () => {
  tournament.getPlayers().forEach((player) => {
    player.partners.forEach((count) => {
      expect(count).toBeLessThanOrEqual(1);
    });
  });
});

test("should balance opponents", () => {
  tournament.getPlayers().forEach((player) => {
    player.opponents.forEach((count) => {
      expect(count).toBeLessThanOrEqual(2);
    });
  });
});

test("should distribute scores", () => {
  const scoreSum = roundScores.reduce(
    (acc, scores) =>
      acc + scores.reduce((acc, score) => acc + score[0] + score[1], 0),
    0,
  );
  const [totalPlus, totalMinus] = tournament.getPlayers().reduce(
    (acc, stats) => [acc[0] + stats.plus, acc[1] + stats.minus],
    [0, 0],
  );
  expect(totalPlus).toBe(scoreSum * 2);
  expect(totalMinus).toBe(totalPlus);
});

test("should distribute results", () => {
  const decisive = roundScores.reduce(
    (acc, scores) =>
      acc +
      scores.reduce((acc, score) => acc + (score[0] == score[1] ? 0 : 1), 0),
    0,
  );
  const [wins, losses, draws] = tournament.getPlayers().reduce(
    (
      acc,
      stats,
    ) => [acc[0] + stats.wins, acc[1] + stats.losses, acc[2] + stats.draws],
    [0, 0, 0],
  );
  expect(wins + losses).toBe(decisive * 4);
  expect(draws).toBe((10 - decisive) * 4);
});

test("should load serialized", () => {
  const serialized = tournament.serialize();
  const loaded = new Tournament(serialized);
  loaded.getPlayers().forEach((player) => {
    expect(player).toEqual(tournament.getPlayerMap().get(player.id));
  })
});

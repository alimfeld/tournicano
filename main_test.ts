import { expect } from "@std/expect";
import { Tournament } from "./main.ts";

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

const allScores: [number, number][][] = [
  [[11, 3], [8, 11]],
  [[11, 7], [11, 2]],
  [[8, 8], [1, 11]],
  [[11, 0], [6, 6]],
  [[11, 9], [11, 4]],
];

const runTournament = () => {
  const tournament = new Tournament();
  tournament.enrollPlayers(players);
  allScores.forEach((scores) => {
    const r = tournament.createRound(scores.length);
    tournament.submitScores(r, scores);
    console.log(`Round ${r + 1}:`);
    tournament.printRound(r);
  });
  console.log("Stats:");
  tournament.printStats();
  return tournament;
};

const tournament = runTournament();

Deno.test("should store rounds", () => {
  expect(tournament.rounds.length).toBe(allScores.length);
});

Deno.test("should update stats from pairings", () => {
  tournament.getAllStats().forEach((stats) => {
    expect(stats.partners.reduce((acc, count) => acc + count, 0)).toBe(4);
    expect(stats.opponents.reduce((acc, count) => acc + count, 0)).toBe(8);
  });
});

Deno.test("should balance play percentage", () => {
  tournament.getAllStats().forEach((stats) => {
    expect(stats.matches).toBe(4);
    expect(stats.pauses).toBe(1);
  });
});

Deno.test("should balance partners", () => {
  tournament.getAllStats().forEach((stats) => {
    stats.partners.forEach((count) => {
      expect(count).toBeLessThanOrEqual(1);
    });
  });
});

Deno.test("should balance opponents", () => {
  tournament.getAllStats().forEach((stats) => {
    stats.opponents.forEach((count) => {
      expect(count).toBeLessThanOrEqual(2);
    });
  });
});

Deno.test("should store scores", () => {
  expect(tournament.scores.length).toBe(5);
});

Deno.test("should distribute scores", () => {
  const scoreSum = allScores.reduce(
    (acc, scores) =>
      acc + scores.reduce((acc, score) => acc + score[0] + score[1], 0),
    0,
  );
  const [totalPlus, totalMinus] = tournament.getAllStats().reduce(
    (acc, stats) => [acc[0] + stats.plus, acc[1] + stats.minus],
    [0, 0],
  );
  expect(totalPlus).toBe(scoreSum * 2);
  expect(totalMinus).toBe(totalPlus);
});

Deno.test("should distribute results", () => {
  const decisive = allScores.reduce(
    (acc, scores) =>
      acc +
      scores.reduce((acc, score) => acc + (score[0] == score[1] ? 0 : 1), 0),
    0,
  );
  const [wins, losses, draws] = tournament.getAllStats().reduce(
    (
      acc,
      stats,
    ) => [acc[0] + stats.wins, acc[1] + stats.losses, acc[2] + stats.draws],
    [0, 0, 0],
  );
  expect(wins + losses).toBe(decisive * 4);
  expect(draws).toBe((10 - decisive) * 4);
});

import { expect, test } from "vitest";
import { PlayerAssignment, PlayerResult, Score, Tournament } from "./core.ts";

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

const roundScores: Score[][] = [
  [[11, 3], [8, 11]],
  [[11, 7], [11, 2]],
  [[8, 8], [1, 11]],
  [[11, 0], [6, 6]],
  [[11, 9], [11, 4]],
];

const runTournament = (players: string[], roundScores: Score[][]) => {
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

const resultSum = (tournament: Tournament) => {
  return tournament.players.values().reduce((acc: PlayerResult, result: PlayerResult) => {
    const sum = {
      wins: acc.wins + result.wins,
      losses: acc.losses + result.losses,
      draws: acc.draws + result.draws,
      plus: acc.plus + result.plus,
      minus: acc.minus + result.minus,
    }
    return sum;
  },
    { wins: 0, losses: 0, draws: 0, plus: 0, minus: 0 },
  );
}

test("should store rounds", () => {
  const tournament = runTournament(players, roundScores);
  expect(tournament.rounds.length).toBe(roundScores.length);
});

test("should update stats from pairings", () => {
  const tournament = runTournament(players, roundScores);
  tournament.players.forEach((player) => {
    expect(Array.from(player.partners, ([_, value]) => value).reduce((acc, count) => acc + count, 0)).toBe(4);
    expect(Array.from(player.opponents, ([_, value]) => value).reduce((acc, count) => acc + count, 0)).toBe(8);
  });
});

test("should balance play percentage", () => {
  const tournament = runTournament(players, roundScores);
  tournament.players.forEach((player) => {
    expect(player.matches).toBe(4);
    expect(player.pauses).toBe(1);
  });
});

test("should balance partners", () => {
  const tournament = runTournament(players, roundScores);
  tournament.players.forEach((player) => {
    player.partners.forEach((count) => {
      expect(count).toBeLessThanOrEqual(1);
    });
  });
});

test("should balance opponents", () => {
  const tournament = runTournament(players, roundScores);
  tournament.players.forEach((player) => {
    player.opponents.forEach((count) => {
      expect(count).toBeLessThanOrEqual(2);
    });
  });
});

test("should distribute scores", () => {
  const tournament = runTournament(players, roundScores);
  const scoreSum = roundScores.reduce(
    (acc, scores) =>
      acc + scores.reduce((acc, score) => acc + score[0] + score[1], 0),
    0,
  );
  const total = resultSum(tournament);
  expect(total.plus).toBe(scoreSum * 2);
  expect(total.minus).toBe(scoreSum * 2);
});

test("should distribute results", () => {
  const tournament = runTournament(players, roundScores);
  const decisive = roundScores.reduce(
    (acc, scores) =>
      acc +
      scores.reduce((acc, score) => acc + (score[0] == score[1] ? 0 : 1), 0),
    0,
  );
  const total = resultSum(tournament);
  expect(total.wins + total.losses).toBe(decisive * 4);
  expect(total.draws).toBe((10 - decisive) * 4);
});

test("should load serialized", () => {
  const tournament = runTournament(players, roundScores);
  const serialized = tournament.serialize();
  const loaded = new Tournament(serialized);
  loaded.players.forEach((player) => {
    expect(player).toEqual(tournament.players.get(player.id));
  })
});

test("should not remove competing player", () => {
  const tournament = runTournament(players, roundScores);
  expect(tournament.players.size).toBe(players.length);
  expect(tournament.removePlayer(tournament.players.values().next().value!.id)).toBe(false);
  expect(tournament.players.size).toBe(players.length);
});

test("should remove non-competing player", () => {
  const tournament = runTournament(players, roundScores);
  const [player] = tournament.enrollPlayers(["Zed"]);
  expect(tournament.players.size).toBe(players.length + 1);
  expect(tournament.removePlayer(player.id)).toBe(true);
  expect(tournament.players.size).toBe(players.length);
});

test("should remove round", () => {
  const tournament = runTournament(players, roundScores);
  expect(tournament.rounds.length).toBe(roundScores.length);
  tournament.removeRound(1);
  expect(tournament.rounds.length).toBe(roundScores.length - 1);
});

test("should remove round results", () => {
  const tournament = runTournament(players, roundScores);
  tournament.removeRound(1);
  const newRoundScores = [...roundScores];
  newRoundScores.splice(1, 1);
  const newTournament = runTournament(players, newRoundScores);
  expect(resultSum(tournament)).toStrictEqual(resultSum(newTournament));
});

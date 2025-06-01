import { assertEquals } from "@std/assert";
import { Player, Round, Tournament } from "./main.ts";

const dumpRound = (round: Round) => {
  for (const match of round.matches) {
    console.log(
      `${match.teams[0].players[0].name} & ${
        match.teams[0].players[1].name
      } vs. ${match.teams[1].players[0].name} & ${
        match.teams[1].players[1].name
      } `,
    );
  }
};

const dumpPlayers = (players: Player[]) => {
  for (const player of players) {
    console.log(
      `${player.name} M${player.matches}/W${player.wins}/L${player.losses}/D${player.draws}/Δ${
        player.points - player.pointsAgainst
      }`,
    );
  }
};

Deno.test(function runTournament() {
  const tournament = new Tournament([
    "Ali",
    "Ben",
    "Cam",
    "Dan",
    "Eli",
    "Fay",
    "Gus",
    "Hal",
    "Ivy",
    "Jay",
  ], 2);

  const roundResults: [number, number][][] = [
    [[11, 3], [8, 11]],
    [[11, 7], [11, 2]],
    [[8, 8], [1, 11]],
    [[11, 0], [6, 6]],
    [[11, 9], [11, 4]],
    [[11, 7], [2, 11]],
    [[11, 7], [11, 2]],
    [[8, 8], [1, 11]],
    [[11, 0], [6, 6]],
    [[11, 9], [11, 4]],
  ];

  roundResults.forEach((results, index) => {
    assertEquals(tournament.completedRounds.length, index);
    assertEquals(tournament.currentRound, null);
    const round = tournament.generateRound();
    console.log("-------");
    console.log(`Round ${index + 1}`);
    console.log("-------");
    dumpRound(round);
    console.log("-------");
    assertEquals(tournament.currentRound, round);
    assertEquals(round.matches.length, 2);
    tournament.commitResults(results);
    dumpPlayers(tournament.players);
    assertEquals(tournament.completedRounds.length, index + 1);
    assertEquals(tournament.currentRound, null);
  });
});

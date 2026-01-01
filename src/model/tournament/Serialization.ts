/**
 * @fileoverview Internal serialization logic for Tournament.
 * 
 * WARNING: This file contains internal implementation details.
 * DO NOT import from this file outside of src/model/Tournament*.ts files.
 */

import { PlayerId, Score, Player, Round } from "./Tournament.ts";
import { TournamentContext } from "./Context.ts";
import { PlayerImpl, ParticipatingPlayerImpl } from "./Players.impl.ts";
import { RoundImpl } from "./Rounds.impl.ts";

// Compact serialization format
type CompactPlayer = [PlayerId, string, number, boolean]; // id, name, group, active
type CompactTeam = [PlayerId, PlayerId];
type CompactMatch = [CompactTeam, CompactTeam, Score | undefined];
type CompactRound = [
  CompactMatch[],
  PlayerId[],
  PlayerId[],
]; /* matches, paused, inactive */
type CompactTournament = [CompactPlayer[], CompactRound[]];

/**
 * Serialize tournament to compact JSON string
 */
export function serializeTournament(
  players: Player[],
  rounds: Round[]
): string {
  const compact: CompactTournament = [
    players.map((p) => [p.id, p.name, p.group, p.active]),
    rounds.map((round) => [
      round.matches.map((match) => [
        [match.teamA.player1.id, match.teamA.player2.id],
        [match.teamB.player1.id, match.teamB.player2.id],
        match.score,
      ]),
      round.paused.map((p) => p.id),
      round.inactive.map((p) => p.id),
    ]),
  ];
  return JSON.stringify(compact);
}

/**
 * Deserialize tournament from compact JSON string
 */
export function deserializeTournament(
  serialized: string,
  context: TournamentContext,
  createPlayer: (id: PlayerId, name: string, group: number, active: boolean) => PlayerImpl,
  createRound: (
    index: number,
    participating: ParticipatingPlayerImpl[],
    matched: [[PlayerId, PlayerId], [PlayerId, PlayerId]][],
    paused: PlayerId[],
    inactive: PlayerId[]
  ) => RoundImpl
): void {
  const compact = JSON.parse(serialized) as CompactTournament;
  
  // Create players
  compact[0].forEach((cp) => {
    const player = createPlayer(cp[0], cp[1], cp[2], cp[3]);
    context.registerPlayer(player);
  });

  // Create rounds
  compact[1].forEach((cr, roundIndex) => {
    const previousRound = context.rounds[context.rounds.length - 1];
    const participating = previousRound
      ? previousRound.getParticipatingPlayers()
      : [];
    const round = createRound(
      roundIndex,
      participating as ParticipatingPlayerImpl[],
      cr[0].map((cm) => [cm[0], cm[1]]),
      cr[1],
      cr[2],
    );
    context.rounds.push(round);
    
    // Submit scores
    round.matches.forEach((match, i) => {
      const score = cr[0][i][2];
      if (score) {
        match.submitScore(score);
      }
    });
  });
}

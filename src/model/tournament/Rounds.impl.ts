/**
 * @fileoverview Internal implementation classes for Tournament rounds, matches, and teams.
 * 
 * WARNING: This file contains internal implementation details.
 * DO NOT import from this file outside of src/model/Tournament*.ts files.
 * Use the public Tournament interface from Tournament.ts instead.
 */

import { Mutable } from "../core/Mutable.ts";
import {
  Match,
  PlayerId,
  Performance,
  Round,
  Score,
  Team,
} from "./Tournament.ts";
import { TournamentContext, RoundContext } from "./Context.ts";
import { ParticipatingPlayerImpl, PerformanceImpl } from "./Players.impl.ts";

/**
 * @internal - Implementation class, not part of public API
 * Only exported for use within Tournament model files
 */
export class TeamImpl implements Team {
  constructor(
    readonly player1: ParticipatingPlayerImpl,
    readonly player2: ParticipatingPlayerImpl,
  ) { };
}

/**
 * @internal - Implementation class, not part of public API
 * Only exported for use within Tournament model files
 */
export class MatchImpl implements Mutable<Match> {
  score?: Score;
  constructor(
    private round: RoundContext,
    readonly teamA: TeamImpl,
    readonly teamB: TeamImpl,
  ) { };

  submitScore(score?: Score) {
    const diffA = new PerformanceImpl();
    const diffB = new PerformanceImpl();
    if (score) {
      diffA.apply(score);
      diffB.apply([score[1], score[0]]);
    }
    if (this.score) {
      diffA.apply(this.score, false);
      diffB.apply([this.score[1], this.score[0]], false);
    }
    this.score = score;
    this.round.addPerformance(this.teamA.player1.id, diffA);
    this.round.addPerformance(this.teamA.player2.id, diffA);
    this.round.addPerformance(this.teamB.player1.id, diffB);
    this.round.addPerformance(this.teamB.player2.id, diffB);
    this.round.tournament.notifyChange();
  }
}

/**
 * @internal - Implementation class, not part of public API
 * Only exported for use within Tournament model files
 */
export class RoundImpl implements Round, RoundContext {
  matches: MatchImpl[] = [];
  paused: ParticipatingPlayerImpl[];
  inactive: ParticipatingPlayerImpl[];
  playerMap: Map<PlayerId, ParticipatingPlayerImpl>;

  /**
   * Creates a new round with the given matches and participating players.
   * 
   * @param tournament - Tournament context for accessing player data
   * @param index - Zero-based round number
   * @param participating - Players participating from previous rounds (carries over stats).
   *                        For round 1 during deserialization, this may be empty and players
   *                        will be created on-demand from matched/paused/inactive arrays.
   * @param matched - Array of matched teams as player ID pairs: [[teamA], [teamB]]
   * @param paused - Player IDs who were ACTIVE but unmatched at round creation time.
   *                 These players wanted to play but couldn't be matched (e.g., odd number out).
   * @param inactive - Player IDs who were INACTIVE at round creation time.
   *                   These players were participating in previous rounds but are now inactive.
   * 
   * Note: The paused and inactive arrays capture historical player active state at the moment
   * this round was created. They cannot be derived from current player.active state during
   * deserialization, as players may have been activated/deactivated between rounds or after
   * the tournament was saved. For example:
   * - Round 1: Alice is active → gets paused (unmatched)
   * - Round 2: Alice is deactivated → appears in inactive
   * - Save & reload: Alice's current state is inactive, but Round 1 still shows her as paused
   * 
   * This historical record is essential for:
   * - Displaying correct paused/inactive badges in the UI
   * - Preserving pauseCount and lastPause statistics
   * - Maintaining tournament history integrity
   */
  constructor(
    readonly tournament: TournamentContext,
    readonly index: number,
    participating: ParticipatingPlayerImpl[],
    matched: [[PlayerId, PlayerId], [PlayerId, PlayerId]][],
    paused: PlayerId[],
    inactive: PlayerId[],
  ) {
    this.playerMap = new Map(participating.map((p) => [p.id, p.deepCopy()]));
    const getOrCreate = (id: PlayerId) => {
      let result = this.playerMap.get(id);
      if (!result) {
        result = new ParticipatingPlayerImpl(this.tournament, id);
        this.playerMap.set(id, result);
      }
      return result;
    };
    this.paused = paused.map((id) => {
      const player = getOrCreate(id);
      player.pauseCount += 1;
      player.lastPause = index;
      return player;
    });
    this.inactive = inactive.map((id) => {
      const player = getOrCreate(id);
      return player;
    });
    this.matches = matched.map((m) => {
      const a1 = getOrCreate(m[0][0]);
      const a2 = getOrCreate(m[0][1]);
      const b1 = getOrCreate(m[1][0]);
      const b2 = getOrCreate(m[1][1]);
      const teamA = new TeamImpl(a1, a2);
      a1.incPartner(a2.id, index);
      a2.incPartner(a1.id, index);
      b1.incPartner(b2.id, index);
      b2.incPartner(b1.id, index);
      const teamB = new TeamImpl(b1, b2);
      const match = new MatchImpl(this, teamA, teamB);
      [a1, a2, b1, b2].forEach((p) => (p.matchCount += 1));
      [a1, a2].forEach((p) => {
        [b1, b2].forEach((q) => {
          p.incOpponent(q.id, index);
          q.incOpponent(p.id, index);
        });
      });
      return match;
    });
  }

  isLast(): boolean {
    return this.tournament.rounds[this.tournament.rounds.length - 1] === this;
  }

  delete(): boolean {
    const success = this.isLast();
    if (success) {
      this.tournament.rounds.pop();
      this.tournament.notifyChange();
    }
    return success;
  }

  // RoundContext interface methods
  hasParticipant(id: PlayerId): boolean {
    return this.playerMap.has(id);
  }

  getParticipatingPlayers(): ParticipatingPlayerImpl[] {
    return Array.from(this.playerMap.values());
  }

  standings(groups?: number[]) {
    const players = Array.from(this.playerMap.values())
      .filter((player) => !groups || groups.length === 0 || groups.includes(player.group))
      .filter((player) => player.wins + player.draws + player.losses > 0)
      .toSorted((p, q) => {
        const result = p.compare(q);
        if (result === 0) {
          return p.name < q.name ? -1 : p.name > q.name ? 1 : 0;
        }
        return result;
      });
    let rank = 1;
    return players.map((player, i) => {
      if (i === 0 || players[i - 1].compare(players[i]) === 0) {
        return { rank, player };
      } else {
        rank = i + 1;
        return { rank, player };
      }
    });
  }

  addPerformance(id: PlayerId, performance: Performance) {
    this.playerMap.get(id)!.add(performance);
    if (this.index + 1 < this.tournament.rounds.length) {
      const nextRound = this.tournament.rounds[this.index + 1];
      nextRound?.addPerformance(id, performance);
    }
  }
}

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
  TeamKey,
  createTeamKey,
} from "./Tournament.ts";
import { TournamentContext, RoundContext } from "./Context.ts";
import { ParticipatingPlayerImpl, ParticipatingTeamImpl, PerformanceImpl } from "./Players.impl.ts";

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
    
    // Track team performance
    const teamAKey = createTeamKey(this.teamA.player1.id, this.teamA.player2.id);
    const teamBKey = createTeamKey(this.teamB.player1.id, this.teamB.player2.id);
    this.round.addTeamPerformance(teamAKey, diffA);
    this.round.addTeamPerformance(teamBKey, diffB);
    
    this.round.tournament.notifyChange();
  }
}

/**
 * @internal - Implementation class, not part of public API
 * Only exported for use within Tournament model files
 */
export class RoundImpl implements Round, RoundContext {
  matches: MatchImpl[] = [];
  paused!: ParticipatingPlayerImpl[];
  inactive!: ParticipatingPlayerImpl[];
  playerMap!: Map<PlayerId, ParticipatingPlayerImpl>;
  teamMap!: Map<TeamKey, ParticipatingTeamImpl>;
  
  // Store references for round reconstruction (used by switchPlayers)
  private originalParticipating: ParticipatingPlayerImpl[];
  private originalParticipatingTeams: ParticipatingTeamImpl[];

  /**
   * Creates a new round with the given matches and participating players.
   * 
   * @param tournament - Tournament context for accessing player data
   * @param index - Zero-based round number
   * @param participating - Players participating from previous rounds (carries over stats).
   *                        For round 1 during deserialization, this may be empty and players
   *                        will be created on-demand from matched/paused/inactive arrays.
   * @param participatingTeams - Teams from previous rounds (carries over stats).
   *                             For round 1, this will be empty and teams created on-demand.
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
    participatingTeams: ParticipatingTeamImpl[],
    matched: [[PlayerId, PlayerId], [PlayerId, PlayerId]][],
    paused: PlayerId[],
    inactive: PlayerId[],
  ) {
    this.originalParticipating = participating;
    this.originalParticipatingTeams = participatingTeams;
    this.buildRound(participating, participatingTeams, matched, paused, inactive);
  }

  /**
   * Builds or rebuilds the round with the given match/paused/inactive configuration.
   * Used by both the constructor and switchPlayers() method.
   */
  private buildRound(
    participating: ParticipatingPlayerImpl[],
    participatingTeams: ParticipatingTeamImpl[],
    matched: [[PlayerId, PlayerId], [PlayerId, PlayerId]][],
    paused: PlayerId[],
    inactive: PlayerId[]
  ): void {
    // Deep copy player stats from previous round
    this.playerMap = new Map(participating.map((p) => [p.id, p.deepCopy()]));
    
    // Deep copy team stats from previous round
    this.teamMap = new Map(participatingTeams.map((t) => [t.teamKey, t.deepCopy()]));
    
    const getOrCreate = (id: PlayerId) => {
      let result = this.playerMap.get(id);
      if (!result) {
        result = new ParticipatingPlayerImpl(this.tournament, id);
        this.playerMap.set(id, result);
      }
      return result;
    };
    
    const getOrCreateTeam = (p1Id: PlayerId, p2Id: PlayerId) => {
      const key = createTeamKey(p1Id, p2Id);
      let result = this.teamMap.get(key);
      if (!result) {
        // Team doesn't exist from previous rounds, create new
        result = new ParticipatingTeamImpl(p1Id, p2Id);
        this.teamMap.set(key, result);
      }
      return result;
    };
    this.paused = paused.map((id) => {
      const player = getOrCreate(id);
      player.pauseCount += 1;
      player.lastPause = this.index;
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
      
      // Build team A
      const teamA = new TeamImpl(a1, a2);
      a1.incPartner(a2.id, this.index);
      a2.incPartner(a1.id, this.index);
      
      // Track team A (for performance tracking)
      getOrCreateTeam(a1.id, a2.id);
      
      // Build team B
      const teamB = new TeamImpl(b1, b2);
      b1.incPartner(b2.id, this.index);
      b2.incPartner(b1.id, this.index);
      
      // Track team B (for performance tracking)
      getOrCreateTeam(b1.id, b2.id);
      
      const match = new MatchImpl(this, teamA, teamB);
      
      // Track player stats
      [a1, a2, b1, b2].forEach((p) => (p.matchCount += 1));
      [a1, a2].forEach((p) => {
        [b1, b2].forEach((q) => {
          p.incOpponent(q.id, this.index);
          q.incOpponent(p.id, this.index);
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

  switchPlayers(id1: PlayerId, id2: PlayerId): boolean {
    // Validate: Must be last round
    if (!this.isLast()) return false;
    
    // Validate: Cannot switch same player
    if (id1 === id2) return false;
    
    // Validate: Both players must exist in round
    if (!this.playerMap.has(id1) || !this.playerMap.has(id2)) return false;
    
    // Validate: Neither can be inactive
    if (this.inactive.some(p => p.id === id1 || p.id === id2)) return false;
    
    // Validate: Neither player can be in a match with a score
    const match1 = this.matches.find(m =>
      m.teamA.player1.id === id1 || m.teamA.player2.id === id1 ||
      m.teamB.player1.id === id1 || m.teamB.player2.id === id1
    );
    const match2 = this.matches.find(m =>
      m.teamA.player1.id === id2 || m.teamA.player2.id === id2 ||
      m.teamB.player1.id === id2 || m.teamB.player2.id === id2
    );
    
    if (match1?.score !== undefined || match2?.score !== undefined) {
      return false;
    }
    
    // Extract current structure AND scores from round state
    const matchesWithScores = this.matches.map(m => ({
      teamA: [m.teamA.player1.id, m.teamA.player2.id] as [PlayerId, PlayerId],
      teamB: [m.teamB.player1.id, m.teamB.player2.id] as [PlayerId, PlayerId],
      score: m.score
    }));
    const paused = this.paused.map(p => p.id);
    
    // Swap player IDs in arrays (including in score tracking structure)
    for (const matchData of matchesWithScores) {
      for (const team of [matchData.teamA, matchData.teamB]) {
        for (let i = 0; i < team.length; i++) {
          if (team[i] === id1) team[i] = id2;
          else if (team[i] === id2) team[i] = id1;
        }
      }
    }
    for (let i = 0; i < paused.length; i++) {
      if (paused[i] === id1) paused[i] = id2;
      else if (paused[i] === id2) paused[i] = id1;
    }
    
    // Rebuild round with swapped configuration
    const matched = matchesWithScores.map(m => [m.teamA, m.teamB] as [[PlayerId, PlayerId], [PlayerId, PlayerId]]);
    this.buildRound(
      this.originalParticipating,
      this.originalParticipatingTeams,
      matched,
      paused,
      this.inactive.map(p => p.id)
    );
    
    // Restore scores to reconstructed matches
    matchesWithScores.forEach((oldMatch, index) => {
      if (oldMatch.score !== undefined) {
        this.matches[index].submitScore(oldMatch.score);
      }
    });
    
    this.tournament.notifyChange();
    return true;
  }

  // RoundContext interface methods
  hasParticipant(id: PlayerId): boolean {
    return this.playerMap.has(id);
  }

  getParticipatingPlayers(): ParticipatingPlayerImpl[] {
    return Array.from(this.playerMap.values());
  }

  getParticipatingTeams(): ParticipatingTeamImpl[] {
    return Array.from(this.teamMap.values());
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

  teamStandings() {
    const teams = Array.from(this.teamMap.values())
      .filter((team) => team.wins + team.draws + team.losses > 0)
      .toSorted((t1, t2) => {
        const result = t1.compare(t2);
        if (result === 0) {
          // Tiebreaker: sort by team name (player1 & player2 names)
          const t1Player1 = this.tournament.getPlayer(t1.player1Id)!;
          const t1Player2 = this.tournament.getPlayer(t1.player2Id)!;
          const t2Player1 = this.tournament.getPlayer(t2.player1Id)!;
          const t2Player2 = this.tournament.getPlayer(t2.player2Id)!;
          const t1Name = `${t1Player1.name} & ${t1Player2.name}`;
          const t2Name = `${t2Player1.name} & ${t2Player2.name}`;
          return t1Name < t2Name ? -1 : t1Name > t2Name ? 1 : 0;
        }
        return result;
      });
    let rank = 1;
    return teams.map((team, i) => {
      if (i === 0 || teams[i - 1].compare(teams[i]) === 0) {
        return { rank, team };
      } else {
        rank = i + 1;
        return { rank, team };
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

  addTeamPerformance(teamKey: TeamKey, performance: Performance) {
    this.teamMap.get(teamKey)!.add(performance);
    if (this.index + 1 < this.tournament.rounds.length) {
      const nextRound = this.tournament.rounds[this.index + 1];
      nextRound?.addTeamPerformance(teamKey, performance);
    }
  }
}

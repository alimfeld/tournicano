import { shuffle } from "../core/Util.ts";
import {
  MatchingSpec,
  TeamUpGroupMode,
  MatchUpGroupMode,
  TeamUpPerformanceMode,
} from "./MatchingSpec.ts";
import { partitionPlayers, partitionFixedTeams, PartitionResult } from "./Partitioning.ts";
import { match } from "./MaximumMatching.ts";
import {
  curriedTeamUpGroupWeight,
  curriedTeamUpVarietyWeight,
  curriedTeamUpPerformanceWeight,
  curriedMatchUpGroupWeight,
  curriedMatchUpVarietyWeight,
  matchUpPerformanceWeight,
} from "./WeightFunctions.ts";

// Re-export PartitionResult for backward compatibility
export type { PartitionResult };

export type PlayerId = string;

export interface Player {
  readonly id: PlayerId;
  readonly group: number;
  readonly winRatio: number;
  readonly plusMinus: number;
  readonly matchCount: number;
  readonly pauseCount: number;
  readonly lastPause: number;
  readonly partners: Map<string, number[]>;
  readonly opponents: Map<string, number[]>;
}

export type Team = [Player, Player];
export type Match = [Team, Team];

// Re-export partitionPlayers for backward compatibility
export { partitionPlayers };

/**
 * Helper: Perform match-up phase (team vs team matching)
 */
const matchUpTeams = (
  teams: Team[],
  spec: MatchingSpec,
  currentRoundIndex: number,
  debug: boolean
): Match[] => {
  return match(
    teams,
    (t: Team) => [t[0].winRatio + t[1].winRatio, t[0].plusMinus + t[1].plusMinus],
    [
      {
        factor: spec.matchUp.groupFactor,
        fn: curriedMatchUpGroupWeight(
          spec.matchUp.groupMode || MatchUpGroupMode.SAME,
        ),
      },
      {
        factor: spec.matchUp.varietyFactor,
        fn: curriedMatchUpVarietyWeight(currentRoundIndex),
      },
      {
        factor: spec.matchUp.performanceFactor,
        fn: matchUpPerformanceWeight,
      },
    ],
    debug,
  );
};

/**
 * Helper: Sort matches by total team performance
 */
const sortMatchesByPerformance = (matches: Match[]): Match[] => {
  return matches.toSorted((matchA, matchB) => {
    const perfA = matchA[0][0].winRatio + matchA[0][1].winRatio +
      matchA[1][0].winRatio + matchA[1][1].winRatio;
    const perfB = matchB[0][0].winRatio + matchB[0][1].winRatio +
      matchB[1][0].winRatio + matchB[1][1].winRatio;
    if (perfA !== perfB) {
      return perfB - perfA; // Higher win ratio first
    }
    // Tie-breaker: use plusMinus
    const pmA = matchA[0][0].plusMinus + matchA[0][1].plusMinus +
      matchA[1][0].plusMinus + matchA[1][1].plusMinus;
    const pmB = matchB[0][0].plusMinus + matchB[0][1].plusMinus +
      matchB[1][0].plusMinus + matchB[1][1].plusMinus;
    return pmB - pmA; // Higher plusMinus first
  });
};

export const matching = (
  players: Player[],
  spec: MatchingSpec,
  currentRoundIndex: number,
  maxMatches?: number,
  teams?: Array<{ player1Id: PlayerId; player2Id: PlayerId }>,
  debug = false,
): [matches: Match[], paused: Player[]] => {
  let competingTeams: Team[];
  let paused: Player[];

  // PHASE 1: TEAM FORMATION (conditional based on mode)
  if (!spec.teamUp && teams !== undefined) {
    // FIXED TEAMS MODE: TeamAmericano, TeamMexicano
    // Find orphaned players (not in any team)
    const teamPlayerIds = new Set<PlayerId>();
    for (const { player1Id, player2Id } of teams) {
      teamPlayerIds.add(player1Id);
      teamPlayerIds.add(player2Id);
    }
    const orphanedPlayers = players.filter((p) => !teamPlayerIds.has(p.id));

    // Auto-pair orphaned players using simple in-order pairing
    const newTeams: Array<{ player1Id: PlayerId; player2Id: PlayerId }> = [];
    for (let i = 0; i + 1 < orphanedPlayers.length; i += 2) {
      newTeams.push({
        player1Id: orphanedPlayers[i].id,
        player2Id: orphanedPlayers[i + 1].id,
      });
    }

    // Combine existing teams + newly paired teams
    const allTeams = [...teams, ...newTeams];

    // Partition teams using player-level stats
    const result = partitionFixedTeams(allTeams, players, spec, maxMatches);
    competingTeams = result.competing;
    paused = result.paused;
  } else {
    // ROTATING TEAMS MODE: Americano, Mexicano, etc.
    if (!spec.teamUp) {
      throw new Error("spec.teamUp is required for rotating team matching");
    }

    const { competing, paused: pausedPlayers } = partitionPlayers(players, spec, maxMatches);

    // Team-up phase: pair players into teams
    competingTeams = match(
      competing,
      (p: Player) => [p.winRatio, p.plusMinus],
      [
        {
          factor: spec.teamUp.groupFactor,
          fn: curriedTeamUpGroupWeight(
            spec.teamUp.groupMode || TeamUpGroupMode.PAIRED,
          ),
        },
        {
          factor: spec.teamUp.varietyFactor,
          fn: curriedTeamUpVarietyWeight(currentRoundIndex),
        },
        {
          factor: spec.teamUp.performanceFactor,
          fn: curriedTeamUpPerformanceWeight(
            spec.teamUp.performanceMode || TeamUpPerformanceMode.EQUAL,
            competing.length,
          ),
        },
      ],
      debug,
    );

    paused = pausedPlayers;
  }

  // Shuffle teams before match-up if matchUp variety is enabled
  // This breaks patterns in opponent selection (relevant for both fixed and rotating team modes)
  if (spec.matchUp.varietyFactor > 0) {
    competingTeams = shuffle(competingTeams);
  }

  // PHASE 2: MATCH-UP (team vs team matching - shared by both modes)
  let matches = matchUpTeams(competingTeams, spec, currentRoundIndex, debug);

  // PHASE 3: PERFORMANCE SORTING (optional - shared by both modes)
  if (spec.matchUp.performanceFactor > 0) {
    matches = sortMatchesByPerformance(matches);
  }

  return [matches, paused];
};

import { shuffle } from "../core/Util.ts";
import {
  MatchingSpec,
  TeamUpGroupMode,
  MatchUpGroupMode,
  TeamUpPerformanceMode,
} from "./MatchingSpec.ts";
import { partitionPlayers, PartitionResult } from "./Partitioning.ts";
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

export interface Player {
  readonly id: string;
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

export const matching = (
  players: Player[],
  spec: MatchingSpec,
  currentRoundIndex: number,
  maxMatches?: number,
  debug = false,
): [matches: Match[], paused: Player[]] => {
  const { competing, paused } = partitionPlayers(players, spec, maxMatches);

  let teams = match(
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
  if (spec.teamUp.varietyFactor > 0 || spec.matchUp.varietyFactor > 0) {
    // shuffle teams to break patterns
    teams = shuffle(teams);
  }
  let matches = match(
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

  if (spec.matchUp.performanceFactor > 0) {
    // Sort matches by performance (best performing players first)
    matches = matches.toSorted((matchA, matchB) => {
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
  }

  return [matches, paused];
};

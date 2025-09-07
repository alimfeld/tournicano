import {
  iter,
  weight as maximumMatching,
  // @ts-ignore
} from "@graph-algorithm/maximum-matching";
import { shuffle } from "./Util";

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

export enum TeamUpGroupMode {
  ADJACENT,
  SAME,
}

export enum TeamUpPerformanceMode {
  EQUAL, // players with equal performance
  AVERAGE, // players adding app to average performance
  MEXICANO, // 1st with 3rd and 2nd with 4th
}

interface TeamUpSpec {
  varietyFactor: number;
  performanceFactor: number;
  groupFactor: number;
  groupMode: TeamUpGroupMode;
  performanceMode: TeamUpPerformanceMode;
}

interface MatchUpSpec {
  varietyFactor: number;
  performanceFactor: number;
  groupFactor: number;
}

export const Americano: MatchingSpec = {
  teamUp: {
    varietyFactor: 100,
    performanceFactor: 0,
    performanceMode: TeamUpPerformanceMode.AVERAGE, // not relevant
    groupFactor: 0,
    groupMode: TeamUpGroupMode.ADJACENT, // not relevant
  },
  matchUp: {
    varietyFactor: 100,
    performanceFactor: 0,
    groupFactor: 0,
  },
};

export const AmericanoMixed: MatchingSpec = {
  teamUp: {
    varietyFactor: 50,
    performanceFactor: 0,
    performanceMode: TeamUpPerformanceMode.AVERAGE, // not relevant
    groupFactor: 100,
    groupMode: TeamUpGroupMode.ADJACENT,
  },
  matchUp: {
    varietyFactor: 100,
    performanceFactor: 0,
    groupFactor: 100,
  },
};

export const Mexicano: MatchingSpec = {
  teamUp: {
    varietyFactor: 0,
    performanceFactor: 100,
    performanceMode: TeamUpPerformanceMode.MEXICANO,
    groupFactor: 0,
    groupMode: TeamUpGroupMode.ADJACENT, // not relevant
  },
  matchUp: {
    varietyFactor: 0,
    performanceFactor: 100,
    groupFactor: 0,
  },
};

export const Tournicano: MatchingSpec = {
  teamUp: {
    varietyFactor: 100,
    performanceFactor: 100,
    performanceMode: TeamUpPerformanceMode.MEXICANO,
    groupFactor: 100,
    groupMode: TeamUpGroupMode.ADJACENT,
  },
  matchUp: {
    varietyFactor: 100,
    performanceFactor: 100,
    groupFactor: 100,
  },
};

export interface MatchingSpec {
  teamUp: TeamUpSpec;
  matchUp: MatchUpSpec;
}

export type Team = [Player, Player];
export type Match = [Team, Team];

export const matching = (
  players: Player[],
  spec: MatchingSpec,
  maxMatches?: number,
): [matches: Match[], paused: Player[]] => {
  const [competing, paused] = partition(
    players,
    maxMatches ? maxMatches : Math.floor(players.length / 4),
  );

  let teams = match(
    competing,
    (p: Player) => [p.winRatio, p.plusMinus],
    [
      {
        factor: spec.teamUp.groupFactor,
        fn: curriedTeamUpGroupWeight(
          spec.teamUp.groupMode || TeamUpGroupMode.ADJACENT,
        ),
      },
      {
        factor: spec.teamUp.varietyFactor,
        fn: teamUpVarietyWeight,
      },
      {
        factor: spec.teamUp.performanceFactor,
        fn: curriedTeamUpPerformanceWeight(
          spec.teamUp.performanceMode || TeamUpPerformanceMode.EQUAL,
          competing.length,
        ),
      },
    ],
  );
  if (spec.teamUp.varietyFactor > 0 || spec.matchUp.varietyFactor > 0) {
    // shuffle teams to break patterns
    teams = shuffle(teams);
  }
  const matches = match(
    teams,
    (t: Team) => [t[0].winRatio + t[1].winRatio, t[0].plusMinus + t[1].plusMinus],
    [
      {
        factor: spec.matchUp.groupFactor,
        fn: matchUpGroupWeight,
      },
      {
        factor: spec.matchUp.varietyFactor,
        fn: matchUpVarietyWeight,
      },
      {
        factor: spec.matchUp.performanceFactor,
        fn: matchUpPerformanceWeight,
      },
    ],
  );
  return [matches, paused];
};

const playRatio = (p: Player) => {
  return p.matchCount / (p.pauseCount + p.matchCount + 1);
};

const groupCounts = (players: Player[]) => {
  return players.reduce((acc: number[], player) => {
    acc[player.group] = (acc[player.group] || 0) + 1;
    return acc;
  }, []);
};

const partition = (
  players: Player[],
  maxMatches: number,
): [competing: Player[], paused: Player[]] => {
  let competingCount = maxMatches * 4;
  if (players.length < competingCount) {
    competingCount = players.length - (players.length % 4);
  }
  let sorted = players;
  if (players.length > competingCount) {
    // we need to pause players
    sorted = players.toSorted((p, q) => playRatio(p) - playRatio(q));
    const definitelyPlaying = [];
    const maybePaused = [];
    const definitelyPaused = [];
    const cutOff = playRatio(sorted.at(competingCount - 1)!);
    for (const player of sorted) {
      const r = playRatio(player);
      if (r < cutOff) {
        definitelyPlaying.push(player);
      } else if (r == cutOff) {
        maybePaused.push(player);
      } else {
        definitelyPaused.push(player);
      }
    }
    if (definitelyPlaying.length + maybePaused.length > competingCount) {
      const maxGroupCounts = groupCounts(definitelyPlaying.concat(maybePaused));
      const minGroupCounts = groupCounts(definitelyPlaying);
      let distribution = findGroupDistribution(
        {
          max: maxGroupCounts,
          multipleOf: 4,
          sum: competingCount,
        },
        minGroupCounts,
      );
      if (distribution == null) {
        distribution = findGroupDistribution(
          {
            max: maxGroupCounts,
            multipleOf: 2,
            sum: competingCount,
          },
          minGroupCounts,
        );
      }
      if (distribution != null) {
        sorted = definitelyPlaying;
        const currentCounts = minGroupCounts.slice();
        const tail = [];
        // shuffle candidates to break patterns
        const candidates = shuffle(maybePaused.slice());
        candidates.sort((p, q) => q.lastPause - p.lastPause);
        for (const player of candidates) {
          const currentCount = currentCounts[player.group] || 0;
          const distributionCount = distribution[player.group] || 0;
          if (currentCount < distributionCount) {
            currentCounts[player.group] = currentCount + 1;
            sorted.push(player);
          } else {
            tail.push(player);
          }
        }
        sorted = sorted.concat(tail).concat(definitelyPaused);
      }
    }
  }
  return [sorted.slice(0, competingCount), sorted.slice(competingCount)];
};

const findGroupDistribution = (
  constraints: {
    max: number[];
    multipleOf: number;
    sum: number;
  },
  proposal: number[],
  next: number = 0,
): number[] | null => {
  const [sumProposal, satisfiesMax, satisfiesMultipleOf] = proposal.reduce(
    (acc, val, i) => {
      const count = val || 0;
      acc[0] += count;
      acc[1] = acc[1] && count <= (constraints.max[i] || 0);
      acc[2] = acc[2] && count % constraints.multipleOf == 0;
      return acc;
    },
    [0, true, true],
  );
  if (!satisfiesMax) {
    return null;
  }
  if (sumProposal == constraints.sum && satisfiesMax && satisfiesMultipleOf) {
    return proposal;
  }
  if (sumProposal < constraints.sum || !satisfiesMultipleOf) {
    for (let i = 0; i < constraints.max.length; i++) {
      const g = (i + next) % constraints.max.length;
      const nextProposal = proposal.slice();
      nextProposal[g] = (nextProposal[g] || 0) + constraints.multipleOf;
      nextProposal[g] =
        nextProposal[g] - (nextProposal[g] % constraints.multipleOf);
      const result = findGroupDistribution(constraints, nextProposal, next + 1);
      if (result != null) {
        return result;
      }
    }
  }
  return null;
};

const match = <Type>(
  entities: Type[],
  perf: (entity: Type) => number[],
  weights: {
    factor: number;
    fn: (
      a: { rank: number; entity: Type },
      b: { rank: number; entity: Type },
    ) => number;
  }[],
): [Type, Type][] => {
  const ranks = perfToRanks(entities.map(entity => perf(entity)));
  let totalWeights: number[] = [];
  weights.forEach((weight) => {
    if (weight.factor != 0) {
      let weights: number[] = [];
      for (let i = 0; i < entities.length - 1; i++) {
        for (let j = i + 1; j < entities.length; j++) {
          const a = entities[i];
          const b = entities[j];
          weights.push(
            weight.fn({ rank: ranks[i], entity: a }, { rank: ranks[j], entity: b }),
          );
        }
      }
      // normalize weights between 0 and 1 and apply factor
      const min = Math.min(...weights);
      weights = weights.map((w) => w - min);
      const max = Math.max(...weights);
      if (max != 0) {
        weights = weights.map((w) => (weight.factor * w) / max);
        // and add weights to total weights
        if (totalWeights.length > 0) {
          totalWeights = totalWeights.map((w, i) => w + weights[i]);
        } else {
          totalWeights = weights;
        }
      }
    }
  });
  const edges = [];
  let pos = 0;
  for (let i = 0; i < entities.length - 1; i++) {
    for (let j = i + 1; j < entities.length; j++) {
      // add 1 to total weight to ensure weight > 0 for maximum matching;
      edges.push([i, j, (totalWeights[pos++] || 0) + 1]);
    }
  }
  const matching = maximumMatching(edges);
  return [...iter(matching)].map((edge: [number, number]) => [
    entities[edge[0]],
    entities[edge[1]],
  ]);
};

const curriedTeamUpGroupWeight = (mode: TeamUpGroupMode) => {
  return (a: { entity: Player }, b: { entity: Player }): number => {
    switch (mode) {
      case TeamUpGroupMode.SAME:
        return -Math.abs(a.entity.group - b.entity.group);
      case TeamUpGroupMode.ADJACENT:
        return -Math.abs(Math.abs(a.entity.group - b.entity.group) - 1);
    }
  };
};

const teamUpVarietyWeight = (
  a: { entity: Player },
  b: { entity: Player },
): number => {
  const matchSum = a.entity.matchCount + b.entity.matchCount;
  if (matchSum == 0) {
    return 0;
  }
  const roundsTeamedUp = a.entity.partners.get(b.entity.id) || [];
  if (roundsTeamedUp.length == 0) {
    return 0;
  }
  const samePartnerSumA = a.entity.partners
    .values()
    .reduce((acc, rounds) => (acc += rounds.length - 1), 1);
  const samePartnerSumB = a.entity.partners
    .values()
    .reduce((acc, rounds) => (acc += rounds.length - 1), 1);
  return -(
    roundsTeamedUp.length * // the number of times the players teamed up already
    (
      roundsTeamedUp.at(-1)! + 1 + // the last round (index) the players teamed up
      samePartnerSumA + samePartnerSumB // the number of times both players were teamed up with the same partner in the past
    )
  ) / matchSum; // normalize
};

const curriedTeamUpPerformanceWeight = (
  mode: TeamUpPerformanceMode,
  competitorCount: number,
) => {
  return (a: { rank: number }, b: { rank: number }) => {
    const rankDiff = Math.abs(b.rank - a.rank)
    switch (mode) {
      case TeamUpPerformanceMode.EQUAL:
        return -(rankDiff);
      case TeamUpPerformanceMode.AVERAGE:
        return -Math.abs(competitorCount - 1 - rankDiff);
      case TeamUpPerformanceMode.MEXICANO:
        return -Math.abs(rankDiff - 2);
    }
  };
};

const matchUpGroupWeight = (a: { entity: Team }, b: { entity: Team }) => {
  const diff =
    a.entity[0].group +
    a.entity[1].group -
    b.entity[0].group -
    b.entity[1].group;
  return -Math.abs(diff);
};

const matchUpVarietyWeight = (
  a: { entity: Team },
  b: { entity: Team },
): number => {
  const matchSum =
    a.entity[0].matchCount +
    a.entity[1].matchCount +
    b.entity[0].matchCount +
    b.entity[1].matchCount;
  if (matchSum == 0) {
    return 0;
  }
  // Individual opponent sum and recency
  const a0b0Rounds = a.entity[0].opponents.get(b.entity[0].id) || [];
  const a0b1Rounds = a.entity[0].opponents.get(b.entity[1].id) || [];
  const a1b0Rounds = a.entity[1].opponents.get(b.entity[0].id) || [];
  const a1b1Rounds = a.entity[1].opponents.get(b.entity[1].id) || [];
  const opponentSum =
    a0b0Rounds.length + a0b1Rounds.length + a1b0Rounds.length + a1b1Rounds.length;
  const opponentRecency =
    (a0b0Rounds.at(-1) || 0) + (a0b1Rounds.at(-1) || 0) + (a1b0Rounds.at(-1) || 0) + (a1b1Rounds.at(-1) || 0);
  // Also determine, wheter players were opposed with the exact same team in the past
  const a0bRounds = a0b0Rounds.concat(a0b1Rounds).filter(
    (round, index, rounds) => rounds.indexOf(round) !== index);
  const a1bRounds = a1b0Rounds.concat(a1b1Rounds).filter(
    (round, index, rounds) => rounds.indexOf(round) !== index);
  const b0aRounds = a0b0Rounds.concat(a1b0Rounds).filter(
    (round, index, rounds) => rounds.indexOf(round) !== index);
  const b1aRounds = a0b1Rounds.concat(a1b1Rounds).filter(
    (round, index, rounds) => rounds.indexOf(round) !== index);
  const opponentTeamSum =
    a0bRounds.length + a1bRounds.length + b0aRounds.length + b1aRounds.length;
  const opponentTeamRecency =
    (a0bRounds.at(-1) || 0) + (a1bRounds.at(-1) || 0) + (b0aRounds.at(-1) || 0) + (b1aRounds.at(-1) || 0);
  return -((opponentTeamSum + 1) * opponentSum * (opponentRecency + opponentTeamRecency) / matchSum);
};

const matchUpPerformanceWeight = (
  a: { rank: number },
  b: { rank: number },
): number => {
  return -(Math.abs(b.rank - a.rank));
};

// Convert array of performance values (primary & tie-breakers) to array of ranks
// (inspired by https://medium.com/@cyberseize/leetcode-1331-rank-transform-of-an-array-a-deep-dive-60444bb0e091)
const perfToRanks = (arr: number[][]) => {
  let cp = [...arr];
  cp = cp.sort((a: number[], b: number[]) => {
    for (let i = 0; i < a.length; i++) {
      if (a[i] != b[i]) {
        return b[i] - a[i];
      }
    }
    return 0;
  });
  let arr_rank = new Map();
  let count = 0;
  for (let i = 0; i < cp.length; i++) {
    ++count;
    const key = cp[i].join("#")
    if (arr_rank.has(key)) {
      continue;
    }
    else {
      arr_rank.set(key, count);
    }

  }
  let rank = [];
  for (let i = 0; i < arr.length; i++) {
    rank.push(arr_rank.get(arr[i].join("#")));
  }
  return rank;
};

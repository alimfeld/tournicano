import {
  iter,
  weight as maximumMatching,
  // @ts-ignore
} from "@graph-algorithm/maximum-matching";

export interface Player {
  readonly id: string;
  readonly group: number;
  readonly winRatio: number;
  readonly plusMinus: number;
  readonly matchCount: number;
  readonly pauseCount: number;
  readonly lastPause: number;
  readonly partnerCounts: Map<string, number>;
  readonly opponentCounts: Map<string, number>;
}

export enum TeamUpGroupMode {
  ADJACENT,
  SAME,
}

export enum TeamUpPerformanceMode {
  EQUAL, // players with equal performance
  AVERAGE, // players adding app to average performance
  MEXICANO_1324, // 1st with 3rd and 2nd with 4th
  MEXICANO_1423, // 1st with 4th and 2nd with 3rd
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
    performanceMode: TeamUpPerformanceMode.MEXICANO_1324,
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
    performanceMode: TeamUpPerformanceMode.MEXICANO_1324,
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

export const matchUp = (
  players: Player[],
  spec: MatchingSpec,
  maxMatches?: number,
): [matches: Match[], paused: Player[]] => {
  const [competing, paused] = partition(
    players,
    maxMatches ? maxMatches : Math.floor(players.length / 4),
  );

  shuffle(competing); // shuffle to break patterns

  const teams = match(
    competing,
    (a: Player, b: Player) =>
      rank([
        [a.winRatio, b.winRatio],
        [a.plusMinus, b.plusMinus],
      ]),
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
  const matches = match(
    teams,
    (a: Team, b: Team) =>
      rank([
        [a[0].winRatio + a[1].winRatio, b[0].winRatio + b[1].winRatio],
        [a[0].plusMinus + a[1].plusMinus, b[0].plusMinus + b[1].plusMinus],
      ]),
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
  let result = players;
  if (players.length > competingCount) {
    // we need to pause players
    result = players.toSorted((p, q) => playRatio(p) - playRatio(q));
    const definitelyPlaying = [];
    const maybePaused = [];
    const definitelyPaused = [];
    const cutOff = playRatio(result.at(competingCount - 1)!);
    for (const player of result) {
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
      const max = groupCounts(definitelyPlaying.concat(maybePaused));
      const min = groupCounts(definitelyPlaying);
      let distribution = findGroupDistribution(
        {
          max,
          multipleOf: 4,
          sum: competingCount,
        },
        min,
      );
      if (distribution == null) {
        distribution = findGroupDistribution(
          {
            max,
            multipleOf: 2,
            sum: competingCount,
          },
          min,
        );
      }
      if (distribution != null) {
        result = definitelyPlaying;
        const currentCounts = min.slice();
        const tail = [];
        const candidates = maybePaused.slice();
        shuffle(candidates); // shuffle to break patterns
        candidates.sort((p, q) => q.lastPause - p.lastPause);
        for (const player of candidates) {
          const currentCount = currentCounts[player.group] || 0;
          const distributionCount = distribution[player.group] || 0;
          if (currentCount < distributionCount) {
            currentCounts[player.group] = currentCount + 1;
            result.push(player);
          } else {
            tail.push(player);
          }
        }
        result = result.concat(tail).concat(definitelyPaused);
      }
    }
  }
  return [result.slice(0, competingCount), result.slice(competingCount)];
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

const rank = (factors: [number, number][]) => {
  for (let i = 0; i < factors.length; i++) {
    const [a, b] = factors[i];
    if (a != b) {
      return b - a;
    }
  }
  return 0;
};

const match = <Type>(
  entities: Type[],
  rankFn: (a: Type, b: Type) => number,
  weights: {
    factor: number;
    fn: (
      a: { rank: number; entity: Type },
      b: { rank: number; entity: Type },
    ) => number;
  }[],
): [Type, Type][] => {
  const ranked = entities.toSorted((a, b) => rankFn(a, b));
  let totalWeights: number[] = [];
  weights.forEach((weight) => {
    if (weight.factor != 0) {
      let weights: number[] = [];
      for (let i = 0; i < ranked.length - 1; i++) {
        for (let j = i + 1; j < ranked.length; j++) {
          const a = ranked[i];
          const b = ranked[j];
          weights.push(
            weight.fn({ rank: i, entity: a }, { rank: j, entity: b }),
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
  for (let i = 0; i < ranked.length - 1; i++) {
    for (let j = i + 1; j < ranked.length; j++) {
      // add 1 to total weight to ensure weight > 0 for maximum matching;
      edges.push([i, j, (totalWeights[pos++] || 0) + 1]);
    }
  }
  shuffle(edges); // shuffle edges to break algo patterns
  const matching = maximumMatching(edges);
  return [...iter(matching)].map((edge: [number, number]) => [
    ranked[edge[0]],
    ranked[edge[1]],
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
  const partnerSum = 2 * (a.entity.partnerCounts.get(b.entity.id) || 0);
  return -(partnerSum / matchSum);
};

const curriedTeamUpPerformanceWeight = (
  mode: TeamUpPerformanceMode,
  competitorCount: number,
) => {
  return (a: { rank: number }, b: { rank: number }) => {
    switch (mode) {
      // we rely on a.rank < b.rank
      case TeamUpPerformanceMode.EQUAL:
        return -(b.rank - a.rank);
      case TeamUpPerformanceMode.AVERAGE:
        return -Math.abs(competitorCount - 1 - b.rank - a.rank);
      case TeamUpPerformanceMode.MEXICANO_1324:
        return -Math.abs(b.rank - a.rank - 2);
      case TeamUpPerformanceMode.MEXICANO_1423:
        switch (a.rank % 4) {
          case 0:
            return -Math.abs(b.rank - a.rank - 3);
          case 1:
            return -Math.abs(b.rank - a.rank - 1);
          case 2:
            return -Math.abs(b.rank - a.rank - 2);
          case 3:
            return -Math.abs(b.rank - a.rank - 4);
          default:
            return 0;
        }
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
  const opponentSum =
    (a.entity[0].opponentCounts.get(b.entity[0].id) || 0) +
    (a.entity[0].opponentCounts.get(b.entity[1].id) || 0) +
    (a.entity[1].opponentCounts.get(b.entity[0].id) || 0) +
    (a.entity[1].opponentCounts.get(b.entity[1].id) || 0);
  return -(opponentSum / matchSum);
};

const matchUpPerformanceWeight = (
  a: { rank: number },
  b: { rank: number },
): number => {
  // we rely on a.rank < b.rank
  return -(b.rank - a.rank);
};

// Fisher-Yates shuffle
const shuffle = (array: any[]) => {
  for (let i = array.length - 1; i > 0; i--) {
    let j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
};

import {
  iter,
  weight as maximumMatching,
  // @ts-ignore
} from "@graph-algorithm/maximum-matching";
import { shuffle } from "./Util.ts";
import {
  MatchingSpec,
  TeamUpGroupMode,
  MatchUpGroupMode,
  TeamUpPerformanceMode,
} from "./MatchingSpec.ts";

// Constants for match structure
const PLAYERS_PER_MATCH = 4;
const PLAYERS_PER_TEAM = 2;
const MEXICANO_RANK_DIFF = 2; // In Mexicano mode, pair 1st with 3rd, 2nd with 4th (rank diff = 2)
const MIN_EDGE_WEIGHT = 1; // Minimum weight for maximum matching algorithm
const PLAY_RATIO_SMOOTHING = 1; // Add to denominator to avoid division by zero and smooth play ratio

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

export interface PartitionResult {
  competing: Player[];
  paused: Player[];
  groupDistribution: Map<number, { total: number; competing: number; paused: number }>;
}

export const partitionPlayers = (
  players: Player[],
  spec: MatchingSpec,
  maxMatches?: number,
): PartitionResult => {
  const effectiveMaxMatches = maxMatches ? maxMatches : Math.floor(players.length / 4);

  const [competing, paused] = spec.balanceGroups
    ? partitionBalanced(players, effectiveMaxMatches)
    : partition(players, effectiveMaxMatches);

  // Calculate group distribution
  const groupDistribution = new Map<number, { total: number; competing: number; paused: number }>();

  for (const player of players) {
    const current = groupDistribution.get(player.group) || { total: 0, competing: 0, paused: 0 };
    current.total++;
    groupDistribution.set(player.group, current);
  }

  for (const player of competing) {
    const current = groupDistribution.get(player.group)!;
    current.competing++;
  }

  for (const player of paused) {
    const current = groupDistribution.get(player.group)!;
    current.paused++;
  }

  return { competing, paused, groupDistribution };
};

export const matching = (
  players: Player[],
  spec: MatchingSpec,
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
        fn: matchUpVarietyWeight,
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

const playRatio = (p: Player) => {
  return p.matchCount / (p.pauseCount + p.matchCount + PLAY_RATIO_SMOOTHING);
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
  let competingCount = maxMatches * PLAYERS_PER_MATCH;
  if (players.length < competingCount) {
    competingCount = players.length - (players.length % PLAYERS_PER_MATCH);
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
      } else if (r === cutOff) {
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
          multipleOf: PLAYERS_PER_MATCH,
          sum: competingCount,
        },
        minGroupCounts,
      );
      if (distribution === null) {
        distribution = findGroupDistribution(
          {
            max: maxGroupCounts,
            multipleOf: PLAYERS_PER_TEAM,
            sum: competingCount,
          },
          minGroupCounts,
        );
      }
      if (distribution !== null) {
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
      acc[2] = acc[2] && count % constraints.multipleOf === 0;
      return acc;
    },
    [0, true, true],
  );
  if (!satisfiesMax) {
    return null;
  }
  if (sumProposal === constraints.sum && satisfiesMax && satisfiesMultipleOf) {
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
      if (result !== null) {
        return result;
      }
    }
  }
  return null;
};

const partitionBalanced = (
  players: Player[],
  maxMatches: number,
): [competing: Player[], paused: Player[]] => {
  // Step 1: Group players by their group number
  const playersByGroup = new Map<number, Player[]>();
  for (const player of players) {
    const groupPlayers = playersByGroup.get(player.group) || [];
    groupPlayers.push(player);
    playersByGroup.set(player.group, groupPlayers);
  }

  const numberOfGroups = playersByGroup.size;

  // Only support 2 or 4 groups with balancing
  // - Single group: no balancing needed, use regular partition logic
  // - 3 groups: not supported (would require 3 courts minimum and 12 players per match)
  // - 5+ groups: not supported (adds complexity without clear use case)
  if (numberOfGroups === 1) {
    // Single group - no balancing needed, use regular partition
    return partition(players, maxMatches);
  }
  if (numberOfGroups !== 2 && numberOfGroups !== 4) {
    return [[], players]; // Everyone paused
  }

  // Step 2: Determine required multiple per group
  // - 2 groups: need 2 players per group (min 4 total for 1 match)
  // - 4 groups: need 1 player per group (min 4 total for 1 match)
  const multipleRequired = numberOfGroups === 2 ? 2 : 1;

  // Step 3: Find max players per group (as a multiple)
  let playersPerGroup = Infinity;
  for (const groupPlayers of playersByGroup.values()) {
    const maxFromThisGroup = Math.floor(groupPlayers.length / multipleRequired) * multipleRequired;
    playersPerGroup = Math.min(playersPerGroup, maxFromThisGroup);
  }

  // Step 4: Apply maxMatches constraint
  const maxTotalPlayers = maxMatches * PLAYERS_PER_MATCH;
  const maxPlayersPerGroupFromCourts =
    Math.floor(maxTotalPlayers / numberOfGroups / multipleRequired) * multipleRequired;
  playersPerGroup = Math.min(playersPerGroup, maxPlayersPerGroupFromCourts);

  // Step 5: If playersPerGroup is 0 or invalid, everyone paused
  if (!isFinite(playersPerGroup) || playersPerGroup <= 0) {
    return [[], players];
  }

  // Step 6: Select players from each group by playRatio
  const competing: Player[] = [];
  const paused: Player[] = [];

  for (const groupPlayers of playersByGroup.values()) {
    // Sort by playRatio (ascending), then by lastPause (descending)
    const sorted = groupPlayers.toSorted((p, q) => {
      const ratioP = playRatio(p);
      const ratioQ = playRatio(q);
      if (ratioP !== ratioQ) {
        return ratioP - ratioQ; // Lower ratio first (played less)
      }
      return q.lastPause - p.lastPause; // Paused longer ago first
    });

    competing.push(...sorted.slice(0, playersPerGroup));
    paused.push(...sorted.slice(playersPerGroup));
  }

  return [competing, paused];
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
  debug = false,
): [Type, Type][] => {
  const ranks = perfToRanks(entities.map(entity => perf(entity)));
  if (debug) {
    console.log("\n=== MATCH DEBUG ===");
    console.log("Ranks:", ranks);
  }
  let totalWeights: number[] = [];
  weights.forEach((weight, weightIdx) => {
    if (weight.factor !== 0) {
      let weights: number[] = [];
      for (let i = 0; i < entities.length - 1; i++) {
        for (let j = i + 1; j < entities.length; j++) {
          const a = entities[i];
          const b = entities[j];
          const w = weight.fn({ rank: ranks[i], entity: a }, { rank: ranks[j], entity: b });
          weights.push(w);
          if (debug) {
            console.log(`Weight ${weightIdx} for pair (${i},${j}) ranks (${ranks[i]},${ranks[j]}): ${w}`);
          }
        }
      }
      // normalize weights between 0 and 1 and apply factor
      const min = Math.min(...weights);
      weights = weights.map((w) => w - min);
      const max = Math.max(...weights);
      if (debug) {
        console.log(`  Raw weights: ${weights.map(w => (w + min).toFixed(2))}`);
        console.log(`  Min: ${min.toFixed(2)}, Max after shift: ${max.toFixed(2)}`);
        console.log(`  After normalization (factor=${weight.factor}):`, weights.map(w => ((weight.factor * w) / max).toFixed(2)));
      }
      if (max !== 0) {
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
  if (debug) {
    console.log("\nTotal weights:", totalWeights.map(w => w.toFixed(2)));
    console.log("Edges for maximum matching:");
    let pos = 0;
    for (let i = 0; i < entities.length - 1; i++) {
      for (let j = i + 1; j < entities.length; j++) {
        console.log(`  Edge (${i},${j}): weight ${((totalWeights[pos++] || 0) + MIN_EDGE_WEIGHT).toFixed(2)}`);
      }
    }
  }
  const edges = [];
  let pos = 0;
  for (let i = 0; i < entities.length - 1; i++) {
    for (let j = i + 1; j < entities.length; j++) {
      // Add MIN_EDGE_WEIGHT to total weight to ensure weight > 0 for maximum matching
      edges.push([i, j, (totalWeights[pos++] || 0) + MIN_EDGE_WEIGHT]);
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
      case TeamUpGroupMode.PAIRED:
        // Favor pairs: (0,1) and (2,3) i.e. (A,B) and (C,D)
        // Penalize wrong pairings like (1,2) i.e. (B,C)
        const groupDiff = Math.abs(a.entity.group - b.entity.group);
        const pairBlockA = Math.floor(a.entity.group / 2);
        const pairBlockB = Math.floor(b.entity.group / 2);
        const samePairBlock = pairBlockA === pairBlockB;
        const pairOffset = Math.abs((a.entity.group % 2) - (b.entity.group % 2));
        if (groupDiff === 1 && pairOffset === 1 && samePairBlock) {
          // Perfect pair: 0-1 or 2-3 (A&B or C&D) within same pair block
          return 0;
        } else if (groupDiff === 0) {
          // Same group: moderate penalty
          return -1;
        } else {
          // Wrong pairing (e.g., 1-2 / B&C) or distant groups: heavy penalty
          return -2;
        }
    }
  };
};

const teamUpVarietyWeight = (
  a: { entity: Player },
  b: { entity: Player },
): number => {
  const matchSum = a.entity.matchCount + b.entity.matchCount;
  if (matchSum === 0) {
    return 0;
  }

  // Partner penalty
  const roundsTeamedUp = a.entity.partners.get(b.entity.id) || [];
  const partnerPenalty = roundsTeamedUp.length === 0 ? 0 : (() => {
    const samePartnerSumA = Array.from(a.entity.partners.values())
      .reduce((acc, rounds) => (acc += rounds.length - 1), 1);
    const samePartnerSumB = Array.from(b.entity.partners.values())
      .reduce((acc, rounds) => (acc += rounds.length - 1), 1);
    return roundsTeamedUp.length * // the number of times the players teamed up already
      (
        roundsTeamedUp[roundsTeamedUp.length - 1]! + 1 + // the last round (index) the players teamed up
        samePartnerSumA + samePartnerSumB // the number of times both players were teamed up with the same partner in the past
      );
  })();

  // Opponent penalty (20% weight of partner penalty structure)
  const roundsOpposed = a.entity.opponents.get(b.entity.id) || [];
  const opponentPenalty = roundsOpposed.length === 0 ? 0 :
    roundsOpposed.length * // the number of times the players opposed each other
    (roundsOpposed.at(-1)! + 1) * // the last round (index) the players opposed each other
    0.20; // 20% weight compared to partner penalty

  return -(partnerPenalty + opponentPenalty) / matchSum; // normalize
};

const curriedTeamUpPerformanceWeight = (
  mode: TeamUpPerformanceMode,
  competitorCount: number,
) => {
  return (a: { rank: number }, b: { rank: number }) => {
    const rankDiff = Math.abs(b.rank - a.rank);
    switch (mode) {
      case TeamUpPerformanceMode.EQUAL:
        return -(rankDiff);
      case TeamUpPerformanceMode.AVERAGE:
        return -Math.abs(competitorCount - 1 - rankDiff);
      case TeamUpPerformanceMode.MEXICANO:
        return -Math.abs(rankDiff - MEXICANO_RANK_DIFF);
    }
  };
};

const curriedMatchUpGroupWeight = (mode: MatchUpGroupMode) => {
  return (a: { entity: Team }, b: { entity: Team }) => {
    const diff =
      a.entity[0].group +
      a.entity[1].group -
      b.entity[0].group -
      b.entity[1].group;
    switch (mode) {
      case MatchUpGroupMode.SAME:
        return -Math.abs(diff); // minimize difference (current behavior)
      case MatchUpGroupMode.CROSS:
        return Math.abs(diff); // maximize difference (cross-group matching)
    }
  };
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
  if (matchSum === 0) {
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
      if (a[i] !== b[i]) {
        return b[i] - a[i];
      }
    }
    return 0;
  });
  let arr_rank = new Map();
  let count = 0;
  for (let i = 0; i < cp.length; i++) {
    ++count;
    const key = cp[i].join("#");
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

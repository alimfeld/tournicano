import { Player } from "./Matching.ts";
import { MatchingSpec } from "./MatchingSpec.ts";
import { shuffle } from "../core/Util.ts";

// Constants for match structure
const PLAYERS_PER_MATCH = 4;
const PLAYERS_PER_TEAM = 2;
const PLAY_RATIO_SMOOTHING = 1; // Add to denominator to avoid division by zero and smooth play ratio

export interface PartitionResult {
  competing: Player[];
  paused: Player[];
  groupDistribution: Map<number, { total: number; competing: number; paused: number }>;
}

const playRatio = (p: Player) => {
  return p.matchCount / (p.pauseCount + p.matchCount + PLAY_RATIO_SMOOTHING);
};

const groupCounts = (players: Player[]) => {
  return players.reduce((acc: number[], player) => {
    acc[player.group] = (acc[player.group] || 0) + 1;
    return acc;
  }, []);
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

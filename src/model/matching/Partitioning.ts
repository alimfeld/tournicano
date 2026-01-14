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

const usesGroupFactors = (spec: MatchingSpec): boolean => {
  return spec.teamUp.groupFactor > 0 || spec.matchUp.groupFactor > 0;
};

const groupCounts = (players: Player[]) => {
  return players.reduce((acc: number[], player) => {
    acc[player.group] = (acc[player.group] || 0) + 1;
    return acc;
  }, []);
};

/**
 * Recursively searches for a valid group distribution that satisfies all constraints.
 * 
 * This function tries to find how many players from each group should be selected
 * such that:
 * - Each group contributes a multiple of `multipleOf` players (e.g., 0, 2, 4, 6...)
 * - The total across all groups equals `sum` (target competing count)
 * - No group exceeds its `max` available players
 * 
 * The recursive search explores different distribution combinations to find one that
 * satisfies all constraints. This is used in group-aware partitioning to ensure
 * proper group representation for matching algorithms.
 * 
 * @param constraints - The distribution constraints
 * @param proposal - Current proposal being tested (array indexed by group number)
 * @param next - Internal parameter for recursive iteration
 * @returns Valid distribution array, or null if impossible
 * 
 * Example:
 *   max: [7, 3], multipleOf: 2, sum: 8
 *   → [6, 2] ✓ (6 from group 0, 2 from group 1 = 8 total, both multiples of 2)
 *   → [8, 0] ✗ (exceeds max[0]=7)
 */
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

/**
 * Partitions players with group awareness for matching formats that use group factors
 * (e.g., AmericanoMixed, Tournicano) but don't require strict group balancing.
 * 
 * Key behaviors:
 * - Prioritizes individual fairness: players with lower playRatio compete first
 * - Ensures competing players are in valid group multiples (for proper match formation)
 * - Does NOT enforce equal representation per group (use balanceGroups for that)
 * - Paused players are selected WITHOUT group awareness (just by playRatio)
 * 
 * Algorithm:
 * 1. Sort all players by playRatio (group-agnostic)
 * 2. Split into three buckets based on playRatio at competingCount cutoff:
 *    - definitelyPlaying: playRatio < cutoff (will definitely compete)
 *    - maybePaused: playRatio == cutoff (need group-aware selection)
 *    - definitelyPaused: playRatio > cutoff (will definitely be paused)
 * 3. From maybePaused, select players to reach competingCount using group-aware logic:
 *    - First try multiples-of-4 per group (can improve match quality for unbalanced scenarios)
 *    - Fall back to multiples-of-2 per group if multiples-of-4 fails
 *    - Uses recursive search to find valid distribution
 * 4. Unselected players from maybePaused + definitelyPaused become paused
 * 
 * Note: The multiple-of-4 attempt before multiple-of-2 can significantly improve
 * partnership variety in unbalanced mixed scenarios (e.g., 7vs8 or 3vs4 groups).
 */
const partitionGroupAware = (
  players: Player[],
  maxMatches: number,
): [competing: Player[], paused: Player[]] => {
  let competingCount = maxMatches * PLAYERS_PER_MATCH;
  if (players.length < competingCount) {
    competingCount = players.length - (players.length % PLAYERS_PER_MATCH);
  }
  let sorted = players;
  if (players.length > competingCount) {
    // We need to pause some players - use group-aware selection
    sorted = players.toSorted((p, q) => playRatio(p) - playRatio(q));
    
    // Split players into three buckets based on their playRatio relative to cutoff:
    const definitelyPlaying = [];  // playRatio < cutoff: will definitely compete
    const maybePaused = [];         // playRatio == cutoff: need group-aware selection
    const definitelyPaused = [];    // playRatio > cutoff: will definitely be paused
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
      
      // Try to find a distribution with multiples-of-4 per group first.
      // This can lead to better group distributions and partnership variety,
      // especially in unbalanced mixed scenarios (e.g., 7vs8 or 3vs4 groups).
      let distribution = findGroupDistribution(
        {
          max: maxGroupCounts,
          multipleOf: PLAYERS_PER_MATCH, // Try multiples of 4 first
          sum: competingCount,
        },
        minGroupCounts,
      );
      
      // If multiples-of-4 fails, fall back to multiples-of-2.
      // This ensures we can still form valid teams (pairs).
      if (distribution === null) {
        distribution = findGroupDistribution(
          {
            max: maxGroupCounts,
            multipleOf: PLAYERS_PER_TEAM, // Fall back to multiples of 2
            sum: competingCount,
          },
          minGroupCounts,
        );
      }
      
      if (distribution !== null) {
        sorted = definitelyPlaying;
        const currentCounts = minGroupCounts.slice();
        const tail = [];
        
        // Select from maybePaused candidates to fill remaining spots:
        // - Shuffle first to break any patterns and introduce fairness
        // - Then sort by lastPause (descending) to avoid back-to-back pauses
        // - Select according to the distribution (respecting group multiples)
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
        // Final sorted order:
        // 1. definitelyPlaying (lowest playRatio, all compete)
        // 2. Selected from maybePaused (compete, respecting group multiples)
        // 3. Unselected from maybePaused (paused, group-agnostic)
        // 4. definitelyPaused (highest playRatio, all paused)
        sorted = sorted.concat(tail).concat(definitelyPaused);
      }
    }
  }
  return [sorted.slice(0, competingCount), sorted.slice(competingCount)];
};

const partitionSimple = (
  players: Player[],
  maxMatches: number,
): [competing: Player[], paused: Player[]] => {
  let competingCount = maxMatches * PLAYERS_PER_MATCH;
  if (players.length < competingCount) {
    competingCount = players.length - (players.length % PLAYERS_PER_MATCH);
  }
  
  if (competingCount === players.length) {
    // All players can compete
    return [players, []];
  }
  
  // We need to pause some players - use simple playRatio + lastPause logic
  // Shuffle first to introduce randomness for tiebreaking
  const shuffled = shuffle(players.slice());
  
  // Sort by playRatio (ascending - lower ratio plays first)
  // For equal playRatio, sort by lastPause (descending - MORE RECENT pause plays first)
  // This matches the existing behavior in partitionGroupAware and prevents back-to-back pauses
  const sorted = shuffled.toSorted((p, q) => {
    const ratioP = playRatio(p);
    const ratioQ = playRatio(q);
    if (ratioP !== ratioQ) {
      return ratioP - ratioQ; // Lower ratio first (played less)
    }
    return q.lastPause - p.lastPause; // Higher lastPause first (paused more recently)
  });
  
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
  // - Single group: no balancing needed, use simple partition logic
  // - 3 groups: not supported (would require 3 courts minimum and 12 players per match)
  // - 5+ groups: not supported (adds complexity without clear use case)
  if (numberOfGroups === 1) {
    // Single group - no balancing needed, use simple partition
    return partitionSimple(players, maxMatches);
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
    : !usesGroupFactors(spec)
      ? partitionSimple(players, effectiveMaxMatches)
      : partitionGroupAware(players, effectiveMaxMatches);

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

import { Player, Team, PlayerId } from "./Matching.ts";
import { MatchingSpec, TeamUpGroupMode, MatchUpGroupMode } from "./MatchingSpec.ts";
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
  return !!(spec.teamUp && spec.teamUp.groupFactor > 0 || spec.matchUp.groupFactor > 0);
};

const groupCounts = (players: Player[]) => {
  return players.reduce((acc: number[], player) => {
    acc[player.group] = (acc[player.group] || 0) + 1;
    return acc;
  }, []);
};

/**
 * Determines the required player-count multiple per group for balanced partitioning,
 * based on how many players from a single group end up in one match.
 *
 * | teamUp.groupMode | matchUp.groupMode | Players per group per match | Multiple |
 * |------------------|-------------------|-----------------------------|----------|
 * | SAME             | SAME              | 4 (all from one group)      | 4        |
 * | SAME             | CROSS             | 2 (cross-group match)       | 2        |
 * | PAIRED           | SAME              | 2 (each group in both teams)| 2        |
 * | PAIRED           | CROSS             | 1 (one per group per match) | 1        |
 *
 * SAME+SAME is the only mode where equal group sizes are NOT required — unequal
 * multiples-of-4 splits (e.g. 8+12 for 5 courts) are valid since every match is
 * entirely within one group.
 */
const computeMultipleRequired = (spec: MatchingSpec): number => {
  if (!spec.teamUp) return 1;
  const teamUpSame = spec.teamUp.groupMode === TeamUpGroupMode.SAME;
  const matchUpSame = spec.matchUp.groupMode === MatchUpGroupMode.SAME;
  if (teamUpSame && matchUpSame) return PLAYERS_PER_MATCH; // 4: whole match is one group
  if (teamUpSame || matchUpSame) return PLAYERS_PER_TEAM;  // 2: half a match per group
  return 1;                                                 // PAIRED+CROSS: 1 per group per match
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
      // Snap down to the nearest multiple of multipleOf. This is a no-op when
      // the initial proposal is all-zeros (as in the partitionBalanced/SAME+SAME
      // call), but is load-bearing when the initial proposal contains non-multiple
      // values (as in partitionGroupAware, which passes minGroupCounts — raw
      // player counts that may be odd). Without the snap, adding multipleOf to an
      // odd base (e.g. 3+2=5) would produce a non-multiple that fails the
      // satisfiesMultipleOf check and recurse again, reaching the correct value
      // one step later but via a different search path that changes which valid
      // solution is found first, degrading partnership-distribution quality.
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
 *    - Use multiples-of-2 per group to ensure proper team formation
 *    - Uses recursive search to find valid distribution
 * 4. Unselected players from maybePaused + definitelyPaused become paused
 *
 * Note: We only use multiples-of-2 (not multiples-of-4) because unbalanced distributions
 * like 4M+8F would force inter-group partnerships (e.g., F-F pairs) which violate the
 * PAIRED constraint in mixed formats. This ensures all partnerships follow group rules.
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

      // Use multiples-of-2 per group to ensure proper team formation.
      // We don't use multiples-of-4 because it can create unbalanced distributions
      // (e.g., 4M+8F) which force inter-group partnerships (e.g., F-F pairs) that
      // violate the PAIRED constraint in mixed formats.
      const distribution = findGroupDistribution(
        {
          max: maxGroupCounts,
          multipleOf: PLAYERS_PER_TEAM, // Use multiples of 2
          sum: competingCount,
        },
        minGroupCounts,
      );

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

/**
 * Selects `count` fairest players from a group, sorted by playRatio ascending
 * then lastPause descending. Returns [competing, paused].
 *
 * Note: unlike `partitionSimple`, no pre-shuffle is applied here. Within
 * `partitionBalanced` the group allocation is already fixed by
 * `findGroupDistribution`, so additional randomness at the intra-group level
 * would degrade partnership-distribution quality without fairness benefit.
 */
const selectFromGroup = (
  groupPlayers: Player[],
  count: number,
): [competing: Player[], paused: Player[]] => {
  const sorted = groupPlayers.toSorted((p, q) => {
    const ratioP = playRatio(p);
    const ratioQ = playRatio(q);
    if (ratioP !== ratioQ) {
      return ratioP - ratioQ; // Lower ratio first (played less)
    }
    return q.lastPause - p.lastPause; // More recent pause plays first
  });
  return [sorted.slice(0, count), sorted.slice(count)];
};

/**
 * Partitions players ensuring group constraints are satisfied for balanced group modes.
 *
 * The required player multiple per group depends on the matching spec:
 * - SAME+SAME: each match is entirely within one group → multiple of 4 per group
 *   Groups do NOT need to be equal: e.g., 5 courts with 2 groups → 8+12 is valid.
 *   The group with the lower average playRatio receives the larger allocation,
 *   which naturally alternates the split across rounds without extra state.
 * - SAME+CROSS: each match is one group vs another → multiple of 2 per group, equal groups
 * - PAIRED+SAME: each team has one player from each paired group → multiple of 2 per group, equal groups
 *   Note: 4-group PAIRED+SAME (pair-blocks {g0,g1} vs {g2,g3}) is a known limitation —
 *   pair-blocks would need multiples of 4 with unequal splits for odd courts, analogous
 *   to SAME+SAME. This case is out of scope and falls back to equal-groups logic.
 * - PAIRED+CROSS: one player per group per match → multiple of 1 per group, equal groups
 *
 * Algorithm for SAME+SAME (unequal groups):
 * 1. Compute max players per group (snapped to multiple of 4)
 * 2. Total competing = min(sum of maxes, maxMatches * 4), snapped to multiple of 4
 * 3. Sort groups by ascending average playRatio so low-ratio groups are expanded first
 *    in the recursive search, naturally giving the larger share to the group that has
 *    played less
 * 4. Use findGroupDistribution() to find a valid unequal split
 * 5. Select the fairest players within each group by playRatio / lastPause
 *
 * Algorithm for equal-group modes:
 * 1. Find the minimum max across all groups (snapped to required multiple)
 * 2. Cap by court constraint
 * 3. Select that many from each group by playRatio / lastPause
 */
const partitionBalanced = (
  players: Player[],
  spec: MatchingSpec,
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

  // Single group: no balancing needed
  if (numberOfGroups === 1) {
    return partitionSimple(players, maxMatches);
  }

  // Only 2 or 4 groups are supported with balancing
  if (numberOfGroups !== 2 && numberOfGroups !== 4) {
    return [[], players]; // Everyone paused
  }

  const multipleRequired = computeMultipleRequired(spec);
  const allowUnequalGroups = multipleRequired === PLAYERS_PER_MATCH;

  // Ordered list of group IDs for stable iteration
  const groupIds = Array.from(playersByGroup.keys());

  // Max players per group snapped down to the required multiple
  const maxPerGroup = new Map<number, number>();
  for (const [groupId, groupPlayers] of playersByGroup) {
    maxPerGroup.set(groupId, Math.floor(groupPlayers.length / multipleRequired) * multipleRequired);
  }

  if (allowUnequalGroups) {
    // SAME+SAME: unequal group sizes are valid since every match is self-contained
    // within one group. Distribute courts fairly by giving more to the group that has
    // played proportionally less (lower average playRatio).

    // Total competing players, capped by courts. Both totalMaxFromGroups (sum of
    // multiples of 4) and totalMaxFromCourts (maxMatches * 4) are already multiples
    // of 4, so no extra snap is needed.
    const totalMaxFromGroups = groupIds.reduce((s, id) => s + maxPerGroup.get(id)!, 0);
    const totalMaxFromCourts = maxMatches * PLAYERS_PER_MATCH;
    const totalCompeting = Math.min(totalMaxFromGroups, totalMaxFromCourts);

    if (totalCompeting <= 0) {
      return [[], players];
    }

    // Sort groups by ASCENDING average playRatio so the recursive search tries
    // low-ratio groups first. Since findGroupDistribution increments groups in
    // round-robin order starting from the first entry, the first group fills up
    // to its max first, naturally giving the larger share to the group that has
    // played less.
    const avgPlayRatio = (groupId: number) => {
      const groupPlayers = playersByGroup.get(groupId)!;
      return groupPlayers.reduce((s, p) => s + playRatio(p), 0) / groupPlayers.length;
    };
    const sortedGroupIds = groupIds.toSorted((a, b) => avgPlayRatio(a) - avgPlayRatio(b));

    // Build flat arrays indexed by sorted position for findGroupDistribution
    const maxArray = sortedGroupIds.map(id => maxPerGroup.get(id)!);

    const distribution = findGroupDistribution(
      { max: maxArray, multipleOf: PLAYERS_PER_MATCH, sum: totalCompeting },
      [],
    );

    if (distribution === null) {
      return [[], players];
    }

    // Select players within each group according to the distribution
    const competing: Player[] = [];
    const paused: Player[] = [];
    for (let i = 0; i < sortedGroupIds.length; i++) {
      const groupId = sortedGroupIds[i];
      const count = distribution[i] ?? 0;
      const [c, p] = selectFromGroup(playersByGroup.get(groupId)!, count);
      competing.push(...c);
      paused.push(...p);
    }
    return [competing, paused];

  } else {
    // Equal-group modes (SAME+CROSS, PAIRED+SAME, PAIRED+CROSS):
    // every match requires the same number of players from each group,
    // so all groups must contribute exactly the same amount.

    // Find the minimum max across all groups (bottlenecked by the smallest group)
    let playersPerGroup = Infinity;
    for (const max of maxPerGroup.values()) {
      playersPerGroup = Math.min(playersPerGroup, max);
    }

    // Apply maxMatches constraint (divide courts equally among groups)
    const maxFromCourts =
      Math.floor(maxMatches * PLAYERS_PER_MATCH / numberOfGroups / multipleRequired) * multipleRequired;
    playersPerGroup = Math.min(playersPerGroup, maxFromCourts);

    if (!isFinite(playersPerGroup) || playersPerGroup <= 0) {
      return [[], players];
    }

    const competing: Player[] = [];
    const paused: Player[] = [];
    for (const [_groupId, groupPlayers] of playersByGroup) {
      const [c, p] = selectFromGroup(groupPlayers, playersPerGroup);
      competing.push(...c);
      paused.push(...p);
    }
    return [competing, paused];
  }
};

/**
 * Calculate team play ratio from the average of both players.
 * Uses the same smoothing factor as individual players to avoid division by zero.
 */
const teamPlayRatio = (p1: Player, p2: Player): number => {
  const ratio1 = p1.matchCount / (p1.pauseCount + p1.matchCount + PLAY_RATIO_SMOOTHING);
  const ratio2 = p2.matchCount / (p2.pauseCount + p2.matchCount + PLAY_RATIO_SMOOTHING);
  return (ratio1 + ratio2) / 2;
};

/**
 * Get team's most recent pause (max of both players).
 * Higher value = more recent pause = should play first.
 */
const teamLastPause = (p1: Player, p2: Player): number => {
  return Math.max(p1.lastPause, p2.lastPause);
};

/**
 * Partitions fixed teams using player-level participation stats.
 * In fixed teams mode (TeamAmericano, TeamMexicano), the same pairs stay together
 * throughout the tournament, so we use individual player stats to determine fairness.
 *
 * Algorithm:
 * 1. Build player lookup map
 * 2. Filter teams where both players are active
 * 3. Sort by teamPlayRatio (ascending), then teamLastPause (descending)
 * 4. Round down to even number of teams, respect maxMatches constraint
 * 5. Return competing teams + paused players (including solo orphaned players)
 *
 * @param teams - Fixed team pairings (player1Id, player2Id)
 * @param players - All active players
 * @param spec - Matching specification (unused, for consistency with partitionPlayers)
 * @param maxMatches - Maximum number of matches (optional)
 * @returns Competing teams and paused players
 */
export const partitionFixedTeams = (
  teams: Array<{ player1Id: PlayerId; player2Id: PlayerId }>,
  players: Player[],
  _spec: MatchingSpec,
  maxMatches?: number,
): { competing: Team[]; paused: Player[] } => {
  // Build player lookup map
  const playerMap = new Map<PlayerId, Player>();
  for (const player of players) {
    playerMap.set(player.id, player);
  }

  // Filter teams where both players are active and build Team tuples
  const validTeams: Array<{ team: Team; ratio: number; lastPause: number }> = [];
  for (const { player1Id, player2Id } of teams) {
    const p1 = playerMap.get(player1Id);
    const p2 = playerMap.get(player2Id);

    if (p1 && p2) {
      validTeams.push({
        team: [p1, p2],
        ratio: teamPlayRatio(p1, p2),
        lastPause: teamLastPause(p1, p2),
      });
      // Remove from map so we can track paused players
      playerMap.delete(player1Id);
      playerMap.delete(player2Id);
    }
  }

  // Sort teams by playRatio (ascending), then by lastPause (descending)
  validTeams.sort((a, b) => {
    if (a.ratio !== b.ratio) {
      return a.ratio - b.ratio; // Lower ratio plays first (less play time)
    }
    return b.lastPause - a.lastPause; // Higher lastPause plays first (more recent pause)
  });

  // Determine how many teams can compete
  const effectiveMaxMatches = maxMatches ?? Math.floor(validTeams.length / 2);
  let competingTeamCount = Math.min(validTeams.length, effectiveMaxMatches * 2);

  // Round down to even number of teams (need pairs for matches)
  competingTeamCount = competingTeamCount - (competingTeamCount % 2);

  // Split into competing and paused teams
  const competing = validTeams.slice(0, competingTeamCount).map((t) => t.team);
  const pausedTeams = validTeams.slice(competingTeamCount).map((t) => t.team);

  // Collect paused players: from paused teams + solo orphaned players
  const paused: Player[] = [];
  for (const [p1, p2] of pausedTeams) {
    paused.push(p1, p2);
  }

  // Add solo orphaned players (not in any team) to paused list
  for (const player of playerMap.values()) {
    paused.push(player);
  }

  return { competing, paused };
};

export const partitionPlayers = (
  players: Player[],
  spec: MatchingSpec,
  maxMatches?: number,
): PartitionResult => {
  const effectiveMaxMatches = maxMatches ? maxMatches : Math.floor(players.length / 4);

  const [competing, paused] = spec.balanceGroups
    ? partitionBalanced(players, spec, effectiveMaxMatches)
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

import {
  iter,
  weight as maximumMatching,
  // @ts-ignore
} from "@graph-algorithm/maximum-matching";

// Constants
const MIN_EDGE_WEIGHT = 1; // Minimum weight for maximum matching algorithm

/**
 * Generic maximum weighted matching algorithm wrapper.
 * 
 * Takes a set of entities and weight functions, computes pairwise weights,
 * normalizes them, and finds the maximum weighted matching.
 * 
 * @param entities - Array of entities to match (players or teams)
 * @param perf - Function to extract performance metrics for ranking
 * @param weights - Array of weight functions with their factors
 * @returns Array of matched pairs
 */
export const match = <Type>(
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
    if (weight.factor !== 0) {
      let weights: number[] = [];
      for (let i = 0; i < entities.length - 1; i++) {
        for (let j = i + 1; j < entities.length; j++) {
          const a = entities[i];
          const b = entities[j];
          const w = weight.fn({ rank: ranks[i], entity: a }, { rank: ranks[j], entity: b });
          weights.push(w);
        }
      }
      // normalize weights between 0 and 1 and apply factor
      const min = Math.min(...weights);
      weights = weights.map((w) => w - min);
      const max = Math.max(...weights);
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

/**
 * Convert array of performance values (primary & tie-breakers) to array of ranks.
 * 
 * Inspired by: https://medium.com/@cyberseize/leetcode-1331-rank-transform-of-an-array-a-deep-dive-60444bb0e091
 * 
 * @param arr - Array of performance metric arrays
 * @returns Array of ranks (1 = best)
 */
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

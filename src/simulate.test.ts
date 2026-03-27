/**
 * Tournicano Matching Simulation
 *
 * Compares multiple MatchingSpec candidates for the new Tournicano mode.
 *
 * New Tournicano concept:
 *   - Partners rotate freely (variety-focused teamUp, performanceFactor = 0)
 *   - Match-up stage pairs teams to create equally-skilled matches (performanceFactor > 0)
 *
 * Metrics:
 *   - Match competitiveness: avg absolute difference in combined skill between the two teams
 *   - Partner variety: avg unique partner rate + max repeat count
 *   - Standings accuracy: Spearman rank correlation between skill order and final standings
 *   - Rank convergence: how many rounds until standings reach target correlation
 *
 * Usage: npm run simulate
 */

import { test } from "vitest";
import { tournamentFactory } from "./model/tournament/Tournament.impl.ts";
import {
  MatchingSpec,
  TeamUpPerformanceMode,
  TeamUpGroupMode,
  MatchUpGroupMode,
  Americano,
  Mexicano,
} from "./model/matching/MatchingSpec.ts";
import { Tournament, ParticipatingPlayer, Score } from "./model/tournament/Tournament.ts";

// ============================================================================
// Simulation configuration
// ============================================================================

interface Scenario {
  playerCount: number;
  courts: number;
  rounds: number;
  runsPerSpec: number;
}

const scenarios: Scenario[] = [
  { playerCount:  8, courts: 2, rounds:  7, runsPerSpec: 50 },
  { playerCount: 12, courts: 3, rounds: 11, runsPerSpec: 40 },
  { playerCount: 16, courts: 4, rounds: 15, runsPerSpec: 30 },
  { playerCount: 20, courts: 5, rounds: 19, runsPerSpec: 30 },
];

const CONVERGENCE_TARGET = 0.8; // Spearman correlation threshold for "converged"

// ============================================================================
// Candidate MatchingSpec configurations to compare
// ============================================================================

const candidateSpecs: Array<{ name: string; spec: MatchingSpec }> = [
  {
    name: "Americano",
    spec: Americano,
  },
  {
    name: "Mexicano",
    spec: Mexicano,
  },
  {
    name: "Tournicano (teamPerf=0)",
    spec: {
      teamUp: {
        varietyFactor: 100,
        performanceFactor: 0,
        performanceMode: TeamUpPerformanceMode.EQUAL, // irrelevant at factor=0
        groupFactor: 0,
        groupMode: TeamUpGroupMode.PAIRED,
      },
      matchUp: {
        varietyFactor: 0,
        performanceFactor: 100,
        groupFactor: 0,
        groupMode: MatchUpGroupMode.SAME,
      },
    },
  },
  {
    name: "Tournicano (teamPerf=50/EQUAL)",
    spec: {
      teamUp: {
        varietyFactor: 100,
        performanceFactor: 50,
        performanceMode: TeamUpPerformanceMode.EQUAL,
        groupFactor: 0,
        groupMode: TeamUpGroupMode.PAIRED,
      },
      matchUp: {
        varietyFactor: 0,
        performanceFactor: 100,
        groupFactor: 0,
        groupMode: MatchUpGroupMode.SAME,
      },
    },
  },
  {
    name: "Tournicano (teamPerf=50/AVERAGE)",
    spec: {
      teamUp: {
        varietyFactor: 100,
        performanceFactor: 50,
        performanceMode: TeamUpPerformanceMode.AVERAGE,
        groupFactor: 0,
        groupMode: TeamUpGroupMode.PAIRED,
      },
      matchUp: {
        varietyFactor: 0,
        performanceFactor: 100,
        groupFactor: 0,
        groupMode: MatchUpGroupMode.SAME,
      },
    },
  },
  {
    name: "Tournicano (teamPerf=50/MEXICANO)",
    spec: {
      teamUp: {
        varietyFactor: 100,
        performanceFactor: 50,
        performanceMode: TeamUpPerformanceMode.MEXICANO,
        groupFactor: 0,
        groupMode: TeamUpGroupMode.PAIRED,
      },
      matchUp: {
        varietyFactor: 0,
        performanceFactor: 100,
        groupFactor: 0,
        groupMode: MatchUpGroupMode.SAME,
      },
    },
  },
  {
    name: "Tournicano (teamPerf=100/EQUAL)",
    spec: {
      teamUp: {
        varietyFactor: 100,
        performanceFactor: 100,
        performanceMode: TeamUpPerformanceMode.EQUAL,
        groupFactor: 0,
        groupMode: TeamUpGroupMode.PAIRED,
      },
      matchUp: {
        varietyFactor: 0,
        performanceFactor: 100,
        groupFactor: 0,
        groupMode: MatchUpGroupMode.SAME,
      },
    },
  },
  {
    name: "Tournicano (teamPerf=100/AVERAGE)",
    spec: {
      teamUp: {
        varietyFactor: 100,
        performanceFactor: 100,
        performanceMode: TeamUpPerformanceMode.AVERAGE,
        groupFactor: 0,
        groupMode: TeamUpGroupMode.PAIRED,
      },
      matchUp: {
        varietyFactor: 0,
        performanceFactor: 100,
        groupFactor: 0,
        groupMode: MatchUpGroupMode.SAME,
      },
    },
  },
  {
    name: "Tournicano (teamPerf=100/MEXICANO)",
    spec: {
      teamUp: {
        varietyFactor: 100,
        performanceFactor: 100,
        performanceMode: TeamUpPerformanceMode.MEXICANO,
        groupFactor: 0,
        groupMode: TeamUpGroupMode.PAIRED,
      },
      matchUp: {
        varietyFactor: 0,
        performanceFactor: 100,
        groupFactor: 0,
        groupMode: MatchUpGroupMode.SAME,
      },
    },
  },
];

// ============================================================================
// Skill model and score generation
// ============================================================================

/**
 * Assign skill levels 1..N to players in the tournament.
 * Player index 0 = weakest (skill 1), player index N-1 = strongest (skill N).
 * Returns a map: playerId -> skill (1..N)
 */
function assignSkills(tournament: Tournament): Map<string, number> {
  const players = tournament.players();
  const skills = new Map<string, number>();
  players.forEach((player, i) => {
    skills.set(player.id, i + 1); // skill 1..N
  });
  return skills;
}

/**
 * Generate a deterministic score based on combined skill difference.
 * Winner gets 11 points. Loser gets max(0, 11 - diff).
 * teamA wins if its combined skill >= teamB combined skill.
 * Returns [teamA score, teamB score].
 */
function generateScore(
  teamASkill: number,
  teamBSkill: number,
): Score {
  const diff = teamASkill - teamBSkill;
  if (diff >= 0) {
    // Team A wins or draws
    const loserScore = Math.max(0, 11 - diff);
    return [11, loserScore];
  } else {
    // Team B wins
    const loserScore = Math.max(0, 11 + diff); // diff is negative
    return [loserScore, 11];
  }
}

// ============================================================================
// Metric computation
// ============================================================================

/**
 * Spearman rank correlation between skill ranking and tournament standings.
 *
 * skillOrderDesc: player IDs sorted strongest-first (index 0 = best player)
 * standingOrderDesc: player IDs sorted by tournament standing, best-first (index 0 = rank 1)
 *
 * Both arrays use the same ordering convention: index 0 = rank 1 (best).
 * Returns value in [-1, 1]. 1 = perfect correlation.
 */
function spearmanCorrelation(skillOrderDesc: string[], standingOrderDesc: string[]): number {
  const n = skillOrderDesc.length;
  if (n < 2) return 1;

  // Build skill rank map: index 0 = rank 1 (best), index N-1 = rank N (worst)
  const skillRankMap = new Map<string, number>();
  skillOrderDesc.forEach((playerId, i) => {
    skillRankMap.set(playerId, i + 1);
  });

  let dSquaredSum = 0;
  standingOrderDesc.forEach((playerId, i) => {
    const skillRank = skillRankMap.get(playerId) ?? 0;
    const standingRank = i + 1;
    const d = skillRank - standingRank;
    dSquaredSum += d * d;
  });

  return 1 - (6 * dSquaredSum) / (n * (n * n - 1));
}

/**
 * Analyze partner variety: unique partner rate and max repeat count
 */
function analyzePartnerVariety(players: ParticipatingPlayer[]): {
  uniqueRate: number;
  maxRepeats: number;
} {
  const partnerCounts = new Map<string, number>();
  players.forEach((p) => {
    p.partners.forEach((rounds, partnerId) => {
      const pairKey = [p.id, partnerId].sort().join("-");
      partnerCounts.set(pairKey, rounds.length);
    });
  });

  const counts = Array.from(partnerCounts.values());
  if (counts.length === 0) return { uniqueRate: 1, maxRepeats: 0 };

  const uniqueCount = counts.filter((c) => c === 1).length;
  const uniqueRate = uniqueCount / counts.length;
  const maxRepeats = Math.max(...counts);
  return { uniqueRate, maxRepeats };
}

/**
 * Analyze match competitiveness:
 * For each match, compute absolute difference in combined plusMinus between teams.
 * Returns average across all matches and rounds.
 *
 * We track this per-round by looking at the round's matches directly.
 * Since scores are submitted deterministically, we can compute on the fly.
 */
function analyzeMatchCompetitiveness(
  rounds: Array<Array<{ teamACombinedSkill: number; teamBCombinedSkill: number }>>,
): {
  avgSkillDiff: number;
  pctBalancedMatches: number; // % of matches where skill diff <= 2
} {
  let totalDiff = 0;
  let balancedCount = 0;
  let totalMatches = 0;

  for (const round of rounds) {
    for (const match of round) {
      const diff = Math.abs(match.teamACombinedSkill - match.teamBCombinedSkill);
      totalDiff += diff;
      if (diff <= 2) balancedCount++;
      totalMatches++;
    }
  }

  return {
    avgSkillDiff: totalMatches > 0 ? totalDiff / totalMatches : 0,
    pctBalancedMatches: totalMatches > 0 ? balancedCount / totalMatches : 0,
  };
}

// ============================================================================
// Simulation runner
// ============================================================================

interface RunResult {
  // Partner variety (from final round)
  uniquePartnerRate: number;
  maxRepeats: number;
  // Match competitiveness (across all rounds)
  avgSkillDiff: number;
  pctBalancedMatches: number;
  // Standings accuracy (final round)
  spearmanCorrelation: number;
  // Rank convergence (first round where correlation >= CONVERGENCE_TARGET)
  convergenceRound: number | null;
  // Per-round correlations for convergence tracking
  roundCorrelations: number[];
}

function runSingleSimulation(spec: MatchingSpec, scenario: Scenario): RunResult {
  const { playerCount, courts, rounds } = scenario;
  const tournament = tournamentFactory.create();
  const names = Array.from({ length: playerCount }, (_, i) => `P${String(i + 1).padStart(2, "0")}`);
  tournament.addPlayers(names);

  const skills = assignSkills(tournament);

  // Build sorted skill order (weakest first = skill rank 1..N ascending by skill)
  const players = tournament.players();
  const skillOrder = players
    .map((p) => ({ id: p.id, skill: skills.get(p.id)! }))
    .sort((a, b) => a.skill - b.skill)
    .map((p) => p.id);
  // skillOrder[0] = weakest player id, skillOrder[N-1] = strongest

  // Track match competitiveness across rounds
  const allRoundMatchData: Array<Array<{ teamACombinedSkill: number; teamBCombinedSkill: number }>> = [];
  const roundCorrelations: number[] = [];
  let convergenceRound: number | null = null;

  for (let roundIdx = 0; roundIdx < rounds; roundIdx++) {
    const round = tournament.createRound(spec, courts);

    // Record match competitiveness (before scores submitted)
    const matchData = round.matches.map((match) => {
      const teamASkill = skills.get(match.teamA.player1.id)! + skills.get(match.teamA.player2.id)!;
      const teamBSkill = skills.get(match.teamB.player1.id)! + skills.get(match.teamB.player2.id)!;
      return { teamACombinedSkill: teamASkill, teamBCombinedSkill: teamBSkill };
    });
    allRoundMatchData.push(matchData);

    // Submit deterministic scores
    round.matches.forEach((match) => {
      const teamASkill = skills.get(match.teamA.player1.id)! + skills.get(match.teamA.player2.id)!;
      const teamBSkill = skills.get(match.teamB.player1.id)! + skills.get(match.teamB.player2.id)!;
      const score = generateScore(teamASkill, teamBSkill);
      match.submitScore(score);
    });

    // Compute standings correlation after this round
    const standings = round.standings();
    // standings[0] = best player (rank 1), standings[N-1] = worst
    // skillOrder[0] = weakest, skillOrder[N-1] = strongest
    // We want correlation between skill rank and standing rank:
    // Reverse skillOrder so strongest player = skill rank 1 (matching standings where rank 1 = best)
    const skillOrderDescending = [...skillOrder].reverse(); // strongest first

    const standingPlayerIds = standings.map((r) => r.player.id);
    const corr = spearmanCorrelation(skillOrderDescending, standingPlayerIds);
    roundCorrelations.push(corr);

    if (convergenceRound === null && corr >= CONVERGENCE_TARGET) {
      convergenceRound = roundIdx + 1; // 1-indexed
    }
  }

  // Final round player stats
  const lastRound = tournament.rounds[tournament.rounds.length - 1];
  const participatingPlayers = lastRound.getParticipatingPlayers();
  const partnerVariety = analyzePartnerVariety(participatingPlayers);
  const competitiveness = analyzeMatchCompetitiveness(allRoundMatchData);
  const finalCorrelation = roundCorrelations[roundCorrelations.length - 1] ?? 0;

  return {
    uniquePartnerRate: partnerVariety.uniqueRate,
    maxRepeats: partnerVariety.maxRepeats,
    avgSkillDiff: competitiveness.avgSkillDiff,
    pctBalancedMatches: competitiveness.pctBalancedMatches,
    spearmanCorrelation: finalCorrelation,
    convergenceRound,
    roundCorrelations,
  };
}

// ============================================================================
// Aggregation
// ============================================================================

interface AggregatedResult {
  specName: string;
  avgUniquePartnerRate: number;
  avgMaxRepeats: number;
  avgSkillDiff: number;
  avgPctBalancedMatches: number;
  avgSpearmanCorrelation: number;
  avgConvergenceRound: number | null; // null = never converged
  convergenceRate: number; // fraction of runs that converged
  avgRoundCorrelations: number[]; // mean correlation per round
}

function aggregateResults(specName: string, results: RunResult[]): AggregatedResult {
  const n = results.length;

  const avg = (arr: number[]) => arr.reduce((s, v) => s + v, 0) / arr.length;

  const convergingRuns = results.filter((r) => r.convergenceRound !== null);
  const avgConvergenceRound =
    convergingRuns.length > 0
      ? avg(convergingRuns.map((r) => r.convergenceRound!))
      : null;

  // Per-round average correlations
  const roundCount = results[0]?.roundCorrelations.length ?? 0;
  const avgRoundCorrelations: number[] = [];
  for (let r = 0; r < roundCount; r++) {
    avgRoundCorrelations.push(avg(results.map((res) => res.roundCorrelations[r] ?? 0)));
  }

  return {
    specName,
    avgUniquePartnerRate: avg(results.map((r) => r.uniquePartnerRate)),
    avgMaxRepeats: avg(results.map((r) => r.maxRepeats)),
    avgSkillDiff: avg(results.map((r) => r.avgSkillDiff)),
    avgPctBalancedMatches: avg(results.map((r) => r.pctBalancedMatches)),
    avgSpearmanCorrelation: avg(results.map((r) => r.spearmanCorrelation)),
    avgConvergenceRound,
    convergenceRate: convergingRuns.length / n,
    avgRoundCorrelations,
  };
}

// ============================================================================
// Output formatting
// ============================================================================

function printSeparator(width: number) {
  console.log("─".repeat(width));
}

function pad(str: string, width: number, align: "left" | "right" = "left"): string {
  if (align === "right") return str.padStart(width);
  return str.padEnd(width);
}

function printResultsTable(results: AggregatedResult[], scenario: Scenario) {
  const { playerCount, courts, rounds, runsPerSpec } = scenario;
  const COL_NAME = 42;
  const COL_NUM = 10;
  const TOTAL = COL_NAME + COL_NUM * 6 + 1;

  const header = [
    pad("Spec", COL_NAME),
    pad("UniquePartner%", COL_NUM, "right"),
    pad("MaxRepeats", COL_NUM, "right"),
    pad("AvgSkillDiff", COL_NUM, "right"),
    pad("Balanced%", COL_NUM, "right"),
    pad("Spearman", COL_NUM, "right"),
    pad("Converge@", COL_NUM, "right"),
  ].join(" ");

  console.log("\n");
  console.log("=".repeat(TOTAL));
  console.log(" TOURNICANO MATCHING SIMULATION RESULTS");
  console.log(`  ${playerCount} players, ${courts} courts, ${rounds} rounds, ${runsPerSpec} runs per spec`);
  console.log(`  Convergence target: Spearman >= ${CONVERGENCE_TARGET}`);
  console.log("=".repeat(TOTAL));
  console.log(header);
  printSeparator(TOTAL);

  for (const r of results) {
    const convergenceStr =
      r.avgConvergenceRound !== null
        ? `R${r.avgConvergenceRound.toFixed(1)} (${(r.convergenceRate * 100).toFixed(0)}%)`
        : `never (${(r.convergenceRate * 100).toFixed(0)}%)`;

    const row = [
      pad(r.specName, COL_NAME),
      pad((r.avgUniquePartnerRate * 100).toFixed(1) + "%", COL_NUM, "right"),
      pad(r.avgMaxRepeats.toFixed(1), COL_NUM, "right"),
      pad(r.avgSkillDiff.toFixed(2), COL_NUM, "right"),
      pad((r.avgPctBalancedMatches * 100).toFixed(1) + "%", COL_NUM, "right"),
      pad(r.avgSpearmanCorrelation.toFixed(3), COL_NUM, "right"),
      pad(convergenceStr, COL_NUM, "right"),
    ].join(" ");
    console.log(row);
  }

  printSeparator(TOTAL);
}

function printCorrelationCurves(results: AggregatedResult[]) {
  console.log("\n RANK CORRELATION OVER ROUNDS (Spearman, averaged across runs)");
  console.log(" Format: Round | " + results.map((r) => r.specName.substring(0, 12).padEnd(12)).join(" | "));
  printSeparator(20 + results.length * 15);

  const rounds = results[0]?.avgRoundCorrelations.length ?? 0;
  // Print every round for first 10, then every 3
  const printRounds = Array.from({ length: rounds }, (_, i) => i).filter(
    (i) => i < 10 || (i + 1) % 3 === 0
  );

  for (const roundIdx of printRounds) {
    const cols = results.map((r) => {
      const val = r.avgRoundCorrelations[roundIdx] ?? 0;
      return val.toFixed(3).padStart(12);
    });
    console.log(`  Round ${String(roundIdx + 1).padStart(2)} | ${cols.join(" | ")}`);
  }
}

function printMetricExplanations() {
  console.log("\n METRIC EXPLANATIONS");
  console.log("  UniquePartner%  : % of all partnerships that occurred exactly once (higher = more variety)");
  console.log("  MaxRepeats      : avg maximum times any two players were partners (lower = better variety)");
  console.log("  AvgSkillDiff    : avg absolute difference in combined team skill per match (lower = more competitive)");
  console.log("  Balanced%       : % of matches with skill diff <= 2 (higher = more balanced)");
  console.log("  Spearman        : Spearman rank correlation of final standings vs true skill (higher = more accurate)");
  console.log("  Converge@       : avg round when Spearman >= " + CONVERGENCE_TARGET + ", % of runs that converged");
}

// ============================================================================
// Vitest entry point (long timeout to allow all runs to complete)
// ============================================================================

test("Tournicano matching simulation", async () => {
  for (const scenario of scenarios) {
    const { playerCount, courts, rounds, runsPerSpec } = scenario;
    console.log(`\nScenario: ${playerCount} players, ${courts} courts, ${rounds} rounds — ${runsPerSpec} runs × ${candidateSpecs.length} specs...`);

    const allResults: AggregatedResult[] = [];

    for (const { name, spec } of candidateSpecs) {
      const runResults: RunResult[] = [];
      for (let run = 0; run < runsPerSpec; run++) {
        runResults.push(runSingleSimulation(spec, scenario));
      }
      const aggregated = aggregateResults(name, runResults);
      allResults.push(aggregated);
      console.log(`  ${name.padEnd(46)}... done`);
    }

    printResultsTable(allResults, scenario);
    printCorrelationCurves(allResults);
  }

  printMetricExplanations();
  console.log("\n");
}, 300_000); // 5 minute timeout

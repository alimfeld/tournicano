/**
 * One-Stage Tournament Simulation
 *
 * Simulates a single-stage tournament with 30 players on 5 courts comparing
 * the three main specs over 18 rounds:
 *
 *   Americano | Mexicano | Tournicano
 *
 * Scores include random noise so that results vary across runs; each spec is
 * run RUNS times and all metrics are reported as mean ± stddev.
 *
 * The 18-round setup covers the same total match count as the two-stage
 * simulation (9 + 9), making the final Spearman values directly comparable.
 * The mid-point (round 9) Spearman is also shown for comparison with the
 * two-stage Stage-1 final Spearman.
 *
 * A compact summary table is printed at the end comparing all three specs.
 *
 * Usage:
 *   npm run simulate                (run all simulations)
 *   npm run simulate -- one-stage   (run this file only)
 */

import { test } from "vitest";
import { tournamentFactory } from "../model/tournament/Tournament.impl.ts";
import {
  Americano,
  Mexicano,
  Tournicano,
  MatchingSpec,
} from "../model/matching/MatchingSpec.ts";
import {
  assignSkills,
  generateScore,
  spearmanCorrelation,
  analyzePartnerVariety,
  analyzeOpponentVariety,
  analyzeMatchCompetitiveness,
  printSeparator,
  pad,
} from "./simulate-utils.ts";

// ============================================================================
// Configuration
// ============================================================================

const PLAYER_COUNT = 30;
const COURTS       = 5;
const ROUNDS       = 18;
const RUNS         = 10;
const SCORE_NOISE  = 3; // ±N random noise added to each raw score
const MID_ROUND    = 9; // round index (1-based) to show as mid-point Spearman
const WIDTH        = 80;

// ============================================================================
// Spec definitions
// ============================================================================

interface SpecEntry {
  name: string;
  spec: MatchingSpec;
}

const specs: SpecEntry[] = [
  { name: "Americano",  spec: Americano  },
  { name: "Mexicano",   spec: Mexicano   },
  { name: "Tournicano", spec: Tournicano },
];

// ============================================================================
// Result types
// ============================================================================

interface RunResult {
  competitiveness: { avgSkillDiff: number; pctBalancedMatches: number };
  variety: { uniqueRate: number; maxRepeats: number };
  opponentVariety: { uniqueRate: number; maxRepeats: number };
  correlationsPerRound: number[]; // length = ROUNDS
}

interface MeanStd { mean: number; std: number }

interface AveragedSpecResult {
  specName: string;
  competitiveness: { avgSkillDiff: MeanStd; pctBalancedMatches: MeanStd };
  variety: { uniqueRate: MeanStd; maxRepeats: MeanStd };
  opponentVariety: { uniqueRate: MeanStd; maxRepeats: MeanStd };
  correlationsPerRound: MeanStd[]; // length = ROUNDS
}

// ============================================================================
// Statistics helpers
// ============================================================================

function meanStd(values: number[]): MeanStd {
  const n = values.length;
  if (n === 0) return { mean: 0, std: 0 };
  const mean = values.reduce((s, v) => s + v, 0) / n;
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / n;
  return { mean, std: Math.sqrt(variance) };
}

function fmt(ms: MeanStd, decimals = 3): string {
  return `${ms.mean.toFixed(decimals)} ±${ms.std.toFixed(decimals)}`;
}

function fmtPct(ms: MeanStd, decimals = 1): string {
  return `${(ms.mean * 100).toFixed(decimals)}% ±${(ms.std * 100).toFixed(decimals)}`;
}

// ============================================================================
// Single-run simulation
// ============================================================================

function runOnce(spec: MatchingSpec): RunResult {
  const tournament = tournamentFactory.create();
  const names = Array.from(
    { length: PLAYER_COUNT },
    (_, i) => `P${String(i + 1).padStart(2, "0")}`,
  );
  tournament.addPlayers(names);

  const skills = assignSkills(tournament);

  // skillOrderDesc[0] = strongest, [N-1] = weakest
  const players = tournament.players();
  const skillOrderDesc = [...players]
    .map((p) => ({ id: p.id, skill: skills.get(p.id)! }))
    .sort((a, b) => b.skill - a.skill)
    .map((p) => p.id);

  const matchData: Array<Array<{ teamACombinedSkill: number; teamBCombinedSkill: number }>> = [];
  const correlationsPerRound: number[] = [];

  for (let r = 0; r < ROUNDS; r++) {
    const round = tournament.createRound(spec, COURTS);

    matchData.push(round.matches.map((m) => ({
      teamACombinedSkill: skills.get(m.teamA.player1.id)! + skills.get(m.teamA.player2.id)!,
      teamBCombinedSkill: skills.get(m.teamB.player1.id)! + skills.get(m.teamB.player2.id)!,
    })));

    round.matches.forEach((m) => {
      const a = skills.get(m.teamA.player1.id)! + skills.get(m.teamA.player2.id)!;
      const b = skills.get(m.teamB.player1.id)! + skills.get(m.teamB.player2.id)!;
      m.submitScore(generateScore(a, b, SCORE_NOISE));
    });

    correlationsPerRound.push(
      spearmanCorrelation(skillOrderDesc, round.standings().map((s) => s.player.id)),
    );
  }

  const lastRound = tournament.rounds[tournament.rounds.length - 1];
  const participatingPlayers = lastRound.getParticipatingPlayers();

  return {
    competitiveness: analyzeMatchCompetitiveness(matchData),
    variety: analyzePartnerVariety(participatingPlayers),
    opponentVariety: analyzeOpponentVariety(participatingPlayers),
    correlationsPerRound,
  };
}

// ============================================================================
// Multi-run aggregation
// ============================================================================

function averageRuns(specName: string, runs: RunResult[]): AveragedSpecResult {
  const avgSkillDiffs: number[] = [];
  const pctBalanced: number[] = [];
  const uniqueRates: number[] = [];
  const maxRepeats: number[] = [];
  const oppUniqueRates: number[] = [];
  const oppMaxRepeats: number[] = [];
  const corrsPerRound: number[][] = Array.from({ length: ROUNDS }, () => []);

  for (const run of runs) {
    avgSkillDiffs.push(run.competitiveness.avgSkillDiff);
    pctBalanced.push(run.competitiveness.pctBalancedMatches);
    uniqueRates.push(run.variety.uniqueRate);
    maxRepeats.push(run.variety.maxRepeats);
    oppUniqueRates.push(run.opponentVariety.uniqueRate);
    oppMaxRepeats.push(run.opponentVariety.maxRepeats);
    run.correlationsPerRound.forEach((c, i) => corrsPerRound[i].push(c));
  }

  return {
    specName,
    competitiveness: {
      avgSkillDiff: meanStd(avgSkillDiffs),
      pctBalancedMatches: meanStd(pctBalanced),
    },
    variety: {
      uniqueRate: meanStd(uniqueRates),
      maxRepeats: meanStd(maxRepeats),
    },
    opponentVariety: {
      uniqueRate: meanStd(oppUniqueRates),
      maxRepeats: meanStd(oppMaxRepeats),
    },
    correlationsPerRound: corrsPerRound.map(meanStd),
  };
}

// ============================================================================
// Output helpers
// ============================================================================

function printHeader(title: string): void {
  console.log("\n" + "=".repeat(WIDTH));
  console.log(` ${title}`);
  console.log("=".repeat(WIDTH));
}

function printSubHeader(title: string): void {
  console.log(`\n  ${title}`);
  printSeparator(WIDTH);
}

function buildBar(value: number, maxWidth: number): string {
  const clamped = Math.max(0, Math.min(1, value));
  const filled = Math.round(clamped * maxWidth);
  return "[" + "█".repeat(filled) + "░".repeat(maxWidth - filled) + "]";
}

// ============================================================================
// Per-spec report (averaged over RUNS runs)
// ============================================================================

function printSpecReport(r: AveragedSpecResult): void {
  printHeader(`SPEC: ${r.specName}  (n=${RUNS} runs)`);
  console.log(`  ${PLAYER_COUNT} players, ${COURTS} courts, ${ROUNDS} rounds, noise=±${SCORE_NOISE}`);

  printSubHeader("METRICS");
  console.log(`  AvgSkillDiff    : ${fmt(r.competitiveness.avgSkillDiff, 2)}`);
  console.log(`  Balanced%       : ${fmtPct(r.competitiveness.pctBalancedMatches)}  (skill diff ≤ 2)`);
  console.log(`  UniquePartner%  : ${fmtPct(r.variety.uniqueRate)}`);
  console.log(`  PartMaxRepeats  : ${fmt(r.variety.maxRepeats, 1)}`);
  console.log(`  UniqueOpponent% : ${fmtPct(r.opponentVariety.uniqueRate)}`);
  console.log(`  OppMaxRepeats   : ${fmt(r.opponentVariety.maxRepeats, 1)}`);

  printSubHeader("Standings Correlation per Round (Spearman mean ± σ)");
  for (let i = 0; i < r.correlationsPerRound.length; i++) {
    const ms = r.correlationsPerRound[i];
    const marker = (i + 1) === MID_ROUND ? " ← mid" : "";
    console.log(
      `  Round ${String(i + 1).padStart(2)} | ${fmt(ms)} ${buildBar(ms.mean, 28)}${marker}`,
    );
  }
}

// ============================================================================
// Summary table
// ============================================================================

function printSummaryTable(results: AveragedSpecResult[]): void {
  printHeader(`SUMMARY — One-Stage Tournament  (n=${RUNS} runs each, mean values)`);

  const COL_SPEC    = 14;
  const COL_N       = 11;
  const TOTAL       = COL_SPEC + COL_N * 7 + 2;

  console.log("\n  " + [
    pad("Spec",        COL_SPEC),
    pad("AvgDiff",     COL_N, "right"),
    pad("Balanced%",   COL_N, "right"),
    pad("UniqPart%",   COL_N, "right"),
    pad("UniqOpp%",    COL_N, "right"),
    pad("MaxRep",      COL_N, "right"),
    pad(`R${MID_ROUND}Spear`,  COL_N, "right"),
    pad("FinalSpear",  COL_N, "right"),
  ].join(""));
  printSeparator(TOTAL);

  for (const r of results) {
    const midCorr   = r.correlationsPerRound[MID_ROUND - 1];
    const finalCorr = r.correlationsPerRound[ROUNDS - 1];

    console.log("  " + [
      pad(r.specName,                                              COL_SPEC),
      pad(r.competitiveness.avgSkillDiff.mean.toFixed(2),          COL_N, "right"),
      pad((r.competitiveness.pctBalancedMatches.mean * 100).toFixed(1) + "%", COL_N, "right"),
      pad((r.variety.uniqueRate.mean * 100).toFixed(1) + "%",      COL_N, "right"),
      pad((r.opponentVariety.uniqueRate.mean * 100).toFixed(1) + "%", COL_N, "right"),
      pad(r.variety.maxRepeats.mean.toFixed(1),                    COL_N, "right"),
      pad(midCorr.mean.toFixed(3),                                 COL_N, "right"),
      pad(finalCorr.mean.toFixed(3),                               COL_N, "right"),
    ].join(""));
  }

  printSeparator(TOTAL);

  printSubHeader("Column Explanations");
  console.log(`  AvgDiff    : mean absolute combined team skill difference per match (lower = more competitive)`);
  console.log(`  Balanced%  : mean % of matches where skill diff ≤ 2 (higher = more balanced)`);
  console.log(`  UniqPart%  : mean % of partner pairs that were unique across all rounds (higher = more variety)`);
  console.log(`  UniqOpp%   : mean % of opponent pairs that were unique across all rounds (higher = more variety)`);
  console.log(`  MaxRep     : mean max times any two players were partners (lower = better variety)`);
  console.log(`  R${MID_ROUND}Spear    : mean Spearman correlation of standings vs true skill at round ${MID_ROUND}`);
  console.log(`  FinalSpear : mean Spearman correlation of standings vs true skill at round ${ROUNDS}`);
  console.log("");
}

// ============================================================================
// Metric explanations
// ============================================================================

function printMetricExplanations(): void {
  printSubHeader("Metric Explanations");
  console.log("  UniquePartner%  : % of all partner pairs that occurred exactly once (higher = more variety)");
  console.log("  PartMaxRepeats  : max times any two players were partners (lower = better variety)");
  console.log("  UniqueOpponent% : % of all opponent pairs that occurred exactly once (higher = more variety)");
  console.log("  OppMaxRepeats   : max times any two players faced each other (lower = better variety)");
  console.log("  AvgSkillDiff    : avg absolute combined team skill difference per match (lower = more competitive)");
  console.log("  Balanced%       : % of matches where skill diff ≤ 2 (higher = more balanced)");
  console.log("  Spearman        : rank correlation of standings vs true skill (1.0 = perfect, higher = better)");
  console.log("  ± values        : standard deviation across the", RUNS, "runs");
  console.log("");
}

// ============================================================================
// Test entry point
// ============================================================================

test("One-stage tournament simulation", () => {
  const averaged: AveragedSpecResult[] = [];

  for (const entry of specs) {
    console.log(`\nRunning ${RUNS}x: ${entry.name}...`);
    const runs: RunResult[] = Array.from({ length: RUNS }, () => runOnce(entry.spec));
    averaged.push(averageRuns(entry.name, runs));
  }

  for (const result of averaged) {
    printSpecReport(result);
  }

  printSummaryTable(averaged);
  printMetricExplanations();
}, 60_000);

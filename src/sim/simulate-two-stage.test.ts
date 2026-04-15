/**
 * Two-Stage Tournament Simulation
 *
 * Simulates a tournament with 30 players on 5 courts across all combinations
 * of Stage 1 (rotating) and Stage 2 (group) specs, averaged over multiple runs:
 *
 *   Stage 1 — Rotating, 9 rounds, all 30 players together:
 *             Americano | Mexicano | Tournicano
 *
 *   Split   — Players divided into two groups of 15 based on Stage 1 standings.
 *             Checks how well the split reflects true skill.
 *
 *   Stage 2 — Group-aware, 9 rounds, within-group competition:
 *             AmericanoGroups | MexicanoGroups | TournicanoGroups
 *
 * Scores include random noise so that results vary across runs; each scenario
 * is run RUNS times and all metrics are reported as mean ± stddev.
 *
 * A compact summary table is printed at the end comparing all 9 combinations.
 *
 * Usage:
 *   npm run simulate                (run all simulations)
 *   npm run simulate -- two-stage   (run this file only)
 */

import { test } from "vitest";
import { tournamentFactory } from "../model/tournament/Tournament.impl.ts";
import {
  MatchingSpec,
  Americano,
  Mexicano,
  Tournicano,
  AmericanoGroups,
  MexicanoGroups,
  TournicanoGroups,
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
const COURTS = 5;
const STAGE1_ROUNDS = 9;
const STAGE2_ROUNDS = 9;
const GROUP_COUNT = 2 as const;
const GROUP_SIZE = PLAYER_COUNT / GROUP_COUNT; // 15 per group
const RUNS = 20;
const SCORE_NOISE = 3; // ±N random noise added to each raw score
const WIDTH = 80;

// ============================================================================
// Scenario definitions
// ============================================================================

interface TwoStageScenario {
  stage1Name: string;
  stage1Spec: MatchingSpec;
  stage2Name: string;
  stage2Spec: MatchingSpec;
}

const stage1Specs = [
  { name: "Americano", spec: Americano },
  { name: "Mexicano", spec: Mexicano },
  { name: "Tournicano", spec: Tournicano },
];

const stage2Specs = [
  { name: "AmericanoGroups", spec: AmericanoGroups },
  { name: "MexicanoGroups", spec: MexicanoGroups },
  { name: "TournicanoGroups", spec: TournicanoGroups },
];

const scenarios: TwoStageScenario[] = stage1Specs.flatMap((s1) =>
  stage2Specs.map((s2) => ({
    stage1Name: s1.name,
    stage1Spec: s1.spec,
    stage2Name: s2.name,
    stage2Spec: s2.spec,
  })),
);

// ============================================================================
// Single-run result types
// ============================================================================

interface Stage1Result {
  competitiveness: { avgSkillDiff: number; pctBalancedMatches: number };
  variety: { avgRepeats: number; maxRepeats: number };
  opponentVariety: { avgRepeats: number; maxRepeats: number };
  correlations: number[]; // per-round Spearman, length = STAGE1_ROUNDS
}

interface SplitResult {
  stage1FinalSpearman: number;
  overallAccuracy: number;
  misplacedCount: number;
}

interface Stage2Result {
  competitiveness: { avgSkillDiff: number; pctBalancedMatches: number };
  variety: { avgRepeats: number; maxRepeats: number };
  opponentVariety: { avgRepeats: number; maxRepeats: number };
  correlations: Array<{ g0: number; g1: number; overall: number }>; // length = STAGE2_ROUNDS
  crossGroupMatchCount: number; // should always be 0
}

interface RunResult {
  stage1: Stage1Result;
  split: SplitResult;
  stage2: Stage2Result;
}

// ============================================================================
// Averaged result types (mean ± stddev across RUNS runs)
// ============================================================================

interface MeanStd { mean: number; std: number }

interface AveragedScenarioResult {
  scenario: TwoStageScenario;
  stage1: {
    competitiveness: { avgSkillDiff: MeanStd; pctBalancedMatches: MeanStd };
    variety: { avgRepeats: MeanStd; maxRepeats: MeanStd };
    opponentVariety: { avgRepeats: MeanStd; maxRepeats: MeanStd };
    correlationsPerRound: MeanStd[]; // length = STAGE1_ROUNDS
  };
  split: {
    stage1FinalSpearman: MeanStd;
    overallAccuracy: MeanStd;
    misplacedCount: MeanStd;
  };
  stage2: {
    competitiveness: { avgSkillDiff: MeanStd; pctBalancedMatches: MeanStd };
    variety: { avgRepeats: MeanStd; maxRepeats: MeanStd };
    opponentVariety: { avgRepeats: MeanStd; maxRepeats: MeanStd };
    correlationsPerRound: Array<{ g0: MeanStd; g1: MeanStd; overall: MeanStd }>; // length = STAGE2_ROUNDS
    crossGroupMatchCount: MeanStd; // should always be mean=0, std=0
  };
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

function runOnce(scenario: TwoStageScenario): RunResult {
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

  // skillRankMap: playerId → 1-based rank (1 = strongest)
  const skillRankMap = new Map<string, number>();
  skillOrderDesc.forEach((id, i) => skillRankMap.set(id, i + 1));

  // ── Stage 1 ────────────────────────────────────────────────────────────────
  const stage1MatchData: Array<Array<{ teamACombinedSkill: number; teamBCombinedSkill: number }>> = [];
  const stage1Correlations: number[] = [];

  for (let r = 0; r < STAGE1_ROUNDS; r++) {
    const round = tournament.createRound(scenario.stage1Spec, COURTS);

    stage1MatchData.push(round.matches.map((m) => ({
      teamACombinedSkill: skills.get(m.teamA.player1.id)! + skills.get(m.teamA.player2.id)!,
      teamBCombinedSkill: skills.get(m.teamB.player1.id)! + skills.get(m.teamB.player2.id)!,
    })));

    round.matches.forEach((m) => {
      const a = skills.get(m.teamA.player1.id)! + skills.get(m.teamA.player2.id)!;
      const b = skills.get(m.teamB.player1.id)! + skills.get(m.teamB.player2.id)!;
      m.submitScore(generateScore(a, b, SCORE_NOISE));
    });

    stage1Correlations.push(
      spearmanCorrelation(skillOrderDesc, round.standings().map((s) => s.player.id)),
    );
  }

  const lastStage1Round = tournament.rounds[tournament.rounds.length - 1];
  const stage1Players = lastStage1Round.getParticipatingPlayers();
  const stage1Variety = analyzePartnerVariety(stage1Players);
  const stage1OpponentVariety = analyzeOpponentVariety(stage1Players);

  // ── Group split ────────────────────────────────────────────────────────────
  const stage1FinalSpearman = stage1Correlations[stage1Correlations.length - 1];
  tournament.assignGroupsByStandings(GROUP_COUNT);

  const groupOf = new Map<string, number>();
  tournament.players().forEach((p) => groupOf.set(p.id, p.group));

  const trueGroup0Ids = new Set(skillOrderDesc.slice(0, GROUP_SIZE));
  const trueGroup1Ids = new Set(skillOrderDesc.slice(GROUP_SIZE));
  const group0Correct = [...trueGroup0Ids].filter((id) => groupOf.get(id) === 0).length;
  const group1Correct = [...trueGroup1Ids].filter((id) => groupOf.get(id) === 1).length;
  const misplacedCount = PLAYER_COUNT - group0Correct - group1Correct;

  // ── Stage 2 ────────────────────────────────────────────────────────────────
  const group0SkillDesc = skillOrderDesc.filter((id) => groupOf.get(id) === 0);
  const group1SkillDesc = skillOrderDesc.filter((id) => groupOf.get(id) === 1);

  const stage2MatchData: Array<Array<{ teamACombinedSkill: number; teamBCombinedSkill: number }>> = [];
  const stage2Correlations: Array<{ g0: number; g1: number; overall: number }> = [];
  let crossGroupMatchCount = 0;

  for (let r = 0; r < STAGE2_ROUNDS; r++) {
    const round = tournament.createRound(scenario.stage2Spec, COURTS);

    stage2MatchData.push(round.matches.map((m) => ({
      teamACombinedSkill: skills.get(m.teamA.player1.id)! + skills.get(m.teamA.player2.id)!,
      teamBCombinedSkill: skills.get(m.teamB.player1.id)! + skills.get(m.teamB.player2.id)!,
    })));

    for (const m of round.matches) {
      const groups = [
        m.teamA.player1.group,
        m.teamA.player2.group,
        m.teamB.player1.group,
        m.teamB.player2.group,
      ];
      if (groups.some((g) => g !== groups[0])) {
        crossGroupMatchCount++;
      }
    }

    round.matches.forEach((m) => {
      const a = skills.get(m.teamA.player1.id)! + skills.get(m.teamA.player2.id)!;
      const b = skills.get(m.teamB.player1.id)! + skills.get(m.teamB.player2.id)!;
      m.submitScore(generateScore(a, b, SCORE_NOISE));
    });

    stage2Correlations.push({
      g0: spearmanCorrelation(group0SkillDesc, round.standings([0]).map((s) => s.player.id)),
      g1: spearmanCorrelation(group1SkillDesc, round.standings([1]).map((s) => s.player.id)),
      overall: spearmanCorrelation(skillOrderDesc, round.standings().map((s) => s.player.id)),
    });
  }

  const lastStage2Round = tournament.rounds[tournament.rounds.length - 1];
  const stage2AllPlayers = lastStage2Round.getParticipatingPlayers();
  const stage2Variety = analyzePartnerVariety(stage2AllPlayers);
  const stage2OpponentVariety = analyzeOpponentVariety(stage2AllPlayers);

  return {
    stage1: {
      competitiveness: analyzeMatchCompetitiveness(stage1MatchData),
      variety: stage1Variety,
      opponentVariety: stage1OpponentVariety,
      correlations: stage1Correlations,
    },
    split: {
      stage1FinalSpearman,
      overallAccuracy: (group0Correct + group1Correct) / PLAYER_COUNT,
      misplacedCount,
    },
    stage2: {
      competitiveness: analyzeMatchCompetitiveness(stage2MatchData),
      variety: stage2Variety,
      opponentVariety: stage2OpponentVariety,
      correlations: stage2Correlations,
      crossGroupMatchCount,
    },
  };
}

// ============================================================================
// Multi-run aggregation
// ============================================================================

function averageRuns(scenario: TwoStageScenario, runs: RunResult[]): AveragedScenarioResult {
  const s1CorrsPerRound: number[][] = Array.from({ length: STAGE1_ROUNDS }, () => []);
  const s2CorrsPerRound: Array<{ g0: number[]; g1: number[]; overall: number[] }> =
    Array.from({ length: STAGE2_ROUNDS }, () => ({ g0: [], g1: [], overall: [] }));

  const s1AvgSkillDiffs: number[] = [];
  const s1PctBalanced: number[] = [];
  const s1AvgRepeats: number[] = [];
  const s1MaxRepeats: number[] = [];
  const s1OppAvgRepeats: number[] = [];
  const s1OppMaxRepeats: number[] = [];

  const splitSpearman: number[] = [];
  const splitAccuracy: number[] = [];
  const splitMisplaced: number[] = [];

  const s2AvgSkillDiffs: number[] = [];
  const s2PctBalanced: number[] = [];
  const s2AvgRepeats: number[] = [];
  const s2MaxRepeats: number[] = [];
  const s2OppAvgRepeats: number[] = [];
  const s2OppMaxRepeats: number[] = [];
  const s2CrossGroupCounts: number[] = [];

  for (const run of runs) {
    s1AvgSkillDiffs.push(run.stage1.competitiveness.avgSkillDiff);
    s1PctBalanced.push(run.stage1.competitiveness.pctBalancedMatches);
    s1AvgRepeats.push(run.stage1.variety.avgRepeats);
    s1MaxRepeats.push(run.stage1.variety.maxRepeats);
    s1OppAvgRepeats.push(run.stage1.opponentVariety.avgRepeats);
    s1OppMaxRepeats.push(run.stage1.opponentVariety.maxRepeats);

    run.stage1.correlations.forEach((c, i) => s1CorrsPerRound[i].push(c));

    splitSpearman.push(run.split.stage1FinalSpearman);
    splitAccuracy.push(run.split.overallAccuracy);
    splitMisplaced.push(run.split.misplacedCount);

    s2AvgSkillDiffs.push(run.stage2.competitiveness.avgSkillDiff);
    s2PctBalanced.push(run.stage2.competitiveness.pctBalancedMatches);
    s2AvgRepeats.push(run.stage2.variety.avgRepeats);
    s2MaxRepeats.push(run.stage2.variety.maxRepeats);
    s2OppAvgRepeats.push(run.stage2.opponentVariety.avgRepeats);
    s2OppMaxRepeats.push(run.stage2.opponentVariety.maxRepeats);
    s2CrossGroupCounts.push(run.stage2.crossGroupMatchCount);

    run.stage2.correlations.forEach((c, i) => {
      s2CorrsPerRound[i].g0.push(c.g0);
      s2CorrsPerRound[i].g1.push(c.g1);
      s2CorrsPerRound[i].overall.push(c.overall);
    });
  }

  return {
    scenario,
    stage1: {
      competitiveness: {
        avgSkillDiff: meanStd(s1AvgSkillDiffs),
        pctBalancedMatches: meanStd(s1PctBalanced),
      },
      variety: {
        avgRepeats: meanStd(s1AvgRepeats),
        maxRepeats: meanStd(s1MaxRepeats),
      },
      opponentVariety: {
        avgRepeats: meanStd(s1OppAvgRepeats),
        maxRepeats: meanStd(s1OppMaxRepeats),
      },
      correlationsPerRound: s1CorrsPerRound.map(meanStd),
    },
    split: {
      stage1FinalSpearman: meanStd(splitSpearman),
      overallAccuracy: meanStd(splitAccuracy),
      misplacedCount: meanStd(splitMisplaced),
    },
    stage2: {
      competitiveness: {
        avgSkillDiff: meanStd(s2AvgSkillDiffs),
        pctBalancedMatches: meanStd(s2PctBalanced),
      },
      variety: {
        avgRepeats: meanStd(s2AvgRepeats),
        maxRepeats: meanStd(s2MaxRepeats),
      },
      opponentVariety: {
        avgRepeats: meanStd(s2OppAvgRepeats),
        maxRepeats: meanStd(s2OppMaxRepeats),
      },
      correlationsPerRound: s2CorrsPerRound.map((c) => ({
        g0: meanStd(c.g0),
        g1: meanStd(c.g1),
        overall: meanStd(c.overall),
      })),
      crossGroupMatchCount: meanStd(s2CrossGroupCounts),
    },
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
// Per-scenario report (averaged over RUNS runs)
// ============================================================================

function printScenarioReport(r: AveragedScenarioResult): void {
  const { scenario, stage1, split, stage2 } = r;

  printHeader(`SCENARIO: ${scenario.stage1Name} → ${scenario.stage2Name}  (n=${RUNS} runs)`);
  console.log(`  ${PLAYER_COUNT} players, ${COURTS} courts, noise=±${SCORE_NOISE}`);
  console.log(`  Stage 1: ${STAGE1_ROUNDS} rounds — ${scenario.stage1Name} (all players, rotating)`);
  console.log(`  Stage 2: ${STAGE2_ROUNDS} rounds — ${scenario.stage2Name} (within-group)`);

  // --- Stage 1 ---
  printSubHeader(`STAGE 1 — ${scenario.stage1Name}`);
  console.log(`  AvgSkillDiff     : ${fmt(stage1.competitiveness.avgSkillDiff, 2)}`);
  console.log(`  Balanced%        : ${fmtPct(stage1.competitiveness.pctBalancedMatches)}  (skill diff ≤ 2)`);
  console.log(`  AvgPartRepeats   : ${fmt(stage1.variety.avgRepeats, 2)}`);
  console.log(`  MaxRepeats       : ${fmt(stage1.variety.maxRepeats, 1)}`);
  console.log(`  AvgOppRepeats    : ${fmt(stage1.opponentVariety.avgRepeats, 2)}`);
  console.log(`  OppMaxRepeats    : ${fmt(stage1.opponentVariety.maxRepeats, 1)}`);

  // --- Stage 1 per-round Spearman ---
  printSubHeader("Standings Correlation per Round — Stage 1 (Spearman mean ± σ)");
  for (let i = 0; i < stage1.correlationsPerRound.length; i++) {
    const ms = stage1.correlationsPerRound[i];
    console.log(
      `  Round ${String(i + 1).padStart(2)} | ${fmt(ms)} ${buildBar(ms.mean, 28)}`,
    );
  }

  // --- Group split ---
  printSubHeader("GROUP SPLIT");
  console.log(`  Stage-1 final Spearman : ${fmt(split.stage1FinalSpearman)}`);
  console.log(`  Split accuracy         : ${fmtPct(split.overallAccuracy)}`);
  console.log(`  Misplaced players      : ${fmt(split.misplacedCount, 1)}`);

  // --- Stage 2 ---
  printSubHeader(`STAGE 2 — ${scenario.stage2Name}`);
  console.log(`  AvgSkillDiff     : ${fmt(stage2.competitiveness.avgSkillDiff, 2)}`);
  console.log(`  Balanced%        : ${fmtPct(stage2.competitiveness.pctBalancedMatches)}  (skill diff ≤ 2)`);
  console.log(`  AvgPartRepeats   : ${fmt(stage2.variety.avgRepeats, 2)}`);
  console.log(`  MaxRepeats       : ${fmt(stage2.variety.maxRepeats, 1)}`);
  console.log(`  AvgOppRepeats    : ${fmt(stage2.opponentVariety.avgRepeats, 2)}`);
  console.log(`  OppMaxRepeats    : ${fmt(stage2.opponentVariety.maxRepeats, 1)}`);
  console.log(`  CrossGroupMatches: ${fmt(stage2.crossGroupMatchCount, 1)}  (should always be 0)`);

  // --- Stage 2 per-round Spearman ---
  printSubHeader("Rank Convergence per Round — Stage 2 (Spearman mean ± σ)");
  const colW = 16;
  console.log(
    "  " +
    pad("Round", 8) +
    pad("Group 0", colW, "right") +
    pad("Group 1", colW, "right") +
    pad("Overall", colW, "right"),
  );
  printSeparator(WIDTH);
  for (let i = 0; i < stage2.correlationsPerRound.length; i++) {
    const { g0, g1, overall } = stage2.correlationsPerRound[i];
    console.log(
      "  " +
      pad(`Round ${i + 1}`, 8) +
      pad(fmt(g0), colW, "right") +
      pad(fmt(g1), colW, "right") +
      pad(fmt(overall), colW, "right") +
      "  " + buildBar(overall.mean, 10),
    );
  }
}

// ============================================================================
// Summary table
// ============================================================================

function printSummaryTable(results: AveragedScenarioResult[]): void {
  printHeader(`SUMMARY — All Scenarios  (n=${RUNS} runs each, mean values)`);

  const COL_SCENARIO = 36;
  const COL_N = 8;
  const TOTAL = COL_SCENARIO + COL_N * 8 + 2;

  console.log("\n  " + [
    pad("Scenario (Stage1 → Stage2)", COL_SCENARIO),
    pad("S1Spear", COL_N, "right"),
    pad("Split%", COL_N, "right"),
    pad("Misplace", COL_N, "right"),
    pad("S1AvgPartRep", COL_N, "right"),
    pad("S1AvgOppRep", COL_N, "right"),
    pad("S2Spear", COL_N, "right"),
    pad("S2G0", COL_N, "right"),
    pad("S2G1", COL_N, "right"),
  ].join(""));
  printSeparator(TOTAL);

  let prevStage1 = "";
  for (const r of results) {
    const label = `${r.scenario.stage1Name} → ${r.scenario.stage2Name}`;
    const s1Corr = r.split.stage1FinalSpearman.mean;
    const splitPct = r.split.overallAccuracy.mean * 100;
    const misplace = r.split.misplacedCount.mean;
    const s1AvgPartRep = r.stage1.variety.avgRepeats.mean;
    const s1OppAvgRep = r.stage1.opponentVariety.avgRepeats.mean;
    const lastS2 = r.stage2.correlationsPerRound[r.stage2.correlationsPerRound.length - 1];

    if (prevStage1 && prevStage1 !== r.scenario.stage1Name) {
      console.log("");
    }
    prevStage1 = r.scenario.stage1Name;

    console.log("  " + [
      pad(label, COL_SCENARIO),
      pad(s1Corr.toFixed(3), COL_N, "right"),
      pad(splitPct.toFixed(0) + "%", COL_N, "right"),
      pad(misplace.toFixed(1), COL_N, "right"),
      pad(s1AvgPartRep.toFixed(2), COL_N, "right"),
      pad(s1OppAvgRep.toFixed(2), COL_N, "right"),
      pad(lastS2.overall.mean.toFixed(3), COL_N, "right"),
      pad(lastS2.g0.mean.toFixed(3), COL_N, "right"),
      pad(lastS2.g1.mean.toFixed(3), COL_N, "right"),
    ].join(""));
  }

  printSeparator(TOTAL);

  printSubHeader("Column Explanations");
  console.log("  S1Spear  : Stage-1 final Spearman mean (overall standings vs true skill)");
  console.log("  Split%   : mean % of players assigned to the correct skill group after Stage 1");
  console.log("  Misplace : mean number of players in the wrong group after the split");
  console.log("  S1AvgPartRep: mean avg times any two players were partners in Stage-1 (lower = more variety)");
  console.log("  S1AvgOppRep: mean avg times any two players faced each other in Stage-1 (lower = more variety)");
  console.log("  S2Spear  : Stage-2 final Spearman mean (overall standings vs true skill)");
  console.log("  S2G0     : Stage-2 final Spearman within Group 0 (top group)");
  console.log("  S2G1     : Stage-2 final Spearman within Group 1 (bottom group)");
  console.log("");
}

// ============================================================================
// Metric explanations
// ============================================================================

function printMetricExplanations(): void {
  printSubHeader("Metric Explanations");
  console.log("  AvgPartRepeats   : avg times any two players were partners (lower = more variety)");
  console.log("  MaxRepeats       : max times any two players were partners (lower = better variety)");
  console.log("  AvgOppRepeats    : avg times any two players faced each other (lower = more variety)");
  console.log("  OppMaxRepeats    : max times any two players faced each other (lower = better variety)");
  console.log("  AvgSkillDiff     : avg absolute combined team skill difference per match (lower = more competitive)");
  console.log("  Balanced%        : % of matches where skill diff ≤ 2 (higher = more balanced)");
  console.log("  Spearman         : rank correlation of standings vs true skill (1.0 = perfect, higher = better)");
  console.log("  Split accuracy   : % of players assigned to the correct skill-based group after Stage 1");
  console.log("  ± values         : standard deviation across the", RUNS, "runs");
  console.log("");
}

// ============================================================================
// Test entry point
// ============================================================================

test("Two-stage tournament simulation", () => {
  const averaged: AveragedScenarioResult[] = [];

  for (const scenario of scenarios) {
    console.log(`\nRunning ${RUNS}x: ${scenario.stage1Name} → ${scenario.stage2Name}...`);
    const runs: RunResult[] = [];
    for (let i = 0; i < RUNS; i++) {
      runs.push(runOnce(scenario));
    }
    averaged.push(averageRuns(scenario, runs));
  }

  for (const result of averaged) {
    printScenarioReport(result);
  }

  printSummaryTable(averaged);
  printMetricExplanations();
}, 120_000);

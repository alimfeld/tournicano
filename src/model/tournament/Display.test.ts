import { test, expect } from "vitest";
import { getPerformanceBadge } from "./Display.ts";
import { ParticipatingPlayer } from "./Tournament.ts";

// Helper to create a mock participating player
function createMockPlayer(wins: number, losses: number, draws: number): ParticipatingPlayer {
  const totalGames = wins + losses + draws;
  const winRatio = totalGames === 0 ? 0 : wins / totalGames;
  
  return {
    wins,
    losses,
    draws,
    winRatio,
    plusMinus: 0,
    playRatio: 0,
    matchCount: 0,
    pauseCount: 0,
    pointsFor: 0,
    pointsAgainst: 0,
    partners: new Map(),
    opponents: new Map(),
    id: "test",
    name: "Test Player",
    group: 0,
    active: true,
    inAnyRound: () => false,
    canRenameTo: () => true,
    rename: () => false,
    setGroup: () => {},
    activate: () => {},
    delete: () => false,
  };
}

test("getPerformanceBadge returns 💯 for 100% win rate", () => {
  const player = createMockPlayer(5, 0, 0);
  expect(getPerformanceBadge(player)).toBe("💯");
});

test("getPerformanceBadge returns 🔥 for 75% win rate", () => {
  const player = createMockPlayer(3, 1, 0);
  expect(getPerformanceBadge(player)).toBe("🔥");
});

test("getPerformanceBadge returns 🔥 for 80% win rate", () => {
  const player = createMockPlayer(4, 1, 0);
  expect(getPerformanceBadge(player)).toBe("🔥");
});

test("getPerformanceBadge returns undefined for < 75% win rate", () => {
  const player = createMockPlayer(2, 2, 0);
  expect(getPerformanceBadge(player)).toBeUndefined();
});

test("getPerformanceBadge returns undefined for 50% win rate", () => {
  const player = createMockPlayer(1, 1, 0);
  expect(getPerformanceBadge(player)).toBeUndefined();
});

test("getPerformanceBadge returns undefined for 0% win rate", () => {
  const player = createMockPlayer(0, 3, 0);
  expect(getPerformanceBadge(player)).toBeUndefined();
});

test("getPerformanceBadge returns undefined for no games played", () => {
  const player = createMockPlayer(0, 0, 0);
  expect(getPerformanceBadge(player)).toBeUndefined();
});

test("getPerformanceBadge handles draws correctly", () => {
  // 3 wins out of 5 games = 60% win rate
  const player = createMockPlayer(3, 1, 1);
  expect(getPerformanceBadge(player)).toBeUndefined();
});

test("getPerformanceBadge with all draws", () => {
  const player = createMockPlayer(0, 0, 3);
  expect(getPerformanceBadge(player)).toBeUndefined();
});

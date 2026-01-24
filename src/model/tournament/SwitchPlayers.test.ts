import { expect, test } from "vitest";
import { tournamentFactory } from "./Tournament.impl.ts";

test("should reject switch if not last round", () => {
  const t = tournamentFactory.create();
  t.addPlayers(["A", "B", "C", "D", "E", "F", "G", "H"]);
  
  const r1 = t.createRound();
  t.createRound();
  
  const p1 = r1.matches[0].teamA.player1.id;
  const p2 = r1.matches[0].teamA.player2.id;
  
  expect(r1.switchPlayers(p1, p2)).toBe(false);
});

test("should reject switch if any match has score", () => {
  const t = tournamentFactory.create();
  t.addPlayers(["A", "B", "C", "D", "E", "F", "G", "H"]);
  
  const r1 = t.createRound();
  r1.matches[0].submitScore([11, 5]);
  
  const p1 = r1.matches[0].teamA.player1.id;
  const p2 = r1.matches[1].teamA.player1.id;
  
  expect(r1.switchPlayers(p1, p2)).toBe(false);
});

test("should reject switch if player is inactive", () => {
  const t = tournamentFactory.create();
  t.addPlayers(["A", "B", "C", "D", "E", "F"]);
  
  const r1 = t.createRound();
  const pausedPlayer = r1.paused[0];
  
  // Deactivate paused player
  t.getPlayer(pausedPlayer.id)!.activate(false);
  
  const r2 = t.createRound();
  const matchedPlayer = r2.matches[0].teamA.player1.id;
  const inactivePlayer = pausedPlayer.id;
  
  expect(r2.switchPlayers(matchedPlayer, inactivePlayer)).toBe(false);
});

test("should reject switching same player with itself", () => {
  const t = tournamentFactory.create();
  t.addPlayers(["A", "B", "C", "D"]);
  
  const r1 = t.createRound();
  const p1 = r1.matches[0].teamA.player1.id;
  
  expect(r1.switchPlayers(p1, p1)).toBe(false);
});

test("should reject switch if player not in round", () => {
  const t = tournamentFactory.create();
  t.addPlayers(["A", "B", "C", "D"]);
  
  const r1 = t.createRound();
  const p1 = r1.matches[0].teamA.player1.id;
  const fakeId = "not-a-real-id";
  
  expect(r1.switchPlayers(p1, fakeId)).toBe(false);
});

test("should switch players within same match", () => {
  const t = tournamentFactory.create();
  t.addPlayers(["A", "B", "C", "D", "E", "F", "G", "H"]);
  
  const r1 = t.createRound();
  const p1 = r1.matches[0].teamA.player1;
  const p2 = r1.matches[0].teamB.player1;
  const p1Partner = r1.matches[0].teamA.player2.id;
  const p2Partner = r1.matches[0].teamB.player2.id;
  
  expect(r1.switchPlayers(p1.id, p2.id)).toBe(true);
  
  // Verify positions swapped
  expect(r1.matches[0].teamA.player1.id).toBe(p2.id);
  expect(r1.matches[0].teamB.player1.id).toBe(p1.id);
  
  // Verify stats updated correctly
  const p1After = r1.playerMap.get(p1.id)!;
  const p2After = r1.playerMap.get(p2.id)!;
  
  // p1 now partners with p2's old partner
  expect(p1After.partners.has(p2Partner)).toBe(true);
  expect(p1After.partners.has(p1Partner)).toBe(false);
  
  // p1 now opposes old partner
  expect(p1After.opponents.has(p1Partner)).toBe(true);
  expect(p1After.opponents.has(p2Partner)).toBe(false);
  
  // p2 now partners with p1's old partner
  expect(p2After.partners.has(p1Partner)).toBe(true);
  expect(p2After.partners.has(p2Partner)).toBe(false);
});

test("should switch players between different matches", () => {
  const t = tournamentFactory.create();
  t.addPlayers(["A", "B", "C", "D", "E", "F", "G", "H"]);
  
  const r1 = t.createRound();
  const p1 = r1.matches[0].teamA.player1;
  const p2 = r1.matches[1].teamA.player1;
  const p1Partner = r1.matches[0].teamA.player2.id;
  const p2Partner = r1.matches[1].teamA.player2.id;
  
  expect(r1.switchPlayers(p1.id, p2.id)).toBe(true);
  
  // Verify positions swapped
  expect(r1.matches[0].teamA.player1.id).toBe(p2.id);
  expect(r1.matches[1].teamA.player1.id).toBe(p1.id);
  
  // Verify partner relationships updated
  const p1After = r1.playerMap.get(p1.id)!;
  const p2After = r1.playerMap.get(p2.id)!;
  
  expect(p1After.partners.has(p2Partner)).toBe(true);
  expect(p1After.partners.has(p1Partner)).toBe(false);
  expect(p2After.partners.has(p1Partner)).toBe(true);
  expect(p2After.partners.has(p2Partner)).toBe(false);
});

test("should switch matched player with paused player", () => {
  const t = tournamentFactory.create();
  t.addPlayers(["A", "B", "C", "D", "E", "F"]);
  
  const r1 = t.createRound();
  const matched = r1.matches[0].teamA.player1;
  const paused = r1.paused[0];
  
  expect(r1.switchPlayers(matched.id, paused.id)).toBe(true);
  
  // Verify matched player now paused
  expect(r1.paused.some(p => p.id === matched.id)).toBe(true);
  
  // Verify paused player now matched
  const pausedNowMatched = r1.matches.some(m => 
    m.teamA.player1.id === paused.id ||
    m.teamA.player2.id === paused.id ||
    m.teamB.player1.id === paused.id ||
    m.teamB.player2.id === paused.id
  );
  expect(pausedNowMatched).toBe(true);
  
  // Verify stats
  const matchedAfter = r1.playerMap.get(matched.id)!;
  const pausedAfter = r1.playerMap.get(paused.id)!;
  
  expect(matchedAfter.matchCount).toBe(0);
  expect(matchedAfter.pauseCount).toBe(1);
  
  expect(pausedAfter.matchCount).toBe(1);
  expect(pausedAfter.pauseCount).toBe(0);
});

test("should switch two paused players", () => {
  const t = tournamentFactory.create();
  t.addPlayers(["A", "B", "C", "D", "E", "F"]);
  
  const r1 = t.createRound();
  
  if (r1.paused.length < 2) {
    // Need at least 2 paused players - skip test
    return;
  }
  
  const p1 = r1.paused[0];
  const p2 = r1.paused[1];
  
  expect(r1.switchPlayers(p1.id, p2.id)).toBe(true);
  
  // Both should still be paused (just swapped positions in array)
  expect(r1.paused.some(p => p.id === p1.id)).toBe(true);
  expect(r1.paused.some(p => p.id === p2.id)).toBe(true);
});

test("should preserve partner/opponent counts after switch", () => {
  const t = tournamentFactory.create();
  t.addPlayers(["A", "B", "C", "D", "E", "F", "G", "H"]);
  
  const r1 = t.createRound();
  const p1 = r1.matches[0].teamA.player1;
  const p2 = r1.matches[1].teamA.player1;
  
  r1.switchPlayers(p1.id, p2.id);
  
  // Each player should still have 1 partner and 2 opponents
  const p1After = r1.playerMap.get(p1.id)!;
  const p2After = r1.playerMap.get(p2.id)!;
  
  expect(p1After.partners.size).toBe(1);
  expect(p1After.opponents.size).toBe(2);
  expect(p2After.partners.size).toBe(1);
  expect(p2After.opponents.size).toBe(2);
});

test("should work correctly after multiple switches", () => {
  const t = tournamentFactory.create();
  t.addPlayers(["A", "B", "C", "D", "E", "F", "G", "H"]);
  
  const r1 = t.createRound();
  const p1 = r1.matches[0].teamA.player1.id;
  const p2 = r1.matches[0].teamB.player1.id;
  const p3 = r1.matches[1].teamA.player1.id;
  
  // First switch
  expect(r1.switchPlayers(p1, p2)).toBe(true);
  
  // Second switch
  expect(r1.switchPlayers(p1, p3)).toBe(true);
  
  // p1 should now be in match 1
  const p1InMatch1 = 
    r1.matches[1].teamA.player1.id === p1 ||
    r1.matches[1].teamA.player2.id === p1 ||
    r1.matches[1].teamB.player1.id === p1 ||
    r1.matches[1].teamB.player2.id === p1;
  
  expect(p1InMatch1).toBe(true);
});

test("should preserve match count equals 1 for all matched players", () => {
  const t = tournamentFactory.create();
  t.addPlayers(["A", "B", "C", "D", "E", "F", "G", "H"]);
  
  const r1 = t.createRound();
  const p1 = r1.matches[0].teamA.player1.id;
  const p2 = r1.matches[1].teamA.player1.id;
  
  r1.switchPlayers(p1, p2);
  
  // All matched players should have matchCount = 1
  r1.matches.forEach(match => {
    expect(r1.playerMap.get(match.teamA.player1.id)!.matchCount).toBe(1);
    expect(r1.playerMap.get(match.teamA.player2.id)!.matchCount).toBe(1);
    expect(r1.playerMap.get(match.teamB.player1.id)!.matchCount).toBe(1);
    expect(r1.playerMap.get(match.teamB.player2.id)!.matchCount).toBe(1);
  });
});

test("should notify tournament of change", () => {
  const t = tournamentFactory.create();
  t.addPlayers(["A", "B", "C", "D", "E", "F", "G", "H"]);
  
  const r1 = t.createRound();
  const p1 = r1.matches[0].teamA.player1.id;
  const p2 = r1.matches[0].teamB.player1.id;
  
  let notified = false;
  t.addListener({ onchange: () => { notified = true; } });
  
  r1.switchPlayers(p1, p2);
  
  expect(notified).toBe(true);
});

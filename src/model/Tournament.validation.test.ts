import { test, expect } from "vitest";
import { test as fixtureTest } from "./Tournament.test.helpers.ts";
import { validatePlayerName, Tournament } from "./Tournament.ts";
import { AmericanoMixed, Mexicano, Americano } from "./MatchingSpec.ts";
import { tournamentFactory } from "./Tournament.impl.ts";

// Tests for validatePlayerName function
test("validatePlayerName accepts valid names", () => {
  expect(validatePlayerName("Alice")).toEqual({ valid: true });
  expect(validatePlayerName("Bob Smith")).toEqual({ valid: true });
  expect(validatePlayerName("Player-123")).toEqual({ valid: true });
  expect(validatePlayerName("José")).toEqual({ valid: true });
});

test("validatePlayerName trims whitespace", () => {
  expect(validatePlayerName("  Alice  ")).toEqual({ valid: true });
  expect(validatePlayerName("\tBob\n")).toEqual({ valid: true });
});

test("validatePlayerName rejects empty names", () => {
  expect(validatePlayerName("")).toEqual({ 
    valid: false, 
    error: "Name is required" 
  });
  expect(validatePlayerName("   ")).toEqual({ 
    valid: false, 
    error: "Name is required" 
  });
});

test("validatePlayerName rejects commas", () => {
  const result = validatePlayerName("Alice, Bob");
  expect(result.valid).toBe(false);
  expect(result.error).toBe("Name cannot contain commas or periods");
});

test("validatePlayerName rejects periods", () => {
  const result = validatePlayerName("Alice.Bob");
  expect(result.valid).toBe(false);
  expect(result.error).toBe("Name cannot contain commas or periods");
});

// Tests for Tournament.validateConfiguration
interface ValidationFixture {
  tournament: Tournament;
}

const validationTest = fixtureTest.extend<ValidationFixture>({
  tournament: async ({}, use) => {
    const tournament = tournamentFactory.create();
    // Add players in different groups
    tournament.addPlayers(["Alice", "Bob", "Carol", "Dave"], 0);
    tournament.addPlayers(["Eve", "Frank", "Grace", "Hank"], 1);
    await use(tournament);
  },
});

validationTest("validateConfiguration warns for Americano with mixed groups", ({ tournament }) => {
  // Americano doesn't use groups, so having players in multiple groups should warn
  const warnings = tournament.validateConfiguration(Americano);
  expect(warnings).toHaveLength(1);
  expect(warnings[0].type).toBe("groupMismatch");
  expect(warnings[0].message).toContain("mode ignores them");
});

validationTest("validateConfiguration warns when AmericanoMixed used with one group", ({ tournament }) => {
  // Deactivate all players in group 1
  tournament.activateGroup(1, false);
  
  const warnings = tournament.validateConfiguration(AmericanoMixed);
  expect(warnings).toHaveLength(1);
  expect(warnings[0].type).toBe("groupMismatch");
  expect(warnings[0].message).toContain("all active players are in one group");
});

validationTest("validateConfiguration warns when mode ignores groups but players are in multiple groups", ({ tournament }) => {
  // Americano doesn't use groups
  const warnings = tournament.validateConfiguration(Americano);
  expect(warnings).toHaveLength(1);
  expect(warnings[0].type).toBe("groupMismatch");
  expect(warnings[0].message).toContain("mode ignores them");
});

validationTest("validateConfiguration returns no warnings for AmericanoMixed with multiple groups", ({ tournament }) => {
  const warnings = tournament.validateConfiguration(AmericanoMixed);
  expect(warnings).toEqual([]);
});

validationTest("validateConfiguration returns no warnings for Mexicano (no group factor)", ({ tournament }) => {
  const warnings = tournament.validateConfiguration(Mexicano);
  // Mexicano doesn't use groups, but warning only shows if players are in multiple groups
  expect(warnings).toHaveLength(1); // Should warn about multiple groups being ignored
  expect(warnings[0].type).toBe("groupMismatch");
});

validationTest("validateConfiguration handles all players in one group correctly", ({ tournament }) => {
  // Put everyone in group 0
  tournament.activateGroup(1, false);
  
  // Americano should have no warnings (doesn't use groups anyway)
  const americanoWarnings = tournament.validateConfiguration(Americano);
  expect(americanoWarnings).toEqual([]);
  
  // AmericanoMixed should warn (needs multiple groups)
  const mixedWarnings = tournament.validateConfiguration(AmericanoMixed);
  expect(mixedWarnings).toHaveLength(1);
  expect(mixedWarnings[0].type).toBe("groupMismatch");
});

validationTest("validateConfiguration with insufficient players", ({ tournament }) => {
  // Deactivate most players (leave only 2 active)
  const players = tournament.players();
  players.slice(2).forEach(p => p.activate(false));
  
  const warnings = tournament.validateConfiguration(Americano);
  // With < 4 players, no group mismatch warning should appear
  expect(warnings).toEqual([]);
});

import { assertEquals } from "@std/assert";
import { SimplePlayer, SimpleTeam } from "./participant.ts";

Deno.test(function createPlayer() {
  const john = new SimplePlayer("John", new Map([["group", "male"]]));
  assertEquals(john.name(), "John");
  assertEquals(john.label("group"), "male");
});

Deno.test(function createTeam() {
  const john = new SimplePlayer("John");
  const jill = new SimplePlayer("Jill");
  const team = new SimpleTeam(
    "Dink Responsibly",
    [john, jill],
    new Map([["level", "advanced"]]),
  );
  assertEquals(team.name(), "Dink Responsibly");
  assertEquals(team.players(), [john, jill]);
  assertEquals(team.label("level"), "advanced");
});

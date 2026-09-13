import { expect, test } from "vitest";
import { settingsFactory } from "./Settings.impl.ts";
import { Americano, Mexicano } from "../matching/MatchingSpec.ts";

test("create with no serialized data returns defaults", () => {
  const settings = settingsFactory.create();
  expect(settings.courts).toBe(2);
  expect(settings.theme).toBe("auto");
  expect(settings.wakeLock).toBe(false);
  expect(settings.textZoom).toBe(1.0);
  expect(settings.matchingSpec).toStrictEqual(Americano);
  expect(settings.avatarSpec).toBe("bottts");
});

test("create with valid serialized data restores settings", () => {
  const settings = settingsFactory.create();
  settings.setCourts(4);
  settings.setTheme("dark");
  settings.setMatchingSpec(Mexicano);
  settings.setTextZoom(1.2);

  const restored = settingsFactory.create(settings.serialize());
  expect(restored.courts).toBe(4);
  expect(restored.theme).toBe("dark");
  expect(restored.matchingSpec).toStrictEqual(Mexicano);
  expect(restored.textZoom).toBe(1.2);
});

test("create with unparseable data falls back to defaults", () => {
  const settings = settingsFactory.create("not json {");
  expect(settings.courts).toBe(2);
  expect(settings.theme).toBe("auto");
  expect(settings.matchingSpec).toStrictEqual(Americano);
});

test("create with settings missing matchingSpec falls back to Americano", () => {
  // Older save format predating matchingSpec
  const settings = settingsFactory.create(JSON.stringify({ courts: 3, theme: "light" }));
  expect(settings.courts).toBe(3);
  expect(settings.theme).toBe("light");
  expect(settings.matchingSpec).toStrictEqual(Americano);
});

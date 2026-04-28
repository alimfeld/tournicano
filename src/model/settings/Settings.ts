import { MatchingSpec } from "../matching/MatchingSpec.ts";

export type Theme = "auto" | "dark" | "light";

export type AvatarSpec = "bottts" | "bottts-neutral" | "bottts-clean";

export interface SettingsListener {
  onchange: (settings: Settings) => void;
}

export interface SettingsData {
  readonly courts: number;
  readonly theme: Theme;
  readonly wakeLock: boolean;
  readonly textZoom: number;
  readonly matchingSpec: MatchingSpec;
  readonly avatarSpec: AvatarSpec;
}

export interface Settings extends SettingsData {
  serialize(): string;
  setCourts(courts: number): void;
  setTheme(theme: Theme): void;
  enableWakeLock(enable: boolean): void;
  setTextZoom(zoom: number): void;
  setMatchingSpec(matchingSpec: MatchingSpec): void;
  setAvatarSpec(spec: AvatarSpec): void;
  addListener(listener: SettingsListener): void;
  removeListener(listener: SettingsListener): void;
}

export interface SettingsFactory {
  create(serialized?: string): Settings;
}

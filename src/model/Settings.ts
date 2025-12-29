import { MatchingSpec } from "./Tournament.matching";

export type Theme = "auto" | "dark" | "light";

export interface SettingsListener {
  onchange: (settings: Settings) => void;
}

export interface SettingsData {
  readonly courts: number;
  readonly theme: Theme;
  readonly wakeLock: boolean;
  readonly debug: boolean;
  readonly matchingSpec: MatchingSpec;
}

export interface Settings extends SettingsData {
  serialize(): string;
  setCourts(courts: number): void;
  setTheme(theme: Theme): void;
  enableWakeLock(enable: boolean): void;
  showDebug(debug: boolean): void;
  setMatchingSpec(matchingSpec: MatchingSpec): void;
  addListener(listener: SettingsListener): void;
  removeListener(listener: SettingsListener): void;
}

export interface SettingsFactory {
  create(serialized?: string): Settings;
}

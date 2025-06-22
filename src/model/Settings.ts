export type Theme = "auto" | "dark" | "light";

export interface SettingsListener {
  onchange: (settings: Settings) => void;
}

export interface Settings {
  readonly courts: number;
  readonly theme: Theme;
  readonly mexicanoRatio: number;
  serialize(): string;
  setCourts(courts: number): void;
  setTheme(theme: Theme): void;
  setMexicanoRatio(ratio: number): void;
  addListener(listener: SettingsListener): void;
}

export interface SettingsFactory {
  create(serialized?: string): Settings;
}

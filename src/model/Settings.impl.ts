import { Mutable } from "./Mutable";
import { Settings, SettingsFactory, SettingsListener, Theme } from "./Settings";

export const settingsFactory: SettingsFactory = {
  create(serialized?: string) {
    return new SettingsImpl(serialized);
  },
};

type CompactSettings = [number, Theme, number];

class SettingsImpl implements Mutable<Settings> {
  private listeners: SettingsListener[] = [];
  courts = 2;
  theme: Theme = "auto";
  mexicanoRatio = 0;

  constructor(serialized?: string) {
    if (serialized) {
      const settings = JSON.parse(serialized) as CompactSettings;
      this.courts = settings[0];
      this.theme = settings[1];
      this.mexicanoRatio = settings[2];
    }
  }

  serialize(): string {
    return JSON.stringify([
      this.courts,
      this.theme,
      this.mexicanoRatio,
    ] as CompactSettings);
  }

  setCourts(courts: number): void {
    this.courts = courts;
    this.notifyChange();
  }

  setTheme(theme: Theme): void {
    this.theme = theme;
    this.notifyChange();
  }

  setMexicanoRatio(ratio: number): void {
    this.mexicanoRatio = ratio;
    this.notifyChange();
  }

  addListener(listener: SettingsListener) {
    this.listeners.push(listener);
  }

  notifyChange() {
    this.listeners.forEach((listener) => listener.onchange(this));
  }
}

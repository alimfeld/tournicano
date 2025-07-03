import { Mutable } from "./Mutable";
import {
  Settings,
  SettingsData,
  SettingsFactory,
  SettingsListener,
  Theme,
} from "./Settings";
import { Americano, MatchingSpec } from "./Tournament.matching";

export const settingsFactory: SettingsFactory = {
  create(serialized?: string) {
    return new SettingsImpl(serialized);
  },
};

class SettingsImpl implements Mutable<Settings> {
  private listeners: SettingsListener[] = [];
  courts = 2;
  theme: Theme = "auto";
  matchingSpec: MatchingSpec = Americano;

  constructor(serialized?: string) {
    if (serialized) {
      const data = JSON.parse(serialized) as SettingsData;
      this.courts = data.courts;
      this.theme = data.theme;
      this.matchingSpec = data.matchingSpec;
    }
  }

  serialize(): string {
    return JSON.stringify({
      courts: this.courts,
      theme: this.theme,
      matchingSpec: this.matchingSpec,
    } as SettingsData);
  }

  setCourts(courts: number): void {
    this.courts = courts;
    this.notifyChange();
  }

  setTheme(theme: Theme): void {
    this.theme = theme;
    this.notifyChange();
  }

  setMatchingSpec(matchingSpec: MatchingSpec): void {
    this.matchingSpec = matchingSpec;
    this.notifyChange();
  }

  addListener(listener: SettingsListener) {
    this.listeners.push(listener);
  }

  notifyChange() {
    this.listeners.forEach((listener) => listener.onchange(this));
  }
}

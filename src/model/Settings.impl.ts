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
  debug: boolean = false;
  wakeLock: boolean = false;
  matchingSpec: MatchingSpec = Americano;

  constructor(serialized?: string) {
    if (serialized) {
      const data = JSON.parse(serialized) as SettingsData;
      this.courts = data.courts;
      this.theme = data.theme;
      this.wakeLock = data.wakeLock;
      this.debug = data.debug;
      this.matchingSpec = data.matchingSpec;
    }
  }

  serialize(): string {
    return JSON.stringify({
      courts: this.courts,
      theme: this.theme,
      debug: this.debug,
      wakeLock: this.wakeLock,
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

  enableWakeLock(enable: boolean): void {
    this.wakeLock = enable;
    this.notifyChange();
  }

  showDebug(debug: boolean): void {
    this.debug = debug;
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

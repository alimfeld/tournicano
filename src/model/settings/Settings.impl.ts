import { Mutable } from "../core/Mutable.ts";
import {
  AvatarSpec,
  Settings,
  SettingsData,
  SettingsFactory,
  SettingsListener,
  Theme,
} from "./Settings.ts";
import { Americano, MatchingSpec } from "../matching/MatchingSpec.ts";

export const settingsFactory: SettingsFactory = {
  create(serialized?: string) {
    return new SettingsImpl(serialized);
  },
};

class SettingsImpl implements Mutable<Settings> {
  private listeners: SettingsListener[] = [];
  courts = 2;
  theme: Theme = "auto";
  wakeLock: boolean = false;
  matchingSpec: MatchingSpec = Americano;
  avatarSpec: AvatarSpec = "bottts";

  constructor(serialized?: string) {
    if (serialized) {
      const data = JSON.parse(serialized) as SettingsData;
      this.courts = data.courts;
      this.theme = data.theme;
      this.wakeLock = data.wakeLock;
      this.matchingSpec = data.matchingSpec;
      this.avatarSpec = data.avatarSpec ?? "bottts";
    }
  }

  serialize(): string {
    return JSON.stringify({
      courts: this.courts,
      theme: this.theme,
      wakeLock: this.wakeLock,
      matchingSpec: this.matchingSpec,
      avatarSpec: this.avatarSpec,
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

  setMatchingSpec(matchingSpec: MatchingSpec): void {
    this.matchingSpec = matchingSpec;
    this.notifyChange();
  }

  setAvatarSpec(spec: AvatarSpec): void {
    this.avatarSpec = spec;
    this.notifyChange();
  }

  addListener(listener: SettingsListener) {
    this.listeners.push(listener);
  }

  removeListener(listener: SettingsListener) {
    this.listeners = this.listeners.filter(l => l !== listener);
  }

  notifyChange() {
    this.listeners.forEach((listener) => listener.onchange(this));
  }
}

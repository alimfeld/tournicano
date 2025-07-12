import m from "mithril";
import "./App.css";
import "./views/PlayersPage.ts";
import { SettingsPage } from "./views/SettingsPage.ts";
import { PlayersPage } from "./views/PlayersPage.ts";
import { RoundPage } from "./views/RoundPage.ts";
import { StandingsPage } from "./views/StandingsPage.ts";
import { Tournament, TournamentListener } from "./model/Tournament.ts";
import { Settings, SettingsListener, Theme } from "./model/Settings.ts";
import { tournamentFactory } from "./model/Tournament.impl.ts";
import { settingsFactory } from "./model/Settings.impl.ts";
import { HomePage } from "./views/HomePage.ts";

const PAGE_KEY = "page";
const SETTINGS_KEY = "settings";
const ROUND_KEY = "round";
const GROUP_KEY = "group";
const TOURNAMENT_KEY = "tournament";

export enum Page {
  HOME,
  SETTINGS,
  PLAYERS,
  ROUNDS,
  STANDINGS,
}

interface State {
  readonly tournament: Tournament;
  readonly settings: Settings;
  page: Page;
  roundIndex: number;
  group: number | undefined;
}

const syncTheme = (theme: Theme) => {
  let themeToApply = theme;
  if (theme === "auto") {
    themeToApply = window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }
  document.documentElement.setAttribute("data-theme", themeToApply);
};

const createState: () => State = () => {
  const storedGroup = localStorage.getItem(GROUP_KEY);
  const state = {
    tournament: tournamentFactory.create(
      localStorage.getItem(TOURNAMENT_KEY) || undefined,
    ),
    settings: settingsFactory.create(
      localStorage.getItem(SETTINGS_KEY) || undefined,
    ),
    page: parseInt(localStorage.getItem(PAGE_KEY) || `${Page.HOME}`),
    roundIndex: parseInt(localStorage.getItem(ROUND_KEY) || "-1"),
    group: storedGroup != null ? parseInt(storedGroup) : undefined,
  };
  // theme state is synced to DOM
  syncTheme(state.settings.theme);
  return state;
};

const settingsListener: SettingsListener = {
  onchange: (settings) => {
    localStorage.setItem(SETTINGS_KEY, settings.serialize());
    syncTheme(settings.theme);
  },
};

const tournamentListener: TournamentListener = {
  onchange: (tournament) => {
    localStorage.setItem(TOURNAMENT_KEY, tournament.serialize());
  },
};

export const App = () => {
  const state = createState();
  state.settings.addListener(settingsListener);
  state.tournament.addListener(tournamentListener);
  const nav = (page: Page) => {
    state.page = page;
    localStorage.setItem(PAGE_KEY, `${page}`);
    window.scrollTo(0, 0);
  };
  const changeRound = (index: number) => {
    state.roundIndex = index;
    localStorage.setItem(ROUND_KEY, `${index}`);
    window.scrollTo(0, 0);
  };
  const changeGroup = (group: number | undefined) => {
    state.group = group;
    if (group == undefined) {
      localStorage.removeItem(GROUP_KEY);
    } else {
      localStorage.setItem(GROUP_KEY, `${group}`);
    }
    window.scrollTo(0, 0);
  };

  return {
    view: () => {
      switch (state.page) {
        case Page.HOME: {
          return m(HomePage, {
            nav,
          });
        }
        case Page.SETTINGS: {
          return m(SettingsPage, {
            settings: state.settings,
            tournament: state.tournament,
            nav,
          });
        }
        case Page.PLAYERS: {
          return m(PlayersPage, {
            tournament: state.tournament,
            nav,
          });
        }
        case Page.ROUNDS: {
          return m(RoundPage, {
            settings: state.settings,
            tournament: state.tournament,
            roundIndex: state.roundIndex,
            changeRound,
            nav,
          });
        }
        case Page.STANDINGS: {
          return m(StandingsPage, {
            tournament: state.tournament,
            roundIndex: state.roundIndex,
            group: state.group,
            changeRound,
            changeGroup,
            nav,
          });
        }
      }
    },
  };
};

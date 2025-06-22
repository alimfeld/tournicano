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

export enum Page {
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
  const state = {
    tournament: tournamentFactory.create(
      localStorage.getItem("t") || undefined,
    ),
    settings: settingsFactory.create(localStorage.getItem("s") || undefined),
    page: parseInt(localStorage.getItem("p") || `${Page.PLAYERS}`),
    roundIndex: parseInt(localStorage.getItem("r") || "-1"),
  };
  // theme state is synced to DOM
  syncTheme(state.settings.theme);
  return state;
};

const settingsListener: SettingsListener = {
  onchange: (settings) => {
    localStorage.setItem("s", settings.serialize());
    syncTheme(settings.theme);
  },
};

const tournamentListener: TournamentListener = {
  onchange: (tournament) => {
    localStorage.setItem("t", tournament.serialize());
  },
};

export const App = () => {
  const state = createState();
  state.settings.addListener(settingsListener);
  state.tournament.addListener(tournamentListener);
  const nav = (page: Page) => {
    state.page = page;
    localStorage.setItem("p", `${page}`);
  };
  const changeRound = (index: number) => {
    state.roundIndex = index;
    localStorage.setItem("r", `${index}`);
  };

  return {
    view: () => {
      switch (state.page) {
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
            changeRound,
            nav,
          });
        }
      }
    },
  };
};

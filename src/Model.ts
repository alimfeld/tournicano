import { PlayerProps, Score, Tournament } from "./core.ts";

export enum View {
  SETTINGS,
  PLAYERS,
  ROUND,
  LEADERBOARD,
}

interface Config {
  view: View;
  roundIndex: number;
  courts: number;
  theme: string; // auto | dark | light
}

interface State {
  tournament: Tournament;
  config: Config;
}

interface Actions {
  changeView: (view: View) => void;
  createRound: (matchCount: number) => void;
  removeRound: (r: number) => void;
  enrollPlayers: (names: string[]) => void;
  updatePlayer: (id: string, props: PlayerProps) => void;
  removePlayer: (id: string) => void;
  updateScore: (r: number, m: number, score: Score | null) => void;
  changeRound: (roundIndex: number) => void;
  updateCourts: (courts: number) => void;
  resetTournament: () => void;
  resetAll: () => void;
  setTheme: (theme: string) => void;
}

export const createState: () => State = () => {
  const serialized = localStorage.getItem("tournament");
  const configItem = localStorage.getItem("config");
  const config = configItem
    ? (JSON.parse(configItem) as Config)
    : {
        view: View.PLAYERS,
        roundIndex: -1,
        courts: 2,
        theme: "auto",
      };
  const tournament = new Tournament(serialized ? serialized : undefined);
  // ensure roundIndex is within bounds
  if (config.roundIndex >= tournament.rounds.length) {
    config.roundIndex = tournament.rounds.length - 1;
  }
  // theme state is synced to DOM
  syncTheme(config.theme);
  return {
    tournament,
    config,
  };
};

const syncTheme = (theme: string) => {
  let themeToApply = theme;
  if (theme === "auto") {
    themeToApply = window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }
  document.documentElement.setAttribute("data-theme", themeToApply);
};

const storeTournament = (tournament: Tournament) => {
  localStorage.setItem("tournament", tournament.serialize());
};

const storeConfig = (config: Config) => {
  localStorage.setItem("config", JSON.stringify(config));
};

export const createActions: (state: State) => Actions = (state) => {
  return {
    changeView: (view: View) => {
      state.config.view = view;
      storeConfig(state.config);
    },
    createRound: (matchCount: number) => {
      state.tournament.createRound(matchCount);
      state.config.roundIndex = state.tournament.rounds.length - 1;
      storeTournament(state.tournament);
      storeConfig(state.config);
    },
    removeRound: (r: number) => {
      state.tournament.removeRound(r);
      if (state.config.roundIndex >= state.tournament.rounds.length) {
        state.config.roundIndex--;
        storeConfig(state.config);
      }
      storeTournament(state.tournament);
    },
    enrollPlayers: (names: string[]) => {
      state.tournament.enrollPlayers(names);
      storeTournament(state.tournament);
    },
    updatePlayer: (id: string, props: PlayerProps) => {
      state.tournament.updatePlayer(id, props);
      storeTournament(state.tournament);
    },
    removePlayer: (id: string) => {
      state.tournament.removePlayer(id);
      storeTournament(state.tournament);
    },
    updateScore: (r: number, m: number, score: Score | null) => {
      state.tournament.updateScore(r, m, score);
      storeTournament(state.tournament);
    },
    changeRound: (roundIndex: number) => {
      state.config.roundIndex = roundIndex;
      storeConfig(state.config);
    },
    updateCourts: (courts: number) => {
      state.config.courts = courts;
      storeConfig(state.config);
    },
    resetTournament: () => {
      state.tournament.reset();
      state.config.roundIndex = -1;
      storeConfig(state.config);
      storeTournament(state.tournament);
    },
    resetAll: () => {
      state.tournament = new Tournament();
      state.config.roundIndex = -1;
      storeConfig(state.config);
      storeTournament(state.tournament);
    },
    setTheme: (theme: string) => {
      state.config.theme = theme;
      syncTheme(theme);
      storeConfig(state.config);
    },
  };
};

export interface Attrs {
  state: State;
  actions: Actions;
}

import { PlayerProps, Score, Tournament } from "./core.ts";

export enum View {
  SETTINGS,
  PLAYERS,
  ROUND,
  LEADERBOARD,
}

interface StoredState {
  view: View;
  tournament: string;
  avatarStyle: string;
  roundIndex: number;
  courts: number;
}

interface State {
  view: View;
  tournament: Tournament;
  avatarStyle: string;
  roundIndex: number;
  courts: number;
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
}

export const createState: () => State = () => {
  const item = localStorage.getItem("state");
  const data = item ? (JSON.parse(item) as StoredState) : null;
  const tournament = new Tournament(data?.tournament);
  return {
    view: data ? data.view : View.PLAYERS,
    tournament: tournament,
    avatarStyle: data?.avatarStyle || "bottts",
    roundIndex: data?.roundIndex || tournament.rounds.length - 1,
    courts: data?.courts || 2,
  };
};

const storeState: (state: State) => void = (state) => {
  const data: StoredState = {
    view: state.view,
    tournament: state.tournament.serialize(),
    avatarStyle: state.avatarStyle,
    roundIndex: state.roundIndex,
    courts: state.courts,
  };
  const item = JSON.stringify(data);
  localStorage.setItem("state", item);
};

export const createActions: (state: State) => Actions = (state) => {
  return {
    changeView: (view: View) => {
      state.view = view;
      storeState(state);
    },
    createRound: (matchCount: number) => {
      state.tournament.createRound(matchCount);
      state.roundIndex = state.tournament.rounds.length - 1;
      storeState(state);
    },
    removeRound: (r: number) => {
      state.tournament.removeRound(r);
      if (state.roundIndex >= state.tournament.rounds.length) {
        state.roundIndex--;
      }
      storeState(state);
    },
    enrollPlayers: (names: string[]) => {
      state.tournament.enrollPlayers(names);
      storeState(state);
    },
    updatePlayer: (id: string, props: PlayerProps) => {
      state.tournament.updatePlayer(id, props);
      storeState(state);
    },
    removePlayer: (id: string) => {
      state.tournament.removePlayer(id);
      storeState(state);
    },
    updateScore: (r: number, m: number, score: Score | null) => {
      state.tournament.updateScore(r, m, score);
      storeState(state);
    },
    changeRound: (roundIndex: number) => {
      state.roundIndex = roundIndex;
      storeState(state);
    },
    updateCourts: (courts: number) => {
      state.courts = courts;
      storeState(state);
    },
  };
};

export interface Attrs {
  state: State;
  actions: Actions;
}

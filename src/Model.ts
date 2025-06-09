import { PlayerProps, Score, Tournament } from "./core.ts"

export enum View {
  PLAYERS,
  ROUND,
}

interface StoredState {
  view: View;
  tournament: string;
  avatarStyle: string;
}

interface State {
  view: View;
  tournament: Tournament;
  avatarStyle: string;
};

interface Actions {
  changeView: (view: View) => void;
  createRound: (matchCount: number) => void;
  enrollPlayers: (names: string[]) => void;
  updatePlayer: (id: string, props: PlayerProps) => void;
  updateScore: (r: number, m: number, score: Score) => void;
}

export const createState: () => State = () => {
  const item = localStorage.getItem("state");
  const data = item ? (JSON.parse(item) as StoredState) : null
  return {
    view: data?.view || View.PLAYERS,
    tournament: new Tournament(data?.tournament),
    avatarStyle: data?.avatarStyle || "bottts"
  }
}

const storeState: (state: State) => void = (state) => {
  const data: StoredState = {
    view: state.view,
    tournament: state.tournament.serialize(),
    avatarStyle: state.avatarStyle,
  }
  const item = JSON.stringify(data);
  localStorage.setItem("state", item);
}

export const createActions: (state: State) => Actions = (state) => {
  return {
    changeView: (view: View) => {
      state.view = view;
      storeState(state)
    },
    createRound: (matchCount: number) => {
      state.tournament.createRound(matchCount);
      storeState(state)
    },
    enrollPlayers: (names: string[]) => {
      state.tournament.enrollPlayers(names);
      storeState(state)
    },
    updatePlayer: (id: string, props: PlayerProps) => {
      state.tournament.updatePlayer(id, props);
      storeState(state)
    },
    updateScore: (r: number, m: number, score: Score) => {
      state.tournament.updateScore(r, m, score);
      storeState(state)
    },
  }
}

export interface Attrs {
  state: State
  actions: Actions
}


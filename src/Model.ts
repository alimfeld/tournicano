import { PlayerProps, Score, Tournament } from "./core.ts"

interface StoredState {
  tournament: string;
  avatarStyle: string;
}

interface State {
  tournament: Tournament;
  avatarStyle: string;
};

interface Actions {
  createRound: (matchCount: number) => void;
  enrollPlayers: (names: string[]) => void;
  updatePlayer: (id: string, props: PlayerProps) => void;
  updateScore: (r: number, m: number, score: Score) => void;
}

export const createState: () => State = () => {
  const item = localStorage.getItem("state");
  const data = item ? (JSON.parse(item) as StoredState) : null
  return {
    tournament: new Tournament(data?.tournament),
    avatarStyle: data?.avatarStyle || "bottts"
  }
}

const storeState: (state: State) => void = (state) => {
  const data: StoredState = {
    tournament: state.tournament.serialize(),
    avatarStyle: state.avatarStyle,
  }
  const item = JSON.stringify(data);
  localStorage.setItem("state", item);
}

export const createActions: (state: State) => Actions = (state) => {
  return {
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


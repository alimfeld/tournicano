import m from "mithril";
import "./App.css";
import "./views/PlayersView.ts";
import { PlayersView } from "./views/PlayersView.ts";
import { RoundView } from "./views/RoundView.ts";
import { createActions, createState } from "./Model.ts";

export const App = () => {
  const state = createState();
  const actions = createActions(state);
  return {
    view: () => {
      return m("main", { class: "container" },
        m(PlayersView, { state, actions }),
        m(RoundView, { state, actions }),
      )
    },
  };
};

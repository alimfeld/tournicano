import m from "mithril";
import "./App.css";
import "./views/PlayersView.ts";
import { createActions, createState, View } from "./Model.ts";
import { SettingsView } from "./views/SettingsView.ts";
import { PlayersView } from "./views/PlayersView.ts";
import { RoundView } from "./views/RoundView.ts";
import { Leaderboard } from "./views/Leaderboard.ts";

export const App = () => {
  const state = createState();
  const actions = createActions(state);

  return {
    view: () => {
      switch (state.view) {
        case View.SETTINGS: {
          return m(SettingsView, { state, actions });
        }
        case View.PLAYERS: {
          return m(PlayersView, { state, actions });
        }
        case View.ROUND: {
          return m(RoundView, { state, actions });
        }
        case View.LEADERBOARD: {
          return m(Leaderboard, { state, actions });
        }
      }
    },
  };
};

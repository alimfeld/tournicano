import m from "mithril";
import "./App.css";
import "./views/PlayersView.ts";
import { PlayersView } from "./views/PlayersView.ts";
import { RoundView } from "./views/RoundView.ts";
import { createActions, createState, View } from "./Model.ts";

export const App = () => {
  const state = createState();
  const actions = createActions(state);
  const renderMain = () => {
    switch (state.view) {
      case View.PLAYERS: {
        return m(PlayersView, { state, actions });
      }
      case View.ROUND: {
        return m(RoundView, { state, actions });
      }
    }
  }
  const renderFooterChildren = () => {
    switch (state.view) {
      case View.PLAYERS: {
        return [
          m("div"),
          m("button", { onclick: () => actions.changeView(View.ROUND) }, "Round >")
        ];
      }
      case View.ROUND: {
        return [
          m("button", { onclick: () => actions.changeView(View.PLAYERS) }, "< Players"),
          m("button", { onclick: () => actions.createRound(1) }, "New Round!"),
        ];
      }
    }
  }

  return {
    view: () => {
      return m("div.container",
        m("header", m("h1", "Tournicano")),
        renderMain(),
        m("footer", renderFooterChildren()),
      )
    },
  };
};

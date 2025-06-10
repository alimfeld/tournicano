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
  const renderHeader = () => {
    switch (state.view) {
      case View.PLAYERS: {
        return m("header",
          m("h1", "Tournicano"),
          m("button.outline", { onclick: () => actions.changeView(View.ROUND) }, "🎾"),
        );
      }
      case View.ROUND: {
        return m("header",
          m("button.outline", { onclick: () => actions.changeView(View.PLAYERS) }, "👤"),
          m("h1", `Round ${state.roundIndex + 1}`),
        );
      }
    }
  }
  const renderFooter = () => {
    switch (state.view) {
      case View.PLAYERS: {
        return m("footer");
      }
      case View.ROUND: {
        return m("footer", m("button.outline", {
          disabled: state.roundIndex == 0,
          onclick: () => actions.changeRound(state.roundIndex - 1)
        }, "⏪"),
          m("button.outline", {
            onclick: () => actions.createRound(state.matchesPerRound)
          }, "🆕"),
          m("button.outline", {
            disabled: state.roundIndex == state.tournament.rounds.length - 1,
            onclick: () => actions.changeRound(state.roundIndex + 1)
          }, "⏩"),
        );
      }
    }
  }

  return {
    view: () => {
      return m("div.container",
        renderHeader(),
        renderMain(),
        renderFooter(),
      )
    },
  };
};

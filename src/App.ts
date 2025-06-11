import m from "mithril";
import "./App.css";
import "./views/PlayersView.ts";
import { PlayersView } from "./views/PlayersView.ts";
import { RoundView } from "./views/RoundView.ts";
import { createActions, createState, View } from "./Model.ts";
import { Leaderboard } from "./views/Leaderboard.ts";

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
      case View.LEADERBOARD: {
        return m(Leaderboard, { state, actions });
      }
    }
  }
  const renderHeader = () => {
    switch (state.view) {
      case View.PLAYERS: {
        const [active, total] = state.tournament.players.values().reduce((acc, player) => {
          if (player.active) {
            acc[0]++
          }
          acc[1]++
          return acc;
        }, [0, 0])
        const indicator = active == total ? active : `${active}/${total}`
        return m("header",
          m("div"),
          m("h1", `👤 Players (${indicator})`),
          m("button.outline", { onclick: () => actions.changeView(View.ROUND) }, "🚀"),
        );
      }
      case View.ROUND: {
        const title = state.roundIndex >= 0 ?
          state.roundIndex == state.tournament.rounds.length - 1 ?
            `🚀 Round ${state.roundIndex + 1}` :
            `🚀 Round ${state.roundIndex + 1}/${state.tournament.rounds.length}` :
          "🚀 Start";

        return m("header",
          m("button.outline", { onclick: () => actions.changeView(View.PLAYERS) }, "👤"),
          m("h1", title),
          m("button.outline", { onclick: () => actions.changeView(View.LEADERBOARD) }, "🏆"),
        );
      }
      case View.LEADERBOARD: {
        return m("header",
          m("button.outline", { onclick: () => actions.changeView(View.ROUND) }, "🚀"),
          m("h1", "🏆 Leaderboard"),
          m("div"),
        );
      }
    }
  }

  return {
    view: () => {
      return m("div.container",
        renderHeader(),
        renderMain(),
      )
    },
  };
};

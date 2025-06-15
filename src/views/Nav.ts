import m from "mithril";
import { View } from "../Model.ts";

export interface NavAttrs {
  changeView: (view: View) => void;
}

export const Nav: m.Component<NavAttrs, {}> = {
  view: ({ attrs: { changeView } }) => {
    return m(
      "nav",
      m(
        "ul",
        m("li", { onclick: () => changeView(View.SETTINGS) }, "⚙️"),
        m("li", { onclick: () => changeView(View.PLAYERS) }, "🤖"),
        m("li", { onclick: () => changeView(View.ROUND) }, "🚀"),
        m("li", { onclick: () => changeView(View.LEADERBOARD) }, "🏆"),
      ),
    );
  },
};

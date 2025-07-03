import m from "mithril";
import { Page } from "../App.ts";

export interface NavAttrs {
  nav: (page: Page) => void;
}

export const NavView: m.Component<NavAttrs, {}> = {
  view: ({ attrs: { nav } }) => {
    return m(
      "nav",
      m(
        "ul",
        m("li", { onclick: () => nav(Page.HOME) }, "🏠"),
        m("li", { onclick: () => nav(Page.SETTINGS) }, "⚙️"),
        m("li", { onclick: () => nav(Page.PLAYERS) }, "🤖"),
        m("li", { onclick: () => nav(Page.ROUNDS) }, "🚀"),
        m("li", { onclick: () => nav(Page.STANDINGS) }, "🏆"),
      ),
    );
  },
};

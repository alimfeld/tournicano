import m from "mithril";
import "./Nav.css";
import { Page } from "../App.ts";

export interface NavAttrs {
  nav: (page: Page) => void;
  currentPage: Page;
}

export const Nav: m.Component<NavAttrs> = {
  view: ({ attrs: { nav, currentPage } }) => {
    return m(
      "nav",
      m(
        "ul",
        m("li", {
          class: currentPage === Page.HOME ? "active" : "",
          onclick: () => nav(Page.HOME)
        }, "🏠"),
        m("li", {
          class: currentPage === Page.SETTINGS ? "active" : "",
          onclick: () => nav(Page.SETTINGS)
        }, "⚙️"),
        m("li", {
          class: currentPage === Page.PLAYERS ? "active" : "",
          onclick: () => nav(Page.PLAYERS)
        }, "🤖"),
        m("li", {
          class: currentPage === Page.ROUNDS ? "active" : "",
          onclick: () => nav(Page.ROUNDS)
        }, "🚀"),
        m("li", {
          class: currentPage === Page.STANDINGS ? "active" : "",
          onclick: () => nav(Page.STANDINGS)
        }, "🏆"),
      ),
    );
  },
};

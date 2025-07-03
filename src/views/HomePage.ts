import m from "mithril";
import "./HomePage.css";
import { NavView } from "./NavView.ts";
import { Page } from "../App.ts";

export interface HomeAttrs {
  nav: (page: Page) => void;
}

export const HomePage: m.Component<HomeAttrs> = {
  view: ({ attrs: { nav } }) => {
    return [
      m("header.home.container-fluid", m("h1", "Tournicano")),
      m(NavView, { nav }),
      m("main.home.container-fluid"),
    ];
  },
};

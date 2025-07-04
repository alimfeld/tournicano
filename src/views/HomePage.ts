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
      m(
        "main.home.container-fluid",
        m("h2", "What is it?"),
        m(
          "p",
          "Tournicano is a (web) app for running ad-hoc *icano (e.g., Americano, Mexicano, or similar) doubles tournaments.",
        ),
        m("h2", "Features"),
        m(
          "ul",
          m("li", "🤖 Simple player management"),
          m("li", "🚀 Easy round management"),
          m("li", "🏆 Live standings"),
          m("li", "⚙️ Graph-algorithm-powered matching"),
          m("li", "🤝 Fair distribution of court time"),
          m("li", "🧑‍🎤 Player avatar display"),
        ),
        m("h2", "Matching"),
        m(
          "p",
          "Players form teams, and teams are paired into matches using a graph algorithm to find a (perfect) maximum-weight matching.",
        ),
        m("p", "The algorithm considers the following factors:"),
        m(
          "ul",
          m("li", "🎭 Variety – rotating partners and opponents"),
          m("li", "📈 Performance - creating balanced matches"),
          m("li", "👥 Groups - accommodating formats like mixed doubles"),
        ),
        m("h2", "Out of scope"),
        m(
          "ul",
          m("li", "🗄️ Player / tournament database"),
          m(
            "li",
            "🌐 Integration with third-party services (e.g., for ratings)",
          ),
          m("li", "🔁 Data import / export (beyond 📋 clipboard)"),
          m("li", "📱 Features likely covered by your existing system"),
        ),
        m(
          "p",
          "To time matches, use your phone’s ⏱️ stopwatch. To keep the 💡 screen on, check your device’s display settings.",
        ),
      ),
    ];
  },
};

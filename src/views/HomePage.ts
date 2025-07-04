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
          "Tournicano is a (web) app to run ad-hoc *icano (i.e. Americano, Mexicano, or similar) doubles tournaments.",
        ),
        m("h2", "Features"),
        m(
          "ul",
          m("li", "🤖 Simple player management"),
          m("li", "🚀 Simple round management"),
          m("li", "🏆 Live standings"),
          m("li", "⚙️ Graph algorithm powered matching"),
          m("li", "🤝 Fair distribution of court time"),
          m("li", "🤖 Player avatar display"),
        ),
        m("h2", "Matching"),
        m(
          "p",
          "Teams are formed from players and matches from teams using a graph algorithm to find a (perfect) maximum weight matching.",
        ),
        m("p", "The algorithm takes the following factors into account:"),
        m(
          "ul",
          m("li", "🎭 Variety (rotating partners & opponents)"),
          m("li", "📈 Performance (balanced matches)"),
          m("li", "👥 Group (e.g. for mixed doubles)"),
        ),
        m("h2", "Not in scope"),
        m(
          "ul",
          m("li", "🗄️ Player / Tournament database"),
          m("li", "🌐 Integration with 3rd party services (e.g. for ratings)"),
          m("li", "🔁 Data import / export (beyond 📋 clipboard)"),
          m("li", "📱 Features probably already offered by your system"),
        ),
        m(
          "p",
          "For timing matches you may use your phone's ⏱️ stopwatch. To keep the 💡 screen on, check your system's settings.",
        ),
      ),
    ];
  },
};

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
        m("h2", "👉 What is it?"),
        m(
          "p",
          "Tournicano is a (web) app for running ad-hoc *icano (e.g., Americano, Mexicano, or similar) doubles tournaments.",
        ),
        m("h2", "✨ Features"),
        m(
          "ul",
          m("li", "🤖 Simple player management"),
          m("li", "🚀 Easy round management"),
          m("li", "🏆 Live standings"),
          m("li", "🔗 Graph-algorithm-powered matching"),
          m("li", "🤝 Fair distribution of court time"),
          m("li", "🧑‍🎤 Player avatar display"),
          m("li", "📦 Installable (add to home screen)"),
        ),
        m("h2", "🤖 Player Management"),
        m(
          "p",
          "Players are added by typing or pasting their names into a text box. Each line of input will form a group. Player names are separated by spaces, so each player is identified by a single name. Each name maps to an avatar image, which will be displayed for the player.",
        ),
        m(
          "p",
          "Players can be activated or 💤 deactivated using a switch. A deactivated player will not be considered for participation in the next round.",
        ),
        m(
          "p",
          "Any player that hasn't yet participated in a round can be ❌ deleted.",
        ),
        m("h2", "🚀 Round Management"),
        m(
          "p",
          "At any time a 🆕 new round can be created by pressing the respective button. The number of matches created for the new round depends on the number of available courts (configured in ⚙️ Settings) and the number of active players at that point in time.",
        ),
        m(
          "p",
          "For each match there is an input to enter the 📝 score. A score must be entered using 🔢 four digits, with leading zeroes where required. The first two digits represent the points scored by the team on the left, and the last two digits represent the points scored by the team on the right. Scores above 99 points are not supported. To enter a score of e.g. 8:11, input '0811'.",
        ),
        m("p", "The last round can be ❌ deleted."),
        m("h3", "🔗 Matching"),
        m(
          "p",
          "In each round, players form teams, and teams are paired into matches using a graph algorithm to find a (perfect) maximum-weight matching.",
        ),
        m("p", "The algorithm considers the following factors:"),
        m(
          "ul",
          m("li", "🎭 Variety – rotating partners and opponents"),
          m("li", "📈 Performance - creating balanced matches"),
          m("li", "👥 Groups - accommodating formats like mixed doubles"),
        ),
        m("p", "The factors can be fine-tuned in the ⚙️Settings."),
        m("h2", "🚫 Out of scope"),
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
          "To time rounds, you may use your phone’s ⏱️ stopwatch. Alternatively, you can end a round once the first match finishes.",
        ),
        m(
          "p",
          "To keep the 💡 screen on, check your device’s display settings.",
        ),
      ),
    ];
  },
};

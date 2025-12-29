import m from "mithril";
import { Header } from "./Header.ts";
import { Nav } from "./Nav.ts";
import { Page } from "../App.ts";

export interface HomeAttrs {
  nav: (page: Page) => void;
  currentPage: Page;
}

export const HomePage: m.Component<HomeAttrs> = {
  view: ({ attrs: { nav, currentPage } }) => {
    return [
      m(Header, { title: "Tournicano" }),
      m(
        "main.home.container",
        m("h2", "👉 What is it?"),
        m(
          "p",
          m("a", { href: "https://github.com/alimfeld/tournicano", target: "_blank", rel: "noopener noreferrer" }, "Tournicano"),
          " is a (web) app for running ad-hoc ",
          m("i", "-icano"),
          " (e.g., Americano, Mexicano, or similar) doubles tournaments.",
        ),
        m("h2", "✨ Features"),
        m(
          "ul",
          m("li", "⚡ Simplicity – Minimal setup, intuitive controls"),
          m("li", "🔄 Flexibility – Dynamic settings and player management"),
          m("li", "⚖️ Fairness – Balanced court time, equal opportunities"),
          m("li", "🔀 Variety – Rotating partners, diverse opponents"),
          m("li", "👁️ Visibility – Live standings, real-time tracking"),
          m("li", "👤 Recognizability – Unique avatars distinguish players"),
          m("li", "🎯 Versatility – Multiple tournament modes and strategies"),
          m("li", "📲 Portability – Installable, offline-ready"),
        ),
        m("h2", "⚡ Quick Start"),
        m(
          "ol",
          m("li", "⚙️ Settings: Set courts and matching strategy"),
          m("li", "🤖 Players: Add players"),
          m("li", "🚀 Rounds: Create matches, enter scores, repeat"),
          m("li", "🏆 Standings: View rankings"),
        ),
        m("h2", { id: "player-management" }, "🤖 Player Management"),
        m("h3", "Player Status"),
        m(
          "p",
          "Players have two status levels: ",
          m("b", "active"),
          " (available for new rounds) and ",
          m("b", "participating"),
          " (included in rounds).",
        ),
        m(
          "p",
          m("b", "Active players"),
          " are available when creating new rounds. Players can be activated or deactivated at any time to manage breaks and availability.",
        ),
        m(
          "p",
          m("b", "Participating players"),
          " are those who have been included in any round (either in a match or paused). They appear in standings if they have scores and cannot be deleted unless all rounds are deleted.",
        ),
        m("h3", "Groups"),
        m(
          "p",
          "Groups organize players for tournament formats. Groups A-D are represented as poker suits (♠ ♥ ♦ ♣).",
        ),
        m("h2", { id: "round-management" }, "🚀 Round Management"),
        m(
          "p",
          "Rounds are created on-demand based on available courts and active players. When demand exceeds courts, an algorithm ensures fair rotation by prioritizing players with fewer matches.",
        ),
        m(
          "p",
          "Scores can be entered and modified at any time. The last round can be deleted, or all rounds can be deleted entirely while preserving player registration.",
        ),
        m("h2", { id: "standings" }, "🏆 Standings"),
        m(
          "p",
          "Players are ranked by win percentage with plus/minus (point differential) as tiebreaker. Standings can be filtered by group or viewed overall.",
        ),
        m(
          "p",
          "For players who haven't participated in all rounds, the participation count is shown (e.g., '6/8') to provide context when comparing statistics.",
        ),
        m(
          "p",
          "Standings can be exported as formatted text or complete JSON data.",
        ),
        m("h2", { id: "matching" }, "🤝 Matching"),
        m(
          "p",
          "Players form teams and teams are paired into matches using an algorithm that balances variety (rotating partners/opponents), performance (skill-based matching), and groups (format requirements). All factors are soft constraints—the algorithm finds the best possible matches given available players.",
        ),
        m("h3", "Tournament Modes"),
        m(
          "p",
          "Choose from predefined modes, each with different group requirements:",
        ),

        m("dl", [
          m("dt", "🎯 Americano"),
          m("dd", "Focuses on variety, maximizing partner and opponent rotation. Groups: None • Players: 4+ (8+ recommended)"),

          m("dt", "🎯 Americano Mixed"),
          m("dd", "Americano for mixed doubles. Teams consist of one player from each of two groups. Groups: Designed for 2 (A, B) • Players: 4+ with 2+ per group (12+ recommended)"),

          m("dt", "🎯 Americano Mixed Balanced"),
          m("dd", "Americano Mixed with strict group balancing. Ensures equal number of players from each group participate in every round. Groups: Designed for 2 (A, B) • Players: 4+ with 2+ per group, equal numbers recommended"),

          m("dt", "🎯 Mexicano"),
          m("dd", "Emphasizes competitive balance. Forms teams based on rankings (1st with 3rd, 2nd with 4th) and matches similarly skilled teams. Requires score entry. Groups: None • Players: 4+ (8+ recommended)"),

          m("dt", "🎯 Tournicano"),
          m("dd", "Balances variety, performance, and group mix for well-rounded competition. Groups: 1 or 2 (1=all together, 2=one from each group) • Players: 4+ (8+ recommended)"),

          m("dt", "🎯 Group Battle"),
          m("dd", "Competition between two groups. Players pair within their own group, then groups compete against each other. Groups: Designed for 2 (Side A, Side B) • Players: 4+ with 2+ per side (12+ recommended)"),

          m("dt", "🎯 Group Battle Mixed"),
          m("dd", "Group Battle for mixed doubles. Each side has two groups where players from different groups pair together. Groups: Designed for 4 (Side 1: A+B, Side 2: C+D) • Players: 4+ with 1+ per group (16+ recommended)")
        ]),

        m("h3", "Customization"),
        m(
          "p",
          "Custom strategies can be created by adjusting factors in two categories: ",
          m("b", "Team Formation"),
          " (partner rotation, skill matching, group pairing) and ",
          m("b", "Match Pairing"),
          " (opponent rotation, skill balance, group mix). Each factor can be weighted 0-100%.",
        ),
        m("h2", { id: "installation" }, "📲 Installation"),
        m(
          "p",
          "Tournicano is a Progressive Web App (PWA) that can be installed on iOS, Android, and desktop platforms for offline use.",
        ),
        m("h2", { id: "updates" }, "🔄 Updates"),
        m(
          "p",
          "Updates are detected automatically when online. Users choose when to apply updates.",
        ),
      ),
      m(Nav, { nav, currentPage }),
    ];
  },
};

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
        m(
          "p",
          "Run smooth -icano doubles tournaments with minimal setup. Automatic player pairing, live standings, and fair rotation. Supports Americano, Mexicano, and other formats."
        ),
        m("h2", "⚡ Quick Start"),
        m(
          "ol",
          m("li", "⚙️ Set courts and matching strategy"),
          m("li", "🤖 Add players"),
          m("li", "🚀 Create rounds, play matches, enter scores, repeat"),
          m("li", "🏆 View standings"),
        ),
        m("h2", "🤖 Player Management"),
        m(
          "p",
          "Players can be organized into groups to support different tournament formats."
        ),
        m(
          "p",
          "Players can be set as active to make them available for new rounds. Once a player is included in any round, they become a participating player and appear in standings with their scores and stats."
        ),
        m("h2", "🚀 Round Management"),
        m(
          "p",
          "Rounds are created based on available courts, active players, and the selected tournament format. Players with fewer matches are prioritized to ensure fair rotation."
        ),
        m(
          "p",
          "Scores can be entered and modified at any time and immediately update the standings."
        ),
        m("h2", "🏆 Standings"),
        m(
          "p",
          "Players are ranked by win percentage with point differential as tiebreaker."
        ),
        m("h2", "🤝 Matching"),
        m(
          "p",
          "Players form teams and teams are paired into matches using an algorithm that balances variety (rotating partners/opponents), performance (skill-based matching), and groups (format requirements)."
        ),
        m(
          "p",
          "Choose from predefined tournament modes in Settings, or create custom strategies by adjusting team formation and match pairing factors."
        ),
        m("h2", "📲 Installation & Updates"),
        m(
          "p",
          "Install Tournicano on any device for offline use. Updates are detected automatically when online and can be applied when convenient."
        ),
      ),
      m(Nav, { nav, currentPage }),
    ];
  },
};

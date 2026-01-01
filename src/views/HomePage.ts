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
      m(Header, { 
        title: "Tournicano",
        actions: [
          {
            icon: "↗",
            label: "View on GitHub",
            onclick: () => {
              window.open("https://github.com/alimfeld/tournicano", "_blank", "noopener,noreferrer");
            }
          }
        ]
      }),
      m(
        "main.home.container",
        m(
          "p",
          "Organize doubles tournaments with automatic player pairing and fair rotation. Perfect for padel, pickleball, tennis, or any doubles sport. Set up in minutes, no tournament management experience required."
        ),
        m("h2", "✨ Key Features"),
        m(
          "ul",
          m("li", "🚀 Automatic pairing ensures variety and fair competition"),
          m("li", "⚙️ Flexible formats: Americano, Mexicano, mixed doubles, and custom modes"),
          m("li", "🏆 Live standings with win percentage and point differential"),
          m("li", "📲 Works offline - install as an app, no internet required"),
          m("li", "🔒 Privacy-first - no accounts needed, all data stays on your device")
        ),
        m("h2", "⚡ Quick Start"),
        m(
          "ol",
          m("li", "⚙️ Configure number of courts and tournament format"),
          m("li", "🤖 Add your players"),
          m("li", "🚀 Generate rounds automatically, play matches, track scores"),
          m("li", "🏆 View live standings and stats"),
        ),
        m("h2", "🤖 Players"),
        m(
          "p",
          "Add players anytime, even during the tournament. Organize them into groups for mixed doubles or team-based formats."
        ),
        m(
          "p",
          "Mark players as active or inactive to control who plays in each round. Players who participate in rounds appear in standings with their scores and stats."
        ),
        m("h2", "🚀 Rounds & Scoring"),
        m(
          "p",
          "Generate rounds automatically based on available courts, active players, and your chosen format. The system prioritizes players with fewer matches to ensure everyone gets equal playing time."
        ),
        m(
          "p",
          "Enter and modify scores anytime - standings update instantly."
        ),
        m("h2", "🏆 Standings"),
        m(
          "p",
          "Players are ranked by win percentage, with point differential (+/-) as the tiebreaker."
        ),
        m("h2", "⚙️ Tournament Formats"),
        m(
          "p",
          "Tournicano creates matches by balancing three factors:"
        ),
        m(
          "ul",
          m("li", m("strong", "Variety"), " - Rotate partners and opponents"),
          m("li", m("strong", "Performance"), " - Pair by skill level"),
          m("li", m("strong", "Groups"), " - Control team composition")
        ),
        m(
          "p",
          "Select from predefined formats or create custom strategies in Settings."
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

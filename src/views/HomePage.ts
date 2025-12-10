import m from "mithril";
import "./HomePage.css";
import { BUILD_VERSION } from "../version.ts";

export interface HomeAttrs {}

export const HomePage: m.Component<HomeAttrs> = {
  view: () => {
    return [
      m("header.home.container-fluid", m("h1", "Tournicano")),
      m(
        "main.home.container-fluid",
        m("div.version", m("span", `v${BUILD_VERSION}`)),
        m("h2", "👉 What is it?"),
        m(
          "p",
          m("a", { href: "https://github.com/alimfeld/tournicano" }, "Tournicano"),
          " is a (web) app for running ad-hoc ",
          m("i", "-icano"),
          " (e.g., Americano, Mexicano, or similar) doubles tournaments.",
        ),
        m("h2", "✨ Features"),
        m(
          "ul",
          m("li", "Simple 🤖 player management"),
          m("li", "Easy 🚀 round management"),
          m("li", "Live 🏆 standings"),
          m("li", "Graph-algorithm-powered matching"),
          m("li", "Fair distribution of court time"),
          m("li", "Player avatar display"),
          m("li", "Installable (add to home screen)"),
        ),
        m("h2", "🤖 Player Management"),
        m(
          "p",
          "Players are added by typing or pasting their names into a text field. Player names can consist of multiple words and are separated by commas or periods. (Note: On many devices, double-tapping the space bar produces a period.) Each name maps to a consistent avatar image that will be displayed for the player.",
        ),
        m(
          "p",
          "Players can be assigned to groups. Separate groups of players with a newline when entering their names. A maximum of 4 groups is supported.",
        ),
        m(
          "p",
          "Players can be added at any time during the tournament. As soon as they are added, they become available for any newly created round.",
        ),
        m(
          "p",
          "Players can be activated or deactivated using a switch. While deactivated, a player will not be considered for participation in any newly created round.",
        ),
        m(
          "p",
          "A filter allows displaying all, only active, or only inactive players. The filter is only shown when at least one player is registered.",
        ),
        m(
          "p",
          "Individual player actions are available via a ☰ hamburger menu next to each player (visible when registration is open): delete players who haven't yet participated in a round, or reassign players to adjacent groups using the ↑ and ↓ menu options.",
        ),
        m(
          "p",
          "Global player actions are available via the ⋮ button: open/close registration to reduce UI clutter, activate/deactivate all players, delete all players (which will also reset the tournament), or ⿻ share/export all player names for later import.",
        ),
        m(
          "p",
          m("b", "Note"),
          ": Player names must be unique. Any non-unique names are ignored when adding players.",
        ),
        m("h2", "🚀 Round Management"),
        m(
          "p",
          "At any time, a new round can be created by pressing the respective button. The button changes color to green when all matches have scores submitted, indicating it's a good time to create the next round.",
        ),
        m(
          "p",
          "The number of matches created for the new round depends on the number of available courts (configured in ⚙️ Settings) and the number of active players at that point in time.",
        ),
        m(
          "p",
          "Excess players are 💤 paused for the round using an algorithm that balances each player's play ratio (i.e., the number of matches played over the number of rounds the player participated in).",
        ),
        m(
          "p",
          "For each match, there is a button to enter the score. Scores can be entered using a maximum of two digits per team, separated by a colon (e.g., 21:15). Scores can also be cleared.",
        ),
        m(
          "p",
          "You can navigate back and forth between rounds and change scores of previously completed rounds.",
        ),
        m("p", "Some quick actions are available via the ⋮ button. The most recent round can be deleted, the tournament can be restarted (deleting all rounds), full screen can be toggled, and debug information can be displayed. Additionally, you can ⏿ prevent the screen from turning off when showing the round.",
        ),
        m("h2", "🏆 Standings"),
        m(
          "p",
          "Live standings show the players ranked by win percentage, with plus/minus as a tiebreaker.",
        ),
        m(
          "p",
          "A reliability indicator shows data quality based on player participation. The win percentage box and bar are color-coded from red (unreliable) to green (reliable), reflecting the ratio of rounds played or paused versus total rounds. The bar beneath the win percentage visualizes the exact reliability score.",
        ),
        m(
          "p",
          "You can navigate back and forth to see the standings of any specific round.",
        ),
        m(
          "p",
          "When players are assigned to different groups, you can show standings overall and per group.",
        ),
        m("h2", "🤝 Matching"),
        m(
          "p",
          'In each round, players form teams ("team up"), and teams are paired into matches ("match up") using a graph algorithm to find a (perfect) maximum-weight matching.',
        ),
        m("p", "The algorithm considers the following factors:"),
        m(
          "ul",
          m("li", m("b", "Variety"), " – rotating partners and opponents"),
          m("li", m("b", "Performance"), " – creating balanced matches"),
          m(
            "li",
            m("b", "Groups"),
            " – accommodating formats like mixed doubles",
          ),
        ),
        m(
          "p",
          "Use a predefined matching (such as Americano or Mexicano) or customize it under ⚙️ Settings.",
        ),
        m(
          "p",
          m("b", "Note"),
          ": For performance-based matching to be effective, scores must be entered. For group-based matching to be effective, multiple player groups must be created.",
        ),
        m("h2", "🚫 Out of scope"),
        m(
          "ul",
          m("li", "Player/tournament database"),
          m("li", "Integration with third-party services (e.g., for player ratings)"),
          m(
            "li",
            "Data import/export (beyond clipboard and the system's ⿻ sharing capabilities)",
          ),
          m("li", "Features likely covered by your existing system"),
        ),
        m(
          "p",
          "To time rounds, use any timer, or end a round once the first match finishes.",
        ),
      ),
    ];
  },
};

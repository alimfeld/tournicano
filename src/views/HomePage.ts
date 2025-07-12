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
        "main.home.container-fluid.actions",
        m("h2", "👉 What is it?"),
        m(
          "p",
          "Tournicano is a (web) app for running ad-hoc ",
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
          "Players are added by typing or pasting their names into a text box. Player names are separated by spaces, so each player is identified by a single name. Each name maps to a consistent avatar image, which will be displayed for the player.",
        ),
        m(
          "p",
          "Players can be assigned to groups. Separate groups of players with a newline when entering their names.",
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
          "Any player who hasn't yet participated in a round can be deleted.",
        ),
        m(
          "p",
          m("b", "Note"),
          ": Player names must be unique. Any non-unique names are ignored when adding players.",
        ),
        m("h2", "🚀 Round Management"),
        m(
          "p",
          "At any time, a new round can be created by pressing the respective button.",
        ),
        m(
          "p",
          "The number of matches created for the new round depends on the number of available courts (configured in ⚙️ Settings) and the number of active players at that point in time.",
        ),
        m(
          "p",
          "Excess players are paused for the round using an algorithm that balances each player's play ratio (i.e. the number of matches played over the number of rounds the player participated in).",
        ),
        m(
          "p",
          "For each match, there is an input to enter the score. A score must be entered using exactly four digits, with leading zeroes where required. The first two digits represent the points scored by the team on the left, and the last two digits represent the points scored by the team on the right. Scores above 99 points are not supported. To enter a score of, e.g., 8:11, input '0811'.",
        ),
        m(
          "p",
          "You can navigate back and forth between rounds and change scores of previously completed rounds.",
        ),
        m("p", "The most recent round can be deleted."),
        m(
          "p",
          "The tournament can be restarted (deleting all rounds) or reset (deleting all rounds and players) under ⚙️ Settings.",
        ),
        m("h2", "🏆 Standings"),
        m(
          "p",
          "Live standings show the players ranked by win percentage, with plus/minus as a tiebreaker.",
        ),
        m(
          "p",
          "You can navigate back and forth to see the standings of any specific round.",
        ),
        m(
          "p",
          "When players are assigned to different groups, you can show standings overall and per group. This works for a maximum of 4 groups.",
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
          m("li", m("b", "Performance"), " - creating balanced matches"),
          m(
            "li",
            m("b", "Groups"),
            " - accommodating formats like mixed doubles",
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
          m("li", "Player / tournament database"),
          m("li", "Integration with third-party services (e.g., for ratings)"),
          m("li", "Data import / export (beyond clipboard)"),
          m("li", "Features likely covered by your existing system"),
        ),
        m(
          "p",
          "To time rounds, use your phone’s stopwatch, or end a round once the first match finishes.",
        ),
        m("p", "To keep the screen on, check your device’s display settings."),
      ),
      m(
        "div.actions",
        m(
          "button.right",
          {
            onclick: async () => {
              const data = {
                url: "https://github.com/alimfeld/tournicano",
              };
              try {
                await navigator.share(data);
              } catch (err) {
                console.log(err);
              }
            },
          },
          "⿻",
        ),
      ),
    ];
  },
};

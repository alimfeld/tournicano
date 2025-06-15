import m from "mithril";
import "./Leaderboard.css";
import { Attrs } from "../Model.ts";
import { PlayerResult } from "../core.ts";
import { Nav } from "./Nav.ts";
import { Avatar } from "./Avatar.ts";

export const Leaderboard: m.Component<Attrs, {}> = {
  view: ({ attrs: { state, actions } }) => {
    const award: (rank: number) => string = (rank) => {
      if (rank == 1) {
        return "🥇";
      }
      if (rank == 2) {
        return "🥈";
      }
      if (rank == 3) {
        return "🥉";
      }
      return rank.toString();
    };
    const decisiveCount: (p: PlayerResult) => number = (p) => {
      return p.wins + p.draws + p.losses;
    };
    const winPercentage: (p: PlayerResult) => number = (p) => {
      return (p.wins + p.draws / 2) / decisiveCount(p);
    };
    const players = state.tournament.players
      .values()
      .filter((p) => decisiveCount(p) > 0)
      .toArray()
      .sort((p, q) => {
        const pperf = winPercentage(p);
        const qperf = winPercentage(q);
        if (pperf == qperf) {
          const pdiff = p.plus - p.minus;
          const qdiff = q.plus - q.minus;
          if (pdiff == qdiff) {
            return p.name.localeCompare(q.name);
          }
          return qdiff - pdiff;
        }
        return qperf - pperf;
      });
    const ranks = players.reduce((acc: number[], _, i) => {
      if (acc.length == 0) {
        acc.push(1);
        return acc;
      }
      const [p, q] = [players[i], players[i - 1]];
      const pperf = winPercentage(p);
      const qperf = winPercentage(q);
      if (pperf == qperf) {
        const pdiff = p.plus - p.minus;
        const qdiff = q.plus - q.minus;
        if (pdiff == qdiff) {
          acc.push(acc[i - 1]);
          return acc;
        }
      }
      acc.push(i + 1);
      return acc;
    }, []);

    return [
      m("header.leaderboard.container-fluid", m("h1", "Leaderboard")),
      m(Nav, { changeView: actions.changeView }),
      m(
        "main.leaderboard.container-fluid",
        players.length > 0
          ? m(
              "table.striped",
              m(
                "thead",
                m(
                  "tr",
                  m("th", "#"),
                  m("th", { colspan: 2 }, "🤖"),
                  m("th.right", "%"),
                  m("th.right", "+/-"),
                ),
              ),
              m(
                "tbody",
                players.map((player, i) =>
                  m(
                    "tr",
                    m("td", award(ranks[i])),
                    m("td", m(Avatar, { player })),
                    m("td", m("p.name", player.name)),
                    m("td.right", (winPercentage(player) * 100).toFixed(0)),
                    m("td.right", player.plus - player.minus),
                  ),
                ),
              ),
            )
          : m("p", "No scores submitted (yet)!"),
      ),
    ];
  },
};

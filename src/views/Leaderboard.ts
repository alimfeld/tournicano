import m from "mithril";
import "./Leaderboard.css";
import { Attrs } from "../Model.ts";
import { ParticipantResult } from "../core.ts";
import { Nav } from "./Nav.ts";
import { Avatar } from "./Avatar.ts";

export const Leaderboard: m.Component<Attrs, {}> = {
  view: ({ attrs: { state, actions } }) => {
    const award: (rank: number) => string = (rank) => {
      if (rank == 1) {
        return "1 🥇";
      }
      if (rank == 2) {
        return "2 🥈";
      }
      if (rank == 3) {
        return "3 🥉";
      }
      return rank.toString();
    };
    const renderPlusMinus: (p: ParticipantResult) => string = (p) => {
      const diff = p.plus - p.minus;
      if (diff > 0) {
        return `+${diff}`;
      }
      return `${diff}`;
    };
    const players = state.tournament.players
      .values()
      .filter((p) => p.scoredMatchesCount() > 0)
      .toArray()
      .sort((p, q) => {
        const pperf = p.winPercentage();
        const qperf = q.winPercentage();
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
      const pperf = p.winPercentage();
      const qperf = q.winPercentage();
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
          ? [
              m(
                "section.header",
                m("p.player", "Player"),
                m("p.rank", "#"),
                m("p.win-percentage", "win %"),
                m("p.plus-minus", "+/-"),
              ),
              ...players.map((player, i) =>
                m(
                  "section.entry",
                  m(
                    "article.player",
                    m(Avatar, { player }),
                    m("p.name", player.name),
                  ),
                  m(
                    "div.result",
                    m("p.rank", award(ranks[i])),
                    m(
                      "p.win-percentage",
                      `${(player.winPercentage() * 100).toFixed(0)}%`,
                      m("div.progressbar", {
                        style: `width: ${player.winPercentage() * 100}%`,
                      }),
                    ),
                    m("p.plus-minus", renderPlusMinus(player)),
                  ),
                ),
              ),
            ]
          : m("p", "No scores submitted (yet)!"),
      ),
    ];
  },
};

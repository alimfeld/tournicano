import m from "mithril";
import "./Leaderboard.css";
import { Attrs } from "../Model.ts";
import { PlayerResult } from "../core.ts";

export const Leaderboard: m.Component<Attrs, {}> = {
  view: ({ attrs: { state } }) => {
    const award: (rank: number) => string = (rank) => {
      if (rank == 1) {
        return "🥇"
      }
      if (rank == 2) {
        return "🥈"
      }
      if (rank == 3) {
        return "🥉"
      }
      return rank.toString()
    }
    const decisive: (p: PlayerResult) => number = (p) => {
      return p.wins + p.draws + p.losses
    }
    const winPercentage: (p: PlayerResult) => number = (p) => {
      return (p.wins + (p.draws / 2)) / decisive(p)
    }
    const players = state.tournament.players.values().filter((p) => decisive(p) > 0).toArray().sort(
      (p, q) => {
        const pperf = winPercentage(p);
        const qperf = winPercentage(q);
        if (pperf == qperf) {
          const pdiff = p.plus - p.minus
          const qdiff = q.plus - q.minus
          if (pdiff == qdiff) {
            return p.name.localeCompare(q.name);
          }
          return qdiff - pdiff
        }
        return qperf - pperf;
      }
    );
    const ranks = players.reduce((acc: number[], _, i) => {
      if (acc.length == 0) {
        acc.push(1);
        return acc;
      }
      const [p, q] = [players[i], players[i - 1]];
      const pperf = winPercentage(p);
      const qperf = winPercentage(q);
      if (pperf == qperf) {
        const pdiff = p.plus - p.minus
        const qdiff = q.plus - q.minus
        if (pdiff == qdiff) {
          acc.push(i);
          return acc;
        }
      }
      acc.push(i + 1);
      return acc;
    }, []);

    return m("main.leaderboard",
      m("table.striped",
        m("thead",
          m("tr",
            m("th", { scope: "col" }, "#"),
            m("th", { scope: "col", colspan: 2 }, "Player"),
            m("th.right", { scope: "col" }, "W/D/L"),
            m("th.right", { scope: "col" }, "+/-"),
            m("th.right", { scope: "col" }, "%"),
            m("th.right", { scope: "col" }, "Δ"),
          )
        ),
        m("tbody",
          players.map((player, i) => m("tr",
            m("td", award(ranks[i])),
            m("td.player",
              m("img.avatar", { src: `https://api.dicebear.com/9.x/${state.avatarStyle}/svg?seed=${player.name}` }),
            ),
            m("td", player.name),
            m("td.right", `${player.wins}/${player.draws}/${player.losses}`),
            m("td.right", `${player.plus}/${player.minus}`),
            m("td.right", winPercentage(player).toFixed(2)),
            m("td.right", player.plus - player.minus),
          )),
        ),
      ),
    )
  }
};

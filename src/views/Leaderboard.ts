import m from "mithril";
import "./Leaderboard.css";
import { Attrs } from "../Model.ts";
import { PlayerStats } from "../core.ts";

export const Leaderboard: m.Component<Attrs, {}> = {
  view: ({ attrs: { state } }) => {
    const award: (rank: number) => string = (rank) => {
      if (rank == 1) {
        return "1 🥇"
      }
      if (rank == 2) {
        return "2 🥈"
      }
      if (rank == 3) {
        return "3 🥉"
      }
      return rank.toString()
    }
    const points: (p: PlayerStats) => number = (p) => {
      return (p.wins * 2 + p.draws);
    }
    const decisive: (p: PlayerStats) => number = (p) => {
      return p.wins + p.draws + p.losses
    }
    const average: (p: PlayerStats) => number = (p) => {
      return points(p) / decisive(p)
    }
    const players = state.tournament.getPlayers().filter((p) => decisive(p) > 0).sort(
      (p, q) => {
        const pperf = average(p);
        const qperf = average(q);
        if (qperf == pperf) {
          return (q.plus - q.minus) - (p.plus - p.minus);
        } else {
          return qperf - pperf;
        }
      }
    );
    return m("main.leaderboard",
      m("table.striped",
        m("thead",
          m("tr",
            m("th", { scope: "col" }, "Rank"),
            m("th", { scope: "col", colspan: 2 }, "Player"),
            m("th.right", { scope: "col" }, "M"),
            m("th.right", { scope: "col" }, "W"),
            m("th.right", { scope: "col" }, "D"),
            m("th.right", { scope: "col" }, "L"),
            m("th.right", { scope: "col" }, "P"),
            m("th.right", { scope: "col" }, "⌀"),
            m("th.right", { scope: "col" }, "+"),
            m("th.right", { scope: "col" }, "-"),
            m("th.right", { scope: "col" }, "Δ"),
          )
        ),
        m("tbody",
          players.map((player, i) => m("tr",
            m("td", award(i + 1)),
            m("td.player",
              m("img.avatar", { src: `https://api.dicebear.com/9.x/${state.avatarStyle}/svg?seed=${player.name}` }),
            ),
            m("td", player.name),
            m("td.right", player.matches),
            m("td.right", player.wins),
            m("td.right", player.draws),
            m("td.right", player.losses),
            m("td.right", points(player)),
            m("td.right", average(player).toFixed(2)),
            m("td.right", player.plus),
            m("td.right", player.minus),
            m("td.right", player.plus - player.minus),
          )),
        ),
      ),
    )
  }
};

import m from "mithril";
import "./StandingsPage.css";
import { NavView } from "./NavView.ts";
import { PlayerView } from "./PlayerView.ts";
import { Tournament } from "../model/Tournament.ts";
import { Page } from "../App.ts";
import { Swipeable } from "./Swipeable.ts";

export interface StandingsAttrs {
  tournament: Tournament;
  roundIndex: number;
  changeRound: (index: number) => void;
  nav: (page: Page) => void;
}

export const StandingsPage: m.Component<StandingsAttrs> = {
  view: ({ attrs: { tournament, roundIndex, changeRound, nav } }) => {
    const round =
      roundIndex >= 0 ? tournament.rounds.at(roundIndex) : undefined;
    const roundCount = tournament.rounds.length;
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
    const players = round ? round.standings() : [];
    const ranks = players.reduce((acc: number[], _, i) => {
      if (acc.length == 0) {
        acc.push(1);
        return acc;
      }
      const [p, q] = [players[i], players[i - 1]];
      const pperf = p.winRatio;
      const qperf = q.winRatio;
      if (pperf == qperf) {
        const pdiff = p.plusMinus;
        const qdiff = q.plusMinus;
        if (pdiff == qdiff) {
          acc.push(acc[i - 1]);
          return acc;
        }
      }
      acc.push(i + 1);
      return acc;
    }, []);

    return [
      m(
        "header.standings.container-fluid",

        m(
          "button.outline.prev",
          {
            disabled: roundIndex <= 0,
            onclick: () => changeRound(roundIndex - 1),
          },
          "<",
        ),
        m(
          "h1#title",
          roundIndex + 1 < roundCount
            ? `Standings (${roundIndex + 1}/${roundCount})`
            : `Standings`,
        ),
        m(
          "button.outline.next",
          {
            disabled: roundIndex + 1 >= roundCount,
            onclick: () => changeRound(roundIndex + 1),
          },
          ">",
        ),
      ),
      m(NavView, { nav }),
      m(
        Swipeable,
        {
          element: "main.standings.container-fluid",
          onswiping: (swiping) => {
            document.getElementById("title")!.style =
              `opacity: ${swiping ? 0.5 : 1}`;
          },
          onswipeleft:
            roundIndex > 0
              ? () => {
                  changeRound(roundIndex - 1);
                }
              : undefined,
          onswiperight:
            roundIndex + 1 < roundCount
              ? () => {
                  changeRound(roundIndex + 1);
                }
              : undefined,
        },
        players.length > 0
          ? [
              ...players.map((player, i) =>
                m(
                  "section.entry",
                  m("div.rank", m("p", award(ranks[i]))),
                  m(PlayerView, { player }),
                  m(
                    "div.record",
                    m(
                      "p.win-percentage",
                      `${(player.winRatio * 100).toFixed(0)}%`,
                      m("div.progressbar", {
                        style: `width: ${player.winRatio * 100}%`,
                      }),
                    ),
                    m(
                      "small",
                      `(${player.wins}-${player.draws}-${player.losses})`,
                    ),
                  ),
                  m(
                    "div.points",
                    m(
                      "p.plus-minus",
                      (player.plusMinus >= 0 ? "+" : "") + player.plusMinus,
                    ),
                    m(
                      "small",
                      `(+${player.pointsFor}/-${player.pointsAgainst})`,
                    ),
                  ),
                ),
              ),
            ]
          : m("p", "No scores submitted (yet)!"),
      ),
    ];
  },
};

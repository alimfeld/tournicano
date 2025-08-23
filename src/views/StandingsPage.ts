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
  group: number | undefined;
  changeRound: (index: number) => void;
  changeGroup: (group: number | undefined) => void;
  nav: (page: Page) => void;
}

export const StandingsPage: m.Component<StandingsAttrs> = {
  view: ({
    attrs: { tournament, roundIndex, group, changeRound, changeGroup, nav },
  }) => {
    const round =
      roundIndex >= 0 ? tournament.rounds.at(roundIndex) : undefined;
    const roundCount = tournament.rounds.length;
    const groups = tournament.groups;
    const showGroupSwitcher = groups.length > 1 && groups.length <= 4;
    const standingsGroup =
      showGroupSwitcher && (group == undefined || groups.indexOf(group) >= 0)
        ? group
        : undefined;
    const award: (rank: number) => string = (rank) => {
      if (rank == 1) {
        return "1🥇";
      }
      if (rank == 2) {
        return "2🥈";
      }
      if (rank == 3) {
        return "3🥉";
      }
      return rank.toString();
    };
    const standings = round ? round.standings(standingsGroup) : [];
    const format = () => {
      return (
        "```\n" +
        standings
          .map((ranked) => {
            return (
              String(ranked.rank).padStart(2, " ") +
              ". " +
              ranked.player.name.slice(0, 10).padEnd(10, ".") +
              " " +
              (ranked.player.winRatio * 100).toFixed(0).padStart(3, " ") +
              "% " +
              (
                (ranked.player.plusMinus >= 0 ? "+" : "") +
                ranked.player.plusMinus
              ).padStart(4, " ")
            );
          })
          .join("\n") +
        "\n```"
      );
    };
    return [
      m(
        "header.standings.container-fluid",

        m(
          "button.secondary.prev",
          {
            disabled: roundIndex <= 0 || roundCount == 0,
            onclick: () => changeRound(roundIndex - 1),
          },
          "←",
        ),
        m(
          "h1#title",
          roundIndex + 1 < roundCount
            ? `Standings (${roundIndex + 1}/${roundCount})`
            : `Standings`,
        ),
        m(
          "button.secondary.next",
          {
            disabled: roundIndex + 1 >= roundCount,
            onclick: () => changeRound(roundIndex + 1),
          },
          "→",
        ),
      ),
      m(NavView, { nav }),
      m(
        Swipeable,
        {
          element: "main.standings.container-fluid.actions",
          onswiping: (swiping) => {
            document.getElementById("title")!.style =
              `opacity: ${swiping ? 0.1 : 1}`;
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
        showGroupSwitcher
          ? m(
            "div.group-switcher",
            { role: "group" },
            m(
              "button",
              {
                disabled: standingsGroup == undefined,
                onclick: () => {
                  changeGroup(undefined);
                },
              },
              "All",
            ),
            groups.map((g) =>
              m(
                "button",
                {
                  disabled: standingsGroup == g,
                  onclick: () => {
                    changeGroup(g);
                  },
                },
                `${String.fromCharCode(65 + g)}`,
              ),
            ),
          )
          : null,
        standings.length > 0
          ? [
            ...standings.map((ranked) =>
              m(
                "section.entry",
                m("div.rank", m("p", award(ranked.rank))),
                m(PlayerView, { player: ranked.player }),
                m(
                  "div.record",
                  m(
                    "p.win-percentage",
                    `${(ranked.player.winRatio * 100).toFixed(0)}%`,
                    m("div.progressbar", {
                      style: `width: ${ranked.player.winRatio * 100}%`,
                    }),
                  ),
                  m(
                    "small",
                    `(${ranked.player.wins}-${ranked.player.draws}-${ranked.player.losses})`,
                  ),
                ),
                m(
                  "div.points",
                  m(
                    "p.plus-minus",
                    (ranked.player.plusMinus >= 0 ? "+" : "") +
                    ranked.player.plusMinus,
                  ),
                  m(
                    "small",
                    `(+${ranked.player.pointsFor}/-${ranked.player.pointsAgainst})`,
                  ),
                ),
              ),
            ),
          ]
          : m("p", "No scores submitted (yet)!"),
      ),
      m(
        "button.action.right",
        {
          disabled: standings.length == 0,
          onclick: async () => {
            const data = {
              text: format(),
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
    ];
  },
};

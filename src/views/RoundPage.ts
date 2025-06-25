import m from "mithril";
import "./RoundPage.css";
import { PlayerView } from "./PlayerView.ts";
import { NavView } from "./NavView.ts";
import { Tournament } from "../model/Tournament.ts";
import { Page } from "../App.ts";
import { Settings } from "../model/Settings.ts";
import { MatchView } from "./MatchView.ts";
import { Swipeable } from "./Swipeable.ts";

export interface RoundAttrs {
  settings: Settings;
  tournament: Tournament;
  roundIndex: number;
  changeRound: (index: number) => void;
  nav: (page: Page) => void;
}

export const RoundPage: m.Component<RoundAttrs> = {
  view: ({ attrs: { settings, tournament, roundIndex, changeRound, nav } }) => {
    const matchesPerRound = Math.min(
      Math.floor(tournament.players.filter((p) => p.active).length / 4),
      settings.courts,
    );
    const round =
      roundIndex >= 0 ? tournament.rounds.at(roundIndex) : undefined;
    const roundCount = tournament.rounds.length;
    return [
      m(
        "header.round.container-fluid",
        m(
          "button.outline.prev",
          {
            disabled: roundIndex <= 0,
            onclick: () => changeRound(roundIndex - 1),
          },
          "<",
        ),
        m(
          "h1",
          round
            ? roundIndex + 1 == roundCount
              ? `Round ${roundIndex + 1}`
              : `Round ${roundIndex + 1}/${roundCount}`
            : "Rounds",
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
          element: "main.round.container-fluid",
          onswiping: (swiping) => {
            document.getElementsByTagName("header")[0].style =
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
        round
          ? [
              ...round.matches.map((match, matchIndex) =>
                m(MatchView, { match, matchIndex }),
              ),
              round.paused.length > 0
                ? [
                    m("h2", "Paused"),
                    m(
                      "section.paused",
                      round.paused.map((player) => m(PlayerView, { player })),
                    ),
                  ]
                : null,
            ]
          : [m("p", "No rounds created (yet)!")],
        m(
          "section.actions",
          m(
            "button.delete",
            {
              disabled: !(round && round.isLast()),
              onclick: () => {
                if (round) {
                  round.delete();
                  changeRound(roundIndex - 1);
                }
              },
            },
            "Delete",
          ),
          m(
            "button.add",
            {
              disabled: matchesPerRound < 1,
              onclick: () => {
                tournament.createRound({
                  maxMatches: matchesPerRound,
                  flavor: {
                    americanoFactor: 1 - settings.mexicanoRatio,
                    mexicanoFactor: settings.mexicanoRatio,
                  },
                });
                changeRound(roundCount);
              },
            },
            `New Round (${matchesPerRound} Matches)`,
          ),
        ),
      ),
    ];
  },
};

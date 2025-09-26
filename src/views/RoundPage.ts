import m from "mithril";
import "./RoundPage.css";
import { PlayerView } from "./PlayerView.ts";
import { NavView } from "./NavView.ts";
import { Tournament } from "../model/Tournament.ts";
import { Page } from "../App.ts";
import { Settings } from "../model/Settings.ts";
import { MatchView } from "./MatchView.ts";
import { Swipeable } from "./Swipeable.ts";
import { ActionWithConfirmation } from "./ActionWithConfirmation.ts";

export interface RoundAttrs {
  settings: Settings;
  tournament: Tournament;
  roundIndex: number;
  changeRound: (index: number) => void;
  nav: (page: Page) => void;
  wakeLock: boolean;
  fullscreen: boolean;
  toggleFullscreen: () => void;
}

export const RoundPage: m.Component<RoundAttrs> = {
  view: ({
    attrs: { settings, tournament, roundIndex, changeRound, nav, wakeLock, fullscreen, toggleFullscreen },
  }) => {
    const matchesPerRound = Math.min(
      Math.floor(tournament.players().filter((p) => p.active).length / 4),
      settings.courts,
    );
    const round =
      roundIndex >= 0 ? tournament.rounds.at(roundIndex) : undefined;
    const roundCount = tournament.rounds.length;
    return m.fragment({ key: `round-${roundIndex}` }, [
      !fullscreen ?
        m(
          "header.round.container-fluid",
          m(
            "button.secondary",
            {
              disabled: roundIndex <= 0 || roundCount == 0,
              onclick: () => changeRound(roundIndex - 1),
            },
            "←",
          ),
          m(
            "h1#title",
            (round
              ? roundIndex + 1 == roundCount
                ? `Round ${roundIndex + 1}`
                : `Round ${roundIndex + 1}/${roundCount}`
              : "Rounds") + (wakeLock ? " 👁️" : ""),
          ),
          m(
            "button.secondary",
            {
              disabled: roundIndex + 1 >= roundCount,
              onclick: () => changeRound(roundIndex + 1),
            },
            "→",
          ),
        ) : null,
      !fullscreen ? m(NavView, { nav }) : null,
      m(
        Swipeable,
        {
          element: "main.round.container-fluid.actions" + (fullscreen ? ".fullscreen" : ""),
          onswiping: (swiping) => {
            if (!fullscreen) {
              document.getElementById("title")!.style =
                `opacity: ${swiping ? 0.1 : 1}`;
            }
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
              m(MatchView, { roundIndex, match, matchIndex, debug: settings.debug, fullscreen }),
            ),
            round.paused.length > 0
              ? [
                m("h2", "💤"),
                m(
                  "section.paused",
                  round.paused.map((player) =>
                    m(PlayerView, { player, debug: settings.debug }),
                  ),
                ),
              ]
              : null,
          ]
          : [m("p", "No rounds created (yet)!")],
      ),
      round && round.isLast()
        ? m(ActionWithConfirmation, {
          action: "Delete",
          title: "Delete Round?",
          description: "This will delete the current round.",
          clazz: "action left" + (fullscreen ? " fullscreen" : ""),
          onconfirm: () => {
            if (round) {
              round.delete();
              changeRound(roundIndex - 1);
            }
          },
        })
        : null,
      m("button.action.middle" + (fullscreen ? ".fullscreen" : ""),
        {
          onclick: () => {
            toggleFullscreen();
          },
        },
        "⛶"
      ),
      m(
        "button.action.right" + (fullscreen ? ".fullscreen" : ""),
        {
          disabled: matchesPerRound < 1,
          onclick: () => {
            tournament.createRound(settings.matchingSpec, matchesPerRound);
            changeRound(roundCount);
          },
        },
        `Add (${matchesPerRound})`,
      ),
    ]);
  },
};

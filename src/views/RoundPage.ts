import m from "mithril";
import "./RoundPage.css";
import { PlayerView } from "./PlayerView.ts";
import { Tournament, Match } from "../model/Tournament.ts";
import { Settings } from "../model/Settings.ts";
import { MatchView } from "./MatchView.ts";
import { Swipeable } from "./Swipeable.ts";
import { FAB } from "./FAB.ts";
import { getMatchingSpecName } from "../model/Tournament.matching.ts";

export interface RoundAttrs {
  settings: Settings;
  tournament: Tournament;
  roundIndex: number;
  changeRound: (index: number) => void;
  wakeLock: boolean;
  fullscreen: boolean;
  toggleFullscreen: () => void;
  openScoreEntry: (roundIndex: number, matchIndex: number, match: Match) => void;
  showToast?: (message: string, type?: "success" | "error" | "info") => void;
}

export const RoundPage: m.Component<RoundAttrs> = {
  view: ({
    attrs: { settings, tournament, roundIndex, changeRound, wakeLock, fullscreen, toggleFullscreen, openScoreEntry, showToast },
  }) => {
    const matchesPerRound = Math.min(
      Math.floor(tournament.activePlayerCount / 4),
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
              disabled: roundIndex <= 0 || roundCount === 0,
              onclick: () => changeRound(roundIndex - 1),
            },
            "←",
          ),
          m(
            "h1#title",
            (round
              ? roundIndex + 1 === roundCount
                ? `Round ${roundIndex + 1}`
                : `Round ${roundIndex + 1}/${roundCount}`
              : "Rounds") + (wakeLock ? " ⏿" : ""),
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
      m(
        Swipeable,
        {
          element: "main.round.container-fluid.actions" + (fullscreen ? ".fullscreen" : ""),
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
              m(MatchView, { roundIndex, match, matchIndex, debug: settings.debug, fullscreen, openScoreEntry }),
            ),
            round.paused.length > 0
              ? [
                m(
                  "section.paused",
                  round.paused.map((player) =>
                    m(PlayerView, { player, debug: settings.debug, badge: "💤" })

                  ),
                ),
              ]
              : null,
          ]
          : [m("p", ["No rounds yet.", m("br"), "💡 Press the + button to create your first round (requires at least 4 active players)!"])],
      ),
      m(FAB, {
        icon: "＋",
        fullscreen: fullscreen,
        variant: tournament.hasAllScoresSubmitted ? "ins" : undefined,
        onclick: () => {
          const newRoundNumber = roundCount + 1;
          const isFirstRound = tournament.rounds.length === 0;
          if (!tournament.hasAllScoresSubmitted && tournament.rounds.length > 0 && showToast) {
            showToast(`Round ${newRoundNumber} created with incomplete scores from previous rounds`, "error");
          }
          tournament.createRound(settings.matchingSpec, matchesPerRound);
          if (isFirstRound && showToast) {
            const modeName = getMatchingSpecName(settings.matchingSpec);
            showToast(`Tournament started in ${modeName} mode`, "success");
          }
          changeRound(roundCount);
        },
        disabled: matchesPerRound < 1,
      }),
      m(FAB, {
        icon: "⋮",
        iconOpen: "✕",
        position: "left",
        variant: "secondary",
        fullscreen: fullscreen,
        disabled: tournament.rounds.length === 0,
        actions: [
          {
            icon: "⛶",
            label: fullscreen ? "Exit Fullscreen" : "Enter Fullscreen",
            onclick: () => {
              toggleFullscreen();
            },
            active: fullscreen,
          },
          {
            icon: "⏿",
            label: wakeLock ? "Allow Screen to Turn Off" : "Keep Screen On",
            onclick: () => {
              settings.enableWakeLock(!settings.wakeLock);
            },
            disabled: !("wakeLock" in navigator),
            active: wakeLock,
          },
          {
            icon: "?",
            label: settings.debug ? "Hide Debug Info" : "Show Debug Info",
            onclick: () => {
              settings.showDebug(!settings.debug);
            },
            active: settings.debug,
          },
          {
            icon: "－",
            label: "Delete Last Round",
            onclick: () => {
              if (round) {
                round.delete();
                changeRound(roundIndex - 1);
              }
            },
            confirmation: {
              title: `🚨 Delete Round ${roundIndex + 1}?`,
              description: [
                "This will delete the round and all its matches.",
                "This action cannot be undone!"
              ],
            },
            variant: "del",
            disabled: !round || !round.isLast(),
          },
          {
            icon: "↺",
            label: "Delete All Rounds",
            onclick: () => {
              tournament.restart();
            },
            confirmation: {
              title: "🚨 Delete All Rounds?",
              description: [
                "This will delete all rounds, but keep all players and their registration status.",
                "This action cannot be undone!"
              ],
            },
            variant: "del",
            disabled: tournament.rounds.length === 0,
          },
        ]
      }),
    ]);
  },
};

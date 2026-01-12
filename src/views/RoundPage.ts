import m from "mithril";
import "./RoundPage.css";
import { ParticipatingPlayerCard } from "./ParticipatingPlayerCard.ts";
import { Match, ParticipatingPlayer } from "../model/tournament/Tournament.ts";
import { MatchSection } from "./MatchSection.ts";
import { Swipeable } from "./Swipeable.ts";
import { FAB } from "./FAB.ts";
import { HelpCard } from "./HelpCard.ts";
import { Header, HeaderAction } from "./Header.ts";
import { ToggleFullscreenButton } from "./ToggleFullscreenButton.ts";
import { ScoreEntryModal } from "./ScoreEntryModal.ts";
import { ParticipatingPlayerModal } from "./ParticipatingPlayerModal.ts";
import { GroupSymbol } from "./GroupSymbol.ts";
import { pluralizeWithCount } from "../model/core/Util.ts";
import { appContext } from "../Layout.ts";

interface RoundState {
  scoreEntryMatch?: {
    roundIndex: number;
    matchIndex: number;
    match: Match;
  };
  selectedPlayer?: ParticipatingPlayer;
  wakeLock: WakeLockSentinel | null;
  wakeLockListener?: { onchange: () => Promise<void> };
}

export const RoundPage: m.Component<{}, RoundState> = {
  oninit: async ({ state }) => {
    const { state: appState } = appContext;
    state.scoreEntryMatch = undefined;
    state.selectedPlayer = undefined;
    state.wakeLock = null;

    // Request wake lock if enabled and supported
    if (appState.settings.wakeLock && "wakeLock" in navigator) {
      try {
        state.wakeLock = await navigator.wakeLock.request("screen");
      } catch (err) {
        console.log("Failed to acquire wake lock:", err);
      }
    }
  },
  oncreate: ({ state }) => {
    const { state: appState } = appContext;
    // Listen to settings changes for wake lock toggle
    state.wakeLockListener = {
      onchange: async () => {
        if (appState.settings.wakeLock && "wakeLock" in navigator) {
          // Enable wake lock
          if (state.wakeLock === null) {
            try {
              state.wakeLock = await navigator.wakeLock.request("screen");
              m.redraw();
            } catch (err) {
              console.log("Failed to acquire wake lock:", err);
            }
          }
        } else {
          // Disable wake lock
          if (state.wakeLock !== null) {
            await state.wakeLock.release();
            state.wakeLock = null;
            m.redraw();
          }
        }
      }
    };
    appState.settings.addListener(state.wakeLockListener);
  },
  onremove: async ({ state }) => {
    const { state: appState } = appContext;
    // Clean up settings listener
    if (state.wakeLockListener) {
      appState.settings.removeListener(state.wakeLockListener);
    }

    // Release wake lock when leaving page
    if (state.wakeLock !== null) {
      await state.wakeLock.release();
      state.wakeLock = null;
    }
  },
  view: ({ state }) => {
    const { state: appState, showToast, changeRound, toggleFullscreen, resetFilters } = appContext;
    const { settings, tournament, roundIndex } = appState;
    const nextRoundInfo = tournament.getNextRoundInfo(
      settings.matchingSpec,
      settings.courts
    );
    const round =
      roundIndex >= 0 ? tournament.rounds.at(roundIndex) : undefined;
    const roundCount = tournament.rounds.length;

    // Get fullscreen state from app context
    const fullscreen = appState.fullscreen;

    // Compute wake lock state
    const isWakeLockActive = settings.wakeLock && "wakeLock" in navigator;

    // Get configuration warnings from the model
    const configurationWarnings = tournament.validateConfiguration(settings.matchingSpec);
    const groupMismatchWarning = configurationWarnings.find(w => w.type === "groupMismatch")?.message || null;

    // Score entry handlers
    const openScoreEntry = (roundIndex: number, matchIndex: number, match: Match) => {
      state.scoreEntryMatch = {
        roundIndex,
        matchIndex,
        match
      };
    };

    const closeScoreEntry = () => {
      state.scoreEntryMatch = undefined;
    };

    // Player modal handlers
    const openPlayerModal = (player: ParticipatingPlayer) => {
      state.selectedPlayer = player;
    };

    const closePlayerModal = () => {
      state.selectedPlayer = undefined;
    };

    // Build actions for header overflow menu
    const actions: HeaderAction[] = [
      {
        icon: "－",
        label: "Delete Last Round",
        disabled: tournament.rounds.length === 0,
        onclick: () => {
          const lastRound = tournament.rounds.at(-1);
          if (lastRound) {
            lastRound.delete();
            // Navigate to previous round if we were viewing the last round
            if (roundIndex >= tournament.rounds.length) {
              changeRound(Math.max(0, tournament.rounds.length - 1));
            }
          }
        },
        confirmation: {
          title: `🚨 Delete Round ${roundCount}?`,
          description: [
            `This will delete the last round (round ${roundCount}) and all its matches.`,
            "This action cannot be undone!"
          ],
          confirmButtonText: "Delete"
        }
      },
      {
        icon: "↺",
        label: "Restart Tournament",
        disabled: tournament.rounds.length === 0,
        onclick: () => {
          tournament.restart();
          changeRound(-1);
          resetFilters();
        },
        confirmation: {
          title: "🚨 Restart Tournament?",
          description: [
            "This will delete all rounds, but keep all players.",
            "This action cannot be undone!"
          ],
          confirmButtonText: "Restart"
        }
      },
      {
        icon: "☼",
        label: isWakeLockActive ? "Disable Keep Screen On" : "Enable Keep Screen On",
        pressed: isWakeLockActive,
        onclick: () => {
          settings.enableWakeLock(!settings.wakeLock);
          showToast(
            settings.wakeLock ? "Keep Screen On" : "Allow Screen to turn Off",
            { type: "success", position: "top" }
          );
        },
        disabled: !("wakeLock" in navigator),
      },
    ];

    const renderNextRoundInfo = () => {
      return [
        m("ul", [
          m("li", `${pluralizeWithCount(tournament.activePlayerCount, "player")} active`),
          // Show group distribution if multiple groups exist
          nextRoundInfo.groupDistribution.size > 1
            ? m("li", [
              ...Array.from(nextRoundInfo.groupDistribution.entries())
                .sort((a, b) => a[0] - b[0])
                .flatMap(([groupNum, counts], index, array) => [
                  m(GroupSymbol, { group: groupNum, neutral: false }),
                  `: ${counts.total}`,
                  index < array.length - 1 ? " · " : ""
                ])
            ])
            : null,
          m("li", `${nextRoundInfo.matchingSpecName} mode${nextRoundInfo.balancingEnabled ? ' (balancing groups)' : ''}`),
          m("li", `${pluralizeWithCount(settings.courts, "court")} available`)
        ]),
        // Show match count, competing/paused players only if matches can be created
        nextRoundInfo.matchCount > 0 ? m("p", [
          `${pluralizeWithCount(nextRoundInfo.matchCount, "match", "matches")} will be created with ${pluralizeWithCount(nextRoundInfo.competingPlayerCount, "player")} competing`,
          nextRoundInfo.pausedPlayerCount > 0
            ? ` (${nextRoundInfo.pausedPlayerCount} paused)`
            : "",
          "."
        ]) : null,
      ]
    };

    return m.fragment({ key: `round-${roundIndex}` }, [
      !fullscreen ?
        m(Header, {
          title: (round
            ? roundIndex + 1 === roundCount
              ? `Round ${roundIndex + 1}`
              : `Round ${roundIndex + 1}/${roundCount}`
            : "Rounds"),
          actions: actions
        }) : null,
      m(
        Swipeable,
        {
          element: "main.round.container-fluid" + (fullscreen ? ".fullscreen" : ""),
          showNavHints: true,
          onswipeleft:
            roundIndex > 0 && roundCount > 0
              ? () => {
                changeRound(roundIndex - 1);
              }
              : undefined,
          onswiperight:
            roundIndex + 1 < roundCount && roundCount > 0
              ? () => {
                changeRound(roundIndex + 1);
              }
              : undefined,
        },
        round
          ? [
            ...round.matches.map((match, matchIndex) =>
              m(MatchSection, { roundIndex, match, matchIndex, showRoundIndex: fullscreen, openScoreEntry, openPlayerModal }),
            ),
            round.paused.length > 0 || round.inactive.length > 0
              ? [
                m(
                  "section.benched",
                  [
                    // Paused players first (with sleep emoji)
                    ...round.paused.map((player) =>
                      m(ParticipatingPlayerCard, { player, badge: "💤", onClick: () => openPlayerModal(player) })
                    ),
                    // Inactive players after (with power off emoji)
                    ...round.inactive.map((player) =>
                      m(ParticipatingPlayerCard, { player, badge: "⏻", onClick: () => openPlayerModal(player) })
                    )
                  ]
                ),
              ]
              : null,
          ]
          : [m(HelpCard,
            // No players
            tournament.players().length === 0
              ? {
                title: "🤖 Add Players",
                message: m("p", "Add at least 4 players to start a tournament."),
                action: { label: "Go to Players", onclick: () => m.route.set("/players") }
              }
              // No matches
              : nextRoundInfo.matchCount === 0
                ? {
                  title: "⚠️ Check yor Setup",
                  message: [
                    m("p", "Your current setup does not result in any matches."),
                    renderNextRoundInfo(),
                  ],
                  action: { label: "Go to Players", onclick: () => m.route.set("/players") }
                }
                // Ready to play (matches can be created)
                : {
                  title: "🚀 Ready to play?",
                  message: [
                    renderNextRoundInfo(),
                    groupMismatchWarning ? m("small", m("mark", groupMismatchWarning)) : null
                  ],
                  action: {
                    label: "Create first Round", onclick: () => {
                      tournament.createRound(settings.matchingSpec, nextRoundInfo.matchCount);
                      changeRound(roundCount);
                    }
                  }
                }
          )],
      ),
      m(FAB, {
        icon: "＋",
        fullscreen: fullscreen,
        variant: tournament.hasAllScoresSubmitted ? "ins" : undefined,
        disabled: nextRoundInfo.matchCount === 0,
        onclick: () => {
          const spec = settings.matchingSpec;
          const usesPerformanceFactors = spec.teamUp.performanceFactor > 0 || spec.matchUp.performanceFactor > 0;
          if (tournament.rounds.length > 0 && usesPerformanceFactors && !tournament.hasAllScoresSubmitted) {
            showToast("Not all scores were entered in previous rounds", { type: "error", position: "middle" });
          }
          tournament.createRound(settings.matchingSpec, nextRoundInfo.matchCount);
          changeRound(roundCount);
        },
      }),
      roundCount > 0 ? m(ToggleFullscreenButton, { isFullscreen: fullscreen, fullscreen: fullscreen, onclick: toggleFullscreen }) : null,
      // Score entry modal (conditionally rendered)
      state.scoreEntryMatch ? m(ScoreEntryModal, {
        roundIndex: state.scoreEntryMatch.roundIndex,
        matchIndex: state.scoreEntryMatch.matchIndex,
        match: state.scoreEntryMatch.match,
        onClose: closeScoreEntry
      }) : null,
      // Player stats modal (conditionally rendered)
      state.selectedPlayer ? m(ParticipatingPlayerModal, {
        player: state.selectedPlayer,
        onClose: closePlayerModal
      }) : null,
    ]);
  },
};

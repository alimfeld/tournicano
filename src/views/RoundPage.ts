import m from "mithril";
import "./RoundPage.css";
import { ParticipatingPlayerCard } from "./ParticipatingPlayerCard.ts";
import { Tournament, Match, ParticipatingPlayer } from "../model/Tournament.ts";
import { Settings } from "../model/Settings.ts";
import { MatchSection } from "./MatchSection.ts";
import { Swipeable } from "./Swipeable.ts";
import { FAB } from "./FAB.ts";
import { getMatchingSpecName } from "../model/Tournament.matching.ts";
import { HelpCard } from "./HelpCard.ts";
import { Header, HeaderAction } from "./Header.ts";
import { ToggleFullscreenButton } from "./ToggleFullscreenButton.ts";
import { ScoreEntryModal } from "./ScoreEntryModal.ts";
import { ParticipatingPlayerModal } from "./ParticipatingPlayerModal.ts";
import { GroupSymbol } from "./GroupSymbol.ts";
import { Nav } from "./Nav.ts";
import { Page } from "../App.ts";

export interface RoundAttrs {
  settings: Settings;
  tournament: Tournament;
  roundIndex: number;
  changeRound: (index: number) => void;
  showToast: (message: string, type?: "success" | "error" | "info") => void;
  nav: (page: Page) => void;
  currentPage: Page;
}

interface RoundState {
  scoreEntryMatch?: {
    roundIndex: number;
    matchIndex: number;
    match: Match;
  };
  selectedPlayer?: ParticipatingPlayer;
  fullscreen: boolean;
  wakeLock: WakeLockSentinel | null;
  wakeLockListener?: { onchange: () => Promise<void> };
}

export const RoundPage: m.Component<RoundAttrs, RoundState> = {
  oninit: async ({ attrs, state }) => {
    state.scoreEntryMatch = undefined;
    state.selectedPlayer = undefined;
    state.fullscreen = false;
    state.wakeLock = null;

    // Request wake lock if enabled and supported
    if (attrs.settings.wakeLock && "wakeLock" in navigator) {
      try {
        state.wakeLock = await navigator.wakeLock.request("screen");
      } catch (err) {
        console.log("Failed to acquire wake lock:", err);
      }
    }
  },
  oncreate: ({ attrs, state }) => {
    // Listen to settings changes for wake lock toggle
    state.wakeLockListener = {
      onchange: async () => {
        if (attrs.settings.wakeLock && "wakeLock" in navigator) {
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
    attrs.settings.addListener(state.wakeLockListener);
  },
  onremove: async ({ attrs, state }) => {
    // Clean up settings listener
    if (state.wakeLockListener) {
      attrs.settings.removeListener(state.wakeLockListener);
    }

    // Release wake lock when leaving page
    if (state.wakeLock !== null) {
      await state.wakeLock.release();
      state.wakeLock = null;
    }
  },
  view: ({
    attrs: { settings, tournament, roundIndex, changeRound, showToast, nav, currentPage },
    state
  }) => {
    const nextRoundInfo = tournament.getNextRoundInfo(
      settings.matchingSpec,
      settings.courts
    );
    const round =
      roundIndex >= 0 ? tournament.rounds.at(roundIndex) : undefined;
    const roundCount = tournament.rounds.length;

    // Local fullscreen state
    const fullscreen = state.fullscreen;
    const toggleFullscreen = () => {
      state.fullscreen = !state.fullscreen;
    };

    // Computed wake lock state
    const isWakeLockActive = settings.wakeLock && "wakeLock" in navigator;

    // Detect group configuration mismatch and return warning message if any
    const getGroupMismatchWarning = (): string | null => {
      // Skip check if not enough players (other warning takes precedence)
      if (nextRoundInfo.activePlayerCount < 4) {
        return null;
      }

      const specUsesGroups = settings.matchingSpec.teamUp.groupFactor > 0 ||
        settings.matchingSpec.matchUp.groupFactor > 0;
      const groupCount = nextRoundInfo.groupDistribution.size;

      // Case A: Mode uses groups, but all active players are in one group
      if (specUsesGroups && groupCount === 1) {
        return "Mode uses groups but all active players are in one group - consider organizing players into groups or switch tournament mode";
      }

      // Case B: Active players in multiple groups, but mode doesn't use groups
      if (!specUsesGroups && groupCount > 1) {
        return "Active players are in multiple groups but mode ignores them";
      }

      // No mismatch detected
      return null;
    };

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
    const actions: HeaderAction[] = [];
    // Add delete actions only when there are rounds
    if (tournament.rounds.length > 0) {
      actions.push(
        {
          icon: "－",
          label: "Delete Last Round",
          onclick: () => {
            const lastRound = tournament.rounds.at(-1);
            if (lastRound) {
              const lastRoundNumber = tournament.rounds.length;
              lastRound.delete();
              // Navigate to previous round if we were viewing the last round
              if (roundIndex >= tournament.rounds.length) {
                changeRound(Math.max(0, tournament.rounds.length - 1));
              }
              showToast(`Deleted Round ${lastRoundNumber}`, "success");
            }
          },
          confirmation: {
            title: `🚨 Delete Round ${roundCount}?`,
            description: [
              "This will delete the last round ${roundCount} and all its matches.",
              "This action cannot be undone!"
            ],
            confirmButtonText: "Delete"
          }
        },
        {
          icon: "↺",
          label: "Restart Tournament",
          onclick: () => {
            tournament.restart();
            showToast("Tournament restarted", "success");
          },
          confirmation: {
            title: "🚨 Restart the Tournament?",
            description: [
              "This will delete all rounds, but keep all players.",
              "This action cannot be undone!"
            ],
            confirmButtonText: "Restart"
          }
        }
      );
    }
    actions.push(
      {
        icon: "☼",
        label: isWakeLockActive ? "Disable Keep Screen On" : "Enable Keep Screen On",
        pressed: isWakeLockActive,
        onclick: () => {
          settings.enableWakeLock(!settings.wakeLock);
          showToast(
            settings.wakeLock ? "Keep Screen On" : "Allow Screen to turn Off",
            "success"
          );
        },
        disabled: !("wakeLock" in navigator),
      },
    );

    // Check for group configuration mismatch
    const groupMismatchWarning = getGroupMismatchWarning();

    const renderSetup = () => {
      return [
        m("ul", [
          m("li", `${tournament.activePlayerCount} active player${tournament.activePlayerCount !== 1 ? 's' : ''}`),
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
          m("li", `${getMatchingSpecName(settings.matchingSpec)} mode`),
          m("li", `${settings.courts} available court${settings.courts !== 1 ? 's' : ''}`),
        ])
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
                action: { label: "Go to Players", onclick: () => nav(Page.PLAYERS) }
              }
              // No matches
              : nextRoundInfo.matchCount === 0
                ? {
                  title: "⚠️ Check yor Setup",
                  message: [
                    m("p", "Your current setup does not result in any matches."),
                    renderSetup(),
                  ],
                  action: { label: "Go to Players", onclick: () => nav(Page.PLAYERS) }
                }
                // Ready to play (matches can be created)
                : {
                  title: "🚀 Ready to play?",
                  message: [
                    renderSetup(),
                    m("p", `${nextRoundInfo.matchCount} match${nextRoundInfo.matchCount !== 1 ? 'es' : ''} will be created.`),
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
      tournament.rounds.length > 0 ? m(FAB, {
        icon: "＋",
        fullscreen: fullscreen,
        variant: tournament.hasAllScoresSubmitted ? "ins" : undefined,
        disabled: nextRoundInfo.matchCount === 0,
        onclick: () => {
          const newRoundNumber = roundCount + 1;
          if (!tournament.hasAllScoresSubmitted && tournament.rounds.length > 0) {
            showToast(`Missing scores`, "error");
          }
          tournament.createRound(settings.matchingSpec, nextRoundInfo.matchCount);
          changeRound(roundCount);
        },
      }) : null,
      tournament.rounds.length > 0 ? m(ToggleFullscreenButton, { isFullscreen: fullscreen, fullscreen: fullscreen, onclick: toggleFullscreen }) : null,
      !fullscreen ? m(Nav, { nav, currentPage }) : null,
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

import m from "mithril";
import "./RoundPage.css";
import { PlayerCard } from "./PlayerCard.ts";
import { Tournament, Match } from "../model/Tournament.ts";
import { Settings } from "../model/Settings.ts";
import { MatchSection } from "./MatchSection.ts";
import { Swipeable } from "./Swipeable.ts";
import { FAB } from "./FAB.ts";
import { getMatchingSpecName } from "../model/Tournament.matching.ts";
import { HelpCard } from "./HelpCard.ts";
import { Header, HeaderAction } from "./Header.ts";
import { ExitFullscreenButton } from "./ExitFullscreenButton.ts";
import { ScoreEntryModal } from "./ScoreEntryModal.ts";
import { Nav } from "./Nav.ts";
import { Page } from "../App.ts";

export interface RoundAttrs {
  settings: Settings;
  tournament: Tournament;
  roundIndex: number;
  changeRound: (index: number) => void;
  showToast?: (message: string, type?: "success" | "error" | "info") => void;
  nav: (page: Page) => void;
  currentPage: Page;
}

interface RoundState {
  scoreEntryMatch?: {
    roundIndex: number;
    matchIndex: number;
    match: Match;
    scrollPosition: number;
  };
  fullscreen: boolean;
  wakeLock: WakeLockSentinel | null;
  wakeLockListener?: { onchange: () => Promise<void> };
}

export const RoundPage: m.Component<RoundAttrs, RoundState> = {
  oninit: async ({ attrs, state }) => {
    state.scoreEntryMatch = undefined;
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
    const matchesPerRound = Math.min(
      Math.floor(tournament.activePlayerCount / 4),
      settings.courts,
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

    // Score entry handlers
    const openScoreEntry = (roundIndex: number, matchIndex: number, match: Match) => {
      state.scoreEntryMatch = {
        roundIndex,
        matchIndex,
        match,
        scrollPosition: window.scrollY
      };
    };

    const closeScoreEntry = () => {
      const scrollY = state.scoreEntryMatch?.scrollPosition ?? 0;
      state.scoreEntryMatch = undefined;
      
      // Restore parent scroll after DOM updates (double RAF)
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          window.scrollTo(0, scrollY);
        });
      });
    };

    // Build actions for header overflow menu
    const actions: HeaderAction[] = [
      {
        label: fullscreen ? "⛶ Exit Fullscreen" : "⛶ Enter Fullscreen",
        onclick: () => {
          toggleFullscreen();
        },
      },
      {
        label: isWakeLockActive ? "⏿ Allow Screen to Turn Off" : "⏿ Keep Screen On",
        onclick: () => {
          settings.enableWakeLock(!settings.wakeLock);
        },
        disabled: !("wakeLock" in navigator),
      },
      {
        label: settings.debug ? "? Hide Debug Info" : "? Show Debug Info",
        onclick: () => {
          settings.showDebug(!settings.debug);
        },
      },
    ];

    // Add delete actions only when there are rounds
    if (tournament.rounds.length > 0) {
      actions.push(
        {
          label: "－ Delete Last Round",
          onclick: () => {
            const lastRound = tournament.rounds.at(-1);
            if (lastRound) {
              const lastRoundNumber = tournament.rounds.length;
              lastRound.delete();
              // Navigate to previous round if we were viewing the last round
              if (roundIndex >= tournament.rounds.length) {
                changeRound(Math.max(0, tournament.rounds.length - 1));
              }
              if (showToast) {
                showToast(`Deleted Round ${lastRoundNumber}`, "success");
              }
            }
          },
          confirmation: {
            title: `🚨 Delete Round ${roundCount}?`,
            description: [
              "This will delete the last round and all its matches.",
              "This action cannot be undone!"
            ],
            confirmButtonText: "Delete"
          }
        },
        {
          label: "↺ Delete All Rounds",
          onclick: () => {
            tournament.restart();
            if (showToast) {
              showToast("Deleted all rounds", "success");
            }
          },
          confirmation: {
            title: "🚨 Delete All Rounds?",
            description: [
              "This will delete all rounds, but keep all players and their registration status.",
              "This action cannot be undone!"
            ],
            confirmButtonText: "Delete"
          }
        }
      );
    }

    return m.fragment({ key: `round-${roundIndex}` }, [
      !fullscreen ?
        m(Header, {
          title: (round
            ? roundIndex + 1 === roundCount
              ? `Round ${roundIndex + 1}`
              : `Round ${roundIndex + 1}/${roundCount}`
            : "Rounds") + (isWakeLockActive ? " ⏿" : ""),
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
              m(MatchSection, { roundIndex, match, matchIndex, debug: settings.debug, showRoundIndex: fullscreen, openScoreEntry }),
            ),
            round.paused.length > 0 || round.inactive.length > 0
              ? [
                m(
                  "section.benched",
                  [
                    // Paused players first (with sleep emoji)
                    ...round.paused.map((player) =>
                      m(PlayerCard, { player, debug: settings.debug, badge: "💤" })
                    ),
                    // Inactive players after (with power off emoji)
                    ...round.inactive.map((player) =>
                      m(PlayerCard, { player, debug: settings.debug, badge: "⏻" })
                    )
                  ]
                ),
              ]
              : null,
          ]
          : [m(HelpCard, 
              tournament.activePlayerCount < 4
                ? {
                    message: "⚠️ Not enough active players",
                    hint: [
                      `You have ${tournament.activePlayerCount} active player${tournament.activePlayerCount !== 1 ? 's' : ''}, but need at least 4 to create rounds.`,
                      m("ul.tip-list", [
                        m("li", "Go to Players and make sure you have 4+ active players")
                      ])
                    ],
                    action: { label: "Go to Players", onclick: () => nav(Page.PLAYERS) }
                  }
                : {
                    message: "🚀 Ready to play?",
                    hint: [
                      "Tap the ", m("strong", "＋"), " button to create your first round!",
                      m("ul.tip-list", [
                        m("li", `Playing ${getMatchingSpecName(settings.matchingSpec)} mode`),
                        m("li", `${tournament.activePlayerCount} active player${tournament.activePlayerCount !== 1 ? 's' : ''} + ${settings.courts} court${settings.courts !== 1 ? 's' : ''} = ${matchesPerRound} match${matchesPerRound !== 1 ? 'es' : ''} per round`)
                      ])
                    ]
                  }
            )],
      ),
      matchesPerRound >= 1 ? m(FAB, {
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
      }) : null,
      fullscreen ? m(ExitFullscreenButton, { onclick: toggleFullscreen }) : null,
      !fullscreen ? m(Nav, { nav, currentPage }) : null,
      // Score entry modal (conditionally rendered)
      state.scoreEntryMatch ? m(ScoreEntryModal, {
        roundIndex: state.scoreEntryMatch.roundIndex,
        matchIndex: state.scoreEntryMatch.matchIndex,
        match: state.scoreEntryMatch.match,
        onClose: closeScoreEntry
      }) : null,
    ]);
  },
};

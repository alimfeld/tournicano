import m from "mithril";
import "./PlayersPage.css";
import { Tournament, PlayerId } from "../model/Tournament.ts";
import { GroupView } from "./GroupView.ts";
import { FAB } from "./FAB.ts";
import { Settings } from "../model/Settings.ts";

export interface PlayersAttrs {
  settings: Settings;
  tournament: Tournament;
  playerFilter: string;
  changePlayerFilter: (playerFilter: string) => void;
  showToast: (message: string, duration?: number) => void;
}

interface PlayersPageState {
  keepVisiblePlayers: Set<PlayerId>; // Players to keep visible across all groups
  inactivityTimeout: number | null;
}

export const PlayersPage: m.Component<PlayersAttrs> = {
  oninit: ({ state }) => {
    (state as PlayersPageState).keepVisiblePlayers = new Set();
    (state as PlayersPageState).inactivityTimeout = null;
  },

  onremove: ({ state }) => {
    // Clear pending timeout when component is removed
    const pageState = state as PlayersPageState;
    if (pageState.inactivityTimeout !== null) {
      clearTimeout(pageState.inactivityTimeout);
    }
  },

  view: ({ state, attrs: { settings, tournament, playerFilter, changePlayerFilter, showToast } }) => {
    const pageState = state as PlayersPageState;

    // Handler for player activity - manages shared keep-visible state
    const handlePlayerActivity = (playerId: PlayerId, shouldKeepVisible: boolean) => {
      // Clear any existing timeout and restart the inactivity period
      if (pageState.inactivityTimeout !== null) {
        clearTimeout(pageState.inactivityTimeout);
        pageState.inactivityTimeout = null;
      }

      // Update the keep-visible set
      if (shouldKeepVisible) {
        pageState.keepVisiblePlayers.add(playerId);
      } else {
        pageState.keepVisiblePlayers.delete(playerId);
      }

      // Start new inactivity timeout to remove all kept-visible players
      if (pageState.keepVisiblePlayers.size > 0) {
        pageState.inactivityTimeout = window.setTimeout(() => {
          pageState.keepVisiblePlayers.clear();
          pageState.inactivityTimeout = null;
          m.redraw();
        }, 2000); // 2 seconds of inactivity
      }
    };

    const registerPlayers = () => {
      const input = document.getElementById("players") as HTMLInputElement;
      const groups = input.value.split(/\n/);
      let allAdded: string[] = [];
      let allDuplicates: string[] = [];
      
      groups.forEach((group, i) => {
        if (i < 4) {
          const line = group.trim();
          if (line) {
            // Split by comma or period (.) - double-tapping space produces a period on many devices
            const names = line.split(/[,.]/).map(name => name.trim()).filter(name => name.length > 0);
            const result = tournament.registerPlayers(names, i);
            allAdded = allAdded.concat(result.added);
            allDuplicates = allDuplicates.concat(result.duplicates);
          }
        }
      });
      input.value = "";
      
      // Show feedback message
      if (allDuplicates.length > 0) {
        const duplicateNames = allDuplicates.join(", ");
        showToast(`⚠️ Duplicate players ignored: ${duplicateNames}`);
      } else if (allAdded.length > 0) {
        const count = allAdded.length;
        showToast(`✓ Added ${count} player${count > 1 ? 's' : ''}`);
      }
    };
    const [active, total] = tournament
      .players()
      .reduce(
        (acc, player) => {
          if (player.active) {
            acc[0]++;
          }
          acc[1]++;
          return acc;
        },
        [0, 0],
      );
    const title =
      active === total ? `Players (${active})` : `Players (${active}/${total})`;
    return [
      m("header.players.container-fluid", m("h1", title)),
      m(
        "main.players.container-fluid.actions",
        // Registration form - shown only when registration is open
        settings.playersEditable ?
          m(
            "div.registration-section",
            m("div.group-header", m("h2", "Register Players")),
            m(
              "form",
              { onsubmit: (event: InputEvent) => event.preventDefault() },
              m("textarea", {
                id: "players",
                placeholder: "Separate players with commas or periods, and groups with newlines...",
                autocapitalize: "words",
              }),
              m("input.add", {
                type: "submit",
                value: "Add",
                onclick: registerPlayers,
              }),
            )
          ) : null,
        // Filter buttons - shown only when there is at least one player
        total > 0 ? m(
          "div.player-filter",
          { role: "group" },
          m(
            "button",
            {
              disabled: playerFilter !== "active" && playerFilter !== "inactive",
              onclick: () => {
                changePlayerFilter("all");
              },
            },
            "All",
          ),
          m(
            "button",
            {
              disabled: playerFilter === "active",
              onclick: () => {
                changePlayerFilter("active");
              },
            },
            "Active",
          ),
          m(
            "button",
            {
              disabled: playerFilter === "inactive",
              onclick: () => {
                changePlayerFilter("inactive");
              },
            },
            "Inactive",
          ),
        ) : null,
        // Player groups
        m(
          "section.players",
          tournament.groups.map((group) =>
            m(GroupView, {
              tournament,
              playerFilter,
              groupIndex: group,
              playersEditable: settings.playersEditable,
              keepVisiblePlayers: pageState.keepVisiblePlayers,
              onPlayerActivity: handlePlayerActivity,
            }),
          ),
        ),
      ),
      m(FAB, {
        icon: "⋮",
        iconOpen: "✕",
        variant: "secondary",
        disabled: tournament.players().length === 0,
        actions: [
          {
            icon: "⏎",
            label: settings.playersEditable ? "Close Registration" : "Open Registration",
            onclick: () => {
              settings.setPlayersEditable(!settings.playersEditable);
            },
            active: !settings.playersEditable,
          },
          {
            icon: "⊖",
            label: "Deactivate All",
            onclick: () => {
              tournament.activateAll(false);
            },
            disabled: active === 0,
          },
          {
            icon: "⊕",
            label: "Activate All",
            onclick: () => {
              tournament.activateAll(true);
            },
            disabled: active === total,
          },
          {
            icon: "␡",
            label: "Delete All",
            onclick: () => {
              tournament.reset();
              settings.setPlayersEditable(true);
              changePlayerFilter("all");
            },
            variant: "del",
            disabled: tournament.players().length === 0,
            confirmation: {
              title: "🚨 Delete All Players?",
              description: "This will delete all players and reset the tournament. This action cannot be undone!",
            }
          },
          {
            icon: "⿻",
            label: "Share / Export",
            onclick: async () => {
              const text = tournament.groups
                .map((group) =>
                  tournament
                    .players(group)
                    .map((player) => player.name)
                    .toSorted((p, q) => p < q ? -1 : p > q ? 1 : 0)
                    .join(", "),
                )
                .join("\n");
              
              try {
                await navigator.share({ text });
                showToast("✓ Players shared successfully");
              } catch (err) {
                // If share fails or is cancelled, try clipboard as fallback
                if (err instanceof Error && err.name !== 'AbortError') {
                  try {
                    await navigator.clipboard.writeText(text);
                    showToast("✓ Players copied to clipboard");
                  } catch (clipboardErr) {
                    showToast("⚠️ Failed to share or copy players");
                  }
                }
                // If user cancelled, don't show any message
              }
            },
            disabled: tournament.players().length === 0,
          }
        ]
      }),
    ];
  },
};

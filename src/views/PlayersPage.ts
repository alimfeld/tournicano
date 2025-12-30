import m from "mithril";
import "./PlayersPage.css";
import { Tournament, Player } from "../model/Tournament.ts";
import { getAvatar } from "./AvatarCache.ts";
import { PlayerFilters } from "../App.ts";
import { HelpCard } from "./HelpCard.ts";
import { Header } from "./Header.ts";
import { GroupSymbol } from "./GroupSymbol.ts";
import { GroupFilter } from "./GroupFilter.ts";
import { Nav } from "./Nav.ts";
import { Page } from "../App.ts";
import { PlayerModal } from "./PlayerModal.ts";
import { AddPlayersModal } from "./AddPlayersModal.ts";

export interface PlayersAttrs {
  tournament: Tournament;
  showToast: (message: string, type?: "success" | "error" | "info", duration?: number) => void;
  playerFilters: PlayerFilters;
  changePlayerFilters: (filters: PlayerFilters) => void;
  nav: (page: Page) => void;
  currentPage: Page;
}

interface PlayersState {
  showAddPlayersModal: boolean;
  playerView?: {
    player: Player;
    scrollPosition: number;
  };
}

export const PlayersPage: m.Component<PlayersAttrs, PlayersState> = {
  oninit: ({ state }) => {
    state.showAddPlayersModal = false;
    state.playerView = undefined;
  },

  view: ({ attrs: { tournament, showToast, playerFilters, changePlayerFilters, nav, currentPage }, state }) => {
    const closePlayerView = () => {
      const scrollY = state.playerView?.scrollPosition ?? 0;
      state.playerView = undefined;

      // Restore parent scroll after DOM updates (double RAF)
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          window.scrollTo(0, scrollY);
        });
      });
    };

    // Get all players from all groups
    const allPlayers = tournament.groups.flatMap(group => tournament.players(group));

    // Apply filters
    const filteredPlayers = allPlayers.filter(player => {
      // Search filter
      if (playerFilters.search && !player.name.toLowerCase().includes(playerFilters.search.toLowerCase())) {
        return false;
      }

      // Participating filter
      if (playerFilters.participatingOnly && !player.inAnyRound()) return false;

      // Group filter
      if (playerFilters.groups.length > 0 && !playerFilters.groups.includes(player.group)) {
        return false;
      }

      return true;
    });

    // Sort alphabetically by name
    const sortedPlayers = filteredPlayers.toSorted((a, b) =>
      a.name.toLowerCase() < b.name.toLowerCase() ? -1 :
        a.name.toLowerCase() > b.name.toLowerCase() ? 1 : 0
    );

    // Calculate counts (independent of any active filters)
    const totalPlayers = allPlayers.length;
    const participatingPlayers = allPlayers.filter(p => p.inAnyRound());
    const participatingCount = participatingPlayers.length;
    const activePlayerCount = tournament.activePlayerCount;
    const headerTitle = activePlayerCount === totalPlayers 
      ? `Players (${totalPlayers})`
      : `Players (${activePlayerCount}/${totalPlayers})`;

    // Count active filters
    const activeFilterCount =
      (playerFilters.search ? 1 : 0) +
      (playerFilters.participatingOnly ? 1 : 0) +
      playerFilters.groups.length;

    const toggleParticipatingFilter = () => {
      changePlayerFilters({
        ...playerFilters,
        participatingOnly: !playerFilters.participatingOnly
      });
    };

    const openAddPlayersModal = () => {
      state.showAddPlayersModal = true;
    };

    const closeAddPlayersModal = () => {
      state.showAddPlayersModal = false;
    };

    const openPlayerView = (player: Player) => {
      state.playerView = {
        player,
        scrollPosition: window.scrollY
      };
    };

    // Share players action
    const sharePlayersAction = async () => {
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
        showToast("Players shared successfully", "success");
      } catch (err) {
        if (err instanceof Error && err.name !== 'AbortError') {
          try {
            await navigator.clipboard.writeText(text);
            showToast("Players copied to clipboard", "success");
          } catch (clipboardErr) {
            showToast("Failed to share or copy players", "error");
          }
        }
      }
    };

    // Toggle all filtered players
    const toggleAllFiltered = () => {
      // Count active players in filtered set
      const filteredActiveCount = sortedPlayers.filter(p => p.active).length;
      const shouldActivate = filteredActiveCount < sortedPlayers.length;

      // Count how many will actually change
      const affectedCount = shouldActivate
        ? sortedPlayers.length - filteredActiveCount  // Count of inactive players
        : filteredActiveCount;                         // Count of active players

      // Toggle all filtered players
      sortedPlayers.forEach(player => {
        player.activate(shouldActivate);
      });

      // Show accurate toast
      const action = shouldActivate ? "activated" : "deactivated";
      showToast(`${affectedCount} player${affectedCount !== 1 ? 's' : ''} ${action}`, "success");
    };

    // Delete all players action
    const deleteAllPlayersAction = () => {
      tournament.reset();
      changePlayerFilters({ search: "", participatingOnly: false, groups: [] });
      showToast("All players deleted", "success");
    };

    return [
      // Header
      m(Header, {
        title: headerTitle,
        actions: [
          {
            label: "＋ Add Players",
            onclick: openAddPlayersModal
          },
          {
            label: "⤴ Share Players",
            onclick: sharePlayersAction,
            disabled: totalPlayers === 0
          },
          {
            label: "␡ Delete All Players",
            onclick: deleteAllPlayersAction,
            disabled: totalPlayers === 0,
            confirmation: {
              title: "🚨 Delete All Players?",
              description: [
                "This will delete all players and all rounds.",
                "This action cannot be undone!"
              ],
              confirmButtonText: "Delete"
            }
          }
        ]
      }),
      m(
        "main.players.container",
        // Search bar and filters (only show when there are players)
        totalPlayers > 0 ? [
          m("input", {
            type: "search",
            id: "player-search",
            name: "player-search",
            placeholder: "Search players...",
            value: playerFilters.search,
            oninput: (e: Event) => {
              changePlayerFilters({
                ...playerFilters,
                search: (e.target as HTMLInputElement).value
              });
            }
          }),

          // Filter pills
          m("section.filter-section",
            // Only show participating filter if there are both participating and non-participating players
            participatingCount > 0 && participatingCount < totalPlayers ? m("button", {
              class: playerFilters.participatingOnly ? "" : "outline",
              onclick: toggleParticipatingFilter
            }, `🚀 (${allPlayers.filter(p => {
              // Apply group filters if active
              if (playerFilters.groups.length > 0 && !playerFilters.groups.includes(p.group)) {
                return false;
              }
              return p.inAnyRound();
            }).length})`) : null,
            tournament.groups.length > 1 ? m(GroupFilter, {
              groups: tournament.groups,
              selectedGroups: playerFilters.groups,
              onGroupsChange: (groups) => changePlayerFilters({ ...playerFilters, groups }),
              getGroupCount: (g) => {
                const groupPlayers = tournament.players(g);
                return groupPlayers.filter(p => {
                  // Apply participating filter if active
                  if (playerFilters.participatingOnly && !p.inAnyRound()) {
                    return false;
                  }
                  return true;
                }).length;
              }
            }) : null
          )
        ] : null,

        // Player list
        sortedPlayers.length > 0
          ? m("div.players-grid", {
            class: tournament.groups.length > 1 ? "has-groups" : ""
          },
            // Header row
            m("div.header-row",
              m("div.header-cell.player-header", "Player"),
              m("div.header-cell.active-header",
                m("input", {
                  type: "checkbox",
                  role: "switch",
                  checked: sortedPlayers.every(p => p.active),
                  oncreate: (vnode: m.VnodeDOM) => {
                    const filteredActiveCount = sortedPlayers.filter(p => p.active).length;
                    const allActive = filteredActiveCount === sortedPlayers.length;
                    const noneActive = filteredActiveCount === 0;
                    if (!allActive && !noneActive) {
                      (vnode.dom as HTMLInputElement).indeterminate = true;
                    }
                  },
                  onupdate: (vnode: m.VnodeDOM) => {
                    const filteredActiveCount = sortedPlayers.filter(p => p.active).length;
                    const allActive = filteredActiveCount === sortedPlayers.length;
                    const noneActive = filteredActiveCount === 0;
                    (vnode.dom as HTMLInputElement).indeterminate = !allActive && !noneActive;
                  },
                  title: sortedPlayers.every(p => p.active)
                    ? "Deactivate all filtered players"
                    : "Activate all filtered players",
                  onclick: (e: Event) => {
                    e.stopPropagation();
                    toggleAllFiltered();
                  }
                })
              )
            ),
            // Player rows
            sortedPlayers.map((player) => {
              return m("div.player-row", {
                key: player.id,
                onclick: () => openPlayerView(player)
              },
                m("div.player-cell.avatar-cell",
                  m("img", { src: getAvatar(player.name), alt: "" })
                ),
                m("div.player-cell.name-cell",
                  player.inAnyRound() ? m("span.participating-icon", "🚀") : null,
                  m("span.name-text", player.name)
                ),
                tournament.groups.length > 1 ? m("div.player-cell.group-cell",
                  m(GroupSymbol, { group: player.group })
                ) : null,
                m("div.player-cell.active-cell",
                  m("input", {
                    type: "checkbox",
                    role: "switch",
                    id: `player-active-${player.id}`,
                    name: `player-active-${player.id}`,
                    checked: player.active,
                    title: player.active ? "Active" : "Inactive",
                    onclick: (e: Event) => {
                      e.stopPropagation();
                      player.activate(!player.active);
                    }
                  })
                )
              );
            })
          )
          : playerFilters.search || activeFilterCount > 0
            ? m(HelpCard, {
              message: "🔍 No players found",
              hint: "Try different filters or search terms, or clear all filters to see everyone.",
              action: {
                label: "Clear All Filters",
                onclick: () => changePlayerFilters({ search: "", participatingOnly: false, groups: [] })
              }
            })
            : m(HelpCard, {
              message: "🎾 Ready to start your tournament?",
              hint: [
                "Add players to get started. Each player gets a unique avatar for easy recognition.",
                m("ul.tip-list", [
                  m("li", "Players can be added anytime, even during an ongoing tournament"),
                  m("li", "Once added, use toggle switches to deactivate players when taking a break and activate players when re-joining")
                ])
              ],
              action: { label: "Add Your First Players", onclick: openAddPlayersModal }
            }),
      ),
      m(Nav, { nav, currentPage }),

      // Player modal (conditionally rendered)
      state.playerView ? m(PlayerModal, {
        player: state.playerView.player,
        onClose: closePlayerView,
        showToast
      }) : null,

      // Add Players modal (conditionally rendered)
      state.showAddPlayersModal ? m(AddPlayersModal, {
        tournament,
        onClose: closeAddPlayersModal,
        showToast
      }) : null
    ];
  },
};

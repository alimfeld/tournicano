import m from "mithril";
import "./PlayersPage.css";
import { Tournament, Player, PlayerFilter } from "../model/tournament/Tournament.ts";
import { getAvatar } from "./AvatarCache.ts";
import { PlayerFilters } from "../App.ts";
import { HelpCard } from "./HelpCard.ts";
import { Header } from "./Header.ts";
import { GroupSymbol } from "./GroupSymbol.ts";
import { GroupFilter } from "./GroupFilter.ts";
import { ActiveFilter } from "./ActiveFilter.ts";
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
  };
}

export const PlayersPage: m.Component<PlayersAttrs, PlayersState> = {
  oninit: ({ state }) => {
    state.showAddPlayersModal = false;
    state.playerView = undefined;
  },

  view: ({ attrs: { tournament, showToast, playerFilters, changePlayerFilters, nav, currentPage }, state }) => {
    const closePlayerView = () => {
      state.playerView = undefined;
    };

    // Convert app PlayerFilters to model PlayerFilter
    const modelFilter: PlayerFilter = {
      search: playerFilters.search || undefined,
      participating: playerFilters.participatingOnly ? true : undefined,
      groups: playerFilters.groups.length > 0 ? playerFilters.groups : undefined,
      active: playerFilters.activeFilter || "both",
    };

    // Get filtered and sorted players from model
    const sortedPlayers = tournament.getFilteredPlayers(modelFilter, "name");

    // Get all counts from model
    const allCounts = tournament.getPlayerCounts();
    const totalPlayers = allCounts.total;
    const participatingCount = allCounts.participating;
    const activePlayerCount = tournament.activePlayerCount;
    const headerTitle = totalPlayers === 0 ? "Players" : activePlayerCount === totalPlayers
      ? `Players (${totalPlayers})`
      : `Players (${activePlayerCount}/${totalPlayers})`;

    // Count active filters
    const activeFilterCount =
      (playerFilters.search ? 1 : 0) +
      (playerFilters.participatingOnly ? 1 : 0) +
      (playerFilters.activeFilter ? 1 : 0) +
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
        player
      };
    };

    // Share players action
    const sharePlayersAction = async () => {
      const text = tournament.exportPlayersText();

      try {
        await navigator.share({ text });
      } catch (err) {
        if (err instanceof Error && err.name !== 'AbortError') {
          try {
            await navigator.clipboard.writeText(text);
          } catch (clipboardErr) {
            showToast("Failed to share or copy players", "error");
          }
        }
      }
    };

    // Toggle all filtered players
    const toggleAllFiltered = () => {
      const result = tournament.toggleActivePlayers(sortedPlayers);
      showToast(result.message, result.success ? "success" : "error");
    };

    // Delete all players action
    const deleteAllPlayersAction = () => {
      tournament.reset();
      changePlayerFilters({ search: "", participatingOnly: false, groups: [], activeFilter: undefined });
      showToast("All players deleted", "success");
    };

    return [
      // Header
      m(Header, {
        title: headerTitle,
        actions: [
          {
            icon: "＋",
            label: "Add Players",
            onclick: openAddPlayersModal
          },
          {
            icon: "↺",
            label: "Delete All Players",
            onclick: deleteAllPlayersAction,
            disabled: totalPlayers === 0,
            confirmation: {
              title: "🚨 Delete All Players?",
              description: [
                "This will delete all players and restart the tournament.",
                "This action cannot be undone!"
              ],
              confirmButtonText: "Delete All"
            }
          },
          {
            icon: "⤴",
            label: "Share Players",
            onclick: sharePlayersAction,
            disabled: totalPlayers === 0
          },
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
            // Group filter (first)
            tournament.groups.length > 1 ? m(GroupFilter, {
              groups: tournament.groups,
              selectedGroups: playerFilters.groups,
              onGroupsChange: (groups) => changePlayerFilters({ ...playerFilters, groups }),
              compact: true,
              getGroupCount: (g) => {
                const groupFilter: PlayerFilter = {
                  groups: [g],
                  participating: playerFilters.participatingOnly ? true : undefined,
                  active: playerFilters.activeFilter || "both",
                };
                return tournament.getPlayerCounts(groupFilter).total;
              }
            }) : null,
            // Active/Inactive filter (second)
            m(ActiveFilter, {
              selectedFilter: playerFilters.activeFilter,
              onFilterChange: (filter) => changePlayerFilters({ ...playerFilters, activeFilter: filter }),
              getActiveCount: () => {
                const activeFilter: PlayerFilter = {
                  groups: playerFilters.groups.length > 0 ? playerFilters.groups : undefined,
                  participating: playerFilters.participatingOnly ? true : undefined,
                  active: "active",
                };
                return tournament.getPlayerCounts(activeFilter).total;
              },
              getInactiveCount: () => {
                const inactiveFilter: PlayerFilter = {
                  groups: playerFilters.groups.length > 0 ? playerFilters.groups : undefined,
                  participating: playerFilters.participatingOnly ? true : undefined,
                  active: "inactive",
                };
                return tournament.getPlayerCounts(inactiveFilter).total;
              }
            }),
            // Participating filter (third) - only show if there are both participating and non-participating players
            participatingCount > 0 && participatingCount < totalPlayers ? m("button", {
              class: playerFilters.participatingOnly ? "" : "outline",
              onclick: toggleParticipatingFilter
            }, `🚀 (${tournament.getPlayerCounts({
              groups: playerFilters.groups.length > 0 ? playerFilters.groups : undefined,
              active: playerFilters.activeFilter || "both",
              participating: true,
            }).total})`) : null
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
                  id: "select-all-players",
                  name: "select-all-players",
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
              title: "🔍 No players found",
              message: m("p", "Try different filters or search terms, or clear all filters to see everyone."),
              action: {
                label: "Clear All Filters",
                onclick: () => changePlayerFilters({ search: "", participatingOnly: false, groups: [], activeFilter: undefined })
              }
            })
            : m(HelpCard, {
              title: "🤖 Add Players to get started",
              message: m("ul", [
                m("li", "Add players anytime, even during a tournament"),
                m("li", "Organize players into groups for tournament formats"),
                m("li", "Activate players as they join or take breaks"),
              ]),
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

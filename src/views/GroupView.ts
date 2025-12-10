import m from "mithril";
import { PlayerView } from "./PlayerView.ts";
import { Tournament, RegisteredPlayer, PlayerId } from "../model/Tournament.ts";

export interface GroupAttrs {
  tournament: Tournament;
  playerFilter: string;
  groupIndex: number;
  playersEditable: boolean;
}

interface GroupState {
  fadingPlayers: Set<PlayerId>;
  fadeTimeouts: Map<PlayerId, number>;
}

const getGroupLetter = (index: number): string => String.fromCharCode(65 + index);

const createMenuItem = (
  href: string,
  onclick: (e: Event) => void,
  label: string,
  className?: string
) => {
  return m("li",
    m(`a${className ? `.${className}` : ""}`,
      {
        href,
        onclick: (e: Event) => {
          e.preventDefault();
          onclick(e);
        },
      },
      label
    )
  );
};

export const GroupView: m.Component<GroupAttrs> = {
  oninit: ({ state }) => {
    (state as GroupState).fadingPlayers = new Set();
    (state as GroupState).fadeTimeouts = new Map();
  },
  
  onremove: ({ state }) => {
    // Clear all pending timeouts when component is removed
    const groupState = state as GroupState;
    groupState.fadeTimeouts.forEach(timeout => clearTimeout(timeout));
    groupState.fadeTimeouts.clear();
  },
  
  view: ({ state, attrs: { tournament, playerFilter, groupIndex, playersEditable } }) => {
    const groupState = state as GroupState;
    const allPlayers = tournament.players(groupIndex);
    
    // Helper function to check if player matches current filter
    const matchesFilter = (p: RegisteredPlayer): boolean => {
      return playerFilter === "all" ||
        (playerFilter === "active" && p.active) ||
        (playerFilter === "inactive" && !p.active);
    };
    
    // Include both matching players AND players that are fading out
    const players = allPlayers.filter(p =>
      groupState.fadingPlayers.has(p.id) || matchesFilter(p)
    );
    
    const activeCount = players.reduce((acc, player) => acc + (player.active ? 1 : 0), 0);
    const title = `${getGroupLetter(groupIndex)} (${playerFilter === "inactive" ? players.length : activeCount}/${allPlayers.length})`;
    
    // Handle player activation with fade-out
    const handleActivate = (player: RegisteredPlayer) => {
      player.activate(!player.active);
      
      // If player no longer matches filter after toggle, start fade-out
      if (!matchesFilter(player)) {
        groupState.fadingPlayers.add(player.id);
        
        // Clear any existing timeout for this player
        const existingTimeout = groupState.fadeTimeouts.get(player.id);
        if (existingTimeout) {
          clearTimeout(existingTimeout);
        }
        
        // Set new timeout to remove player after fade duration
        const timeout = window.setTimeout(() => {
          groupState.fadingPlayers.delete(player.id);
          groupState.fadeTimeouts.delete(player.id);
          m.redraw();
        }, 3000); // 3 seconds
        
        groupState.fadeTimeouts.set(player.id, timeout);
      } else {
        // Player matches filter again (reversed action during fade)
        // Remove from fading set and clear timeout
        if (groupState.fadingPlayers.has(player.id)) {
          groupState.fadingPlayers.delete(player.id);
          const existingTimeout = groupState.fadeTimeouts.get(player.id);
          if (existingTimeout) {
            clearTimeout(existingTimeout);
            groupState.fadeTimeouts.delete(player.id);
          }
        }
      }
    };
    
    const renderPlayerMenu = (player: RegisteredPlayer) => {
      if (!playersEditable) return null;
      
      return m("details.dropdown.player-menu",
        {
          // Prevent menu interactions from activating/deactivating the player
          onclick: (e: Event) => e.stopPropagation(),
          ontouchstart: (e: Event) => e.stopPropagation()
        },
        m("summary", { role: "button", class: "secondary outline" }, "☰"),
        m("ul",
          groupIndex > 0 ? createMenuItem(
            "#",
            () => player.setGroup(groupIndex - 1),
            `↑ Move to Group ${getGroupLetter(groupIndex - 1)}`
          ) : null,
          groupIndex < 3 ? createMenuItem(
            "#",
            () => player.setGroup(groupIndex + 1),
            `↓ Move to Group ${getGroupLetter(groupIndex + 1)}`
          ) : null,
          !player.isParticipating() ? createMenuItem(
            "#",
            () => player.withdraw(),
            "␡ Delete Player",
            "delete"
          ) : null
        )
      );
    };
    
    return [
      m("div.group-header", m("h2", title)),
      // Only render the table if there are players to show
      players.length > 0 ? m("section.group",
        players
          .toSorted((p, q) => p.name.localeCompare(q.name))
          .map(player => {
            const isFading = groupState.fadingPlayers.has(player.id);
            const rowClass = `${player.active ? "active" : "inactive"}${isFading ? " fading-out" : ""}`;
            
            return m("div.player-row",
              {
                key: player.id, // Keyed element for stable identity
                class: rowClass
              },
              renderPlayerMenu(player),
              m("div.player-info",
                m(PlayerView, { player, compact: true })
              ),
              m("div.player-toggle",
                m("input.active", {
                  type: "checkbox",
                  name: "active",
                  role: "switch",
                  checked: player.active,
                  onclick: () => handleActivate(player),
                  ontouchend: (e: Event) => {
                    // Prevent double-firing on touch devices
                    e.preventDefault();
                    handleActivate(player);
                  }
                })
              )
            );
          })
      ) : null,
    ];
  },
};

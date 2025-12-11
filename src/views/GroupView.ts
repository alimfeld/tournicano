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
  keepVisiblePlayers: Set<PlayerId>; // Players to keep visible despite filter
  inactivityTimeout: number | null;
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
    (state as GroupState).keepVisiblePlayers = new Set();
    (state as GroupState).inactivityTimeout = null;
  },
  
  onremove: ({ state }) => {
    // Clear pending timeout when component is removed
    const groupState = state as GroupState;
    if (groupState.inactivityTimeout !== null) {
      clearTimeout(groupState.inactivityTimeout);
    }
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
    
    // Include both matching players AND players that should be kept visible
    const players = allPlayers.filter(p =>
      matchesFilter(p) || groupState.keepVisiblePlayers.has(p.id)
    );
    
    const activeCount = players.reduce((acc, player) => acc + (player.active ? 1 : 0), 0);
    const title = `${getGroupLetter(groupIndex)} (${playerFilter === "inactive" ? players.length : activeCount}/${allPlayers.length})`;
    
    // Handle player activation with delayed removal
    const handleActivate = (player: RegisteredPlayer) => {
      player.activate(!player.active);
      
      // Clear any existing timeout and restart the inactivity period
      if (groupState.inactivityTimeout !== null) {
        clearTimeout(groupState.inactivityTimeout);
        groupState.inactivityTimeout = null;
      }
      
      // If player no longer matches filter, add to keep-visible set
      if (!matchesFilter(player)) {
        groupState.keepVisiblePlayers.add(player.id);
      } else {
        // Player matches filter again, remove from keep-visible set
        groupState.keepVisiblePlayers.delete(player.id);
      }
      
      // Start new inactivity timeout to remove all kept-visible players
      if (groupState.keepVisiblePlayers.size > 0) {
        groupState.inactivityTimeout = window.setTimeout(() => {
          groupState.keepVisiblePlayers.clear();
          groupState.inactivityTimeout = null;
          m.redraw();
        }, 2000); // 2 seconds of inactivity
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
            const rowClass = player.active ? "active" : "inactive";
            
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

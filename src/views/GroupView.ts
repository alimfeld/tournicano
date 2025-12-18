import m from "mithril";
import { PlayerView } from "./PlayerView.ts";
import { Tournament, TournamentPlayer } from "../model/Tournament.ts";

export interface GroupAttrs {
  tournament: Tournament;
  playerFilter: string;
  groupIndex: number;
  showToast: (message: string, type?: "success" | "error" | "info") => void;
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
  view: ({ attrs: { tournament, playerFilter, groupIndex, showToast } }) => {
    const allPlayers = tournament.players(groupIndex);

    // Helper function to check if player matches current filter
    const matchesFilter = (p: TournamentPlayer): boolean => {
      return playerFilter === "all" || (playerFilter === "registered" && p.registered);
    };

    // Filter players based on current filter
    const players = allPlayers.filter(matchesFilter);

    const activeCount = players.reduce((acc, player) => acc + (player.active ? 1 : 0), 0);
    const registeredCount = allPlayers.reduce((acc, player) => acc + (player.registered ? 1 : 0), 0);

    // Show different counts based on active filter
    const title = playerFilter === "all"
      ? `${getGroupLetter(groupIndex)} (${registeredCount}/${allPlayers.length})`
      : `${getGroupLetter(groupIndex)} (${activeCount}/${registeredCount})`;

    // Handle player activation
    const handleActivate = (player: TournamentPlayer) => {
      player.activate(!player.active);
    };

    // Handle registered toggle
    const handleRegisteredToggle = (player: TournamentPlayer, showToast: (msg: string, type?: "success" | "error" | "info") => void) => {
      if (player.registered) {
        if (!player.unregister()) {
          showToast("Cannot unregister players who are in any round", "error");
        }
      } else {
        player.register();
      }
    };

    const renderPlayerMenu = (player: TournamentPlayer) => {
      return m("details.dropdown.player-menu",
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
          !player.inAnyRound() ? createMenuItem(
            "#",
            () => player.delete(),
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
          .toSorted((p, q) => p.name < q.name ? -1 : p.name > q.name ? 1 : 0)
          .map(player => {
            // Only show activation status when viewing registered filter
            const rowClass = playerFilter === "registered"
              ? (player.active ? "active" : "inactive")
              : "";

            return m("div.player-row",
              {
                key: player.id, // Keyed element for stable identity
                class: rowClass
              },
              renderPlayerMenu(player),
              m("div.player-info",
                m(PlayerView, { player, compact: true, locked: player.inAnyRound() })
              ),
              // Show registered checkbox only when viewing all players
              // Disable checkbox if player is in a round (can't be unregistered)
              playerFilter === "all" ? m("div.player-toggle",
                m("input.registered", {
                  type: "checkbox",
                  name: "registered",
                  checked: player.registered,
                  disabled: player.registered && player.inAnyRound(),
                  onclick: () => handleRegisteredToggle(player, showToast)
                })
              ) : null,
              // Show Active toggle only when viewing registered filter
              playerFilter === "registered" ? m("div.player-toggle",
                m("input.active", {
                  type: "checkbox",
                  name: "active",
                  role: "switch",
                  checked: player.active,
                  disabled: !player.registered,
                  onclick: () => handleActivate(player)
                })
              ) : null
            );
          })
      ) : null,
    ];
  },
};

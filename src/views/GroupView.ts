import m from "mithril";
import { PlayerView } from "./PlayerView.ts";
import { Tournament } from "../model/Tournament.ts";

export interface GroupAttrs {
  tournament: Tournament;
  playerFilter: string;
  groupIndex: number;
  playersEditable: boolean;
}

export const GroupView: m.Component<GroupAttrs> = {
  view: ({ attrs: { tournament, playerFilter, groupIndex, playersEditable } }) => {
    const players = tournament.players(groupIndex).filter(p =>
      playerFilter === "all" ||
      playerFilter === "active" && p.active ||
      playerFilter === "inactive" && !p.active
    );
    const groupSize = tournament.players(groupIndex).length;
    const activeCount = players.reduce((acc, player) => acc + (player.active ? 1 : 0), 0);
    const isAllActive = playerFilter === "inactive" ? players.length === 0 : activeCount === groupSize;
    const title = `${String.fromCharCode(65 + groupIndex)} (${playerFilter === "inactive" ? players.length : activeCount}/${groupSize})`;
    return [
      m("div.group-header",
        m("h2", title),
        m("input", {
          type: "checkbox",
          name: "group-active",
          role: "switch",
          checked: isAllActive,
          onclick: (e: Event) => {
            e.stopPropagation();
            tournament.activateGroup(groupIndex, !isAllActive);
          }
        }),
      ),
      m("section.group",
        players
          .toSorted((p, q) => p.name.localeCompare(q.name))
          .map(player =>
            m(
              "div.player",
              {
                class: player.active ? "active" : "inactive",
                onclick: () => player.activate(!player.active),
              },
              m(PlayerView, {
                player,
                pre: [m("div.player-actions",
                  m("input.active", {
                    type: "checkbox",
                    name: "active",
                    role: "switch",
                    checked: player.active,
                  }),
                  player.isParticipating() || !playersEditable
                    ? null
                    : m(
                      "button.delete",
                      {
                        onclick: (e: InputEvent) => {
                          player.withdraw();
                          // Stop event from also triggering activation / deactivation
                          e.stopPropagation();
                        },
                      },
                      "-",
                    ),
                )],
                post: [playersEditable ? m("div.group-actions",
                  m("button.secondary.up",
                    {
                      disabled: groupIndex === 0,
                      onclick: (e: InputEvent) => {
                        player.setGroup(groupIndex - 1);
                        // Stop event from also triggering activation / deactivation
                        e.stopPropagation();
                      },
                    },
                    "↑"),
                  m("button.secondary.down",
                    {
                      onclick: (e: InputEvent) => {
                        player.setGroup(groupIndex + 1);
                        // Stop event from also triggering activation / deactivation
                        e.stopPropagation();
                      },
                    },
                    "↓"),
                ) : null],
              }),
            ),
          ),
      ),
    ];
  },
};

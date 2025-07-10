import m from "mithril";
import { PlayerView } from "./PlayerView.ts";
import { RegisteredPlayer } from "../model/Tournament.ts";

export interface GroupAttrs {
  players: RegisteredPlayer[];
  groupIndex: number;
  groupCount: number;
}

export const GroupView: m.Component<GroupAttrs> = {
  view: ({ attrs: { players, groupIndex, groupCount } }) => {
    const [active, total] = players.values().reduce(
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
      active == total
        ? `Group ${groupIndex + 1} (${active})`
        : `Group ${groupIndex + 1} (${active}/${total})`;
    return [
      groupCount > 1 ? m("h2", title) : null,
      m(
        "section.group",
        players
          .toSorted((p, q) => p.name.localeCompare(q.name))
          .map((player) =>
            m(
              "div.player",
              {
                class: player.active ? "active" : "inactive",
                onclick: () => player.activate(!player.active),
              },
              m(
                PlayerView,
                { player },
                m(
                  "div.player-actions",
                  m("input.active", {
                    type: "checkbox",
                    name: "active",
                    role: "switch",
                    checked: player.active,
                  }),
                  player.isParticipating()
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
                        "X",
                      ),
                ),
              ),
            ),
          ),
      ),
    ];
  },
};

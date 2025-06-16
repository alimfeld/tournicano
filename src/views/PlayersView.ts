import m from "mithril";
import "./PlayersView.css";
import { Attrs } from "../Model.ts";
import { Avatar } from "./Avatar.ts";
import { Nav } from "./Nav.ts";

export const PlayersView: m.Component<Attrs, {}> = {
  view: ({ attrs: { state, actions } }) => {
    const enrollPlayers = () => {
      const input = document.getElementById("players") as HTMLInputElement;
      const value = input.value.trim();
      if (value) {
        actions.enrollPlayers(value.split(/\s+/));
        input.value = "";
      }
    };
    const [active, total] = state.tournament.players.values().reduce(
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
      active == total ? `Players (${active})` : `Players (${active}/${total})`;
    return [
      m("header.players.container-fluid", m("h1", title)),
      m(Nav, { changeView: actions.changeView }),
      m(
        "main.players.container-fluid",
        m(
          "fieldset",
          { role: "group" },
          m("input", {
            id: "players",
            placeholder: "Anna Ben Paris Tyson",
            autocapitalize: "words",
          }),
          m(
            "button",
            {
              onclick: enrollPlayers,
            },
            "Enroll",
          ),
        ),
        m(
          "section.players",
          state.tournament.players
            .values()
            .toArray()
            .toSorted((p, q) => p.name.localeCompare(q.name))
            .map((player) =>
              m(
                "article.player",
                {
                  onclick: () =>
                    actions.updatePlayer(player.id, {
                      name: player.name,
                      active: !player.active,
                    }),
                },
                m(Avatar, { player }),
                m("p.name", player.name),
                player.matches + player.pauses == 0
                  ? m(
                      "button.delete",
                      {
                        onclick: (e: InputEvent) => {
                          actions.removePlayer(player.id);
                          e.stopPropagation();
                        },
                      },
                      "X",
                    )
                  : null,
                m("input.active", {
                  type: "checkbox",
                  role: "switch",
                  checked: player.active,
                }),
              ),
            ),
        ),
      ),
    ];
  },
};

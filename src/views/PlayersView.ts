import m from "mithril";
import "./PlayersView.css";
import { Attrs } from "../Model.ts";

export const PlayersView: m.Component<Attrs, {}> = {
  view: ({ attrs: { state, actions } }) => {
    const players = state.tournament.players.values().toArray();
    const enrollPlayers = () => {
      const input = document.getElementById("players") as HTMLInputElement;
      const value = input.value.trim();
      actions.enrollPlayers(value.split(/\s+/));
      input.value = "";
    }
    return m("main.players",
      m("table",
        m("thead",
          m("tr",
            m("th", { scope: "col", colspan: 2 }, "Player"),
            m("th", { scope: "col" }, "Active"),
            m("th", { scope: "col" }),
          )
        ),
        m("tbody",
          players.map((player) => m("tr",
            m("td",
              m("img.avatar", { src: `https://api.dicebear.com/9.x/${state.avatarStyle}/svg?seed=${player.name}` }),
            ),
            m("td",
              m("input", {
                type: "text",
                name: `name-${player.id}`,
                value: player.name,
                onchange: (event: InputEvent) => {
                  actions.updatePlayer(player.id, {
                    name: (event.target as HTMLInputElement).value,
                    active: player.active
                  })
                }
              }),
            ),
            m("td",
              m("input", {
                type: "checkbox",
                name: `active-${player.id}`,
                role: "switch",
                checked: player.active,
                onchange: () => {
                  actions.updatePlayer(player.id, {
                    name: player.name, active: !player.active
                  })
                }
              }),
            ),
            m("td",
              m("button.outline", {
                disabled: player.matches + player.pauses > 0,
                onclick: () => {
                  actions.removePlayer(player.id)
                }
              }, "❌"),
            ),
          )),
        ),
      ),

      m("fieldset", { role: "group" },
        m("input", { id: "players", placeholder: "Enter player names separated by space" }),
        m("button", { onclick: enrollPlayers }, "Enroll"),
      ),
    )
  }
};

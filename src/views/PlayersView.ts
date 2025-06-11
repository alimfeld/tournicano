import m from "mithril";
import "./PlayersView.css";
import { Attrs } from "../Model.ts";

export const PlayersView: m.Component<Attrs, {}> = {
  view: ({ attrs: { state, actions } }) => {
    const players = state.tournament.players.values().toArray();
    const enrollPlayers = () => {
      const input = document.getElementById("players") as HTMLInputElement
      const value = input.value
      const lines = value.split(/\s*\n/);
      actions.enrollPlayers(lines.map((line) => line.trim()));
      input.value = "";
    }
    return m("main.players",
      m("table",
        m("thead",
          m("tr",
            m("th", { scope: "col", colspan: 2 }, "Player"),
            m("th", { scope: "col" }, "Active"),
          )
        ),
        m("tbody",
          players.map((player) => m("tr",
            m("td",
              m("img.avatar", { src: `https://api.dicebear.com/9.x/${state.avatarStyle}/svg?seed=${player.name}` }),
            ),
            m("td",
              m("input", {
                type: "text", value: player.name,
                onchange: (event: InputEvent) => {
                  actions.updatePlayer(player.id, {
                    name: (event.target as HTMLInputElement).value,
                    active: player.active
                  })
                }
              }),
            ),
            m("td",
              m("input", { type: "checkbox", role: "switch", checked: player.active, onchange: () => { actions.updatePlayer(player.id, { name: player.name, active: !player.active }) } }),
            ),
          )),
        ),
      ),
      m("textarea", { id: "players", placeholder: "Enter players line by line" }),
      m("button", { onclick: enrollPlayers }, "Enroll Players"),
    )
  }
};

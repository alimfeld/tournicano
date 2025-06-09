import m from "mithril";
import "./PlayersView.css";
import { Attrs } from "../Model.ts";

export const PlayersView: m.Component<Attrs, {}> = {
  view: ({ attrs: { state, actions } }) => {
    const players = state.tournament.getPlayers();
    const enrollPlayers = () => {
      const input = document.getElementById("players") as HTMLInputElement
      const value = input.value
      const lines = value.split(/\r?\n/);
      const names = lines.map(line => line.trim());
      actions.enrollPlayers(names);
      input.value = "";
    }
    return m("main.players",
      m("table",
        m("thead",
          m("tr",
            m("th", { scope: "col" }, "Player"),
            m("th", { scope: "col" }, "Active"),
            m("th", { scope: "col" }, "W/L/D"),
          )
        ),
        m("tbody",
          players.map((player) => m("tr",
            m("td.player",
              m("img.avatar", { src: `https://api.dicebear.com/9.x/${state.avatarStyle}/svg?seed=${player.name}` }),
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
            m("td", `${player.wins}/${player.losses}/${player.draws}`)
          )),
        ),
      ),
      m("details", { open: players.length < 4 },
        m("summary", "Enroll more"),
        m("textarea", { id: "players", placeholder: "Enter players to enroll line by line" }),
        m("button", { onclick: enrollPlayers }, "Enroll Players"),
      ),
    )
  }
};

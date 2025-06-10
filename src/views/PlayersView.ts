import m from "mithril";
import "./PlayersView.css";
import { Attrs } from "../Model.ts";

export const PlayersView: m.Component<Attrs, {}> = {
  view: ({ attrs: { state, actions } }) => {
    const players = state.tournament.getPlayers();
    const enrollPlayers = () => {
      const input = document.getElementById("players") as HTMLInputElement
      const value = input.value.trim()
      const names = value.split(/\s+/);
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
      m("fieldset", { role: "group" },
        m("input", { id: "players", placeholder: "Enter players separated by space..." }),
        m("input", { type: "submit", value: "Enroll", onclick: enrollPlayers }),
      ),
      m("label", "Matches per round:",
        m("input", {
          type: "number",
          inputmode: "numeric",
          value: state.matchesPerRound,
          min: 0,
          max: Math.floor(state.tournament.getPlayers().length / 4),
          step: 1,
          onclick: (event: InputEvent) => actions.updateMatchesPerRound((event.target as HTMLInputElement).valueAsNumber)
        }),
      ),
    )
  }
};

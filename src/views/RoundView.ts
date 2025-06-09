import m from "mithril";
import "./RoundView.css";
import { Attrs } from "../Model.ts";
import { Score } from "../core.ts";

export const RoundView: m.Component<Attrs, {}> = {
  view: ({ attrs: { state, actions } }) => {
    const players = state.tournament.getPlayerMap();
    const r = state.tournament.rounds.length - 1;
    const round = state.tournament.rounds.at(r);
    const player = (id: string) => {
      return m("div",
        m("img", { class: "avatar", src: `https://api.dicebear.com/9.x/${state.avatarStyle}/svg?seed=${players.get(id)!.name}` }),
        m("div", { class: "name" }, players.get(id)!.name)
      );
    }
    return m("section.round",
      round ? [...round.matches.map((match, i) =>
        m("div", { class: "match" },
          m("div",
            player(match[0][0]),
            m("input", {
              id: `score${r}${i}0`,
              type: "number",
              value: match[2] ? match[2][0] : "",
            }),
            player(match[0][1])
          ),
          m("div",
            player(match[1][0]),
            m("input", {
              id: `score${r}${i}1`,
              type: "number",
              value: match[2] ? match[2][1] : "",
              onchange: () => {
                const score = [
                  (document.getElementById(`score${r}${i}0`) as HTMLInputElement).valueAsNumber,
                  (document.getElementById(`score${r}${i}1`) as HTMLInputElement).valueAsNumber,
                ] as Score;
                actions.updateScore(r, i, score)
              },
            }),
            player(match[1][1]),
          ),
        )
      )] : [],
      m("button", { onclick: () => actions.createRound(1) }, "Generate next Round!")
    )
  }
};

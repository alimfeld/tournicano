import m from "mithril";
import "./RoundView.css";
import { Attrs } from "../Model.ts";
import { Score } from "../core.ts";

export const RoundView: m.Component<Attrs, {}> = {
  view: ({ attrs: { state, actions } }) => {
    const players = state.tournament.getPlayerMap();
    const r = state.tournament.rounds.length - 1;
    const round = state.tournament.rounds.at(r);
    const renderPlayer = (id: string) => {
      return m("div",
        m("img", { class: "avatar", src: `https://api.dicebear.com/9.x/${state.avatarStyle}/svg?seed=${players.get(id)!.name}` }),
        m("div", { class: "name" }, players.get(id)!.name)
      );
    }
    return m("main.round",
      round ? [...round.matches.map((match, i) =>
        m("div", { class: "match" },
          m("div", i + 1,),
          m("div",
            renderPlayer(match[0][0]),
            renderPlayer(match[0][1])
          ),
          m("div",
            m("input", {
              type: "text",
              placeholder: "--:--",
              inputmode: "numeric",
              oninput: (event: InputEvent) => {
                const input = event.target as HTMLInputElement
                // Remove non-digit characters
                let digits = input.value.replace(/\D/g, '');
                // Limit to 4 digits
                if (digits.length > 4) {
                  digits = digits.slice(0, 4);
                }
                // Format as XX:YY
                if (digits.length <= 2) {
                  input.value = digits;
                  // keep cursor in front of colon to make backspace work!
                  input.setSelectionRange(digits.length, digits.length);
                } else {
                  input.value = digits.slice(0, 2) + ':' + digits.slice(2);
                }
                // @ts-ignore
                event.redraw = false;
              },
              onchange: (event: InputEvent) => {
                const input = event.target as HTMLInputElement
                // Remove non-digit characters
                let digits = input.value.replace(/\D/g, '');
                if (digits.length <= 2) {
                  input.value = "";
                  return;
                }
                const score: Score = [parseInt(digits.slice(0, 2)), parseInt(digits.slice(2))];
                actions.updateScore(r, i, score);
              },
              value: match[2] ? `${String(match[2][0]).padStart(2, '0')}:${String(match[2][1]).padStart(2, '0')}` : null,
            }),
          ),
          m("div",
            renderPlayer(match[1][0]),
            renderPlayer(match[1][1]),
          ),
        )
      )] : [],
    )
  }
};

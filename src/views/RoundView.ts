import m from "mithril";
import "./RoundView.css";
import { Attrs } from "../Model.ts";
import { Score } from "../core.ts";

export const RoundView: m.Component<Attrs, {}> = {
  view: ({ attrs: { state, actions } }) => {
    const players = state.tournament.players;
    const round = state.tournament.rounds.at(state.roundIndex);
    const renderPlayer = (id: string) => {
      return m("div.player",
        m("img.avatar", { src: `https://api.dicebear.com/9.x/${state.avatarStyle}/svg?seed=${players.get(id)!.name}` }),
        m("div.name", players.get(id)!.name)
      );
    }
    return m("main.round",
      round ? [
        ...round.matches.map((match, i) =>
          m("div.match",
            m("div.team",
              renderPlayer(match[0][0]),
              renderPlayer(match[0][1])
            ),
            m("div.kitchen",
              m("h2", i + 1),
              m("input", {
                name: `score-${i}`,
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
                  actions.updateScore(state.roundIndex, i, score);
                },
                value: match[2] ? `${String(match[2][0]).padStart(2, '0')}:${String(match[2][1]).padStart(2, '0')}` : null,
              }),
            ),
            m("div.team",
              renderPlayer(match[1][0]),
              renderPlayer(match[1][1]),
            ),
          )
        ),
      ] : [],
      m("div.actions",
        m("button.outline", {
          disabled: state.roundIndex <= 0,
          onclick: () => actions.changeRound(state.roundIndex - 1)
        }, "⏪"),
        m("button.outline", {
          disabled: state.matchesPerRound <= 0,
          onclick: () => actions.createRound(state.matchesPerRound)
        }, "❇️"),
        m("button.outline", {
          disabled: state.roundIndex < 0,
          onclick: () => actions.removeRound(state.roundIndex)
        }, "❌"),
        m("button.outline", {
          disabled: state.roundIndex >= state.tournament.rounds.length - 1,
          onclick: () => actions.changeRound(state.roundIndex + 1)
        }, "⏩"),
      ),
      m("details",
        m("summary", "⚙️ Settings"),
        m("label", "Matches per round:",
          m("input", {
            type: "number",
            name: "matches-per-round",
            inputmode: "numeric",
            value: state.matchesPerRound,
            min: 0,
            step: 1,
            onclick: (event: InputEvent) => actions.updateMatchesPerRound((event.target as HTMLInputElement).valueAsNumber)
          }),
        ),
      ),
    )
  }
};

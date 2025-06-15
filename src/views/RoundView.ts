import m from "mithril";
import "./RoundView.css";
import { Attrs } from "../Model.ts";
import { Score, Team } from "../core.ts";
import { Avatar } from "./Avatar.ts";
import { Nav } from "./Nav.ts";

export const RoundView: m.Component<Attrs, {}> = {
  view: ({ attrs: { state, actions } }) => {
    const players = state.tournament.players;
    const round = state.tournament.rounds.at(state.roundIndex);
    const matchesPerRound = Math.min(
      Math.floor(
        state.tournament.players
          .values()
          .filter((player) => player.active)
          .toArray().length / 4,
      ),
      state.courts,
    );
    const renderPlayer = (id: string) => {
      const player = players.get(id)!;
      return m(
        "article.player",
        m(Avatar, { player: player }),
        m("p.name", player.name),
      );
    };
    const renderTeam = (team: Team) => {
      return m("article.team", renderPlayer(team[0]), renderPlayer(team[1]));
    };
    const title =
      state.roundIndex < 0
        ? "Start"
        : state.roundIndex + 1 == state.tournament.rounds.length
          ? `R${state.roundIndex + 1}`
          : `R${state.roundIndex + 1}/${state.tournament.rounds.length}`;
    return [
      m(
        "header.round.container-fluid",
        m(
          "button.delete",
          {
            disabled: state.roundIndex < 0,
            onclick: () => actions.removeRound(state.roundIndex),
          },
          "X",
        ),
        m("h1", title),
        m(
          "div",
          m(
            "button.prev",
            {
              disabled: state.roundIndex <= 0,
              onclick: () => actions.changeRound(state.roundIndex - 1),
            },
            "<",
          ),
          m(
            "button.next",
            {
              disabled: state.roundIndex >= state.tournament.rounds.length - 1,
              onclick: () => actions.changeRound(state.roundIndex + 1),
            },
            ">",
          ),
          m(
            "button.add",
            {
              disabled: matchesPerRound < 1,
              onclick: () => actions.createRound(state.courts),
            },
            `+ (${matchesPerRound})`,
          ),
        ),
      ),
      m(Nav, { changeView: actions.changeView }),
      m(
        "main.round.container-fluid",
        round
          ? [
              ...round.matches.map((match, i) =>
                m(
                  "section.match",
                  m("h2", i + 1),
                  renderTeam(match[0]),
                  renderTeam(match[1]),
                  m("input.score", {
                    name: `score-${i}`,
                    type: "text",
                    placeholder: "--:--",
                    inputmode: "numeric",
                    oninput: (event: InputEvent) => {
                      const input = event.target as HTMLInputElement;
                      // Remove non-digit characters
                      let digits = input.value.replace(/\D/g, "");
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
                        input.value =
                          digits.slice(0, 2) + ":" + digits.slice(2);
                      }
                      // @ts-ignore
                      event.redraw = false;
                    },
                    onblur: (event: InputEvent) => {
                      const input = event.target as HTMLInputElement;
                      // Remove non-digit characters
                      let digits = input.value.replace(/\D/g, "");
                      const score: Score | null =
                        digits.length == 4
                          ? [
                              parseInt(digits.slice(0, 2)),
                              parseInt(digits.slice(2)),
                            ]
                          : null;
                      if (score == null) {
                        input.value = "";
                      }
                      actions.updateScore(state.roundIndex, i, score);
                    },
                    value: match[2]
                      ? `${String(match[2][0]).padStart(2, "0")}:${String(match[2][1]).padStart(2, "0")}`
                      : null,
                  }),
                ),
              ),
              round.paused.length > 0
                ? m(
                    "article.paused",
                    round.paused.map((p) => renderPlayer(p)),
                  )
                : null,
            ]
          : [],
      ),
    ];
  },
};

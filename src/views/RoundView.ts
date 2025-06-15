import m from "mithril";
import "./RoundView.css";
import { Attrs } from "../Model.ts";
import { Match, Score, Team } from "../core.ts";
import { Avatar } from "./Avatar.ts";
import { Nav } from "./Nav.ts";

export const RoundView: m.Component<Attrs, {}> = {
  view: ({ attrs: { state, actions } }) => {
    const players = state.tournament.players;
    const round = state.tournament.rounds.at(state.config.roundIndex);
    const matchesPerRound = Math.min(
      Math.floor(
        state.tournament.players
          .values()
          .filter((player) => player.active)
          .toArray().length / 4,
      ),
      state.config.courts,
    );
    const renderPlayer = (id: string, c: string) => {
      const player = players.get(id)!;
      return m(
        `article.player.${c}`,
        m(Avatar, { player: player }),
        m("p.name", player.name),
      );
    };
    const renderPlayers = (team: Team) => {
      return [renderPlayer(team[0], "first"), renderPlayer(team[1], "second")];
    };
    const renderTeams = (match: Match) => {
      return [
        m("section.team.first", renderPlayers(match[0])),
        m("section.team.second", renderPlayers(match[1])),
      ];
    };
    const title =
      state.config.roundIndex < 0
        ? "Rounds"
        : state.config.roundIndex + 1 == state.tournament.rounds.length
          ? `R${state.config.roundIndex + 1}`
          : `R${state.config.roundIndex + 1}/${state.tournament.rounds.length}`;
    return [
      m(
        "header.round.container-fluid",
        m(
          "button.delete",
          {
            disabled: state.config.roundIndex < 0,
            onclick: () => actions.removeRound(state.config.roundIndex),
          },
          "X",
        ),
        m("h1", title),
        m(
          "div",
          m(
            "button.prev",
            {
              disabled: state.config.roundIndex <= 0,
              onclick: () => actions.changeRound(state.config.roundIndex - 1),
            },
            "<",
          ),
          m(
            "button.next",
            {
              disabled:
                state.config.roundIndex >= state.tournament.rounds.length - 1,
              onclick: () => actions.changeRound(state.config.roundIndex + 1),
            },
            ">",
          ),
          m(
            "button.add",
            {
              disabled: matchesPerRound < 1,
              onclick: () => actions.createRound(state.config.courts),
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
                  m("h2", `M${i + 1}`),
                  renderTeams(match),
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
                      actions.updateScore(state.config.roundIndex, i, score);
                    },
                    value: match[2]
                      ? `${String(match[2][0]).padStart(2, "0")}:${String(match[2][1]).padStart(2, "0")}`
                      : null,
                  }),
                ),
              ),
              round.paused.length > 0
                ? m(
                    "section.paused",
                    round.paused.map((p) => renderPlayer(p, "paused")),
                  )
                : null,
            ]
          : [m("p", "No rounds created (yet)!")],
      ),
    ];
  },
};

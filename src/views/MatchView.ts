import m from "mithril";
import { PlayerView } from "./PlayerView.ts";
import { Match, Score, Team } from "../model/Tournament.ts";

export interface MatchAttrs {
  match: Match;
  matchIndex: number;
}

export const MatchView: m.Component<MatchAttrs> = {
  view: ({ attrs: { match, matchIndex } }) => {
    const renderTeam = (team: Team) => {
      return m(
        "section.team",
        m(PlayerView, { player: team.player1 }),
        m(PlayerView, { player: team.player2 }),
      );
    };
    return [
      m("h2", `Match ${matchIndex + 1}`),
      m(
        "section.match",
        renderTeam(match.teamA),
        m(
          "section.score",
          m("input.score", {
            "aria-invalid": match.score ? "false" : "true",
            type: "text",
            name: `score${matchIndex}`,
            placeholder: "--:--",
            inputmode: "numeric",
            value: match.score
              ? `${String(match.score[0]).padStart(2, "0")}:${String(match.score[1]).padStart(2, "0")}`
              : null,
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
                input.value = digits.slice(0, 2) + ":" + digits.slice(2);
              }
              // @ts-ignore
              event.redraw = false;
            },
            onblur: (event: InputEvent) => {
              const input = event.target as HTMLInputElement;
              // Remove non-digit characters
              let digits = input.value.replace(/\D/g, "");
              const score: Score | undefined =
                digits.length == 4
                  ? [parseInt(digits.slice(0, 2)), parseInt(digits.slice(2))]
                  : undefined;
              if (score == undefined) {
                input.value = "";
              }
              match.submitScore(score);
            },
          }),
          m("small", match.score ? "submitted" : "enter 4 digits"),
        ),
        renderTeam(match.teamB),
      ),
    ];
  },
};

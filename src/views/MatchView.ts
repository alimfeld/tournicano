import m from "mithril";
import { PlayerView } from "./PlayerView.ts";
import { Match, Score, Team } from "../model/Tournament.ts";

export interface MatchAttrs {
  match: Match;
  matchIndex: number;
  debug: boolean;
}

export const MatchView: m.Component<MatchAttrs> = {
  view: ({ attrs: { match, matchIndex, debug } }) => {
    const avgTeamWinRatio = (team: Team) => {
      return (team.player1.winRatio + team.player2.winRatio) / 2;
    };
    const sumTeamPlusMinus = (team: Team) => {
      return team.player1.plusMinus + team.player2.plusMinus;
    };
    const diffTeamGroup = (team: Team) => {
      return Math.abs(team.player1.group - team.player2.group);
    };
    const renderMatchDebug = (match: Match) => {
      const opponentSum =
        match.teamA.player1.opponentCounts.get(match.teamB.player1.id)! +
        match.teamA.player1.opponentCounts.get(match.teamB.player2.id)! +
        match.teamA.player2.opponentCounts.get(match.teamB.player1.id)! +
        match.teamA.player2.opponentCounts.get(match.teamB.player2.id)!;
      return m(
        "div.debug",
        m("span", "ΔGroup"),
        m(
          "span",
          Math.abs(diffTeamGroup(match.teamA) - diffTeamGroup(match.teamB)),
        ),
        m("span", "ΣOpp"),
        m("span", opponentSum),
        m("span", "ΔWin%"),
        m(
          "span",
          (
            Math.abs(
              avgTeamWinRatio(match.teamA) - avgTeamWinRatio(match.teamB),
            ) * 100
          ).toFixed(0),
        ),
        m("span", "Δ+/-"),
        m(
          "span",
          Math.abs(
            sumTeamPlusMinus(match.teamA) - sumTeamPlusMinus(match.teamB),
          ),
        ),
      );
    };
    const renderTeamDebug = (team: Team) => {
      const partnerCount = team.player1.partnerCounts.get(team.player2.id)!;
      return m(
        "div.debug",
        m("span", "ΔGroup"),
        m("span", diffTeamGroup(team)),
        m("span", "ΣPartner"),
        m("span", partnerCount),
        m("span", "ØWin%"),
        m("span", (avgTeamWinRatio(team) * 100).toFixed(0)),
        m("span", "Σ+/-"),
        m("span", sumTeamPlusMinus(team)),
      );
    };
    const renderTeam = (team: Team) => {
      return m(
        "section.team",
        m(PlayerView, { player: team.player1, debug }),
        m(PlayerView, { player: team.player2, debug }),
      );
    };
    return [
      m("h2", matchIndex + 1),
      m(
        "section.match",
        debug ? renderTeamDebug(match.teamA) : null,
        debug ? renderMatchDebug(match) : null,
        debug ? renderTeamDebug(match.teamB) : null,
        renderTeam(match.teamA),
        m(
          "section.score",
          m("input.score", {
            "aria-invalid": match.score ? "false" : "true",
            type: "text",
            name: `score${matchIndex}`,
            placeholder: "--:--",
            inputmode: "numeric",
            tabindex: matchIndex + 1,
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
            onkeyup: (event: KeyboardEvent) => {
              if (event.key === 'Enter') {
                (event.target as HTMLInputElement).blur();
              }
            }
          }),
          m("small", match.score ? "submitted" : "enter 4 digits"),
        ),
        renderTeam(match.teamB),
      ),
    ];
  },
};

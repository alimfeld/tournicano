import m from "mithril";
import { PlayerView } from "./PlayerView.ts";
import { Match, Score, Team } from "../model/Tournament.ts";

export interface MatchAttrs {
  roundIndex: number;
  match: Match;
  matchIndex: number;
  debug: boolean;
  fullscreen: boolean;
}

export const MatchView = (): m.Component<MatchAttrs> => {
  let isEditing = false;
  let isValid = true;
  let scoreString = "";
  return {
    view: ({ attrs: { roundIndex, match, matchIndex, debug, fullscreen } }) => {
      if (!isEditing) {
        scoreString = match.score
          ? `${String(match.score[0]).padStart(2, "0")}:${String(match.score[1]).padStart(2, "0")}`
          : ""
        isValid = !!match.score
      }
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
          match.teamA.player1.opponents.get(match.teamB.player1.id)!.length +
          match.teamA.player1.opponents.get(match.teamB.player2.id)!.length +
          match.teamA.player2.opponents.get(match.teamB.player1.id)!.length +
          match.teamA.player2.opponents.get(match.teamB.player2.id)!.length;
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
        const partnerCount = team.player1.partners.get(team.player2.id)!.length;
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
      return m.fragment({ key: `match-${matchIndex}` },
        [
          m(
            "section.match",
            debug ? renderTeamDebug(match.teamA) : null,
            debug ? renderMatchDebug(match) : null,
            debug ? renderTeamDebug(match.teamB) : null,
            renderTeam(match.teamA),
            m(
              "section.vs",
              fullscreen ?
                m("h2.match", `${roundIndex + 1} - ${matchIndex + 1}`) :
                m("h2.match", matchIndex + 1),
              m("input.score", {
                type: "text",
                name: `score${matchIndex}`,
                class: isValid ? "valid" : "invalid",
                placeholder: "--:--",
                inputmode: "numeric",
                tabindex: matchIndex + 1,
                value: scoreString,
                oninput: (event: InputEvent) => {
                  isEditing = true;
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
                  isValid = digits.length === 4;
                  scoreString = input.value;
                },
                onblur: (event: InputEvent) => {
                  isEditing = false;
                  const input = event.target as HTMLInputElement;
                  // Remove non-digit characters
                  let digits = input.value.replace(/\D/g, "");
                  isValid = digits.length === 4;
                  const score: Score | undefined =
                    isValid
                      ? [parseInt(digits.slice(0, 2)), parseInt(digits.slice(2))]
                      : undefined;
                  if (score === undefined) {
                    input.value = "";
                  }
                  match.submitScore(score);
                },
                onkeyup: (event: KeyboardEvent) => {
                  if (event.key === 'Enter') {
                    (event.target as HTMLInputElement).blur();
                  }
                },
              }),
            ),
            renderTeam(match.teamB),
          ),
        ]);
    },
  };
};

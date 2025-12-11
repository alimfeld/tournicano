import m from "mithril";
import { Match, PlayerStats, Team } from "../model/Tournament.ts";

export interface MatchAttrs {
  roundIndex: number;
  match: Match;
  matchIndex: number;
  debug: boolean;
  fullscreen: boolean;
  openScoreEntry: (roundIndex: number, matchIndex: number, match: Match) => void;
  renderPlayer: (player: PlayerStats) => m.Children;
}

export const MatchView = (): m.Component<MatchAttrs> => {
  return {
    view: ({ attrs: { roundIndex, match, matchIndex, debug, fullscreen, openScoreEntry, renderPlayer } }) => {
      const scoreString = match.score
        ? `${match.score[0]}:${match.score[1]}`
        : "";
      const isValid = !!match.score;
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
          renderPlayer(team.player1),
          renderPlayer(team.player2),
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
              m("button.outline.score", {
                class: isValid ? "valid" : "invalid",
                onclick: () => openScoreEntry(roundIndex, matchIndex, match),
              }, scoreString || "--:--"),
            ),
            renderTeam(match.teamB),
          ),
        ]);
    },
  };
};

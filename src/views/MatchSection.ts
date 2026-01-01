import m from "mithril";
import "./MatchSection.css";
import { Match, ParticipatingPlayer, Team } from "../model/tournament/Tournament.ts";
import { ParticipatingPlayerCard } from "./ParticipatingPlayerCard.ts";

export interface MatchSectionAttrs {
  roundIndex: number;
  match: Match;
  matchIndex: number;
  
  // Mode toggle
  mode?: "interactive" | "display";  // Default: "interactive"
  showRoundIndex?: boolean;  // Control title format (replaces fullscreen)
  
  // Interactive mode only
  openScoreEntry?: (roundIndex: number, matchIndex: number, match: Match) => void;
  openPlayerModal?: (player: ParticipatingPlayer) => void;
  
  // Display mode only
  displayScore?: string;  // Override score text in display mode
}

export const MatchSection: m.Component<MatchSectionAttrs> = {
  view: ({ attrs: { roundIndex, match, matchIndex, mode, showRoundIndex, openScoreEntry, openPlayerModal, displayScore } }) => {
    const scoreString = match.score
      ? `${match.score[0]}:${match.score[1]}`
      : "";
    const isValid = !!match.score;
    const renderPlayer = (player: ParticipatingPlayer) => {
      return m(ParticipatingPlayerCard, { 
        key: `player-${player.id}`,
        player, 
        onClick: openPlayerModal ? () => openPlayerModal(player) : undefined
      });
    }
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
          renderTeam(match.teamA),
          m(
            "section.vs",
            showRoundIndex ?
              m("h2.match", `${roundIndex + 1} - ${matchIndex + 1}`) :
              m("h2.match", matchIndex + 1),
            mode === "display" ?
              m("div.score-text", displayScore ?? scoreString ?? "--:--") :
              m("button.outline.score", {
                class: isValid ? "valid" : "invalid",
                onclick: () => openScoreEntry!(roundIndex, matchIndex, match),
              }, scoreString || "--:--"),
          ),
          renderTeam(match.teamB),
        ),
      ]);
  },
};

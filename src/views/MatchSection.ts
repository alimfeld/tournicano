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
  autoFocus?: boolean;  // Auto-focus the score display when mounted
  onKeyDown?: (e: KeyboardEvent) => void;  // Keyboard event handler
}

export const MatchSection: m.Component<MatchSectionAttrs> = {
  view: ({ attrs: { roundIndex, match, matchIndex, mode, showRoundIndex, openScoreEntry, openPlayerModal, displayScore, autoFocus, onKeyDown } }) => {
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
              m("h2.match", `M ${roundIndex + 1}-${matchIndex + 1}`) :
              m("h2.match", `M ${matchIndex + 1}`),
            mode === "display" ?
              m("input.score-text", {
                type: "text",
                value: displayScore ?? scoreString ?? "--:--",
                tabindex: autoFocus ? 0 : undefined,
                readonly: true,
                onkeydown: onKeyDown,
                oncreate: autoFocus ? (vnode) => {
                  (vnode.dom as HTMLElement).focus();
                } : undefined
              }) :
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

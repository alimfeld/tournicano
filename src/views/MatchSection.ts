import m from "mithril";
import "./MatchSection.css";
import { Match, ParticipatingPlayer, Team } from "../model/tournament/Tournament.ts";
import { ParticipatingPlayerCard } from "./ParticipatingPlayerCard.ts";

export interface MatchSectionAttrs {
  roundIndex: number;
  match: Match;
  matchIndex: number;

  matchLabel?: string;

  // Interactive mode (score entry triggered by tapping the vs section)
  openScoreEntry?: (roundIndex: number, matchIndex: number, match: Match) => void;
  openPlayerModal?: (player: ParticipatingPlayer) => void;

  // Override displayed score (e.g. live preview during score entry)
  scoreDisplay?: string;

  // Switch mode support
  playerCardClass?: (player: ParticipatingPlayer) => string | undefined;
  playerBadge?: (player: ParticipatingPlayer) => string | undefined;
}

export const MatchSection: m.Component<MatchSectionAttrs> = {
  view: ({ attrs: { roundIndex, match, matchIndex, matchLabel, openScoreEntry, openPlayerModal, scoreDisplay, playerCardClass, playerBadge } }) => {
    const scoreString = match.score
      ? `${match.score[0]}:${match.score[1]}`
      : undefined;
    const displayText = scoreDisplay !== undefined
      ? scoreDisplay
      : (scoreString || "--:--");
    const isInteractive = !!openScoreEntry;

    const winner = match.score
      ? match.score[0] > match.score[1] ? "A"
      : match.score[0] < match.score[1] ? "B"
      : "draw"
      : undefined;

    const renderPlayer = (player: ParticipatingPlayer) => {
      return m(ParticipatingPlayerCard, {
        key: `player-${player.id}`,
        player,
        badge: playerBadge?.(player),
        class: playerCardClass?.(player),
        onClick: openPlayerModal ? () => openPlayerModal(player) : undefined
      });
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
          renderTeam(match.teamA),
          m(
            "section.vs",
            {
              class: isInteractive ? "interactive" : undefined,
              onclick: isInteractive ? () => openScoreEntry(roundIndex, matchIndex, match) : undefined,
            },
            matchLabel ? m("small.match", { class: !scoreDisplay && match.score ? "valid" : undefined },
              !scoreDisplay && winner === "A" ? `◀ ${matchLabel}` :
              !scoreDisplay && winner === "B" ? `${matchLabel} ▶` :
              matchLabel
            ) : null,
            m("span.score", displayText),
          ),
          renderTeam(match.teamB),
        ),
      ]);
  },
};

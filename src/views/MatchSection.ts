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
    const isInteractive = !!openScoreEntry;

    const renderScore = () => {
      if (scoreDisplay !== undefined) {
        // Live preview during score entry — render as plain text, no winner styling
        return scoreDisplay;
      }
      if (match.score) {
        const [scoreA, scoreB] = match.score;
        const aWins = scoreA > scoreB;
        const bWins = scoreB > scoreA;
        return [
          m("span", { class: aWins ? "winner" : undefined }, String(scoreA)),
          ":",
          m("span", { class: bWins ? "winner" : undefined }, String(scoreB)),
        ];
      }
      return "--:--";
    };

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
            matchLabel ? m("small.match", matchLabel) : null,
            m("span.score", renderScore()),
          ),
          renderTeam(match.teamB),
        ),
      ]);
  },
};

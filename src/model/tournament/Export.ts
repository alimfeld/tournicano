/**
 * @fileoverview Internal export logic for Tournament.
 * 
 * WARNING: This file contains internal implementation details.
 * DO NOT import from this file outside of src/model/Tournament*.ts files.
 * Use the exportStandingsText/exportBackup methods on the Tournament interface instead.
 */

import { ParticipatingPlayer, Player, Score, Round } from "./Tournament.ts";
import { Settings } from "../settings/Settings.ts";
import { MatchingSpec } from "../matching/MatchingSpec.ts";

// Export data structure for backups
export interface TournamentBackup {
  version: number;
  exportDate: string;
  settings: {
    courts: number;
    matchingSpec: MatchingSpec;
  };
  players: {
    name: string;
    group: number;
    active: boolean;
  }[];
  rounds: {
    matches: {
      teamA: [string, string];
      teamB: [string, string];
      score?: Score;
    }[];
    paused: string[];
    inactive: string[];
  }[];
}

/**
 * Convert group number to letter label (0→"A", 1→"B", etc.)
 */
function groupToLabel(groupNumber: number): string {
  return String.fromCharCode(65 + groupNumber);
}

/**
 * Format standings table as text
 */
function formatStandingsTable(
  standings: { rank: number; player: ParticipatingPlayer }[]
): string {
  if (standings.length === 0) {
    return "";
  }

  let result = "";

  // Calculate padding based on data
  const maxRank = standings.length;
  const rankPad = String(maxRank).length;
  const maxNameLength = Math.max(...standings.map(p => p.player.name.length));
  const namePad = Math.max(maxNameLength, 10); // At least 10 chars
  const maxPlusMinus = Math.max(...standings.map(p => Math.abs(p.player.plusMinus)));
  const plusMinusPad = String(maxPlusMinus).length + 1; // +1 for sign

  standings.forEach((ranked) => {
    const winRatioPercent = Math.round(ranked.player.winRatio * 100);
    const plusMinus = ranked.player.plusMinus >= 0 ? `+${ranked.player.plusMinus}` : `${ranked.player.plusMinus}`;
    const wdl = `(${ranked.player.wins}-${ranked.player.draws}-${ranked.player.losses})`;
    
    result += `${String(ranked.rank).padStart(rankPad, " ")}. ${ranked.player.name.padEnd(namePad, " ")} ${String(winRatioPercent).padStart(3, " ")}% ${wdl.padEnd(9, " ")} ${plusMinus.padStart(plusMinusPad, " ")}\n`;
  });

  return result;
}

/**
 * Export standings as formatted text
 */
export function exportStandingsText(
  rounds: Round[],
  roundIndex: number,
  groups?: number[]
): string {
  // Validate roundIndex
  const targetRoundIndex = Math.max(0, Math.min(roundIndex, rounds.length - 1));
  const targetRound = rounds[targetRoundIndex];

  if (!targetRound) {
    return "No standings available";
  }

  let result = "";
  
  // Determine header title based on filter
  let headerTitle: string;
  if (groups && groups.length === 1) {
    headerTitle = `GROUP ${groupToLabel(groups[0])} STANDINGS`;
  } else if (groups && groups.length > 1) {
    // Sort group labels alphabetically for consistency
    const groupLabels = groups.map(g => groupToLabel(g)).sort().join('+');
    headerTitle = `GROUPS ${groupLabels} STANDINGS`;
  } else {
    headerTitle = "STANDINGS";
  }

  // Add round info - show "of Y" only if not on final round
  const isLastRound = targetRoundIndex + 1 === rounds.length;
  const roundInfo = isLastRound
    ? ` - Round ${targetRoundIndex + 1}`
    : ` - Round ${targetRoundIndex + 1} of ${rounds.length}`;

  result += `${headerTitle}${roundInfo}\n`;
  result += "\n";

  // Determine which standings to show
  if (groups && groups.length === 1) {
    // Single group selected - show only that group
    const groupStandings = targetRound.standings(groups);
    if (groupStandings.length === 0) {
      result += "No standings available\n";
    } else {
      result += formatStandingsTable(groupStandings);
    }
  } else {
    // No filter or multiple groups - show overall standings
    const selectedGroups = groups && groups.length > 0 ? groups : undefined;
    const standings = targetRound.standings(selectedGroups);
    
    if (standings.length === 0) {
      result += "No standings available\n";
    } else {
      result += formatStandingsTable(standings);
    }
  }

  return result;
}

/**
 * Export full tournament backup as JSON
 */
export function exportBackup(
  settings: Settings,
  players: Player[],
  rounds: Round[]
): string {
  const backup: TournamentBackup = {
    version: 1,
    exportDate: new Date().toISOString(),
    settings: {
      courts: settings.courts,
      matchingSpec: settings.matchingSpec,
    },
    players: players
      .map(p => ({
        name: p.name,
        group: p.group,
        active: p.active,
      }))
      .sort((a, b) => {
        if (a.group !== b.group) return a.group - b.group;
        return a.name.localeCompare(b.name);
      }),
    rounds: rounds.map(round => ({
      matches: round.matches.map(match => ({
        teamA: [match.teamA.player1.name, match.teamA.player2.name],
        teamB: [match.teamB.player1.name, match.teamB.player2.name],
        score: match.score,
      })),
      paused: round.paused.map(p => p.name),
      inactive: round.inactive.map(p => p.name),
    })),
  };

  return JSON.stringify(backup, null, 2);
}

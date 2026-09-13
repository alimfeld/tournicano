/**
 * @fileoverview Internal export logic for Tournament.
 * 
 * WARNING: This file contains internal implementation details.
 * DO NOT import from this file outside of src/model/Tournament*.ts files.
 * Use the exportStandingsText/exportBackup methods on the Tournament interface instead.
 */

import { Player, Score, Round, RankedTeam } from "./Tournament.ts";
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

interface TableRow {
  rank: number;
  name: string;
  winRatio: number;
  plusMinus: number;
  wins: number;
  draws: number;
  losses: number;
}

/**
 * Format standings table as text
 */
function formatTable(rows: TableRow[], minNamePad: number): string {
  if (rows.length === 0) {
    return "";
  }

  let result = "";

  // Calculate padding based on data
  const maxRank = rows.length;
  const rankPad = String(maxRank).length;
  const maxNameLength = Math.max(...rows.map(r => r.name.length));
  const namePad = Math.max(maxNameLength, minNamePad);
  const maxPlusMinus = Math.max(...rows.map(r => Math.abs(r.plusMinus)));
  const plusMinusPad = String(maxPlusMinus).length + 1; // +1 for sign

  rows.forEach((row) => {
    const winRatioPercent = Math.round(row.winRatio * 100);
    const plusMinus = row.plusMinus >= 0 ? `+${row.plusMinus}` : `${row.plusMinus}`;
    const wdl = `(${row.wins}-${row.draws}-${row.losses})`;
    
    result += `${String(row.rank).padStart(rankPad, " ")}. ${row.name.padEnd(namePad, " ")} ${String(winRatioPercent).padStart(3, " ")}% ${wdl.padEnd(9, " ")} ${plusMinus.padStart(plusMinusPad, " ")}\n`;
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
      result += formatTable(groupStandings.map((ranked) => ({
      rank: ranked.rank,
      name: ranked.player.name,
      winRatio: ranked.player.winRatio,
      plusMinus: ranked.player.plusMinus,
      wins: ranked.player.wins,
      draws: ranked.player.draws,
      losses: ranked.player.losses,
    })), 10);
    }
  } else {
    // No filter or multiple groups - show overall standings
    const selectedGroups = groups && groups.length > 0 ? groups : undefined;
    const standings = targetRound.standings(selectedGroups);
    
    if (standings.length === 0) {
      result += "No standings available\n";
    } else {
      result += formatTable(standings.map((ranked) => ({
      rank: ranked.rank,
      name: ranked.player.name,
      winRatio: ranked.player.winRatio,
      plusMinus: ranked.player.plusMinus,
      wins: ranked.player.wins,
      draws: ranked.player.draws,
      losses: ranked.player.losses,
    })), 10);
    }
  }

  return result;
}

/**
 * Format team standings table as text
 */
function formatTeamStandingsTable(
  standings: RankedTeam[],
  getPlayerName: (playerId: string) => string
): string {
  return formatTable(standings.map((ranked) => ({
    rank: ranked.rank,
    name: `${getPlayerName(ranked.team.player1Id)} & ${getPlayerName(ranked.team.player2Id)}`,
    winRatio: ranked.team.winRatio,
    plusMinus: ranked.team.plusMinus,
    wins: ranked.team.wins,
    draws: ranked.team.draws,
    losses: ranked.team.losses,
  })), 15);
}

/**
 * Export team standings as formatted text
 */
export function exportTeamStandingsText(
  rounds: Round[],
  roundIndex: number,
  getPlayerName: (playerId: string) => string
): string {
  // Validate roundIndex
  const targetRoundIndex = Math.max(0, Math.min(roundIndex, rounds.length - 1));
  const targetRound = rounds[targetRoundIndex];

  if (!targetRound) {
    return "No standings available";
  }

  let result = "";
  
  // Header title
  const headerTitle = "TEAM STANDINGS";

  // Add round info - show "of Y" only if not on final round
  const isLastRound = targetRoundIndex + 1 === rounds.length;
  const roundInfo = isLastRound
    ? ` - Round ${targetRoundIndex + 1}`
    : ` - Round ${targetRoundIndex + 1} of ${rounds.length}`;

  result += `${headerTitle}${roundInfo}\n`;
  result += "\n";

  // Get team standings
  const teamStandings = targetRound.teamStandings();
  
  if (teamStandings.length === 0) {
    result += "No standings available\n";
  } else {
    result += formatTeamStandingsTable(teamStandings, getPlayerName);
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

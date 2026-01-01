/**
 * @fileoverview Internal export logic for Tournament.
 * 
 * WARNING: This file contains internal implementation details.
 * DO NOT import from this file outside of src/model/Tournament*.ts files.
 * Use the exportStandingsText/exportPlayersText/exportBackup methods on the Tournament interface instead.
 */

import { PlayerFilter, ParticipatingPlayer, Player, Score, Round } from "./Tournament.ts";
import { Settings } from "./Settings.ts";
import { MatchingSpec } from "./MatchingSpec.ts";

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
  standings: { rank: number; player: ParticipatingPlayer }[],
  totalRounds: number
): string {
  if (standings.length === 0) {
    return "";
  }

  let result = "";

  // Calculate dynamic padding based on data
  const maxRank = standings.length;
  const rankPad = String(maxRank).length;
  const maxNameLength = Math.max(...standings.map(p => p.player.name.length));
  const namePad = Math.max(maxNameLength, 10); // At least 10 chars
  const maxPlusMinus = Math.max(...standings.map(p => Math.abs(p.player.plusMinus)));
  const plusMinusPad = String(maxPlusMinus).length + 1; // +1 for sign
  const maxPointsFor = Math.max(...standings.map(p => p.player.pointsFor));
  const maxPointsAgainst = Math.max(...standings.map(p => p.player.pointsAgainst));
  const pointsPad = Math.max(String(maxPointsFor).length, String(maxPointsAgainst).length);

  standings.forEach((ranked) => {
    const participationCount = ranked.player.matchCount + ranked.player.pauseCount;
    const reliabilityPercent = totalRounds > 0 ? Math.round((participationCount / totalRounds) * 100) : 0;
    const winRatioPercent = Math.round(ranked.player.winRatio * 100);
    const plusMinus = ranked.player.plusMinus >= 0 ? `+${ranked.player.plusMinus}` : `${ranked.player.plusMinus}`;
    const wdl = `(${ranked.player.wins}-${ranked.player.draws}-${ranked.player.losses})`;
    const points = `(${String(ranked.player.pointsFor).padStart(pointsPad, " ")}-${String(ranked.player.pointsAgainst).padStart(pointsPad, " ")})`;
    result += `${String(ranked.rank).padStart(rankPad, " ")}. ${ranked.player.name.padEnd(namePad, " ")} ${String(winRatioPercent).padStart(3, " ")}% ${wdl.padEnd(9, " ")} ${plusMinus.padStart(plusMinusPad, " ")} ${points} ${String(reliabilityPercent).padStart(3, " ")}%\n`;
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
  
  // Header
  result += `STANDINGS - Round ${targetRoundIndex + 1} of ${rounds.length}\n`;
  result += `Export Date: ${new Date().toISOString()}\n`;
  result += "\n";

  // Determine which standings to show
  if (groups && groups.length === 1) {
    // Single group selected - show only that group
    const groupStandings = targetRound.standings(groups);
    if (groupStandings.length === 0) {
      result += `GROUP ${groupToLabel(groups[0])} STANDINGS\n`;
      result += "-".repeat(`GROUP ${groupToLabel(groups[0])} STANDINGS`.length) + "\n";
      result += "No standings available\n";
    } else {
      result += `GROUP ${groupToLabel(groups[0])} STANDINGS\n`;
      result += "-".repeat(`GROUP ${groupToLabel(groups[0])} STANDINGS`.length) + "\n";
      result += formatStandingsTable(groupStandings, rounds.length);
    }
  } else {
    // No filter or multiple groups - show overall standings
    const selectedGroups = groups && groups.length > 0 ? groups : undefined;
    const standings = targetRound.standings(selectedGroups);
    
    if (standings.length === 0) {
      result += "OVERALL STANDINGS\n";
      result += "-".repeat("OVERALL STANDINGS".length) + "\n";
      result += "No standings available\n";
    } else {
      result += "OVERALL STANDINGS\n";
      result += "-".repeat("OVERALL STANDINGS".length) + "\n";
      result += formatStandingsTable(standings, rounds.length);
    }
  }

  return result;
}

/**
 * Export players as text (comma-separated or organized by group)
 */
export function exportPlayersText(
  groups: number[],
  getPlayers: (group?: number) => Player[],
  getFilteredPlayers: (filter?: PlayerFilter) => Player[],
  filter?: PlayerFilter
): string {
  // If filter is provided, export filtered players as comma-separated list
  if (filter) {
    const players = getFilteredPlayers(filter);
    return players.map(p => p.name).join(", ");
  }
  
  // No filter: export all players organized by group
  return groups
    .map((group) =>
      getPlayers(group)
        .map((player) => player.name)
        .toSorted((p, q) => p < q ? -1 : p > q ? 1 : 0)
        .join(", ")
    )
    .join("\n");
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

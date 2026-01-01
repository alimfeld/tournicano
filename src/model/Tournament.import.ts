/**
 * @fileoverview Internal import logic for Tournament.
 * 
 * WARNING: This file contains internal implementation details.
 * DO NOT import from this file outside of src/model/Tournament*.ts files.
 * Use the importBackup method on the Tournament interface instead.
 */

import { PlayerId, Score } from "./Tournament.ts";
import { Settings } from "./Settings.ts";
import { TournamentBackup } from "./Tournament.export.ts";
import { TournamentContext } from "./Tournament.context.ts";
import { PlayerImpl, ParticipatingPlayerImpl } from "./Tournament.players.impl.ts";
import { RoundImpl } from "./Tournament.rounds.impl.ts";

/**
 * Import tournament from backup JSON
 */
export function importBackup(
  backupJson: string,
  settings: Settings,
  context: TournamentContext,
  reset: () => void,
  notifyChange: () => void,
  createPlayer: (id: PlayerId, name: string, group: number, active: boolean) => PlayerImpl,
  createRound: (
    index: number,
    participating: ParticipatingPlayerImpl[],
    matched: [[PlayerId, PlayerId], [PlayerId, PlayerId]][],
    paused: PlayerId[],
    inactive: PlayerId[]
  ) => RoundImpl
): { success: boolean; error?: string; summary?: string } {
  // Step 1: Parse JSON
  let backup: TournamentBackup;
  try {
    backup = JSON.parse(backupJson);
  } catch (e) {
    return {
      success: false,
      error: "Invalid backup file format. Please select a valid Tournicano backup file.",
    };
  }

  // Step 2: Validate version
  if (backup.version !== 1) {
    return {
      success: false,
      error: `Unsupported backup version: ${backup.version}. Expected version 1.`,
    };
  }

  // Step 3: Validate required fields
  if (!backup.settings || !backup.players || !backup.rounds) {
    return {
      success: false,
      error: "Backup file is corrupted or contains invalid data.",
    };
  }

  // Step 4: Validate players (all-or-nothing)
  const playerNames = new Set<string>();
  for (const player of backup.players) {
    if (!player.name || typeof player.name !== "string" || player.name.trim() === "") {
      return {
        success: false,
        error: "Backup contains invalid player names.",
      };
    }
    if (playerNames.has(player.name)) {
      return {
        success: false,
        error: "Backup contains duplicate player names. Each player must have a unique name.",
      };
    }
    playerNames.add(player.name);

    if (typeof player.group !== "number" || player.group < 0) {
      return {
        success: false,
        error: "Backup file is corrupted or contains invalid data.",
      };
    }

    if (typeof player.active !== "boolean") {
      return {
        success: false,
        error: "Backup file is corrupted or contains invalid data.",
      };
    }
  }

  // Step 5: Validate rounds and matches
  for (const round of backup.rounds) {
    if (!Array.isArray(round.matches) || !Array.isArray(round.paused) || !Array.isArray(round.inactive)) {
      return {
        success: false,
        error: "Backup file is corrupted or contains invalid data.",
      };
    }

    for (const match of round.matches) {
      if (!Array.isArray(match.teamA) || match.teamA.length !== 2 ||
          !Array.isArray(match.teamB) || match.teamB.length !== 2) {
        return {
          success: false,
          error: "Backup file is corrupted or contains invalid data.",
        };
      }

      // Validate all player names in match exist in players list
      for (const playerName of [...match.teamA, ...match.teamB]) {
        if (!playerNames.has(playerName)) {
          return {
            success: false,
            error: "Backup contains rounds with unknown players.",
          };
        }
      }

      // Validate score if present
      if (match.score !== undefined) {
        if (!Array.isArray(match.score) || match.score.length !== 2 ||
            typeof match.score[0] !== "number" || typeof match.score[1] !== "number") {
          return {
            success: false,
            error: "Backup file is corrupted or contains invalid data.",
          };
        }
      }
    }

    // Validate paused and inactive player names exist
    for (const playerName of [...round.paused, ...round.inactive]) {
      if (!playerNames.has(playerName)) {
        return {
          success: false,
          error: "Backup contains rounds with unknown players.",
        };
      }
    }
  }

  // Step 6: Validate settings
  if (typeof backup.settings.courts !== "number" || backup.settings.courts < 0) {
    return {
      success: false,
      error: "Backup file is corrupted or contains invalid data.",
    };
  }

  if (!backup.settings.matchingSpec || typeof backup.settings.matchingSpec !== "object") {
    return {
      success: false,
      error: "Backup file is corrupted or contains invalid data.",
    };
  }

  // All validations passed - now import (all-or-nothing)

  // Step 7: Clear existing tournament
  reset();

  // Step 8: Update settings
  settings.setCourts(backup.settings.courts);
  settings.setMatchingSpec(backup.settings.matchingSpec);

  // Step 9: Recreate players with UUIDs
  const playerNameToId = new Map<string, PlayerId>();
  for (const playerData of backup.players) {
    const id = crypto.randomUUID();
    const player = createPlayer(id, playerData.name, playerData.group, playerData.active);
    context.registerPlayer(player);
    playerNameToId.set(playerData.name, id);
  }

  // Step 10: Recreate rounds with matches and scores
  for (let roundIndex = 0; roundIndex < backup.rounds.length; roundIndex++) {
    const roundData = backup.rounds[roundIndex];

    // Get participating players from previous round (with accumulated stats)
    // This is critical for preserving matchCount, pauseCount, partners, opponents
    const previousRound = context.rounds[roundIndex - 1];
    const participating: ParticipatingPlayerImpl[] = previousRound
      ? previousRound.getParticipatingPlayers() as ParticipatingPlayerImpl[]
      : [];

    // Build set of all participating player IDs for this round
    const participatingIds = new Set<PlayerId>();
    for (const matchData of roundData.matches) {
      participatingIds.add(playerNameToId.get(matchData.teamA[0])!);
      participatingIds.add(playerNameToId.get(matchData.teamA[1])!);
      participatingIds.add(playerNameToId.get(matchData.teamB[0])!);
      participatingIds.add(playerNameToId.get(matchData.teamB[1])!);
    }
    for (const playerName of roundData.paused) {
      participatingIds.add(playerNameToId.get(playerName)!);
    }
    for (const playerName of roundData.inactive) {
      participatingIds.add(playerNameToId.get(playerName)!);
    }

    // Add any new players appearing in this round for the first time
    for (const id of participatingIds) {
      if (!participating.find(p => p.id === id)) {
        participating.push(new ParticipatingPlayerImpl(context, id));
      }
    }

    // Build matched pairs
    const matched: [[PlayerId, PlayerId], [PlayerId, PlayerId]][] = roundData.matches.map(matchData => [
      [playerNameToId.get(matchData.teamA[0])!, playerNameToId.get(matchData.teamA[1])!],
      [playerNameToId.get(matchData.teamB[0])!, playerNameToId.get(matchData.teamB[1])!],
    ]);

    // Build paused and inactive player IDs
    const pausedIds = roundData.paused.map(name => playerNameToId.get(name)!);
    const inactiveIds = roundData.inactive.map(name => playerNameToId.get(name)!);

    // Create the round
    const round = createRound(
      roundIndex,
      participating,
      matched,
      pausedIds,
      inactiveIds,
    );

    // Submit scores
    round.matches.forEach((match, matchIndex) => {
      const score = roundData.matches[matchIndex].score;
      if (score) {
        match.submitScore(score as Score);
      }
    });

    context.rounds.push(round);
  }

  // Step 11: Notify change and return success
  notifyChange();

  const playerCount = backup.players.length;
  const roundCount = backup.rounds.length;
  const summary = `Imported ${playerCount} player${playerCount !== 1 ? 's' : ''} and ${roundCount} round${roundCount !== 1 ? 's' : ''}`;

  return {
    success: true,
    summary,
  };
}

import { Mutable } from "../core/Mutable.ts";
import {
  PlayerId,
  Player,
  PlayerFilter,
  PlayerSortBy,
  PlayerCounts,
  RoundInfo,
  Tournament,
  TournamentFactory,
  TournamentListener,
  ConfigurationWarning,
} from "./Tournament.ts";
import { Americano, MatchingSpec } from "../matching/MatchingSpec.ts";
import { matching, partitionPlayers } from "../matching/Matching.ts";
import { shuffle } from "../core/Util.ts";
import { Settings } from "../settings/Settings.ts";
import {
  OperationResult,
  createSuccessResult,
  createErrorResult,
  createInfoResult,
  pluralize,
} from "../core/OperationResult.ts";
import { TournamentContext } from "./Context.ts";
import { PlayerImpl, ParticipatingPlayerImpl } from "./Players.impl.ts";
import { RoundImpl } from "./Rounds.impl.ts";
import { serializeTournament, deserializeTournament } from "./Serialization.ts";
import { exportStandingsText, exportPlayersText, exportBackup } from "./Export.ts";
import { importBackup as importBackupFunction } from "./Import.ts";

export const tournamentFactory: TournamentFactory = {
  create(serialized?: string) {
    return new TournamentImpl(serialized);
  },
};

class TournamentImpl implements Mutable<Tournament>, TournamentContext {
  private listeners: TournamentListener[] = [];
  playerMap: Map<PlayerId, PlayerImpl> = new Map();
  rounds: RoundImpl[] = [];

  constructor(serialized?: string) {
    if (serialized) {
      deserializeTournament(
        serialized,
        this,
        (id, name, group, active) => new PlayerImpl(this, id, name, group, active),
        (index, participating, matched, paused, inactive) =>
          new RoundImpl(this, index, participating, matched, paused, inactive)
      );
    }
  }

  // TournamentContext interface methods
  getPlayer(id: PlayerId): Player | undefined {
    return this.playerMap.get(id);
  }

  registerPlayer(player: Player): void {
    this.playerMap.set(player.id, player as PlayerImpl);
  }

  unregisterPlayer(id: PlayerId): boolean {
    return this.playerMap.delete(id);
  }

  players(group?: number) {
    const players = Array.from(this.playerMap.values());
    if (group === undefined) {
      return players;
    }
    return players.filter((p) => p.group === group);
  }

  get groups() {
    return [...new Set(Array.from(this.playerMap.values()).map((p) => p.group))].sort();
  }

  get activePlayerCount() {
    return this.players().filter((p) => p.active).length;
  }

  get hasAllScoresSubmitted() {
    return this.rounds.every(r =>
      r.matches.every(m => m.score !== undefined)
    );
  }

  addPlayers(names: string[], group: number = 0) {
    const added: string[] = [];
    const duplicates: string[] = [];

    names.forEach((name) => {
      const existingNames = new Set(this.players().map((p) => p.name));
      if (!existingNames.has(name)) {
        const id = crypto.randomUUID();
        const player = new PlayerImpl(this, id, name, group, true);
        this.playerMap.set(player.id, player);
        added.push(name);
      } else {
        duplicates.push(name);
      }
    });
    this.notifyChange();
    return { added, duplicates };
  }

  addPlayersFromInput(input: string, maxGroups: number = 4): OperationResult {
    const lines = input.split(/\n/);
    let allAdded: string[] = [];
    let allDuplicates: string[] = [];
    const groupsUsed = new Set<number>();
    let ignoredGroupsCount = 0;

    lines.forEach((line, i) => {
      if (i < maxGroups) {
        const trimmed = line.trim();
        if (trimmed) {
          const names = trimmed.split(/[,.]/).map(name => name.trim()).filter(name => name.length > 0);
          if (names.length > 0) {
            const result = this.addPlayers(names, i);
            if (result.added.length > 0) {
              groupsUsed.add(i);
            }
            allAdded = allAdded.concat(result.added);
            allDuplicates = allDuplicates.concat(result.duplicates);
          }
        }
      } else {
        const trimmed = line.trim();
        if (trimmed) {
          const names = trimmed.split(/[,.]/).map(name => name.trim()).filter(name => name.length > 0);
          if (names.length > 0) {
            ignoredGroupsCount++;
          }
        }
      }
    });

    const addedCount = allAdded.length;
    const duplicateCount = allDuplicates.length;
    const groupCount = groupsUsed.size;
    const hasErrors = duplicateCount > 0 || ignoredGroupsCount > 0;

    if (addedCount === 0 && !hasErrors) {
      return createInfoResult("No players added");
    } else if (addedCount === 0 && hasErrors) {
      const errorParts: string[] = [];
      if (duplicateCount > 0) {
        errorParts.push(`${duplicateCount} ${pluralize(duplicateCount, "duplicate")}`);
      }
      if (ignoredGroupsCount > 0) {
        errorParts.push(`${ignoredGroupsCount} ${pluralize(ignoredGroupsCount, "group")}`);
      }
      return createErrorResult(`No players added - ${errorParts.join(" and ")} ignored`, {
        duplicates: duplicateCount,
        ignored: ignoredGroupsCount,
      });
    } else if (hasErrors) {
      let message = `Added ${addedCount} ${pluralize(addedCount, "player")}`;

      if (groupCount > 1) {
        message += ` in ${groupCount} ${pluralize(groupCount, "group")}`;
      }

      message += " - ";

      const errorParts: string[] = [];
      if (duplicateCount > 0) {
        errorParts.push(`${duplicateCount} ${pluralize(duplicateCount, "duplicate")}`);
      }
      if (ignoredGroupsCount > 0) {
        errorParts.push(`${ignoredGroupsCount} ${pluralize(ignoredGroupsCount, "group")}`);
      }

      message += errorParts.join(" and ") + " ignored";

      return createErrorResult(message, {
        added: addedCount,
        duplicates: duplicateCount,
        ignored: ignoredGroupsCount,
        groups: groupCount,
      });
    } else {
      let message = `Added ${addedCount} ${pluralize(addedCount, "player")}`;

      if (groupCount > 1) {
        message += ` in ${groupCount} groups`;
      }

      message += " to the tournament";

      return createSuccessResult(message, {
        added: addedCount,
        groups: groupCount,
      });
    }
  }

  getFilteredPlayers(filter?: PlayerFilter, sortBy: PlayerSortBy = "name"): Player[] {
    let players = this.players();

    if (filter) {
      players = players.filter(player => {
        // Search filter
        if (filter.search && !player.name.toLowerCase().includes(filter.search.toLowerCase())) {
          return false;
        }

        // Participating filter
        if (filter.participating !== undefined && filter.participating !== player.inAnyRound()) {
          return false;
        }

        // Group filter
        if (filter.groups && filter.groups.length > 0 && !filter.groups.includes(player.group)) {
          return false;
        }

        // Active filter (undefined means show all)
        if (filter.active === "active" && !player.active) return false;
        if (filter.active === "inactive" && player.active) return false;

        return true;
      });
    }

    // Sort players
    if (sortBy === "name") {
      return players.toSorted((a, b) =>
        a.name.toLowerCase() < b.name.toLowerCase() ? -1 :
          a.name.toLowerCase() > b.name.toLowerCase() ? 1 : 0
      );
    } else if (sortBy === "group") {
      return players.toSorted((a, b) => a.group - b.group);
    }

    return players;
  }

  getPlayerCounts(filter?: PlayerFilter): PlayerCounts {
    const allPlayers = this.players();
    const filteredPlayers = filter ? this.getFilteredPlayers(filter) : allPlayers;

    const byGroup = new Map<number, {
      total: number;
      active: number;
      inactive: number;
      participating: number;
    }>();

    // Initialize group counts
    this.groups.forEach(group => {
      byGroup.set(group, {
        total: 0,
        active: 0,
        inactive: 0,
        participating: 0,
      });
    });

    // Calculate counts
    let totalCount = 0;
    let activeCount = 0;
    let inactiveCount = 0;
    let participatingCount = 0;

    filteredPlayers.forEach(player => {
      totalCount++;
      if (player.active) {
        activeCount++;
      } else {
        inactiveCount++;
      }
      if (player.inAnyRound()) {
        participatingCount++;
      }

      const groupStats = byGroup.get(player.group);
      if (groupStats) {
        groupStats.total++;
        if (player.active) {
          groupStats.active++;
        } else {
          groupStats.inactive++;
        }
        if (player.inAnyRound()) {
          groupStats.participating++;
        }
      }
    });

    return {
      total: totalCount,
      active: activeCount,
      inactive: inactiveCount,
      participating: participatingCount,
      byGroup,
    };
  }

  activateAll(active: boolean) {
    this.players().forEach((player) => {
      player.active = active;
    });
    this.notifyChange();
  }

  activateGroup(group: number, active: boolean) {
    this.players(group).forEach((player) => {
      player.active = active;
    });
    this.notifyChange();
  }

  activatePlayers(players: Player[], active: boolean): number {
    let count = 0;
    players.forEach((player) => {
      // Only count players that can be activated/deactivated
      if (active) {
        if (!player.active) {
          (player as PlayerImpl).activate(active, false);
          count++;
        }
      } else {
        if (player.active) {
          (player as PlayerImpl).activate(active, false);
          count++;
        }
      }
    });
    if (count > 0) {
      this.notifyChange();
    }
    return count;
  }

  toggleActivePlayers(players: Player[]): OperationResult {
    // Count active players in the set
    const activeCount = players.filter(p => p.active).length;
    const shouldActivate = activeCount < players.length;
    
    // Count how many will actually change
    const affectedCount = shouldActivate
      ? players.length - activeCount  // Count of inactive players
      : activeCount;                  // Count of active players
    
    // Toggle all players
    players.forEach(player => {
      (player as PlayerImpl).activate(shouldActivate, false);
    });
    
    if (affectedCount > 0) {
      this.notifyChange();
    }
    
    const action = shouldActivate ? "activated" : "deactivated";
    return createSuccessResult(
      `${affectedCount} ${pluralize(affectedCount, "player")} ${action}`
    );
  }

  movePlayers(players: Player[], group: number): number {
    players.forEach((player) => {
      (player as PlayerImpl).setGroup(group, false);
    });
    if (players.length > 0) {
      this.notifyChange();
    }
    return players.length;
  }

  deletePlayers(players: Player[]): number {
    let count = 0;
    players.forEach((player) => {
      if (!player.inAnyRound()) {
        if (this.playerMap.delete(player.id)) {
          count++;
        }
      }
    });
    if (count > 0) {
      this.notifyChange();
    }
    return count;
  }

  private getPlayersForNextRound(shouldShuffle: boolean = false): {
    participating: ParticipatingPlayerImpl[];
    active: ParticipatingPlayerImpl[];
    inactive: PlayerId[];
  } {
    // Determine participating players for this round:
    // Any players participating in the previous round (along with their stats) plus
    // active players not yet in any round!
    const participating: ParticipatingPlayerImpl[] = [];
    const previousRound = this.rounds[this.rounds.length - 1];
    if (previousRound) {
      participating.push(...previousRound.getParticipatingPlayers());
    }
    const newPlayers = this.players()
      .filter((p) => {
        return p.active && !p.inAnyRound();
      })
      .map((p) => new ParticipatingPlayerImpl(this, p.id));
    
    participating.push(
      ...(shouldShuffle ? shuffle(newPlayers) : newPlayers)
    );

    const [active, inactive] = participating.reduce(
      (acc: [ParticipatingPlayerImpl[], PlayerId[]], player) => {
        const tournamentPlayer = this.playerMap.get(player.id)!;
        if (tournamentPlayer.active) {
          acc[0].push(player);
        } else {
          acc[1].push(player.id);
        }
        return acc;
      },
      [[], []],
    );

    return { participating, active, inactive };
  }

  getNextRoundInfo(spec?: MatchingSpec, maxMatches?: number): RoundInfo {
    const { active } = this.getPlayersForNextRound(false); // no shuffle needed for info
    const effectiveSpec = spec || Americano;
    
    const { competing, groupDistribution } = partitionPlayers(active, effectiveSpec, maxMatches);
    
    return {
      matchCount: Math.floor(competing.length / 4),
      activePlayerCount: active.length,
      groupDistribution,
      balancingEnabled: effectiveSpec.balanceGroups || false,
    };
  }

  validateConfiguration(spec?: MatchingSpec, maxMatches?: number): ConfigurationWarning[] {
    const warnings: ConfigurationWarning[] = [];
    const roundInfo = this.getNextRoundInfo(spec, maxMatches);
    const effectiveSpec = spec || Americano;
    
    // Check for insufficient players
    if (roundInfo.activePlayerCount < 4) {
      // This is handled elsewhere (can't create round), not a configuration warning
      // but we could add it if needed
    }
    
    // Check for group configuration mismatch
    const specUsesGroups = effectiveSpec.teamUp.groupFactor > 0 || 
                          effectiveSpec.matchUp.groupFactor > 0;
    const groupCount = roundInfo.groupDistribution.size;
    
    // Case A: Mode uses groups, but all active players are in one group
    if (specUsesGroups && groupCount === 1 && roundInfo.activePlayerCount >= 4) {
      warnings.push({
        type: "groupMismatch",
        message: "Mode uses groups but all active players are in one group - consider organizing players into groups or switch tournament mode"
      });
    }
    
    // Case B: Active players in multiple groups, but mode doesn't use groups
    if (!specUsesGroups && groupCount > 1) {
      warnings.push({
        type: "groupMismatch",
        message: "Active players are in multiple groups but mode ignores them"
      });
    }
    
    return warnings;
  }

  createRound(spec?: MatchingSpec, maxMatches?: number): RoundImpl {
    const { participating, active, inactive } = this.getPlayersForNextRound(true); // shuffle new players
    const [matched, paused] = matching(active, spec || Americano, maxMatches);
    const round = new RoundImpl(
      this,
      this.rounds.length,
      participating,
      matched.map((m) => [
        [m[0][0].id, m[0][1].id],
        [m[1][0].id, m[1][1].id],
      ]),
      paused.map((p) => p.id),
      inactive,
    );
    this.rounds.push(round);
    this.notifyChange();
    return round;
  }

  restart() {
    this.rounds = [];
    this.notifyChange();
  }

  reset(): void {
    this.playerMap = new Map();
    this.rounds = [];
    this.notifyChange();
  }

  serialize() {
    return serializeTournament(this.players(), this.rounds);
  }

  addListener(listener: TournamentListener) {
    this.listeners.push(listener);
  }

  notifyChange() {
    this.listeners.forEach((listener) => listener.onchange(this));
  }

  exportStandingsText(roundIndex: number, groups?: number[]): string {
    return exportStandingsText(this.rounds, roundIndex, groups);
  }

  exportPlayersText(filter?: PlayerFilter): string {
    return exportPlayersText(
      this.groups,
      (group) => this.players(group),
      (filter) => this.getFilteredPlayers(filter, "name"),
      filter
    );
  }

  exportBackup(settings: Settings): string {
    return exportBackup(settings, this.players(), this.rounds);
  }

  importBackup(backupJson: string, settings: Settings): { success: boolean; error?: string; summary?: string } {
    return importBackupFunction(
      backupJson,
      settings,
      this,
      () => this.reset(),
      () => this.notifyChange(),
      (id, name, group, active) => new PlayerImpl(this, id, name, group, active),
      (index, participating, matched, paused, inactive) =>
        new RoundImpl(this, index, participating, matched, paused, inactive)
    );
  }
}

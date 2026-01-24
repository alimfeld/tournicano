import { MatchingSpec } from "../matching/MatchingSpec.ts";
import { Settings } from "../settings/Settings.ts";
import { OperationResult } from "../core/OperationResult.ts";

export type PlayerId = string;

export interface Player {
  readonly id: PlayerId;
  readonly name: string;
  readonly group: number;
  readonly active: boolean;
  inAnyRound(): boolean;
  canRenameTo(name: string): boolean;
  rename(name: string): boolean;
  setGroup(group: number, notify?: boolean): void;
  activate(active: boolean, notify?: boolean): void;
  delete(): boolean;
}

// Stats based on round matchings
export interface Matchings {
  readonly partners: Map<string, number[]>;
  readonly opponents: Map<string, number[]>;
}

// Stats based on round participation
export interface Participation {
  readonly matchCount: number;
  readonly pauseCount: number;
}

// Performance based on scores submitted
export interface Performance {
  readonly wins: number;
  readonly losses: number;
  readonly draws: number;
  readonly pointsFor: number;
  readonly pointsAgainst: number;
}

export interface ParticipatingPlayer
  extends Player,
  Matchings,
  Participation,
  Performance {
  readonly playRatio: number;
  readonly winRatio: number;
  readonly plusMinus: number;
}

export interface RankedPlayer {
  rank: number;
  player: ParticipatingPlayer;
}

export interface Team {
  readonly player1: ParticipatingPlayer;
  readonly player2: ParticipatingPlayer;
}

export type Score = [number, number];

export interface Match {
  readonly teamA: Team;
  readonly teamB: Team;
  readonly score?: Score;
  submitScore(score: Score | undefined): void;
}

export interface Round {
  readonly matches: Match[];
  readonly paused: ParticipatingPlayer[];
  readonly inactive: ParticipatingPlayer[];
  standings(groups?: number[]): RankedPlayer[];
  getParticipatingPlayers(): ParticipatingPlayer[];
  isLast(): boolean;
  delete(): boolean;
  switchPlayers(playerId1: PlayerId, playerId2: PlayerId): boolean;
}

export interface TournamentListener {
  onchange: (tournament: Tournament) => void;
}

export interface RoundInfo {
  matchCount: number;
  activePlayerCount: number;
  competingPlayerCount: number;
  pausedPlayerCount: number;
  matchingSpecName: string;
  groupDistribution: Map<number, { total: number; competing: number; paused: number }>;
  balancingEnabled: boolean;
}

export interface PlayerFilter {
  search?: string;
  participating?: boolean;
  groups?: number[];
  active?: "active" | "inactive";  // undefined means show all players
}

export type PlayerSortBy = "name" | "group";

export interface PlayerCounts {
  total: number;
  active: number;
  inactive: number;
  participating: number;
  byGroup: Map<number, {
    total: number;
    active: number;
    inactive: number;
    participating: number;
  }>;
}

/**
 * Result of player name validation
 */
export interface NameValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Type of configuration warning
 */
export type ConfigurationWarningType = "groupMismatch" | "insufficientPlayers";

/**
 * Configuration warning for tournament setup
 */
export interface ConfigurationWarning {
  type: ConfigurationWarningType;
  message: string;
}

export interface Tournament {
  readonly rounds: Round[];
  readonly groups: number[];
  readonly activePlayerCount: number;
  readonly hasAllScoresSubmitted: boolean;
  players(group?: number): Player[];
  getFilteredPlayers(filter?: PlayerFilter, sortBy?: PlayerSortBy): Player[];
  getPlayerCounts(filter?: PlayerFilter): PlayerCounts;
  addPlayers(names: string[], group?: number): { added: string[], duplicates: string[] };
  addPlayersFromInput(input: string, maxGroups?: number): OperationResult;
  activateAll(active: boolean): void;
  activateGroup(group: number, active: boolean): void;
  activatePlayers(players: Player[], active: boolean): number;
  toggleActivePlayers(players: Player[]): OperationResult;
  movePlayers(players: Player[], group: number): number;
  deletePlayers(players: Player[]): number;
  createRound(spec?: MatchingSpec, maxMatches?: number): Round;
  getNextRoundInfo(spec?: MatchingSpec, maxMatches?: number): RoundInfo;
  restart(): void;
  reset(): void;
  serialize(): string;
  addListener(listener: TournamentListener): void;
  exportStandingsText(roundIndex: number, groups?: number[]): string;
  exportBackup(settings: Settings): string;
  importBackup(backupJson: string, settings: Settings): { success: boolean; error?: string; summary?: string };
  validateConfiguration(spec: MatchingSpec, maxMatches?: number): ConfigurationWarning[];
}

/**
 * Validate a player name for illegal characters and emptiness
 */
export function validatePlayerName(name: string): NameValidationResult {
  const trimmed = name.trim();
  
  if (!trimmed) {
    return { valid: false, error: "Name is required" };
  }
  
  return { valid: true };
}

export interface TournamentFactory {
  create(serialized?: string): Tournament;
}

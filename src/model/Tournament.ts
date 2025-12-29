import { MatchingSpec } from "./Tournament.matching";

export type PlayerId = string;

export interface Player {
  readonly id: PlayerId;
  readonly name: string;
  readonly group: number;
}

export interface TournamentPlayer extends Player {
  readonly active: boolean;
  inAnyRound(): boolean;
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

export interface PlayerStats
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
  player: PlayerStats;
}

export interface Team {
  readonly player1: PlayerStats;
  readonly player2: PlayerStats;
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
  readonly paused: PlayerStats[];
  readonly inactive: PlayerStats[];
  standings(groups?: number[]): RankedPlayer[];
  isLast(): boolean;
  delete(): boolean;
}

export interface TournamentListener {
  onchange: (tournament: Tournament) => void;
}

export interface RoundInfo {
  matchCount: number;
  activePlayerCount: number;
  groupDistribution: Map<number, { total: number; competing: number; paused: number }>;
  balancingEnabled: boolean;
}

export interface Tournament {
  readonly rounds: Round[];
  readonly groups: number[];
  readonly activePlayerCount: number;
  readonly hasAllScoresSubmitted: boolean;
  players(group?: number): TournamentPlayer[];
  addPlayers(names: string[], group?: number): { added: string[], duplicates: string[] };
  activateAll(active: boolean): void;
  activateGroup(group: number, active: boolean): void;
  activatePlayers(players: TournamentPlayer[], active: boolean): number;
  movePlayers(players: TournamentPlayer[], group: number): number;
  deletePlayers(players: TournamentPlayer[]): number;
  createRound(spec?: MatchingSpec, maxMatches?: number): Round;
  getNextRoundInfo(spec?: MatchingSpec, maxMatches?: number): RoundInfo;
  restart(): void;
  reset(): void;
  serialize(): string;
  addListener(listener: TournamentListener): void;
  exportJSON(roundIndex?: number): string;
  exportText(roundIndex?: number): string;
}

export interface TournamentFactory {
  create(serialized?: string): Tournament;
}

import { MatchingSpec } from "./Tournament.matching";

export type PlayerId = string;

export interface Player {
  readonly id: PlayerId;
  readonly name: string;
  readonly group: number;
}

export interface RegisteredPlayer extends Player {
  readonly active: boolean;
  isParticipating(): boolean;
  rename(name: string): boolean;
  setGroup(group: number): void;
  activate(active: boolean): void;
  withdraw(): boolean;
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
  standings(group?: number): RankedPlayer[];
  isLast(): boolean;
  delete(): boolean;
  toString(): string;
}

export type TournicanoFlavor = {
  americanoFactor: number;
  mexicanoFactor: number;
};

export interface TournamentListener {
  onchange: (tournament: Tournament) => void;
}

export interface Tournament {
  readonly rounds: Round[];
  readonly groups: number[];
  players(group?: number): RegisteredPlayer[];
  registerPlayers(names: string[], group?: number): void;
  createRound(spec?: MatchingSpec, maxMatches?: number): Round;
  restart(): void;
  reset(): void;
  serialize(): string;
  addListener(listener: TournamentListener): void;
}

export interface TournamentFactory {
  create(serialized?: string): Tournament;
}

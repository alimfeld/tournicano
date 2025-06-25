export type PlayerId = string;

export interface Player {
  readonly id: PlayerId;
  readonly name: string;
}

export interface RegisteredPlayer extends Player {
  readonly active: boolean;
  isParticipating(): boolean;
  rename(name: string): void;
  activate(active: boolean): void;
  withdraw(): boolean;
}

// Stats based on round matchings
export interface Matchings {
  readonly partnerCounts: Map<string, number>;
  readonly opponentCounts: Map<string, number>;
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
  playRatio(): number;
  winRatio(): number;
  plusMinus(): number;
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
  standings(): PlayerStats[];
  isLast(): boolean;
  delete(): boolean;
  toString(): void;
}

export type TournicanoFlavor = {
  americanoFactor: number;
  mexicanoFactor: number;
};

export type RoundSpec = {
  maxMatches?: number;
  flavor?: TournicanoFlavor;
};

export interface TournamentListener {
  onchange: (tournament: Tournament) => void;
}

export interface Tournament {
  readonly rounds: Round[];
  readonly players: RegisteredPlayer[];
  registerPlayers(names: string[]): void;
  createRound(spec?: RoundSpec): Round;
  clearRounds(): void;
  reset(): void;
  serialize(): string;
  addListener(listener: TournamentListener): void;
}

export interface TournamentFactory {
  create(serialized?: string): Tournament;
}

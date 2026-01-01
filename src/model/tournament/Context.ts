import { PlayerId, Player, Performance, ParticipatingPlayer } from "./Tournament.ts";

/**
 * Context interface for Round implementation.
 * Provides minimal dependencies needed by match and player classes.
 */
export interface RoundContext {
  readonly tournament: TournamentContext;
  readonly index: number;
  hasParticipant(id: PlayerId): boolean;
  getParticipatingPlayers(): ParticipatingPlayer[];
  addPerformance(id: PlayerId, performance: Performance): void;
}

/**
 * Context interface for Tournament implementation.
 * Provides minimal dependencies needed by player and round classes.
 */
export interface TournamentContext {
  getPlayer(id: PlayerId): Player | undefined;
  registerPlayer(player: Player): void;
  unregisterPlayer(id: PlayerId): boolean;
  readonly rounds: RoundContext[];
  players(): Player[];
  notifyChange(): void;
}

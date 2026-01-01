/**
 * @fileoverview Internal implementation classes for Tournament players.
 * 
 * WARNING: This file contains internal implementation details.
 * DO NOT import from this file outside of src/model/Tournament*.ts files.
 * Use the public Tournament interface from Tournament.ts instead.
 */

import { Mutable } from "../core/Mutable.ts";
import {
  Performance,
  ParticipatingPlayer,
  PlayerId,
  Player,
  Score,
} from "./Tournament.ts";
import { TournamentContext } from "./Context.ts";

/**
 * @internal - Implementation class, not part of public API
 * Only exported for use within Tournament model files
 */
export class PlayerImpl implements Mutable<Player> {
  constructor(
    private tournament: TournamentContext,
    readonly id: string,
    public name: string,
    public group: number = 0,
    public active = false,
  ) { };

  inAnyRound(): boolean {
    const lastRound = this.tournament.rounds[this.tournament.rounds.length - 1];
    if (lastRound) {
      return lastRound.hasParticipant(this.id);
    }
    return false;
  }

  canRenameTo(name: string): boolean {
    const existingNames = this.tournament.players()
      .filter(p => p.id !== this.id)
      .map(p => p.name);
    
    return !existingNames.includes(name);
  }

  rename(name: string) {
    if (!this.canRenameTo(name)) {
      return false;
    }
    this.name = name;
    this.tournament.notifyChange();
    return true;
  }

  setGroup(group: number, notify = true) {
    this.group = group;
    if (notify) {
      this.tournament.notifyChange();
    }
  }

  activate(active: boolean, notify = true) {
    this.active = active;
    if (notify) {
      this.tournament.notifyChange();
    }
  }

  delete() {
    let success = false;
    if (!this.inAnyRound()) {
      success = this.tournament.unregisterPlayer(this.id);
      if (success) {
        this.tournament.notifyChange();
  }
}

    return success;
  }
}

/**
 * @internal - Implementation class, not part of public API
 * Only exported for use within Tournament model files
 */
export class PerformanceImpl implements Mutable<Performance> {
  wins: number = 0;
  losses: number = 0;
  draws: number = 0;
  pointsFor: number = 0;
  pointsAgainst: number = 0;

  get winRatio() {
    const total = this.wins + this.losses + this.draws;
    if (total === 0) {
      return 0.5;
    }
    return (this.wins + this.draws / 2) / total;
  }

  get plusMinus() {
    return this.pointsFor - this.pointsAgainst;
  }

  apply(score: Score, positive: boolean = true) {
    const plus = score[0];
    const minus = score[1];
    const step = positive ? 1 : -1;
    if (plus > minus) {
      this.wins += step;
    } else if (plus < minus) {
      this.losses += step;
    } else {
      this.draws += step;
    }
    if (positive) {
      this.pointsFor += plus;
      this.pointsAgainst += minus;
    } else {
      this.pointsFor -= plus;
      this.pointsAgainst -= minus;
    }
  }

  add(other: Performance): void {
    this.wins += other.wins;
    this.losses += other.losses;
    this.draws += other.draws;
    this.pointsFor += other.pointsFor;
    this.pointsAgainst += other.pointsAgainst;
  }

  compare(other: PerformanceImpl): number {
    const pperf = this.winRatio;
    const qperf = other.winRatio;
    if (pperf === qperf) {
      const pdiff = this.plusMinus;
      const qdiff = other.plusMinus;
      if (pdiff === qdiff) {
        return 0;
      }
      return qdiff - pdiff;
    }
    return qperf - pperf;
  }
}

/**
 * @internal - Implementation class, not part of public API
 * Only exported for use within Tournament model files
 */
export class ParticipatingPlayerImpl extends PerformanceImpl implements Mutable<ParticipatingPlayer> {
  partners: Map<string, number[]> = new Map();
  opponents: Map<string, number[]> = new Map();

  matchCount: number = 0;
  pauseCount: number = 0;
  lastPause: number = -1;

  private player: PlayerImpl;

  constructor(
    private tournament: TournamentContext,
    readonly id: PlayerId,
  ) {
    super();
    this.player = this.tournament.getPlayer(this.id)! as PlayerImpl;
  }

  get name() {
    return this.player.name;
  }

  get group() {
    return this.player.group;
  }

  get active(): boolean {
    return this.player.active;
  }

  inAnyRound(): boolean {
    return this.player.inAnyRound();
  }

  canRenameTo(name: string): boolean {
    return this.player.canRenameTo(name);
  }

  rename(name: string): boolean {
    return this.player.rename(name);
  }

  setGroup(group: number, notify?: boolean): void {
    this.player.setGroup(group, notify);
  }

  activate(active: boolean, notify?: boolean): void {
    this.player.activate(active, notify);
  }

  delete(): boolean {
    return this.player.delete();
  }

  get playRatio() {
    const roundCount = this.matchCount + this.pauseCount;
    return this.matchCount / roundCount;
  }

  incPartner(id: PlayerId, roundIndex: number) {
    const rounds = this.partners.get(id) || [];
    rounds.push(roundIndex);
    this.partners.set(id, rounds);
  }

  incOpponent(id: PlayerId, roundIndex: number) {
    const rounds = this.opponents.get(id) || [];
    rounds.push(roundIndex);
    this.opponents.set(id, rounds);
  }

  deepCopy(): ParticipatingPlayerImpl {
    const copy = new ParticipatingPlayerImpl(this.tournament, this.id);

    copy.partners = new Map([...this.partners].map(([key, value]) => [key, [...value]]))
    copy.opponents = new Map([...this.opponents].map(([key, value]) => [key, [...value]]))

    copy.matchCount = this.matchCount;
    copy.pauseCount = this.pauseCount;
    copy.lastPause = this.lastPause;

    copy.wins = this.wins;
    copy.losses = this.losses;
    copy.draws = this.draws;
    copy.pointsFor = this.pointsFor;
    copy.pointsAgainst = this.pointsAgainst;

    return copy;
  }
}

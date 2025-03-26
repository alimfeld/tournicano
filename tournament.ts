import { Player, Team } from "./participant.ts";
import { Pairing, Round } from "./structure.ts";

class SocialDoublesPlayer implements Player {
  private _player: Player;
  playedRounds: number = 0;
  totalRounds: number = 0;

  constructor(player: Player) {
    this._player = player;
  }

  name() {
    return this._player.name();
  }

  label(key: string) {
    return this._player.label(key);
  }

  playedPercentage() {
    return this.totalRounds == 0 ? 0 : this.totalRounds / this.playedRounds;
  }
}

export class SocialDoublesTournament {
  players: SocialDoublesPlayer[];
  pairingsPerRound: number;

  constructor(players: Player[], pairingsPerRound: number) {
    this.players = players.map((player) => new SocialDoublesPlayer(player));
    this.pairingsPerRound = pairingsPerRound;
  }

  createRound(): Round {
    const players = this.electPlayers();
    const teams = this.teamUp(players);
    const pairings = this.pairUp(teams);
    return new Round(pairings);
  }

  private electPlayers(): SocialDoublesPlayer[] {
    const totalPlayerCount = this.players.length;
    let playersToElectCount = this.pairingsPerRound * 4;
    if (totalPlayerCount < playersToElectCount) {
      playersToElectCount = totalPlayerCount - (totalPlayerCount % 4);
    }
    if (totalPlayerCount == playersToElectCount) {
      return this.players;
    }
    const electedPlayers = this.players;
    electedPlayers.sort((a, b) => a.playedPercentage() - b.playedPercentage());
    return electedPlayers.slice(0, playersToElectCount);
  }

  private teamUp(players: SocialDoublesPlayer[]): Team[] {
    return [];
  }

  private pairUp(teams: Team[]): Pairing[] {
    return [];
  }
}

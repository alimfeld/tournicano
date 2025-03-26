import { Participant } from "./participant.ts";

export class Round {
  readonly pairings: Pairing[];

  constructor(pairings: Pairing[]) {
    this.pairings = pairings;
  }
}

export class Pairing {
  readonly participants: SimpleParticipant[];

  constructor(participants: SimpleParticipant[]) {
    this.participants = participants;
  }
}

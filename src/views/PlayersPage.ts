import m from "mithril";
import "./PlayersPage.css";
import { PlayerView } from "./PlayerView.ts";
import { NavView } from "./NavView.ts";
import { Page } from "../App.ts";
import { Tournament } from "../model/Tournament.ts";

export interface PlayersAttrs {
  tournament: Tournament;
  nav: (page: Page) => void;
}

export const PlayersPage: m.Component<PlayersAttrs> = {
  view: ({ attrs: { tournament, nav } }) => {
    const registerPlayers = () => {
      const input = document.getElementById("players") as HTMLInputElement;
      const value = input.value.trim();
      if (value) {
        tournament.registerPlayers(value.split(/\s+/));
        input.value = "";
      }
    };
    const [active, total] = tournament.players.values().reduce(
      (acc, player) => {
        if (player.active) {
          acc[0]++;
        }
        acc[1]++;
        return acc;
      },
      [0, 0],
    );
    const title =
      active == total ? `Players (${active})` : `Players (${active}/${total})`;
    return [
      m("header.players.container-fluid", m("h1", title)),
      m(NavView, { nav }),
      m(
        "main.players.container-fluid",
        m(
          "fieldset",
          { role: "group" },
          m("input", {
            id: "players",
            placeholder: "Anna Ben Paris Tyson",
            autocapitalize: "words",
          }),
          m(
            "button",
            {
              onclick: registerPlayers,
            },
            "Register",
          ),
        ),
        m(
          "section.players",
          tournament.players
            .toSorted((p, q) => p.name.localeCompare(q.name))
            .map((player) =>
              m(
                "div.player",
                {
                  class: player.active ? "active" : "inactive",
                  onclick: () => player.activate(!player.active),
                },
                m(
                  PlayerView,
                  { player },
                  m(
                    "div.actions",
                    m("input.active", {
                      type: "checkbox",
                      name: "active",
                      role: "switch",
                      checked: player.active,
                    }),
                    player.isParticipating()
                      ? null
                      : m(
                          "button.delete",
                          {
                            onclick: (e: InputEvent) => {
                              player.withdraw();
                              // Stop event from also triggering activation / deactivation
                              e.stopPropagation();
                            },
                          },
                          "X",
                        ),
                  ),
                ),
              ),
            ),
        ),
      ),
    ];
  },
};

import m from "mithril";
import "./PlayersPage.css";
import { NavView } from "./NavView.ts";
import { Page } from "../App.ts";
import { Tournament } from "../model/Tournament.ts";
import { GroupView } from "./GroupView.ts";
import { FAB } from "./FAB.ts";
import { Settings } from "../model/Settings.ts";

export interface PlayersAttrs {
  settings: Settings;
  tournament: Tournament;
  playerFilter: string;
  changePlayerFilter: (playerFilter: string) => void;
  nav: (page: Page) => void;
}

export const PlayersPage: m.Component<PlayersAttrs> = {
  view: ({ attrs: { settings, tournament, playerFilter, changePlayerFilter, nav } }) => {
    const registerPlayers = () => {
      const input = document.getElementById("players") as HTMLInputElement;
      const groups = input.value.split(/\n/);
      groups.forEach((group, i) => {
        if (i < 4) {
          const line = group.trim();
          if (line) {
            const names = line.trim().split(/\s+/);
            tournament.registerPlayers(names, i);
          }
        }
      });
      input.value = "";
    };
    const [active, total] = tournament
      .players()
      .values()
      .reduce(
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
      active === total ? `Players (${active})` : `Players (${active}/${total})`;
    return [
      m("header.players.container-fluid", m("h1", title)),
      m(NavView, { nav }),
      m(
        "main.players.container-fluid.actions",
        m(
          "div.player-filter",
          { role: "group" },
          m(
            "button",
            {
              disabled: playerFilter !== "active" && playerFilter !== "inactive",
              onclick: () => {
                changePlayerFilter("all");
              },
            },
            "All",
          ),
          m(
            "button",
            {
              disabled: playerFilter === "active",
              onclick: () => {
                changePlayerFilter("active");
              },
            },
            "Active",
          ),
          m(
            "button",
            {
              disabled: playerFilter === "inactive",
              onclick: () => {
                changePlayerFilter("inactive");
              },
            },
            "Inactive",
          ),
        ),
        m(
          "section.players",
          tournament.groups.map((group) =>
            m(GroupView, {
              tournament,
              playerFilter,
              groupIndex: group,
              playersEditable: settings.playersEditable,
            }),
          ),
        ),
        settings.playersEditable ?
          m(
            "form",
            { onsubmit: (event: InputEvent) => event.preventDefault() },
            m("textarea", {
              id: "players",
              placeholder: "Separate players by space and groups by newline...",
              autocapitalize: "words",
            }),
            m("input.add", {
              type: "submit",
              value: "Register",
              onclick: registerPlayers,
            }),
          ) : null,
      ),
      m(FAB, {
        icon: "⋮",
        iconOpen: "✕",
        disabled: tournament.players().length === 0,
        actions: [
          {
            icon: settings.playersEditable ? "●" : "◯",
            label: settings.playersEditable ? "Close Registration" : "Open Registration",
            onclick: () => {
              settings.setPlayersEditable(!settings.playersEditable);
            },
          },
          {
            icon: "⊖",
            label: "Deactivate All",
            onclick: () => {
              tournament.activateAll(false);
            },
            disabled: active === 0,
          },
          {
            icon: "⊕",
            label: "Activate All",
            onclick: () => {
              tournament.activateAll(true);
            },
            disabled: active === total,
          },
          {
            icon: "␡",
            label: "Delete All",
            onclick: () => {
              tournament.reset();
              settings.setPlayersEditable(true);
            },
            variant: "del",
            disabled: tournament.players().length === 0,
            confirmation: {
              title: "🚨 Delete all players?",
              description: "This will delete all players and reset the tournament. This action can't be undone!",
            }
          },
          {
            icon: "⿻",
            label: "Share / Export",
            onclick: async () => {
              const data = {
                text: tournament.groups
                  .map((group) =>
                    tournament
                      .players(group)
                      .map((player) => player.name)
                      .toSorted((p, q) => p.localeCompare(q))
                      .join(" "),
                  )
                  .join("\n"),
              };
              try {
                await navigator.share(data);
              } catch (err) {
                console.log(err);
              }
            },
            disabled: tournament.players().length === 0,
          }
        ]
      }),
    ];
  },
};

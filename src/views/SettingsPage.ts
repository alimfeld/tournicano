import m from "mithril";
import "./SettingsPage.css";
import { NavView } from "./NavView.ts";
import { Settings } from "../model/Settings.ts";
import { Page } from "../App.ts";
import { Tournament } from "../model/Tournament.ts";
import { ActionWithConfirmation } from "./ActionWithConfirmation.ts";
import { Americano, Mexicano } from "../model/Tournament.matching.ts";
import { MatchingSpecDialog } from "./MatchingSpecDialog.ts";

export interface SettingsAttrs {
  settings: Settings;
  tournament: Tournament;
  nav: (page: Page) => void;
}

export const SettingsPage: m.Component<SettingsAttrs> = {
  view: ({ attrs: { settings, tournament, nav } }) => {
    const isAmericano =
      JSON.stringify(settings.matchingSpec) == JSON.stringify(Americano);
    const isMexicano =
      JSON.stringify(settings.matchingSpec) == JSON.stringify(Mexicano);
    return [
      m("header.settings.container-fluid", m("h1", "Settings")),
      m(NavView, { nav }),
      m(
        "main.settings.container-fluid",
        m("h2", "Tournament"),
        m(
          "form",
          {
            onsubmit: (event: InputEvent) => event.preventDefault(),
          },
          m(
            "fieldset",
            m(
              "label",
              "Courts:",
              m("input.courts", {
                type: "number",
                name: "courts",
                inputmode: "numeric",
                value: settings.courts,
                min: 0,
                step: 1,
                onblur: (event: InputEvent) =>
                  settings.setCourts(
                    (event.target as HTMLInputElement).valueAsNumber,
                  ),
              }),
              m("small", "The number of courts you have available"),
            ),
          ),
          m(
            "fieldset",
            m("legend", "Matching:"),
            m("input", {
              type: "radio",
              name: "matching-spec",
              id: "americano",
              checked: isAmericano,
              onchange: () => {
                settings.setMatchingSpec(Americano);
              },
            }),
            m("label", { htmlFor: "americano" }, "Americano"),
            m("input", {
              type: "radio",
              name: "matching-spec",
              id: "mexicano",
              checked: isMexicano,
              onchange: () => {
                settings.setMatchingSpec(Mexicano);
              },
            }),
            m("label", { htmlFor: "mexicano" }, "Mexicano"),
            m("input", {
              type: "radio",
              name: "matching-spec",
              id: "custom",
              checked: !isAmericano && !isMexicano,
              disabled: true,
            }),
            m("label", { htmlFor: "custom" }, "Custom"),
          ),
          m(MatchingSpecDialog, {
            action: "Customize...",
            disabled: false,
            matchingSpec: settings.matchingSpec,
            onconfirm: (matchingSpec) => {
              settings.setMatchingSpec(matchingSpec);
            },
          }),
          m("hr"),
          m(ActionWithConfirmation, {
            action: "Restart",
            disabled: tournament.rounds.length == 0,
            title: "Restart Tournament?",
            description:
              "This will delete all rounds but keep the registered players.",
            onconfirm: () => {
              tournament.restart();
            },
          }),
          m(ActionWithConfirmation, {
            action: "Reset",
            disabled: tournament.players.length == 0,
            title: "Reset Tournament?",
            description: "This will delete all rounds and registered players.",
            onconfirm: () => {
              tournament.reset();
            },
          }),
        ),
        m("h2", "UI"),
        m(
          "form",
          {
            onsubmit: (event: InputEvent) => event.preventDefault(),
          },
          m(
            "fieldset",
            m("legend", "Theme:"),
            m("input", {
              type: "radio",
              name: "theme",
              id: "auto",
              checked: settings.theme == "auto",
              onchange: () => {
                settings.setTheme("auto");
              },
            }),
            m("label", { htmlFor: "auto" }, "Auto"),
            m("input", {
              type: "radio",
              name: "theme",
              id: "dark",
              checked: settings.theme == "dark",
              onchange: () => {
                settings.setTheme("dark");
              },
            }),
            m("label", { htmlFor: "dark" }, "Dark"),
            m("input", {
              type: "radio",
              name: "theme",
              id: "light",
              checked: settings.theme == "light",
              onchange: () => {
                settings.setTheme("light");
              },
            }),
            m("label", { htmlFor: "light" }, "Light"),
          ),
          m(
            "fieldset",
            m(
              "label",
              m("input", {
                name: "debug",
                type: "checkbox",
                role: "switch",
                checked: settings.debug,
                onchange: () => {
                  settings.showDebug(!settings.debug);
                },
              }),
              "Show debug information",
            ),
          ),
        ),
      ),
    ];
  },
};

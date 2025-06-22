import m from "mithril";
import "./SettingsPage.css";
import { NavView } from "./NavView.ts";
import { Settings } from "../model/Settings.ts";
import { Page } from "../App.ts";
import { Tournament } from "../model/Tournament.ts";

export interface SettingsAttrs {
  settings: Settings;
  tournament: Tournament;
  nav: (page: Page) => void;
}

export const SettingsPage: m.Component<SettingsAttrs> = {
  view: ({ attrs: { settings, tournament, nav } }) => {
    return [
      m("header.settings.container-fluid", m("h1", "Settings")),
      m(NavView, { nav }),
      m(
        "main.settings.container-fluid",
        m("h2", "Tournament"),
        m(
          "form",
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
            m(
              "label",
              "Tournicano Ratio",
              m("input", {
                type: "range",
                value: settings.mexicanoRatio * 100,
                onchange: (event: InputEvent) => {
                  settings.setMexicanoRatio(
                    (event.target as HTMLInputElement).valueAsNumber / 100,
                  );
                },
              }),
              m("small", `Americano vs. Mexicano (${settings.mexicanoRatio})`),
            ),
          ),
          m(
            "button.reset",
            { onclick: () => tournament.clearRounds() },
            "Reset Tournament",
          ),
          m("button.reset", { onclick: () => tournament.reset() }, "Reset All"),
        ),
        m("h2", "UI"),
        m(
          "form",
          m(
            "fieldset",
            m("legend", "Theme:"),
            m(
              "input",
              {
                type: "radio",
                id: "auto",
                checked: settings.theme == "auto",
                onchange: () => {
                  settings.setTheme("auto");
                },
              },
              "auto",
            ),
            m("label", { htmlFor: "auto" }, "Auto"),
            m(
              "input",
              {
                type: "radio",
                id: "dark",
                checked: settings.theme == "dark",
                onchange: () => {
                  settings.setTheme("dark");
                },
              },
              "dark",
            ),
            m("label", { htmlFor: "dark" }, "Dark"),
            m(
              "input",
              {
                type: "radio",
                id: "light",
                checked: settings.theme == "light",
                onchange: () => {
                  settings.setTheme("light");
                },
              },
              "light",
            ),
            m("label", { htmlFor: "light" }, "Light"),
          ),
        ),
      ),
    ];
  },
};

import m from "mithril";
import "./SettingsPage.css";
import { NavView } from "./NavView.ts";
import { Settings } from "../model/Settings.ts";
import { Page } from "../App.ts";
import { Tournament } from "../model/Tournament.ts";
import { InvalidatePayload } from "vite";

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
              "Flavor:",
              m("input", {
                type: "range",
                value: settings.mexicanoRatio * 100,
                step: 10,
                onchange: (event: InputEvent) => {
                  settings.setMexicanoRatio(
                    (event.target as HTMLInputElement).valueAsNumber / 100,
                  );
                },
              }),
              m(
                "small",
                `Americano vs. Mexicano (${((1 - settings.mexicanoRatio) * 100).toFixed(0)}/${(settings.mexicanoRatio * 100).toFixed(0)})`,
              ),
            ),
          ),
          m(
            "button.danger",
            {
              onclick: (event: InputEvent) => {
                document
                  .getElementById("dialog-restart")!
                  .setAttribute("open", "true");
                event.preventDefault();
              },
            },
            "Restart",
          ),
          m(
            "dialog#dialog-restart",
            m(
              "article",
              m("h3", "Restart Tournament?"),
              m(
                "p",
                "This will delete all rounds but keep the registered players.",
              ),
              m(
                "footer",
                m(
                  "button",
                  {
                    class: "secondary",
                    onclick: (event: InputEvent) => {
                      document
                        .getElementById("dialog-restart")!
                        .setAttribute("open", "false");
                      event.preventDefault();
                    },
                  },
                  "Cancel",
                ),
                m(
                  "button.danger",
                  { onclick: () => tournament.restart() },
                  "Confirm",
                ),
              ),
            ),
          ),
          m(
            "button.danger",
            {
              onclick: (event: InputEvent) => {
                document
                  .getElementById("dialog-reset")!
                  .setAttribute("open", "true");
                event.preventDefault();
              },
            },
            "Reset",
          ),
          m(
            "dialog#dialog-reset",
            m(
              "article",
              m("h3", "Reset Tournament?"),
              m("p", "This will delete all rounds and registered players."),
              m(
                "footer",
                m(
                  "button",
                  {
                    class: "secondary",
                    onclick: (event: InputEvent) => {
                      document
                        .getElementById("dialog-reset")!
                        .setAttribute("open", "false"),
                        event.preventDefault();
                    },
                  },
                  "Cancel",
                ),
                m(
                  "button.danger",
                  { onclick: () => tournament.reset() },
                  "Confirm",
                ),
              ),
            ),
          ),
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

import m from "mithril";
import "./SettingsView.css";
import { Attrs } from "../Model.ts";
import { Nav } from "./Nav.ts";

export const SettingsView: m.Component<Attrs, {}> = {
  view: ({ attrs: { state, actions } }) => {
    return [
      m("header.settings.container-fluid", m("h1", "Settings")),
      m(Nav, { changeView: actions.changeView }),
      m(
        "main.settings.container-fluid",
        m(
          "fieldset",
          m(
            "label",
            "Courts:",
            m("input.courts", {
              type: "number",
              name: "courts",
              inputmode: "numeric",
              value: state.config.courts,
              min: 0,
              step: 1,
              onclick: (event: InputEvent) =>
                actions.updateCourts(
                  (event.target as HTMLInputElement).valueAsNumber,
                ),
            }),
            m("small", "The number of courts you have available"),
          ),
        ),
        m(
          "fieldset",
          m("legend", "Theme:"),
          m(
            "input",
            {
              type: "radio",
              id: "auto",
              checked: state.config.theme == "auto",
              onchange: () => {
                actions.setTheme("auto");
              },
            },
            "auto",
          ),
          m("label", { htmlFor: "auto" }, "auto"),
          m(
            "input",
            {
              type: "radio",
              id: "dark",
              checked: state.config.theme == "dark",
              onchange: () => {
                actions.setTheme("dark");
              },
            },
            "dark",
          ),
          m("label", { htmlFor: "dark" }, "dark"),
          m(
            "input",
            {
              type: "radio",
              id: "light",
              checked: state.config.theme == "light",
              onchange: () => {
                actions.setTheme("light");
              },
            },
            "light",
          ),
          m("label", { htmlFor: "light" }, "light"),
        ),
        m(
          "button.reset",
          { onclick: actions.resetTournament },
          "Reset Tournament",
        ),
        m("button.reset", { onclick: actions.resetAll }, "Reset All"),
      ),
    ];
  },
};

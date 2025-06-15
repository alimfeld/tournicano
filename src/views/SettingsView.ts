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
          m("input.courts", {
            type: "number",
            name: "courts",
            inputmode: "numeric",
            value: state.courts,
            min: 0,
            step: 1,
            onclick: (event: InputEvent) =>
              actions.updateCourts(
                (event.target as HTMLInputElement).valueAsNumber,
              ),
          }),
          m("small", "Courts"),
        ),
      ),
    ];
  },
};

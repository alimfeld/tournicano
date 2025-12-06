import m from "mithril";
import "./SettingsPage.css";
import { Settings } from "../model/Settings.ts";
import {
  Americano,
  AmericanoMixed,
  Mexicano,
  Tournicano,
} from "../model/Tournament.matching.ts";
import { MatchingSpecDialog } from "./MatchingSpecDialog.ts";

export interface SettingsAttrs {
  settings: Settings;
}

export const SettingsPage: m.Component<SettingsAttrs> = {
  view: ({ attrs: { settings } }) => {
    const isAmericano =
      JSON.stringify(settings.matchingSpec) === JSON.stringify(Americano);
    const isAmericanoMixed =
      JSON.stringify(settings.matchingSpec) === JSON.stringify(AmericanoMixed);
    const isMexicano =
      JSON.stringify(settings.matchingSpec) === JSON.stringify(Mexicano);
    const isTournicano =
      JSON.stringify(settings.matchingSpec) === JSON.stringify(Tournicano);
    return [
      m("header.settings.container-fluid", m("h1", "Settings")),
      m(
        "main.settings.container-fluid",
        m("h2", "Tournament"),
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
          m(
            "label",
            m("input", {
              type: "radio",
              name: "matching-spec",
              id: "americano",
              checked: isAmericano,
              onchange: () => {
                settings.setMatchingSpec(Americano);
              },
            }),
            "Americano",
          ),
          m(
            "label",
            m("input", {
              type: "radio",
              name: "matching-spec",
              id: "americano-mixed",
              checked: isAmericanoMixed,
              onchange: () => {
                settings.setMatchingSpec(AmericanoMixed);
              },
            }),
            "Americano Mixed",
          ),
          m(
            "label",
            m("input", {
              type: "radio",
              name: "matching-spec",
              id: "mexicano",
              checked: isMexicano,
              onchange: () => {
                settings.setMatchingSpec(Mexicano);
              },
            }),
            "Mexicano",
          ),
          m(
            "label",
            m("input", {
              type: "radio",
              name: "matching-spec",
              id: "tournicano",
              checked: isTournicano,
              onchange: () => {
                settings.setMatchingSpec(Tournicano);
              },
            }),
            "Tournicano",
          ),
          m(
            "label",
            m("input", {
              type: "radio",
              name: "matching-spec",
              id: "custom",
              checked:
                !isAmericano &&
                !isAmericanoMixed &&
                !isMexicano &&
                !isTournicano,
              disabled: true,
            }),
            "Custom",
          ),
          m(MatchingSpecDialog, {
            action: "Customize...",
            disabled: false,
            matchingSpec: settings.matchingSpec,
            onconfirm: (matchingSpec) => {
              settings.setMatchingSpec(matchingSpec);
            },
          }),
        ),
        m("h2", "UI"),
        m(
          "fieldset",
          m("legend", "Theme:"),
          m("input", {
            type: "radio",
            name: "theme",
            id: "auto",
            checked: settings.theme === "auto",
            onchange: () => {
              settings.setTheme("auto");
            },
          }),
          m("label", { htmlFor: "auto" }, "Auto"),
          m("input", {
            type: "radio",
            name: "theme",
            id: "dark",
            checked: settings.theme === "dark",
            onchange: () => {
              settings.setTheme("dark");
            },
          }),
          m("label", { htmlFor: "dark" }, "Dark"),
          m("input", {
            type: "radio",
            name: "theme",
            id: "light",
            checked: settings.theme === "light",
            onchange: () => {
              settings.setTheme("light");
            },
          }),
          m("label", { htmlFor: "light" }, "Light"),
        ),
      ),
    ];
  },
};

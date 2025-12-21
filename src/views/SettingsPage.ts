import m from "mithril";
import "./SettingsPage.css";
import { Settings } from "../model/Settings.ts";
import { Tournament } from "../model/Tournament.ts";
import {
  Americano,
  AmericanoMixed,
  GroupBattle,
  GroupBattleMixed,
  Mexicano,
  Tournicano,
  isMatchingSpecMode,
} from "../model/Tournament.matching.ts";
import { MatchingSpecDialog } from "./MatchingSpecDialog.ts";
import { BUILD_VERSION } from "../version.ts";

export interface SettingsAttrs {
  settings: Settings;
  tournament: Tournament;
  showToast?: (message: string, type?: "success" | "error" | "info") => void;
  checkForUpdates?: () => void;
  checkingForUpdates?: boolean;
}

export const SettingsPage: m.Component<SettingsAttrs> = {
  view: ({ attrs: { settings, tournament, showToast, checkForUpdates, checkingForUpdates } }) => {
    const isAmericano = isMatchingSpecMode(settings.matchingSpec, Americano);
    const isAmericanoMixed = isMatchingSpecMode(settings.matchingSpec, AmericanoMixed);
    const isMexicano = isMatchingSpecMode(settings.matchingSpec, Mexicano);
    const isTournicano = isMatchingSpecMode(settings.matchingSpec, Tournicano);
    const isGroupBattle = isMatchingSpecMode(settings.matchingSpec, GroupBattle);
    const isGroupBattleMixed = isMatchingSpecMode(settings.matchingSpec, GroupBattleMixed);

    const handleMatchingSpecChange = (matchingSpec: typeof Americano) => {
      settings.setMatchingSpec(matchingSpec);
      if (tournament.rounds.length > 0 && showToast) {
        showToast("Tournament mode changed during ongoing tournament. This will affect all newly created rounds.", "error");
      }
    };
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
            m("small", "How many matches can be played at the same time"),
          ),
        ),
        m(
          "fieldset",
          m("legend", "Matching:"),
          m(
            "div.radio-with-info",
            m(
              "label",
              m("input", {
                type: "radio",
                name: "matching-spec",
                id: "americano",
                checked: isAmericano,
                onchange: () => handleMatchingSpecChange(Americano),
              }),
              "Americano",
            ),
            m("span.info-icon", {
              "data-tooltip": "Play with and against\ndifferent players each round",
            }, "ⓘ"),
          ),
          m(
            "div.radio-with-info",
            m(
              "label",
              m("input", {
                type: "radio",
                name: "matching-spec",
                id: "americano-mixed",
                checked: isAmericanoMixed,
                onchange: () => handleMatchingSpecChange(AmericanoMixed),
              }),
              "Americano Mixed",
            ),
            m("span.info-icon", {
              "data-tooltip": "Pairs players from groups A/B\nwith players from groups C/D",
            }, "ⓘ"),
          ),
          m(
            "div.radio-with-info",
            m(
              "label",
              m("input", {
                type: "radio",
                name: "matching-spec",
                id: "mexicano",
                checked: isMexicano,
                onchange: () => handleMatchingSpecChange(Mexicano),
              }),
              "Mexicano",
            ),
            m("span.info-icon", {
              "data-tooltip": "Pairs 1st with 3rd ranked\nand 2nd with 4th ranked",
            }, "ⓘ"),
          ),
          m(
            "div.radio-with-info",
            m(
              "label",
              m("input", {
                type: "radio",
                name: "matching-spec",
                id: "tournicano",
                checked: isTournicano,
                onchange: () => handleMatchingSpecChange(Tournicano),
              }),
              "Tournicano",
            ),
            m("span.info-icon", {
              "data-tooltip": "Combines variety, performance\nand group pairing (A/B, C/D)",
            }, "ⓘ"),
          ),
          m(
            "div.radio-with-info",
            m(
              "label",
              m("input", {
                type: "radio",
                name: "matching-spec",
                id: "group-battle",
                checked: isGroupBattle,
                onchange: () => handleMatchingSpecChange(GroupBattle),
              }),
              "Group Battle",
            ),
            m("span.info-icon", {
              "data-tooltip": "Team up within groups\nto compete against other groups",
            }, "ⓘ"),
          ),
          m(
            "div.radio-with-info",
            m(
              "label",
              m("input", {
                type: "radio",
                name: "matching-spec",
                id: "group-battle-mixed",
                checked: isGroupBattleMixed,
                onchange: () => handleMatchingSpecChange(GroupBattleMixed),
              }),
              "Group Battle Mixed",
            ),
            m("span.info-icon", {
              "data-tooltip": "Group battle with teams\nfrom groups A/B and C/D",
            }, "ⓘ"),
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
                !isTournicano &&
                !isGroupBattle &&
                !isGroupBattleMixed,
              disabled: true,
            }),
            "Custom",
          ),
        ),
        m(MatchingSpecDialog, {
          action: "Customize...",
          disabled: false,
          matchingSpec: settings.matchingSpec,
          onconfirm: handleMatchingSpecChange,
        }),
        m("hr"),
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
        m("hr"),
        m("h2", "App"),
        m(
          "fieldset",
          m(
            "label",
            { for: "version" },
            "Version:",
            m("input", {
              type: "text",
              id: "version",
              name: "version",
              value: BUILD_VERSION,
              readonly: true,
              disabled: true,
            }),
          ),
          m(
            "p",
            m("a", {
              href: "https://github.com/alimfeld/tournicano/commits/main/",
              target: "_blank",
              rel: "noopener noreferrer"
            }, "View changes")
          ),
          checkForUpdates
            ? m(
                "button.outline",
                {
                  type: "button",
                  onclick: checkForUpdates,
                  disabled: checkingForUpdates,
                  "aria-busy": checkingForUpdates,
                },
                checkingForUpdates ? "Checking for updates..." : "Check for Updates",
              )
            : null,
        ),
      ),
    ];
  },
};

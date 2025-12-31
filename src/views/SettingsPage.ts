import m from "mithril";
import { Settings } from "../model/Settings.ts";
import { Tournament } from "../model/Tournament.ts";
import {
  Americano,
  AmericanoMixed,
  AmericanoMixedBalanced,
  GroupBattle,
  GroupBattleMixed,
  matchingSpecEquals,
  Mexicano,
  Tournicano,
  isMatchingSpecMode,
} from "../model/Tournament.matching.ts";
import { MatchingSpecModal } from "./MatchingSpecModal.ts";
import { BUILD_VERSION } from "../version.ts";
import { Header } from "./Header.ts";
import { Nav } from "./Nav.ts";
import { Page } from "../App.ts";
import "./SettingsPage.css";

export interface SettingsAttrs {
  settings: Settings;
  tournament: Tournament;
  showToast?: (message: string, type?: "success" | "error" | "info") => void;
  checkForUpdates?: () => void;
  checkingForUpdates?: boolean;
  nav: (page: Page) => void;
  currentPage: Page;
}

interface SettingsPageState {
  showMatchingSpecModal: boolean;
}

export const SettingsPage: m.Component<SettingsAttrs, SettingsPageState> = {
  oninit: ({ state }) => {
    state.showMatchingSpecModal = false;
  },

  view: ({ attrs: { settings, tournament, showToast, checkForUpdates, checkingForUpdates, nav, currentPage }, state }) => {
    const isAmericano = isMatchingSpecMode(settings.matchingSpec, Americano);
    const isAmericanoMixed = isMatchingSpecMode(settings.matchingSpec, AmericanoMixed);
    const isAmericanoMixedBalanced = isMatchingSpecMode(settings.matchingSpec, AmericanoMixedBalanced);
    const isMexicano = isMatchingSpecMode(settings.matchingSpec, Mexicano);
    const isTournicano = isMatchingSpecMode(settings.matchingSpec, Tournicano);
    const isGroupBattle = isMatchingSpecMode(settings.matchingSpec, GroupBattle);
    const isGroupBattleMixed = isMatchingSpecMode(settings.matchingSpec, GroupBattleMixed);

    const handleMatchingSpecChange = (matchingSpec: typeof Americano) => {
      settings.setMatchingSpec(matchingSpec);
      if (tournament.rounds.length > 0 && showToast) {
        showToast("Mode change affects ongoing tournament", "error");
      }
    };

    return [
      m(Header, {
        title: "Settings", actions: [
          {
            icon: "↓",
            label: "Export Tournament",
            onclick: () => {
              const json = tournament.exportBackup(settings);
              const blob = new Blob([json], { type: "application/json" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.style.display = "none";
              a.href = url;
              const date = new Date().toISOString().slice(0, 10);
              a.download = `tournicano-backup-${date}.json`;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(url);
            },
          }],
      }),
      m(
        "main.settings.container",
        m("h2", "Courts"),
        m("input.courts", {
          type: "number",
          id: "courts",
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
        m("hr"),
        m("h2", "Matching"),
        m(
          "fieldset.matching",
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
            m("small", "Maximizes partner and opponent rotation."),
          ),
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
            m("small", "Designed for 2 groups. Mixed doubles with rotating partners."),
          ),
          m(
            "label",
            m("input", {
              type: "radio",
              name: "matching-spec",
              id: "americano-mixed-balanced",
              checked: isAmericanoMixedBalanced,
              onchange: () => handleMatchingSpecChange(AmericanoMixedBalanced),
            }),
            "Americano Mixed Balanced",
            m("small", "Designed for 2 groups. Mixed doubles with equal group participation."),
          ),
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
            m("small", "Skill-based team formation and competitive balance."),
          ),
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
            m("small", "Balances variety, performance, and group mix."),
          ),
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
            m("small", "Designed for 2 groups. Competition between two sides."),
          ),
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
            m("small", "Designed for 4 groups. Mixed doubles team battle."),
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
                !isAmericanoMixedBalanced &&
                !isMexicano &&
                !isTournicano &&
                !isGroupBattle &&
                !isGroupBattleMixed,
              disabled: true,
            }),
            "Custom",
          ),
        ),
        m("button", {
          onclick: () => {
            state.showMatchingSpecModal = true;
          }
        }, "Customize..."),
        m("hr"),
        m("h2", "Theme"),
        m(
          "fieldset",
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
        m("h2", "Version"),
        m("input", {
          type: "text",
          id: "version",
          name: "version",
          value: BUILD_VERSION,
          readonly: true,
          disabled: true,
        }),
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
            "button",
            {
              type: "button",
              onclick: checkForUpdates,
              disabled: checkingForUpdates,
              "aria-busy": checkingForUpdates ? "true" : "false",
            },
            checkingForUpdates ? "Checking for updates..." : "Check for Updates",
          )
          : null,
      ),
      m(Nav, { nav, currentPage }),

      // Render modal conditionally alongside the page
      state.showMatchingSpecModal ? m(MatchingSpecModal, {
        matchingSpec: settings.matchingSpec,
        onconfirm: (matchingSpec) => {
          // Only update if the spec actually changed
          if (!matchingSpecEquals(settings.matchingSpec, matchingSpec)) {
            handleMatchingSpecChange(matchingSpec);
          }
        },
        onClose: () => {
          state.showMatchingSpecModal = false;
        }
      }) : null,
    ];
  },
};

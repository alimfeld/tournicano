import m from "mithril";
import {
  PREDEFINED_MODES,
  getMatchingSpecName,
  matchingSpecEquals,
} from "../model/matching/MatchingSpec.ts";
import { MatchingSpecModal } from "./MatchingSpecModal.ts";
import { BUILD_VERSION } from "../version.ts";
import { Header } from "./Header.ts";
import { appContext } from "../Layout.ts";
import { AvatarSpec } from "../model/settings/Settings.ts";
import "./SettingsPage.css";

interface AvatarSpecOption {
  id: AvatarSpec;
  name: string;
  description: string;
}

const AVATAR_SPECS: AvatarSpecOption[] = [
  {
    id: "bottts-clean",
    name: "Bottts Clean",
    description: "Robots with curated set of styles.",
  },
  {
    id: "bottts",
    name: "Bottts Original",
    description: "Original robot avatars.",
  },
  {
    id: "bottts-neutral",
    name: "Bottts Neutral",
    description: "Robots with clean geometric shape.",
  },
];

interface SettingsPageState {
  showMatchingSpecModal: boolean;
  showImportConfirmModal: boolean;
  pendingImportFile: File | null;
}

export const SettingsPage: m.Component<{}, SettingsPageState> = {
  oninit: ({ state }) => {
    state.showMatchingSpecModal = false;
    state.showImportConfirmModal = false;
    state.pendingImportFile = null;
  },

  view: ({ state }) => {
    const { state: appState, showToast, checkForUpdates, changeRound, resetFilters } = appContext;
    const { settings, tournament } = appState;
    const currentSpecName = getMatchingSpecName(settings.matchingSpec);

    const handleMatchingSpecChange = (matchingSpec: typeof PREDEFINED_MODES[number]["spec"]) => {
      settings.setMatchingSpec(matchingSpec);
      if (tournament.rounds.length > 0 && showToast) {
        showToast("Mode change affects ongoing tournament", { type: "error" });
      }
    };

    const handleImportFile = (file: File) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const json = e.target?.result as string;
        const result = tournament.importBackup(json, settings);

        if (result.success) {
          // Reset roundIndex to last round (or -1 if no rounds)
          const newRoundIndex = tournament.rounds.length - 1;
          changeRound(newRoundIndex);

          // Reset all filters - imported tournament is completely new
          resetFilters();

          showToast?.(result.summary || "Tournament imported successfully", { type: "success" });
        } else {
          showToast?.(result.error || "Import failed", { type: "error" });
        }

        // Reset modal state
        state.showImportConfirmModal = false;
        state.pendingImportFile = null;
      };
      reader.onerror = () => {
        showToast?.("Failed to read file", { type: "error" });
        state.showImportConfirmModal = false;
        state.pendingImportFile = null;
      };
      reader.readAsText(file);
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
          },
          {
            icon: "↑",
            label: "Import Tournament",
            onclick: () => {
              // Trigger file input click
              document.getElementById("import-file-input")?.click();
            },
          },
        ],
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
          [
            ...PREDEFINED_MODES.map(({ name, spec, description }) =>
              m(
                "label",
                m("input", {
                  type: "radio",
                  name: "matching-spec",
                  id: name.toLowerCase().replace(/ /g, "-"),
                  checked: currentSpecName === name,
                  onchange: () => handleMatchingSpecChange(spec),
                }),
                name,
                m("small", description),
              )
            ),
            m(
              "label",
              m("input", {
                type: "radio",
                name: "matching-spec",
                id: "custom",
                checked: currentSpecName === "Custom",
                disabled: true,
              }),
              "Custom",
            ),
          ]
        ),
        m("button", {
          onclick: () => {
            state.showMatchingSpecModal = true;
          }
        }, "Customize..."),
        m("hr"),
        m("h2", "Text Zoom"),
        m("input.text-zoom", {
          type: "range",
          id: "text-zoom",
          name: "text-zoom",
          min: 0.8,
          max: 1.5,
          step: 0.1,
          value: settings.textZoom,
          oninput: (event: InputEvent) =>
            settings.setTextZoom(
              parseFloat((event.target as HTMLInputElement).value),
            ),
        }),
        m("small", `${Math.round(settings.textZoom * 100)}%`),
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
        m("h2", "Avatars"),
        m(
          "fieldset.avatars",
          AVATAR_SPECS.map(({ id, name, description }) =>
            m(
              "label",
              m("input", {
                type: "radio",
                name: "avatar-spec",
                id: `avatar-spec-${id}`,
                checked: settings.avatarSpec === id,
                onchange: () => {
                  settings.setAvatarSpec(id);
                },
              }),
              name,
              m("small", description),
            )
          ),
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
        appState.pwa.serviceWorkerRegistered
          ? m(
            "button",
            {
              type: "button",
              onclick: checkForUpdates,
              disabled: appState.pwa.checkingForUpdates,
              "aria-busy": appState.pwa.checkingForUpdates ? "true" : "false",
            },
            appState.pwa.checkingForUpdates ? "Checking for updates..." : "Check for Updates",
          )
          : null,
        // Hidden file input for import
        m("input#import-file-input", {
          type: "file",
          accept: ".json",
          style: "display: none",
          onchange: (e: Event) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (!file) return;

            // Check if tournament has data (overwrite protection)
            if (tournament.rounds.length > 0 || tournament.players().length > 0) {
              state.showImportConfirmModal = true;
              state.pendingImportFile = file;
            } else {
              handleImportFile(file);
            }

            // Reset input so same file can be selected again
            (e.target as HTMLInputElement).value = "";
          }
        }),
      ),

      // Import confirmation modal
      state.showImportConfirmModal ? m("dialog[open]", [
        m("article", [
          m("header",
            m("button[aria-label=Close][rel=prev]", {
              onclick: () => {
                state.showImportConfirmModal = false;
                state.pendingImportFile = null;
              }
            }),
            m("p", m("strong", "Overwrite Tournament?")),
          ),
          m("p", "Importing will replace your current tournament data. This action cannot be undone."),
          m("p", "Make sure you've exported your current tournament before proceeding."),
          m("footer", [
            m("button.secondary", {
              onclick: () => {
                state.showImportConfirmModal = false;
                state.pendingImportFile = null;
              }
            }, "Cancel"),
            m("button", {
              onclick: () => {
                if (state.pendingImportFile) {
                  handleImportFile(state.pendingImportFile);
                }
              }
            }, "Import & Overwrite")
          ])
        ])
      ]) : null,

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

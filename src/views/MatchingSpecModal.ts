import m from "mithril";
import {
  MatchingSpec,
  matchingSpecEquals,
  MatchUpGroupMode,
  TeamUpGroupMode,
  TeamUpPerformanceMode,
} from "../model/Tournament.matching.ts";
import "./MatchingSpecModal.css";

// Symbol constants for matching factors
const SYMBOL_VARIETY = "↻";
const SYMBOL_SKILL = "★";
const SYMBOL_GROUPS = "☻";

// Performance mode symbols (Team up only)
const MODE_BALANCED = "≈";
const MODE_EQUAL = "=";
const MODE_MEXICANO = "⊗";

// Group mode symbols
const MODE_GROUP_SAME = "=";
const MODE_GROUP_CROSS = "≠";

// Separator for summary
const SEPARATOR = " · ";

export interface MatchingSpecModalAttrs {
  matchingSpec: MatchingSpec;
  onconfirm: (matchingSpec: MatchingSpec) => void;
  onClose: () => void;
}

interface MatchingSpecModalState {
  teamUpVarietyFactor: number;
  teamUpPerformanceFactor: number;
  teamUpPerformanceMode: number;
  teamUpGroupFactor: number;
  teamUpGroupMode: number;
  matchUpVarietyFactor: number;
  matchUpPerformanceFactor: number;
  matchUpGroupFactor: number;
  matchUpGroupMode: number;
  balanceGroups: boolean;
}

export const MatchingSpecModal: m.Component<MatchingSpecModalAttrs, MatchingSpecModalState> = {
  oninit: ({ state, attrs }) => {
    // Initialize state from matchingSpec
    state.teamUpVarietyFactor = attrs.matchingSpec.teamUp.varietyFactor;
    state.teamUpPerformanceFactor = attrs.matchingSpec.teamUp.performanceFactor;
    state.teamUpPerformanceMode = attrs.matchingSpec.teamUp.performanceMode;
    state.teamUpGroupFactor = attrs.matchingSpec.teamUp.groupFactor;
    state.teamUpGroupMode = attrs.matchingSpec.teamUp.groupMode;
    state.matchUpVarietyFactor = attrs.matchingSpec.matchUp.varietyFactor;
    state.matchUpPerformanceFactor = attrs.matchingSpec.matchUp.performanceFactor;
    state.matchUpGroupFactor = attrs.matchingSpec.matchUp.groupFactor;
    state.matchUpGroupMode = attrs.matchingSpec.matchUp.groupMode;
    state.balanceGroups = attrs.matchingSpec.balanceGroups ?? false;
  },

  view: ({ attrs: { onconfirm, onClose, matchingSpec }, state }) => {
    const hasChanges = () => {
      const currentSpec: MatchingSpec = {
        teamUp: {
          varietyFactor: state.teamUpVarietyFactor,
          performanceFactor: state.teamUpPerformanceFactor,
          performanceMode: state.teamUpPerformanceMode,
          groupFactor: state.teamUpGroupFactor,
          groupMode: state.teamUpGroupMode,
        },
        matchUp: {
          varietyFactor: state.matchUpVarietyFactor,
          performanceFactor: state.matchUpPerformanceFactor,
          groupFactor: state.matchUpGroupFactor,
          groupMode: state.matchUpGroupMode,
        },
        balanceGroups: state.balanceGroups,
      };
      return !matchingSpecEquals(currentSpec, matchingSpec);
    };

    const handleApply = () => {
      const spec = {
        teamUp: {
          varietyFactor: state.teamUpVarietyFactor,
          performanceFactor: state.teamUpPerformanceFactor,
          performanceMode: state.teamUpPerformanceMode,
          groupFactor: state.teamUpGroupFactor,
          groupMode: state.teamUpGroupMode,
        },
        matchUp: {
          varietyFactor: state.matchUpVarietyFactor,
          performanceFactor: state.matchUpPerformanceFactor,
          groupFactor: state.matchUpGroupFactor,
          groupMode: state.matchUpGroupMode,
        },
        balanceGroups: state.balanceGroups,
      } as MatchingSpec;

      onconfirm(spec);
      onClose();
    };

    const getTeamUpPerformanceModeSymbol = () => {
      if (state.teamUpPerformanceFactor === 0) return "";
      switch (state.teamUpPerformanceMode) {
        case TeamUpPerformanceMode.AVERAGE: return MODE_BALANCED;
        case TeamUpPerformanceMode.EQUAL: return MODE_EQUAL;
        case TeamUpPerformanceMode.MEXICANO: return MODE_MEXICANO;
        default: return "";
      }
    };

    const getTeamUpGroupModeSymbol = () => {
      if (state.teamUpGroupFactor === 0) return "";
      return state.teamUpGroupMode === TeamUpGroupMode.SAME ? MODE_GROUP_SAME : MODE_GROUP_CROSS;
    };

    const getMatchUpGroupModeSymbol = () => {
      if (state.matchUpGroupFactor === 0) return "";
      return state.matchUpGroupMode === MatchUpGroupMode.SAME ? MODE_GROUP_SAME : MODE_GROUP_CROSS;
    };

    return m("dialog.matching-spec", {
      oncreate: (vnode) => {
        (vnode.dom as HTMLDialogElement).showModal();
        document.documentElement.classList.add('modal-is-open');
      },
      onremove: () => {
        document.documentElement.classList.remove('modal-is-open');
      }
    },
      m("article",
        // Header: Close button and title
        m("header",
          m("button[aria-label=Close][rel=prev]", {
            onclick: onClose,
          }),
          m("h2", "Customize Matching")
        ),

        // Form content
        m("form", { onsubmit: (e: SubmitEvent) => e.preventDefault() },
          m("details",
            m("summary.secondary.outline[role=button]",
              m("div", "Team up"),
              m("small", `${SYMBOL_VARIETY} ${state.teamUpVarietyFactor}%${SEPARATOR}${SYMBOL_SKILL} ${state.teamUpPerformanceFactor}% ${getTeamUpPerformanceModeSymbol()}${SEPARATOR}${SYMBOL_GROUPS} ${state.teamUpGroupFactor}% ${getTeamUpGroupModeSymbol()}`)
            ),
            m(
              "label.slider-label",
              { for: "team-up-variety-factor" },
              `${SYMBOL_VARIETY} Rotate partners`,
              m("small.slider-label-text", state.teamUpVarietyFactor + "%"),
            ),
            m("input", {
              type: "range",
              id: "team-up-variety-factor",
              name: "team-up-variety-factor",
              step: 10,
              value: state.teamUpVarietyFactor,
              oninput: (e: Event) => {
                state.teamUpVarietyFactor = parseInt((e.target as HTMLInputElement).value);
              },
            }),
            m(
              "label.slider-label",
              { for: "team-up-performance-factor" },
              `${SYMBOL_SKILL} Match by skill`,
              m("small.slider-label-text", state.teamUpPerformanceFactor + "%"),
            ),
            m("input", {
              type: "range",
              id: "team-up-performance-factor",
              name: "team-up-performance-factor",
              step: 10,
              value: state.teamUpPerformanceFactor,
              oninput: (e: Event) => {
                state.teamUpPerformanceFactor = parseInt((e.target as HTMLInputElement).value);
              },
            }),
            m(
              "fieldset",
              [
                { value: TeamUpPerformanceMode.AVERAGE, label: `${MODE_BALANCED} Balanced teams` },
                { value: TeamUpPerformanceMode.EQUAL, label: `${MODE_EQUAL} Equal skill` },
                { value: TeamUpPerformanceMode.MEXICANO, label: `${MODE_MEXICANO} Mexicano (1+3, 2+4)` }
              ].map(option =>
                m("label",
                  m("input", {
                    type: "radio",
                    name: "team-up-performance-mode",
                    value: option.value,
                    checked: state.teamUpPerformanceMode === option.value,
                    disabled: state.teamUpPerformanceFactor === 0,
                    onchange: () => { state.teamUpPerformanceMode = option.value; }
                  }),
                  option.label
                )
              )
            ),
            m(
              "label.slider-label",
              { for: "team-up-group-factor" },
              `${SYMBOL_GROUPS} Group factor`,
              m("small.slider-label-text", state.teamUpGroupFactor + "%"),
            ),
            m("input", {
              type: "range",
              id: "team-up-group-factor",
              name: "team-up-group-factor",
              step: 10,
              value: state.teamUpGroupFactor,
              oninput: (e: Event) => {
                state.teamUpGroupFactor = parseInt((e.target as HTMLInputElement).value);
              },
            }),
            m(
              "fieldset",
              [
                { value: TeamUpGroupMode.PAIRED, label: `${MODE_GROUP_CROSS} Pair groups (A&B, C&D)` },
                { value: TeamUpGroupMode.SAME, label: `${MODE_GROUP_SAME} Same group only` }
              ].map(option =>
                m("label",
                  m("input", {
                    type: "radio",
                    name: "team-up-group-mode",
                    value: option.value,
                    checked: state.teamUpGroupMode === option.value,
                    disabled: state.teamUpGroupFactor === 0,
                    onchange: () => { state.teamUpGroupMode = option.value; }
                  }),
                  option.label
                )
              )
            )
          ),
          m("details",
            m("summary.secondary.outline[role=button]",
              m("div", "Match up"),
              m("small", `${SYMBOL_VARIETY} ${state.matchUpVarietyFactor}%${SEPARATOR}${SYMBOL_SKILL} ${state.matchUpPerformanceFactor}%${SEPARATOR}${SYMBOL_GROUPS} ${state.matchUpGroupFactor}% ${getMatchUpGroupModeSymbol()}`)
            ),
            m(
              "label.slider-label",
              { for: "match-up-variety-factor" },
              `${SYMBOL_VARIETY} Rotate opponents`,
              m("small.slider-label-text", state.matchUpVarietyFactor + "%"),
            ),
            m("input", {
              type: "range",
              id: "match-up-variety-factor",
              name: "match-up-variety-factor",
              step: 10,
              value: state.matchUpVarietyFactor,
              oninput: (e: Event) => {
                state.matchUpVarietyFactor = parseInt((e.target as HTMLInputElement).value);
              },
            }),
            m(
              "label.slider-label",
              { for: "match-up-performance-factor" },
              `${SYMBOL_SKILL} Match similar skill`,
              m("small.slider-label-text", state.matchUpPerformanceFactor + "%"),
            ),
            m("input", {
              type: "range",
              id: "match-up-performance-factor",
              name: "match-up-performance-factor",
              step: 10,
              value: state.matchUpPerformanceFactor,
              oninput: (e: Event) => {
                state.matchUpPerformanceFactor = parseInt((e.target as HTMLInputElement).value);
              },
            }),
            m(
              "label.slider-label",
              { for: "match-up-group-factor" },
              `${SYMBOL_GROUPS} Group factor`,
              m("small.slider-label-text", state.matchUpGroupFactor + "%"),
            ),
            m("input", {
              type: "range",
              id: "match-up-group-factor",
              name: "match-up-group-factor",
              step: 10,
              value: state.matchUpGroupFactor,
              oninput: (e: Event) => {
                state.matchUpGroupFactor = parseInt((e.target as HTMLInputElement).value);
              },
            }),
            m(
              "fieldset",
              [
                { value: MatchUpGroupMode.SAME, label: `${MODE_GROUP_SAME} Same group mix` },
                { value: MatchUpGroupMode.CROSS, label: `${MODE_GROUP_CROSS} Cross groups` }
              ].map(option =>
                m("label",
                  m("input", {
                    type: "radio",
                    name: "match-up-group-mode",
                    value: option.value,
                    checked: state.matchUpGroupMode === option.value,
                    disabled: state.matchUpGroupFactor === 0,
                    onchange: () => { state.matchUpGroupMode = option.value; }
                  }),
                  option.label
                )
              )
            )
          ),
          m("details",
            m("summary.secondary.outline[role=button]",
              `Group balancing • ${state.balanceGroups ? "On" : "Off"}`
            ),
            m("label",
              m("input", {
                type: "checkbox",
                name: "balance-groups",
                checked: state.balanceGroups,
                onchange: (e: Event) => {
                  state.balanceGroups = (e.target as HTMLInputElement).checked;
                }
              }),
              "Balance groups"
            ),
            m("small", "Equal player counts from each group will be selected for every round.")
          ),
        ),

        // Footer with action buttons
        m("footer",
          m("button", {
            onclick: (e: Event) => {
              e.preventDefault();
              handleApply();
            },
            disabled: !hasChanges()
          }, "Apply")
        )
      )
    );
  },
};

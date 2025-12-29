import m from "mithril";
import {
  MatchingSpec,
  matchingSpecEquals,
  MatchUpGroupMode,
  TeamUpGroupMode,
  TeamUpPerformanceMode,
} from "../model/Tournament.matching.ts";
import "./MatchingSpecModal.css";

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
      } as MatchingSpec;

      onconfirm(spec);
      onClose();
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
        // Form content
        m("form", { onsubmit: (e: SubmitEvent) => e.preventDefault() },
          m("fieldset",
            m("h2", "Team up factors"),
            m(
              "label.slider-label",
              { for: "team-up-variety-factor" },
              "Rotate partners",
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
              "Match by skill",
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
                { value: TeamUpPerformanceMode.AVERAGE, label: "Balanced teams" },
                { value: TeamUpPerformanceMode.EQUAL, label: "Equal skill" },
                { value: TeamUpPerformanceMode.MEXICANO, label: "Mexicano (1+3, 2+4)" }
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
              "Group factor",
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
                { value: TeamUpGroupMode.PAIRED, label: "Pair groups (A&B, C&D)" },
                { value: TeamUpGroupMode.SAME, label: "Same group only" }
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
            ),
          ),
          m("fieldset",
            m("h2", "Match up factors"),
            m(
              "label.slider-label",
              { for: "match-up-variety-factor" },
              "Rotate opponents",
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
              "Match similar skill",
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
              "Group factor",
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
                { value: MatchUpGroupMode.SAME, label: "Same group mix" },
                { value: MatchUpGroupMode.CROSS, label: "Cross groups" }
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
            ),
          ),
        ),

        // Footer with action buttons (Pico CSS pattern)
        m("footer",
          m("button.secondary", {
            onclick: (e: Event) => {
              e.preventDefault();
              onClose();
            }
          }, "Cancel"),
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

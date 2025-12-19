import m from "mithril";
import {
  MatchingSpec,
  MatchUpGroupMode,
  TeamUpGroupMode,
  TeamUpPerformanceMode,
} from "../model/Tournament.matching";
import "./MatchingSpecDialog.css";

export interface MatchingSpecAttr {
  action: string;
  disabled: boolean;
  matchingSpec: MatchingSpec;
  onconfirm: (matchingSpec: MatchingSpec) => void;
}

// Local state for the dialog
const state = {
  teamUpVarietyFactor: 0,
  teamUpPerformanceFactor: 0,
  teamUpPerformanceMode: 0,
  teamUpGroupFactor: 0,
  teamUpGroupMode: 0,
  matchUpVarietyFactor: 0,
  matchUpPerformanceFactor: 0,
  matchUpGroupFactor: 0,
  matchUpGroupMode: 0,
};



export const MatchingSpecDialog: m.Component<MatchingSpecAttr> = {
  view: ({ attrs: { action, disabled, matchingSpec, onconfirm } }) => {
    const ID = "matching-spec-dialog";

    return [
      m(
        "button",
        {
          disabled: disabled,
          onclick: () => {
            // Initialize state when opening dialog
            state.teamUpVarietyFactor = matchingSpec.teamUp.varietyFactor;
            state.teamUpPerformanceFactor = matchingSpec.teamUp.performanceFactor;
            state.teamUpPerformanceMode = matchingSpec.teamUp.performanceMode;
            state.teamUpGroupFactor = matchingSpec.teamUp.groupFactor;
            state.teamUpGroupMode = matchingSpec.teamUp.groupMode;
            state.matchUpVarietyFactor = matchingSpec.matchUp.varietyFactor;
            state.matchUpPerformanceFactor = matchingSpec.matchUp.performanceFactor;
            state.matchUpGroupFactor = matchingSpec.matchUp.groupFactor;
            state.matchUpGroupMode = matchingSpec.matchUp.groupMode;
            (document.getElementById(ID) as HTMLDialogElement).showModal();
          },
        },
        action,
      ),
      m(
        "dialog",
        { id: ID },
        m(
          "article",
          m(
            "form#matching-spec",
            m("fieldset",
              m("h6.matching-spec-heading", "Team up factors"),
              m(
                "label.slider-label",
                { for: "team-up-variety-factor" },
                m("small", "Rotate partners:"),
                m("small.slider-label-text", state.teamUpVarietyFactor + "%"),
              ),
              m("input.slider-input", {
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
                m("small", "Match by skill:"),
                m("small.slider-label-text", state.teamUpPerformanceFactor + "%"),
              ),
              m("input.slider-input-tight", {
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
                "label",
                { for: "team-up-performance-mode" },
                m("small", "How:"),
                m("select", {
                  id: "team-up-performance-mode",
                  name: "team-up-performance-mode",
                  disabled: state.teamUpPerformanceFactor === 0,
                  value: state.teamUpPerformanceMode,
                  onchange: (e: Event) => {
                    state.teamUpPerformanceMode = parseInt((e.target as HTMLSelectElement).value);
                  },
                }, [
                  m("option", { value: TeamUpPerformanceMode.AVERAGE }, "Balanced teams"),
                  m("option", { value: TeamUpPerformanceMode.EQUAL }, "Equal skill"),
                  m("option", { value: TeamUpPerformanceMode.MEXICANO }, "Mexicano (1+3, 2+4)"),
                ]),
              ),
              m(
                "label.slider-label",
                { for: "team-up-group-factor" },
                m("small", "Group factor:"),
                m("small.slider-label-text", state.teamUpGroupFactor + "%"),
              ),
              m("input.slider-input-tight", {
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
                "label",
                { for: "team-up-group-mode" },
                m("small", "How:"),
                m("select", {
                  id: "team-up-group-mode",
                  name: "team-up-group-mode",
                  disabled: state.teamUpGroupFactor === 0,
                  value: state.teamUpGroupMode,
                  onchange: (e: Event) => {
                    state.teamUpGroupMode = parseInt((e.target as HTMLSelectElement).value);
                  },
                }, [
                  m("option", { value: TeamUpGroupMode.PAIRED }, "Pair groups (A&B, C&D)"),
                  m("option", { value: TeamUpGroupMode.SAME }, "Same group only"),
                ]),
              ),
            ),
            m("fieldset",
              m("h6.matching-spec-heading", "Match up factors"),
              m(
                "label.slider-label",
                { for: "match-up-variety-factor" },
                m("small", "Rotate opponents:"),
                m("small.slider-label-text", state.matchUpVarietyFactor + "%"),
              ),
              m("input.slider-input", {
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
                m("small", "Match similar skill:"),
                m("small.slider-label-text", state.matchUpPerformanceFactor + "%"),
              ),
              m("input.slider-input", {
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
                m("small", "Group factor:"),
                m("small.slider-label-text", state.matchUpGroupFactor + "%"),
              ),
              m("input.slider-input-tight", {
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
                "label",
                { for: "match-up-group-mode" },
                m("small", "How:"),
                m("select", {
                  id: "match-up-group-mode",
                  name: "match-up-group-mode",
                  disabled: state.matchUpGroupFactor === 0,
                  value: state.matchUpGroupMode,
                  onchange: (e: Event) => {
                    state.matchUpGroupMode = parseInt((e.target as HTMLSelectElement).value);
                  },
                }, [
                  m("option", { value: MatchUpGroupMode.SAME }, "Same group mix"),
                  m("option", { value: MatchUpGroupMode.CROSS }, "Cross groups"),
                ]),
              ),
            ),
          ),
          m(
            "footer",
            m(
              "button",
              {
                class: "secondary",
                onclick: () => {
                  (document.getElementById(ID) as HTMLDialogElement).close();
                },
              },
              "Cancel",
            ),
            m(
              "button",
              {
                onclick: () => {
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
                  (document.getElementById(ID) as HTMLDialogElement).close();
                },
              },
              "Apply",
            ),
          ),
        ),
      ),
    ];
  },
};

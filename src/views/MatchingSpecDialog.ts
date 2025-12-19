import m from "mithril";
import {
  MatchingSpec,
  MatchUpGroupMode,
  TeamUpGroupMode,
  TeamUpPerformanceMode,
} from "../model/Tournament.matching";

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

// Helper to close dropdown after selection
function closeDropdown(e: Event) {
  const details = (e.target as HTMLElement).closest("details");
  if (details) {
    details.removeAttribute("open");
  }
}

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
              m("h3", "Team up factors"),
              m(
                "label",
                "Rotate partners:",
                m("input", {
                  type: "range",
                  name: "team-up-variety-factor",
                  step: 25,
                  value: state.teamUpVarietyFactor,
                  oninput: (e: Event) => {
                    state.teamUpVarietyFactor = parseInt((e.target as HTMLInputElement).value);
                  },
                }),
              ),
              m(
                "label",
                "Match by skill level:",
                m("input", {
                  type: "range",
                  name: "team-up-performance-factor",
                  step: 25,
                  value: state.teamUpPerformanceFactor,
                  oninput: (e: Event) => {
                    state.teamUpPerformanceFactor = parseInt((e.target as HTMLInputElement).value);
                  },
                }),
              ),
              m(
                "details.dropdown",
                {
                  disabled: state.teamUpPerformanceFactor === 0,
                  style: state.teamUpPerformanceFactor === 0 ? "opacity: 0.5; pointer-events: none;" : "",
                },
                m(
                  "summary",
                  "How: ",
                  state.teamUpPerformanceFactor === 0
                    ? "N/A"
                    : state.teamUpPerformanceMode === TeamUpPerformanceMode.AVERAGE
                      ? "Balanced teams"
                      : state.teamUpPerformanceMode === TeamUpPerformanceMode.EQUAL
                        ? "Equal skill"
                        : "Mexicano (1+3, 2+4)",
                ),
                m(
                  "ul",
                  m(
                    "li",
                    m(
                      "a",
                      {
                        onclick: (e: Event) => {
                          state.teamUpPerformanceMode = TeamUpPerformanceMode.AVERAGE;
                          closeDropdown(e);
                        },
                      },
                      "Balanced teams",
                    ),
                  ),
                  m(
                    "li",
                    m(
                      "a",
                      {
                        onclick: (e: Event) => {
                          state.teamUpPerformanceMode = TeamUpPerformanceMode.EQUAL;
                          closeDropdown(e);
                        },
                      },
                      "Equal skill",
                    ),
                  ),
                  m(
                    "li",
                    m(
                      "a",
                      {
                        onclick: (e: Event) => {
                          state.teamUpPerformanceMode = TeamUpPerformanceMode.MEXICANO;
                          closeDropdown(e);
                        },
                      },
                      "Mexicano (1+3, 2+4)",
                    ),
                  ),
                ),
              ),
              m(
                "label",
                "Consider player groups:",
                m("input", {
                  type: "range",
                  name: "team-up-group-factor",
                  step: 25,
                  value: state.teamUpGroupFactor,
                  oninput: (e: Event) => {
                    state.teamUpGroupFactor = parseInt((e.target as HTMLInputElement).value);
                  },
                }),
              ),
              m(
                "details.dropdown",
                {
                  disabled: state.teamUpGroupFactor === 0,
                  style: state.teamUpGroupFactor === 0 ? "opacity: 0.5; pointer-events: none;" : "",
                },
                m(
                  "summary",
                  "How: ",
                  state.teamUpGroupFactor === 0
                    ? "N/A"
                    : state.teamUpGroupMode === TeamUpGroupMode.PAIRED
                      ? "Pair groups (A&B, C&D)"
                      : "Same group only",
                ),
                m(
                  "ul",
                  m(
                    "li",
                    m(
                      "a",
                      {
                        onclick: (e: Event) => {
                          state.teamUpGroupMode = TeamUpGroupMode.PAIRED;
                          closeDropdown(e);
                        },
                      },
                      "Pair groups (A&B, C&D)",
                    ),
                  ),
                  m(
                    "li",
                    m(
                      "a",
                      {
                        onclick: (e: Event) => {
                          state.teamUpGroupMode = TeamUpGroupMode.SAME;
                          closeDropdown(e);
                        },
                      },
                      "Same group only",
                    ),
                  ),
                ),
              ),
            ),
            m("fieldset",
              m("h3", "Match up factors"),
              m(
                "label",
                "Rotate opponents:",
                m("input", {
                  type: "range",
                  name: "match-up-variety-factor",
                  step: 25,
                  value: state.matchUpVarietyFactor,
                  oninput: (e: Event) => {
                    state.matchUpVarietyFactor = parseInt((e.target as HTMLInputElement).value);
                  },
                }),
              ),
              m(
                "label",
                "Match similar skill:",
                m("input", {
                  type: "range",
                  name: "match-up-performance-factor",
                  step: 25,
                  value: state.matchUpPerformanceFactor,
                  oninput: (e: Event) => {
                    state.matchUpPerformanceFactor = parseInt((e.target as HTMLInputElement).value);
                  },
                }),
              ),
              m(
                "label",
                "Consider group mix:",
                m("input", {
                  type: "range",
                  name: "match-up-group-factor",
                  step: 25,
                  value: state.matchUpGroupFactor,
                  oninput: (e: Event) => {
                    state.matchUpGroupFactor = parseInt((e.target as HTMLInputElement).value);
                  },
                }),
              ),
              m(
                "details.dropdown",
                {
                  disabled: state.matchUpGroupFactor === 0,
                  style: state.matchUpGroupFactor === 0 ? "opacity: 0.5; pointer-events: none;" : "",
                },
                m(
                  "summary",
                  "How: ",
                  state.matchUpGroupFactor === 0
                    ? "N/A"
                    : state.matchUpGroupMode === MatchUpGroupMode.CROSS
                      ? "Cross groups"
                      : "Same group mix",
                ),
                m(
                  "ul",
                  m(
                    "li",
                    m(
                      "a",
                      {
                        onclick: (e: Event) => {
                          state.matchUpGroupMode = MatchUpGroupMode.SAME;
                          closeDropdown(e);
                        },
                      },
                      "Same group mix",
                    ),
                  ),
                  m(
                    "li",
                    m(
                      "a",
                      {
                        onclick: (e: Event) => {
                          state.matchUpGroupMode = MatchUpGroupMode.CROSS;
                          closeDropdown(e);
                        },
                      },
                      "Cross groups",
                    ),
                  ),
                ),
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

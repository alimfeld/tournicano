import m from "mithril";
import {
  MatchingSpec,
  TeamUpGroupMode,
  TeamUpPerformanceMode,
} from "../model/Tournament.matching";

export interface MatchingSpecAttr {
  action: string;
  disabled: boolean;
  matchingSpec: MatchingSpec;
  onconfirm: (matchingSpec: MatchingSpec) => void;
}

export const MatchingSpecDialog: m.Component<MatchingSpecAttr> = {
  view: ({ attrs: { action, disabled, matchingSpec, onconfirm } }) => {
    const ID = "matching-spec-dialog";
    const range = (
      name: string,
      value: number,
      label: string,
      description?: string,
    ) => {
      return m(
        "label",
        label,
        m("input", {
          type: "range",
          name: name,
          step: 25,
          value: value,
        }),
        description ? m("small", description) : null,
      );
    };
    const radios = (
      name: string,
      value: number,
      legend: string,
      inputs: { value: number; label: string }[],
    ) => {
      return m(
        "fieldset",
        m("legend", legend),
        inputs.map((input) => [
          m(
            "label",
            m("input", {
              type: "radio",
              id: `${name}-${input.value}`,
              name: name,
              value: input.value,
              checked: value === input.value,
            }),
            input.label,
          ),
        ]),
      );
    };
    return [
      m(
        "button",
        {
          disabled: disabled,
          onclick: (event: InputEvent) => {
            document.getElementById(ID)!.setAttribute("open", "true");
            event.preventDefault();
          },
        },
        action,
      ),
      m(
        "dialog",
        { id: ID },
        m(
          "article",
          m("h3", "Matching Configuration"),
          m(
            "form#matching-spec",
            m("h4", "Team up"),
            range(
              "team-up-variety-factor",
              matchingSpec.teamUp.varietyFactor,
              "Variety factor:",
              "Rotating partners",
            ),
            range(
              "team-up-performance-factor",
              matchingSpec.teamUp.performanceFactor,
              "Performance factor:",
              "Match based on performance mode",
            ),
            radios(
              "team-up-performance-mode",
              matchingSpec.teamUp.performanceMode,
              "Performance mode:",
              [
                {
                  value: TeamUpPerformanceMode.AVERAGE,
                  label:
                    "Average team performance",
                },
                {
                  value: TeamUpPerformanceMode.EQUAL,
                  label: "Equal player performance",
                },
                {
                  value: TeamUpPerformanceMode.MEXICANO,
                  label: "Mexicano (1&3 vs. 2&4)",
                },
              ],
            ),
            range(
              "team-up-group-factor",
              matchingSpec.teamUp.groupFactor,
              "Group factor:",
              "Match based on group mode",
            ),
            radios(
              "team-up-group-mode",
              matchingSpec.teamUp.groupMode,
              "Group mode:",
              [
                {
                  value: TeamUpGroupMode.ADJACENT,
                  label: "Adjacent groups (mixed)",
                },
                {
                  value: TeamUpGroupMode.SAME,
                  label: "Same group",
                },
              ],
            ),
            m("h4", "Match up"),
            range(
              "match-up-variety-factor",
              matchingSpec.matchUp.varietyFactor,
              "Variety factor:",
              "Rotating opponents",
            ),
            range(
              "match-up-performance-factor",
              matchingSpec.matchUp.performanceFactor,
              "Performance factor:",
              "Similar team performance",
            ),
            range(
              "match-up-group-factor",
              matchingSpec.matchUp.groupFactor,
              "Group factor:",
              "Similar group composition",
            ),
          ),
          m(
            "footer",
            m(
              "button",
              {
                class: "secondary",
                onclick: (event: InputEvent) => {
                  document.getElementById(ID)!.setAttribute("open", "false");
                  event.preventDefault();
                },
              },
              "Cancel",
            ),
            m(
              "button",
              {
                onclick: (event: InputEvent) => {
                  const form = document.getElementById(
                    "matching-spec",
                  ) as HTMLFormElement;
                  const formData = new FormData(form);
                  const matchingSpec = {
                    teamUp: {
                      varietyFactor: parseInt(
                        formData.get("team-up-variety-factor")!.toString(),
                      ),
                      performanceFactor: parseInt(
                        formData.get("team-up-performance-factor")!.toString(),
                      ),
                      performanceMode: parseInt(
                        formData.get("team-up-performance-mode")!.toString(),
                      ),
                      groupFactor: parseInt(
                        formData.get("team-up-group-factor")!.toString(),
                      ),
                      groupMode: parseInt(
                        formData.get("team-up-group-mode")!.toString(),
                      ),
                    },
                    matchUp: {
                      varietyFactor: parseInt(
                        formData.get("match-up-variety-factor")!.toString(),
                      ),
                      performanceFactor: parseInt(
                        formData.get("match-up-performance-factor")!.toString(),
                      ),
                      groupFactor: parseInt(
                        formData.get("match-up-group-factor")!.toString(),
                      ),
                    },
                  } as MatchingSpec;
                  onconfirm(matchingSpec);
                  document.getElementById(ID)!.setAttribute("open", "false");
                  event.preventDefault();
                },
              },
              "OK",
            ),
          ),
        ),
      ),
    ];
  },
};

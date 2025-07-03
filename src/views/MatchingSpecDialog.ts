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
      description: string,
    ) => {
      return m(
        "label",
        label,
        m("input", {
          type: "range",
          name: name,
          value: value,
        }),
        m("small", description),
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
              checked: value == input.value,
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
              "By variety:",
              "The factor to apply to the variety weight",
            ),
            range(
              "team-up-performance-factor",
              matchingSpec.teamUp.performanceFactor,
              "By performance:",
              "The factor to apply to the performance weight",
            ),
            radios(
              "team-up-performance-mode",
              matchingSpec.teamUp.performanceMode,
              "Performance mode:",
              [
                { value: TeamUpPerformanceMode.AVERAGE, label: "Average" },
                { value: TeamUpPerformanceMode.EQUAL, label: "Equal" },
                {
                  value: TeamUpPerformanceMode.MEXICANO_1324,
                  label: "Mexicano1324",
                },
                {
                  value: TeamUpPerformanceMode.MEXICANO_1423,
                  label: "Mexicano1423",
                },
              ],
            ),
            range(
              "team-up-group-factor",
              matchingSpec.teamUp.groupFactor,
              "By group:",
              "The factor to apply to the group weight",
            ),
            radios(
              "team-up-group-mode",
              matchingSpec.teamUp.groupMode,
              "Group mode:",
              [
                { value: TeamUpGroupMode.ADJACENT, label: "Adjacent" },
                { value: TeamUpGroupMode.SAME, label: "Same" },
              ],
            ),
            m("h4", "Match up"),
            range(
              "match-up-variety-factor",
              matchingSpec.matchUp.varietyFactor,
              "By variety:",
              "The factor to apply to the variety weight",
            ),
            range(
              "match-up-performance-factor",
              matchingSpec.matchUp.performanceFactor,
              "By performance:",
              "The factor to apply to the performance weight",
            ),
            range(
              "match-up-group-factor",
              matchingSpec.matchUp.groupFactor,
              "By group:",
              "The factor to apply to the group weight",
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
              "button.confirm",
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
              "Confirm",
            ),
          ),
        ),
      ),
    ];
  },
};

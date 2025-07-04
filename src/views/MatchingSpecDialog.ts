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
              "Rotating partners:",
              "",
            ),
            range(
              "team-up-performance-factor",
              matchingSpec.teamUp.performanceFactor,
              "By performance:",
              "Select the performance mode below",
            ),
            radios(
              "team-up-performance-mode",
              matchingSpec.teamUp.performanceMode,
              "Performance mode:",
              [
                {
                  value: TeamUpPerformanceMode.AVERAGE,
                  label: "Average team performance",
                },
                {
                  value: TeamUpPerformanceMode.EQUAL,
                  label: "Players with equal performance",
                },
                {
                  value: TeamUpPerformanceMode.MEXICANO_1324,
                  label: "Mexicano (1st & 3rd vs. 2nd & 4th)",
                },
                {
                  value: TeamUpPerformanceMode.MEXICANO_1423,
                  label: "Mexicano (1st & 4th vs. 2nd & 3rd)",
                },
              ],
            ),
            range(
              "team-up-group-factor",
              matchingSpec.teamUp.groupFactor,
              "By group:",
              "Select the group mode below",
            ),
            radios(
              "team-up-group-mode",
              matchingSpec.teamUp.groupMode,
              "Group mode:",
              [
                {
                  value: TeamUpGroupMode.ADJACENT,
                  label: "Players from adjacent groups (mixed)",
                },
                {
                  value: TeamUpGroupMode.SAME,
                  label: "Players from same group",
                },
              ],
            ),
            m("h4", "Match up"),
            range(
              "match-up-variety-factor",
              matchingSpec.matchUp.varietyFactor,
              "Rotating opponents:",
            ),
            range(
              "match-up-performance-factor",
              matchingSpec.matchUp.performanceFactor,
              "Similar team performance:",
            ),
            range(
              "match-up-group-factor",
              matchingSpec.matchUp.groupFactor,
              "Similar group composition:",
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

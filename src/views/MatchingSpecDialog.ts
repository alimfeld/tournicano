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
      );
    };
    const dropdown = (
      name: string,
      value: number,
      label: string,
      options: { value: number; label: string }[],
    ) => {
      const selectedOption = options.find((opt) => opt.value === value);
      return m(
        "details.dropdown",
        {
          id: `dropdown-${name}`,
        },
        m("summary", { id: `summary-${name}` }, `${label} ${selectedOption?.label || ""}`),
        m(
          "ul",
          options.map((option) =>
            m(
              "li",
              m(
                "label",
                m("input", {
                  type: "radio",
                  name: name,
                  value: option.value,
                  checked: value === option.value,
                  onchange: () => {
                    const summary = document.getElementById(`summary-${name}`);
                    const details = document.getElementById(`dropdown-${name}`) as HTMLDetailsElement;
                    if (summary) {
                      summary.textContent = `${label} ${option.label}`;
                    }
                    if (details) {
                      details.open = false;
                    }
                  },
                }),
                option.label,
              ),
            ),
          ),
        ),
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
            m("h4", "Team up factors"),
            range(
              "team-up-variety-factor",
              matchingSpec.teamUp.varietyFactor,
              "Rotate partners:",
            ),
            range(
              "team-up-performance-factor",
              matchingSpec.teamUp.performanceFactor,
              "Match by skill level:",
            ),
            dropdown(
              "team-up-performance-mode",
              matchingSpec.teamUp.performanceMode,
              "How:",
              [
                {
                  value: TeamUpPerformanceMode.AVERAGE,
                  label: "Balanced teams",
                },
                {
                  value: TeamUpPerformanceMode.EQUAL,
                  label: "Equal skill",
                },
                {
                  value: TeamUpPerformanceMode.MEXICANO,
                  label: "Mexicano (1+3, 2+4)",
                },
              ],
            ),
            range(
              "team-up-group-factor",
              matchingSpec.teamUp.groupFactor,
              "Consider player groups:",
            ),
            dropdown(
              "team-up-group-mode",
              matchingSpec.teamUp.groupMode,
              "How:",
              [
                {
                  value: TeamUpGroupMode.ADJACENT,
                  label: "Mix adjacent groups",
                },
                {
                  value: TeamUpGroupMode.SAME,
                  label: "Same group only",
                },
              ],
            ),
            m("h4", "Match up factors"),
            range(
              "match-up-variety-factor",
              matchingSpec.matchUp.varietyFactor,
              "Rotate opponents:",
            ),
            range(
              "match-up-performance-factor",
              matchingSpec.matchUp.performanceFactor,
              "Match similar skill:",
            ),
            range(
              "match-up-group-factor",
              matchingSpec.matchUp.groupFactor,
              "Similar group mix:",
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

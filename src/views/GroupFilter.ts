import m from "mithril";
import { GroupSymbol } from "./GroupSymbol.ts";
import "./GroupFilter.css";

export interface GroupFilterAttrs {
  groups: number[];
  selectedGroups: number[];
  onGroupsChange: (groups: number[]) => void;
  getGroupCount: (group: number) => number;
  compact?: boolean; // If true, show only symbols without letters (A, B, C, D)
}

export const GroupFilter: m.Component<GroupFilterAttrs> = {
  view: ({ attrs }) => {
    const { groups, selectedGroups, onGroupsChange, getGroupCount } = attrs;

    // Only show if 2-4 groups
    if (groups.length <= 1 || groups.length > 4) {
      return null;
    }

    // Auto-detect mode based on number of groups
    const isRadioMode = groups.length === 2;

    const toggleGroup = (group: number) => {
      if (isRadioMode) {
        // Radio mode (2 groups): clicking active group deselects it (shows all)
        if (selectedGroups.includes(group)) {
          onGroupsChange([]);  // Clear selection
        } else {
          onGroupsChange([group]);  // Select only this group
        }
      } else {
        // Multi-select mode (3-4 groups): prevent selecting all groups
        if (selectedGroups.includes(group)) {
          // Deselecting a group
          onGroupsChange(selectedGroups.filter(g => g !== group));
        } else {
          // Selecting a group
          const newGroups = [...selectedGroups, group];

          // If this would select all groups, select only the clicked group instead
          if (newGroups.length === groups.length) {
            onGroupsChange([group]);
          } else {
            onGroupsChange(newGroups);
          }
        }
      }
    };

    return m("div.group-filter", { role: "group" },
      groups.map(g =>
        m("button", {
          class: selectedGroups.includes(g) ? "" : "outline",
          onclick: () => toggleGroup(g)
        }, [
          m(GroupSymbol, { group: g, neutral: true, compact: attrs.compact }),
          ` (${getGroupCount(g)})`
        ])
      )
    );
  }
};

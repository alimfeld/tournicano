import m from "mithril";
import "./ActiveFilter.css";

export interface ActiveFilterAttrs {
  selectedFilter: "active" | "inactive" | undefined;
  onFilterChange: (filter: "active" | "inactive" | undefined) => void;
  getActiveCount: () => number;
  getInactiveCount: () => number;
}

export const ActiveFilter: m.Component<ActiveFilterAttrs> = {
  view: ({ attrs }) => {
    const { selectedFilter, onFilterChange, getActiveCount, getInactiveCount } = attrs;

    const toggleFilter = (filter: "active" | "inactive") => {
      // Radio mode: clicking active filter deselects it (shows all)
      if (selectedFilter === filter) {
        onFilterChange(undefined);  // Clear selection
      } else {
        onFilterChange(filter);  // Select this filter
      }
    };

    return m("div.active-filter", { role: "group" },
      m("button", {
        class: selectedFilter === "active" ? "" : "outline",
        onclick: () => toggleFilter("active")
      }, `● (${getActiveCount()})`),
      m("button", {
        class: selectedFilter === "inactive" ? "" : "outline",
        onclick: () => toggleFilter("inactive")
      }, `○ (${getInactiveCount()})`)
    );
  }
};

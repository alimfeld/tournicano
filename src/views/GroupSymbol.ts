import m from "mithril";
import "./GroupSymbol.css";

export interface GroupSymbolAttrs {
  group: number; // 0-3 (maps to ♠♥♦♣)
  neutral?: boolean; // If true, inherit color from parent instead of using suit colors
}

export const getGroupSymbol = (index: number): string => {
  const symbols = ['♠', '♥', '♦', '♣'];
  return symbols[index] || '♠';
};

export const getGroupLetter = (index: number): string => String.fromCharCode(65 + index);

const getGroupColor = (index: number): string => {
  const colors = ['spades', 'hearts', 'diamonds', 'clubs'];
  return colors[index] || 'spades';
};

export const GroupSymbol: m.Component<GroupSymbolAttrs> = {
  view: ({ attrs: { group, neutral } }) => {
    const colorClass = neutral ? '' : `.${getGroupColor(group)}`;
    return m("span.group-badge",
      m(`span.group-symbol${colorClass}`, getGroupSymbol(group)),
      " ",
      getGroupLetter(group)
    );
  },
};

import m from "mithril";
import { Page } from "../App.ts";

export interface NavAttrs {
  nav: (page: Page) => void;
  currentPage: Page;
}

// Map pages to their nav index (only pages that appear in nav)
const pageToNavIndex = (page: Page): number => {
  switch (page) {
    case Page.HOME: return 0;
    case Page.SETTINGS: return 1;
    case Page.PLAYERS: return 2;
    case Page.ROUNDS: return 3;
    case Page.STANDINGS: return 4;
    case Page.SCORE_ENTRY: return 3; // Score entry belongs to rounds
    default: return 0;
  }
};

interface NavState {
  lastIndex: number;
}

export const NavView: m.Component<NavAttrs, NavState> = {
  oninit: (vnode) => {
    vnode.state.lastIndex = pageToNavIndex(vnode.attrs.currentPage);
  },
  view: ({ attrs: { nav, currentPage }, state }) => {
    const navIndex = pageToNavIndex(currentPage);
    
    return m(
      "nav",
      m(
        "ul",
        m("li", { onclick: () => nav(Page.HOME) }, "📢"),
        m("li", { onclick: () => nav(Page.SETTINGS) }, "⚙️"),
        m("li", { onclick: () => nav(Page.PLAYERS) }, "🤖"),
        m("li", { onclick: () => nav(Page.ROUNDS) }, "🚀"),
        m("li", { onclick: () => nav(Page.STANDINGS) }, "🏆"),
        m("div.nav-highlight", {
          oncreate: (vnode: m.VnodeDOM) => {
            // Set initial position without transition
            // Each nav item is 20% wide, pill starts at left: 2.5% and is 15% wide
            // To center: multiply navIndex by 20% (item width) and add 2.5% (to account for centering)
            const el = vnode.dom as HTMLElement;
            el.style.transition = 'none';
            el.style.transform = `translateX(${navIndex * (100 / 0.75)}%)`;
            // Force reflow
            el.offsetHeight;
            // Re-enable transition
            el.style.transition = '';
            state.lastIndex = navIndex;
          },
          onupdate: (vnode: m.VnodeDOM) => {
            // Only animate if the index actually changed
            if (state.lastIndex !== navIndex) {
              const el = vnode.dom as HTMLElement;
              el.style.transform = `translateX(${navIndex * (100 / 0.75)}%)`;
              state.lastIndex = navIndex;
            }
          }
        })
      ),
    );
  },
};

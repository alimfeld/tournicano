import m from "mithril";
import { Layout } from "./Layout.ts";
import { HomePage } from "./views/HomePage.ts";
import { SettingsPage } from "./views/SettingsPage.ts";
import { PlayersPage } from "./views/PlayersPage.ts";
import { RoundPage } from "./views/RoundPage.ts";
import { StandingsPage } from "./views/StandingsPage.ts";

// Helper to create route resolvers
const createRoute = (component: m.Component) => ({
  onmatch: () => {
    // Reset scroll position on navigation
    window.scrollTo(0, 0);
    return component;
  },
  render: (vnode: m.Vnode) => m(Layout, vnode),
});

const mountNode = document.querySelector("#app");
if (mountNode) {
  m.route(mountNode, "/", {
    "/": createRoute(HomePage),
    "/settings": createRoute(SettingsPage),
    "/players": createRoute(PlayersPage),
    "/rounds": createRoute(RoundPage),
    "/standings": createRoute(StandingsPage),
  });
}

